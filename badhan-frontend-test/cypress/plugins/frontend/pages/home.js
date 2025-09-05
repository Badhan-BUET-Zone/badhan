import { ui } from ".."
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
        hallSelect: (hall)=>{
            return {
                click: ()=>{
                    cy.get('[data-cy=hall-select]').click();
                    cy.get(`[data-cy=hall-option-${CSS.escape(hall)}]`).click();
                    cy.get('[data-cy=hall-select] input').should('have.value', hall); // or value
                }
            }
        },
        addressTextBox: {
            type: (text)=>{
                cy.get("#filterAddressTextboxId").type(text)
            }
        },
        publicDataRadioButton: {
            click: ()=>{
                cy.get("#filterPublicDataRadioId").parent().click()
            }
        },
        notAvailableCheckbox: {
            check: ()=>{
                cy.get('[data-cy=not-available-checkbox]')
                .find('input[type="checkbox"]')  // now it exists
                .check({ force: true })
                .should('be.checked');
            },
            uncheck: ()=>{
                cy.get('[data-cy=not-available-checkbox]')
                .find('input[type="checkbox"]')  // now it exists
                .uncheck({ force: true })
                .should('not.be.checked');
            }
        },
        availableCheckBox: {
            check: () =>{
                cy.get('[data-cy=available-checkbox]')
                .find('input[type="checkbox"]')  // now it exists
                .check({ force: true })
                .should('be.checked');
            },
            uncheck: () =>{
                cy.get('[data-cy=available-checkbox]')
                .find('input[type="checkbox"]')  // now it exists
                .uncheck({ force: true })
                .should('not.be.checked');
            }
        },
        searchButton: {
            click:  () => {
                cy.get("#filterSearchButtonId").click()
            }
        },
        bloodGroupSelect: (bloodGroup)=>{
            return {
                click: ()=>{
                    cy.get('[data-cy=bloodgroup-select]').click();
                    cy.get(`[data-cy=bloodgroup-option-${CSS.escape(bloodGroup)}]`).click();
                }
            }

        }
    },
    searchResult: {
        personCards: {
            isDonorPresent: (name)=>{
                cy.contains('[data-cy=search-person-name]', name).should('be.visible');
            },
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
                                cy.get(idStart("personCardDatePickerCalenderId_")).eq(indexOfPerson).contains("1").click()
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
        olderBatchResultsButton: {
            click: ()=>{
                cy.get("#olderBatchResultsButton").click()
            }
        }
    },
    isCurrentPage: ()=>{
        cy.url().should('eq', 'http://localhost:8080/#/home');
    }
}
    