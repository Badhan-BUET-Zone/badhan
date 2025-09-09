export class NewlyCreatedDonorsPage {
  fetch(): void {
    cy.get('[data-cy="fetchNewlyCreatedDonorsButton"]').click();
  }

  assertAnyDonorCardExists(): void {
    cy.get('[data-cy="person-card"]').its('length').should('be.gte', 1);
  }
}


