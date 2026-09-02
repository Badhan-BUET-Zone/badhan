// The page hands out a working credential, so the assertions that matter are about which one:
// the file must carry a freshly minted temporary token, never the session token in local storage,
// and that token must actually authenticate.
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

describe('AI Integration', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();

  it('downloads a prompt file carrying a fresh temporary token, not the session token', () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    drawer.goToAIIntegration();

    cy.contains('The file expires 30 minutes after you make it').should('be.visible');

    cy.get('[data-cy="aiPromptPreviewId"]').click();
    cy.get('.ai-prompt-preview').should('be.visible').and('contain', 'x-auth');

    cy.window().then((win) => {
      const sessionToken = win.localStorage.getItem('x-auth');
      expect(sessionToken, 'session token in local storage').to.be.a('string').and.not.be.empty;

      // Nothing on screen shows a real token — not the session one, and not a minted one either,
      // because none is minted until a button is pressed.
      cy.get('.ai-prompt-preview').should('not.contain', sessionToken as string);

      cy.get('[data-cy="downloadAiPromptId"]').click();
      notification.assertContains('Prompt file downloaded');

      cy.readFile(DOWNLOADED_FILE, { timeout: 15000 }).then((contents: string) => {
        expect(contents).to.contain('/openapi.json');
        expect(contents, 'the file must not carry the permanent session token').to.not.contain(sessionToken as string);

        const fileToken = tokenFromPrompt(contents);
        expect(fileToken).to.not.equal(sessionToken);

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
});
