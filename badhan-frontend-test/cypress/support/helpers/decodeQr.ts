import jsQR from 'jsqr';

// Rasterises the certificate artwork and decodes its QR code, so a test can assert what a phone
// camera would actually read rather than what the app says it encoded.
//
// This is the only check that exercises the hand-built module geometry end to end. Everything else
// — the data-qr-url attribute, the bounding-box size — would still pass if the modules were
// transposed or inverted, and a QR like that prints, gets handed to a donor, and never scans.
//
// It is not a substitute for scanning real paper: nothing here says anything about ink, contrast,
// printer resolution or the size of the code in someone's hand.

// The artwork's viewBox is "0 0 297 210" in millimetres.
const VIEWBOX_WIDTH = 297;
const VIEWBOX_HEIGHT = 210;
// Rendered at 8 px per millimetre, so the ~30 mm code lands at ~240 px — comfortably above what a
// decoder needs for a 33-module symbol.
const PIXELS_PER_MM = 8;

export const decodeCertificateQr = (): Cypress.Chainable<string> =>
  cy.get('[data-cy="certificateArtwork"]').then(($svg) => {
    const svg = $svg[0] as unknown as SVGSVGElement;
    const serialized = new XMLSerializer().serializeToString(svg);
    // The SVG is fully self-contained (the logo is a data URI), so this never hits the network and
    // the canvas is never tainted.
    const source = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(serialized)))}`;

    return new Cypress.Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = VIEWBOX_WIDTH * PIXELS_PER_MM;
        canvas.height = VIEWBOX_HEIGHT * PIXELS_PER_MM;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('no 2d context'));
          return;
        }
        // White first: the artwork's own background is drawn, but an unpainted canvas is
        // transparent black, which would ruin the contrast the decoder relies on.
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(data, width, height);
        if (!result) {
          reject(new Error('the certificate QR code could not be decoded'));
          return;
        }
        resolve(result.data);
      };
      image.onerror = () => reject(new Error('could not rasterise the certificate artwork'));
      image.src = source;
    });
  });

// The feedback artwork's viewBox is "0 0 210 297" — A4 portrait in millimetres. Rendered at the
// same 8 px per millimetre, so the 120 mm code lands at ~960 px, far more than any decoder needs.
const FEEDBACK_VIEWBOX_WIDTH = 210;
const FEEDBACK_VIEWBOX_HEIGHT = 297;

// Same job as decodeCertificateQr, for the feedback and registration sheets: rasterise the artwork
// and read it the way a phone camera would. Existence checks and bounding-box assertions would all
// still pass if the module grid were transposed or off by a row — and a subtly wrong code prints,
// goes on a wall, and never scans.
export const decodeFeedbackQr = (selector = '[data-cy="feedbackQrArtwork"]'): Cypress.Chainable<string> =>
  cy.get(selector).then(($svg) => {
    const svg = $svg[0] as unknown as SVGSVGElement;
    const serialized = new XMLSerializer().serializeToString(svg);
    const source = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(serialized)))}`;

    return new Cypress.Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = FEEDBACK_VIEWBOX_WIDTH * PIXELS_PER_MM;
        canvas.height = FEEDBACK_VIEWBOX_HEIGHT * PIXELS_PER_MM;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('no 2d context'));
          return;
        }
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(data, width, height);
        if (!result) {
          reject(new Error('the feedback QR code could not be decoded'));
          return;
        }
        resolve(result.data);
      };
      image.onerror = () => reject(new Error('could not rasterise the feedback artwork'));
      image.src = source;
    });
  });
