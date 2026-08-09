import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.
//
// The review screen is the only place the sequence can be sent, and the only place the hall the
// code was made for is stated. Both are worth showing.

describe('docs screenshot — the review screen', () => {
  it('captures every answer, the hall line and the Submit button', () => {
    // Wide enough that no question wraps and tall enough for all twelve rows plus Submit: an
    // element taller than the viewport gets clipped, not stitched, so the frame has to fit it.
    cy.viewport(1000, 1200);
    // 'review' is not a step, so the walk answers all twelve questions and lands here — including
    // the two conditional dates, so the screen shows the full sequence rather than a short one.
    walkTo('review', '1905221');

    cy.get('[data-cy="registrationReview"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    // Element capture, with the viewport made taller than the element. fullPage was tried first and
    // is wrong here: its stitch duplicated a table row and still lost the buttons.
    cy.get('[data-cy="registrationReview"]').screenshot('registration-review');
  });
});
