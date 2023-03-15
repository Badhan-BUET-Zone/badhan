import { idStart } from "../functions"
export default {
    logsByDateTab: {
        logsByDate: {
            getByIndex: (index)=>{
                return {
                    detailsButton: {
                        click: ()=>{
                            cy.get(idStart("dateLogDetailsButtonId_")).eq(index).click()
                        }
                    },
                    logsByPerson: {
                        getByIndex: (indexOfPerson)=>{
                            return {
                                expandButton: {
                                    click: ()=>{
                                        cy.get(idStart("personLogExpandButtonId_")).eq(indexOfPerson).click()
                                    }
                                },
                                logObjects: {
                                    getByIndex: (logObjectIndex)=>{
                                        return {
                                            clickMeButton: {
                                                click: ()=>{
                                                    cy.get(idStart("logObjectClickMeButtonId_")).eq(logObjectIndex).click()
                                                }
                                            },
                                            clickMeCloseButton: {
                                                click: ()=>{
                                                    cy.get(idStart("logObjectClickMeCloseButtonId_")).eq(logObjectIndex).click()
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                    }
                }
            }
        }
    },
    allMembersTab: {
        click: ()=>{
            cy.get("#statisticsAllVolunteersTabId").click()
        },
        membersTable: {
            exists: ()=>{
                cy.get("#statisticsAllVolunteersTableId")
            }
        }
    },
    statsTab: {
        click: ()=>{
            cy.get("#statisticsStatsTabId").click()
        },
        numberOfDonors: {
            exists: ()=>{
                cy.get("#statsNumberOfDonors")
            }
        }
    }
}