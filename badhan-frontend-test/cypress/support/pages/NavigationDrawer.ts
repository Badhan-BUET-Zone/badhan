export class NavigationDrawer {
  open(): void {
    cy.get('[data-cy="hamburgerButtonId"]').click();
  }

  ensureClosed(): void {
    // The drawer sits over the page, so anything a test wants to click underneath it has to wait
    // for the close animation to finish — not just for whatever started it.
    cy.get('.v-navigation-drawer').then(($drawer) => {
      if ($drawer.hasClass('v-navigation-drawer--close')) return;
      // An open temporary drawer dims the page behind it AND covers the hamburger, so the dimmer
      // is the only thing left to click. A permanent one has no dimmer, and the hamburger toggles.
      cy.get('body').then(($body) => {
        if ($body.find('.v-overlay--active').length > 0) {
          cy.get('.v-overlay--active').click({ force: true });
        } else {
          this.open();
        }
      });
    });
    cy.get('.v-navigation-drawer').should('have.class', 'v-navigation-drawer--close');
    cy.get('.v-overlay--active').should('not.exist');
  }

  ensureOpen(): void {
    // The hamburger is a toggle, and the drawer starts open on a wide viewport and closed on a
    // narrow one — so a bare open() closes it on a desktop-sized test. Vuetify marks the state on
    // the drawer itself.
    cy.get('.v-navigation-drawer').then(($drawer) => {
      if ($drawer.hasClass('v-navigation-drawer--close')) {
        this.open();
      }
    });
  }

  installEntry(): Cypress.Chainable<JQuery<HTMLElement>> {
    // One id for both destinations — the Play Store link and the browser's install prompt — so a
    // test does not have to know which machine it is running on.
    return cy.get('[data-cy="installAppNavigationId"]');
  }

  assertNoInstallEntry(): void {
    cy.get('[data-cy="installAppNavigationId"]').should('not.exist');
  }

  goToInstall(): void {
    this.ensureOpen();
    this.installEntry().click();
  }

  themeToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    // The one thing always at the foot of the drawer. Used as proof the drawer really rendered
    // before asserting that the install entry beside it is absent.
    return cy.contains('.v-navigation-drawer button', 'Mode');
  }

  goToSingleDonorCreation(): void {
    // Open main drawer
    this.open();
    // Expand Donor Creation group if present
    cy.get('[data-cy="donorCreationNavigationId"]').click();
    // Click Single Donor Creation sublink
    cy.get('[data-cy="singleDonorCreationId"]').click();
  }

  goToCsvDonorCreation(): void {
    // Open main drawer, expand the Donor Creation group, click the CSV upload sublink
    this.open();
    cy.get('[data-cy="donorCreationNavigationId"]').click();
    cy.get('[data-cy="csvDonorCreationId"]').click();
  }

  goToFeedback(): void {
    // Open main drawer and click Feedback. A plain entry — there is deliberately no badge or count
    // on it, so there is nothing else to wait for.
    this.open();
    cy.get('[data-cy="feedbackNavigationId"]').click();
  }

  goToMyProfile(): void {
    // Open main drawer and click My Profile
    this.open();
    cy.get('[data-cy="myProfileNavigationId"]').click();
  }

  goToActiveDonors(): void {
    // Open main drawer and click Active Donors
    this.open();
    cy.get('[data-cy="activeDonorNavigationId"]').click();
  }

  goToNewlyCreatedDonors(): void {
    // Open main drawer and click Newly Created Donors
    this.open();
    cy.get('[data-cy="newDonorsNavigationId"]').click();
  }

  goToMembers(): void {
    // Open main drawer and click Members
    this.open();
    cy.get('[data-cy="membersNavigationId"]').click();
  }

  goToPublicContacts(): void {
    // Open main drawer and click Public Contacts
    this.open();
    cy.get('[data-cy="publicContactsNavigationId"]').click();
  }

  // The four pages that used to be tabs of a Statistics page. Each is its own entry under the
  // Super Admin group now, so reaching one is a menu click rather than a menu click and a tab.
  private goToSuperAdminPage(dataCy: string): void {
    // Both the hamburger and the group header are toggles, and this spec family reaches two Super
    // Admin pages inside one test — so a bare open()/click() pair closes on the second visit what
    // the first left open. A sublink of a collapsed group sits in a span Vuetify holds at
    // `visibility: hidden`, which no amount of retrying makes clickable. Open and expand only when
    // the thing is actually shut; Vuetify marks an expanded group on the group element itself.
    this.ensureOpen();
    cy.get('[data-cy="superAdminId"]').then(($group) => {
      if (!$group.hasClass('v-list-group--active')) {
        cy.wrap($group).click();
      }
    });
    cy.get(`[data-cy="${dataCy}"]`).click();
  }

  goToDonationReport(): void {
    this.goToSuperAdminPage('donationReportNavigationId');
  }

  goToAllDonors(): void {
    this.goToSuperAdminPage('allDonorsNavigationId');
  }

  goToArchivedDonors(): void {
    this.goToSuperAdminPage('archivedDonorsNavigationId');
  }

  goToAppActivity(): void {
    this.goToSuperAdminPage('appActivityNavigationId');
  }

  goToCertificateEnabledDonors(): void {
    // Open main drawer, expand Super Admin group, and click Certificate Enabled Donors
    this.open();
    cy.get('[data-cy="superAdminId"]').click();
    cy.get('[data-cy="certificateEnabledDonorsNavigationId"]').click();
  }

  goToHome(): void {
    // Open the drawer, then click visible Home link; fallback to direct visit
    this.open();
    cy.get('[data-cy="homeNavigationId"], #homeNavigationId').then(($el) => {
      if ($el.length && $el.is(':visible')) {
        cy.wrap($el).click();
      } else {
        cy.visit('/#/home');
      }
    });
  }
}



