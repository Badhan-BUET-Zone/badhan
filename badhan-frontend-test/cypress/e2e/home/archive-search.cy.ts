import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { HomePage } from '@pages/HomePage';
import { MESSAGES } from '@support/constants';
import {
  API_BASE_URL,
  MEMBER_PASSWORD,
  archiveDonorViaApi,
  createDonorViaApi,
  createVolunteerViaApi,
  uniqueDonor,
} from '@support/helpers/members';

const ARCHIVE_STORE_KEY = 'archiveSearch';
const DAY_IN_MS = 24 * 3600 * 1000;

// Everything a generated link carries except archiveFlag — i.e. exactly what a link built
// before this feature existed looks like
const LEGACY_LINK =
  '/#/home?name=&bloodGroup=-1&batch=&address=&hall=Ahsan%20Ullah' +
  '&availability=true&notAvailability=false&radios=AvailableToAll&download=false';

describe('Archive search: setting, mirror, banner and shareable URL', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const home = new HomePage();

  const volunteer = uniqueDonor('Archive Search Volunteer', 1);
  const archivedDonor = uniqueDonor('Archived Search Result', 2);
  const liveDonor = uniqueDonor('Live Search Result', 3);

  // Sign-in lands on the search page, so no navigation follows it
  const signInAsSuperAdmin = () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
  };

  const signInAsVolunteer = () => {
    signInPage.signIn(volunteer.phone, MEMBER_PASSWORD);
    notification.assertEquals(MESSAGES.signInSuccess);
  };

  // Reloaded rather than visited: a hash-only visit leaves the already-mounted Home
  // component in place, and it is `mounted()` that reads the link and auto-searches
  const openLink = (url: string) => {
    cy.visit(url);
    cy.reload();
  };

  // The store seeds itself from localStorage at boot, so a key written from the test only
  // reaches the search payload after a reload — same as a browser that was already open
  // when the setting was enabled elsewhere
  const enableArchiveSearch = (expiry: number = new Date().getTime() + DAY_IN_MS) => {
    cy.window().then((win) => {
      win.localStorage.setItem(ARCHIVE_STORE_KEY, JSON.stringify({ value: true, expiry }));
    });
    cy.reload();
  };

  // force-clicked because the navigation drawer opens itself on a desktop user agent and
  // sits over the filter panel in this viewport
  const searchAndCaptureRequest = (donorName?: string) => {
    if (donorName) cy.get('[data-cy="filterNameTextboxId"]').clear({ force: true }).type(donorName, { force: true });
    cy.intercept('GET', '**/search/v3*').as('searchRequest');
    cy.get('[data-cy="filterSearchButtonId"]').click({ force: true });
    return cy.wait('@searchRequest');
  };

  beforeEach(() => {
    // the suite-level fixture setup leaves a session behind that test isolation does not
    // clear before the first test
    cy.clearLocalStorage();
  });

  before(() => {
    signInAsSuperAdmin();
    createVolunteerViaApi(volunteer);
    createDonorViaApi(archivedDonor).then((donorId) => archiveDonorViaApi(donorId));
    createDonorViaApi(liveDonor);
  });

  it('renders the mirror as a readable disabled checkbox for a super admin', () => {
    signInAsSuperAdmin();

    cy.get('[data-cy="filterArchiveSearchCheckboxId"]').should('exist').and('be.disabled');
    // asserted on the rendered text, so a reintroduced blur or visibility trick fails
    cy.get('[data-cy="filterArchiveSearchCheckboxId"]')
      .closest('.v-input')
      .should('be.visible')
      .and('contain.text', 'Search archived donors')
      .and('contain.text', 'Changeable only from Super Admin settings');
  });

  it('renders no mirror at all for a volunteer, and hardcodes their search to archiveFlag=false', () => {
    signInAsVolunteer();

    cy.get('[data-cy="filterArchiveSearchCheckboxId"]').should('not.exist');
    // The backend does not enforce this, so the outgoing query is the only place it can
    // be checked
    searchAndCaptureRequest(liveDonor.name).its('request.query.archiveFlag').should('eq', 'false');
    home.assertDonorCardWithNameExists(liveDonor.name);
    cy.get('[data-cy="archivedResultsBanner"]').should('not.exist');
  });

  it('sends archiveFlag=true with the setting on, banners the results, and drops both when it is off', () => {
    signInAsSuperAdmin();
    enableArchiveSearch();

    cy.get('[data-cy="filterArchiveSearchCheckboxId"]').should('be.checked');
    searchAndCaptureRequest(archivedDonor.name).its('request.query.archiveFlag').should('eq', 'true');
    cy.get('[data-cy="archivedResultsBanner"]').should('be.visible').and('contain.text', 'Showing archived donors');
    home.assertDonorCardWithNameExists(archivedDonor.name);

    cy.window().then((win) => win.localStorage.removeItem(ARCHIVE_STORE_KEY));
    cy.reload();
    searchAndCaptureRequest(liveDonor.name).its('request.query.archiveFlag').should('eq', 'false');
    cy.get('[data-cy="archivedResultsBanner"]').should('not.exist');
    home.assertDonorCardWithNameExists(liveDonor.name);
  });

  it('round-trips the partition through the shared link', () => {
    signInAsSuperAdmin();
    enableArchiveSearch();

    // vue-clipboard2 copies by selecting a detached element and calling execCommand, so
    // the selection at that moment is the copied text
    let copiedUrl = '';
    cy.window().then((win) => {
      cy.stub(win.document, 'execCommand').callsFake(() => {
        copiedUrl = win.getSelection()?.toString() ?? '';
        return true;
      });
    });

    searchAndCaptureRequest(archivedDonor.name).its('request.query.archiveFlag').should('eq', 'true');
    cy.get('[data-cy="homeShareButtonId"]').click({ force: true });
    cy.wrap(null).should(() => {
      expect(copiedUrl, 'copied share link').to.contain('archiveFlag=true');
    });

    // Opening the link reproduces the archive search, asserted on the key rather than on
    // a count of query keys
    cy.then(() => {
      cy.intercept('GET', '**/search/v3*').as('linkSearch');
      openLink(copiedUrl.substring(copiedUrl.indexOf('/#/')));
      cy.wait('@linkSearch').its('request.query.archiveFlag').should('eq', 'true');
    });
    cy.get('[data-cy="archivedResultsBanner"]').should('be.visible');
  });

  it('still auto-searches a legacy link that predates archiveFlag, on the live roster', () => {
    signInAsSuperAdmin();

    cy.intercept('GET', '**/search/v3*').as('legacySearch');
    openLink(LEGACY_LINK);
    cy.wait('@legacySearch').its('request.query.archiveFlag').should('eq', 'false');
    home.assertAnyDonorCardExists();
    cy.get('[data-cy="archivedResultsBanner"]').should('not.exist');
  });

  it('does not auto-search a URL that is missing the marker keys', () => {
    signInAsSuperAdmin();

    cy.intercept('GET', '**/search/v3*').as('unexpectedSearch');
    openLink('/#/home?name=Nobody');
    cy.get('[data-cy="filterNameTextboxId"]').should('be.visible');
    cy.get('@unexpectedSearch.all').should('have.length', 0);
    cy.get('[data-cy="person-card"]').should('not.exist');
  });

  it('honours a shared archive link verbatim for a volunteer', () => {
    signInAsVolunteer();

    cy.intercept('GET', '**/search/v3*').as('linkSearch');
    openLink(`${LEGACY_LINK}&archiveFlag=true`);
    cy.wait('@linkSearch').its('request.query.archiveFlag').should('eq', 'true');
    cy.get('[data-cy="archivedResultsBanner"]').should('be.visible');
    home.assertDonorCardWithNameExists(archivedDonor.name);
  });

  it('lets the URL win on mount and the filters win on every manual search after it', () => {
    signInAsSuperAdmin();

    cy.intercept('GET', '**/search/v3*').as('linkSearch');
    openLink(`${LEGACY_LINK}&archiveFlag=true`);
    cy.wait('@linkSearch').its('request.query.archiveFlag').should('eq', 'true');

    // the setting is off in this browser, so the next manual search reverts to the roster
    searchAndCaptureRequest().its('request.query.archiveFlag').should('eq', 'false');
    cy.get('[data-cy="archivedResultsBanner"]').should('not.exist');
  });

  it('flips from the settings switch with no network call, and survives a reload', () => {
    signInAsSuperAdmin();

    const requestsWhileFlipping: string[] = [];
    let recording = false;
    cy.intercept({ url: `${API_BASE_URL}/**` }, (req) => {
      if (recording) requestsWhileFlipping.push(`${req.method} ${req.url}`);
      req.continue();
    });

    drawer.goToMyProfile();
    // the page's own profile fetch has to land before recording, or it counts as traffic
    // the switch caused
    cy.get('[data-cy="donorDetailsNameTextBoxId"]').should('be.visible');
    cy.get('[data-cy="archiveSearchSwitchId"]').should('exist').and('not.be.checked');
    cy.then(() => {
      recording = true;
    });
    cy.get('[data-cy="archiveSearchSwitchId"]').click({ force: true });
    cy.get('[data-cy="archiveSearchSwitchId"]')
      .closest('.v-input')
      .should('contain.text', 'Automatically turns off in about');
    cy.wait(500);
    cy.then(() => {
      recording = false;
      expect(requestsWhileFlipping, 'requests issued by flipping the switch').to.deep.eq([]);
    });

    // no reload between flipping it and searching
    drawer.goToHome();
    cy.get('[data-cy="filterArchiveSearchCheckboxId"]').should('be.checked');
    searchAndCaptureRequest().its('request.query.archiveFlag').should('eq', 'true');

    cy.reload();
    searchAndCaptureRequest().its('request.query.archiveFlag').should('eq', 'true');

    // logging out runs the same ldb.reset()
    cy.clearLocalStorage();
    signInAsSuperAdmin();
    searchAndCaptureRequest().its('request.query.archiveFlag').should('eq', 'false');
  });

  it('drops back to the live roster once the stored expiry has passed', () => {
    signInAsSuperAdmin();
    enableArchiveSearch(new Date().getTime() - 1000);

    // no user action: reading the lapsed key is what clears it
    searchAndCaptureRequest().its('request.query.archiveFlag').should('eq', 'false');
    cy.get('[data-cy="filterArchiveSearchCheckboxId"]').should('not.be.checked');

    // asserted only after the search page has been visited: the write-back lives in the
    // Filters computed, so a super admin sitting on MyProfile keeps a stale switch
    drawer.goToMyProfile();
    cy.get('[data-cy="archiveSearchSwitchId"]').should('not.be.checked');
  });
});
