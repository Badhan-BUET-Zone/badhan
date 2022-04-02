import { idStart } from '../../plugins/helpers'
describe('Donor Creation', () => {
    it('should create new donor, get donor and delete donor', () => {
        cy.visit('http://localhost:8080')
        cy.get('#signInPhoneTextBox').type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get("#signInPasswordTextBox").type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get("#signInButton").click()
        cy.get("#hamburgerButtonId").click()
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
        cy.get("#newDonorHallDropdownId").click({force:true});
        cy.contains("Ahsanullah").click()
        cy.get("#newDonorPublicDataCheckboxId").parent().click()
        cy.get("#newDonorLastDonationTextFieldId").click()
        cy.contains('23').click()
        cy.get('#newDonorLastDonationOkButtonId').click()
        cy.get('#newDonorCreateButtonId').click()
        cy.contains('Donor added successfully')
        cy.get("#hamburgerButtonId").click()
        cy.get('#homeNavigationId').click()
        cy.get('#filterNameTextboxId').type("random")
        cy.get("#filterPublicDataRadioId").parent().click()
        cy.get("#filterNotAvailableCheckboxId").parent().click()
        cy.get("#filterSearchButtonId").click()
        cy.get(idStart("personCardId_")).first().click()
        cy.get(idStart("personCardSeeProfileButtonId_")).click()
        cy.get(idStart("profileSettingsId")).click()
        cy.get("#personDetailsDeleteButtonId").click()
        cy.get("#confirmationBoxButtonId").click()
        cy.contains('success')
        cy.scrollTo('top')
        cy.get("#topBarVerticalDotsId").click();
        cy.get("#signOutButtonId").click();;
        cy.get("#confirmationBoxButtonId").click();
    })
})
