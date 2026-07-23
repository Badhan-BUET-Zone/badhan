export class StatisticsPage {
  // Tabs live in a scrollable strip (v-tabs show-arrows); a tab may be scrolled
  // off-view behind an arrow, so force the click to navigate regardless.
  openDonationReportTab(): void {
    cy.get('[data-cy="statisticsDonationReportTabId"]').click({ force: true });
  }

  openAllMembersTab(): void {
    cy.get('[data-cy="statisticsAllVolunteersTabId"]').click({ force: true });
  }

  ensureLogsByDateTabExists(): void {
    cy.get('[data-cy="statisticsLogsByDateTabId"]').should('exist');
  }

  openLogsByDateTab(): void {
    cy.get('[data-cy="statisticsLogsByDateTabId"]').click({ force: true });
  }

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
 
  assertAllMembersTableVisible(): void {
    cy.get('[data-cy="statisticsAllVolunteersTableId"]').should('be.visible');
  }

  assertAllMembersHasRows(): void {
    cy.get('[data-cy="statisticsAllVolunteersTableId"] [data-cy="volunteerRow"]').its('length').should('be.gte', 1);
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

  selectReportHall(hallLabel: string): void {
    cy.get('[data-cy="report-hall-select"]').click();
    cy.get(`[data-cy="report-hall-select${hallLabel}"]`).click();
    cy.get('[data-cy="report-hall-select"]').blur();
  }
}


