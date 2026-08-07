import { createDonorViaApi, visitCertificateSignedOut } from '@support/helpers/certificates';
import { decodeCertificateQr } from '@support/helpers/decodeQr';

// The artwork's viewBox is "0 0 297 210", so every number asserted here is a millimetre on the
// printed A4 landscape page — not a pixel, and not dependent on the size of the screen the test
// happens to run on.
const NAME_MAX_WIDTH_MM = 220;
const QR_MIN_SIZE_MM = 25;

describe('Certificate artwork', () => {
  it('renders the frame, the name and a QR code big enough to scan from paper', () => {
    const donor = { name: 'Short Name', studentId: '1605021' };
    createDonorViaApi(donor, 'shortNameId');

    cy.get('@shortNameId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));

      cy.get('[data-cy="certificateArtwork"]').should('have.attr', 'viewBox', '0 0 297 210');

      // A short name needs neither shrinking nor wrapping, so it stays on one line.
      cy.get('[data-cy="certificateName"]').should('have.length', 1);
      cy.get('[data-cy="certificateName"]').should('have.text', donor.name);
      cy.get('[data-cy="certificateStudentId"]').should('have.text', donor.studentId);

      // The QR is the authenticity mechanism, and it has to survive being printed and photographed
      // in ordinary light. Below about 25 mm that stops being reliable, so the size is a hard
      // requirement rather than a design preference.
      cy.get('[data-cy="certificateQr"]').should('exist').then(($qr) => {
        const box = ($qr[0] as unknown as SVGGraphicsElement).getBBox();
        expect(box.width).to.be.at.least(QR_MIN_SIZE_MM);
        expect(box.height).to.be.at.least(QR_MIN_SIZE_MM);
      });
    });
  });

  it('shrinks and wraps a long name instead of overflowing or clipping it', () => {
    // Verification is a comparison of the name on paper against the name on screen, so a name that
    // is cut off — by the frame or by an ellipsis — defeats the entire document. Bangladeshi names
    // running this long are ordinary, not an edge case.
    const donor = {
      name: 'Mohammad Abdur Rahman Chowdhury Siddiqui Ahmed',
      studentId: '1605022',
    };
    createDonorViaApi(donor, 'longNameId');

    cy.get('@longNameId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));

      cy.get('[data-cy="certificateName"]').should('have.length.at.least', 1);

      cy.get('[data-cy="certificateName"]').then(($lines) => {
        // Every character of the name survives, however it was laid out.
        const rendered = Array.from($lines).map((line) => line.textContent?.trim() ?? '');
        expect(rendered.join(' ')).to.equal(donor.name);

        // ...and no line runs past the space reserved for it inside the frame.
        Array.from($lines).forEach((line) => {
          const width = (line as unknown as SVGTextContentElement).getComputedTextLength();
          expect(width).to.be.at.most(NAME_MAX_WIDTH_MM);
        });
      });
    });
  });

  it('encodes this certificate’s own address, and re-encodes it for a different donor', () => {
    // The QR carries the page's own URL, so the printed code and the link are the same object by
    // construction. Asserting the encoded address directly is what makes this meaningful: comparing
    // module geometry would only show that two codes differ, never that either points anywhere
    // useful. A certificate showing one donor's name over another donor's QR would be unverifiable
    // paper, and paper cannot be recalled.
    const first = { name: 'First Donor', studentId: '1605023' };
    const second = { name: 'Second Donor', studentId: '1605024' };

    createDonorViaApi(first, 'firstId');
    createDonorViaApi(second, 'secondId');

    cy.get('@firstId').then((firstId) => {
      visitCertificateSignedOut(String(firstId));
      cy.get('[data-cy="certificateName"]').should('have.text', first.name);
      cy.get('[data-cy="certificateQr"]')
        .should('have.attr', 'data-qr-url')
        .and('contain', String(firstId));
    });

    cy.get('@secondId').then((secondId) => {
      // Navigating between two certificates changes only the query string, so this also pins that
      // the page rebuilds itself rather than reusing the previous donor's render.
      visitCertificateSignedOut(String(secondId));
      cy.get('[data-cy="certificateName"]').should('have.text', second.name);
      cy.get('[data-cy="certificateQr"]')
        .should('have.attr', 'data-qr-url')
        .and('contain', String(secondId));
    });
  });

  it('draws a QR a decoder can actually read, pointing at this certificate', () => {
    // Everything else about the QR would still pass if the modules were transposed, inverted or
    // off by a row: the element would exist, be the right size, and carry the right data-qr-url.
    // Only decoding the rendered pixels proves the geometry is a valid code — and a code that is
    // subtly wrong gets printed, handed to a donor, and never scans.
    const donor = { name: 'Scannable Donor', studentId: '1605025' };
    createDonorViaApi(donor, 'scannableId');

    cy.get('@scannableId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));
      cy.get('[data-cy="certificateQr"]').should('exist');

      decodeCertificateQr().then((decoded) => {
        expect(decoded).to.contain('/#/certificate');
        expect(decoded).to.contain(String(donorId));
      });
    });
  });
});
