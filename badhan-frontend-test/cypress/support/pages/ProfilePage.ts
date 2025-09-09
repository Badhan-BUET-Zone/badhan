export class ProfilePage {
  openActiveDonorMenu(): void {
    cy.get('#personDetailsActiveDonorButtonId').click();
  }

  ensureActiveDonorOn(successMessage: string): void {
    cy.get('#personDetailsActiveDonorSwitchId').then(($el) => {
      const isChecked = ($el[0] as HTMLInputElement).checked;
      if (!isChecked) {
        cy.wrap($el).click({ force: true });
        cy.get('#notificationTextId').should('be.visible').and('have.text', successMessage);
      }
    });
  }

  captureName(alias: string): void {
    cy.get('#donorDetailsNameTextBoxId').should('be.visible').invoke('val').as(alias);
  }

  assertSettingsVisible(): void {
    cy.get('#profileSettingsId').should('be.visible');
  }
}


