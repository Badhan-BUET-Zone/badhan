import { createDonorViaApi, visitCertificateSignedOut } from '@support/helpers/certificates';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-certificate-download.md.
// ONE cy.screenshot() per spec file — in headless Electron the second capture in a file comes out
// blank. The page fades in over 0.3s, so wait after the artwork exists or it records at opacity 0.

describe('docs screenshot — certificate page', () => {
  it('captures the certificate as a verifier sees it', () => {
    cy.viewport(1100, 900);
    createDonorViaApi({ name: 'Mahmudul Hasan Rifat', studentId: '1605011' }, 'docsDonorId');

    cy.get('@docsDonorId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));
      cy.get('[data-cy="certificateArtwork"]').should('exist');
      cy.get('[data-cy="certificateQr"]').should('exist');
      hideOverlays();
      cy.wait(1500);
      cy.get('[data-cy="certificateContent"]').screenshot('certificate-page');
    });
  });
});
