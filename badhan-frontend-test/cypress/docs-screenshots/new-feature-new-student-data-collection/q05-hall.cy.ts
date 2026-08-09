import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md — question 5
// of the registration sequence, under an ordinary code made for one named hall: the hall is SHOWN,
// greyed out, with a line underneath saying where the submission is going.
//
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts. The step is captured as it
// ARRIVES, before it is answered, which is what a student actually sees — except that this one
// arrives already answered, which is the whole point of the capture.

describe('docs screenshot — registration question 5 (hall, fixed by the code)', () => {
  it('captures the disabled hall field and its explanation', () => {
    cy.viewport(393, 700);
    walkTo('hall', '1905206');

    cy.get('[data-cy="registrationStep-hall"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationStep-hall"]').screenshot('registration-q05-hall');
  });
});
