export class ActiveDonorsPage {
  closeOverlays(): void {
    cy.get('body').type('{esc}');
  }

  assertAnyCardExists(): void {
    cy.get('[data-cy="person-card"]').should('exist');
  }

  expandFirstCard(): void {
    cy.get('[data-cy="person-card"]').first().click();
  }

  directCallOnFirstCard(): void {
    // Assumes first card is expanded
    cy.contains('button', 'Direct call').first().click();
  }

  seeProfileOnFirstCard(): void {
    // Assumes first card is expanded
    cy.contains('button', 'See profile').first().click();
  }
}


