export class AppBarComponent {
  openMenu(): void {
    cy.get('[data-cy="topBarVerticalDotsId"]').click();
  }

  clickSignOut(): void {
    cy.get('[data-cy="signOutButtonId"]').click();
  }

  confirmSignOut(): void {
    cy.get('[data-cy="confirmationBoxButtonId"]').click();
  }

  signOut(): void {
    this.openMenu();
    this.clickSignOut();
    this.confirmSignOut();
  }
}



