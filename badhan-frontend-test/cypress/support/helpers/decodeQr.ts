import jsQR from 'jsqr';

// The feedback artwork's viewBox is "0 0 210 297" — A4 portrait in millimetres.
const FEEDBACK_VIEWBOX_WIDTH = 210;
const FEEDBACK_VIEWBOX_HEIGHT = 297;
// Rendered at 8 px per millimetre, so the 120 mm code lands at ~960 px, far more than any decoder
// needs.
const PIXELS_PER_MM = 8;

// For the feedback and registration sheets: rasterise the artwork and read it the way a phone
// camera would. Existence checks and bounding-box assertions would all still pass if the module
// grid were transposed or off by a row — and a subtly wrong code prints, goes on a wall, and never
// scans.
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
