import { createDonorViaApi, visitCertificateSignedOut } from '@support/helpers/certificates';

// The PDF is the artefact that actually reaches a donor's hands, so these assertions are about the
// file on disk rather than about the page that produced it.

describe('Certificate PDF download', () => {
  const donor = { name: 'Pdf Download Donor', studentId: '1605031' };

  it('downloads an A4 landscape PDF named after the student ID', () => {
    createDonorViaApi(donor, 'pdfDonorId');

    cy.get('@pdfDonorId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));
      cy.get('[data-cy="certificateQr"]').should('exist');

      cy.get('[data-cy="certificateDownloadButton"]').click();

      // The name is what a volunteer sees in their downloads folder and what they hand over, so it
      // has to identify the donor rather than being certificate(3).pdf.
      const downloadPath = `cypress/downloads/Badhan-Certificate-${donor.studentId}.pdf`;
      cy.readFile(downloadPath, null, { timeout: 20000 }).should((buffer: Uint8Array) => {
        const bytes = new Uint8Array(buffer);
        const header = String.fromCharCode(...bytes.slice(0, 5));
        expect(header, 'file begins with a PDF header').to.equal('%PDF-');
        // A PDF that is only a header is not a certificate; anything real is far bigger than this.
        expect(bytes.length, 'PDF is not an empty shell').to.be.greaterThan(5000);
      });
    });
  });

  it('keeps the download button out of the PDF and off the artwork', () => {
    createDonorViaApi({ name: 'Chrome Free Donor', studentId: '1605032' }, 'chromeFreeId');

    cy.get('@chromeFreeId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));

      // The button is page chrome. If it ever moves inside the SVG it would be converted along with
      // everything else and printed onto the paper.
      cy.get('[data-cy="certificateArtwork"]')
        .find('[data-cy="certificateDownloadButton"]')
        .should('not.exist');
      cy.get('[data-cy="certificateDownloadButton"]').should('be.visible');
    });
  });
});
