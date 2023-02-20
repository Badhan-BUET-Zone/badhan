import {idStart} from "../../plugins/helpers";
import env from '../../plugins/env'
describe('Donations', () => {
    it('should create a donation from person card', () => {
        // Login
        cy.visit(env.FRONTEND_URL)
        cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
        cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
        cy.get("#signInButton").click()

        // search for random donor
        cy.get('#filterNameTextboxId').type("mr")
        cy.get("#filterPublicDataRadioId").parent().click()
        cy.get("#filterNotAvailableCheckboxId").parent().click()
        cy.get("#filterSearchButtonId").click()

        // get the first search result
        cy.get(idStart("personCardId_")).first().click()

        // add a donation
        cy.get(idStart("personCardDatePickerId_")).click()
        cy.get(idStart("personCardDatePickerCalenderId_")).first().contains("28").click()
        cy.get(idStart('personCardDatePickerOkButtonId_')).click()
        cy.get(idStart('personCardDonationButtonId_')).click()
        cy.contains("Successfully added donation")

        // see full profile
        cy.get(idStart("personCardSeeProfileButtonId_")).click()

        // delete first donation
        cy.get("#personDetailsDonationHistoryButtonId").click()
        cy.get(idStart("donationCardDeleteButtonId_")).first().click()
        cy.get("#confirmationBoxButtonId").click()
        cy.contains("Successfully deleted donation")

        // create new donation from profile page
        cy.get("#personDetailsNewDonationTextboxId").click()
        cy.get("#personDetailsNewDonationDatePickerId").contains("28").click()
        cy.get("#personDetailsNewDonationDatePickerOkButtonId").click()
        cy.get("#personDetailsNewDonationOkButtonId").click()
        cy.contains("Added donation")

        // delete the new donation by picking the first donation
        cy.get(idStart("donationCardDeleteButtonId_")).first().click()
        cy.get("#confirmationBoxButtonId").click()
        cy.contains("Successfully deleted donation")

        // logout
        cy.get("#pageTitleBackButtonId").click()
        cy.get("#topBarVerticalDotsId").click();
        cy.get("#signOutButtonId").click()
        cy.get("#confirmationBoxButtonId").click();
    })})
