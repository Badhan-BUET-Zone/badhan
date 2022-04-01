import { id, idStart } from '../../plugins/helpers'
describe('Duplicate Donors', () => {
    it('should check whether the phone already exists in donor creation form', () => {
            cy.visit('http://localhost:8080')
            cy.get(id('signInPhoneTextBox')).type(Cypress.env('SUPERADMIN_PHONE'))
            cy.get(id("signInPasswordTextBox")).type(Cypress.env('SUPERADMIN_PASSWORD'))
            cy.get(id("signInButton")).click()
            cy.get(id("hamburgerButtonId")).click()
            cy.get(id("donorCreationNavigationId")).click()
            cy.get(id("newDonorPhoneTextBoxId")).type(Cypress.env('SUPERADMIN_PHONE'))
            cy.get(id("newDonorNameTextBoxId")).type("Random Donor Name")
            cy.get(id("donorCreationSeeDuplicateButtonId")).click()
            cy.scrollTo('top')
            cy.get(id("topBarVerticalDotsId")).click();
            cy.contains('Sign Out').click();
            cy.get(id("confirmationBoxButtonId")).click();
    }
    )
})
