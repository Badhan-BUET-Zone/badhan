import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 11
// of the registration sequence. Optional in the same way.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees.

describe('docs screenshot — registration question 11 (address)', () => {
  it('captures the address step on its own', () => {
    cy.viewport(393, 700);
    walkTo('address', '1905210');

    cy.get('[data-cy="registrationStep-address"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-address"]').screenshot('registration-q11-address');
  });
});
