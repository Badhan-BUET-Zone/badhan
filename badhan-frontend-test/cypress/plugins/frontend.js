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
        },
        reload: ()=>{
            cy.reload()
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
    },
    pages: {
        members: {
            volunteers: {
                getSample: {
                    check:()=>{
                        cy.get(idStart("volunteerId_"))
                    }
                },
                getByIndex: (index)=>{
                    return {
                        name: {
                            then: (callBack)=>{
                                cy.get(idStart('volunteerNameId_')).eq(index).invoke('text').then(callBack)
                            }
                        },
                        batch: {
                            then: (callBack)=>{
                                cy.get(idStart('volunteerBatchId_')).eq(index).invoke('text').then(callBack)
                            }
                        }
                    }
                },
                contains: (name)=>{
                    cy.contains(name)
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
                batchTextBox: {
                    type: (text)=>{
                        cy.get('#filterBatchTextboxId').type(text)
                    }
                },
                specifyHallRadioButton: {
                    click: ()=>{
                        cy.get("#filterSpecifyHallRadioId").parent().click()
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
            details: {
                nameTextBox: {
                    type: (text)=>{
                        cy.get("#donorDetailsNameTextBoxId").clear().type(text)
                    },
                    contains: (text)=>{
                        cy.get("#donorDetailsNameTextBoxId").should("have.value",text)
                    }
                },
                phoneTextBox: {
                    type: (text)=>{
                        cy.get("#donorDetailsPhoneTextBoxId").clear().type(text)
                    },
                    contains: (text)=>{
                        cy.get("#donorDetailsPhoneTextBoxId").should("have.value",text)
                    }
                },
                emailTextBox: {
                    type: (email)=>{
                        cy.get("#donorDetailsEmailTextBoxId").clear().type(email)
                    },
                    contains: (email)=>{
                        cy.get("#donorDetailsEmailTextBoxId").should("have.value",email)
                    }
                },
                bloodGroupSelection: {
                    click: ()=>{
                        cy.get("#donorDetailsBloodGroupDropDownId").click({force:true})
                    },
                    getSelectionMenuByBloodGroup: (bloodGroupText)=>{
                        return {
                            click: ()=>{
                                cy.contains(bloodGroupText).click();
                            }
                        }
                    },
                    contains: (text)=>{
                        cy.get("#donorDetailsBloodGroupSpanId").should('contain.text', text)
                    }
                },
                hallSelection: {
                    click: ()=>{
                        cy.get("#donorDetailsHallDropDownId").click({force:true})
                    },
                    getSelectionMenuByHallName: (hallText)=>{
                        return {
                            click: ()=>{
                                cy.contains(hallText).click()
                            }
                        }
                    },
                    contains: (hallText)=>{
                        cy.get("#donorDetailsHallDropDownSpan").should('contain.text',hallText)
                    }
                },
                addressTextBox: {
                    type: (address)=>{
                        cy.get("#donorDetailsAddressTextBoxId").clear().type(address)
                    },
                    contains: (text)=>{
                        cy.get("#donorDetailsAddressTextBoxId").should("have.value",text)
                    }
                },
                publicDataCheckBox: {
                    click: ()=>{
                        cy.get("#donorDetailsPublicDataCheckboxId").check({force: true})
                    },
                    unClick: ()=>{
                        cy.get("#donorDetailsPublicDataCheckboxId").uncheck({force: true})
                    },
                    contains: (isMarked)=>{
                        cy.get("#donorDetailsPublicDataCheckboxId").should(isMarked?"be.checked":"not.be.checked")
                    }
                },
                studentIdTextBox: {
                    type: (studentId)=>{
                        cy.get("#donorDetailsStudentIdTextBoxId").clear().type(studentId)
                    },
                    contains: (studentId)=>{
                        cy.get("#donorDetailsStudentIdTextBoxId").should("have.value",studentId)
                    }
                },
                roomTextBox: {
                    type: (comment)=>{
                        cy.get("#donorDetailsRoomTextBoxId").clear().type(comment)
                    },
                    contains: (text)=>{
                        cy.get("#donorDetailsRoomTextBoxId").should("have.value",text)
                    }
                },
                saveButton: {
                    click: ()=>{
                        cy.get("#donorDetailsSaveButtonId").click()
                    }
                },
                commentTextBox: {
                    type: (text)=>{
                        cy.get("#donorDetailsCommentTextBoxId").clear().type(text)
                    },
                    contains: (text)=>{
                        cy.get("#donorDetailsCommentTextBoxId").should('have.value',text)
                    }
                },
                saveCommentButton: {
                    click: ()=>{
                        cy.get("#donorDetailsCommentSaveButtonId").click()
                    }
                }
            },
            pageTitle,
            settings: {
                expansionButton: {
                    click: ()=>{
                        cy.get(idStart("profileSettingsId")).click()
                    }
                },
                expansion: {
                    deleteButton: {
                        click: ()=>{
                            cy.get("#personDetailsDeleteButtonId").click()
                        }
                    },
                    promoteToVolunteerButton: {
                        click: ()=>{
                            cy.get("#promoteToVolunteerButtonId").click() 
                        }
                    },
                    promoteToHallAdminButton: {
                        click: ()=>{
                            cy.get("#promoteToHallAdminButtonId").click()
                        }
                    },
                    demoteToDonorButton: {
                        click: ()=>{
                            cy.get("#demoteToDonorButtonId").click()
                        }
                    }
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
            studentIdTextBox: {
                type: (text)=>{
                    cy.get("#newDonorStudentIdTextBoxId").type(text)
                }
            },
            bloodGroupSelection: {
                click: ()=>{
                    cy.get("#newDonorBloodGroupDropDownId").click({force:true});
                },
                getSelectionMenuByBloodGroup: (bloodGroupText)=>{
                    return {
                        click: ()=>{
                            cy.contains(bloodGroupText).click();
                        }
                    }
                }
            },
            roomNumberTextBox: {
                type: (text)=> {
                    cy.get("#newDonorRoomNumberTextFieldId").type(text)
                }
            },
            addressTextBox: {
                type: (text)=>{
                    cy.get("#newDonorAddressTextFieldId").type(text)
                }
            },
            commentTextBox: {
                type: (text)=>{
                    cy.get("#newDonorCommentTextFieldId").type(text)
                }
            },
            donationCountTextBox: {
                type: (value)=>{
                    cy.get("#newDonorDonationCountTextFieldId").clear().type(value)
                }
            },
            publicDataCheckBox: {
                click: ()=>{
                    cy.get("#newDonorPublicDataCheckboxId").parent().click()
                }
            },
            donationDateField:{
                click:()=>{
                    cy.get("#newDonorLastDonationTextFieldId").click()
                }
            },
            donationDatePicker:{
                sampleDate: {
                    click:()=>{
                        cy.contains("28").click()
                    }
                },
                okButton: {
                    click: ()=>{
                        cy.get('#newDonorLastDonationOkButtonId').click()
                    }
                }
            },
            seeDuplicateButton: {
                click: ()=> {
                    cy.get("#donorCreationSeeDuplicateButtonId").click()
                }
            },
            donorCreationButton: {
                click: ()=>{
                    cy.get('#newDonorCreateButtonId').click()
                }
            }
        }
    },
}
