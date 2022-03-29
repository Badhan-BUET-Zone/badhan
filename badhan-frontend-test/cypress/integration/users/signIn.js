describe('Login Test', () => {
  it('types password and phone and logs in', () => {
    cy.visit('http://localhost:8080')
    cy.get('[id="signInPhoneTextBox"]').type(Cypress.env('SUPERADMIN_PHONE'))
    cy.get('[id="signInPasswordTextBox"').type(Cypress.env('SUPERADMIN_PASSWORD'))
    cy.intercept({
      method: "POST",
      url: "http://localhost:3000/users/signin",
    }).as("signInRouteInterceptor");
    cy.get('[id="signInButton"').click()
    cy.wait("@signInRouteInterceptor")
    cy.get('[id="topBarVerticalDotsId"').click();
    cy.contains('Sign Out').click();
    cy.intercept({
      method: "DELETE",
      url: "http://localhost:3000/users/signout",
    }).as("signOutRouteInterceptor");
    cy.get('[id="confirmationBoxButtonId"]').click();
    cy.wait("@signOutRouteInterceptor")
  })
})


