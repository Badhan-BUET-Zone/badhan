import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 9
// of the registration sequence. Optional, so it carries a Skip control of its own rather than an empty Next.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees.

describe('docs screenshot — registration question 9 (roomNumber)', () => {
  it('captures the roomNumber step on its own', () => {
    cy.viewport(393, 700);
    walkTo('roomNumber', '1905209');

    cy.get('[data-cy="registrationStep-roomNumber"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-roomNumber"]').screenshot('registration-q09-roomNumber');
  });
});
