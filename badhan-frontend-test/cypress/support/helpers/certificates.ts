import { AUTH_CREDENTIALS } from '@auth/credentials';

export const API_BASE_URL = (Cypress.env('apiBaseURL') as string) || 'http://localhost:3000';

// The donor routes take indices, not the labels the UI shows.
const BLOOD_GROUP_A_POS = 2;
export const HALL_SUHRAWARDY = 5;

// The API takes phones in international form. AUTH_CREDENTIALS holds the local form the sign-in
// form expects, which the app converts before sending; calling the API directly skips that step.
const toInternationalPhone = (localPhone: string) => Number(`88${localPhone}`);

let phoneCounter = 0;

// Unique per call even when two donors are created inside the same millisecond.
export const uniquePhone = (): number => {
  phoneCounter += 1;
  return Number(`8801${String(Date.now()).slice(-8)}${phoneCounter % 10}`);
};

export interface CertificateDonor {
  name: string;
  studentId: string;
}

// Donors are created over the API rather than through the creation form: these specs are about how
// the certificate page reads and renders, and driving the UI would only add unrelated ways to fail.
export const createDonorViaApi = (donor: CertificateDonor, alias: string): void => {
  cy.request({
    method: 'POST',
    url: `${API_BASE_URL}/users/signin`,
    body: {
      phone: toInternationalPhone(AUTH_CREDENTIALS.phone),
      password: AUTH_CREDENTIALS.password,
    },
  }).then((signInResponse) => {
    cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/donors`,
      headers: { 'x-auth': signInResponse.body.token },
      body: {
        phone: uniquePhone(),
        bloodGroup: BLOOD_GROUP_A_POS,
        hall: HALL_SUHRAWARDY,
        name: donor.name,
        studentId: donor.studentId,
        address: 'Azimpur',
        roomNumber: '3009',
        comment: 'certificate spec',
        extraDonationCount: 0,
        availableToAll: true,
      },
    }).then((creationResponse) => {
      cy.wrap(creationResponse.body.newDonor._id).as(alias);
    });
  });
};

// Opens the certificate with no session, which is how every real verifier arrives at it.
export const visitCertificateSignedOut = (donorId: string): void => {
  cy.clearLocalStorage();
  cy.visit(`/#/certificate?id=${donorId}`);
};

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

export const DESIGNATION = {
  DONOR: 0,
  VOLUNTEER: 1,
  HALL_ADMIN: 2,
  SUPER_ADMIN: 3,
} as const;

export interface CreatedMember {
  id: string;
  // International form, as stored. The sign-in form wants the local form — see toLocalPhone.
  phone: number;
}

// The sign-in form takes 01XXXXXXXXX and adds the country code itself. Dropping the leading "88" is
// the whole conversion — the 0 is already there, so prefixing another one silently produces a
// 12-digit number the form rejects, leaving the sign-in button disabled.
export const toLocalPhone = (internationalPhone: number): string =>
  String(internationalPhone).slice(2);

// Creates a donor and walks them up to the wanted designation. Promotion moves one step at a time,
// so volunteer comes before hall admin. Aliases { id, phone } — the phone is needed to sign in as
// them later, and it is generated in here.
export const createMemberViaApi = (
  donor: CertificateDonor & { hall: number },
  designation: number,
  token: string,
  alias: string
): void => {
  const phone = uniquePhone();
  cy.request({
    method: 'POST',
    url: `${API_BASE_URL}/donors`,
    headers: { 'x-auth': token },
    body: {
      phone,
      bloodGroup: BLOOD_GROUP_A_POS,
      hall: donor.hall,
      name: donor.name,
      studentId: donor.studentId,
      address: 'Azimpur',
      roomNumber: '3009',
      comment: 'certificate spec',
      extraDonationCount: 0,
      availableToAll: true,
    },
  }).then((creationResponse) => {
    const donorId = creationResponse.body.newDonor._id as string;
    for (let step = DESIGNATION.VOLUNTEER; step <= designation; step++) {
      cy.request({
        method: 'PATCH',
        url: `${API_BASE_URL}/donors/designation`,
        headers: { 'x-auth': token },
        body: { donorId, designation: step },
      });
    }
    cy.wrap({ id: donorId, phone } as CreatedMember).as(alias);
  });
};

// The only supported way to get a browser session as another member: the super admin issues a
// recovery token for them, that token is spent on a known password, and they sign in normally.
export const giveMemberPassword = (donorId: string, token: string, password: string): void => {
  cy.request({
    method: 'POST',
    url: `${API_BASE_URL}/donors/password`,
    headers: { 'x-auth': token },
    body: { donorId },
  }).then((recoveryResponse) => {
    cy.request({
      method: 'PATCH',
      url: `${API_BASE_URL}/users/password`,
      headers: { 'x-auth': recoveryResponse.body.token },
      body: { password },
    });
  });
};
