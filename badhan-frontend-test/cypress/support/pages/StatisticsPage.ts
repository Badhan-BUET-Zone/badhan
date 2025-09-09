export class StatisticsPage {
  openDonationReportTab(): void {
    cy.get('[data-cy="statisticsDonationReportTabId"]').click();
  }

  openStatsTab(): void {
    cy.get('[data-cy="statisticsStatsTabId"]').click();
  }

  openAllMembersTab(): void {
    cy.get('[data-cy="statisticsAllVolunteersTabId"]').click();
  }

  ensureLogsByDateTabExists(): void {
    cy.get('[data-cy="statisticsLogsByDateTabId"]').should('exist');
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
}


