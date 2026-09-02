export class NotificationComponent {
  getSnackbar(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="notificationSnackbarDivId"]');
  }

  getText(): Cypress.Chainable<string> {
    return cy.get('[data-cy="notificationTextId"]').should('be.visible').invoke('text');
  }

  // For messages the test should not have to quote in full — a toast whose wording is a sentence
  // of advice, where only the fact that it fired is the assertion.
  assertContains(expectedFragment: string): void {
    cy.get('[data-cy="notificationTextId"]').should(($el) => {
      expect($el).to.be.visible;
      expect($el.text()).to.contain(expectedFragment);
    });
  }

  assertEquals(expectedText: string): void {
    cy.get('[data-cy="notificationTextId"]').should(($el) => {
      expect($el).to.be.visible;
      expect($el.text()).to.eq(expectedText);
    });
  }
}


