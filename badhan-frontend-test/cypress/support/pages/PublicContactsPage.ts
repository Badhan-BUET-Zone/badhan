export class PublicContactsPage {
  selectBloodGroup(label: string): void {
    cy.wait(1000);
    cy.get('[data-cy="personDetailsPublicContactSelectId"]').click();
    cy.get(`[data-cy="personDetailsPublicContactSelectId${label}"]`).click();
    cy.get('[data-cy="personDetailsPublicContactSelectId"]').blur();
  }

  publish(): void {
    cy.get('[data-cy="profileDetailsPublicContactButtonId"]').click();
  }

  assertAnyDirectCallExists(): void {
    cy.get('[data-cy="directCallButton"]').should('exist');
  }
}


