describe('Change password', () => {
    it('should change password and check', () => {
        cy.visit('http://localhost:8080')
        cy.get('[id="signInPhoneTextBox"]').type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get('[id="signInPasswordTextBox"').type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get('[id="signInButton"').click()
        cy.get('[id="hamburgerButtonId"').click()
        cy.get('[id="myProfileNavigationId"]').click()
        cy.contains('Donor Profile')
        cy.get('[id="profileSettingsId"').click()
        cy.get('[id="newPasswordFieldId"').type('123456789')
        cy.get('[id="confirmPasswordFieldId"').type('123456789')
        cy.get('[id="passwordChangeConfirmedId"').click()
        cy.contains('success')
        cy.scrollTo('top')
        cy.get('[id="topBarVerticalDotsId"').click();
        cy.contains('Sign Out').click();
        cy.get('[id="confirmationBoxButtonId"]').click();
        cy.get('[id="signInPhoneTextBox"]').type(Cypress.env('SUPERADMIN_PHONE'))
        cy.get('[id="signInPasswordTextBox"').type('123456789')
        cy.get('[id="signInButton"').click()
        cy.get('[id="hamburgerButtonId"').click()
        cy.get('[id="myProfileNavigationId"]').click()
        cy.wait(500)
        cy.contains('Donor Profile')
        cy.get('[id="profileSettingsId"').click()
        cy.get('[id="newPasswordFieldId"').type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get('[id="confirmPasswordFieldId"').type(Cypress.env('SUPERADMIN_PASSWORD'))
        cy.get('[id="passwordChangeConfirmedId"').click()
        cy.contains('success')
        cy.scrollTo('top')
        cy.get('[id="topBarVerticalDotsId"').click();
        cy.contains('Sign Out').click();
        cy.get('[id="confirmationBoxButtonId"]').click();
    })
})
