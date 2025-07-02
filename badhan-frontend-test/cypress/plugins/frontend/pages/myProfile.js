import personDetails from "./personDetails"
import { idStart } from "../functions"
export default {
    personDetails,
    settings: {
        listOfLoginsButton: {
            click:()=>{
                cy.get("#getListOfLoginButtonId").click()
            }
        },
        listOfLogins: {
            getByIndex: (index)=>{
                return {
                    deleteButton: {
                        click: ()=>{
                            cy.get(idStart("loginDeleteButtonId")).eq(index).click()
                        }
                    }
                }
            },
            deleteAllLoginsButton: {
                click: ()=>{
                    cy.get('#logoutFromAllDevices').click()
                }
            }
        }
    }
}