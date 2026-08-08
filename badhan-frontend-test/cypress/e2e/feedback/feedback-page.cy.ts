import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { MEMBER_PASSWORD } from '@support/helpers/members';
import {
  clearFeedbacksViaApi,
  createVolunteerInHallViaApi,
  HALL_TITUMIR,
  uniqueLocalPhone,
  createDonorViaApi,
  feedbacksViaApi,
  seedMessageViaApi,
  seedRegistrationViaApi,
  FeedbackDonor,
} from '@support/helpers/feedback';

// The volunteer-facing half. Everything here runs signed in, and every row is seeded through the
// real public routes rather than written straight to the database, so nothing in these specs takes a
// shortcut around a rule the feature actually enforces.

const uniqueStudentId = (() => {
  let n = 40;
  return () => {
    n += 1;
    return `19052${String(n).padStart(2, '0')}`;
  };
})();

describe('The Feedback page', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  beforeEach(() => {
    clearFeedbacksViaApi();
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
  });

  it('reaches the page from a plain sidebar entry and lists a message', () => {
    createDonorViaApi({ name: 'Listed Donor', studentId: uniqueStudentId() }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      seedMessageViaApi(donor, 'I donated on 12 March').then(() => {
        drawer.goToFeedback();

        // A plain entry: no badge, no number, nothing announcing that work is waiting. If a count
        // ever comes back, this is the assertion that has to be changed deliberately.
        drawer.open();
        cy.get('[data-cy="feedbackNavigationId"]').should('not.contain.text', '1');
        cy.get('[data-cy="feedbackNavigationId"]').find('.v-badge').should('not.exist');
        cy.get('body').type('{esc}');

        cy.get('[data-cy="feedbackDonorCard"]').should('contain.text', 'Listed Donor');
        cy.get('[data-cy="feedbackMessageText"]').should('have.text', 'I donated on 12 March');
      });
    });
  });

  it('renders script tags and markdown as literal text', () => {
    // The anti-v-html test. The message is stored exactly as it was typed — no escaping at all —
    // so the only thing making it inert is that it renders through Vue text interpolation.
    createDonorViaApi({ name: 'Script Donor', studentId: uniqueStudentId() }, 'donor');
    const hostile = '<script>window.pwned=true</script> **not bold** <b>not bold either</b>';

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      seedMessageViaApi(donor, hostile).then(() => {
        drawer.goToFeedback();

        cy.get('[data-cy="feedbackMessageText"]').should('have.text', hostile);
        cy.get('[data-cy="feedbackMessageText"]').find('b').should('not.exist');
        cy.get('[data-cy="feedbackMessageText"]').find('script').should('not.exist');
        // .its() errors on a missing property, and missing is exactly what this asserts.
        cy.window().then((win) => {
          expect((win as unknown as Record<string, unknown>).pwned).to.equal(undefined);
        });
      });
    });
  });

  it('discards after a confirmation and the row is gone', () => {
    createDonorViaApi({ name: 'Discard Donor', studentId: uniqueStudentId() }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      seedMessageViaApi(donor, 'discard me').then(() => {
        drawer.goToFeedback();

        cy.get('[data-cy="feedbackDiscardButton"]').click();
        // The wording has to say what actually happens: discard deletes the message and touches
        // nothing on the donor.
        cy.contains('nothing will be added to or changed on any donor record').should('be.visible');
        cy.get('[data-cy="confirmationBoxButtonId"]').click();

        cy.get('[data-cy="feedbackMessageText"]').should('not.exist');
        cy.get('[data-cy="feedbackEmptyState"]').should('be.visible');

        feedbacksViaApi().then((feedbacks) => {
          expect(feedbacks.find((f) => f.feedbackJSON?.text === 'discard me')).to.equal(undefined);
        });
      });
    });
  });

  it('leaves everything alone when the confirmation is cancelled', () => {
    createDonorViaApi({ name: 'Cancelling Donor', studentId: uniqueStudentId() }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      seedMessageViaApi(donor, 'keep me').then(() => {
        drawer.goToFeedback();

        cy.get('[data-cy="feedbackDiscardButton"]').click();
        // Cancel has no data-cy of its own; it is the other button in the dialog.
        cy.contains('.v-card__actions .v-btn', 'Cancel').click();

        cy.get('[data-cy="feedbackMessageText"]').should('have.text', 'keep me');
        feedbacksViaApi().then((feedbacks) => {
          expect(feedbacks.find((f) => f.feedbackJSON?.text === 'keep me')).to.not.equal(undefined);
        });
      });
    });
  });

  it('renders a fallback header when no donor matches, rather than a broken card', () => {
    // Happens when a donor is deleted after writing. Expected, not an error — and the same
    // rendering path every registration row uses.
    createDonorViaApi({ name: 'Doomed Donor', studentId: uniqueStudentId() }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      seedMessageViaApi(donor, 'my donor will be deleted').then(() => {
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiBaseURL') || 'http://localhost:3000'}/users/signin`,
          body: { phone: Number(`88${AUTH_CREDENTIALS.phone}`), password: AUTH_CREDENTIALS.password },
        }).then((signIn) => {
          cy.request({
            method: 'DELETE',
            url: `${Cypress.env('apiBaseURL') || 'http://localhost:3000'}/donors?donorId=${donor.id}`,
            headers: { 'x-auth': signIn.body.token },
          }).then(() => {
            drawer.goToFeedback();

            cy.get('[data-cy="feedbackUnknownDonorHeader"]').should('be.visible');
            cy.get('[data-cy="feedbackUnknownDonorHeader"]').should(
              'contain.text',
              'No donor record matches this phone number and student ID',
            );
            cy.get('[data-cy="feedbackDonorCard"]').should('not.exist');
            cy.get('[data-cy="feedbackMessageText"]').should('have.text', 'my donor will be deleted');
          });
        });
      });
    });
  });

  it('prefills the creation form from a registration, and keeps it across a reload', () => {
    createDonorViaApi({ name: 'Minting Donor', studentId: uniqueStudentId() }, 'minter');

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      seedRegistrationViaApi(minter, {
        name: 'Prefill Student',
        studentId: '1905401',
        bloodGroup: 4,
        roomNumber: '512',
        address: 'Nilkhet',
        comment: 'prefill me',
      }).then(() => {
        drawer.goToFeedback();

        cy.get('[data-cy="feedbackNewDonorCard"]').should('be.visible');
        cy.get('[data-cy="feedbackNewDonorName"]').should('have.text', 'Prefill Student');
        cy.get('[data-cy="feedbackCreateDonorButton"]').click();

        cy.url().should('include', '/singleDonorCreation');
        cy.url().should('include', 'name=');

        // Field values, not just the URL: the point is that the volunteer sees a form they correct
        // rather than one they fill in.
        const assertFieldsFilled = () => {
          cy.get('[data-cy="newDonorNameTextBoxId"]').should('have.value', 'Prefill Student');
          cy.get('[data-cy="newDonorStudentIdTextBoxId"]').should('have.value', '1905401');
          cy.get('[data-cy="newDonorRoomNumberTextFieldId"]').should('have.value', '512');
          cy.get('[data-cy="newDonorAddressTextFieldId"]').should('have.value', 'Nilkhet');
        };
        assertFieldsFilled();

        // The URL is the state. This is the property the removed read-one endpoint used to provide,
        // and the reason the draft travels in the query string rather than a store handoff.
        cy.reload();
        assertFieldsFilled();
      });
    });
  });

  it('keeps the registration in the queue after the donor is created', () => {
    createDonorViaApi({ name: 'Minting Donor Two', studentId: uniqueStudentId() }, 'minter');

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      seedRegistrationViaApi(minter, {
        name: 'Still Queued Student',
        studentId: '1905402',
        phone: Number(`88${uniqueLocalPhone()}`),
      }).then(() => {
        drawer.goToFeedback();
        cy.get('[data-cy="feedbackCreateDonorButton"]').click();

        cy.get('[data-cy="newDonorCreateButtonId"]').click();

        // The app does not mutate the queue as a side effect of a different page succeeding. A
        // volunteer who created the wrong person still has the original submission in front of them.
        feedbacksViaApi().then((feedbacks) => {
          expect(
            feedbacks.find((f) => f.feedbackJSON?.name === 'Still Queued Student'),
            'the submission is still in the queue',
          ).to.not.equal(undefined);
        });
      });
    });
  });

  it("escapes and decodes O'Brien exactly once, end to end", () => {
    // The only place the escape-once / decode-once pair can be checked all the way through. The
    // submit route escaped the name; the card decodes it for display; the prefill passes the plain
    // text on; the creation route escapes it again — exactly once, as it would for a typed name.
    createDonorViaApi({ name: 'Minting Donor Three', studentId: uniqueStudentId() }, 'minter');

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      seedRegistrationViaApi(minter, {
        name: "O'Brien",
        studentId: '1905403',
        comment: "it's fine",
        phone: Number(`88${uniqueLocalPhone()}`),
      }).then(() => {
        drawer.goToFeedback();

        // 1. The card shows what the student typed, not the stored entities.
        cy.get('[data-cy="feedbackNewDonorName"]').should('have.text', "O'Brien");
        cy.get('[data-cy="feedbackNewDonorComment"]').should('have.text', "it's fine");

        // 2. The prefilled form holds it as plain text too.
        cy.get('[data-cy="feedbackCreateDonorButton"]').click();
        cy.get('[data-cy="newDonorNameTextBoxId"]').should('have.value', "O'Brien");
      });
    });
  });

  it('shows messages and registrations in one list, oldest first', () => {
    createDonorViaApi({ name: 'Interleaved Donor', studentId: uniqueStudentId() }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      // Seeded in order, so the message is older than the registration.
      seedMessageViaApi(donor, 'the older message').then(() => {
        seedRegistrationViaApi(donor, {
          name: 'The Newer Registration',
          studentId: '1905404',
          phone: Number(`88${uniqueLocalPhone()}`),
        }).then(() => {
          drawer.goToFeedback();

          // One list. No tab strip and no filter control anywhere on the page.
          cy.get('[data-cy="feedbackMessageText"]').should('exist');
          cy.get('[data-cy="feedbackNewDonorCard"]').should('exist');
          cy.get('body').should('not.contain.text', 'Show only messages');

          cy.get('[data-cy^="feedbackCard-"]').then(($cards) => {
            const texts = Array.from($cards).map((card) => card.textContent ?? '');
            const messageIndex = texts.findIndex((t) => t.includes('the older message'));
            const registrationIndex = texts.findIndex((t) => t.includes('The Newer Registration'));
            expect(messageIndex, 'the older row comes first').to.be.lessThan(registrationIndex);
          });
        });
      });
    });
  });

  it('opens the donor profile from See profile', () => {
    createDonorViaApi({ name: 'Profile Donor', studentId: uniqueStudentId() }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      seedMessageViaApi(donor, 'open my profile').then(() => {
        drawer.goToFeedback();

        // PersonCardNew is used verbatim rather than imitated, so See profile keeps working here
        // exactly as it does in search — and it opens over the list, so the volunteer does not lose
        // their place in the queue.
        // The card's actions live behind its expansion, exactly as they do in search.
        cy.get('[data-cy="person-card"]').first().click();
        cy.get(`[data-cy="personCardSeeProfileButtonId_${donor.id}"]`).click();
        cy.url().should('include', '/feedback/details');
        cy.url().should('include', donor.id);
      });
    });
  });

  it('never shows a volunteer another hall\'s row', () => {
    // Seeded through the API and asserted as ABSENT from the list, not as a 403: another hall's row
    // must never reach the browser at all, so there is nothing to grey out.
    const otherHallStudentId = uniqueStudentId();

    createDonorViaApi(
      // availableToAll false is the whole point: a donor marked available to all halls is visible
      // to every volunteer by design, so leaving the default on would test nothing.
      { name: 'Other Hall Donor', studentId: otherHallStudentId, hall: HALL_TITUMIR, availableToAll: false },
      'otherHallDonor',
    );
    createVolunteerInHallViaApi({ name: 'Suhrawardy Volunteer', studentId: uniqueStudentId() }, 'volunteer');

    cy.get<FeedbackDonor>('@otherHallDonor').then((otherHallDonor) => {
      seedMessageViaApi(otherHallDonor, 'from another hall').then(() => {
        cy.get<{ localPhone: string }>('@volunteer').then((volunteer) => {
          cy.clearLocalStorage();
          cy.visit('/');
          signInPage.signIn(volunteer.localPhone, MEMBER_PASSWORD);

          drawer.goToFeedback();
          cy.get('[data-cy="feedbackEmptyState"]', { timeout: 10000 }).should('be.visible');
          cy.get('body').should('not.contain.text', 'from another hall');
        });
      });
    });
  });

  it('files a message about yourself through the two public calls', () => {
    // Two calls, in order: mint a token from the member's own phone and student ID, then submit
    // with it. There is deliberately no authenticated write path for feedback — this exercises the
    // same contract a donor at a notice board uses, so it breaks when that journey breaks.
    cy.intercept('POST', '**/feedbacks/token').as('mintToken');
    cy.intercept('POST', '**/feedbacks').as('submitFeedback');

    drawer.goToFeedback();
    cy.get('[data-cy="ownFeedbackPanelHeader"]').click();
    cy.get('[data-cy="ownFeedbackInput"]').type('A message I filed about myself');
    cy.get('[data-cy="ownFeedbackSubmitButton"]').click();

    cy.wait('@mintToken').then((mint) => {
      expect(mint.response.statusCode).to.equal(200);

      cy.wait('@submitFeedback').then((submit) => {
        expect(submit.response.statusCode).to.equal(201);
        // The second call carries the token the first returned, and repeats the pair, because the
        // token itself holds no identity.
        expect(submit.request.body.token).to.equal(mint.response.body.token);
        expect(submit.request.body.type).to.equal('feedback');
        expect(submit.request.body.feedbackJSON.phone).to.equal(mint.response.body.donor.phone);
        expect(submit.request.body.feedbackJSON.studentId).to.equal(
          mint.response.body.donor.studentId,
        );
      });
    });

    // There is deliberately no success line: the row appearing in the queue below IS the
    // confirmation, and it shows exactly what was filed.
    cy.get('[data-cy="ownFeedbackSuccess"]').should('not.exist');
    // The field is cleared and the queue below refreshes itself, so the row is on screen without a
    // manual reload.
    cy.get('[data-cy="ownFeedbackInput"]').should('have.value', '');
    cy.contains('[data-cy="feedbackMessageText"]', 'A message I filed about myself').should('exist');
  });

  it('keeps the send button disabled until something is typed', () => {
    drawer.goToFeedback();
    cy.get('[data-cy="ownFeedbackPanelHeader"]').click();
    cy.get('[data-cy="ownFeedbackSubmitButton"]').should('be.disabled');
    cy.get('[data-cy="ownFeedbackInput"]').type('now it has content');
    cy.get('[data-cy="ownFeedbackSubmitButton"]').should('not.be.disabled');
  });

  it('labels the message and the timestamp on every card', () => {
    createDonorViaApi({ name: 'Labelled Donor', studentId: uniqueStudentId() }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      seedMessageViaApi(donor, 'a labelled message').then(() => {
        drawer.goToFeedback();
        // Both are named rather than sitting bare under the donor card.
        cy.contains('.v-card__subtitle', 'Feedback content').should('be.visible');
        cy.contains('.v-card__subtitle', 'Date').should('be.visible');
        cy.get('[data-cy="feedbackMessageText"]').should('have.text', 'a labelled message');
        cy.get('[data-cy="feedbackDate"]').should('not.have.text', '');
      });
    });
  });

  it('starts collapsed, beside the QR panel and above the queue', () => {
    drawer.goToFeedback();
    // Both panels share one card and both are shut on arrival: the queue is what the page is for.
    // A collapsed expansion panel does not render its content into the DOM at all, so this is
    // `not.exist` rather than `not.be.visible`.
    cy.get('[data-cy="ownFeedbackPanelHeader"]').should('be.visible');
    cy.get('[data-cy="ownFeedbackInput"]').should('not.exist');
    cy.get('[data-cy="feedbackQrPanelHeader"]').should('be.visible');
  });
});
