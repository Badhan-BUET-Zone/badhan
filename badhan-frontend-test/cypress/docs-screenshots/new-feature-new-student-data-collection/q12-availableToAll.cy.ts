import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 12
// of the registration sequence. A yes/no choice, with one line explaining what saying yes means.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees.

describe('docs screenshot — registration question 12 (availableToAll)', () => {
  it('captures the availableToAll step on its own', () => {
    cy.viewport(393, 700);
    walkTo('availableToAll', '1905211');

    cy.get('[data-cy="registrationStep-availableToAll"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-availableToAll"]').screenshot('registration-q12-availableToAll');
  });
});
