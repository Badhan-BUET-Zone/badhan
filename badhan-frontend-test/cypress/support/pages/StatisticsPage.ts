export class StatisticsPage {
  openDonationReportTab(): void {
    cy.get('#statisticsDonationReportTabId').click();
  }

  openStatsTab(): void {
    cy.get('#statisticsStatsTabId').click();
  }

  openAllMembersTab(): void {
    cy.get('#statisticsAllVolunteersTabId').click();
  }

  ensureLogsByDateTabExists(): void {
    cy.get('#statisticsLogsByDateTabId').should('exist');
  }

  assertWholeBloodSectionExists(): void {
    cy.contains('div', 'Whole Blood Donations', { matchCase: false }).should('exist');
  }

  assertPlateletSectionExists(): void {
    cy.contains('div', 'Platelet Donations', { matchCase: false }).should('exist');
  }

  assertAnyTableRowExists(): void {
    cy.get('table tbody tr').its('length').should('be.gte', 1);
  }

  getDonorsCountText(): Cypress.Chainable<string> {
    return cy.get('#statsNumberOfDonors').should('be.visible').invoke('text');
  }

  getVolunteersCountText(): Cypress.Chainable<string> {
    return cy.contains('p', 'Number of volunteers').should('be.visible').invoke('text');
  }
 
  assertAllMembersTableVisible(): void {
    cy.get('#statisticsAllVolunteersTableId').should('be.visible');
  }

  assertAllMembersHasRows(): void {
    cy.get('#statisticsAllVolunteersTableId .v-data-table__wrapper tbody tr').its('length').should('be.gte', 1);
  }

  assertAnyDateLogDetailExists(): void {
    cy.get('[id^="dateLogDetailsButtonId_"]').its('length').should('be.gte', 1);
  }
}


