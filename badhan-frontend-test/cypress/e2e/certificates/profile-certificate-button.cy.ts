import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { ProfilePage } from '@pages/ProfilePage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { MESSAGES } from '@support/constants';
import {
  createDonorViaApi,
  createMemberViaApi,
  giveMemberPassword,
  superAdminToken,
  toLocalPhone,
  DESIGNATION,
  HALL_SUHRAWARDY,
  CreatedMember,
} from '@support/helpers/certificates';

// The one part of this feature an existing user ever sees: a Certificate button on the donor
// profile, next to Password Recovery Link.

describe('Certificate button on the donor profile', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const profile = new ProfilePage();

  it('opens this donor’s certificate in a new tab', () => {
    const donor = { name: 'Button Target Donor', studentId: '1605041' };
    createDonorViaApi(donor, 'buttonDonorId');

    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    cy.get('@buttonDonorId').then((donorId) => {
      cy.visit(`/#/home/details?id=${String(donorId)}`);
      cy.reload();
      profile.assertSettingsVisible();
      profile.openSettings();

      // window.open is stubbed rather than followed: Cypress cannot drive a second tab, and what
      // matters is the address handed to it — the donor's own id in the frozen `?id=` shape that
      // every printed QR code carries.
      cy.window().then((win) => {
        cy.stub(win, 'open').as('windowOpen');
      });

      cy.get('[data-cy="certificateButton"]').scrollIntoView().click();

      cy.get('@windowOpen').should((stub) => {
        const openedUrl = String((stub as unknown as sinon.SinonStub).args[0][0]);
        expect(openedUrl).to.contain('/#/certificate?id=');
        expect(openedUrl).to.contain(String(donorId));
      });
      cy.get('@windowOpen').should('have.been.calledWith', Cypress.sinon.match.any, '_blank');
    });
  });

  it('is reachable by a volunteer on a senior member’s profile, while the guarded actions stay hidden', () => {
    // The Settings card carries no designation gate of its own, so that Certificate is available to
    // anyone who can open the profile. This is the test that makes that safe: a volunteer looking at
    // a hall admin must see Certificate and nothing else, because every other action's own guard
    // independently fails. If someone ever adds a control to that card without a guard, this fails.
    const volunteerPassword = 'certvolunteer1';

    superAdminToken().then((token) => {
      // Same hall, so the volunteer is allowed to open the hall admin's profile at all.
      createMemberViaApi(
        { name: 'Junior Volunteer', studentId: '1605061', hall: HALL_SUHRAWARDY },
        DESIGNATION.VOLUNTEER,
        token,
        'volunteer'
      );
      createMemberViaApi(
        { name: 'Senior Hall Admin', studentId: '1605062', hall: HALL_SUHRAWARDY },
        DESIGNATION.HALL_ADMIN,
        token,
        'hallAdmin'
      );

      cy.get('@volunteer').then((volunteer) => {
        giveMemberPassword((volunteer as unknown as CreatedMember).id, token, volunteerPassword);
      });
    });

    cy.get('@volunteer').then((volunteer) => {
      cy.visit('/');
      signInPage.signIn(toLocalPhone((volunteer as unknown as CreatedMember).phone), volunteerPassword);
      notification.assertEquals(MESSAGES.signInSuccess);
    });

    cy.get('@hallAdmin').then((hallAdmin) => {
      cy.visit(`/#/home/details?id=${(hallAdmin as unknown as CreatedMember).id}`);
      cy.reload();
      profile.assertSettingsVisible();
      profile.openSettings();

      cy.get('[data-cy="certificateButton"]').should('be.visible');

      cy.get('[data-cy="promoteToVolunteerButtonId"]').should('not.exist');
      cy.get('[data-cy="demoteToDonorButtonId"]').should('not.exist');
      cy.get('[data-cy="personDetailsDeleteButtonId"]').should('not.exist');
      cy.get('[data-cy="promoteToHallAdminButtonId"]').should('not.exist');
      cy.get('[data-cy="promoteToSuperAdminButtonId"]').should('not.exist');
      cy.get('[data-cy="demoteFromSuperAdminButtonId"]').should('not.exist');
      cy.get('[data-cy="newPasswordFieldId"]').should('not.exist');
      cy.contains('Password Recovery Link').should('not.exist');
    });
  });
});
