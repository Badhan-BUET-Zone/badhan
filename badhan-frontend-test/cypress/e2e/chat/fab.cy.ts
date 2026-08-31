import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { clickDrawerEntry } from '@support/helpers/chat';

// The floating button: who sees it, and where it deliberately does not appear.

describe('the chat floating button', () => {
  it('is not shown to somebody who is signed out', () => {
    cy.visit('/');
    cy.get('[data-cy="signInPhoneTextBox"]').should('be.visible');
    // App.vue gates it on a token, so the sign-in screen must never carry it.
    cy.get('[data-cy="chatFabId"]').should('not.exist');
  });

  it('is shown on every signed-in screen', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');

    // It lives in App.vue, outside <router-view>, so it survives a route change rather than
    // being re-mounted by each view. Navigating away and back must not need it to reappear.
    clickDrawerEntry('publicContactsNavigationId');
    cy.hash().should('eq', '#/contacts');
    cy.get('[data-cy="chatFabId"]').should('be.visible');
  });

  it('hides itself on the chat page, which is the page it opens', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');

    clickDrawerEntry('chatNavigationId');
    cy.hash().should('eq', '#/chat');

    // A floating button that opens the page you are already looking at is noise.
    cy.get('[data-cy="chatFabId"]').should('not.exist');

    // And it comes back when you leave.
    clickDrawerEntry('homeNavigationId');
    cy.hash().should('eq', '#/home');
    cy.get('[data-cy="chatFabId"]').should('be.visible');
  });
});
