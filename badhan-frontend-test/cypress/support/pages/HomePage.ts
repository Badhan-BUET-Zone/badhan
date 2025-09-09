export class HomePage {
  triggerSearch(): void {
    cy.get('[data-cy="filterSearchButtonId"]').click();
  }

  donorCards(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="person-card"]');
  }

  assertAnyDonorCardExists(): void {
    this.donorCards().its('length').should('be.greaterThan', 0);
  }
}


