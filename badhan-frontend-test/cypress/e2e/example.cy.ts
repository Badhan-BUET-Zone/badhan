describe('Example test', () => {
  it('visits the app root url', () => {
    cy.visit('/');
    cy.title().should('exist');
  });
});


