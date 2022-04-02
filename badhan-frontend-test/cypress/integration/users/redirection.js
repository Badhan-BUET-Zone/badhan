import { id } from '../../plugins/helpers'
describe('Redirection', () => {
    it('should redirect to web in a new tab', () => {
        cy.visit('http://localhost:8080')
        cy.get('#signInPhoneTextBox').type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get("#signInPasswordTextBox").type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get("#signInButton").click()
        cy.get("#topBarVerticalDotsId").click();
        cy.get("#gotoWebButtonId").click();
        cy.clearLocalStorage()
    })
})
