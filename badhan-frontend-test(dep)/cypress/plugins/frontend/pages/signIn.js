export default {
    phoneTextBox: {
        type: (text)=> {
            cy.get('#signInPhoneTextBox').type(text)
        }
    },
    passwordTextBox: {
       type: (text)=>{
           cy.get("#signInPasswordTextBox").type(text)
       }
    },
    signInButton: {
        click: ()=>{
            cy.get("#signInButton").click()
        }
    }
}