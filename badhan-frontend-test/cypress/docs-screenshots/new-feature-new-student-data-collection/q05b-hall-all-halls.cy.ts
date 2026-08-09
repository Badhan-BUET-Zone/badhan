import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — the SAME
// question 5, under an "All Halls" code. The step is a real question here: eight buttons, nothing
// preselected, and NEXT stays grey until the student picks one.
//
// The pair of captures is the point. Under an ordinary code the hall is shown and cannot be
// changed; under an All Halls code the student's answer is what decides whose list the submission
// lands in, and a volunteer at a desk should be able to recognise which kind of code is in use.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.

describe('docs screenshot — registration question 5 (hall, chosen by the student)', () => {
  it('captures the hall choice an All Halls code asks for', () => {
    cy.viewport(393, 700);
    walkTo('hall', '1905207', { allHalls: true });

    cy.get('[data-cy="registrationStep-hall"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-hall"]').screenshot('registration-q05b-hall-all-halls');
  });
});
