export class NotificationComponent {
  getSnackbar(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('#notificationSnackbarDivId');
  }

  getText(): Cypress.Chainable<string> {
    return cy.get('#notificationTextId').should('be.visible').invoke('text');
  }

  assertEquals(expectedText: string): void {
    cy.get('#notificationTextId')
      .should('be.visible')
      .and('have.text', expectedText);
  }
}


