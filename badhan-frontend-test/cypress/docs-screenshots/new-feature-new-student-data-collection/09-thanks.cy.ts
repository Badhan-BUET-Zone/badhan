import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.

describe('docs screenshot — what a student sees after submitting', () => {
  it('captures the thank-you, which says this is not an account', () => {
    cy.viewport(393, 500);
    walkTo('review', '1905222');

    cy.get('[data-cy="registrationSubmitButton"]').click();
    cy.get('[data-cy="registrationThanks"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationThanks"]').screenshot('registration-thanks');
  });
});
