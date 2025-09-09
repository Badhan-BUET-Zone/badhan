export class HomePage {
  triggerSearch(): void {
    cy.get('#filterSearchButtonId').click();
  }

  donorCards(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[id^="personCardId_"]');
  }

  assertAnyDonorCardExists(): void {
    this.donorCards().its('length').should('be.greaterThan', 0);
  }
}


