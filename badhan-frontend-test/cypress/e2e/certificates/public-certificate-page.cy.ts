import { createDonorViaApi, visitCertificateSignedOut } from '@support/helpers/certificates';

// The certificate page is the only page in the app whose intended visitor has no account: it is
// reached by pointing a phone camera at a printed QR code. Every assertion here therefore runs with
// an empty localStorage — if any of these start needing a session, the feature is broken even
// though the app would still look fine to a signed-in volunteer.

describe('Certificate page, opened without signing in', () => {
  const donor = {
    name: `Certificate Donor ${String(Date.now()).slice(-6)}`,
    studentId: '1605011',
  };

  it('shows the donor name and student ID to a visitor with no session', () => {
    createDonorViaApi(donor, 'donorId');

    cy.get('@donorId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));

      cy.get('[data-cy="certificateName"]').should('contain.text', donor.name);
      cy.get('[data-cy="certificateStudentId"]').should('contain.text', donor.studentId);

      // Nothing in the app shell should have decided this visitor needs to sign in first.
      cy.location('hash').should('contain', 'certificate');
    });
  });

  it('answers an unknown id with the not-found message', () => {
    visitCertificateSignedOut('000000000000000000000000');
    cy.get('[data-cy="certificateNotFound"]').should('be.visible');
  });

  it('answers a malformed id with the same not-found message', () => {
    visitCertificateSignedOut('abc');
    cy.get('[data-cy="certificateNotFound"]').should('be.visible');
  });

  it('answers a link carrying no id at all with the same not-found message', () => {
    cy.clearLocalStorage();
    cy.visit('/#/certificate');
    cy.get('[data-cy="certificateNotFound"]').should('be.visible');
  });
});
