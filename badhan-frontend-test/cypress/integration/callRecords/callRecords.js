import {idStart } from "../../plugins/helpers";

import env from '../../plugins/env'
describe('Call Records', () => {
    it('should create and delete a call record',() => {
        cy.visit(env.FRONTEND_URL)
        cy.get("#signInPhoneTextBox").type(env.SUPERADMIN_PHONE)
        cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
        cy.get("#signInButton").click()
        cy.get('#filterNameTextboxId').type("mr")
        cy.get("#filterPublicDataRadioId").parent().click()
        cy.get("#filterNotAvailableCheckboxId").parent().click()

        cy.intercept({
            method: "GET",
            url: env.BACKEND_URL+'/search/v3*',
        }).as("getSearchResultsInterceptor");
        cy.get("#filterSearchButtonId").click()
        cy.wait("@getSearchResultsInterceptor").then(result => {
            const searchResultBody = result.response.body
            const sampleDonorId = searchResultBody.filteredDonors[0]._id
            const previousCallCount =  searchResultBody.filteredDonors[0].callRecordCount
            cy.get("#personCardId_"+sampleDonorId).click()
            cy.get('#callCountId_'+sampleDonorId).should('have.text', String(previousCallCount))
            cy.get("#personCardCallButtonId_"+sampleDonorId).click()
            cy.contains("Added call record")
            cy.get("#personCardId_"+sampleDonorId).click()
            cy.get('#callCountId_'+sampleDonorId).should('have.text', String(previousCallCount+1))
            cy.get("#personCardSeeProfileButtonId_"+sampleDonorId).click()
            cy.get("#personDetailsCallRecordButtonId").click()
            cy.get(idStart("callRecordDeleteButtonId_")).first().click()
            cy.get("#confirmationBoxButtonId").click()
            cy.contains('Successfully deleted call record')
            cy.scrollTo('top')
            cy.get("#pageTitleBackButtonId").click()
            cy.get("#topBarVerticalDotsId").click();
            cy.get("#signOutButtonId").click()
            cy.get("#confirmationBoxButtonId").click();
        })
    })})
