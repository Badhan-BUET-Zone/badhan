import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { superAdminToken, clearMessagesViaApi, LAST_FETCHED_AT_KEY } from '@support/helpers/chat';

// THE REGRESSION TEST FOR THE TRUNCATED CATCH-UP.
//
// One press brings back at most a page. A member back from a week away therefore needs several,
// and two things have to hold or messages are silently lost:
//
//   1. The button must SAY there is more, or they press once, see thirty, and conclude that was
//      all there was.
//   2. The next press must send `after` equal to the serverTime the server handed back — which,
//      on a truncated page, is the newest RETURNED message's date and NOT the server's clock.
//      Sending the browser's own Date.now() instead skips everything in between.

const sender = {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Catch Up Sender',
  studentId: '2005001',
  hall: 6,
  designation: 1,
};

// A deliberately old watermark: the response claims a full page ending here, with more behind it.
const TRUNCATED_SERVER_TIME = 1756512000123;

const truncatedPage = {
  statusCode: 200,
  body: {
    status: 'OK',
    statusCode: 200,
    message: 'Messages fetched successfully',
    messages: Array.from({ length: 30 }, (_unused, index) => ({
      _id: `stub${String(index).padStart(3, '0')}`,
      text: `catch up ${index}`,
      date: TRUNCATED_SERVER_TIME - (29 - index),
      sender,
    })),
    // NOT the server clock. The newest returned row, so the messages that did not fit are
    // still owed to this client.
    serverTime: TRUNCATED_SERVER_TIME,
    hasMore: true,
  },
};

describe('a catch-up that does not finish in one press', () => {
  beforeEach(() => {
    superAdminToken().then(clearMessagesViaApi);
  });

  it('says there is more, and asks from the returned serverTime rather than the browser clock', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');

    cy.intercept('GET', '**/messages*', truncatedPage).as('truncated');
    cy.get('[data-cy="chatFabId"]').click();
    cy.get('[data-cy="chatFetchMessagesButton"]').click();
    cy.wait('@truncated');

    // 1. The label changes, and the button becomes the obvious next action.
    cy.get('[data-cy="chatFetchMessagesButton"]').should('contain.text', 'More messages waiting');

    // The stored watermark is what the server said, verbatim.
    cy.window().then((win) => {
      const stored = JSON.parse(win.localStorage.getItem(LAST_FETCHED_AT_KEY) as string);
      expect(stored.value, 'the watermark is the response serverTime').to.eq(TRUNCATED_SERVER_TIME);
    });

    // 2. The next press carries exactly that value. Date.now() here would be years later and
    // would skip every message in between.
    cy.intercept('GET', '**/messages*').as('nextPress');
    cy.get('[data-cy="chatFetchMessagesButton"]').click();
    cy.wait('@nextPress').its('request.url').should('contain', `after=${TRUNCATED_SERVER_TIME}`);
  });

  it('goes back to the plain label once the catch-up is drained', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');

    cy.intercept('GET', '**/messages*', truncatedPage).as('truncated');
    cy.get('[data-cy="chatFabId"]').click();
    cy.get('[data-cy="chatFetchMessagesButton"]').click();
    cy.wait('@truncated');
    cy.get('[data-cy="chatFetchMessagesButton"]').should('contain.text', 'More messages waiting');

    // Now the gap is drained.
    cy.intercept('GET', '**/messages*', {
      statusCode: 200,
      body: {
        status: 'OK',
        statusCode: 200,
        message: 'Messages fetched successfully',
        messages: [],
        serverTime: TRUNCATED_SERVER_TIME + 1000,
        hasMore: false,
      },
    }).as('drained');
    cy.get('[data-cy="chatFetchMessagesButton"]').click();
    cy.wait('@drained');

    cy.get('[data-cy="chatFetchMessagesButton"]').should('contain.text', 'Fetch messages');
  });

  it('does not loop: one press issues exactly one request', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');

    let pressRequests = 0;
    cy.get('[data-cy="chatFabId"]').click();
    cy.intercept('GET', '**/messages*', (req) => {
      pressRequests += 1;
      req.reply(truncatedPage);
    }).as('counted');

    cy.get('[data-cy="chatFetchMessagesButton"]').click();
    cy.wait('@counted');
    cy.wait(1500);

    // An action that re-dispatched itself until drained would turn one press into an unbounded
    // burst against a rate limiter, on the slow connection the member is most likely on.
    cy.then(() => expect(pressRequests, 'exactly one request per press').to.eq(1));
  });
});
