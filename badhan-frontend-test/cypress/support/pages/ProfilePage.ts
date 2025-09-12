export class ProfilePage {
  // Donations UI helpers
  openDonationDatePicker(): void {
    cy.get('[data-cy="personDetailsNewDonationTextboxId"]').click();
  }

  pickDonationDay(day: string | number): void {
    const dayStr = String(day);
    cy.get('[data-cy="personDetailsNewDonationDatePickerId"]').contains('button', dayStr).not('[disabled]').first().click();
  }

  confirmDonationDate(): void {
    cy.get('[data-cy="personDetailsNewDonationDatePickerOkButtonId"]').click();
  }

  submitNewDonation(): void {
    cy.get('[data-cy="personDetailsNewDonationOkButtonId"]').click();
  }

  expandDonationHistory(): void {
    cy.get('[data-cy="personDetailsDonationHistoryButtonId"]').click();
  }

  collapseDonationHistory(): void {
    cy.get('[data-cy="personDetailsDonationHistoryButtonId"]').click();
  }

  expandPlateletDonationHistory(): void {
    cy.get('[data-cy="personDetailsPlateletDonationHistoryButtonId"]').click();
  }

  deleteFirstDonationCard(): void {
    cy.get('[data-cy^="donationCardDeleteButtonId_"]').first().click();
  }

  confirmDeletion(): void {
    cy.get('[data-cy="confirmationBoxButtonId"]:visible').first().click();
  }

  openActiveDonorMenu(): void {
    cy.get('[data-cy="personDetailsActiveDonorButtonId"]').click();
  }

  ensureActiveDonorOn(successMessage: string): void {
    cy.get('[data-cy="personDetailsActiveDonorSwitchId"]').then(($el) => {
      const isChecked = ($el[0] as HTMLInputElement).checked;
      if (!isChecked) {
        cy.wrap($el).click({ force: true });
        cy.get('[data-cy="notificationTextId"]').should('be.visible').and('have.text', successMessage);
      }
    });
  }

  ensureActiveDonorOff(successMessage: string): void {
    cy.get('[data-cy="personDetailsActiveDonorSwitchId"]').then(($el) => {
      const isChecked = ($el[0] as HTMLInputElement).checked;
      if (isChecked) {
        cy.wrap($el).click({ force: true });
        cy.get('[data-cy="notificationTextId"]').should('be.visible').and('have.text', successMessage);
      }
    });
  }

  expandCallHistory(): void {
    cy.get('[data-cy="personDetailsCallRecordButtonId"]').click();
  }

  deleteFirstCallRecord(successMessage: string): void {
    cy.get('[data-cy^="callRecordDeleteButtonId_"]').first().click();
    cy.get('[data-cy="confirmationBoxButtonId"]:visible').first().click();
    cy.get('[data-cy="notificationTextId"]').should('be.visible').and('have.text', successMessage);
  }

  captureName(alias: string): void {
    cy.get('[data-cy="donorDetailsNameTextBoxId"]').should('be.visible').invoke('val').as(alias);
  }

  assertSettingsVisible(): void {
    cy.get('[data-cy="profileSettingsButton"]').should('be.visible');
  }

  typeName(name: string): void {
    cy.get('[data-cy="donorDetailsNameTextBoxId"]').clear().type(name).blur();
  }

  typePhone(phone: string): void {
    cy.get('[data-cy="donorDetailsPhoneTextBoxId"]').clear().type(phone).blur();
  }

  typeStudentId(studentId: string): void {
    cy.get('[data-cy="donorDetailsStudentIdTextBoxId"]').clear().type(studentId).blur();
  }

  typeEmail(email: string): void {
    cy.get('[data-cy="donorDetailsEmailTextBoxId"]').clear().type(email).blur();
  }

  selectBloodGroup(label: string): void {
    cy.get('[data-cy="donorDetailsBloodGroupDropDownId"]').click();
    cy.get(`[data-cy="donorDetailsBloodGroupDropDownId${label}"]`).click();
    cy.get('[data-cy="donorDetailsBloodGroupDropDownId"]').blur();
  }

  typeRoom(room: string): void {
    cy.get('[data-cy="donorDetailsRoomTextBoxId"]').clear().type(room);
  }

  typeAddress(address: string): void {
    cy.get('[data-cy="donorDetailsAddressTextBoxId"]').clear().type(address);
  }

  selectHall(hallLabel: string): void {
    cy.get('[data-cy="donorDetailsHallDropDownId"]').click();
    cy.get(`[data-cy="donorDetailsHallDropDownId${hallLabel}"]`).click();
    cy.get('[data-cy="donorDetailsHallDropDownId"]').blur();
  }

  togglePublicData(checked: boolean): void {
    cy.get('[data-cy="donorDetailsPublicDataCheckboxId"]').then(($el) => {
      const isChecked = ($el[0] as HTMLInputElement).checked;
      if (isChecked !== checked) {
        cy.wrap($el).click({ force: true });
      }
    });
  }

  saveDetails(): void {
    cy.get('[data-cy="donorDetailsSaveButtonId"]').click();
  }

  reloadPage(): void {
    cy.reload();
  }

  // Form readiness
  assertFormReady(): void {
    cy.get('[data-cy="donorDetailsNameTextBoxId"]').should('be.visible');
    cy.get('[data-cy="donorDetailsPhoneTextBoxId"]').should('be.visible');
    cy.get('[data-cy="donorDetailsStudentIdTextBoxId"]').should('be.visible');
    cy.get('[data-cy="donorDetailsEmailTextBoxId"]').should('be.visible');
    cy.get('[data-cy="donorDetailsBloodGroupDropDownId"]').should('exist');
    cy.get('[data-cy="donorDetailsHallDropDownId"]').should('exist');
  }

  // Individual assertions
  assertName(expected: string): void {
    cy.get('[data-cy="donorDetailsNameTextBoxId"]').should('have.value', expected);
  }

  assertPhone(expected: string): void {
    cy.get('[data-cy="donorDetailsPhoneTextBoxId"]').should('have.value', expected);
  }

  assertStudentId(expected: string): void {
    cy.get('[data-cy="donorDetailsStudentIdTextBoxId"]').should('have.value', expected);
  }

  assertEmail(expected: string): void {
    cy.get('[data-cy="donorDetailsEmailTextBoxId"]').should('have.value', expected);
  }

  assertRoom(expected: string): void {
    cy.get('[data-cy="donorDetailsRoomTextBoxId"]').should('have.value', expected);
  }

  assertAddress(expected: string): void {
    cy.get('[data-cy="donorDetailsAddressTextBoxId"]').should('have.value', expected);
  }

  assertBloodGroup(expectedLabel: string): void {
    cy.get('[data-cy="donorDetailsBloodGroupDropDownId"]').should('have.attr', 'data-selected-text', expectedLabel);
  }

  assertHall(expectedLabel: string): void {
    cy.get('[data-cy="donorDetailsHallDropDownId"]').should('have.attr', 'data-selected-text', expectedLabel);
  }

  assertPublicData(expectedChecked: boolean): void {
    cy.get('[data-cy="donorDetailsPublicDataCheckboxId"]').should(expectedChecked ? 'be.checked' : 'not.be.checked');
  }

  assertDetailsPersisted(params: {
    name: string;
    phone: string;
    studentId: string;
    email: string;
    bloodGroupLabel: string;
    hallLabel: string;
    room: string;
    address: string;
    publicData: boolean;
  }): void {
    const { name, phone, studentId, email, bloodGroupLabel, hallLabel, room, address, publicData } = params;
    // Backwards-compatible aggregation using granular checks
    this.assertFormReady();
    this.assertName(name);
    this.assertPhone(phone);
    this.assertStudentId(studentId);
    this.assertEmail(email);
    this.assertRoom(room);
    this.assertAddress(address);
    this.assertBloodGroup(bloodGroupLabel);
    this.assertHall(hallLabel);
    this.assertPublicData(publicData);
  }
}


