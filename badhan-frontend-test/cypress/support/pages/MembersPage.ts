export class MembersPage {
  assertAnyVolunteerExists(): void {
    cy.get('[data-cy="volunteerRow"]').its('length').should('be.gte', 1);
  }

  assertAnyHallAdminExists(): void {
    cy.get('[data-cy="hallAdminRow"]').its('length').should('be.gte', 1);
  }

  assertAnySuperAdminExists(): void {
    cy.get('[data-cy="superAdminRow"]').its('length').should('be.gte', 1);
  }
}


