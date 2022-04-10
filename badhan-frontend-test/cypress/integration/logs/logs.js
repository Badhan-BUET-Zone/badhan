import {idStart} from "../../plugins/helpers";
import env from '../../plugins/env'
describe('Logs', () => {
    it('gets logs', () => {
        cy.visit(env.FRONTEND_URL)
        cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
        cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
        cy.get("#signInButton").click()
        cy.contains("Signed in successfully")
        cy.get("#hamburgerButtonId").click()
        cy.get("#superAdminNavigationId").click()
        cy.get("#statisticsNavigationId").click()
        cy.get(idStart("dateLogDetailsButtonId_")).first().click()
        cy.get(idStart("personLogExpandButtonId_")).first().click()
        cy.get(idStart("logObjectClickMeButtonId_")).first().click()
        cy.get(idStart("logObjectClickMeCloseButtonId_")).first().click()
        cy.get("#statisticsAllVolunteersTabId").click()
        cy.get("#statisticsAllVolunteersTableId")
        cy.get("#statisticsStatsTabId").click()
        cy.get("#statsNumberOfDonors")
        cy.get("#topBarVerticalDotsId").click();
        cy.get("#signOutButtonId").click();
        cy.get("#confirmationBoxButtonId").click();
        cy.contains("Logged out successfully")
    })
})
