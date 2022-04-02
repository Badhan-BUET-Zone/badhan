describe('Login Test', () => {
  it('types password and phone and logs in', () => {
    cy.visit('http://localhost:8080')
    cy.get("#signInPhoneTextBox").type(Cypress.env('SUPERADMIN_PHONE'))
    cy.get("#signInPasswordTextBox").type(Cypress.env('SUPERADMIN_PASSWORD'))
    cy.get("#signInButton").click()
    cy.contains("Signed in successfully")
    cy.get("#topBarVerticalDotsId").click();
    cy.get("#signOutButtonId").click();
    cy.get("#confirmationBoxButtonId").click();
    cy.contains("Logged out successfully")
  })
})


