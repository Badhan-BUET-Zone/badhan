import { createDonorViaApi, enableCertificateViaApi, visitCertificateSignedOut } from '@support/helpers/certificates';

// The certificate page is the only page in the app whose intended visitor has no account: it is
// reached by pointing a phone camera at a printed QR code. Every assertion here therefore runs with
// an empty localStorage — if any of these start needing a session, the feature is broken even
// though the app would still look fine to a signed-in volunteer.

describe('Certificate page, opened without signing in', () => {
  const donor = {
    name: `Certificate Donor ${String(Date.now()).slice(-6)}`,
    studentId: '1605011',
  };

  it('shows the certificate to a visitor with no session', () => {
    createDonorViaApi(donor, 'donorId');

    cy.get('@donorId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));

      cy.get('[data-cy="certificateContent"]').should('be.visible');
      cy.get('[data-cy="certificateFrame"]').should('be.visible');

      // Nothing in the app shell should have decided this visitor needs to sign in first.
      cy.location('hash').should('contain', 'certificate');
    });
  });

  it('tells a visitor when a real donor’s certificate has not been enabled', () => {
    // A donor exists and the id is genuine — it simply has not been turned on for them. That is a
    // different thing from "no such certificate", and saying so is what stops a volunteer hunting
    // for a broken link when the fix is one switch on the profile.
    createDonorViaApi(
      { name: 'Not Enabled Donor', studentId: '1605035' },
      'notEnabledId',
      { enableCertificate: false }
    );

    cy.get('@notEnabledId').then((donorId) => {
      visitCertificateSignedOut(String(donorId));

      cy.get('[data-cy="certificateNotEnabled"]').should('be.visible');
      cy.get('[data-cy="certificateNotFound"]').should('not.exist');
      cy.get('[data-cy="certificateFrame"]').should('not.exist');

      // ...and it becomes readable the moment someone turns it on. cy.reload rather than a second
      // visit: the address is unchanged, so visiting it again is a no-op the router never sees.
      enableCertificateViaApi(String(donorId));
      cy.reload();
      cy.get('[data-cy="certificateFrame"]').should('be.visible');
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
