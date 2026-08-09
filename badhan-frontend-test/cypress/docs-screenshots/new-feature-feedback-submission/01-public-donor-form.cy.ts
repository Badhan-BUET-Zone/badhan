import { visitPublicDonorPage } from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Throwaway spec: captures a documentation screenshot for docs/blog.
// ONE cy.screenshot() per spec file — in headless Electron the second capture in a file comes out
// blank. Pages fade in, so wait after the element exists or it records at opacity 0.

describe('docs screenshot — the public donor page, first step', () => {
  it('captures the phone and student ID form a donor sees after scanning', () => {
    visitPublicDonorPage();
    cy.get('[data-cy="publicDonorForm"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="publicDonorForm"]').screenshot('feedback-public-form');
  });
});
