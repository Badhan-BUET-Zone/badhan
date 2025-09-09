export class AppBarComponent {
  openMenu(): void {
    cy.get('#topBarVerticalDotsId').click();
  }

  clickSignOut(): void {
    cy.get('#signOutButtonId').click();
  }

  confirmSignOut(): void {
    cy.get('#confirmationBoxButtonId').click();
  }

  signOut(): void {
    this.openMenu();
    this.clickSignOut();
    this.confirmSignOut();
  }
}



