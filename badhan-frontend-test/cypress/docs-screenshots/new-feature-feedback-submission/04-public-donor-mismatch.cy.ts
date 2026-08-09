import { fillIdentityCheck, visitPublicDonorPage } from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Throwaway spec: captures a documentation screenshot for docs/blog.
// ONE cy.screenshot() per spec file — see 01-public-donor-form.cy.ts.

describe('docs screenshot — the public donor page, no match', () => {
  it('captures the single message shown whichever field was wrong', () => {
    visitPublicDonorPage();
    fillIdentityCheck('01700000000', '1900000');

    cy.get('[data-cy="publicDonorMismatch"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="publicDonorForm"]').screenshot('feedback-public-mismatch');
  });
});
