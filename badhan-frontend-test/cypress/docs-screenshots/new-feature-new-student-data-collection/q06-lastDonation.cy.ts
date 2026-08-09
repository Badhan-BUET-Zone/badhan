import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 6
// of the registration sequence. Conditional: it only appears because the previous count was answered non-zero.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees.

describe('docs screenshot — registration question 6 (lastDonation)', () => {
  it('captures the lastDonation step on its own', () => {
    cy.viewport(393, 700);
    walkTo('lastDonation', '1905206');

    cy.get('[data-cy="registrationStep-lastDonation"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-lastDonation"]').screenshot('registration-q06-lastDonation');
  });
});
