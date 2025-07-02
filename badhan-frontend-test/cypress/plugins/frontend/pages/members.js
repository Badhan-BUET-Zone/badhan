import { idStart } from "../functions"
export default {
    volunteers: {
        getSample: {
            exists:()=>{
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
            exists:()=>{
                cy.get(idStart("hallAdminId_"))
            }
        }
    },
    superAdmins: {
        getSample: {
            exists:()=>{
                cy.get(idStart("superAdminId_"))
            }
        }
    }
}