export class NewDonorPage {
  fillBasic(params: { name: string; phone: string; studentId: string }): void {
    const { name, phone, studentId } = params;
    cy.get('[data-cy="newDonorNameTextBoxId"]').type(name).blur();
    cy.get('[data-cy="newDonorPhoneTextBoxId"]').type(phone).blur();
    cy.get('[data-cy="newDonorStudentIdTextBoxId"]').type(studentId).blur();
  }

  selectBloodGroup(bloodGroup: string): void {
    cy.get('[data-cy="newDonorBloodGroupDropDownId"]').click();
    cy.get(`[data-cy="newDonorBloodGroupDropDownId${bloodGroup}"]`).click();
    cy.get('[data-cy="newDonorBloodGroupDropDownId"]').blur();
  }

  selectHall(hallLabel: string): void {
    cy.get('[data-cy="hall-select"]').click();
    cy.get(`[data-cy="hall-select${hallLabel}"]`).click();
    cy.get('[data-cy="hall-select"]').blur();
  }

  fillOptional(params: { room?: string; address?: string; comment?: string } = {}): void {
    const { room, address, comment } = params;
    if (room) cy.get('[data-cy="newDonorRoomNumberTextFieldId"]').type(room);
    if (address) cy.get('[data-cy="newDonorAddressTextFieldId"]').type(address);
    if (comment) cy.get('[data-cy="newDonorCommentTextFieldId"]').type(comment);
  }

  setDonationCounts(params: { wholeBloodCount?: number; plateletCount?: number } = {}): void {
    const { wholeBloodCount = 0, plateletCount = 0 } = params;
    cy.get('[data-cy="newDonorDonationCountTextFieldId"]').clear().type(String(wholeBloodCount));
    cy.get('[data-cy="newDonorPlateletDonationCountTextFieldId"]').clear().type(String(plateletCount));
  }

  submit(): void {
    cy.get('[data-cy="newDonorCreateButtonId"]').click();
  }
}


