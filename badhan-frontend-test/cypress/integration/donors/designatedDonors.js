import { id, idStart } from '../../plugins/helpers'
describe('Designated Donors', () => {
    it('should get all designated donors', () => {
        cy.visit('http://localhost:8080')
        cy.get(id("signInPhoneTextBox")).type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get(id("signInPasswordTextBox")).type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get(id("signInButton")).click()
        cy.get(id("hamburgerButtonId")).click()
        cy.get(id('membersNavigationId')).click()
        cy.get(idStart("volunteerId_"))
        cy.get(idStart("hallAdminId_"))
        cy.get(idStart("superAdminId_"))
        cy.get(id("topBarVerticalDotsId")).click()
        cy.contains('Sign Out').click()
        cy.get(id("confirmationBoxButtonId")).click()
    })})
