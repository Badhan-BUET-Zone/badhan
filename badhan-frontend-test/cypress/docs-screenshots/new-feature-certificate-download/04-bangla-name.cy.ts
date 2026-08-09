import { createDonorViaApi, visitCertificateSignedOut } from '@support/helpers/certificates';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-certificate-download.md.
// ONE cy.screenshot() per spec file — see 01-certificate-page.cy.ts.
//
// The certificate is set in a Latin-only face by design (plan10 D8), so a name stored in Bangla
// renders as empty boxes — on screen and, worse, on paper. This capture is what that failure
// actually looks like, so the blog can show it instead of only describing it.

describe('docs screenshot — a name stored in Bangla', () => {
  it('captures the empty boxes a Bangla name produces', () => {
    cy.viewport(1100, 900);
    createDonorViaApi({ name: 'মাহমুদুল হাসান', studentId: '1605012' }, 'banglaDonorId');

    cy.get('@banglaDonorId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));
      cy.get('[data-cy="certificateArtwork"]').should('exist');
      cy.get('[data-cy="certificateQr"]').should('exist');
      hideOverlays();
      cy.wait(1500);
      cy.get('[data-cy="certificateArtwork"]').screenshot('certificate-bangla-name');
    });
  });
});
