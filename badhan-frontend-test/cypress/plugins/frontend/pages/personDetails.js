import { idStart } from "../functions"
import { pageTitle } from "../components"
export default {
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
    publicContacts: {
        publicContactsSelection: {
            click: ()=>{
                cy.get("#personDetailsPublicContactSelectId").click({force:true})
            },
            getSelectionMenuByBloodGroup: (bloodGroupText)=>{
                return {
                    click: ()=>{
                        cy.contains(bloodGroupText).click()
                    }
                }
            },
        },
        saveButton:{
            click: ()=>{
                cy.get("#profileDetailsPublicContactButtonId").click()
            }
        },
        publicContactBloodGroups: {
            getByIndex: (index)=>{
                return {
                    click:()=>{
                        cy.get(idStart("publicContactButtonId_")).eq(index).click()
                    }
                }
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
            newPasswordTextBox: {
                type: (password)=>{
                    cy.get("#newPasswordFieldId").type(password)
                }
            },
            confirmPasswordTextBox: {
                type: (password)=>{
                    cy.get("#confirmPasswordFieldId").type(password)
                }
            },
            changePasswordButton: {
                click: ()=>{
                    cy.get("#passwordChangeConfirmedId").click()
                }
            },
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
}