export class ActiveDonorsPage {
  closeOverlays(): void {
    cy.get('body').type('{esc}');
  }

  // The page opens on your own bookmarks. Untick to get everybody's, which is what a spec wants
  // whenever the row it seeded was marked by a different member.
  showBookmarksFromEveryone(): void {
    // Vuetify puts stray attributes on the checkbox INPUT itself, not on the wrapper, and that
    // input is visually hidden behind the ripple — hence the forced click.
    cy.get('[data-cy="activeDonorsMarkedByMeCheckbox"]').click({ force: true });
  }

  assertAnyCardExists(): void {
    cy.get('[data-cy="person-card"]').should('exist');
  }

  expandFirstCard(): void {
    cy.get('[data-cy="person-card"]').first().click();
  }

  directCallOnFirstCard(): void {
    // Assumes first card is expanded
    cy.contains('button', 'Direct call').first().click();
  }

  seeProfileOnFirstCard(): void {
    // Assumes first card is expanded
    cy.contains('button', 'See profile').first().click();
  }
}


