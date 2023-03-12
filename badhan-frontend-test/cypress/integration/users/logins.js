import { idStart } from "../../plugins/helpers";
import env from '../../plugins/env'

describe('List of logins Test', () => {
        it('should get my profile, click for login records and delete a login',  () => {
            //login the UI
            cy.visit(env.FRONTEND_URL)
            cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
            cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
            cy.get("#signInButton").click()
            cy.contains("success")

            cy.clearLocalStorage()
            cy.reload()

            cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
            cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
            cy.get("#signInButton").click()
            cy.contains("success")

            // go to my profile
            cy.get("#hamburgerButtonId").click()
            cy.intercept({
                method: "GET",
                url: env.BACKEND_URL+'/donors?donorId=*',
            }).as("getMyProfileInterceptor")
            cy.get("#myProfileNavigationId").click()
            cy.wait("@getMyProfileInterceptor")
            cy.get("#getListOfLoginButtonId").click()
            cy.scrollTo('bottom')

            // click to check logins and press delete login
            cy.get(idStart("loginDeleteButtonId")).first().click()
            cy.contains('Logged out from specified device')

            // logout from all devices
            cy.get('#logoutFromAllDevices').click()
            cy.contains('Logged out from all devices successfully')

        })
    }
)
