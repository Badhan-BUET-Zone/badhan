export class CsvDonorCreationPage {
  // Attach a CSV string without touching disk. force is required because Vuetify's
  // v-file-input keeps the real <input type=file> visually hidden.
  selectFile(csv: string, fileName = 'donors.csv'): void {
    cy.get('[data-cy=csvFileInputId] input[type=file]').selectFile(
      {
        contents: Cypress.Buffer.from(csv),
        fileName,
        mimeType: 'text/csv'
      },
      { force: true }
    );
  }

  uploadAll(): void {
    cy.get('[data-cy=csvUploadAllButtonId]').click();
  }

  uploadButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy=csvUploadAllButtonId]');
  }

  assertToCreateCount(n: number): void {
    cy.get('[data-cy=csvToCreateRow]', { timeout: 30000 }).should('have.length', n);
  }

  assertNoErrorTable(): void {
    cy.get('[data-cy=csvErrorRow]').should('not.exist');
  }

  assertErrorRowCount(n: number): void {
    cy.get('[data-cy=csvErrorRow]', { timeout: 30000 }).should('have.length', n);
  }

  assertInlineError(text: string): void {
    cy.contains('[data-cy=csvErrorArea]', text).should('exist');
  }

  assertExistingCount(n: number): void {
    cy.get('[data-cy=csvExistingRow]', { timeout: 60000 }).should('have.length', n);
  }

  // After a run: Table 1 has drained and every row landed in Table 2 marked "Just created".
  assertAllCreated(n: number): void {
    cy.get('[data-cy=csvToCreateRow]', { timeout: 60000 }).should('have.length', 0);
    cy.get('[data-cy=csvExistingRow]').should('have.length', n);
    cy.get('[data-cy=csvExistingRow]').each(($row) => {
      cy.wrap($row).should('contain.text', 'Just created');
    });
  }

  assertSeeDonorButtonExists(): void {
    cy.get('[data-cy=csvSeeDonorButton]').should('exist');
  }
}
