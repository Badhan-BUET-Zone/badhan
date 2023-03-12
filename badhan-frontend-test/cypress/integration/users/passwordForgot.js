import env from '../../plugins/env'
describe('Forgot Password Test', () => {
    it.skip('checks feature to recover password', () => {
        cy.visit(env.FRONTEND_URL)
        cy.get("#forgotPasswordButtonId").click()
        cy.get("#forgotPasswordPhoneId").type(env.SUPERADMIN_PHONE)
        cy.intercept({
            method: "POST",
            url: env.BACKEND_URL+"/users/password/forgot",
        }).as("passwordForgotInterceptor");
        cy.get("#forgotPasswordButtonConfirmedId").click()
        cy.wait('@passwordForgotInterceptor').its('response.statusCode').should('equal', 200)
        cy.contains('Check Email')
    })
})
