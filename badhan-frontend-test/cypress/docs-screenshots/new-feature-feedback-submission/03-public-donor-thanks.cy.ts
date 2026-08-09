import {
  createDonorViaApi,
  fillIdentityCheck,
  visitPublicDonorPage,
  FeedbackDonor,
} from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Throwaway spec: captures a documentation screenshot for docs/blog.
// ONE cy.screenshot() per spec file — see 01-public-donor-form.cy.ts.

describe('docs screenshot — the public donor page, thank-you', () => {
  it('captures what a donor sees after sending a message', () => {
    createDonorViaApi({ name: 'Rafiqul Islam', studentId: '1905002' }, 'donor');

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      visitPublicDonorPage();
      fillIdentityCheck(donor.localPhone, donor.studentId);

      cy.get('[data-cy="publicDonorMessageInput"]').type(
        'I donated blood on 12 March 2026, please add it.',
      );
      cy.get('[data-cy="publicDonorSubmitButton"]').click();

      cy.get('[data-cy="publicDonorThanks"]').should('be.visible');
      hideOverlays();
    cy.wait(1500);
      cy.get('[data-cy="publicDonorThanks"]').screenshot('feedback-public-thanks');
    });
  });
});
