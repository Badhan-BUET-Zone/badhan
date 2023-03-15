import { idStart } from "../functions"
export default {
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
}
    