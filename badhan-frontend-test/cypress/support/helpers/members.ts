// Fixture setup driven through the API rather than the UI: creating a donor, promoting
// them and handing them a password takes four requests, against a couple of minutes of
// form filling. The password step exists because there is no other supported way to get a
// session for another member — a super admin issues a recovery token, which is spent on a
// known password, and the member then signs in through the ordinary form.

export const API_BASE_URL = (Cypress.env('apiBaseURL') as string) || 'http://localhost:3000';
export const MEMBER_PASSWORD = 'archivetest1';

export interface DonorSpec {
  name: string;
  phone: string;
  studentId: string;
  hall: number;
  availableToAll?: boolean;
}

// `index` keeps the phone unique even when two donors are built in the same millisecond.
// It is padded to two digits so that index 1 and index 10 cannot collide after the phone
// is trimmed to eleven characters.
export const uniqueDonor = (label: string, index: number, hall = 0): DonorSpec => {
  const suffix = String(Date.now()).slice(-7);
  const paddedIndex = String(index).padStart(2, '0');
  return {
    name: `${label} ${suffix}${paddedIndex}`,
    phone: `01${suffix}${paddedIndex}`.slice(0, 11),
    studentId: '1605012',
    hall,
  };
};

const authHeaders = () =>
  cy.window().then((win) => ({ 'x-auth': win.localStorage.getItem('x-auth') as string }));

export const createDonorViaApi = (donor: DonorSpec): Cypress.Chainable<string> =>
  authHeaders().then((headers) =>
    cy
      .request({
        method: 'POST',
        url: `${API_BASE_URL}/donors`,
        headers,
        body: {
          name: donor.name,
          // Required on creation since plan16 P2, and not something these specs are about — a
          // fixture name derived from the donor's own keeps them unique without another generator.
          fatherName: `${donor.name} Father`,
          motherName: `${donor.name} Mother`,
          phone: parseInt(`88${donor.phone}`, 10),
          studentId: donor.studentId,
          bloodGroup: 0,
          hall: donor.hall,
          address: 'Archive Street',
          roomNumber: 'A-101',
          comment: 'archive search fixture',
          lastDonation: 0,
          extraDonationCount: 0,
          availableToAll: donor.availableToAll !== false,
        },
      })
      .then((response) => response.body.newDonor._id as string),
  );

// Designation changes move one step at a time, so this only promotes a donor to volunteer
export const promoteViaApi = (donorId: string, designation: number): Cypress.Chainable<string> =>
  authHeaders().then((headers) =>
    cy
      .request({
        method: 'PATCH',
        url: `${API_BASE_URL}/donors/designation`,
        headers,
        body: { donorId, designation },
      })
      .then(() => donorId),
  );

export const setMemberPasswordViaApi = (donorId: string): Cypress.Chainable<string> =>
  authHeaders().then((headers) =>
    cy
      .request({ method: 'POST', url: `${API_BASE_URL}/donors/password`, headers, body: { donorId } })
      .then((recovery) =>
        cy.request({
          method: 'PATCH',
          url: `${API_BASE_URL}/users/password`,
          headers: { 'x-auth': recovery.body.token },
          body: { password: MEMBER_PASSWORD },
        }),
      )
      .then(() => donorId),
  );

// Creates a signed-in-able volunteer. Call while signed in as a super admin.
export const createVolunteerViaApi = (donor: DonorSpec): Cypress.Chainable<string> =>
  createDonorViaApi(donor)
    .then((donorId) => promoteViaApi(donorId, 1))
    .then((donorId) => setMemberPasswordViaApi(donorId));

export const markActiveDonorViaApi = (donorId: string): Cypress.Chainable<string> =>
  authHeaders().then((headers) =>
    cy
      .request({ method: 'POST', url: `${API_BASE_URL}/activeDonors`, headers, body: { donorId } })
      .then(() => donorId),
  );

// Edits through the same primitive the UI uses: a full-body PATCH, which is why the donor
// has to be fetched first
export const patchDonorViaApi = (
  donorId: string,
  overrides: Record<string, unknown>,
): Cypress.Chainable<string> =>
  authHeaders().then((headers) =>
    cy
      .request({ method: 'GET', url: `${API_BASE_URL}/donors?donorId=${donorId}`, headers })
      .then((response) => {
        const donor = response.body.donor;
        return cy.request({
          method: 'PATCH',
          url: `${API_BASE_URL}/donors/v2`,
          headers,
          body: {
            donorId,
            name: donor.name,
            fatherName: donor.fatherName,
            motherName: donor.motherName,
            phone: donor.phone,
            studentId: donor.studentId,
            email: donor.email,
            bloodGroup: donor.bloodGroup,
            hall: donor.hall,
            roomNumber: donor.roomNumber,
            address: donor.address,
            availableToAll: donor.availableToAll,
            archiveFlag: donor.archiveFlag,
            isCertificateEnabled: donor.isCertificateEnabled,
            ...overrides,
          },
        });
      })
      .then(() => donorId),
  );

export const archiveDonorViaApi = (donorId: string): Cypress.Chainable<string> =>
  patchDonorViaApi(donorId, { archiveFlag: true });
