import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { MESSAGES } from '@support/constants';
import { archiveDonorViaApi, createDonorViaApi, uniqueDonor } from '@support/helpers/members';

// Mirrors ARCHIVE_BATCH_LIMIT in badhan-frontend/src/mixins/constants.ts. The app source
// is not mounted in the test container, so the value is restated rather than imported;
// keep the two in step.
const ARCHIVE_BATCH_LIMIT = 200;

const ARCHIVE_STORE_KEY = 'archiveSearch';
const DAY_IN_MS = 24 * 3600 * 1000;

const RUN = String(Date.now()).slice(-6);
const TRIO_LABEL = `Sweep Trio ${RUN}`;
const LIMITER_LABEL = `Sweep Limiter ${RUN}`;
const BATCH_SPREAD_LABEL = `Batch Spread ${RUN}`;
const ARCHIVED_LABEL = `Archived Sweep ${RUN}`;

// A donor shaped like a search result: enough for the footer to count and render
const fabricateSearchResults = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    _id: `fabricated${String(index).padStart(4, '0')}`,
    name: `Fabricated Donor ${index}`,
    phone: 8801700000000 + index,
    studentId: '1605012',
    bloodGroup: 0,
    hall: 0,
    address: 'Fabricated Street',
    roomNumber: 'F-1',
    comment: '',
    availableToAll: true,
    archiveFlag: false,
    lastDonation: 0,
    donationCount: 0,
    plateletDonationCount: 0,
    callCountLast3Days: 0,
  }));

