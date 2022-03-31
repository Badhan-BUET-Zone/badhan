import { id, idStart } from '../../plugins/helpers'
describe('Donor Creation', () => {
    it('should create new donor, get donor and delete donor', () => {
        cy.visit('http://localhost:8080')
        cy.get(id('signInPhoneTextBox')).type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get(id("signInPasswordTextBox")).type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get(id("signInButton")).click()
        cy.get(id("hamburgerButtonId")).click()
        cy.get(id("donorCreationNavigationId")).click()
        cy.get(id("newDonorNameTextBoxId")).type("Random Donor Name")
        cy.get(id("newDonorPhoneTextBoxId")).type("01311113278")
        cy.get(id("newDonorStudentIdTextBoxId")).type("1605489")
        cy.get(id("newDonorBloodGroupDropDownId")).click({force:true});
        cy.contains('AB+').click();
        cy.get(id("newDonorRoomNumberTextFieldId")).type("Random Room Number")
        cy.get(id("newDonorAddressTextFieldId")).type("Random Address")
        cy.get(id("newDonorCommentTextFieldId")).type("Random Comment")
        cy.get(id("newDonorDonationCountTextFieldId")).clear().type("1")
        cy.get(id("newDonorHallDropdownId")).click({force:true});
        cy.contains("Ahsanullah").click()
        cy.get(id("newDonorPublicDataCheckboxId")).parent().click()
        cy.get(id("newDonorLastDonationTextFieldId")).click()
        cy.contains('23').click()
        cy.get(id('newDonorLastDonationOkButtonId')).click()
        cy.get(id('newDonorCreateButtonId')).click()
        cy.contains('Donor added successfully')
        cy.get(id("hamburgerButtonId")).click()
        cy.get(id('homeNavigationId')).click()
        cy.get(id('filterNameTextboxId')).type("random")
        cy.get(id("filterPublicDataRadioId")).parent().click()
        cy.get(id("filterNotAvailableCheckboxId")).parent().click()
        cy.get(id("filterSearchButtonId")).click()
        cy.get(idStart("personCardId_")).first().click()
        cy.get(idStart("personCardSeeProfileButtonId_")).click()
        cy.get(idStart("profileSettingsId")).click()
        cy.get(id("personDetailsDeleteButtonId")).click()
        cy.get(id("confirmationBoxButtonId")).click()
        cy.contains('success')
        cy.scrollTo('top')
        cy.get(id("topBarVerticalDotsId")).click();
        cy.contains('Sign Out').click();
        cy.get(id("confirmationBoxButtonId")).click();
    })
})
