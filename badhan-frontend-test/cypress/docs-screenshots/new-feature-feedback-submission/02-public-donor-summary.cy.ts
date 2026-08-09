import {
  createDonorViaApi,
  fillIdentityCheck,
  visitPublicDonorPage,
  FeedbackDonor,
} from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Throwaway spec: captures a documentation screenshot for docs/blog.
// ONE cy.screenshot() per spec file — see 01-public-donor-form.cy.ts.

describe('docs screenshot — the public donor page, own information', () => {
  it('captures the read-only summary and the message box beneath it', () => {
    createDonorViaApi({ name: 'Rafiqul Islam', studentId: '1905001' }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      visitPublicDonorPage();
      fillIdentityCheck(donor.localPhone, donor.studentId);

      cy.get('[data-cy="publicDonorSummary"]').should('be.visible');
      cy.get('[data-cy="publicDonorMessageInput"]').type(
        'I donated blood on 12 March 2026, please add it.',
      );
      hideOverlays();
    cy.wait(1500);
      cy.get('[data-cy="publicDonorSummary"]').screenshot('feedback-public-summary');
    });
  });
});
