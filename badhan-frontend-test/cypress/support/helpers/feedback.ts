import { AUTH_CREDENTIALS } from '@auth/credentials';

export const API_BASE_URL = (Cypress.env('apiBaseURL') as string) || 'http://localhost:3000';

// Index 2 in the project's bloodGroups array is B+, not A+.
const BLOOD_GROUP_B_POS = 2;
export const HALL_SUHRAWARDY = 5;

const toInternationalPhone = (localPhone: string) => Number(`88${localPhone}`);

let phoneCounter = 0;

// Unique per call even when two donors are created inside the same millisecond. The local form is
// what the public page's phone field takes; the API wants the international one, so both are
// returned together rather than being reconstructed at each call site.
export const uniqueLocalPhone = (): string => {
  phoneCounter += 1;
  return `01${String(Date.now()).slice(-8)}${phoneCounter % 10}`;
};

export interface FeedbackDonor {
  name: string;
  studentId: string;
  localPhone: string;
  phone: number;
  id: string;
}

export const superAdminToken = (): Cypress.Chainable<string> =>
  cy
    .request({
      method: 'POST',
      url: `${API_BASE_URL}/users/signin`,
      body: {
        phone: toInternationalPhone(AUTH_CREDENTIALS.phone),
        password: AUTH_CREDENTIALS.password,
      },
    })
    .then((response) => response.body.token as string);

// Donors are created over the API rather than through the creation form: these specs are about the
// public page, and driving the UI would only add unrelated ways to fail.
export const createDonorViaApi = (
  overrides: Partial<{ name: string; studentId: string; comment: string; address: string; roomNumber: string }>,
  alias: string,
): void => {
  const localPhone = uniqueLocalPhone();
  const phone = Number(`88${localPhone}`);

  superAdminToken().then((token) => {
    cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/donors`,
      headers: { 'x-auth': token },
      body: {
        phone,
        bloodGroup: BLOOD_GROUP_B_POS,
        hall: HALL_SUHRAWARDY,
        name: overrides.name ?? 'Feedback Spec Donor',
        studentId: overrides.studentId ?? '1605031',
        address: overrides.address ?? 'Azimpur',
        roomNumber: overrides.roomNumber ?? '3009',
        comment: overrides.comment ?? 'feedback spec comment',
        extraDonationCount: 0,
        availableToAll: true,
      },
    }).then((response) => {
      cy.wrap({
        name: overrides.name ?? 'Feedback Spec Donor',
        studentId: overrides.studentId ?? '1605031',
        localPhone,
        phone,
        id: response.body.newDonor._id,
      } as FeedbackDonor).as(alias);
    });
  });
};

// Opens the public page with no session, which is how every real donor arrives at it.
export const visitPublicDonorPage = (): void => {
  cy.clearLocalStorage();
  cy.visit('/#/donor');
};

// Vuetify spreads unrecognised attributes straight onto the inner <input>, so the data-cy
// selector IS the input — there is no wrapper to descend through.
export const fillIdentityCheck = (localPhone: string, studentId: string): void => {
  cy.get('[data-cy="publicDonorPhoneInput"]').clear().type(localPhone);
  cy.get('[data-cy="publicDonorStudentIdInput"]').clear().type(studentId);
  cy.get('[data-cy="publicDonorVerifyButton"]').click();
};

// The queue is only readable with a session, which is the point: the public page can write to it and
// can never read it back.
export const feedbacksViaApi = (): Cypress.Chainable<any[]> =>
  superAdminToken().then((token) =>
    cy
      .request({ method: 'GET', url: `${API_BASE_URL}/feedbacks`, headers: { 'x-auth': token } })
      .then((response) => response.body.feedbacks as any[]),
  );

export const donorViaApi = (donorId: string): Cypress.Chainable<any> =>
  superAdminToken().then((token) =>
    cy
      .request({ method: 'GET', url: `${API_BASE_URL}/donors?donorId=${donorId}`, headers: { 'x-auth': token } })
      .then((response) => response.body.donor),
  );

// A registration token, minted the way the QR generator will: through the ordinary public mint
// route, using an existing donor's own phone and student id. The token that comes back carries
// nothing but that donor's hall and an expiry.
export const mintTokenViaApi = (
  phone: number,
  studentId: string,
  durationMinutes?: number,
): Cypress.Chainable<string> =>
  cy
    .request({
      method: 'POST',
      url: `${API_BASE_URL}/feedbacks/token`,
      body: durationMinutes === undefined ? { phone, studentId } : { phone, studentId, durationMinutes },
    })
    .then((response) => response.body.token as string);

export const visitRegistrationPage = (token: string | null): void => {
  cy.clearLocalStorage();
  cy.visit(token === null ? '/#/register' : `/#/register?t=${token}`);
};

export const donorCountViaApi = (): Cypress.Chainable<number> =>
  superAdminToken().then((token) =>
    cy
      .request({
        method: 'GET',
        url: `${API_BASE_URL}/search/v3?bloodGroup=-1&hall=-1&batch=&name=&address=&isAvailable=true&isNotAvailable=true&availableToAll=true&markedByMe=false&archiveFlag=false`,
        headers: { 'x-auth': token },
        failOnStatusCode: false,
      })
      .then((response) => (response.body.filteredUsers ? response.body.filteredUsers.length : 0)),
  );

// Each helper asserts which step it is on before acting. Without that, four Skip clicks in a row
// can land on the same rendered button twice — every optional step has one, so Cypress's retry
// cannot tell that the DOM has not advanced yet.
const onStep = (field: string): void => {
  cy.get(`[data-cy="registrationStep-${field}"]`).should('exist');
};

export const answerText = (field: string, value: string): void => {
  onStep(field);
  cy.get(`[data-cy="registrationInput-${field}"]`).clear().type(value);
  cy.get('[data-cy="registrationNextButton"]').click();
};

export const answerChoice = (field: string, value: string | number | boolean): void => {
  onStep(field);
  cy.get(`[data-cy="registrationChoice-${value}"]`).click();
  cy.get('[data-cy="registrationNextButton"]').click();
};

export const skipStep = (field: string): void => {
  onStep(field);
  cy.get('[data-cy="registrationSkipButton"]').click();
};
