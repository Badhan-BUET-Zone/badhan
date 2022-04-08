import {idStart} from "../../plugins/helpers";

describe('Logs', () => {
    it('gets logs', () => {
        cy.visit('http://localhost:8080')
        cy.get("#signInPhoneTextBox").type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get("#signInPasswordTextBox").type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get("#signInButton").click()
        cy.contains("Signed in successfully")
        cy.get("#hamburgerButtonId").click()
        cy.get("#myProfileNavigationId").click()
        cy.get("#personDetailsPublicContactSelectId").click({force:true})
        cy.contains("AB+").click()
        cy.get("#profileDetailsPublicContactButtonId").click()
        cy.contains("Public Contacts Updated")
        cy.get("#hamburgerButtonId").click()
        cy.get("#publicContactsNavigationId").click()
        cy.wait(1000)
        cy.contains(Cypress.env('SUPERADMIN_NAME'))
        cy.get("#hamburgerButtonId").click()
        cy.get("#myProfileNavigationId").click()
        cy.get(idStart("publicContactButtonId_")).first().click()
        cy.contains("Public Contacts Updated")
        cy.get("#topBarVerticalDotsId").click();
        cy.get("#signOutButtonId").click();
        cy.get("#confirmationBoxButtonId").click();
        cy.contains("Logged out successfully")
    })
})
