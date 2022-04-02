import { id, idStart } from '../../plugins/helpers'
describe('Designated Donors', () => {
    it('should get all designated donors', () => {
        cy.visit('http://localhost:8080')
        cy.get("#signInPhoneTextBox").type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get("#signInPasswordTextBox").type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get("#signInButton").click()
        cy.get("#hamburgerButtonId").click()

        cy.get("#myProfileNavigationId").click()

        cy.get("#donorDetailsNameTextBoxId").clear().type("Random Donor")
        cy.get("#donorDetailsPhoneTextBoxId").clear().type("01521438557")
        cy.get("#donorDetailsEmailTextBoxId").clear().type("mirmahathir2@gmail.com")
        cy.get("#donorDetailsBloodGroupDropDownId").click({force:true})
        cy.contains('O+').click();
        cy.get("#donorDetailsStudentIdTextBoxId").clear().type("1605010")
        cy.get("#donorDetailsRoomTextBoxId").clear().type("Random Comment")
        cy.get("#donorDetailsAddressTextBoxId").clear().type("Random Address")
        cy.get("#donorDetailsHallDropDownId").click({force:true})
        cy.contains("Ahsanullah").click()
        cy.get("#donorDetailsPublicDataCheckboxId").check({force: true})
        cy.get("#donorDetailsSaveButtonId").click()

        cy.contains("Saved details successfully")

        cy.get("#donorDetailsCommentTextBoxId").clear().type("Random Comment")
        cy.get("#donorDetailsCommentSaveButtonId").click()

        cy.contains("Successfully changed comment")

        cy.reload()

        cy.get("#donorDetailsNameTextBoxId").should("have.value","Random Donor")
        cy.get("#donorDetailsPhoneTextBoxId").should("have.value","01521438557")
        cy.get("#donorDetailsEmailTextBoxId").should("have.value","mirmahathir2@gmail.com")
        cy.get("#donorDetailsBloodGroupSpanId").should('contain.text', "O+")
        cy.get("#donorDetailsStudentIdTextBoxId").should("have.value","1605010")
        cy.get("#donorDetailsRoomTextBoxId").should("have.value","Random Comment")
        cy.get("#donorDetailsAddressTextBoxId").should("have.value","Random Address")
        cy.get("#donorDetailsHallDropDownSpan").should('contain.text',"Ahsanullah")
        cy.get("#donorDetailsPublicDataCheckboxId").should("be.checked")
        cy.get("#donorDetailsCommentTextBoxId").should('have.value',"Random Comment")

        cy.get("#donorDetailsNameTextBoxId").clear().type("Mir Mahathir Mohammad")
        cy.get("#donorDetailsPhoneTextBoxId").clear().type("01521438557")
        cy.get("#donorDetailsEmailTextBoxId").clear().type("mirmahathir1@gmail.com")
        cy.get("#donorDetailsBloodGroupDropDownId").click({force:true})
        cy.contains('B+').click();
        cy.get("#donorDetailsStudentIdTextBoxId").clear().type("1605011")
        cy.get("#donorDetailsRoomTextBoxId").clear().type("Developer of Badhan Web and Android")
        cy.get("#donorDetailsAddressTextBoxId").clear().type("Azimpur Road")
        cy.get("#donorDetailsHallDropDownId").click({force:true})
        cy.contains("Suhrawardy").click()
        cy.get("#donorDetailsPublicDataCheckboxId").uncheck({force: true})
        cy.get("#donorDetailsSaveButtonId").click()

        cy.contains("Saved details successfully")

        cy.get("#donorDetailsCommentTextBoxId").clear().type("Is not available for donation")
        cy.get("#donorDetailsCommentSaveButtonId").click()

        cy.contains("Successfully changed comment")

        cy.get("#topBarVerticalDotsId").click()
        cy.contains('Sign Out').click()
        cy.get("#confirmationBoxButtonId").click()
    })})
