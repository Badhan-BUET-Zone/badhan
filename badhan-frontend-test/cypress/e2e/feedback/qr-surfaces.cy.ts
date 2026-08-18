import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { decodeFeedbackQr } from '@support/helpers/decodeQr';
import { createVolunteerInHallViaApi, HALL_SUHRAWARDY } from '@support/helpers/feedback';

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

    // ...and the queue is still the first thing on the page: whatever the environment holds, the
    // page shows the queue itself — rows, or the line saying there are none.
    cy.get('[data-cy="feedbackEmptyState"], [data-cy^="feedbackCard-"]').should('be.visible');
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

  it('shows the donor page URL as a link that opens in a new tab', () => {
    cy.get('[data-cy="feedbackQrPanelHeader"]').click();

    cy.get('[data-cy="feedbackQrLink"]')
      .should('have.attr', 'href', `${FRONTEND_BASE}/#/donor`)
      .and('have.attr', 'target', '_blank')
      // Without noopener the opened page can reach back through window.opener.
      .and('have.attr', 'rel')
      .and('contain', 'noopener');

    cy.get('[data-cy="feedbackQrLink"]').should('have.text', `${FRONTEND_BASE}/#/donor`);

    // Outside the artwork: the printed sheet carries the code and the caption and no readable URL,
    // so a link inside the SVG would end up on paper.
    cy.get('[data-cy="feedbackQrArtwork"]').find('[data-cy="feedbackQrLink"]').should('not.exist');
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
    drawer.goToRegistrationQr();
  });

  it('is nested under Donor Creation, and there is no Print Poster entry anywhere', () => {
    drawer.open();
    cy.get('[data-cy="donorCreationNavigationId"]').click();

    // The structural claim, asserted structurally: the entry is a DESCENDANT of the Donor Creation
    // group, not a sibling of it. Checking that it is absent while collapsed would be testing
    // Vuetify's expansion state instead — and that state survives a hash-only navigation, so it
    // passes or fails for reasons that have nothing to do with the menu.
    cy.get('[data-cy="donorCreationNavigationId"]')
      .find('[data-cy="registrationQrNavigationId"]')
      .should('exist');

    // The poster is a panel on the Feedback page, not a menu item. A volunteer told to look for one
    // would not find it, which is why the manual describes where the panel is instead.
    cy.contains('.v-list-item', 'Print Poster').should('not.exist');

    // Bookmarked Donors now sits below Members.
    cy.get('.v-navigation-drawer').then(($drawer) => {
      const ids = Array.from($drawer[0].querySelectorAll('[data-cy]')).map((el) =>
        el.getAttribute('data-cy'),
      );
      expect(ids.indexOf('activeDonorNavigationId')).to.be.greaterThan(
        ids.indexOf('membersNavigationId'),
      );
    });

    cy.get('body').type('{esc}');
  });

  it('gives a super admin a hall dropdown, including All Halls', () => {
    // Stating a hall is a permissioned act, and this is the designation that may state any of them.
    cy.get('[data-cy="registrationQrHall"]').should('not.exist');
    cy.get('[data-cy="registrationQrHallSelector"]').should('exist').click();

    // Scoped to the open menu: the navigation drawer is full of .v-list-item too.
    const openMenu = '.v-menu__content.menuable__content__active';

    // The seven halls, and one option that is not a hall at all.
    cy.get(`${openMenu} .v-list-item`).should('have.length', 8);
    cy.contains(`${openMenu} .v-list-item`, 'Titumir').should('exist');
    cy.contains(`${openMenu} .v-list-item`, 'All Halls').should('exist');
    // Neither Attached nor (Unknown) is offered: a code is something you make for a hall you
    // belong to, and nobody belongs to either of those.
    cy.contains(`${openMenu} .v-list-item`, 'Attached').should('not.exist');
    cy.contains(`${openMenu} .v-list-item`, '(Unknown)').should('not.exist');
    cy.get('body').type('{esc}');
  });

  it('says what an All Halls code does, and only when one is selected', () => {
    cy.get('[data-cy="registrationQrAllHallsNotice"]').should('not.exist');

    cy.get('[data-cy="registrationQrHallSelector"]').click();
    cy.contains('.v-list-item', 'All Halls').click();

    // It changes what the student is asked, so it says so at the moment of choosing rather than
    // being discovered at the desk.
    cy.get('[data-cy="registrationQrAllHallsNotice"]').should(
      'contain.text',
      'asked which hall they are in',
    );
  });

  it('mints for the chosen hall, and prints that hall on the sheet', () => {
    cy.get('[data-cy="registrationQrHallSelector"]').click();
    cy.contains('.v-list-item', 'Titumir').click();
    cy.get('[data-cy="registrationQrGenerateButton"]').click();
    cy.get('[data-cy="feedbackQrArtwork"]', { timeout: 20000 }).should('exist');

    // Asserted from the decoded pixels, not from the page's own state: what the camera reads is the
    // only thing that matters, and the label and the token must not be able to drift apart.
    decodeFeedbackQr().then((decoded) => {
      const token = decodeURIComponent(decoded.split('?t=')[1]);
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      ) as Record<string, unknown>;
      expect(payload.hall).to.equal(6); // Titumir
    });

    cy.get('[data-cy="feedbackQrHallLine"]').should('have.text', 'Titumir Hall');
    // Caption, expiry, hall — three lines and no more.
    cy.get('[data-cy="feedbackQrArtwork"]').find('text').should('have.length', 3);
  });

  it('mints an All Halls code, whose token names no hall', () => {
    cy.get('[data-cy="registrationQrHallSelector"]').click();
    cy.contains('.v-list-item', 'All Halls').click();
    cy.get('[data-cy="registrationQrGenerateButton"]').click();
    cy.get('[data-cy="feedbackQrArtwork"]', { timeout: 20000 }).should('exist');

    decodeFeedbackQr().then((decoded) => {
      const token = decodeURIComponent(decoded.split('?t=')[1]);
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      ) as Record<string, unknown>;
      // -1 is not a hall. It is what tells the registration page to ask.
      expect(payload.hall).to.equal(-1);
      // Still exactly two claims: the extra value went into the claim that already existed, so the
      // code is no denser than it was.
      expect(Object.keys(payload).sort()).to.deep.equal(['exp', 'hall']);
    });

    cy.get('[data-cy="feedbackQrHallLine"]').should('have.text', 'All Halls');
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

  it('shows the generated link, and only after generating', () => {
    // Nothing to link to before a token exists.
    cy.get('[data-cy="registrationQrLink"]').should('not.exist');

    cy.get('[data-cy="registrationQrGenerateButton"]').click();
    cy.get('[data-cy="feedbackQrArtwork"]', { timeout: 20000 }).should('exist');

    cy.get('[data-cy="registrationQrLink"]')
      .should('have.attr', 'target', '_blank')
      .and('have.attr', 'rel')
      .and('contain', 'noopener');

    // The link and the code carry the same address, token included — one is not a shortened or
    // tokenless version of the other.
    decodeFeedbackQr().then((decoded) => {
      cy.get('[data-cy="registrationQrLink"]').should('have.attr', 'href', decoded);
      cy.get('[data-cy="registrationQrLink"]').should('have.text', decoded);
    });

    // Unlike the poster's address, this one IS the credential, and the page says so.
    cy.get('[data-cy="registrationQrLinkWarning"]').should(
      'contain.text',
      'Sharing it is the same as letting somebody scan the QR',
    );

    // Outside the artwork, so it cannot reach the printed sheet.
    cy.get('[data-cy="feedbackQrArtwork"]')
      .find('[data-cy="registrationQrLink"]')
      .should('not.exist');
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

      // The hall line survives, because a projected code should say which hall it is for and four
      // words cost the code nothing.
      cy.get('[data-cy="registrationQrFullScreen"]')
        .find('[data-cy="feedbackQrHallLine"]')
        .should('exist');

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
      // The expiry sentence is printed onto the sheet, not only shown on screen: a registration
      // code expires, and paper that does not say when gets pinned up and trusted past its life.
      expect(contents).to.contain('This code stops working at');
      expect(contents).to.contain('valid for 4 hours');
      // And which hall it is for, so a sheet left on a desk is identifiable without scanning it.
      expect(contents).to.contain('Hall');
    });
  });
});

