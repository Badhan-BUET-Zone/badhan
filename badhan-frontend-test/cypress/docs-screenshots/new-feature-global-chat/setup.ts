import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import {
  superAdminToken,
  clearMessagesViaApi,
  seedMessagesViaApi,
  createVolunteerWithToken,
} from '@support/helpers/chat';

// Shared arrangement for the chat screenshots. The room is seeded through the real route as
// somebody ELSE, so the pictures show a conversation rather than a column of your own bubbles.
export const CONVERSATION = [
  'Need 2 bags of O+ at DMC tonight, anyone free?',
  'I can call the Titumir list and check',
  'Reminder: the intake camp starts at 9am tomorrow',
  'Two donors from batch 21 signed up today',
];

export const signInWithSeededRoom = (texts: string[] = CONVERSATION): void => {
  superAdminToken().then((adminToken) => {
    clearMessagesViaApi(adminToken);
    createVolunteerWithToken(adminToken, 'Nusrat Jahan').then((other) => {
      seedMessagesViaApi(other.token, texts);
      new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
      cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');
    });
  });
};

export const openPanel = (): void => {
  cy.get('[data-cy="chatFabId"]').click();
  cy.get('[data-cy="chatPanel"]', { timeout: 20000 }).should('be.visible');
};
