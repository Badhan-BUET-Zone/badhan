import {idStart, getTextFromIdStart} from "../../plugins/helpers";

describe('Call Records', () => {
    it('should create and delete a call record', async () => {
        cy.visit('http://localhost:8080')
        cy.get("#signInPhoneTextBox").type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get("#signInPasswordTextBox").type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get("#signInButton").click()
        cy.get('#filterNameTextboxId').type("mr")
        cy.get("#filterPublicDataRadioId").parent().click()
        cy.get("#filterNotAvailableCheckboxId").parent().click()
        cy.get("#filterSearchButtonId").click()
        cy.get(idStart("personCardId_")).first().click()
        const callCount = parseInt(await getTextFromIdStart("callCountId_",0))
        cy.get(idStart("personCardCallButtonId_")).first().click()
        cy.contains("Added call record")
        cy.get("#filterSearchButtonId").click()
        cy.get(idStart("personCardId_")).first().click()
        const updatedCallCount = parseInt(await getTextFromIdStart("callCountId_",0))
        expect(updatedCallCount).equal(callCount+1,"call count updated")
        cy.get(idStart("personCardSeeProfileButtonId_")).click()
        cy.get("#personDetailsCallRecordButtonId").click()
        cy.get(idStart("callRecordDeleteButtonId_")).first().click()
        cy.get("#confirmationBoxButtonId").click()
        cy.contains('Successfully deleted call record')
        cy.scrollTo('top')
        cy.get("#pageTitleBackButtonId").click()
        cy.get("#topBarVerticalDotsId").click();
        cy.get("#signOutButtonId").click()
        cy.get("#confirmationBoxButtonId").click();
    })})
