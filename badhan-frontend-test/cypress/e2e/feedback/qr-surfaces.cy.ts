import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { decodeFeedbackQr } from '@support/helpers/decodeQr';

// The two QR surfaces. Everything here checks what a camera would actually read, not what the app
// says it encoded — the decode is the only assertion that exercises the hand-built module geometry.
//
// None of it replaces the physical scan gate in 9.4: nothing in a headless browser says anything
// about ink, contrast, printer resolution or the size of a code in somebody's hand.

// The dev build's configured frontend base. The code encodes the CONFIGURED base, never the address
// of the page that generated it, which is why this is a constant rather than cy.url().
const FRONTEND_BASE = 'http://localhost:8080';

// A4 portrait, in millimetres. Every number below is a millimetre on paper.
const A4_PORTRAIT_VIEWBOX = '0 0 210 297';
const QR_MIN_SIZE_MM = 80;

describe('The printed feedback sheet', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  beforeEach(() => {
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();
  });

  it('starts collapsed, with no artwork in the DOM at all', () => {
    // This is what pins the deferred import. The Feedback page is a volunteer's daily page; if the
    // artwork were built on mount, the qrcode library would be in the load path of every visit.
    cy.get('[data-cy="feedbackQrPanelHeader"]').should('be.visible');
    cy.get('[data-cy="feedbackQrArtwork"]').should('not.exist');
    cy.get('[data-cy="feedbackQrCode"]').should('not.exist');

    // ...and the queue is still the first thing on the page.
    cy.get('[data-cy="feedbackReloadButton"]').should('be.visible');
  });

  it('renders an A4 portrait sheet whose QR decodes to the public donor page', () => {
    cy.get('[data-cy="feedbackQrPanelHeader"]').click();
    cy.get('[data-cy="feedbackQrArtwork"]').should('exist');

    cy.get('[data-cy="feedbackQrArtwork"]').should('have.attr', 'viewBox', A4_PORTRAIT_VIEWBOX);

    // A code below about 80 mm stops being reliable from a notice board, so the size is a hard
    // requirement rather than a design preference.
    cy.get('[data-cy="feedbackQrCode"]').should('exist').then(($qr) => {
      const box = ($qr[0] as unknown as SVGGraphicsElement).getBBox();
      expect(box.width).to.be.at.least(QR_MIN_SIZE_MM);
      expect(box.height).to.be.at.least(QR_MIN_SIZE_MM);
    });

    decodeFeedbackQr().then((decoded) => {
      expect(decoded).to.equal(`${FRONTEND_BASE}/#/donor`);
    });
  });

  it('contains the caption and nothing else', () => {
    cy.get('[data-cy="feedbackQrPanelHeader"]').click();
    cy.get('[data-cy="feedbackQrCaption"]').should(
      'have.text',
      'Scan to submit feedback to Badhan BUET Zone',
    );

    // No logo, no border, no hall name, no readable URL, no Bangla line. The sheet is one <text>
    // element and one QR path; anything else on it is a mistake that gets printed.
    cy.get('[data-cy="feedbackQrArtwork"]').find('text').should('have.length', 1);
    cy.get('[data-cy="feedbackQrArtwork"]').find('image').should('not.exist');
  });

  it('keeps the download button outside the artwork', () => {
    // Chrome must never reach the PDF: svg2pdf converts the SVG, so anything inside it prints.
    cy.get('[data-cy="feedbackQrPanelHeader"]').click();
    cy.get('[data-cy="feedbackQrArtwork"]').find('[data-cy="feedbackQrDownloadButton"]').should('not.exist');
    cy.get('[data-cy="feedbackQrDownloadButton"]').should('be.visible');
  });

  it('downloads a PDF that begins with %PDF-', () => {
    cy.get('[data-cy="feedbackQrPanelHeader"]').click();
    cy.get('[data-cy="feedbackQrArtwork"]').should('exist');
    cy.get('[data-cy="feedbackQrDownloadButton"]').click();

    const downloaded = `${Cypress.config('downloadsFolder')}/Badhan-Feedback-QR.pdf`;
    cy.readFile(downloaded, 'binary', { timeout: 20000 }).should((contents: string) => {
      expect(contents.slice(0, 5)).to.equal('%PDF-');
    });
  });
});

