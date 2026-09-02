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

// A JWT is signed, not encrypted, so what it actually claims can be read straight off the token —
// the same trick tests/users/redirection/duration.test.js uses in the backend suite.
const payloadOf = (token: string): { exp?: number; jti?: string } =>
  JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));

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

const selectAIApp = (app: string): void => {
  cy.get('[data-cy="aiAppSelectorId"]').click();
  cy.contains('.v-list-item', app).click();
};

const selectSetupAIApp = (app: string): void => {
  cy.get('[data-cy="setupAiAppSelectorId"]').click();
  cy.contains('.v-list-item', app).click();
};

const initialize = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } };

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
    cy.get('[data-cy="mcpEndpointId"]').should('not.exist');
    selectSetupAIApp('I am using ChatGPT');
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

    cy.contains('Connect an AI app').should('be.visible');

    let copied = '';
    captureClipboard((text) => {
      copied = text;
    });

    cy.window().then((win) => {
      const sessionToken = win.localStorage.getItem('x-auth');
      expect(sessionToken, 'session token in local storage').to.be.a('string').and.not.be.empty;

      selectAIApp('I am using VS Code, Cursor, or another desktop AI app');
      cy.get('[data-cy="copyMcpConfigId"]').click({ force: true });
      notification.assertContains('Desktop app setup copied');

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

    selectAIApp('I am using ChatGPT (only for paid)');
    cy.get('[data-cy="copyMcpConnectorUrlId"]').click({ force: true });
    notification.assertContains('Connection link copied');

    cy.then(() => {
      cy.request({ method: 'POST', url: copied, body: initialize }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.result.serverInfo.name).to.eq('badhan');
      });
    });
  });

  it('mints a non-expiring token, and a different one each press', () => {
    // The page no longer offers a lifetime, because the token no longer has one: it lives until
    // its row is deleted from My Profile's device list. Two things have to hold for that to be a
    // real revocation rather than a claim — no exp on the token, and a distinct token per press,
    // since two identical ones would share a row and deleting either would end neither.
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
    drawer.goToAIIntegration();

    let copied = '';
    const seen: string[] = [];
    captureClipboard((text) => {
      copied = text;
      seen.push(text);
    });

    selectAIApp('I am using Claude Code');
    cy.get('[data-cy="copyMcpCommandId"]').click({ force: true });
    notification.assertContains('Claude Code setup copied');

    cy.wrap(null).should(() => {
      expect(copied, 'the Claude Code one-liner').to.contain('claude mcp add --transport http badhan');
      const match = copied.match(/--header "x-auth: (\S+)"/);
      expect(match, 'the header argument').to.not.be.null;
      const payload = payloadOf((match as RegExpMatchArray)[1]);
      expect(payload.exp, 'the token must carry no expiry').to.be.undefined;
      expect(payload.jti, 'every token is its own credential').to.be.a('string');
    });

    // A second press is a second connection, endable on its own.
    selectAIApp('I am using VS Code, Cursor, or another desktop AI app');
    cy.get('[data-cy="copyMcpConfigId"]').click({ force: true });
    notification.assertContains('Desktop app setup copied');
    cy.wrap(null).should(() => {
      expect(seen.length).to.eq(2);
      const first = (seen[0].match(/--header "x-auth: (\S+)"/) as RegExpMatchArray)[1];
      const second = JSON.parse(seen[1]).mcpServers.badhan.headers['x-auth'];
      expect(second).to.not.equal(first);
    });
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
    cy.contains('MCP endpoint:').should('not.exist');
    cy.get('[data-cy="mcpDurationId"]').should('not.exist');
  });

  it('shows three setup steps for the selected AI app', () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
    drawer.goToAIIntegration();

    const choices = [
      ['I am using VS Code, Cursor, or another desktop AI app', 'VS Code, Cursor, or another desktop AI app'],
      ['I am using Claude Code', 'Claude Code'],
      ['I am using ChatGPT (only for paid)', 'ChatGPT'],
      ['I am using Claude', 'Claude'],
    ];

    choices.forEach(([choice, heading]) => {
      selectAIApp(choice);
      cy.get('[data-cy="aiAppInstructionsId"]')
        .should('contain', heading)
        .find('ol li')
        .should('have.length', 3);
    });
  });

  it('shows setup-file instructions for ChatGPT and Claude Web UI', () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
    drawer.goToAIIntegration();

    selectSetupAIApp('I am using ChatGPT');
    cy.get('[data-cy="setupAiAppInstructionsId"]')
      .should('contain', 'allow the Badhan domain written in the setup file')
      .find('ol li')
      .should('have.length', 3);

    selectSetupAIApp('I am using Claude Web UI');
    cy.get('[data-cy="setupAiAppInstructionsId"]')
      .should('contain', 'allow the Badhan domain written in the setup file')
      .find('ol li')
      .should('have.length', 3);
  });
});
