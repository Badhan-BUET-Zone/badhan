import {idStart} from '../../plugins/helpers'
import env from '../../plugins/env'

describe('Duplicate Donors', () => {
    it('should check whether the phone already exists in donor creation form', () => {
            cy.visit(env.FRONTEND_URL)
            cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
            cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
            cy.get("#signInButton").click()
            cy.get("#hamburgerButtonId").click()
            cy.get("#donorCreationNavigationId").click()
            cy.get("#newDonorPhoneTextBoxId").type(env.SUPERADMIN_PHONE)
            cy.get("#newDonorNameTextBoxId").type("Random Donor Name")
            cy.get("#donorCreationSeeDuplicateButtonId").click()
            cy.scrollTo('top')
            cy.get("#topBarVerticalDotsId").click();
            cy.get("#signOutButtonId").click();
            cy.get("#confirmationBoxButtonId").click();
        }
    )
})
