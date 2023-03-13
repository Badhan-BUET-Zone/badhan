import { idStart } from '../../plugins/frontend'
import env from '../../plugins/env'

describe('Donor Creation', () => {
    it('should create new donor, get donor, promote to volunteer, check volunteer, demote to donor and delete donor', () => {
        cy.visit(env.FRONTEND_URL)
        cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
        cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
        cy.get("#signInButton").click()

        cy.get('#filterNameTextboxId').type("Random Donor Name")
        cy.get("#filterPublicDataRadioId").parent().click()
        cy.get("#filterNotAvailableCheckboxId").parent().click()
        cy.get("#filterSearchButtonId").click()
        cy.intercept({
            method: "GET",
            url: env.BACKEND_URL+'/search/v3*',
        }).as("getSearchResultsInterceptor");
        cy.wait("@getSearchResultsInterceptor", {
            timeout: 10000
        }).then(result => {
            //if the donor already was created
            if(result.response.body.filteredDonors.length !== 0){
                cy.get(idStart("personCardId_")).first().click()
                cy.get(idStart("personCardSeeProfileButtonId_")).click()
                cy.get(idStart("profileSettingsId")).click()
                cy.get("#personDetailsDeleteButtonId").click()
                cy.get("#confirmationBoxButtonId").click()
                cy.contains('success')
            }

            //proceed to create donor
            cy.get("#hamburgerButtonId").click()
            cy.get("#donorCreationNavigationId").click()
            cy.get("#donorCreationNavigationId").click()
            cy.get("#newDonorNameTextBoxId").type("Random Donor Name")
            cy.get("#newDonorPhoneTextBoxId").type("01311113278")
            cy.get("#newDonorStudentIdTextBoxId").type("1605489")
            cy.get("#newDonorBloodGroupDropDownId").click({force:true});
            cy.contains('AB+').click();
            cy.get("#newDonorRoomNumberTextFieldId").type("Random Room Number")
            cy.get("#newDonorAddressTextFieldId").type("Random Address")
            cy.get("#newDonorCommentTextFieldId").type("Random Comment")
            cy.get("#newDonorDonationCountTextFieldId").clear().type("1")
            cy.get("#newDonorPublicDataCheckboxId").parent().click()
            cy.get("#newDonorLastDonationTextFieldId").click()
            cy.contains("28").click()
            cy.get('#newDonorLastDonationOkButtonId').click()
            cy.get('#newDonorCreateButtonId').click()
            cy.contains('Donor added successfully')

            //search thee created donor
            cy.get("#hamburgerButtonId").click()
            cy.get('#homeNavigationId').click()
            cy.get('#filterNameTextboxId').type("random")
            cy.get("#filterPublicDataRadioId").parent().click()
            cy.get("#filterNotAvailableCheckboxId").parent().click()
            cy.get("#filterSearchButtonId").click()
            cy.get(idStart("personCardId_")).first().click()
            cy.get(idStart("personCardSeeProfileButtonId_")).click()

            // promote the new donor
            cy.get(idStart("profileSettingsId")).click()
            cy.get("#promoteToVolunteerButtonId").click()
            cy.contains("Target user promoted/demoted successfully")

            // check whether promotion was successful
            cy.get("#pageTitleBackButtonId").click()
            cy.get("#hamburgerButtonId").click()
            cy.get("#membersNavigationId").click()
            cy.contains("Random Donor Name")

            // search the promoted donor again
            cy.get("#hamburgerButtonId").click()
            cy.get('#homeNavigationId').click()
            cy.get('#filterNameTextboxId').type("random")
            cy.get("#filterPublicDataRadioId").parent().click()
            cy.get("#filterNotAvailableCheckboxId").parent().click()
            cy.get("#filterSearchButtonId").click()
            cy.get(idStart("personCardId_")).first().click()
            cy.get(idStart("personCardSeeProfileButtonId_")).click()
            cy.wait(500)

            // demote the donor
            cy.get(idStart("profileSettingsId")).click()
            cy.get("#demoteToDonorButtonId").click()
            cy.contains("Target user promoted/demoted successfully")

            //delete the donor
            cy.get("#personDetailsDeleteButtonId").click()
            cy.get("#confirmationBoxButtonId").click()
            cy.contains('success')

            // sign out
            cy.scrollTo('top')
            cy.get("#topBarVerticalDotsId").click();
            cy.get("#signOutButtonId").click()
            cy.get("#confirmationBoxButtonId").click();
        })


    })
})
