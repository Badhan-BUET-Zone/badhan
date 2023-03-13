import { idStart } from '../../plugins/frontend'
import env from '../../plugins/env'
describe('Designated Donors', () => {
    it('should get all designated donors', () => {
        cy.visit(env.FRONTEND_URL)
        cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
        cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
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
