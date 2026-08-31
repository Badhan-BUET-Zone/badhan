import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import {
  superAdminToken,
  clearMessagesViaApi,
  seedMessagesViaApi,
  createVolunteerWithToken,
  storedTimestamp,
  LAST_FETCHED_AT_KEY,
  LAST_READ_AT_KEY,
} from '@support/helpers/chat';

// THE REGRESSION TEST FOR PHASE F7, AND THE ONE FAILURE A HAND-TEST NEVER SURFACES.
//
// The tempting implementation sends `after = chatLastFetchedAt` on app open, like every other
// fetch. It is wrong: the message list lives in Vuex, which is memory, so a reload empties it —
// but the watermark is in local storage and survives. An `after` fetch on boot therefore asks
// "what is new since yesterday evening?", correctly gets nothing, and renders an EMPTY ROOM over
// a conversation with a thousand messages in it.
//
// On a developer's machine, where the tab is never really closed and messages are being seeded
// constantly, this never reproduces. Hence this spec.

describe('cold start', () => {
  it('fetches the newest page with NO cursor, even when a watermark is stored', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);
      createVolunteerWithToken(adminToken, 'Cold Start Sender').then((other) => {
        seedMessagesViaApi(other.token, ['sent long before this boot', 'and another']);

        new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
        cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');

        // Seed the exact state that breaks the wrong implementation: a watermark from an hour
        // ago, and nothing ever read.
        cy.window().then((win) => {
          win.localStorage.setItem(LAST_FETCHED_AT_KEY, storedTimestamp(Date.now() - 60 * 60 * 1000));
          win.localStorage.removeItem(LAST_READ_AT_KEY);
        });

        cy.intercept('GET', '**/messages*').as('bootFetch');
        cy.reload();

        // The request itself is the assertion: no `after`, so the server answers with the
        // newest page rather than with an empty catch-up.
        cy.wait('@bootFetch').its('request.url').should('not.contain', 'after=');

        // A reload can leave the navigation drawer open, and its scrim covers the button.
        new NavigationDrawer().ensureClosed();
        cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
        // And the room is populated rather than blank.
        cy.get('[data-cy="chatBubbleOther"]').should('have.length', 2);
      });
    });
  });

  it('shows a loading state rather than "No messages yet." while the first page is in flight', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);
      createVolunteerWithToken(adminToken, 'Slow Sender').then((other) => {
        seedMessagesViaApi(other.token, ['this room is not empty']);

        new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
        cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');

        // Hold the boot fetch open so the in-flight state can be observed at all.
        cy.intercept('GET', '**/messages*', (req) => {
          req.on('response', (res) => res.setDelay(1500));
        }).as('slowFetch');
        cy.reload();

        new NavigationDrawer().ensureClosed();
        cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
        // "No messages yet." here would tell a member the room is empty when it is not — the
        // whole reason the empty copy waits for a completed fetch.
        cy.get('[data-cy="chatLoading"]').should('exist');
        cy.get('[data-cy="chatEmpty"]').should('not.exist');

        cy.wait('@slowFetch');
        cy.get('[data-cy="chatBubbleOther"]', { timeout: 20000 }).should('exist');
      });
    });
  });
});
