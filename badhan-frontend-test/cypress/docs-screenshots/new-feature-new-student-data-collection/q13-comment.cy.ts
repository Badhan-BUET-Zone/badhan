import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 13
// of the registration sequence. The catch-all, and where a student writes which hall they actually live in.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees.

describe('docs screenshot — registration question 13 (comment)', () => {
  it('captures the comment step on its own', () => {
    cy.viewport(393, 700);
    walkTo('comment', '1905212');

    cy.get('[data-cy="registrationStep-comment"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-comment"]').screenshot('registration-q13-comment');
  });
});
