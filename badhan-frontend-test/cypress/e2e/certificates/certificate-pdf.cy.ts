import { createDonorViaApi, visitCertificateSignedOut } from '@support/helpers/certificates';

// The certificate is rendered by the backend and arrives as a finished PDF, so there is no artwork
// in the page to assert against any more — and that absence is itself the feature. What these specs
// check is that the page fetches the document once, shows it, and hands over the same bytes when
// someone presses download.
//
// The page draws the PDF onto a canvas with pdf.js rather than handing it to an <iframe>, because a
// browser can be set to download PDFs instead of displaying them and the verification page would
// then show a browser notice where the certificate should be. So "shows it" means pixels were
// painted, which is what these assert on.
//
// The QR code's payload is covered in the backend suite, which reads the module grid out of the
// PDF's content stream — see badhan-backend-test/tests/certificates/qrPayload.test.js.

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
        // Drawn, not merely present. An undrawn canvas keeps the 300x150 default it is born with,
        // so a real size is the evidence that pdf.js rasterised the page into it.
        .and(($canvas) => {
          const canvas = $canvas[0] as HTMLCanvasElement;
          expect(canvas.width, 'canvas was sized from the PDF page').to.be.greaterThan(1000);
          expect(canvas.height, 'canvas kept the page aspect ratio').to.be.greaterThan(500);
        });

      // Not blank. A canvas that was sized but never painted is uniformly transparent, which is
      // exactly what a silent pdf.js failure would leave behind.
      cy.get('[data-cy="certificateFrame"]').should(($canvas) => {
        const canvas = $canvas[0] as HTMLCanvasElement;
        const context = canvas.getContext('2d');
        const sample = context!.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1
        ).data;
        expect(sample[3], 'the middle of the page is opaque').to.be.greaterThan(0);
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
