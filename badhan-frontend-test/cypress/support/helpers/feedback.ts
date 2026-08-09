import { AUTH_CREDENTIALS } from '@auth/credentials';

export const API_BASE_URL = (Cypress.env('apiBaseURL') as string) || 'http://localhost:3000';

// Index 2 in the project's bloodGroups array is B+, not A+.
const BLOOD_GROUP_B_POS = 2;
export const HALL_SUHRAWARDY = 5;
export const HALL_TITUMIR = 6;
// Not a hall: the sentinel an "All Halls" registration code carries. A student scanning one is
// asked which hall they are in, and their submission is routed by that answer.
export const HALL_ANY = -1;

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
  overrides: Partial<{
    name: string;
    studentId: string;
    comment: string;
    address: string;
    roomNumber: string;
    hall: number;
    availableToAll: boolean;
  }>,
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
        hall: overrides.hall ?? HALL_SUHRAWARDY,
        name: overrides.name ?? 'Feedback Spec Donor',
        studentId: overrides.studentId ?? '1605031',
        address: overrides.address ?? 'Azimpur',
        roomNumber: overrides.roomNumber ?? '3009',
        comment: overrides.comment ?? 'feedback spec comment',
        extraDonationCount: 0,
        // Defaults to true so a spec signed in as a super admin sees the donor from any hall. Pass
        // false when the point of the spec IS that another hall cannot see them.
        availableToAll: overrides.availableToAll ?? true,
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

// The other branch of the same route: stating a hall needs a session and a designation that allows
// it, and it is the branch the QR generator always takes. `hall` may be HALL_ANY.
export const mintTokenForHallViaApi = (
  phone: number,
  studentId: string,
  hall: number,
): Cypress.Chainable<string> =>
  superAdminToken().then((token) =>
    cy
      .request({
        method: 'POST',
        url: `${API_BASE_URL}/feedbacks/token`,
        headers: { 'x-auth': token },
        body: { phone, studentId, hall },
      })
      .then((response) => response.body.token as string),
  );

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

// The hall step under a code made for one named hall: a field showing a value, disabled, already
// answered. Next is enabled on arrival, which is the difference from every other step.
export const confirmLockedHall = (expectedLabel: string): void => {
  onStep('hall');
  cy.get('[data-cy="registrationLockedHall"]').should('be.disabled').and('have.value', expectedLabel);
  cy.get('[data-cy="registrationNextButton"]').should('not.be.disabled').click();
};

// Seeds a row straight into the queue over the API: mint a token with the target donor's own
// credentials, then submit as that donor. That is the same path the public page takes, so nothing
// here is a shortcut around the real rules.
export const seedMessageViaApi = (donor: FeedbackDonor, text: string): Cypress.Chainable<void> =>
  mintTokenViaApi(donor.phone, donor.studentId).then((token) =>
    cy
      .request({
        method: 'POST',
        url: `${API_BASE_URL}/feedbacks`,
        body: {
          token,
          type: 'feedback',
          feedbackJSON: { phone: donor.phone, studentId: donor.studentId, text },
        },
      })
      .then(() => undefined),
  );

export const seedRegistrationViaApi = (
  minter: FeedbackDonor,
  payload: Record<string, unknown>,
): Cypress.Chainable<void> =>
  mintTokenViaApi(minter.phone, minter.studentId).then((token) =>
    cy
      .request({
        method: 'POST',
        url: `${API_BASE_URL}/feedbacks`,
        body: {
          token,
          type: 'newDonor',
          feedbackJSON: {
            name: 'Seeded Student',
            phone: Number(`88${uniqueLocalPhone()}`),
            studentId: '1905301',
            bloodGroup: 2,
            hall: HALL_SUHRAWARDY,
            address: 'Seeded Address',
            roomNumber: '101',
            comment: 'seeded comment',
            donationCount: 0,
            lastDonation: null,
            plateletDonationCount: 0,
            lastPlateletDonation: null,
            availableToAll: false,
            ...payload,
          },
        },
      })
      .then(() => undefined),
  );

// Clears the whole queue so a spec starts from a known state. Discards through the real route, one
// row at a time, exactly as a volunteer would.
export const clearFeedbacksViaApi = (): void => {
  superAdminToken().then((token) => {
    cy.request({ method: 'GET', url: `${API_BASE_URL}/feedbacks`, headers: { 'x-auth': token } }).then(
      (response) => {
        (response.body.feedbacks as { _id: string }[]).forEach((feedback) => {
          cy.request({
            method: 'DELETE',
            url: `${API_BASE_URL}/feedbacks?feedbackId=${feedback._id}`,
            headers: { 'x-auth': token },
            failOnStatusCode: false,
          });
        });
      },
    );
  });
};

// A volunteer of Suhrawardy who can actually sign in. Promotion and password-setting go through the
// same routes the members specs use.
export const createVolunteerInHallViaApi = (
  overrides: { name: string; studentId: string },
  alias: string,
): void => {
  const localPhone = uniqueLocalPhone();
  const phone = Number(`88${localPhone}`);

  superAdminToken().then((token) => {
    const headers = { 'x-auth': token };
    cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/donors`,
      headers,
      body: {
        phone,
        bloodGroup: BLOOD_GROUP_B_POS,
        hall: HALL_SUHRAWARDY,
        name: overrides.name,
        studentId: overrides.studentId,
        address: 'Azimpur',
        roomNumber: '3009',
        comment: 'feedback spec volunteer',
        extraDonationCount: 0,
        availableToAll: false,
      },
    }).then((creation) => {
      const donorId = creation.body.newDonor._id;
      cy.request({
        method: 'PATCH',
        url: `${API_BASE_URL}/donors/designation`,
        headers,
        body: { donorId, designation: 1 },
      }).then(() => {
        cy.request({ method: 'POST', url: `${API_BASE_URL}/donors/password`, headers, body: { donorId } }).then(
          (recovery) => {
            cy.request({
              method: 'PATCH',
              url: `${API_BASE_URL}/users/password`,
              headers: { 'x-auth': recovery.body.token },
              body: { password: 'archivetest1' },
            }).then(() => {
              cy.wrap({ donorId, localPhone, phone }).as(alias);
            });
          },
        );
      });
    });
  });
};
