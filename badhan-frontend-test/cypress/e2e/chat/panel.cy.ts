import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { superAdminToken, clearMessagesViaApi } from '@support/helpers/chat';

describe('the chat panel', () => {
  beforeEach(() => {
    superAdminToken().then(clearMessagesViaApi);
  });

  it('opens from the button, sends, and clears the composer', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
    cy.get('[data-cy="chatPanel"]').should('be.visible');

    cy.get('[data-cy="chatComposerInput"]').type('Need 2 bags of O+ at DMC tonight');
    cy.get('[data-cy="chatComposerSendButton"]').click();

    cy.get('[data-cy="chatBubbleOwn"]', { timeout: 20000 }).should('contain.text', 'Need 2 bags of O+');
    // Cleared only on success, so a failed send never loses what was typed.
    cy.get('[data-cy="chatComposerInput"]').should('have.value', '');
  });

  it('leaves the typed text alone when the send fails', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();

    cy.intercept('POST', '**/messages', { statusCode: 500, body: { message: 'boom' } }).as('failedSend');
    cy.get('[data-cy="chatComposerInput"]').type('this must survive a failure');
    cy.get('[data-cy="chatComposerSendButton"]').click();
    cy.wait('@failedSend');

    // The user retypes nothing.
    cy.get('[data-cy="chatComposerInput"]').should('have.value', 'this must survive a failure');
    cy.get('[data-cy="chatBubbleOwn"]').should('not.exist');
  });

  it('stores message text raw, so an apostrophe is not mangled into an entity', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
    cy.get('[data-cy="chatComposerInput"]').type("I can't come tonight");
    cy.get('[data-cy="chatComposerSendButton"]').click();

    // Escaping on the way in would put "I can&#x27;t come tonight" on every member's screen.
    // Safety is enforced at render time by {{ }} instead.
    cy.get('[data-cy="chatBubbleText"]', { timeout: 20000 }).should('have.text', "I can't come tonight");
  });

  it('renders angle brackets as text rather than as markup', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
    cy.get('[data-cy="chatComposerInput"]').type('<img src=x onerror=alert(1)>');
    cy.get('[data-cy="chatComposerSendButton"]').click();

    // The entire XSS story for the feature: Vue text interpolation, never v-html.
    cy.get('[data-cy="chatBubbleText"]', { timeout: 20000 })
      .should('have.text', '<img src=x onerror=alert(1)>')
      .find('img')
      .should('not.exist');
  });

  it('refuses to send an empty message', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
    cy.get('[data-cy="chatComposerSendButton"]').should('be.disabled');
    cy.get('[data-cy="chatComposerInput"]').type('   ');
    cy.get('[data-cy="chatComposerSendButton"]').should('be.disabled');
  });
});
