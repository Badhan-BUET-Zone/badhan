import env from './env'
export class ApiInterceptor {
    constructor(methodName, url){
        this.url = env.BACKEND_URL+url
        this.methodName = methodName
        this.interceptorName = `Interceptor_${new Date().getTime()}`
        cy.intercept({
            method:this.methodName,
            url: this.url,
        }).as(this.interceptorName);
    }
    wait(){
        return cy.wait(`@${this.interceptorName}`)
    }
    responseStatusCodeShouldBeEqualTo200(){
        this.wait().its('response.statusCode').should('equal', 200)
    }
    responseStatusCodeShouldBeEqualTo201(){
        this.wait().its('response.statusCode').should('equal', 201)
    }
}