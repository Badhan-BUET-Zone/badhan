export class NotificationComponent {
  getSnackbar(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="notificationSnackbarDivId"]');
  }

  getText(): Cypress.Chainable<string> {
    return cy.get('[data-cy="notificationTextId"]').should('be.visible').invoke('text');
  }

  assertEquals(expectedText: string): void {
    cy.get('[data-cy="notificationTextId"]').should(($el) => {
      expect($el).to.be.visible;
      expect($el.text()).to.eq(expectedText);
    });
  }
}


