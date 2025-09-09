export class MembersPage {
  assertAnyVolunteerExists(): void {
    cy.get('[id^="volunteerId_"]').its('length').should('be.gte', 1);
  }

  assertAnyHallAdminExists(): void {
    cy.get('[id^="hallAdminId_"]').its('length').should('be.gte', 1);
  }

  assertAnySuperAdminExists(): void {
    cy.get('[id^="superAdminId_"]').its('length').should('be.gte', 1);
  }
}


