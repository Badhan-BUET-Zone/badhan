import env from '../../plugins/env'
describe('Active Donors', () => {
    it('mark as active donor, get active donors, and delete active donor', () => {
        cy.visit(env.FRONTEND_URL)
        cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
        cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
        cy.get("#signInButton").click()
        cy.get("#hamburgerButtonId").click()
        cy.get("#myProfileNavigationId").click()
        cy.get("#personDetailsActiveDonorButtonId").click()
        cy.get("#personDetailsActiveDonorSwitchId").click({force:true})
        cy.contains("Donor marked as active donor")
        cy.get("#hamburgerButtonId").click()
        cy.intercept({
            method: "GET",
            url: env.BACKEND_URL+"/activeDonors*",
        }).as("activeDonorsInterceptor");
        cy.get("#activeDonorNavigationId").click()
        cy.wait('@activeDonorsInterceptor').its('response.statusCode').should('equal', 200)
        cy.get("#hamburgerButtonId").click()
        cy.get("#myProfileNavigationId").click()
        cy.wait(500)
        cy.get("#personDetailsActiveDonorButtonId").click()
        cy.get("#personDetailsActiveDonorSwitchId").click({force:true})
        cy.contains("Donor unmarked")
        cy.get("#topBarVerticalDotsId").click();
        cy.get("#signOutButtonId").click()
        cy.get("#confirmationBoxButtonId").click();
    })})
