export default {
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