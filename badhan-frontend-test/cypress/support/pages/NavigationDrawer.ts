export class NavigationDrawer {
  open(): void {
    cy.get('#hamburgerButtonId').click();
  }

  goToSingleDonorCreation(): void {
    // Open main drawer
    this.open();
    // Expand Donor Creation group if present
    cy.get('#donorCreationNavigationId').click();
    // Click Single Donor Creation sublink
    cy.get('#singleDonorCreationId').click();
  }

  goToMyProfile(): void {
    // Open main drawer and click My Profile
    this.open();
    cy.get('#myProfileNavigationId').click();
  }

  goToActiveDonors(): void {
    // Open main drawer and click Active Donors
    this.open();
    cy.get('#activeDonorNavigationId').click();
  }

  goToNewlyCreatedDonors(): void {
    // Open main drawer and click Newly Created Donors
    this.open();
    cy.get('#newDonorsNavigationId').click();
  }

  goToMembers(): void {
    // Open main drawer and click Members
    this.open();
    cy.get('#membersNavigationId').click();
  }

  goToPublicContacts(): void {
    // Open main drawer and click Public Contacts
    this.open();
    cy.get('#publicContactsNavigationId').click();
  }

  goToStatistics(): void {
    // Open main drawer, expand Super Admin group, and click Statistics
    this.open();
    cy.get('#superAdminId').click();
    cy.get('#statisticsNavigationId').click();
  }
}



