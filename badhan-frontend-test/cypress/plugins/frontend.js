import env from "./env";

export const idStart = (elementId) => {
    return `[id^="${elementId}"]`
}

const pageTitle= {
    backButton: {
        click: ()=>{
            cy.get("#pageTitleBackButtonId").click()
        }
    }
}

export const ui = {
    control: {
        scroll: {
            top: ()=>{
                cy.scrollTo('top')
            }
        },
        wait: (milliseconds)=> {
            cy.wait(milliseconds)
        },
        start: ()=> {
            cy.visit(env.FRONTEND_URL)
        }
    },
    components:{
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
    },
    pages: {
        members: {
            volunteers: {
                getSample: {
                    check:()=>{
                        cy.get(idStart("volunteerId_"))
                    }
                }
            },
            hallAdmins: {
                getSample: {
                    check:()=>{
                        cy.get(idStart("hallAdminId_"))
                    }
                }
            },
            superAdmins: {
                getSample: {
                    check:()=>{
                        cy.get(idStart("superAdminId_"))
                    }
                }
            }
        },
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
                    getByDonorId: (donorId)=>{
                        return {
                            click: ()=>{
                                cy.get("#personCardId_"+donorId).click()
                            },
                            expansion: {
                                callCountText: {
                                    contains: (text)=>{
                                        cy.get('#callCountId_'+donorId).should('have.text', text)
                                    }
                                },
                                callButton: {
                                    click: ()=>{
                                        cy.get("#personCardCallButtonId_"+donorId).click()
                                    }
                                },
                                seeProfileButton: {
                                    click: ()=>{
                                        cy.get("#personCardSeeProfileButtonId_"+donorId).click()
                                    }
                                }
                            }
                        }
                    },
                    getByIndex: (indexOfPerson)=>{
                        return {
                            click: ()=>{
                                cy.get(idStart("personCardId_")).eq(indexOfPerson).click()
                            },
                            seeProfileButton: {
                                click: ()=>{
                                    cy.get(idStart("personCardSeeProfileButtonId_")).eq(indexOfPerson).click()
                                }
                            },
                            donationDateField: {
                                click: ()=>{
                                    cy.get(idStart("personCardDatePickerId_")).eq(indexOfPerson).click()
                                }
                            },
                            donationDatePicker:{
                                sampleDate: {
                                    click: ()=>{
                                        cy.get(idStart("personCardDatePickerCalenderId_")).eq(indexOfPerson).contains("28").click()
                                    }
                                },
                                okButton: {
                                    click: ()=>{
                                        cy.get(idStart('personCardDatePickerOkButtonId_')).eq(indexOfPerson).click()
                                    }
                                }
                            },
                            donateButton: {
                                click: ()=>{
                                    cy.get(idStart('personCardDonationButtonId_')).eq(indexOfPerson).click()
                                }
                            }
                        }
                    },
                },
            }
        },
        personDetails: {
            pageTitle,
            settingsButton: {
                click: ()=> {
                    cy.get(idStart("profileSettingsId")).click()
                }
            },
            activeDonorButton: {
                click: ()=>{
                    cy.get("#personDetailsActiveDonorButtonId").click()
                },
                activeDonorSwitch: {
                    click: ()=>{
                        cy.get("#personDetailsActiveDonorSwitchId").click({force:true})
                    }
                }
            },
            donationDateField: {
                click: ()=>{
                    cy.get("#personDetailsNewDonationTextboxId").click()
                }
            },
            donationDatePicker: {
                sampleDate: {
                    click: ()=>{
                        cy.get("#personDetailsNewDonationDatePickerId").contains("28").click()
                    }
                },
                okButton: {
                    click: ()=>{
                        cy.get("#personDetailsNewDonationDatePickerOkButtonId").click()
                    }
                }
            },
            donateButton: {
                click: ()=>{
                    cy.get("#personDetailsNewDonationOkButtonId").click()
                }
            },
            donationHistory: {
                expansionButton: {
                    click: ()=>{
                        cy.get("#personDetailsDonationHistoryButtonId").click()
                    }
                },
                getByIndex: (index)=>{
                    return {
                        deleteButton: {
                            click: ()=>{
                                cy.get(idStart("donationCardDeleteButtonId_")).eq(index).click()
                            }
                        }
                    }
                }
            },
            callRecords: {
                getByIndex: (index)=>{
                    return {
                        deleteButton: {
                            click: ()=>{
                                cy.get(idStart("callRecordDeleteButtonId_")).eq(index).click()
                            }
                        }
                    }
                },
                expansionButton: {
                    click: ()=>{
                        cy.get("#personDetailsCallRecordButtonId").click()
                    }
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
