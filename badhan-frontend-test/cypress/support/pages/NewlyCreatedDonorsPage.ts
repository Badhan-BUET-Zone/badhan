export class NewlyCreatedDonorsPage {
  fetch(): void {
    cy.contains('button', 'Fetch Newly Created Donors').click();
  }

  assertAnyDonorCardExists(): void {
    cy.get('[id^="personCardId_"]').its('length').should('be.gte', 1);
  }
}


