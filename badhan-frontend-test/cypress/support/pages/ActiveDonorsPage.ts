export class ActiveDonorsPage {
  closeOverlays(): void {
    cy.get('body').type('{esc}');
  }

  assertAnyCardExists(): void {
    cy.get('[data-cy="person-card"]').should('exist');
  }
}


