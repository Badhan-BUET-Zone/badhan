import { BLOOD_GROUPS, HALLS, RADIO_VALUES } from '../constants';

export class HomePage {
  // Search functionality
  triggerSearch(): void {
    cy.get('[data-cy="filterSearchButtonId"]').click();
  }

  // Donor cards
  donorCards(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="person-card"]');
  }

  assertAnyDonorCardExists(): void {
    this.donorCards().its('length').should('be.greaterThan', 0);
  }

  assertDonorCardWithNameExists(name: string): void {
    cy.get('[data-cy="person-card"]').should('contain.text', name);
  }

  // First card interactions (use data-cy only)
  expandFirstCard(): void {
    this.donorCards().first().click();
  }

  clickDirectCallOnFirstCard(): void {
    cy.get('[data-cy^="personCardCallButtonId_"]').first().click();
  }

  openDatePickerOnFirstCard(): void {
    cy.get('[data-cy^="personCardDatePickerId_"]').first().click();
  }

  pickDonationDayOnFirstCard(day: string | number): void {
    const dayStr = String(day);
    // Target only day buttons in the calendar grid, not year/month buttons
    cy.get('[data-cy^="personCardDatePickerCalenderId_"]')
      .first()
      .find('.v-date-picker-table button')
      .contains(dayStr)
      .not('[disabled]')
      .first()
      .click();
  }

  confirmDateOnFirstCard(): void {
    cy.get('[data-cy^="personCardDatePickerOkButtonId_"]').first().click();
  }

  clickDonationDoneOnFirstCard(): void {
    cy.get('[data-cy^="personCardDonationButtonId_"]').first().click();
  }

  selectPlateletOnFirstCard(): void {
    cy.get('[data-cy^="personCardDonationRadioPlateletId_"]').first().scrollIntoView().click({ force: true });
  }

  clickSeeProfileOnFirstCard(): void {
    // Ensure the first card is expanded, then click See profile within that card
    this.expandFirstCard();
    cy.get('[data-cy="person-card"]').first().within(() => {
      cy.get('[data-cy^="personCardSeeProfileButtonId_"]').should('exist').click();
    });
  }

  // Filter input methods
  setNameFilter(name: string): void {
    cy.get('[data-cy="filterNameTextboxId"]').clear().type(name);
  }

  setBloodGroupFilter(bloodGroup: string): void {
    cy.get('[data-cy="bloodgroup-select"]').click();
    cy.contains(bloodGroup).click();
  }

  setBatchFilter(batch: string): void {
    cy.get('[data-cy="filterBatchTextboxId"]').clear().type(batch);
  }

  setAddressFilter(address: string): void {
    cy.get('[data-cy="filterAddressTextboxId"]').clear().type(address);
  }

  setPublicDataRadio(): void {
    cy.get('[data-cy="filterPublicDataRadioId"]').click({ force: true });
  }

  setSpecifyHallRadio(): void {
    cy.get('[data-cy="filterSpecifyHallRadioId"]').click({ force: true });
  }

  setHallFilter(hall: string): void {
    cy.get('[data-cy="hall-select"]').click();
    cy.contains(hall).click();
  }

  setAvailableCheckbox(checked: boolean = true): void {
    cy.get('[data-cy="available-checkbox"]').within(() => {
      cy.get('input[type="checkbox"]').then(($checkbox) => {
        if (checked && !$checkbox.is(':checked')) {
          cy.wrap($checkbox).click();
        } else if (!checked && $checkbox.is(':checked')) {
          cy.wrap($checkbox).click();
        }
      });
    });
  }

  setNotAvailableCheckbox(checked: boolean = true): void {
    cy.get('[data-cy="not-available-checkbox"]').within(() => {
      cy.get('input[type="checkbox"]').then(($checkbox) => {
        if (checked && !$checkbox.is(':checked')) {
          cy.wrap($checkbox).click();
        } else if (!checked && $checkbox.is(':checked')) {
          cy.wrap($checkbox).click();
        }
      });
    });
  }

  // Helper methods for common filter operations
  clearAllFilters(): void {
    cy.get('button').contains('Reset').click();
  }


  // Validation methods
  assertBatchError(message: string): void {
    cy.get('[data-cy="filterBatchTextboxId"]').parent().should('contain', message);
  }

  assertHallError(message: string): void {
    cy.get('[data-cy="hall-select"]').parent().should('contain', message);
  }

  assertAvailabilityError(message: string): void {
    cy.get('[data-cy="available-checkbox"]').parent().should('contain', message);
  }

  // Constants getters
  getBloodGroups(): readonly string[] {
    return BLOOD_GROUPS;
  }

  getHalls(): readonly string[] {
    return HALLS;
  }

  getRadioValues(): typeof RADIO_VALUES {
    return RADIO_VALUES;
  }
}


