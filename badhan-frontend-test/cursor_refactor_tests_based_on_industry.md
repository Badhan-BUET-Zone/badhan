# Refactor tests based on industry standards
### Key refactors to apply


- **Replace fixed waits with network- or DOM-based waits**
  - Eliminate `ui.control.wait(1000)` and rely on deterministic waits using intercepts or key element visibility.
  - Example:
```javascript
cy.intercept('GET', '/api/search*').as('getSearch')
ui.pages.home.filter.searchButton.click()
cy.wait('@getSearch').its('response.statusCode').should('eq', 200)
```
  - You already use `ApiInterceptor` in many places; standardize it everywhere to avoid arbitrary waits.

- **Standardize on the Page Object layer (`ui.actions`)**
  - Some specs (e.g., `donors/search.js`) correctly use `ui.actions.*` but others repeat raw steps. Expand `ui.actions` to include `signOut`, `goToMyProfile`, `openDonations`, etc., and use them everywhere for consistency and less duplication.

- **Use deterministic test data instead of random search inputs**
  - Avoid searching `"a"` or clicking the first card. Either:
  - Seed data via API (`cy.request` or a `cy.task`) to create a known donor, then operate on it, or
  - Generate unique names per run (timestamp-based) and clean up within the test.
```javascript
// example seed helper
Cypress.Commands.add('createDonorViaApi', (overrides = {}) => {
  const donor = { name: `Test Donor ${Date.now()}`, ...overrides }
  return cy.request('POST', '/api/donors', donor).then(({ body }) => body)
})
```
  - Then the test can select by donorId, not by fragile index.

- **Split long, multi-purpose flows into focused tests**
  - Flows like create → promote → verify → demote → delete are great as a single smoke test, but also break them into smaller `it` blocks for focused checks. With `cy.session` login is cheap; keep tests independent and parallel-friendly.

- **Strengthen assertions**
  - After navigation: assert the page header, key elements visible, and/or successful API responses (already partly covered via `ApiInterceptor`).
  - After each mutating action: assert both the notification and the resulting state (e.g., table row count, toggle state), not just the snack bar text.

- **Remove unused imports and fix typos**
  - In `logs/logs.js`, `idStart` is imported but unused.
```1:1:/Users/mirmahathirmohammad/Documents/badhan/badhan-frontend-test/cypress/integration/logs/logs.js
import { idStart } from '../../plugins/frontend/functions'
```
  - In `users/logins.js`, likely a typo in scroll helper:
```23:34:/Users/mirmahathirmohammad/Documents/badhan/badhan-frontend-test/cypress/integration/users/logins.js
// ...
ui.pages.myProfile.settings.listOfLoginsButton.click()
ui.control.scroll.botton() // likely intended to be `bottom()`
// ...
ui.pages.myProfile.settings.listOfLogins.getByIndex(0).deleteButton.click()
ui.components.notificationSnackBar.contains(routeInfos.DELETELogins.notification)
```

- **Centralize notification assertions**
  - Wrap snack bar expectations into a small helper like `ui.asserts.expectNotification(routeInfos.X)`, so the actual assertion string stays in one place.

- **Adopt a consistent navigation contract**
  - Prefer `ui.actions.visitFirstPage()` + a `beforeEach` login. Then feature-specific navigation helpers: `ui.actions.openActiveDonors()`, `ui.actions.openLogs()`, etc.

- **Modernize Cypress project structure (when feasible)**
  - If/when moving to Cypress 12+, migrate to `cypress/e2e`, `cypress/support/e2e.js`, and `cypress.config.ts`. Keep your POM in `cypress/support` instead of `plugins` (Node plugins moved to `setupNodeEvents` in config). This makes future upgrades smoother.

- **Consider TypeScript for specs**
  - Your POM is already structured; adding types improves DX and reduces selector/route typos. Start by renaming files to `.ts` and enabling TS in Cypress config with minimal setup.

### Targeted changes per file (high value)

- **`users/logins.js`**: Use `cy.session` for auth; fix `scroll.botton()`; replace relogin by clearing local storage with `cy.session` or explicit sign-in command; wait on the GET donors/profile call instead of static scrolling.
- **`donors/donors.js`**: Replace conditional “if donor exists, delete” with deterministic data creation; split actions into multiple tests using shared setup; prefer selector by donorId to index.
- **`donors/search.js`**: Good use of `ui.actions`—use this pattern elsewhere; add a network wait for the search call; assert result count or specific card presence.
- **`activeDonors/activeDonors.js`**: Replace `wait(1000)` with an intercept for the profile fetch; ensure final toggle state is asserted after notification.
- **`donations/donations.js`**: Avoid searching `"a"` and clicking index 0; seed a donor and operate on it; replace waits with intercepts for donation POST/DELETE.
- **`logs/logs.js`**: Remove unused `idStart` import; add network waits for the stats endpoints; ensure the required elements are visible before assertion.
- **`callRecords/callRecords.js`**: Good use of `ApiInterceptor`—also seed donor or pick by known donorId; replace index-based selection with donorId-based methods consistently.
- **`publicContacts/publicContacts.js`**: Replace waits with intercepts for GET me and public contacts endpoints; assert final state on the public contacts page, not only notifications.

