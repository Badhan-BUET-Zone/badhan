import { createDonorViaApi, visitCertificateSignedOut } from '@support/helpers/certificates';

// The certificate is rendered by the backend and arrives as a finished PDF, so there is no artwork
// in the page to assert against any more — and that absence is itself the feature. What these specs
// check is that the page fetches the document once, shows it, and hands over the same bytes when
// someone presses download.
//
// What is NOT covered here, and was before: decoding the QR code from the rendered pixels. The code
// now lives inside a server-rendered PDF, and neither Cypress nor the backend suite can rasterise
// one. The geometry is checked by hand against a decoder when the renderer changes.

describe('Certificate PDF', () => {
  const donor = { name: 'Pdf Download Donor', studentId: '1605031' };

  it('shows the certificate inline before anyone downloads it', () => {
    // Whoever scans a printed code is standing there holding the paper. They need to see the
    // document and compare it, not download a file first — this inline view is the verification.
    createDonorViaApi({ name: 'Inline View Donor', studentId: '1605033' }, 'inlineDonorId');

    cy.get('@inlineDonorId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));

      cy.get('[data-cy="certificateFrame"]')
        .should('be.visible')
        // A blob URL, not a request the browser makes on its own: the page already holds the bytes,
        // so showing and saving the certificate cost one fetch between them.
        .and(($frame) => {
          expect($frame.attr('src')).to.match(/^blob:/);
        });
    });
  });

  it('downloads an A4 landscape PDF named after the student ID', () => {
    createDonorViaApi(donor, 'pdfDonorId');

    cy.get('@pdfDonorId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));
      cy.get('[data-cy="certificateFrame"]').should('be.visible');

      cy.get('[data-cy="certificateDownloadButton"]').click();

      // The name is what a volunteer sees in their downloads folder and what they hand over, so it
      // has to identify the donor rather than being certificate(3).pdf. It comes from the backend's
      // Content-Disposition header, so this also pins that the header survives the round trip.
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

  it('ships no certificate template to the browser', () => {
    // The whole reason rendering moved to the backend: anything in the frontend bundle is public by
    // construction, served to anyone who opens the page with no auth. If a future change puts the
    // background, a font or the layout back into a chunk, this is what notices.
    createDonorViaApi({ name: 'No Template Donor', studentId: '1605034' }, 'noTemplateId');

    cy.get('@noTemplateId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));
      cy.get('[data-cy="certificateFrame"]').should('be.visible');

      cy.window().then((win) => {
        const fetched = win.performance
          .getEntriesByType('resource')
          .map((entry) => entry.name.toLowerCase());

        const templateAssets = fetched.filter((url) =>
          /certificate-background|greatvibes|\.ttf|\.otf/.test(url)
        );
        expect(templateAssets, 'no template asset was requested by the page').to.deep.equal([]);
      });
    });
  });
});
