import { signInWithSeededRoom, openPanel } from './setup';
import { hideOverlays } from '../hideOverlays';

describe('docs screenshot — the Fetch messages button', () => {
  it('captures the control that is the whole refresh model, after a check', () => {
    signInWithSeededRoom();
    openPanel();
    cy.get('[data-cy="chatFetchMessagesButton"]').click();
    // "Last checked just now" beside it is half the point of the picture.
    cy.get('[data-cy="chatLastCheckedLabel"]').should('contain.text', 'Last checked');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="chatFetchMessagesButton"]').parent().screenshot('chat-fetch-button', { overwrite: true });
  });
});
