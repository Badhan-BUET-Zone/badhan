describe('Login Test', () => {
  it('types password and phone and logs in', () => {
    cy.visit('http://localhost:8080')
    cy.get('[id="signInPhoneTextBox"]').type(Cypress.env('SUPERADMIN_PHONE'))
    cy.get('[id="signInPasswordTextBox"').type(Cypress.env('SUPERADMIN_PASSWORD'))
    cy.get('[id="signInButton"').click()
    cy.intercept({
      method: "POST",
      url: "https://badhan-web-test.herokuapp.com/users/signin",
    }).as("signInRouteInterceptor");
    cy.wait("@signInRouteInterceptor").its('response.statusCode').should('equal', 201);
    cy.get('[id="topBarVerticalDotsId"').click();
    cy.contains('Sign Out').click();
    cy.get('[id="confirmationBoxButtonId"]').click();
    cy.intercept({
      method: "DELETE",
      url: "https://badhan-web-test.herokuapp.com/users/signout",
    }).as("signOutRouteInterceptor");
    cy.wait("@signOutRouteInterceptor").its('response.statusCode').should('equal', 200);
    // cy.contains('type').click()
    //
    // // Should be on a new URL which includes '/commands/actions'
    // cy.url().should('include', '/commands/actions')
    //
    // // Get an input, type into it and verify that the value has been updated
    // cy.get('.action-email')
    //   .type('fake@email.com')
    //   .should('have.value', 'fake@email.com')
  })
})
