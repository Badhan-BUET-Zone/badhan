export class NavigationDrawer {
  open(): void {
    cy.get('[data-cy="hamburgerButtonId"]').click();
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

  goToStatistics(): void {
    // Open main drawer, expand Super Admin group, and click Statistics
    this.open();
    cy.get('[data-cy="superAdminId"]').click();
    cy.get('[data-cy="statisticsNavigationId"]').click();
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



