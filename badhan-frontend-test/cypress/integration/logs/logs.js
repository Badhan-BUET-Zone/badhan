import {idStart} from "../../plugins/helpers";

describe('Logs', () => {
    it('gets logs', () => {
        cy.visit('http://localhost:8080')
        cy.get("#signInPhoneTextBox").type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get("#signInPasswordTextBox").type(Cypress.env('SUPERADMIN_PASSWORD'))
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
