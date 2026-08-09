import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 3
// of the registration sequence. Eleven local digits; the client adds the country code, so a student never types one.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees.

describe('docs screenshot — registration question 3 (phone)', () => {
  it('captures the phone step on its own', () => {
    cy.viewport(393, 700);
    walkTo('phone', '1905203');

    cy.get('[data-cy="registrationStep-phone"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-phone"]').screenshot('registration-q03-phone');
  });
});
