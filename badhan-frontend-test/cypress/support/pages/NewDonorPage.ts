export class NewDonorPage {
  fillBasic(params: { name: string; phone: string; studentId: string; fatherName?: string; motherName?: string }): void {
    const { name, phone, studentId, fatherName = `${name} Father`, motherName = `${name} Mother` } = params;
    cy.get('[data-cy="newDonorNameTextBoxId"]').type(name).blur();
    cy.get('[data-cy="newDonorFatherNameTextBoxId"]').type(fatherName).blur();
    cy.get('[data-cy="newDonorMotherNameTextBoxId"]').type(motherName).blur();
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

  setPublicData(checked: boolean = true): void {
    cy.get('[data-cy="newDonorPublicDataCheckboxId"]').then(($el) => {
      const isChecked = ($el[0] as HTMLInputElement).checked;
      if (isChecked !== checked) {
        cy.wrap($el).click({ force: true });
      }
    });
  }

  setDonationCounts(params: { wholeBloodCount?: number; plateletCount?: number } = {}): void {
    const { wholeBloodCount = 0, plateletCount = 0 } = params;
    cy.get('[data-cy="newDonorDonationCountTextFieldId"]').clear().type(String(wholeBloodCount));
    cy.get('[data-cy="newDonorPlateletDonationCountTextFieldId"]').clear().type(String(plateletCount));
  }

  setLastDonationDate(isoDate: string): void {
    cy.get('[data-cy="newDonorLastDonationTextFieldId"]').click();
    cy.get('[data-cy="newDonorLastDonationOkButtonId"]').should('be.visible');
    // force:true: the value is set programmatically, so the input event must fire even
    // when the picker overlay's own buttons momentarily cover the readonly field
    // (source of a flaky "element is being covered" error).
    cy.get('[data-cy="newDonorLastDonationTextFieldId"]').invoke('val', isoDate).trigger('input', { force: true });
    cy.get('[data-cy="newDonorLastDonationOkButtonId"]').click();
  }

  setLastPlateletDonationDate(isoDate: string): void {
    cy.get('[data-cy="newDonorLastPlateletDonationTextFieldId"]').click();
    cy.get('[data-cy="newDonorLastPlateletDonationOkButtonId"]').should('be.visible');
    cy.get('[data-cy="newDonorLastPlateletDonationTextFieldId"]').invoke('val', isoDate).trigger('input', { force: true });
    cy.get('[data-cy="newDonorLastPlateletDonationOkButtonId"]').click();
  }

  submit(): void {
    cy.get('[data-cy="newDonorCreateButtonId"]').click();
  }
}


