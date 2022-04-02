describe('Forgot Password Test', () => {
    it('checks feature to recover password', () => {
        cy.visit('http://localhost:8080')
        cy.get("#forgotPasswordButtonId").click()
        cy.get("#forgotPasswordPhoneId").type(Cypress.env('SUPERADMIN_PHONE'))
        cy.intercept({
            method: "POST",
            url: "http://localhost:3000/users/password/forgot",
        }).as("passwordForgotInterceptor");
        cy.get("#forgotPasswordButtonConfirmedId").click()
        cy.wait('@passwordForgotInterceptor').its('response.statusCode').should('equal', 200)
        cy.contains('Check Email')
    })
})
