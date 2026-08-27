// The four pages this covers were tabs of a Statistics page until they became four entries
// under Super Admin in the menu; NavigationDrawer is what opens each one now.
export class StatisticsPage {
  assertWholeBloodSectionExists(): void {
    cy.get('[data-cy="wholeBloodDonationsTitle"]').should('exist');
  }

  assertPlateletSectionExists(): void {
    cy.get('[data-cy="plateletDonationsTitle"]').should('exist');
  }

  assertAnyTableRowExists(): void {
    cy.get('[data-cy="wholeBloodRow"], [data-cy="plateletRow"]').its('length').should('be.gte', 1);
  }

  getDonorsCountText(): Cypress.Chainable<string> {
    return cy.get('[data-cy="statsNumberOfDonors"]').should('be.visible').invoke('text');
  }

  getVolunteersCountText(): Cypress.Chainable<string> {
    return cy.get('[data-cy="statsNumberOfVolunteers"]').should('be.visible').invoke('text');
  }
 
  assertAllDonorsTableVisible(): void {
    cy.get('[data-cy="statisticsAllDonorsTableId"]').should('be.visible');
  }

  assertAllDonorsHasRows(): void {
    cy.get('[data-cy="statisticsAllDonorsTableId"] [data-cy="donorRow"]').its('length').should('be.gte', 1);
  }

  assertAllDonorsDesignationColumn(): void {
    cy.get('[data-cy="statisticsAllDonorsTableId"] [data-cy="donorRowDesignation"]')
      .should('have.length.gte', 1)
      .each(($cell) => {
        expect(['Donor', 'Volunteer', 'Hall Admin', 'Super Admin']).to.include($cell.text().trim());
      });
  }

  assertAllDonorsNotPaginated(): void {
    cy.get('[data-cy="statisticsAllDonorsTableId"] .v-data-footer').should('not.exist');
  }

  assertAnyDateLogDetailExists(): void {
    cy.get('[data-cy="dateLogDetailsButton"]').its('length').should('be.gte', 1);
  }

  assertTotalDonationsByHallChartExists(): void {
    cy.get('[data-cy="totalDonationsByHallTitle"]').should('exist');
    cy.get('[data-cy="hall-donation-chart"] canvas').should('exist');
  }

  assertTotalDonationsByBloodGroupChartExists(): void {
    cy.get('[data-cy="totalDonationsByBloodGroupTitle"]').should('exist');
    cy.get('[data-cy="blood-group-donation-chart"] canvas').should('exist');
  }

  assertHallSelectorExists(): void {
    cy.get('[data-cy="report-hall-select"]').should('exist');
  }

  assertHallSelectorValue(hallLabel: string): void {
    cy.get('[data-cy="report-hall-select"]').should('have.attr', 'data-selected-text', hallLabel);
  }

  // The last row of the whole blood table is the 'Total' row; its 'Total' column cell
  // is the one cell guaranteed to be non-zero whenever the report has any donation
  openWholeBloodGrandTotalPopover(): void {
    cy.get('[data-cy="wholeBloodRow"]').last().find('[data-cy="wholeBloodTotalCell"]').click();
  }

  assertPopoverDonorsListed(): void {
    cy.get('[data-cy="donationCountCellList"]').should('be.visible');
    cy.get('[data-cy="donationCountCellDonor"]').its('length').should('be.gte', 1);
  }

  clickFirstPopoverDonor(): void {
    cy.get('[data-cy="donationCountCellDonor"]').first().click();
  }

  selectReportHall(hallLabel: string): void {
    cy.get('[data-cy="report-hall-select"]').click();
    cy.get(`[data-cy="report-hall-select${hallLabel}"]`).click();
    cy.get('[data-cy="report-hall-select"]').blur();
  }
}


