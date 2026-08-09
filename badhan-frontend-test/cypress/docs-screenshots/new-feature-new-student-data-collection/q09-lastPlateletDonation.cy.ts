import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 9
// of the registration sequence. Conditional on the platelet count, exactly as lastDonation is on the blood one.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees.

describe('docs screenshot — registration question 9 (lastPlateletDonation)', () => {
  it('captures the lastPlateletDonation step on its own', () => {
    cy.viewport(393, 700);
    walkTo('lastPlateletDonation', '1905208');

    cy.get('[data-cy="registrationStep-lastPlateletDonation"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-lastPlateletDonation"]').screenshot('registration-q09-lastPlateletDonation');
  });
});
