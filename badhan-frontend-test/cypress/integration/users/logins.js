import { idStart } from "../../plugins/helpers";
import env from '../../plugins/env'
function getResponseFromAPI(interceptor){
    return new Promise((resolve,reject)=>{
        /// here if  ele exists or not
        cy.wait(interceptor).then((interception)=>{
            resolve(interception.response.body)
        })
    })
}

describe('List of logins Test', () => {
        it('should get my profile, click for login records and delete a login', async () => {
            cy.visit(env.FRONTEND_URL)
            cy.get('#signInPhoneTextBox').type(env.SUPERADMIN_PHONE)
            cy.get("#signInPasswordTextBox").type(env.SUPERADMIN_PASSWORD)
            cy.get("#signInButton").click()
            cy.contains("success")
            cy.get("#hamburgerButtonId").click()
            cy.intercept({
                method: "GET",
                url: env.BACKEND_URL+'/donors?donorId=*',
            }).as("getMyProfileInterceptor");
            cy.get("#myProfileNavigationId").click()
            cy.wait("@getMyProfileInterceptor")
            cy.intercept({
                method: "GET",
                url: env.BACKEND_URL+'/users/logins',
            }).as("getLoginsInterceptor");
            cy.get("#getListOfLoginButtonId").click()

            const interceptionBody = await getResponseFromAPI('@getLoginsInterceptor')

            cy.scrollTo('bottom')

            if(interceptionBody.logins.length>0){
                cy.intercept({
                    method: "DELETE",
                    url: env.BACKEND_URL+'/users/logins/*',
                }).as("deleteLoginIntercepter");
                cy.get(idStart("loginDeleteButtonId")).first().click()
                cy.wait("@deleteLoginIntercepter")
            }else{
                cy.contains('This is the only logged in device for your account')
            }

            cy.get("#topBarVerticalDotsId").click();
            cy.get("#signOutButtonId").click();
            cy.intercept({
                method: "DELETE",
                url: env.BACKEND_URL+"/users/signout",
            }).as("signOutRouteInterceptor");
            cy.get("#confirmationBoxButtonId").click();
            cy.wait("@signOutRouteInterceptor")
        })
    }
)
