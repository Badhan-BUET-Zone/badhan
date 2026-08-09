import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 2
// of the registration sequence. Validated at this step against the same seven-digit rule donor creation uses.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees.

describe('docs screenshot — registration question 2 (studentId)', () => {
  it('captures the studentId step on its own', () => {
    cy.viewport(393, 700);
    walkTo('studentId', '1905202');

    cy.get('[data-cy="registrationStep-studentId"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-studentId"]').screenshot('registration-q02-studentId');
  });
});
