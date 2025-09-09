export class ProfilePage {
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

  captureName(alias: string): void {
    cy.get('[data-cy="donorDetailsNameTextBoxId"]').should('be.visible').invoke('val').as(alias);
  }

  assertSettingsVisible(): void {
    cy.get('[data-cy="profileSettingsButton"]').should('be.visible');
  }
}