describe('The registration QR generator', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  beforeEach(() => {
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.open();
    cy.get('[data-cy="registrationQrNavigationId"]').click();
  });

  it('sits under Donor Creation, and there is no Print Poster entry anywhere', () => {
    drawer.open();
    cy.get('[data-cy="registrationQrNavigationId"]').should('exist');
    // The poster is a panel on the Feedback page, not a menu item. A volunteer told to look for one
    // would not find it, which is why the manual describes where the panel is instead.
    cy.contains('.v-list-item', 'Print Poster').should('not.exist');
    cy.get('body').type('{esc}');
  });

  it('shows the hall read-only, with no selector for anyone', () => {
    // Signed in here as a super admin, who an earlier revision would have given a hall selector.
    // There is none: the hall comes from whoever mints the code, so there is nothing to choose.
    cy.get('[data-cy="registrationQrHall"]').should('be.visible');
    cy.get('[data-cy="registrationQrHall"]').should('contain.text', 'A code is always for your own hall');
    cy.get('[data-cy="registrationQrHall"]').find('select').should('not.exist');
    cy.get('[data-cy="registrationQrHall"]').find('input').should('not.exist');
  });

  it('warns that a generated code cannot be cancelled', () => {
    cy.get('[data-cy="registrationQrWarning"]').should('contain.text', 'cannot be cancelled');
  });

  it('generates a code that decodes to the registration page with a working token', () => {
    cy.get('[data-cy="registrationQrGenerateButton"]').click();
    cy.get('[data-cy="feedbackQrArtwork"]', { timeout: 20000 }).should('exist');

    decodeFeedbackQr().then((decoded) => {
      expect(decoded).to.contain(`${FRONTEND_BASE}/#/register?t=`);

      // The token in the code carries a hall and an expiry and nothing else — no phone, no student
      // ID, nothing about the volunteer who generated it. A JWT payload is readable by anyone who
      // scans, so this assertion is the privacy one.
      const token = decodeURIComponent(decoded.split('?t=')[1]);
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      ) as Record<string, unknown>;

      expect(Object.keys(payload).sort()).to.deep.equal(['exp', 'hall']);
      expect(payload.phone).to.equal(undefined);
      expect(payload.studentId).to.equal(undefined);

      // The stated expiry matches the token's, so nobody has to decode a JWT to know.
      const expiryClock = new Date((payload.exp as number) * 1000).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      cy.get('[data-cy="registrationQrExpiry"]').should('contain.text', expiryClock);
      cy.get('[data-cy="registrationQrExpiry"]').should('contain.text', '4 hours');
    });
  });

  it('hides the app chrome in full screen, and the code still decodes the same', () => {
    cy.get('[data-cy="registrationQrGenerateButton"]').click();
    cy.get('[data-cy="feedbackQrArtwork"]', { timeout: 20000 }).should('exist');

    decodeFeedbackQr().then((beforeFullScreen) => {
      cy.get('[data-cy="registrationQrFullScreenButton"]').click();

      cy.get('[data-cy="registrationQrFullScreen"]').should('be.visible');
      // The form and the expiry line are REMOVED, not covered — asserting on absence rather than on
      // z-index, because Cypress considers an overlaid element visible and so does a screen reader.
      cy.get('[data-cy="registrationQrDurationSelector"]').should('not.exist');
      cy.get('[data-cy="registrationQrExpiry"]').should('not.exist');
      cy.get('[data-cy="registrationQrGenerateButton"]').should('not.exist');

      decodeFeedbackQr('[data-cy="registrationQrFullScreenArtwork"]').then((inFullScreen) => {
        expect(inFullScreen).to.equal(beforeFullScreen);
      });
    });
  });

  it('downloads a registration PDF', () => {
    cy.get('[data-cy="registrationQrGenerateButton"]').click();
    cy.get('[data-cy="feedbackQrArtwork"]', { timeout: 20000 }).should('exist');
    cy.get('[data-cy="registrationQrDownloadButton"]').click();

    const downloaded = `${Cypress.config('downloadsFolder')}/Badhan-Registration-QR.pdf`;
    cy.readFile(downloaded, 'binary', { timeout: 20000 }).should((contents: string) => {
      expect(contents.slice(0, 5)).to.equal('%PDF-');
      // A4 portrait in points, and one page. No embedded font file, because the caption is English
      // and Helvetica is one of jsPDF's standard 14 — adding a Bangla line would change this.
      // A4 portrait in points. jsPDF writes full float precision, so match the numbers rather
      // than a formatted string.
      expect(contents).to.match(/MediaBox \[0 0 595\.27\d* 841\.88\d*\]/);
      // One page.
      expect((contents.match(/\/Type \/Page[^s]/g) || []).length).to.equal(1);
      // No embedded font file: the caption is English, so Helvetica resolves from jsPDF's standard
      // 14. Adding a Bangla line would change this and would need the scan gate run again.
      expect(contents).to.not.contain('/FontFile');
      // No raster image anywhere — the QR is vector geometry, which is what survives printing.
      expect(contents).to.not.contain('/Subtype /Image');
    });
  });
});
