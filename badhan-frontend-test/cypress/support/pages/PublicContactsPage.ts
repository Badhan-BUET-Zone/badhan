export class PublicContactsPage {
  selectBloodGroup(label: string): void {
    cy.get('[data-cy="personDetailsPublicContactSelectId"]').click();
    cy.contains('.v-list-item__title', label).click();
    cy.get('[data-cy="personDetailsPublicContactSelectId"]').blur();
  }

  publish(): void {
    cy.get('#profileDetailsPublicContactButtonId').click();
  }

  assertAnyDirectCallExists(): void {
    cy.contains('button', 'Direct Call').should('exist');
  }
}


