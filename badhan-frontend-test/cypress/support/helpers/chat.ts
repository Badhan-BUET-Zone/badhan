import { AUTH_CREDENTIALS } from '@auth/credentials';

export const API_BASE_URL = (Cypress.env('apiBaseURL') as string) || 'http://localhost:3000';

// The two local-storage keys the feature owns. Named here rather than typed out in nine specs,
// because the whole badge design turns on them being two keys and not one.
export const LAST_FETCHED_AT_KEY = 'chatLastFetchedAt';
export const LAST_READ_AT_KEY = 'chatLastReadAt';

// The helpers module writes { value } wrappers, so a spec seeding a watermark has to write the
// same shape the app will read back.
export const storedTimestamp = (value: number): string => JSON.stringify({ value });

export const superAdminToken = (): Cypress.Chainable<string> =>
  cy
    .request({
      method: 'POST',
      url: `${API_BASE_URL}/users/signin`,
      body: {
        phone: Number(`88${AUTH_CREDENTIALS.phone}`),
        password: AUTH_CREDENTIALS.password,
      },
    })
    .then((response) => response.body.token as string);

// Messages are seeded through the real route with a real token, so nothing here takes a shortcut
// around a rule the feature enforces — the sender is whoever the token belongs to, which is
// exactly how a spec arranges "somebody else's message".
export const seedMessageViaApi = (token: string, text: string): Cypress.Chainable<string> =>
  cy
    .request({
      method: 'POST',
      url: `${API_BASE_URL}/messages`,
      headers: { 'x-auth': token },
      body: { text },
    })
    .then((response) => response.body.sentMessage._id as string);

export const seedMessagesViaApi = (token: string, texts: string[]): Cypress.Chainable<unknown> => {
  // Sequential on purpose: the cursor's whole job is ordering, and firing these in parallel
  // would leave the expected order up to whichever insert won.
  let chain: Cypress.Chainable<unknown> = cy.wrap(null, { log: false });
  texts.forEach((text) => {
    chain = chain.then(() => seedMessageViaApi(token, text));
  });
  return chain;
};

export const clearMessagesViaApi = (token: string): Cypress.Chainable<unknown> =>
  cy
    .request({ method: 'GET', url: `${API_BASE_URL}/messages?limit=100`, headers: { 'x-auth': token } })
    .then((response) => {
      const ids = (response.body.messages as { _id: string }[]).map((m) => m._id);
      let chain: Cypress.Chainable<unknown> = cy.wrap(null, { log: false });
      ids.forEach((id) => {
        chain = chain.then(() =>
          cy.request({
            method: 'DELETE',
            url: `${API_BASE_URL}/messages?messageId=${id}`,
            headers: { 'x-auth': token },
          }),
        );
      });
      return chain;
    });

// A signed-in-able volunteer, so a spec can seed a message that is NOT the viewer's own — which
// is what the badge and the delete-permission specs both need.
export const VOLUNTEER_PASSWORD = 'chatspec1';

// Returns the credentials as well as the token, so a spec can either seed messages as this
// person (token) or sign in AS them through the ordinary form (localPhone + password). The
// delete-permission and demotion specs need the second.
export const createVolunteerWithToken = (
  adminToken: string,
  label: string,
): Cypress.Chainable<{ token: string; donorId: string; name: string; localPhone: string }> => {
  const suffix = String(Date.now()).slice(-7);
  const localPhone = `01${suffix}${Math.floor(Math.random() * 90 + 10)}`.slice(0, 11);
  // The label verbatim, with no uniqueness suffix. Uniqueness comes from the phone, and the name
  // is what appears on every bubble — including in the documentation screenshots, where
  // "Nusrat Jahan 7606893" reads as a bug rather than as a person.
  const name = label;
  const password = VOLUNTEER_PASSWORD;
  const headers = { 'x-auth': adminToken };

  return cy
    .request({
      method: 'POST',
      url: `${API_BASE_URL}/donors`,
      headers,
      body: {
        name,
        fatherName: `${name} Father`,
        motherName: `${name} Mother`,
        phone: Number(`88${localPhone}`),
        studentId: '1605013',
        bloodGroup: 0,
        hall: 6,
        address: 'Chat Street',
        roomNumber: 'B-202',
        comment: 'chat spec fixture',
        lastDonation: 0,
        extraDonationCount: 0,
        availableToAll: true,
      },
    })
    .then((created) => {
      const donorId = created.body.newDonor._id as string;
      return cy
        .request({
          method: 'PATCH',
          url: `${API_BASE_URL}/donors/designation`,
          headers,
          body: { donorId, designation: 1 },
        })
        .then(() =>
          cy.request({ method: 'POST', url: `${API_BASE_URL}/donors/password`, headers, body: { donorId } }),
        )
        .then((recovery) =>
          cy.request({
            method: 'PATCH',
            url: `${API_BASE_URL}/users/password`,
            headers: { 'x-auth': recovery.body.token },
            body: { password },
          }),
        )
        .then(() =>
          cy.request({
            method: 'POST',
            url: `${API_BASE_URL}/users/signin`,
            body: { phone: Number(`88${localPhone}`), password },
          }),
        )
        .then((signIn) => ({ token: signIn.body.token as string, donorId, name, localPhone }));
    });
};

/**
 * Open the navigation drawer and click one of its entries.
 *
 * THE CLICK IS FORCED, AND THAT IS DELIBERATE RATHER THAN A SHORTCUT.
 *
 * On a phone-sized viewport the drawer is temporary and closes ITSELF after every navigation.
 * Its entries are `visibility: hidden` for the length of both the open and the close animation,
 * so any helper that gates on `should('be.visible')` is racing two transitions at once: the
 * assertion passes on one frame and the click fails on the next. That produces specs which pass
 * alone and fail in a full run — the worst kind of flake to chase, and one that says nothing
 * about the product.
 *
 * Forcing the click sidesteps the animation entirely. Nothing is skipped: every caller asserts
 * the resulting route, which is the behaviour actually under test. A drawer entry that did not
 * navigate still fails, and fails for a reason worth reading.
 */
export const clickDrawerEntry = (dataCy: string): void => {
  // The toggle is pressed UNCONDITIONALLY, which is safe only because every spec that uses this
  // runs at the default phone-sized viewport, where the drawer is temporary and has already
  // closed itself after the previous navigation. Do not reuse this on a wide viewport: there the
  // drawer is permanent and open, and this would shut it.
  //
  // Reading the state first and toggling conditionally is what does NOT work. jQuery's
  // `:visible` ignores `visibility: hidden` and reports a closed drawer as open, and Vuetify's
  // own class flips before the animation finishes — so both readings are wrong for part of every
  // transition, and the resulting click navigates nowhere.
  cy.get('[data-cy="hamburgerButtonId"]').click();
  cy.get(`[data-cy="${dataCy}"]`, { timeout: 20000 }).click({ force: true });
};
