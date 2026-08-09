import { walkTo } from './registrationWalk';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.
//
// The two date questions are the only ones not answered by typing or by tapping a choice, so the
// opened calendar is worth its own capture. It is a viewport shot rather than an element one: the
// picker renders in an overlay attached to the page, not inside the step.

describe('docs screenshot — the date picker on a donation-date question', () => {
  it('captures the calendar a student picks a date from', () => {
    cy.viewport(393, 700);
    walkTo('lastDonation', '1905220');

    cy.get('[data-cy="registrationStep-lastDonation"]').should('be.visible');
    cy.get('[data-cy="registrationInput-lastDonation"]').click();
    cy.get('[data-cy="registrationPicker-lastDonation"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('registration-q07b-date-picker', { capture: 'viewport' });
  });
});