### Minimal example refactor (beforeEach + session + intercept)
```javascript
// cypress/e2e/donations.cy.ts (or integration/donations.js if staying on <10)
describe('Donations', () => {
  beforeEach(() => {
    cy.session('superadmin', () => cy.signInAsSuperAdmin())
  })

  it('creates and deletes a donation for a seeded donor', () => {
    cy.createDonorViaApi({ bloodGroup: 'A+', donationCount: 0 }).then((donor) => {
      cy.intercept('POST', `/api/donations`).as('createDonation')
      cy.intercept('DELETE', `/api/donations/*`).as('deleteDonation')

      ui.actions.searchDonor({ name: donor.name, publicData: true, notAvailable: true })
      ui.pages.home.searchResult.personCards.getByDonorId(donor._id).donate(d => {
        d.pickSampleDate()
        d.confirm()
      })

      cy.wait('@createDonation').its('response.statusCode').should('eq', 200)

      ui.pages.home.searchResult.personCards.getByDonorId(donor._id).seeProfile()
      ui.pages.personDetails.donationHistory.getByIndex(0).deleteButton.click()
      ui.components.confirmationModal.okButton.click()
      cy.wait('@deleteDonation').its('response.statusCode').should('eq', 200)
    })
  })
})
```

- **Outcome**: faster tests, fewer flakes, clearer intent, and simpler maintenance.

- I’ll stop here to keep things concise. If you want, I can apply these refactors to one feature (e.g., Donations) as a concrete starting point.

```javascript
// cypress/support/commands.js
Cypress.Commands.add('signInAsSuperAdmin', () => {
  ui.control.start()
  ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
  ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
  ui.pages.signIn.signInButton.click()
  ui.components.notificationSnackBar.contains(routeInfos.GETUsersSignIn.notification)
})

// cypress/support/e2e.js (or support/index.js in Cypress <10)
beforeEach(() => {
  cy.session('superadmin', () => {
    cy.signInAsSuperAdmin()
  })
})
```

```javascript
cy.intercept('GET', '/api/search*').as('getSearch')
ui.pages.home.filter.searchButton.click()
cy.wait('@getSearch').its('response.statusCode').should('eq', 200)
```

```javascript
// example seed helper
Cypress.Commands.add('createDonorViaApi', (overrides = {}) => {
  const donor = { name: `Test Donor ${Date.now()}`, ...overrides }
  return cy.request('POST', '/api/donors', donor).then(({ body }) => body)
})
```

```javascript
import { idStart } from '../../plugins/frontend/functions'
```

```javascript
// ...
ui.pages.myProfile.settings.listOfLoginsButton.click()
ui.control.scroll.botton() // likely intended to be `bottom()`
// ...
ui.pages.myProfile.settings.listOfLogins.getByIndex(0).deleteButton.click()
ui.components.notificationSnackBar.contains(routeInfos.DELETELogins.notification)
```

```javascript
// cypress/e2e/donations.cy.ts (or integration/donations.js if staying on <10)
describe('Donations', () => {
  beforeEach(() => {
    cy.session('superadmin', () => cy.signInAsSuperAdmin())
  })

  it('creates and deletes a donation for a seeded donor', () => {
    cy.createDonorViaApi({ bloodGroup: 'A+', donationCount: 0 }).then((donor) => {
      cy.intercept('POST', `/api/donations`).as('createDonation')
      cy.intercept('DELETE', `/api/donations/*`).as('deleteDonation')

      ui.actions.searchDonor({ name: donor.name, publicData: true, notAvailable: true })
      ui.pages.home.searchResult.personCards.getByDonorId(donor._id).donate(d => {
        d.pickSampleDate()
        d.confirm()
      })

      cy.wait('@createDonation').its('response.statusCode').should('eq', 200)

      ui.pages.home.searchResult.personCards.getByDonorId(donor._id).seeProfile()
      ui.pages.personDetails.donationHistory.getByIndex(0).deleteButton.click()
      ui.components.confirmationModal.okButton.click()
      cy.wait('@deleteDonation').its('response.statusCode').should('eq', 200)
    })
  })
})
```

