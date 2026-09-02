// The page hands out a working credential, so the assertions that matter are about which one:
// the file must carry a freshly minted temporary token, never the session token in local storage,
// and that token must actually authenticate. The same rule governs the MCP half of the page below:
// shape is not enough, so every copied thing is used against the real API rather than inspected.
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

// A JWT is signed, not encrypted, so the lifetime it actually carries can be read straight off the
// token — the same trick tests/users/redirection/duration.test.js uses in the backend suite. This
// is the assertion that matters for the selector: the page could print one number while the token
// expired on another schedule.
const tokenLifetimeSeconds = (token: string): number => {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  return payload.exp - payload.iat;
};

// vue-clipboard2 copies by selecting a detached element and calling execCommand, so the selection
// at that moment is the copied text. Stubbing it is the only way to read a clipboard Cypress
// cannot otherwise see.
const captureClipboard = (onCopy: (text: string) => void): void => {
  cy.window().then((win) => {
    cy.stub(win.document, 'execCommand').callsFake(() => {
      onCopy(win.getSelection()?.toString() ?? '');
      return true;
    });
  });
};

const initialize = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } };

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

  it('copies an MCP config whose token opens a session on the real endpoint', () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
    drawer.goToAIIntegration();

    cy.contains('Connect an MCP client').should('be.visible');

    let copied = '';
    captureClipboard((text) => {
      copied = text;
    });

    cy.window().then((win) => {
      const sessionToken = win.localStorage.getItem('x-auth');
      expect(sessionToken, 'session token in local storage').to.be.a('string').and.not.be.empty;

      cy.get('[data-cy="copyMcpConfigId"]').click({ force: true });
      notification.assertContains('MCP config copied');

      cy.wrap(null).should(() => {
        const parsed = JSON.parse(copied);
        expect(parsed.mcpServers.badhan.url, 'the configured endpoint').to.match(/\/mcp$/);
        const configToken = parsed.mcpServers.badhan.headers['x-auth'];
        expect(configToken, 'the config must carry a minted token').to.be.a('string').and.not.be.empty;
        // Same rule as the file above: never the permanent session token.
        expect(configToken).to.not.equal(sessionToken as string);
      });

      cy.then(() => {
        const parsed = JSON.parse(copied);
        // Shape is not enough — the credential has to open an actual MCP session.
        cy.request({
          method: 'POST',
          url: parsed.mcpServers.badhan.url,
          headers: { 'x-auth': parsed.mcpServers.badhan.headers['x-auth'] },
          body: initialize,
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.result.serverInfo.name).to.eq('badhan');
        });
      });
    });
  });

  it('copies a connector URL that needs no headers at all', () => {
    // The whole claim of the path form: the URL alone is enough, because claude.ai's and ChatGPT's
    // connectors have nowhere to type a header. It is one request to check, and if it ever stopped
    // being true the page would be telling members to do something that cannot work.
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
    drawer.goToAIIntegration();

    let copied = '';
    captureClipboard((text) => {
      copied = text;
    });

    cy.get('[data-cy="copyMcpConnectorUrlId"]').click({ force: true });
    notification.assertContains('Connector URL copied');

    cy.then(() => {
      cy.request({ method: 'POST', url: copied, body: initialize }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.result.serverInfo.name).to.eq('badhan');
      });
    });
  });

  it('leaves the lifetime selector at 30 minutes unless it is changed', () => {
    // The default is the safety property of the selector: nobody should end up holding a
    // longer-lived token by accident, and choosing one is the moment the warning is read. So the
    // untouched default is pinned on the token itself, not on what the page says.
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
    drawer.goToAIIntegration();

    cy.get('[data-cy="mcpLongLifetimeWarningId"]').should('not.exist');

    let copied = '';
    captureClipboard((text) => {
      copied = text;
    });

    cy.get('[data-cy="copyMcpCommandId"]').click({ force: true });
    notification.assertContains('CLI command copied');

    cy.wrap(null).should(() => {
      expect(copied, 'the Claude Code one-liner').to.contain('claude mcp add --transport http badhan');
      const match = copied.match(/--header "x-auth: (\S+)"/);
      expect(match, 'the header argument').to.not.be.null;
      expect(tokenLifetimeSeconds((match as RegExpMatchArray)[1])).to.eq(1800);
    });

    // And choosing a longer one says so, in as many words.
    cy.get('[data-cy="mcpDurationId"]').click({ force: true });
    cy.contains('.v-list-item__title', '24 hours').click({ force: true });
    cy.get('[data-cy="mcpLongLifetimeWarningId"]').should('contain', '48 times');
  });
});
