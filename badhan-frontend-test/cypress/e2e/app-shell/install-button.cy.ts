// Every signal the install entry reads is a window property, so every row of its decision table
// can be driven from `cy.visit`'s onBeforeLoad. Nothing here waits for a real browser install
// prompt: the app runs against the `local` environment, which registers no service worker, so
// Chrome never offers one on its own. That is also why row "wide screen, no event" is the default
// state under Cypress rather than something to arrange.
import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';

// The same constant the app holds in src/mixins/constants.ts. Duplicated rather than imported —
// this project does not compile against the frontend's sources.
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.mmmbadhan';

const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 800;

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

describe('Install entry at the foot of the menu', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();

  // The drawer only exists behind a token, so every row starts with a sign in. The stub goes in
  // before the bundle evaluates, because the module that reads these signals runs at import time.
  const signIn = (onBeforeLoad?: (win: Cypress.AUTWindow) => void): void => {
    cy.visit('/', onBeforeLoad ? { onBeforeLoad } : {});
    signInPage.typePhone(AUTH_CREDENTIALS.phone);
    signInPage.typePassword(AUTH_CREDENTIALS.password);
    signInPage.submit();
  };

  // The listener is registered while the bundle evaluates, which is after onBeforeLoad has run —
  // so the synthetic event has to be dispatched from the running page, not stubbed into it.
  const dispatchInstallPrompt = (outcome: 'accepted' | 'dismissed' = 'accepted'): void => {
    cy.window().then((win) => {
      const event = new win.Event('beforeinstallprompt') as InstallPromptEvent;
      event.prompt = cy.stub().as('promptStub').resolves();
      event.userChoice = Promise.resolve({ outcome });
      win.dispatchEvent(event);
    });
  };

  // Vuetify's breakpoint code calls matchMedia too, so only the display-mode queries are answered
  // here and everything else is handed back to the real implementation.
  const pretendLaunchedAsInstalledApp = (win: Cypress.AUTWindow): void => {
    const realMatchMedia = win.matchMedia.bind(win);
    win.matchMedia = (query: string): MediaQueryList => {
      if (!query.includes('display-mode')) return realMatchMedia(query);
      return {
        matches: true,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      } as MediaQueryList;
    };
  };

  const pretendAlreadyInstalledOnThisMachine = (win: Cypress.AUTWindow): void => {
    (win.navigator as Navigator & { getInstalledRelatedApps: () => Promise<unknown[]> })
      .getInstalledRelatedApps = () => Promise.resolve([
        { platform: 'webapp', url: 'https://badhan-buet.web.app/manifest.json' },
      ]);
  };

  it('installs in place on a wide screen when the browser has offered a prompt', () => {
    cy.viewport(DESKTOP_WIDTH, DESKTOP_HEIGHT);
    signIn();
    dispatchInstallPrompt('accepted');

    drawer.ensureOpen();
    drawer.installEntry().should('be.visible').and('contain.text', 'Install App');
    drawer.installEntry().click();

    cy.get('@promptStub').should('have.been.calledOnce');
    notification.assertEquals('Badhan is being installed');
  });

  it('links to the Play Store on a small screen, prompt or no prompt', () => {
    cy.viewport('iphone-x');
    signIn();
    // Dispatched deliberately: Android Chrome does fire this event, and the phone branch is
    // supposed to ignore it and send people to the store anyway.
    dispatchInstallPrompt('accepted');

    drawer.ensureOpen();
    drawer.installEntry().should('be.visible').and('contain.text', 'Get the App');
    // Asserted, never clicked — following it would navigate the test out of the app.
    drawer.installEntry().should('have.attr', 'href', PLAY_STORE_URL);
    cy.get('@promptStub').should('not.have.been.called');
  });

  it('shows nothing when the page was launched as an installed app, at either width', () => {
    cy.viewport(DESKTOP_WIDTH, DESKTOP_HEIGHT);
    signIn(pretendLaunchedAsInstalledApp);

    drawer.ensureOpen();
    drawer.themeToggle().should('be.visible');
    drawer.assertNoInstallEntry();

    // The desktop half is the one that would go unnoticed, so both widths are checked. The
    // breakpoint is reactive, so no reload is needed.
    cy.viewport('iphone-x');
    drawer.assertNoInstallEntry();

    // And the standalone check has to beat an available prompt, not merely coexist with it.
    cy.viewport(DESKTOP_WIDTH, DESKTOP_HEIGHT);
    dispatchInstallPrompt('accepted');
    drawer.assertNoInstallEntry();
  });

  it('shows nothing when the app is already installed on this machine but viewed in a tab', () => {
    cy.viewport(DESKTOP_WIDTH, DESKTOP_HEIGHT);
    signIn(pretendAlreadyInstalledOnThisMachine);

    dispatchInstallPrompt('accepted');
    drawer.ensureOpen();
    // Asserted first so the absence below cannot be a snapshot taken before the drawer, or the
    // getInstalledRelatedApps promise, had a chance to have their say.
    drawer.themeToggle().should('be.visible');
    drawer.assertNoInstallEntry();
  });

  it('shows nothing on a wide screen when no prompt was ever offered', () => {
    cy.viewport(DESKTOP_WIDTH, DESKTOP_HEIGHT);
    signIn();

    drawer.ensureOpen();
    drawer.themeToggle().should('be.visible');
    // The row that would break silently if the listener were ever moved into a component: there it
    // would still be absent here, and only a real browser would notice.
    drawer.assertNoInstallEntry();
  });
});
