export const pageTitle= {
    backButton: {
        click: ()=>{
            cy.get("#pageTitleBackButtonId").click()
        }
    }
}
export default {
    notificationSnackBar: {
        contains: (text)=> {
            cy.get("#notificationTextId").should('have.text', text)
        }
    },
    confirmationModal : {
        okButton: {
            click: ()=>{
                cy.get("#confirmationBoxButtonId").click()
            }
        }
    },
    topBar: {
        tripleDotButton: {
            click: ()=>{
                cy.get("#topBarVerticalDotsId").click()
            },
            tripleDotButtonMenu: {
                signOutMenuButton: {
                    click: ()=> {
                        cy.get("#signOutButtonId").click()
                    }
                }
            }
        },
        drawerButton: {
            click: ()=> {
                cy.get("#hamburgerButtonId").click()
            }
        },
        drawer: {
            homeLink: {
                click: ()=>{
                    cy.get('#homeNavigationId').click()
                }
            },
            donorCreationLink:{
                click: ()=>{
                    cy.get("#donorCreationNavigationId").click()
                }
            },
            myProfileLink: {
                click: ()=>{
                    cy.get("#myProfileNavigationId").click()
                }
            },
            singleDonorCreationLink: {
                click: ()=>{
                    cy.get("#singleDonorCreationId").click()
                }
            },
            activeDonorLink: {
                click: ()=>{
                    cy.get("#activeDonorNavigationId").click()
                }
            },
            membersLink: {
                click: ()=>{
                    cy.get('#membersNavigationId').click()
                }
            }
        }
    },
}