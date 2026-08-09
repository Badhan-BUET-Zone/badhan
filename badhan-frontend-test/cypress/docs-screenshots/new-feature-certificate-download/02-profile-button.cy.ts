import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { ProfilePage } from '@pages/ProfilePage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { MESSAGES } from '@support/constants';
import { createDonorViaApi } from '@support/helpers/certificates';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-certificate-download.md.
// ONE cy.screenshot() per spec file — see 01-certificate-page.cy.ts.

describe('docs screenshot — Certificate button on the donor profile', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const profile = new ProfilePage();

  it('captures the Settings card carrying the Certificate button', () => {
    cy.viewport(500, 900);
    createDonorViaApi({ name: 'Mahmudul Hasan Rifat', studentId: '1605011' }, 'docsDonorId');

    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    cy.get('@docsDonorId').then((donorId) => {
      cy.visit(`/#/home/details?id=${String(donorId)}`);
      cy.reload();
      profile.assertSettingsVisible();
      profile.openSettings();

      cy.get('[data-cy="certificateButton"]').should('be.visible');
      hideOverlays();
      cy.wait(1500);
      // The whole Settings card, so the Certificate button is shown where it actually sits rather
      // than clipped against the top of the viewport.
      cy.get('[data-cy="certificateButton"]').parents('.v-card').first()
        .screenshot('certificate-profile-button');
    });
  });
});