describe('Search results footer: the archive sweep', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();

  const signInAsSuperAdmin = () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
  };

  // force-clicked because the navigation drawer opens itself on a desktop user agent and
  // sits over the filter panel in this viewport
  const searchFor = (name: string) => {
    cy.get('[data-cy="filterNameTextboxId"]').clear({ force: true }).type(name, { force: true });
    cy.intercept('GET', '**/search/v3*').as('searchRequest');
    cy.get('[data-cy="filterSearchButtonId"]').click({ force: true });
    return cy.wait('@searchRequest');
  };

  const enableArchiveSearch = () => {
    cy.window().then((win) => {
      win.localStorage.setItem(
        ARCHIVE_STORE_KEY,
        JSON.stringify({ value: true, expiry: new Date().getTime() + DAY_IN_MS }),
      );
    });
    cy.reload();
  };

  // the data-cy lands on both the component root and the card inside it, so counting
  // needs the card itself
  const personCards = () => cy.get('[data-cy="person-card"].v-card');

  const confirmSweep = () => {
    cy.get('[data-cy="archiveTheseDonorsButtonId"]').click({ force: true });
    cy.get('[data-cy="confirmationBoxButtonId"]:visible').first().click();
  };

  beforeEach(() => {
    // the suite-level fixture setup leaves a session behind that test isolation does not
    // clear before the first test
    cy.clearLocalStorage();
  });

  before(() => {
    signInAsSuperAdmin();

    for (let index = 0; index < 3; index++) {
      createDonorViaApi(uniqueDonor(TRIO_LABEL, index + 1));
    }

    // more donors than the old 12-per-minute limiter allowed
    for (let index = 0; index < 15; index++) {
      createDonorViaApi(uniqueDonor(LIMITER_LABEL, index + 10));
    }

    // six student id prefixes, i.e. six batch groups — more than the five the page used
    // to render before the rest went behind a button
    for (let index = 0; index < 6; index++) {
      createDonorViaApi({
        ...uniqueDonor(BATCH_SPREAD_LABEL, index + 30),
        studentId: `1${index}05012`,
      });
    }

    createDonorViaApi(uniqueDonor(ARCHIVED_LABEL, 40)).then((donorId) => archiveDonorViaApi(donorId));
  });

  it('shows the footer only once results are on screen, and writes nothing when the confirmation is cancelled', () => {
    signInAsSuperAdmin();
    cy.get('[data-cy="archiveTheseDonorsButtonId"]').should('not.exist');

    searchFor(TRIO_LABEL);
    cy.get('[data-cy="archiveTheseDonorsButtonId"]')
      .should('be.visible')
      .and('not.be.disabled')
      .and('contain.text', 'Archive these donors?');
    cy.get('[data-cy="archiveBatchHintId"]').should('not.exist');

    cy.intercept('PATCH', '**/donors/v2').as('patchDonor');
    cy.get('[data-cy="archiveTheseDonorsButtonId"]').click({ force: true });
    cy.contains('Are you sure you want to archive these 3 donors?').should('be.visible');
    cy.contains('button', 'Cancel').click({ force: true });

    cy.get('@patchDonor.all').should('have.length', 0);
    personCards().should('have.length', 3);
  });

  it('sweeps every donor on screen with one GET and one PATCH each, carrying the email the search never returned', () => {
    signInAsSuperAdmin();
    searchFor(TRIO_LABEL);

    cy.intercept('GET', '**/donors?donorId=*').as('getDonor');
    cy.intercept('PATCH', '**/donors/v2').as('patchDonor');
    confirmSweep();

    notification.assertEquals('Archived 3 donors');
    cy.get('@getDonor.all').should('have.length', 3);
    cy.get('@patchDonor.all').should('have.length', 3);
    cy.get('@patchDonor.all').then((calls) => {
      const bodies = (calls as unknown as { request: { body: Record<string, unknown> } }[]).map((call) => call.request.body);
      bodies.forEach((body) => {
        expect(body.archiveFlag, 'archiveFlag on the sweep body').to.eq(true);
        // a body assembled from the search result alone could not carry this key: the
        // search response omits email, which the backend suite pins separately
        expect(body, 'sweep body').to.have.property('email');
      });
    });

    // the swept donors have left the partition being viewed
    personCards().should('not.exist');
  });

  it('completes a sweep of more donors than the old rate limiter allowed', () => {
    signInAsSuperAdmin();
    searchFor(LIMITER_LABEL);
    personCards().should('have.length', 15);

    confirmSweep();
    // 30 sequential round trips, so the completion notice is worth waiting for
    cy.get('[data-cy="notificationTextId"]', { timeout: 60000 }).should('have.text', 'Archived 15 donors');
    personCards().should('not.exist');
  });

  it('renders every batch group, with no older-batches button left to press', () => {
    signInAsSuperAdmin();
    searchFor(BATCH_SPREAD_LABEL);

    cy.get('.batch-group').should('have.length', 6);
    personCards().should('have.length', 6);
    cy.get('#olderBatchResultsButton').should('not.exist');
    cy.contains('Show results from older batches').should('not.exist');
  });

  it('turns into an unarchive button while the archive is being browsed', () => {
    signInAsSuperAdmin();
    enableArchiveSearch();
    searchFor(ARCHIVED_LABEL);

    cy.get('[data-cy="archivedResultsBanner"]').should('be.visible');
    cy.get(`[data-cy^="personCardArchivedChipId_"]`).should('be.visible');
    cy.get('[data-cy="archiveTheseDonorsButtonId"]').should('contain.text', 'Unarchive these donors?');
  });

  it('refuses to sweep a result set over the cap', () => {
    signInAsSuperAdmin();

    // stubbed rather than seeded: the cap is a frontend guard, and 201 real donors would
    // buy nothing over 201 fabricated ones
    cy.intercept('GET', '**/search/v3*', {
      statusCode: 200,
      body: { filteredDonors: fabricateSearchResults(ARCHIVE_BATCH_LIMIT + 1) },
    }).as('searchRequest');
    cy.get('[data-cy="filterSearchButtonId"]').click({ force: true });
    cy.wait('@searchRequest');

    cy.get('[data-cy="archiveTheseDonorsButtonId"]').should('be.visible').and('be.disabled');
    cy.get('[data-cy="archiveBatchHintId"]')
      .should('be.visible')
      .and('contain.text', `Narrow your search to ${ARCHIVE_BATCH_LIMIT} donors or fewer to archive in bulk`);

    cy.intercept('GET', '**/donors?donorId=*').as('getDonor');
    cy.intercept('PATCH', '**/donors/v2').as('patchDonor');
    cy.get('[data-cy="archiveTheseDonorsButtonId"]').click({ force: true });
    cy.get('@getDonor.all').should('have.length', 0);
    cy.get('@patchDonor.all').should('have.length', 0);
  });

  it('runs a sweep of exactly the cap', () => {
    signInAsSuperAdmin();

    cy.intercept('GET', '**/search/v3*', {
      statusCode: 200,
      body: { filteredDonors: fabricateSearchResults(ARCHIVE_BATCH_LIMIT) },
    }).as('searchRequest');
    // the writes are stubbed too, so the loop can be driven to completion at full size
    cy.intercept('GET', '**/donors?donorId=*', (req) => {
      const donorId = req.query.donorId as string;
      req.reply({
        statusCode: 200,
        body: {
          donor: {
            _id: donorId,
            name: 'Fabricated Donor',
            phone: 8801700000000,
            studentId: '1605012',
            email: 'fabricated@example.com',
            bloodGroup: 0,
            hall: 0,
            roomNumber: 'F-1',
            address: 'Fabricated Street',
            availableToAll: true,
            archiveFlag: false,
          },
        },
      });
    }).as('getDonor');
    cy.intercept('PATCH', '**/donors/v2', { statusCode: 200, body: { status: 'OK' } }).as('patchDonor');

    cy.get('[data-cy="filterSearchButtonId"]').click({ force: true });
    cy.wait('@searchRequest');

    cy.get('[data-cy="archiveTheseDonorsButtonId"]').should('not.be.disabled');
    cy.get('[data-cy="archiveBatchHintId"]').should('not.exist');

    confirmSweep();
    // 400 stubbed round trips, run one after another
    cy.get('[data-cy="notificationTextId"]', { timeout: 120000 })
      .should('have.text', `Archived ${ARCHIVE_BATCH_LIMIT} donors`);
    personCards().should('not.exist');
  });
});
