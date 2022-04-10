import env from '../../plugins/env'
describe('Change password', () => {
    it('should change password and check', () => {
        cy.visit(env.FRONTEND_URL)
        cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
        cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
        cy.get("#signInButton").click()
        cy.get("#hamburgerButtonId").click()
        cy.get("#myProfileNavigationId").click()
        cy.contains('Donor Profile')
        cy.get("#profileSettingsId").click()
        cy.get("#newPasswordFieldId").type('123456789')
        cy.get("#confirmPasswordFieldId").type('123456789')
        cy.get("#passwordChangeConfirmedId").click()
        cy.contains('success')
        cy.scrollTo('top')
        cy.get("#topBarVerticalDotsId").click();
        cy.get("#signOutButtonId").click()
        cy.get("#confirmationBoxButtonId").click();
        cy.get("#signInPhoneTextBox").type(env.SUPERADMIN_PHONE)
        cy.get("#signInPasswordTextBox").type('123456789')
        cy.get("#signInButton").click()
        cy.get("#hamburgerButtonId").click()
        cy.get("#myProfileNavigationId").click()
        cy.wait(500)
        cy.contains('Donor Profile')
        cy.get("#profileSettingsId").click()
        cy.get("#newPasswordFieldId").type(env.SUPERADMIN_PASSWORD)
        cy.get("#confirmPasswordFieldId").type(env.SUPERADMIN_PASSWORD)
        cy.get("#passwordChangeConfirmedId").click()
        cy.contains('success')
        cy.scrollTo('top')
        cy.get("#topBarVerticalDotsId").click();
        cy.get("#signOutButtonId").click();;
        cy.get("#confirmationBoxButtonId").click();
    })
})
