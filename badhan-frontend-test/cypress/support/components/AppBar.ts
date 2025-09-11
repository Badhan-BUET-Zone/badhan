export class AppBarComponent {
  clickBack(): void {
    cy.get('[data-cy="pageTitleBackButtonId"]:visible').last().click({ force: true });
  }

  openMenu(): void {
    cy.get('[data-cy="topBarVerticalDotsId"]').click();
  }

  clickSignOut(): void {
    cy.get('[data-cy="signOutButtonId"]').click();
  }

  confirmSignOut(): void {
    cy.get('[data-cy="confirmationBoxButtonId"]:visible').first().click();
  }

  signOut(): void {
    this.openMenu();
    this.clickSignOut();
    this.confirmSignOut();
  }
}



