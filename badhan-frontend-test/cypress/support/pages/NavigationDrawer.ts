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
}



