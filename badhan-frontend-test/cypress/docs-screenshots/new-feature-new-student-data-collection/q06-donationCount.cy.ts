import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 6
// of the registration sequence. Optional, and a Skip here sends zero — which also removes the date question that follows.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees.

describe('docs screenshot — registration question 6 (donationCount)', () => {
  it('captures the donationCount step on its own', () => {
    cy.viewport(393, 700);
    walkTo('donationCount', '1905205');

    cy.get('[data-cy="registrationStep-donationCount"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-donationCount"]').screenshot('registration-q06-donationCount');
  });
});
