import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 7
// of the registration sequence. The platelet half of the pair, with the same Skip-means-zero rule.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees.

describe('docs screenshot — registration question 7 (plateletDonationCount)', () => {
  it('captures the plateletDonationCount step on its own', () => {
    cy.viewport(393, 700);
    walkTo('plateletDonationCount', '1905207');

    cy.get('[data-cy="registrationStep-plateletDonationCount"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-plateletDonationCount"]').screenshot('registration-q07-plateletDonationCount');
  });
});
