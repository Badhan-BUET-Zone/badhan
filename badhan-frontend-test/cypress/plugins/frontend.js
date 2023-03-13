import env from "./env";

export const idStart = (elementId) => {
    return `[id^="${elementId}"]`
}

export const ui = {
    control: {
        scroll: {
            top: ()=>{cy.scrollTo('top')}
        },
        wait: (milliseconds)=> {
            cy.wait(milliseconds)
        },
        start: ()=> {
            cy.visit(env.FRONTEND_URL)
        }
    },
    components:{
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
                donorCreationLink:{
                    click: ()=>{
                        cy.get("#donorCreationNavigationId").click()
                    }
                },
                singleDonorCreationLink: {
                    click: ()=>{
                        cy.get("#singleDonorCreationId").click()
                    }
                }
            }
        },
    },
    pages: {
        signIn: {
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
        },
        home: {
            filter: {
                nameTextBox: {
                    type: (text)=> {
                        cy.get('#filterNameTextboxId').type(text)
                    }
                },
                publicDataRadioButton: {
                    click: ()=>{
                        cy.get("#filterPublicDataRadioId").parent().click()
                    }
                },
                notAvailableCheckbox: {
                    click: () => {
                        cy.get("#filterNotAvailableCheckboxId").parent().click()
                    }
                },
                searchButton: {
                    click:  () => {
                        cy.get("#filterSearchButtonId").click()
                    }
                },
            },
            searchResult: {
                personCards: {
                    click: (indexOfPerson)=> {
                        cy.get(idStart("personCardId_")).eq(indexOfPerson).click()
                    }
                },
                seeProfileButton: {
                    click: ()=> {
                        cy.get(idStart("personCardSeeProfileButtonId_")).click()
                    }
                }
            }
        },
        personDetails: {
            settingsButton: {
                click: ()=> {
                    cy.get(idStart("profileSettingsId")).click()
                }
            }
        },
        singleDonorCreation: {
            phoneTextBox: {
                type: (text)=>{
                    cy.get("#newDonorPhoneTextBoxId").type(text)
                }
            },
            nameTextBox: {
                type:  (text)=> {
                    cy.get("#newDonorNameTextBoxId").type(text)
                }
            },
            seeDuplicateButton: {
                click: ()=> {
                    cy.get("#donorCreationSeeDuplicateButtonId").click()
                }
            }
        }
    },
}
