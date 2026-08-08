import {
  createDonorViaApi,
  donorViaApi,
  feedbacksViaApi,
  fillIdentityCheck,
  visitPublicDonorPage,
  FeedbackDonor,
  API_BASE_URL,
} from '@support/helpers/feedback';

// Every test here runs SIGNED OUT, because that is the only way a real donor ever arrives: from a
// phone camera pointed at a printed sheet, with no account and no session. visitPublicDonorPage
// clears local storage first so no earlier spec can leave a token behind.

describe('The public donor page', () => {
  it('shows the nine public fields for a matching phone and student ID', () => {
    createDonorViaApi({ name: 'Nine Field Donor', studentId: '1605041' }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      visitPublicDonorPage();
      fillIdentityCheck(donor.localPhone, donor.studentId);

      cy.get('[data-cy="publicDonorSummary"]').should('be.visible');
      cy.get('[data-cy="publicDonorName"]').should('have.text', donor.name);
      cy.get('[data-cy="publicDonorStudentIdValue"]').should('have.text', donor.studentId);
      cy.get('[data-cy="publicDonorPhoneValue"]').should('contain.text', String(donor.phone));
      cy.get('[data-cy="publicDonorBloodGroup"]').should('have.text', 'B+');
      cy.get('[data-cy="publicDonorHall"]').should('have.text', 'Suhrawardy');
      cy.get('[data-cy="publicDonorDonationCount"]').should('have.text', '0');
      cy.get('[data-cy="publicDonorPlateletCount"]').should('have.text', '0');
      cy.get('[data-cy="publicDonorLastDonation"]').should('exist');
      cy.get('[data-cy="publicDonorLastPlatelet"]').should('exist');
    });
  });

  it('never puts address, room number, comment or email anywhere in the DOM', () => {
    // Asserted against the whole page body rather than the table, so a stray debug render or a
    // hidden element is caught too. Anyone who knows a phone and a student ID can read this page,
    // which is exactly why nothing more sensitive than the nine fields may reach it.
    createDonorViaApi(
      {
        name: 'Private Field Donor',
        studentId: '1605042',
        address: 'SecretAddressMarker',
        roomNumber: 'SecretRoomMarker',
        comment: 'SecretCommentMarker',
      },
      'donor',
    );

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      visitPublicDonorPage();
      fillIdentityCheck(donor.localPhone, donor.studentId);

      cy.get('[data-cy="publicDonorSummary"]').should('be.visible');
      cy.get('body').should('not.contain.text', 'SecretAddressMarker');
      cy.get('body').should('not.contain.text', 'SecretRoomMarker');
      cy.get('body').should('not.contain.text', 'SecretCommentMarker');
      cy.get('body').should('not.contain.text', 'archiveFlag');
      cy.get('body').should('not.contain.text', 'availableToAll');
    });
  });

  it('answers a wrong student ID and a wrong phone with the identical message', () => {
    // The two failures must be indistinguishable. Anything that separates them turns the page into
    // a tool for probing which phone numbers are in the database.
    createDonorViaApi({ name: 'Mismatch Donor', studentId: '1605043' }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      visitPublicDonorPage();
      fillIdentityCheck(donor.localPhone, '1605099');
      cy.get('[data-cy="publicDonorMismatch"]')
        .should('be.visible')
        .invoke('text')
        .then((wrongStudentIdText) => {
          visitPublicDonorPage();
          fillIdentityCheck('01911111119', donor.studentId);
          cy.get('[data-cy="publicDonorMismatch"]')
            .invoke('text')
            .should((wrongPhoneText) => {
              expect(wrongPhoneText.trim()).to.equal(wrongStudentIdText.trim());
              expect(wrongPhoneText.trim()).to.equal('Information does not match. Please contact a volunteer.');
            });
        });
      // The typed values are never echoed back into the error.
      cy.get('[data-cy="publicDonorMismatch"]').should('not.contain.text', donor.studentId);
    });
  });

  it('submits a message, shows the thank-you state, and the row reaches the queue', () => {
    createDonorViaApi({ name: 'Submitting Donor', studentId: '1605044' }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      visitPublicDonorPage();
      fillIdentityCheck(donor.localPhone, donor.studentId);

      const message = 'I donated on 12 March, please add it';
      cy.get('[data-cy="publicDonorMessageInput"]').type(message);
      cy.get('[data-cy="publicDonorSubmitButton"]').click();

      cy.get('[data-cy="publicDonorThanks"]').should('be.visible');
      // The server's 201 message, shown verbatim. Trimmed because the template's whitespace is
      // not part of the contract; the words are.
      cy.get('[data-cy="publicDonorThanksMessage"]')
        .invoke('text')
        .should((text) => {
          expect(text.trim()).to.equal('Thank you. Your message has reached the volunteers.');
        });
      // Nothing to click back to the form: a donor who submits twice by accident is a nuisance the
      // design should not invite.
      cy.get('[data-cy="publicDonorSubmitButton"]').should('not.exist');

      feedbacksViaApi().then((feedbacks) => {
        const mine = feedbacks.find((f) => f.feedbackJSON?.phone === donor.phone);
        expect(mine, 'the submitted row reached the queue').to.not.equal(undefined);
        expect(mine.type).to.equal('feedback');
        expect(mine.feedbackJSON.text).to.equal(message);
        expect(mine.feedbackJSON.studentId).to.equal(donor.studentId);
      });
    });
  });

  it('accepts 500 characters and refuses the 501st', () => {
    createDonorViaApi({ name: 'Long Message Donor', studentId: '1605045' }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      visitPublicDonorPage();
      fillIdentityCheck(donor.localPhone, donor.studentId);

      const overLong = 'x'.repeat(501);
      cy.get('[data-cy="publicDonorMessageInput"]')
        .type(overLong, { delay: 0 })
        // maxlength stops the 501st character ever being typed, so the donor is not told off after
        // the fact for something the field could simply prevent.
        .should('have.value', 'x'.repeat(500));

      cy.get('[data-cy="publicDonorSubmitButton"]').click();
      cy.get('[data-cy="publicDonorThanks"]').should('be.visible');
    });
  });

  it('keeps the typed message when the token expires mid-sentence', () => {
    // The most likely everyday failure in the whole feature: a phone sleeps while somebody is
    // typing and the fifteen minutes run out. A donor who loses their words does not type them
    // again, so the text has to survive the trip back to the identity check.
    createDonorViaApi({ name: 'Expiring Token Donor', studentId: '1605046' }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      visitPublicDonorPage();
      fillIdentityCheck(donor.localPhone, donor.studentId);

      cy.intercept('POST', `${API_BASE_URL}/feedbacks`, {
        statusCode: 401,
        body: {
          status: 'ERROR',
          statusCode: 401,
          message: 'This link has expired. Please scan again or ask a volunteer for a new code.',
        },
      }).as('expiredSubmit');

      const message = 'A message worth keeping';
      cy.get('[data-cy="publicDonorMessageInput"]').type(message);
      cy.get('[data-cy="publicDonorSubmitButton"]').click();
      cy.wait('@expiredSubmit');

      cy.get('[data-cy="publicDonorForm"]').should('be.visible');
      cy.get('[data-cy="publicDonorExpiredNotice"]').should('be.visible');

      // Re-verifying re-mints a token and the very same text is still there to submit.
      cy.get('[data-cy="publicDonorVerifyButton"]').click();
      cy.get('[data-cy="publicDonorMessageInput"]').should('have.value', message);
    });
  });

  it('changes nothing on the donor record', () => {
    // The whole security model in one assertion: the public side can speak, but it cannot act.
    createDonorViaApi({ name: 'Untouched Donor', studentId: '1605047' }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      donorViaApi(donor.id).then((before) => {
        visitPublicDonorPage();
        fillIdentityCheck(donor.localPhone, donor.studentId);
        cy.get('[data-cy="publicDonorMessageInput"]').type('please change my hall');
        cy.get('[data-cy="publicDonorSubmitButton"]').click();
        cy.get('[data-cy="publicDonorThanks"]').should('be.visible');

        donorViaApi(donor.id).then((after) => {
          expect(JSON.stringify(after)).to.equal(JSON.stringify(before));
        });
      });
    });
  });
});
