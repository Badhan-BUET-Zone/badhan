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
            cy.visit('http://localhost:8080')
            cy.get('[id="signInPhoneTextBox"]').type(Cypress.env('SUPERADMIN_PHONE'))
            cy.get('[id="signInPasswordTextBox"').type(Cypress.env('SUPERADMIN_PASSWORD'))
            cy.intercept({
                method: "POST",
                url: "http://localhost:3000/users/signin",
            }).as("signInRouteInterceptor");
            cy.get('[id="signInButton"').click()
            cy.wait("@signInRouteInterceptor")
            cy.get('[id="hamburgerButtonId"').click()
            cy.intercept({
                method: "GET",
                url: /http:\/\/localhost:3000\/donors\?donorId=*/,
            }).as("getMyProfileInterceptor");
            cy.get('[id="myProfileNavigationId"]').click()
            cy.wait("@getMyProfileInterceptor")
            cy.intercept({
                method: "GET",
                url: "http://localhost:3000/users/logins",
            }).as("getLoginsInterceptor");
            cy.get('[id="getListOfLoginButtonId"]').click()

            const interceptionBody = await getResponseFromAPI('@getLoginsInterceptor')

            cy.scrollTo('bottom')

            if(interceptionBody.logins.length>0){
                cy.intercept({
                    method: "DELETE",
                    url: /http:\/\/localhost:3000\/users\/logins\/*/,
                }).as("deleteLoginIntercepter");
                cy.get('[id^=loginDeleteButtonId]').first().click()
                cy.wait("@deleteLoginIntercepter")
            }else{
                cy.contains('This is the only logged in device for your account')
            }

            cy.get('[id="topBarVerticalDotsId"').click();
            cy.contains('Sign Out').click();
            cy.intercept({
                method: "DELETE",
                url: "http://localhost:3000/users/signout",
            }).as("signOutRouteInterceptor");
            cy.get('[id="confirmationBoxButtonId"]').click();
            cy.wait("@signOutRouteInterceptor")
        })
    }
)
