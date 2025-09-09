export class ExampleHome {
  visit(): void {
    cy.visit('/');
  }

  assertTitleExists(): void {
    cy.title().should('exist');
  }
}


