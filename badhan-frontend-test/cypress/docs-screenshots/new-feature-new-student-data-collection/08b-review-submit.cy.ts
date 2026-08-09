import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.
//
// The bottom of the review screen. It needs its own capture: with all thirteen questions answered the
// review element is taller than Cypress will take in one element shot — it clips rather than
// stitches, and fullPage's stitch duplicated a row — so 08 carries the top and this carries the end
// of the table plus BACK and SUBMIT.

describe('docs screenshot — the end of the review screen', () => {
  it('captures the last answers and the Submit button', () => {
    cy.viewport(1000, 500);
    walkTo('review', '1905223');

    cy.get('[data-cy="registrationSubmitButton"]').should('be.visible').scrollIntoView();
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('registration-review-submit', { capture: 'viewport' });
  });
});
