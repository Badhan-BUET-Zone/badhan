import {
  answerChoice,
  answerText,
  createDonorViaApi,
  feedbacksViaApi,
  mintTokenViaApi,
  skipStep,
  visitRegistrationPage,
  FeedbackDonor,
  HALL_SUHRAWARDY,
  API_BASE_URL,
} from '@support/helpers/feedback';

// Journey B, signed out throughout. A student reaches this page from a volunteer's QR code and has
// no account, which is the whole premise: they are not in the database yet.

const uniqueStudentId = (() => {
  let n = 0;
  return () => {
    n += 1;
    return `19050${String(n).padStart(2, '0')}`;
  };
})();

// Walks every step except the two conditional dates, which a zero count removes.
const answerShortSequence = (studentId: string, localPhone: string) => {
  answerText('name', 'Registration Spec Student');
  answerText('studentId', studentId);
  answerText('phone', localPhone);
  answerChoice('bloodGroup', 2); // B+
  answerText('donationCount', '0');
  answerText('plateletDonationCount', '0');
  answerText('roomNumber', '404');
  answerText('address', 'Palashi');
  answerChoice('availableToAll', false);
  answerText('comment', 'registration spec');
};

describe('The public registration page', () => {
  beforeEach(() => {
    createDonorViaApi({ name: 'Token Minter', studentId: uniqueStudentId() }, 'minter');
  });

  it('renders step 1 and only step 1', () => {
    // This is what pins the one-question-per-screen shape against a later "simplify" into a single
    // scrolling form: the other inputs must not merely be hidden, they must not be in the DOM.
    cy.get<FeedbackDonor>('@minter').then((minter) => {
      mintTokenViaApi(minter.phone, minter.studentId).then((token) => {
        visitRegistrationPage(token);

        cy.get('[data-cy="registrationInput-name"]').should('be.visible');
        cy.get('[data-cy="registrationInput-studentId"]').should('not.exist');
        cy.get('[data-cy="registrationInput-phone"]').should('not.exist');
        cy.get('[data-cy="registrationInput-comment"]').should('not.exist');
        cy.get('[data-cy="registrationProgress"]').should('contain.text', 'Question 1 of');
      });
    });
  });

  it('walks the whole sequence, reviews, submits, and lands in the token hall', () => {
    const studentId = uniqueStudentId();

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      mintTokenViaApi(minter.phone, minter.studentId).then((token) => {
        visitRegistrationPage(token);
        const localPhone = '01799900011';
        answerShortSequence(studentId, localPhone);

        cy.get('[data-cy="registrationReview"]').should('be.visible');
        cy.get('[data-cy="registrationReviewValue-name"]').should('have.text', 'Registration Spec Student');
        cy.get('[data-cy="registrationReviewValue-studentId"]').should('have.text', studentId);
        cy.get('[data-cy="registrationReviewValue-bloodGroup"]').should('have.text', 'B+');
        // The hall is shown, never asked.
        cy.get('[data-cy="registrationReviewHall"]').should('contain.text', 'Suhrawardy');

        cy.get('[data-cy="registrationSubmitButton"]').click();
        cy.get('[data-cy="registrationThanks"]').should('be.visible');

        feedbacksViaApi().then((feedbacks) => {
          const mine = feedbacks.find((f) => f.feedbackJSON?.studentId === studentId);
          expect(mine, 'the registration reached the queue').to.not.equal(undefined);
          expect(mine.type).to.equal('newDonor');
          expect(mine.donor).to.equal(null);
          // The row's hall is the token's, and so is the copy inside the payload, because the form
          // never offered a control that could disagree.
          expect(mine.hall).to.equal(HALL_SUHRAWARDY);
          expect(mine.feedbackJSON.hall).to.equal(HALL_SUHRAWARDY);
          expect(mine.feedbackJSON.phone).to.equal(Number(`88${localPhone}`));
        });
      });
    });
  });

  it('sends nothing when the sequence is abandoned partway', () => {
    // Structural: there is no partial save and no draft on the server, so a student who closes the
    // tab halfway has sent nothing at all.
    const studentId = uniqueStudentId();

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      mintTokenViaApi(minter.phone, minter.studentId).then((token) => {
        visitRegistrationPage(token);
        answerText('name', 'Abandoning Student');
        answerText('studentId', studentId);
        answerText('phone', '01799900022');
        cy.get('[data-cy="registrationQuestion"]').should('contain.text', 'blood group');

        visitRegistrationPage(token); // walks away

        feedbacksViaApi().then((feedbacks) => {
          expect(feedbacks.find((f) => f.feedbackJSON?.studentId === studentId)).to.equal(undefined);
        });
      });
    });
  });

  it('keeps answers when going back', () => {
    const studentId = uniqueStudentId();

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      mintTokenViaApi(minter.phone, minter.studentId).then((token) => {
        visitRegistrationPage(token);
        answerText('name', 'Back Button Student');
        answerText('studentId', studentId);
        answerText('phone', '01799900033');

        // Each step is asserted present before the next Back is clicked. The steps are wrapped in a
        // transition with mode="out-in", so the old component is removed before the new one is
        // inserted — clicking without waiting would land on a detached button.
        cy.get('[data-cy="registrationStep-bloodGroup"]').should('exist');
        cy.get('[data-cy="registrationBackButton"]').click();

        cy.get('[data-cy="registrationStep-phone"]').should('exist');
        cy.get('[data-cy="registrationInput-phone"]').should('have.value', '01799900033');
        cy.get('[data-cy="registrationBackButton"]').click();

        cy.get('[data-cy="registrationStep-studentId"]').should('exist');
        cy.get('[data-cy="registrationInput-studentId"]').should('have.value', studentId);
        cy.get('[data-cy="registrationBackButton"]').click();

        cy.get('[data-cy="registrationStep-name"]').should('exist');
        cy.get('[data-cy="registrationInput-name"]').should('have.value', 'Back Button Student');
      });
    });
  });

  it('keeps Next disabled until the step is answered validly', () => {
    cy.get<FeedbackDonor>('@minter').then((minter) => {
      mintTokenViaApi(minter.phone, minter.studentId).then((token) => {
        visitRegistrationPage(token);

        cy.get('[data-cy="registrationNextButton"]').should('be.disabled');
        cy.get('[data-cy="registrationInput-name"]').type('ab'); // under the 3-character minimum
        cy.get('[data-cy="registrationNextButton"]').should('be.disabled');
        cy.get('[data-cy="registrationInput-name"]').type('c');
        cy.get('[data-cy="registrationNextButton"]').should('not.be.disabled');

        // An invalid student ID does not advance either — the batch and department checks run at
        // the step rather than at submit.
        cy.get('[data-cy="registrationNextButton"]').click();
        cy.get('[data-cy="registrationInput-studentId"]').type('9999999');
        cy.get('[data-cy="registrationNextButton"]').should('be.disabled');
      });
    });
  });

  it('offers no hall input anywhere in the sequence', () => {
    const studentId = uniqueStudentId();

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      mintTokenViaApi(minter.phone, minter.studentId).then((token) => {
        visitRegistrationPage(token);

        // Checked at every step, not just the first: the hall must not reappear as question nine.
        const assertNoHallInput = () => {
          cy.get('[data-cy="registrationInput-hall"]').should('not.exist');
          cy.get('[data-cy="registrationStep-hall"]').should('not.exist');
        };

        assertNoHallInput();
        answerText('name', 'No Hall Input Student');
        assertNoHallInput();
        answerText('studentId', studentId);
        assertNoHallInput();
        answerText('phone', '01799900044');
        assertNoHallInput();
        answerChoice('bloodGroup', 2);
        assertNoHallInput();
        answerText('donationCount', '0');
        assertNoHallInput();
        answerText('plateletDonationCount', '0');
        assertNoHallInput();
        answerText('roomNumber', '404');
        assertNoHallInput();
        answerText('address', 'Palashi');
        assertNoHallInput();
        answerChoice('availableToAll', false);
        assertNoHallInput();
        answerText('comment', 'no hall input');

        cy.get('[data-cy="registrationReview"]').should('be.visible');
        assertNoHallInput();
      });
    });
  });

  it('carries the donation history a student actually answered', () => {
    const studentId = uniqueStudentId();

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      mintTokenViaApi(minter.phone, minter.studentId).then((token) => {
        visitRegistrationPage(token);

        answerText('name', 'Experienced Donor Student');
        answerText('studentId', studentId);
        answerText('phone', '01799900055');
        answerChoice('bloodGroup', 2);

        // A non-zero count keeps the date question in the sequence.
        answerText('donationCount', '3');
        cy.get('[data-cy="registrationQuestion"]').should('contain.text', 'last donate blood');
        cy.get('[data-cy="registrationInput-lastDonation"]').click();
        cy.get('[data-cy="registrationPicker-lastDonation"]').find('button').not('[disabled]').eq(3).click();
        cy.get('[data-cy="registrationDateOk-lastDonation"]').click();
        cy.get('[data-cy="registrationNextButton"]').click();

        answerText('plateletDonationCount', '0');
        answerText('roomNumber', '404');
        answerText('address', 'Palashi');
        answerChoice('availableToAll', true);
        answerText('comment', 'donated three times');

        cy.get('[data-cy="registrationSubmitButton"]').click();
        cy.get('[data-cy="registrationThanks"]').should('be.visible');

        feedbacksViaApi().then((feedbacks) => {
          const mine = feedbacks.find((f) => f.feedbackJSON?.studentId === studentId);
          expect(mine.feedbackJSON.donationCount).to.equal(3);
          expect(mine.feedbackJSON.lastDonation).to.be.a('number');
          expect(mine.feedbackJSON.plateletDonationCount).to.equal(0);
          expect(mine.feedbackJSON.lastPlateletDonation).to.equal(null);
          expect(mine.feedbackJSON.availableToAll).to.equal(true);
        });
      });
    });
  });

  it('drops the date question when the count is zero, and restores it when it is not', () => {
    cy.get<FeedbackDonor>('@minter').then((minter) => {
      mintTokenViaApi(minter.phone, minter.studentId).then((token) => {
        visitRegistrationPage(token);

        answerText('name', 'Conditional Step Student');
        answerText('studentId', uniqueStudentId());
        answerText('phone', '01799900066');
        answerChoice('bloodGroup', 2);

        // Ten steps, not twelve: asking somebody who has never donated when they last donated is a
        // screen with no valid answer. The denominator starts at ten and GROWS if a count turns out
        // to be non-zero — never the other way round, because a counter that shrinks halfway
        // through reads as a bug.
        cy.get('[data-cy="registrationProgress"]').should('contain.text', 'of 10');
        answerText('donationCount', '0');
        cy.get('[data-cy="registrationQuestion"]').should('not.contain.text', 'last donate blood');
        cy.get('[data-cy="registrationProgress"]').should('contain.text', 'of 10');

        // Going back and changing the count puts the question back, and the denominator grows.
        cy.get('[data-cy="registrationStep-plateletDonationCount"]').should('exist');
        cy.get('[data-cy="registrationBackButton"]').click();
        cy.get('[data-cy="registrationStep-donationCount"]').should('exist');
        cy.get('[data-cy="registrationInput-donationCount"]').clear().type('2');
        cy.get('[data-cy="registrationNextButton"]').click();
        cy.get('[data-cy="registrationQuestion"]').should('contain.text', 'last donate blood');
        cy.get('[data-cy="registrationProgress"]').should('contain.text', 'of 11');
      });
    });
  });

  it('sends defaults for every skipped step', () => {
    const studentId = uniqueStudentId();

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      mintTokenViaApi(minter.phone, minter.studentId).then((token) => {
        visitRegistrationPage(token);

        answerText('name', 'Skipping Student');
        answerText('studentId', studentId);
        answerText('phone', '01799900077');
        answerChoice('bloodGroup', 2);
        skipStep('donationCount');
        skipStep('plateletDonationCount');
        skipStep('roomNumber');
        skipStep('address');
        answerChoice('availableToAll', false);
        skipStep('comment');

        cy.get('[data-cy="registrationSubmitButton"]').click();
        cy.get('[data-cy="registrationThanks"]').should('be.visible');

        // Every key is present with its default rather than omitted, which is what keeps the
        // payload matching keysExpected and the server's missing-key rejection strict.
        feedbacksViaApi().then((feedbacks) => {
          const mine = feedbacks.find((f) => f.feedbackJSON?.studentId === studentId);
          expect(mine.feedbackJSON.donationCount).to.equal(0);
          expect(mine.feedbackJSON.lastDonation).to.equal(null);
          expect(mine.feedbackJSON.plateletDonationCount).to.equal(0);
          expect(mine.feedbackJSON.lastPlateletDonation).to.equal(null);
          expect(mine.feedbackJSON.availableToAll).to.equal(false);
          expect(Object.keys(mine.feedbackJSON).sort()).to.deep.equal([
            'address',
            'availableToAll',
            'bloodGroup',
            'comment',
            'donationCount',
            'hall',
            'lastDonation',
            'lastPlateletDonation',
            'name',
            'phone',
            'plateletDonationCount',
            'roomNumber',
            'studentId',
          ]);
        });
      });
    });
  });

  it('shows the invalid-link state and no first question when there is no token', () => {
    visitRegistrationPage(null);
    cy.get('[data-cy="registrationInvalidLink"]').should('be.visible');
    cy.get('[data-cy="registrationInput-name"]').should('not.exist');
  });

  it('shows the expired state for an expired token', () => {
    // Read client-side from the exp claim, so the page fails early and kindly rather than after
    // twelve questions. The server rejects it too; this is the courtesy half.
    const expiredToken = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      btoa(JSON.stringify({ hall: HALL_SUHRAWARDY, exp: Math.floor(Date.now() / 1000) - 60 }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''),
      'notarealsignature',
    ].join('.');

    visitRegistrationPage(expiredToken);
    cy.get('[data-cy="registrationExpired"]').should('be.visible');
    cy.get('[data-cy="registrationInput-name"]').should('not.exist');
  });

  it('creates no donor', () => {
    const studentId = uniqueStudentId();

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/feedbacks/token`,
        body: { phone: minter.phone, studentId: minter.studentId },
      }).then((tokenResponse) => {
        visitRegistrationPage(tokenResponse.body.token);
        answerShortSequence(studentId, '01799900088');
        cy.get('[data-cy="registrationSubmitButton"]').click();
        cy.get('[data-cy="registrationThanks"]').should('be.visible');

        // The submitted phone belongs to nobody: if a donor had been created, minting a token with
        // that pair would now succeed instead of answering 404.
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/feedbacks/token`,
          body: { phone: Number('8801799900088'), studentId },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status, 'no donor exists for the submitted details').to.equal(404);
        });
      });
    });
  });
});
