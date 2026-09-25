export class AppBarComponent {
  clickBack(): void {
    cy.get('[data-cy="pageTitleBackButtonId"]').last().scrollIntoView().should('be.visible').click({ force: true });
  }

  // Scrolled to the top first, and forced, for the same reason clickBack above is: the page
  // underneath this button is still transitioning when a spec navigates and then reaches for the
  // menu, and a card leaving the old page can sit over the app bar while it goes. A run of this
  // suite failed on precisely that — "covered by another element: <div class="v-card__title">
  // Bookmar…" — which is the Home page's Bookmarked Donors card on its way out.
  //
  // Forcing is safe HERE and would not be elsewhere: the menu button is a single fixed control in
  // the app bar that is present on every signed-in page, so there is no state in which a click
  // landing on it is the wrong click. It is not a licence to force clicks on content.
  openMenu(): void {
    cy.window().then((win) => win.scrollTo(0, 0));
    cy.get('[data-cy="topBarVerticalDotsId"]').should('be.visible').click({ force: true });
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