describe('The registration QR generator, as a volunteer', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  beforeEach(() => {
    createVolunteerInHallViaApi(
      { name: 'QR Spec Volunteer', studentId: `1905${String(Date.now()).slice(-3)}` },
      'volunteer',
    );
    cy.get<{ localPhone: string }>('@volunteer').then((volunteer) => {
      cy.visit('/');
      signInPage.signIn(volunteer.localPhone, 'archivetest1');
      drawer.goToRegistrationQr();
    });
  });

  it('gets no dropdown, and is told a super admin can make one for another hall', () => {
    // The absence is cosmetic — the server refuses any hall but their own regardless — but a
    // control that would always fail should not be offered.
    cy.get('[data-cy="registrationQrHallSelector"]').should('not.exist');
    cy.get('[data-cy="registrationQrHall"]').should('contain.text', 'always for your own hall');
    cy.get('[data-cy="registrationQrHall"]').should('contain.text', 'a super admin can make it');
  });

  it('still states its own hall in the request, so the mint is logged', () => {
    // Every QR mint takes the authenticated, logged branch — that is why a volunteer sends a hall
    // it could have omitted. "It worked" would pass without this, so the body is asserted directly.
    cy.intercept('POST', '**/feedbacks/token').as('mint');
    cy.get('[data-cy="registrationQrGenerateButton"]').click();

    cy.wait('@mint').then((interception) => {
      expect(interception.request.body).to.have.property('hall');
      expect(interception.request.body.hall).to.equal(HALL_SUHRAWARDY);
      expect(interception.request.headers).to.have.property('x-auth');
    });

    cy.get('[data-cy="feedbackQrArtwork"]', { timeout: 20000 }).should('exist');
    cy.get('[data-cy="feedbackQrHallLine"]').should('have.text', 'Suhrawardy Hall');
  });
});
