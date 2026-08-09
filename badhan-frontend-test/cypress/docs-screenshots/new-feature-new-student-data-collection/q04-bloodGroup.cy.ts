import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 4
// of the registration sequence. Chosen from buttons rather than typed or picked from a dropdown.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees.

describe('docs screenshot — registration question 4 (bloodGroup)', () => {
  it('captures the bloodGroup step on its own', () => {
    cy.viewport(393, 700);
    walkTo('bloodGroup', '1905204');

    cy.get('[data-cy="registrationStep-bloodGroup"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-bloodGroup"]').screenshot('registration-q04-bloodGroup');
  });
});
