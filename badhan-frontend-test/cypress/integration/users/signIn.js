import env from '../../plugins/env'
describe('Login Test', () => {
  it('types password and phone and logs in', () => {
    cy.visit(env.FRONTEND_URL)
    cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
    cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
    cy.get("#signInButton").click()
    cy.contains("Signed in successfully")
    cy.get("#topBarVerticalDotsId").click();
    cy.get("#signOutButtonId").click();
    cy.get("#confirmationBoxButtonId").click();
    cy.contains("Logged out successfully")
  })
})

describe('Login Test Guest', () => {
  it('login as guest', () => {
    cy.visit(env.FRONTEND_URL)
    cy.get("#guestSignInButtonId").click()
    cy.get("#topBarVerticalDotsId").click();
    cy.get("#signOutButtonId").click()
    cy.get("#confirmationBoxButtonId").click();
  })})



