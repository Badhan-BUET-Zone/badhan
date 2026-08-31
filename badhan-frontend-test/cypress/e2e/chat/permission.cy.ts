import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import {
  superAdminToken,
  clearMessagesViaApi,
  clickDrawerEntry,
  LAST_READ_AT_KEY,
} from '@support/helpers/chat';

// THE REGRESSION TEST FOR THE DEMOTED MEMBER.
//
// A demoted member keeps a working token until it expires, and their local store still says
// they are a Volunteer — so the button, the drawer entry and the route guard all still pass
// while every request 403s. That is a member-only room that is visible, reachable and
// permanently broken.
//
// Refreshing only the designation would fix the chat and leave every other cached permission
// equally stale, so a 403 is treated the way a 401 already is: clear the session and send them
// to sign in again, where the server hands back what they actually are now.

const FORBIDDEN = {
  statusCode: 403,
  body: { status: 'ERROR', statusCode: 403, message: 'Only Badhan members can use the member chat' },
};

const expectSignedOut = () => {
  cy.get('[data-cy="signInPhoneTextBox"]', { timeout: 20000 }).should('be.visible');
  cy.window().then((win) => {
    expect(win.localStorage.getItem('x-auth'), 'the token is cleared').to.be.null;
    // ldb.reset() takes both chat watermarks with it, which is correct: the next person to
    // sign in on this device must not inherit a stranger's read watermark.
    expect(win.localStorage.getItem(LAST_READ_AT_KEY), 'the read watermark is cleared').to.be.null;
  });
};

describe('a member who has been demoted', () => {
  beforeEach(() => {
    superAdminToken().then(clearMessagesViaApi);
  });

  it('is signed out when the fetch is refused', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
    // Wait for the panel before arming the 403. A fresh sign-in fires its own fetch, and an
    // intercept registered while that one is still in flight refuses it instead — which tests
    // the same handler by accident, from a request the spec did not mean to aim at.
    cy.get('[data-cy="chatFetchMessagesButton"]', { timeout: 20000 }).should('be.visible');

    cy.intercept('GET', '**/messages*', FORBIDDEN).as('forbiddenFetch');
    cy.get('[data-cy="chatFetchMessagesButton"]').click();
    cy.wait('@forbiddenFetch');

    // Not a blank room, and not a chat that stays visible and keeps failing.
    expectSignedOut();
  });

  it('is signed out when a send is refused', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
    cy.get('[data-cy="chatComposerInput"]', { timeout: 20000 }).should('be.visible');

    cy.intercept('POST', '**/messages', FORBIDDEN).as('forbiddenSend');
    cy.get('[data-cy="chatComposerInput"]').type('let me back in');
    cy.get('[data-cy="chatComposerSendButton"]').click();
    cy.wait('@forbiddenSend');

    expectSignedOut();
  });

  it('is signed out when a delete is refused', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
    cy.get('[data-cy="chatComposerInput"]').type('written while still a member');
    cy.get('[data-cy="chatComposerSendButton"]').click();
    cy.get('[data-cy="chatBubbleOwn"]', { timeout: 20000 }).should('exist');

    cy.intercept('DELETE', '**/messages*', FORBIDDEN).as('forbiddenDelete');
    cy.get('[data-cy="chatBubbleDeleteButton"]').first().click();
    cy.get('[data-cy="confirmationBoxButtonId"]').click();
    cy.wait('@forbiddenDelete');

    expectSignedOut();
  });

  it('is signed out from the chat page too, not only from the panel', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    // Let the app settle before reaching for the drawer: mid-transition the list group is
    // visibility:hidden and a click lands on nothing.
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');
    clickDrawerEntry('chatNavigationId');
    cy.hash().should('eq', '#/chat');

    cy.intercept('GET', '**/messages*', FORBIDDEN).as('forbiddenFetch');
    cy.get('[data-cy="chatFetchMessagesButton"]').click();
    cy.wait('@forbiddenFetch');

    expectSignedOut();
  });
});
