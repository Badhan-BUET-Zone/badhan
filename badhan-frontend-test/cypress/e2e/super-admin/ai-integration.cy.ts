// The page hands out a working credential, so the assertions that matter are about which one:
// the file must carry a freshly minted temporary token, never the session token in local storage,
// and that token must actually authenticate. Shape is not enough, so the credential is used
// against the real API rather than inspected.
import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { MESSAGES } from '@support/constants';

const DOWNLOADED_FILE = 'cypress/downloads/badhan-api-prompt.md';

// The one line of the file that carries the credential. Reading it back out is what lets the test
// use the token rather than merely look at it.
const tokenFromPrompt = (contents: string): string => {
  const match = contents.match(/x-auth: (\S+)/);
  expect(match, 'x-auth line in the prompt file').to.not.be.null;
  return (match as RegExpMatchArray)[1];
};

// A JWT is signed, not encrypted, so what it actually claims can be read straight off the token —
// the same trick tests/users/redirection/duration.test.js uses in the backend suite.
const payloadOf = (token: string): { exp?: number; jti?: string } =>
  JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));

describe('AI Integration', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();

  it('downloads a setup file carrying a fresh temporary token, not the session token', () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    drawer.goToAIIntegration();

    cy.contains('Only connect an assistant you trust').should('be.visible');
    cy.contains('Server the file points at:').should('not.exist');
    cy.get('[data-cy="aiSetupDomainId"]').should('be.visible').and('not.contain', '://');
    cy.get('[data-cy="copyAiSetupDomainId"]').should('be.visible');

    cy.window().then((win) => {
      const sessionToken = win.localStorage.getItem('x-auth');
      expect(sessionToken, 'session token in local storage').to.be.a('string').and.not.be.empty;

      // Nothing on screen shows a real token — not the session one, and not a minted one either,
      // because none is minted until a button is pressed.
      cy.get('[data-cy="downloadAiPromptId"]').click();
      notification.assertContains('Setup file downloaded');

      cy.readFile(DOWNLOADED_FILE, { timeout: 15000 }).then((contents: string) => {
        expect(contents).to.contain('/openapi.json');
        expect(contents, 'the file must not carry the permanent session token').to.not.contain(sessionToken as string);

        const fileToken = tokenFromPrompt(contents);
        expect(fileToken).to.not.equal(sessionToken);

        // The page no longer offers a lifetime, because the token no longer has one: it lives
        // until its row is deleted from My Profile's device list. No exp is what makes that
        // device list the real revocation rather than a claim.
        const payload = payloadOf(fileToken);
        expect(payload.exp, 'the token must carry no expiry').to.be.undefined;
        expect(payload.jti, 'every token is its own credential').to.be.a('string');

        // The token is only useful if it authenticates, so ask the API rather than trusting shape.
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiBaseURL')}/users/me`,
          headers: { 'x-auth': fileToken },
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.donor.designation).to.eq(3);
        });
      });
    });
  });

  it('offers Claude only, and walks the setup-file route from opening claude.ai to asking a question', () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
    drawer.goToAIIntegration();

    // The steps start at claude.ai and end at a question asked, because the step that gets missed
    // is the one outside this page: the domain allowlist under Settings. Splitting the route into
    // what you do once and what you do every time is what keeps the second list short enough to
    // actually follow each morning.
    cy.get('[data-cy="setupAiAppInstructionsId"]')
      .should('contain', 'claude.ai')
      .and('contain', 'One time setup')
      .and('contain', 'For your everyday use')
      .and('contain', 'Capabilities')
      .and('contain', 'Additional allowed domains');
    cy.get('[data-cy="setupFileOnceStepsId"] li').should('have.length', 5);
    cy.get('[data-cy="setupFileEverydayStepsId"] li').should('have.length', 3);

    // The connector route is gone: Badhan no longer runs an MCP server, so there is no link to
    // copy and nothing to add under Claude's Connectors.
    cy.get('[data-cy="aiAppInstructionsId"]').should('not.exist');
    cy.get('[data-cy="copyMcpConnectorUrlId"]').should('not.exist');
    cy.contains('Add custom connector').should('not.exist');

    // Nothing to choose between any more, and no assistant on the page but Claude.
    cy.get('[data-cy="setupAiAppSelectorId"]').should('not.exist');
    cy.get('[data-cy="aiAppSelectorId"]').should('not.exist');
    cy.contains('ChatGPT').should('not.exist');
    cy.contains('Claude Code').should('not.exist');
    cy.contains('Cursor').should('not.exist');
  });

  it('keeps connection details out of the page while explaining how to remove access', () => {
    // The page used to say signing out revokes the token. It does not: DELETE /users/signout ends
    // only the token that made the request. With no expiry, wrong wording here is the difference
    // between a member thinking they revoked access and having done nothing at all.
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
    drawer.goToAIIntegration();

    cy.contains('My Profile').should('be.visible');
    cy.contains('Server the file points at:').should('not.exist');
  });
});
