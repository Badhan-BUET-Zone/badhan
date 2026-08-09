import { visitCertificateSignedOut } from '@support/helpers/certificates';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-certificate-download.md.
// ONE cy.screenshot() per spec file — see 01-certificate-page.cy.ts.

describe('docs screenshot — certificate not found', () => {
  it('captures the message shown for a deleted or mistyped certificate', () => {
    cy.viewport(900, 500);
    visitCertificateSignedOut('000000000000000000000000');
    cy.get('[data-cy="certificateNotFound"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    // The card only: a full-viewport capture would also record the error toast, which is not part
    // of what this page shows.
    cy.get('[data-cy="certificateNotFound"]').parents('.v-card').first()
      .screenshot('certificate-not-found');
  });
});
