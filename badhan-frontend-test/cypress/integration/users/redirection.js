import env from '../../plugins/env'
describe('Redirection', () => {
    it('should redirect to web in a new tab', () => {
        cy.visit(env.FRONTEND_URL)
        cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
        cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
        cy.get("#signInButton").click()
        cy.get("#topBarVerticalDotsId").click();
        cy.get("#gotoWebButtonId").click();
        cy.clearLocalStorage()
    })
})
