import { id } from '../../plugins/helpers'
describe('Redirection', () => {
    it('should redirect to web in a new tab', () => {
        cy.visit('http://localhost:8080')
        cy.get(id('signInPhoneTextBox')).type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get(id("signInPasswordTextBox")).type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get(id("signInButton")).click()
        cy.get(id("topBarVerticalDotsId")).click();
        cy.get(id("gotoWebButtonId")).click();
        cy.clearLocalStorage()
    })
})
