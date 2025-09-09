export class ActiveDonorsPage {
  closeOverlays(): void {
    cy.get('body').type('{esc}');
  }

  assertAnyCardExists(): void {
    cy.get('[id^="personCardId_"]').should('exist');
  }
}


