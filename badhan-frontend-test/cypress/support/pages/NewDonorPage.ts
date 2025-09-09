export class NewDonorPage {
  fillBasic(params: { name: string; phone: string; studentId: string }): void {
    const { name, phone, studentId } = params;
    cy.get('#newDonorNameTextBoxId').type(name).blur();
    cy.get('#newDonorPhoneTextBoxId').type(phone).blur();
    cy.get('#newDonorStudentIdTextBoxId').type(studentId).blur();
  }

  selectBloodGroup(bloodGroup: string): void {
    cy.get('[data-cy="newDonorBloodGroupDropDownId"]').click();
    cy.contains('.v-list-item__title', bloodGroup).click();
    cy.get('[data-cy="newDonorBloodGroupDropDownId"]').blur();
  }

  selectHall(hallLabel: string): void {
    cy.get('[data-cy="hall-select"]').click();
    cy.contains('.v-list-item__title', hallLabel).click();
    cy.get('[data-cy="hall-select"]').blur();
  }

  fillOptional(params: { room?: string; address?: string; comment?: string } = {}): void {
    const { room, address, comment } = params;
    if (room) cy.get('#newDonorRoomNumberTextFieldId').type(room);
    if (address) cy.get('#newDonorAddressTextFieldId').type(address);
    if (comment) cy.get('#newDonorCommentTextFieldId').type(comment);
  }

  setDonationCounts(params: { wholeBloodCount?: number; plateletCount?: number } = {}): void {
    const { wholeBloodCount = 0, plateletCount = 0 } = params;
    cy.get('#newDonorDonationCountTextFieldId').clear().type(String(wholeBloodCount));
    cy.get('#newDonorPlateletDonationCountTextFieldId').clear().type(String(plateletCount));
  }

  submit(): void {
    cy.get('#newDonorCreateButtonId').click();
  }
}


