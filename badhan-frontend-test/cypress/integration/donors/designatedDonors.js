import { idStart } from '../../plugins/helpers'
describe('Designated Donors', () => {
    it('should get all designated donors', () => {
        cy.visit('http://localhost:8080')
        cy.get("#signInPhoneTextBox").type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get("#signInPasswordTextBox").type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get("#signInButton").click()
        cy.get("#hamburgerButtonId").click()
        cy.get('#membersNavigationId').click()
        cy.get(idStart("volunteerId_"))
        cy.get(idStart("hallAdminId_"))
        cy.get(idStart("superAdminId_"))
        cy.get("#topBarVerticalDotsId").click()
        cy.get("#signOutButtonId").click();
        cy.get("#confirmationBoxButtonId").click()
    })})
