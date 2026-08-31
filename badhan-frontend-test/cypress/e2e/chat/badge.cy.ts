import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import {
  superAdminToken,
  clearMessagesViaApi,
  seedMessagesViaApi,
  createVolunteerWithToken,
  LAST_READ_AT_KEY,
} from '@support/helpers/chat';

// THE SPECIFICATION TEST FOR THE BADGE.
//
// The badge counts unread messages among those this device has FETCHED. It is not a
// server-side unread count and cannot be one — that would need a server that speaks first or a
// client that polls, and the feature does neither. So what is pinned here is the rule the badge
// actually implements, and the two things it deliberately does not do.

// Vuetify keeps the badge element in the DOM and hides it when `:value` is false, so "no badge"
// is an assertion about VISIBILITY. Asserting non-existence here passes for the wrong reason on
// the day the binding breaks and the element is simply never rendered.
const badge = () => cy.get('[data-cy="chatFabBadge"] .v-badge__badge');
const expectNoBadge = () => badge().should('not.be.visible');

describe('the unread badge', () => {
  it('counts what arrived since the chat was last opened, and clears on opening it', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);
      createVolunteerWithToken(adminToken, 'Badge Sender').then((other) => {
        seedMessagesViaApi(other.token, ['first from someone else', 'second', 'third']);

        new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
        cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');

        // Three fetched, none read: the boot fetch must NOT mark its own results read.
        badge().should('have.text', '3');

        cy.get('[data-cy="chatFabId"]').click();
        cy.get('[data-cy="chatPanel"]').should('be.visible');
        // Opening the chat is the only thing that clears it.
        expectNoBadge();

        // A fetch that brings back nothing leaves it at zero.
        cy.get('[data-cy="chatFetchMessagesButton"]').click();
        cy.get('[data-cy="chatLastCheckedLabel"]').should('contain.text', 'Last checked');
        expectNoBadge();
      });
    });
  });

  it('never counts your own messages', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);

      new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
      cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
      cy.get('[data-cy="chatComposerInput"]').type('a message from me');
      cy.get('[data-cy="chatComposerSendButton"]').click();
      cy.get('[data-cy="chatBubbleOwn"]', { timeout: 20000 }).should('exist');

      cy.get('[data-cy="chatPanelCloseButton"]').click();
      // You do not have unread mail from yourself.
      expectNoBadge();
    });
  });

  it('still rises while the panel is open, and clears only on reopening', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);
      createVolunteerWithToken(adminToken, 'Late Sender').then((other) => {
        new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
        cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
        cy.get('[data-cy="chatPanel"]').should('be.visible');
        expectNoBadge();

        // Somebody sends while the panel is already open, and the reader fetches it.
        seedMessagesViaApi(other.token, ['arrived while you were looking']);
        cy.get('[data-cy="chatFetchMessagesButton"]').click();
        cy.get('[data-cy="chatBubbleOther"]', { timeout: 20000 }).should('exist');

        // DELIBERATE: markAllRead fires on OPENING and on nothing else, so the badge rises
        // behind the open panel. The rule stays one unambiguous event rather than growing a
        // second trigger to smooth this over.
        badge().should('have.text', '1');

        cy.get('[data-cy="chatPanelCloseButton"]').click();
        badge().should('have.text', '1');
        cy.get('[data-cy="chatFabId"]').click();
        expectNoBadge();
      });
    });
  });

  it('shows a badge over the whole first page when nothing has ever been read', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);
      createVolunteerWithToken(adminToken, 'First Boot Sender').then((other) => {
        seedMessagesViaApi(other.token, ['one', 'two']);

        new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
        cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');
        cy.window().then((win) => {
          // No read watermark at all — a first ever open. Everything fetched is new to them.
          expect(win.localStorage.getItem(LAST_READ_AT_KEY)).to.be.null;
        });
        badge().should('have.text', '2');
      });
    });
  });
});
