export class CertificateEnabledDonorsPage {
  // The page fetches on mount — there is no fetch button, because the endpoint takes no
  // parameters — so arriving is the whole interaction.
  assertTableVisible(): void {
    cy.get('[data-cy="certificateEnabledDonorsTableId"]').should('be.visible');
  }

  assertDonorRowExists(name: string): void {
    cy.get('[data-cy="certificateEnabledDonorRow"]').contains('td', name).should('exist');
  }

  // Waits for the fetch to have settled before asserting absence, and accepts either outcome:
  // with nobody enabled the page renders its empty state and there is no table at all, so keying
  // this on the table alone would make the assertion unsatisfiable on a clean database.
  assertDonorRowAbsent(name: string): void {
    cy.get('[data-cy="certificateEnabledDonorsTableId"], [data-cy="certificateEnabledDonorsEmptyId"]')
      .should('be.visible');
    cy.contains('[data-cy="certificateEnabledDonorRow"] td', name).should('not.exist');
  }

  // The count doubles as the page's only summary, so it is worth asserting rather than trusting
  // the row set alone.
  assertCountAtLeast(minimum: number): void {
    cy.get('[data-cy="certificateEnabledDonorsCountId"]')
      .invoke('text')
      .should((text) => {
        const match = /(\d+)/.exec(text);
        expect(match, `count text "${text}" should carry a number`).to.not.equal(null);
        expect(Number(match![1])).to.be.at.least(minimum);
      });
  }
}
