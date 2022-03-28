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

describe('List of logins Test', () => {
  it('should get my profile and click for login records', () => {
    cy.get('[id="signInPhoneTextBox"]').type(Cypress.env('SUPERADMIN_PHONE'))
    cy.get('[id="signInPasswordTextBox"').type(Cypress.env('SUPERADMIN_PASSWORD'))
    cy.intercept({
      method: "POST",
      url: "http://localhost:3000/users/signin",
    }).as("signInRouteInterceptor");
    cy.get('[id="signInButton"').click()
    cy.wait("@signInRouteInterceptor")
    cy.get('[id="hamburgerButtonId"').click()
    cy.intercept({
      method: "GET",
      url: `http://localhost:3000/donors?donorId=${Cypress.env('SUPERADMIN_ID')}`,
    }).as("getMyProfileInterceptor");
    cy.get('[id="myProfileNavigationId"]').click()
    cy.wait("@getMyProfileInterceptor")
    cy.intercept({
      method: "GET",
      url: "http://localhost:3000/users/logins",
    }).as("getLoginsInterceptor");
    cy.get('[id="getListOfLoginButtonId"]').click()
    cy.wait("@getLoginsInterceptor")
  })}
)
