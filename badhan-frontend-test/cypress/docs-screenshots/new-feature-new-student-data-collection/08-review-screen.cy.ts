import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.
//
// The review screen is the only place the sequence can be sent, and the only place the hall the
// code was made for is stated. Both are worth showing.

describe('docs screenshot — the review screen', () => {
  it('captures every answer, the hall line and the Submit button', () => {
    // Wide enough that no question wraps. It is NOT tall enough for all thirteen rows and cannot
    // be: an element capture is capped at roughly the headless window height whatever the viewport
    // says, and it clips rather than stitches. So this frame carries the top — the heading, the
    // hall line and the first answers — and 08b-review-submit.cy.ts carries the end of the table
    // and the buttons. The two overlap by a few rows on purpose.
    cy.viewport(1000, 1300);
    // 'review' is not a step, so the walk answers all thirteen questions and lands here — including
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
