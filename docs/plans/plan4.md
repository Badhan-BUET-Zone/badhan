# Plan 4: Make the guest routes consistent with the real routes

## Goal

"Login as guest" must give a **complete, non-broken tour of the app**. Today it doesn't:
six routes the frontend calls have **no `/guest` counterpart at all** (guest users get a
404 + a red error toast), several guest responses are **missing fields** the real routes
return, some **success messages differ**, and two guest routes are **orphans** that no real
route or frontend call corresponds to.

The end state: for every route the frontend can reach while in guest mode, `GET /guest/X`
returns a **fake response that is schema-identical and message-identical** to `GET /X`.

## How guest mode works (mechanism)

Guest mode is a **base-URL swap**, not a separate frontend:

- [SignInCover.vue:229-231](badhan-frontend/src/views/SignInCover.vue#L229-L231) → dispatch
  `guestLogin`.
- [store/auth.ts:172-175](badhan-frontend/src/store/auth.ts#L172-L175) calls
  `enableGuestAPI()` then does a normal `login`.
- [api/index.ts:27-29](badhan-frontend/src/api/index.ts#L27-L29):
  ```js
  const enableGuestAPI = () => { badhanAxios.defaults.baseURL += '/guest' }
  ```

So **every** `badhanAxios.<verb>('/path')` in [api/index.ts](badhan-frontend/src/api/index.ts)
becomes `/guest/path`. There is no per-call opt-out. Consequence: *any* route in
`api/index.ts` that lacks a `/guest` twin **404s in guest mode**.

The guest fakes all live in one controller —
[GuestController.ts](badhan-backend/src/tsoaControllers/GuestController.ts) (`@Route('guest')`,
every method `@Hidden()`), backed by the fake-data helpers in
[doc/faker.ts](badhan-backend/src/doc/faker.ts). Guest handlers take **no middleware** — no
validation, no rate limiting, no auth — which is intentional and should stay that way.

Guest sign-in returns `designation: SUPER_ADMIN`
([GuestController.ts:72](badhan-backend/src/tsoaControllers/GuestController.ts#L72)), so a
guest can reach **every** page in the router, including the Super-Admin-only Statistics
pages. That is why the missing report/log routes are visible in practice.

## Current state — full route inventory

Legend: ✅ consistent · ⚠️ exists but inconsistent · ❌ missing in guest · 🗑️ orphan guest route

| Frontend call ([api/index.ts](badhan-frontend/src/api/index.ts)) | Real route | Guest route | Status |
| --- | --- | --- | --- |
| `PATCH /donors/designation` | DonorsController:749 | ✔ | ✅ |
| `PATCH /users/password` | UsersController:316 (201) | ✔ (201) | ✅ |
| `DELETE /donors` | DonorsController:669 | ✔ | ✅ |
| `POST /donors/password` | DonorsController:501 | ✔ | ✅ |
| `GET /donors/checkDuplicate` | DonorsController:916 | ✔ | ⚠️ message + always-found |
| `GET /donors/phone` | DonorsController:975 | — | ❌ |
| `GET /log` | LogsController:82 | ✔ | ⚠️ message |
| `GET /log/donations` | LogsController:58 | — | ❌ |
| `DELETE /users/signout` | UsersController:94 | ✔ | ✅ |
| `DELETE /users/signout/all` | UsersController:119 | ✔ | ✅ |
| `POST /users/redirection` | UsersController:188 | — | ❌ |
| `PATCH /users/redirection` | UsersController:225 | — | ❌ |
| `GET /users/me` | UsersController:148 | ✔ | ✅ |
| `POST /users/signin` | UsersController:22 | ✔ | ✅ |
| `POST /donors` | DonorsController:94 | ✔ | ✅ |
| `POST /donations` | DonationsController:18 | ✔ | ✅ |
| `POST /platelet-donations` | PlateletDonationsController:19 | ✔ | ✅ |
| `GET /donors` | DonorsController:270 | ✔ | ✅ |
| `GET /search/v3` | SearchController:16 | ✔ | ⚠️ missing `callCountLast3Days` |
| `GET /log/statistics` | LogsController:18 | ✔ | ✅ |
| `DELETE /log` | LogsController:110 | ✔ | ✅ (untested) |
| `GET /donors/designation/all` | DonorsController:1009 | ✔ | ⚠️ payload shape |
| `PATCH /donors/comment` | DonorsController:445 | ✔ | ⚠️ message |
| `PATCH /donors/v2` | DonorsController:581 | ✔ | ✅ |
| `DELETE /donations` | DonationsController:101 | ✔ | ✅ |
| `DELETE /platelet-donations` | PlateletDonationsController:72 | ✔ | ✅ |
| `GET /donations/report` | DonationsController:181 | — | ❌ |
| `GET /platelet-donations/report` | PlateletDonationsController:127 | — | ❌ |
| `GET /donors/new` | DonorsController:54 | ✔ | ✅ |
| `POST /callrecords` | CallRecordsController:18 | ✔ | ✅ |
| `DELETE /callrecords` | CallRecordsController:84 | ✔ | ✅ |
| `GET /donors/designation` | DonorsController:864 | ✔ | ✅ |
| `GET /publicContacts` | PublicContactsController:64 | ✔ | ✅ |
| `POST /publicContacts` | PublicContactsController:19 | ✔ | ✅ |
| `DELETE /publicContacts` | PublicContactsController:96 | ✔ | ✅ |
| `GET /users/logins` | UsersController:360 | ✔ | ✅ |
| `DELETE /users/logins/{tokenId}` | UsersController:435 | ✔ | ✅ |
| `POST /activeDonors` | ActiveDonorsController:18 | ✔ | ✅ |
| `DELETE /activeDonors/{donorId}` | ActiveDonorsController:99 | ✔ | ✅ |
| `GET /activeDonors` | ActiveDonorsController:172 | ✔ | ⚠️ missing 3 fields |
| — | `GET /volunteers/all` (VolunteersController:15) | `GET /guest/volunteers` | 🗑️ path + key mismatch |
| — | *(none)* | `GET /guest/admins` | 🗑️ no real counterpart |
| — | `GET /donors/me` (DonorsController:22) | — | (not called by frontend; ignore) |

---

## Findings

### A. Missing guest routes — these 404 in guest mode

#### A1. `GET /guest/donors/phone` — breaks CSV donor creation

Real: [DonorsController.ts:975-1006](badhan-backend/src/tsoaControllers/DonorsController.ts#L975-L1006).
Called by `handleGETDonorsPhoneList`
([api/index.ts:211-232](badhan-frontend/src/api/index.ts#L211-L232)) — the chunked
pre-flight in [CsvDonorCreation.vue:377](badhan-frontend/src/views/CsvDonorCreation.vue#L377).
A guest who uploads a CSV gets `Could not check which donors already exist…` and the whole
page dead-ends.

Response shape: `{ status, statusCode, message, donors: [{ phone, donorId }] }` — note
`donorId`, **not** `_id`, and no `_id` field at all
([donorInterface.ts:707-723](badhan-backend/src/db/interfaces/donorInterface.ts#L707-L723)).
`donorId` may be the `'FORBIDDEN'` sentinel string.

#### A2. `GET /guest/log/donations` — breaks the monthly bar chart

Real: [LogsController.ts:58-80](badhan-backend/src/tsoaControllers/LogsController.ts#L58-L80).
Called by `handleGETLogsDonations` from
[DonationsMonthlyBarChart.vue:130](badhan-frontend/src/components/DonationsMonthlyBarChart.vue#L130),
which renders on **both** `SignInCover.vue` and `Statistics/DonationReport.vue`. On the
sign-in page it works (base URL not yet swapped); once the guest is inside and opens the
report page, it 404s.

Response shape: `{ status, statusCode, message, countByYearMonth }` where `countByYearMonth`
is a nested `{ [year]: { [month]: count } }` map (`donationInterface.YearMonthCount`).

#### A3 / A4. `GET /guest/donations/report` and `GET /guest/platelet-donations/report`

Real: [DonationsController.ts:181-237](badhan-backend/src/tsoaControllers/DonationsController.ts#L181-L237)
and [PlateletDonationsController.ts:127-183](badhan-backend/src/tsoaControllers/PlateletDonationsController.ts#L127-L183).
Called back-to-back by `generateReport()` in
[DonationReport.vue:269-273](badhan-frontend/src/views/Statistics/DonationReport.vue#L269-L273).
A guest reaches `#/statistics/report` (guest is SUPER_ADMIN), clicks **Generate Report**,
and gets two error toasts and two empty tables.

Response shapes (these were extended by [plan3.md](docs/plan3.md) — the fakes must include
`hallwiseReport`):

```
donations/report:          { status, statusCode, message,
                             report: [{ bloodGroup, counts: [{ month, year, count }] }],
                             firstDonationCount,
                             hallwiseReport: { [hall]: { report, firstDonationCount } } }

platelet-donations/report: { status, statusCode, message,
                             report: [{ bloodGroup, counts: [{ month, year, count }] }],
                             firstPlateletDonationCount,
                             hallwiseReport: { [hall]: { report, firstPlateletDonationCount } } }
```

Note the frontend builds table rows by walking `startDate → endDate` month by month
([DonationReport.vue:283-300](badhan-frontend/src/views/Statistics/DonationReport.vue#L283-L300)),
so the fake **must echo the requested `startDate`/`endDate`** into the generated
`counts[].month/year` — a fixed hard-coded year would render an all-blank table.

#### A5 / A6. `POST /guest/users/redirection` and `PATCH /guest/users/redirection`

Real: [UsersController.ts:188-222](badhan-backend/src/tsoaControllers/UsersController.ts#L188-L222)
(201, returns `token`) and [UsersController.ts:225-313](badhan-backend/src/tsoaControllers/UsersController.ts#L225-L313)
(201, returns `token` + `donor`).

Reached from **two unguarded** call sites:
- `goToWebClicked()` — [AppBar.vue:268-278](badhan-frontend/src/components/AppShell/AppBar.vue#L268-L278)
- `downloadInMobileClicked()` — [Home.vue:432-436](badhan-frontend/src/views/Home.vue#L432-L436)

Both `AppBar.vue` and `Home.vue` **declare an `isGuestEnabled` computed but never use it in
their templates** ([AppBar.vue:236](badhan-frontend/src/components/AppShell/AppBar.vue#L236),
[Home.vue:128](badhan-frontend/src/views/Home.vue#L128)) — dead code left from an earlier
guard attempt. So the buttons are live for guests and both flows fail.

`PATCH /users/redirection` is the receiving end (`Redirection.vue`). Its guest twin matters
because `goToWebClicked` opens a new tab at the redirection page — but note that new tab
starts a **fresh frontend instance with a non-guest base URL**, so it will call the real
`PATCH /users/redirection` with a fake token and get a 401. See **Decision D1**.

### B. Field-level shape mismatches

The backend test suite already encodes the canonical shapes as JSON Schemas shared between
the authenticated and guest tests (e.g. [tests/logs/schemas.js](badhan-backend-test/tests/logs/schemas.js),
[tests/activeDonors/schemas.js](badhan-backend-test/tests/activeDonors/schemas.js)). Every
schema uses `additionalProperties: false` plus a `required` list, so a shared schema is a
**two-way** consistency check. Where a guest route has no guest test, drift went unnoticed:

#### B1. `GET /guest/activeDonors` — missing 2 required + 1 optional field

Guest returns ([GuestController.ts:838-869](badhan-backend/src/tsoaControllers/GuestController.ts)):
`_id, hall, name, address, comment, commentTime, lastDonation, availableToAll, bloodGroup,
studentId, phone, markedTime, markerName, donationCount, callRecordCount, lastCallRecord`.

`activeDonorSearchResultSchema` **requires** `plateletDonationCount` and
`lastPlateletDonation` — both absent from the guest fake — and also permits
`callCountLast3Days`, which the real route returns and the guest does not. This is
uncaught because [activeDonors/guest.test.js](badhan-backend-test/tests/activeDonors/guest.test.js)
only exercises POST and DELETE, never GET.

#### B2. `GET /guest/search/v3` — missing `callCountLast3Days`

Present in `searchSchema` and returned by the real aggregate; absent from the guest fake.

#### B3. `GET /guest/donors/designation/all` — wrong payload shape

Guest returns `data: [{ name, hall, studentId, logCount, _id }]`. The real route returns
full donor documents, whose `@Example` advertises `{ _id, name, phone, hall, studentId,
logCount, designation }` ([DonorsController.ts:1009-1025](badhan-backend/src/tsoaControllers/DonorsController.ts#L1009-L1025)).
Guest is missing `phone` and `designation`. The consumer,
[VolunteersAll.vue](badhan-frontend/src/views/Statistics/VolunteersAll.vue), sorts by
`logCount` and shows a per-volunteer table — so guest rows render with blank columns.

### C. Message mismatches

These matter because the frontend surfaces `response.data.message` verbatim as a success
toast (and, for duplicate-check, as inline validation text).

| Route | Real message | Guest message |
| --- | --- | --- |
| `PATCH /donors/comment` | `Comment updated successfully` | `Comment posted successfully` |
| `GET /log` | `Logs fetched successfully` | `All logs fetched successfully` |
| `GET /donors/checkDuplicate` | `No duplicate donors found` / `Donor found with duplicate phone number in <hall> hall` / `… You are not permitted to access this donor.` | `Duplicate donor found` |

#### C1. `checkDuplicate` also hard-codes `found: true`

[GuestController.ts:598-628](badhan-backend/src/tsoaControllers/GuestController.ts). The
consumer [NewPersonCard.vue:150-157](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L150-L157)
uses `found` as a **vuelidate validator return** (`return !response.data.found`). With
`found` permanently `true`, a guest can never pass phone validation, so **guest single-donor
creation is permanently blocked** even though `POST /guest/donors` exists and works. The
real route has three outcomes; the guest fake must be able to produce the not-found one.

### D. Orphan guest routes

#### D1. `GET /guest/volunteers`

The real route is `GET /volunteers/all` ([VolunteersController.ts:15](badhan-backend/src/tsoaControllers/VolunteersController.ts#L15))
and returns `{ …, data: [...] }`. The guest route is at `/guest/volunteers` and returns
`{ …, volunteerList: [...] }`. Neither path nor payload key matches, and **no frontend code
calls either one** — `VolunteersAll.vue` uses `/donors/designation/all` instead.

#### D2. `GET /guest/admins`

No real counterpart anywhere in the backend, and no frontend caller. Pure dead code.

### E. Untested guest routes

Five of the 36 guest routes have **no guest test at all**:

| Guest route | Authenticated twin is tested? |
| --- | --- |
| `GET /guest/activeDonors` | yes — [activeDonors/success.test.js:20-24](badhan-backend-test/tests/activeDonors/success.test.js#L20-L24) validates it against `activeDonorSearchResultSchema` |
| `DELETE /guest/users/signout/all` | yes — `users/signOut/success.test.js` |
| `DELETE /guest/log` | yes — `logs/log/success.test.js` via `operations.deleteLogs` |
| `GET /guest/volunteers` | n/a (orphan, see D1) |
| `GET /guest/admins` | n/a (orphan, see D2) |

The first row is the direct cause of **B1**: the authed test *does* validate
`GET /activeDonors` against the schema, and [activeDonors/guest.test.js](badhan-backend-test/tests/activeDonors/guest.test.js)
covers only POST and DELETE. The asymmetry is the bug.

---

## F. Guest test-suite consistency (audited separately)

The 23 existing guest tests were audited against their authenticated counterparts. The
**good news**: schemas are genuinely shared — `tests/lib/schemas/*.js` are thin barrel
re-exports of `tests/<domain>/schemas.js`
(e.g. [lib/schemas/activeDonors.js](badhan-backend-test/tests/lib/schemas/activeDonors.js)
is one line: `module.exports = require('../../activeDonors/schemas')`), so there is **no
duplicate-schema drift**. Guest and authed tests validate against the same objects. That
convention is sound and should be preserved.

The problems are elsewhere.

### F1. No test anywhere asserts the HTTP status code — only the body's `statusCode`

`grep` for `.status).toBe` / `expect(res.status` across the whole suite returns **nothing**.
Every schema pins the *body* field (`statusCode: { const: HTTP_STATUS.CREATED }`), but
`validateSchema` ([lib/http.js:5-10](badhan-backend-test/tests/lib/http.js#L5-L10)) only ever
sees `response.data`. A guest route that returns HTTP 200 with a body saying
`statusCode: 201` passes every test.

This is not theoretical. The frontend branches on the **HTTP** status, not the body:

- `login` — [store/auth.ts:186](badhan-frontend/src/store/auth.ts#L186):
  `if (signInResponse.status !== HTTP_STATUS.CREATED) return false`
- `redirectionLogin` — [store/auth.ts:130](badhan-frontend/src/store/auth.ts#L130)
- `goToWebClicked` — [AppBar.vue:270](badhan-frontend/src/components/AppShell/AppBar.vue#L270)

So a guest handler that forgets `this.setStatus(HTTP_STATUS.CREATED)` silently breaks guest
login while the whole test suite stays green. The four new guest routes in Phase 1 that
return 201 are exactly the risk surface.

### F2. `postActiveDonorSchema` / `deleteActiveDonorSchema` have no `required` arrays

[activeDonors/schemas.js:2-40](badhan-backend-test/tests/activeDonors/schemas.js#L2-L40) —
neither the top-level object nor the nested `newActiveDonor` / `removedActiveDonor` objects
declare `required`. With `additionalProperties: false` but no `required`, a response of
`{}` validates cleanly. These are the *only* two schemas in the suite missing it — every
other domain schema has it at both levels. `activeDonors/guest.test.js` rests entirely on
these two, so it currently proves almost nothing.

### F3. Guest tests never assert `message`

No guest test compares `response.data.message` to a literal — every schema says only
`message: { type: 'string' }`. All three **C-findings** (`Comment posted successfully`,
`All logs fetched successfully`, `Duplicate donor found`) were invisible to the suite for
exactly this reason. Since the frontend renders these strings as toasts, message equality
is a real contract, not cosmetics.

### F4. Guest tests assert nothing about content, where authed tests do

Compare the two search tests:

- authed [lib/operations/search.js:22-30](badhan-backend-test/tests/lib/operations/search.js#L22-L30) —
  validates the schema **and** asserts `foundIds.sort()` equals the expected donor IDs.
- guest [donors/searchDonors/guest.test.js](badhan-backend-test/tests/donors/searchDonors/guest.test.js) —
  passes `totalItems = null`, so `minItems`/`maxItems` are omitted and an **empty array
  passes**.

Same pattern in `fetchDonorsNew.guest.test.js`, whose only extra assertion is
`expect(Array.isArray(res.data.donors)).toBe(true)`. Guest routes returning `[]` — a
plausible faker regression — would pass. Guest fakes have random lengths, so exact counts
aren't assertable, but `minItems: 1` is.

### F5. Dead / misleading code in three guest tests

- [searchDonors/guest.test.js:1](badhan-backend-test/tests/donors/searchDonors/guest.test.js#L1)
  imports `searchSchema` and **never uses it** — the schema actually applied comes from
  inside `guestSearchDonors`.
- [patchDonorsComment.guest.test.js](badhan-backend-test/tests/donors/patchDonorsComment/patchDonorsComment.guest.test.js)
  calls `operations.guestPatchDonorComment()` with **no schema argument**, so the helper's
  internal `validateSchema` is skipped — yet the comment in the file claims *"Schema
  validation happens inside helper"*. The manual `validateSchema` on the next line is what
  actually does the work. The comment is wrong and the two "optional/if needed" comment
  lines are leftovers.
- [postDonorsPassword.guest.test.js](badhan-backend-test/tests/donors/postDonorsPassword/postDonorsPassword.guest.test.js)
  validates **twice** — `guestIssueDonorPassword(passwordSchema)` already validates, then
  the test validates again with the same schema.

### F6. Three different styles for the same job

| Style | Files |
| --- | --- |
| `operations.guestX(...)` domain helper | `fetchDonors`, `fetchDonorsNew`, `searchDonors`, `patchDonorsComment`, `postDonorsPassword` |
| `guestGet`/`guestPost`/… generic helper | `activeDonors`, `callRecords`, `donations`, `publicContacts`, `users/*`, `donorsPostPatchDelete` |
| raw `badhanAxios` + `validate()` | [logs/getLogs.guest.test.js](badhan-backend-test/tests/logs/getLogs.guest.test.js), [logs/logStatistics.guest.test.js](badhan-backend-test/tests/logs/logStatistics.guest.test.js) |

The third style bypasses `lib/http.js` entirely and is the only one that hand-rolls
`expect(validationResult.errors).toEqual([])`. (The same legacy style also survives in the
authed `users/*/success.test.js` files.) Related smaller inconsistencies:

- **Import paths**: `require('../../lib')` (donorsPostPatchDelete, users/*) vs
  `require('../lib/operations')` (activeDonors, donations) vs `require('../../lib/operations')`
  (donors/*) — three spellings for two barrels.
- **File naming**: `guest.test.js` in `activeDonors/`, `callRecords/`, `publicContacts/`,
  `users/*/` vs `<route>.guest.test.js` in `donations/`, `logs/`, `plateletDonations/`,
  `donors/*/`.
- **Test titles**: mostly `'<VERB>/guest/<path>: guest'`, but
  `patchDonorsDesignation.guest.test.js` says `'PATCH/donors/designation: guest'` — missing
  the `/guest` prefix, so it reads like the authed test.

### F7. Guest error paths are entirely untested — and that is arguably correct

`expectGuestError` exists in [lib/http.js:98](badhan-backend-test/tests/lib/http.js#L98) and
is used by `common/*` tests, but those exercise **real** routes' 400/404/500 handling via
the `/guest`-free paths. No test asserts what `/guest/...` does with bad input — because
guest handlers deliberately carry **no validation middleware** and always succeed. This
should be **stated as an explicit policy** in the test suite rather than left as an
apparent gap, so a future contributor doesn't "fix" it by bolting validators onto the guest
controller.

---

## Decisions to make before implementing

**D1 — redirection in guest mode.** Two options; recommend **(a)**.

  (a) **Add both guest routes *and* hide the buttons.** Add `POST/PATCH /guest/users/redirection`
      for API-surface completeness, *and* wire the already-declared-but-unused
      `isGuestEnabled` computed into the `AppBar.vue` "Go to web" and `Home.vue`
      "Download in mobile" templates with `v-if="!isGuestEnabled"`. Rationale: the new tab
      that `goToWebClicked` opens is **not** in guest mode, so even a perfect guest fake
      produces a broken cross-tab flow. Hiding the button is the only way the feature reads
      as "not part of the demo" rather than "broken".

  (b) Add the guest routes only, and accept a dead-end second tab.

**D2 — `checkDuplicate` guest behaviour.** Recommend: randomise via
`faker.getBoolean()` between the *found* branch (message
`Donor found with duplicate phone number in <random hall> hall`, `found: true`, donor
object) and the *not-found* branch (`No duplicate donors found`, `found: false`,
`donor: null`), weighted toward not-found (e.g. ~75%) so guest donor creation is usually
possible. A hard-coded `found: false` would also unblock creation but would hide the
duplicate-warning UI from the demo entirely.

**D3 — orphan routes.** Recommend: **delete** `GET /guest/admins` (D2) and **retarget**
`GET /guest/volunteers` → `GET /guest/volunteers/all` returning `data` (D1), matching the
real route, rather than deleting it — cheap, and it keeps `/guest` a faithful mirror of the
API surface.

---

## Implementation plan

Everything backend-side lands in
[GuestController.ts](badhan-backend/src/tsoaControllers/GuestController.ts) plus
[doc/faker.ts](badhan-backend/src/doc/faker.ts); tests land in `badhan-backend-test/tests`.
All commands run in Docker per [CLAUDE.md](CLAUDE.md).

### Phase 0 — faker helpers

Add to [doc/faker.ts](badhan-backend/src/doc/faker.ts):

- `getHallName()` → a hall name string, for the `checkDuplicate` message. Reuse the same
  hall-name list the backend's `halls` constant uses (imported by `DonorsController`) so
  the message text is drawn from the real vocabulary.
- `getMonthlyCounts(startDate, endDate)` → `[{ month, year, count }]` covering **every**
  month in the inclusive range, with random counts. Used by both report fakes and by the
  bar-chart fake.
- `getYearMonthCountMap()` → `{ [year]: { [month]: count } }` for `GET /log/donations`,
  covering roughly the last 3 years.

### Phase 1 — add the six missing guest routes

In `GuestController`, each `@Hidden()`, each mirroring its real twin's success status code
and message string exactly:

1. `@Get('donors/phone')` → `{ …, donors: [{ phone, donorId }] }`, ~5–15 entries, message
   `Existing donors fetched successfully`. Sprinkle a couple of `'FORBIDDEN'` sentinels so
   the CSV screen's forbidden-row rendering is exercised.
2. `@Get('log/donations')` → `{ …, countByYearMonth }`, message
   `Donation logs fetched successfully`.
3. `@Get('donations/report')` with `@Query() startDate: number, @Query() endDate: number`
   → `report` (one entry per blood group, counts spanning the requested range),
   `firstDonationCount`, `hallwiseReport` keyed `0..6`. Message
   `Donations report generated successfully`.
4. `@Get('platelet-donations/report')` — same, with `firstPlateletDonationCount`. Message
   `Platelet donations report generated successfully`.
5. `@Post('users/redirection')` → 201, `{ …, token }`, message `Redirection token created`.
6. `@Patch('users/redirection')` → 201, `{ …, token, donor }`, message
   `Redirected login successful`. Reuse the same donor object builder as
   `viewDonorDetailsSelf`.

For 3 and 4, the guest handler must **accept and use** the query params (unlike most guest
handlers, which take none) so the generated months line up with the frontend's table walk.

### Phase 2 — fix the field mismatches

- `getActiveDonors`: add `plateletDonationCount: faker.getDonationCount()`,
  `lastPlateletDonation: faker.getTimestamp(240)`, `callCountLast3Days: faker.getRandomIndex(3)`.
- `searchDonors`: add `callCountLast3Days: faker.getRandomIndex(3)`.
- `viewAllVolunteers`: add `phone: faker.getPhone()` and `designation: faker.getDesignation()`
  to each `data` entry.

### Phase 3 — fix the messages and `checkDuplicate`

- `comment` → `Comment updated successfully`.
- `getLogs` → `Logs fetched successfully`.
- `checkDuplicateDonor` → per **D2**, branch on `faker.getBoolean()`-style randomness and
  emit the matching message/`found`/`donor` triple.

### Phase 4 — orphans (per D3)

- Delete `showHallAdmins` (`GET /guest/admins`).
- Move `viewVolunteersOfOwnHall` to `@Get('volunteers/all')` and rename its payload key
  `volunteerList` → `data`, with entries matching `VolunteersController`'s `@Example`
  (`_id, name, phone, hall, designation`).

### Phase 5 — frontend guards (per D1a)

- [AppBar.vue](badhan-frontend/src/components/AppShell/AppBar.vue): add
  `v-if="!isGuestEnabled"` to the "Go to web" list item — this finally *uses* the
  already-declared computed at line 236.
- [Home.vue](badhan-frontend/src/views/Home.vue): same for the "Download in mobile" button
  (line ~128 computed).
- Also fix the latent bug at
  [Home.vue:434](badhan-frontend/src/views/Home.vue#L434): `this.$store.dispatch(...)` is
  **not awaited**, so `redirectionTokenResponse.status` is read off a Promise and is always
  `undefined`. Add the missing `await`.

### Phase 6 — new guest tests (coverage)

Backend (`docker compose run --rm backend-test …`). The rule to follow: **a new guest test
must import the exact same schema object the authenticated test imports** — the existing
barrel convention (`tests/lib/schemas/*` → `tests/<domain>/schemas.js`) already makes this
easy; keep it. Add:

- `tests/donors/fetchDonorsPhone/fetchDonorsPhone.guest.test.js` — new shared
  `donorsPhoneSchema` in `tests/donors/schemas.js`, used by both the authed and guest tests.
- `tests/logs/logsDonations.guest.test.js` — shared `logsDonationsSchema` in
  `tests/logs/schemas.js`.
- `tests/donations/report/report.guest.test.js` and
  `tests/plateletDonations/report/report.guest.test.js` — reuse the existing
  `getReportsSchema` / `getPlateletDonationReportsSchema`, including their `hallwiseReport`
  requirements.
- `tests/users/redirection/guest.test.js` — reuse `postUsersRedirectionSchema` /
  `patchUsersRedirectionSchema` from `tests/users/redirection/schemas.js`.
- **Close the five E-gaps**: extend `tests/activeDonors/guest.test.js` to cover
  `GET /guest/activeDonors` against `activeDonorSearchResultSchema` (this is what would
  have caught B1); extend `tests/users/signOut/guest.test.js` to cover
  `DELETE /guest/users/signout/all`; add `tests/logs/deleteLogs.guest.test.js`
  (`deleteLogsSchema`); add a guest test for the retargeted `GET /guest/volunteers/all`
  reusing the `VolunteersController` shape.
- `tests/donors/fetchAllDesignatedDonors/*.guest.test.js` — tighten the shared
  `allDesignatedDonorSchema` to `required: [… 'phone', 'designation']` so B3 stays fixed.

### Phase 6b — fix the guest test suite itself (per section F)

These are independent of the route work and can land first; each one converts a class of
silent failure into a loud one.

1. **F1 — assert HTTP status.** Add an optional `expectedStatus` to the four `guest*` and
   four `authed*` helpers in [lib/http.js](badhan-backend-test/tests/lib/http.js), asserting
   `expect(response.status).toBe(expectedStatus)`. Better: derive it from the schema —
   every schema already pins `statusCode: { const: N }`, so `validateSchema` can additionally
   assert `response.status === schema.properties.statusCode.const` whenever that const
   exists. That is a **one-place change that retro-fits status assertions to the entire
   suite**, guest and authed, with no per-test edits.
2. **F2 — add `required` to `postActiveDonorSchema` and `deleteActiveDonorSchema`**, at both
   the top level (`['status','statusCode','message','newActiveDonor']`) and inside the
   nested object (`['_id','donorId','markerId','time']`), matching every other domain schema.
3. **F3 — assert messages.** Add a `expectMessage(response, literal)` helper and use it for
   the three C-row routes in **both** the authed and guest test, so the strings cannot drift
   apart again. Extend to the six new routes from Phase 1.
4. **F4 — assert non-emptiness.** Pass `minItems: 1` for guest collection responses:
   `guestSearchDonors(params, 1)`, and add `expect(res.data.donors.length).toBeGreaterThan(0)`
   to `fetchDonorsNew.guest.test.js`. Guest fakes always return ≥1 item by construction, so
   this is safe and catches faker regressions.
5. **F5 — remove the dead code**: drop the unused `searchSchema` import in
   `searchDonors/guest.test.js`; in `patchDonorsComment.guest.test.js` pass the schema into
   `guestPatchDonorComment(patchCommentSchema)` and delete the three misleading comment
   lines; drop the duplicate `validateSchema` call in `postDonorsPassword.guest.test.js`.
6. **F6 — one style.** Convert the two raw-`badhanAxios` log tests to `guestGet`, adding
   `guestGetLogs` / `guestGetLogStatistics` / `guestDeleteLogs` to
   [lib/operations/logs.js](badhan-backend-test/tests/lib/operations/logs.js) alongside the
   existing authed helpers. Standardise on `require('../../lib/operations')`, on the
   `<route>.guest.test.js` filename form, and on the `'<VERB>/guest/<path>: guest'` title
   form (fixing `patchDonorsDesignation.guest.test.js`, which is missing its `/guest`
   prefix). Optionally do the same for the legacy `users/*/success.test.js` files.
7. **F7 — document the policy.** A short comment block at the top of
   [lib/http.js](badhan-backend-test/tests/lib/http.js) stating that `/guest` routes carry
   no validation, auth, or rate-limiting middleware by design, always succeed, and are
   therefore never tested for error responses — `expectGuestError` is for exercising the
   *real* routes' error paths without a token.

Frontend/Cypress (`docker compose run --rm frontend-test …`): add a guest-mode smoke spec
that logs in as guest and visits, in order — Home (search) → a donor's details → Statistics
▸ Report (Generate Report) → Statistics ▸ Logs → Statistics ▸ Volunteers → CSV donor
creation (upload a small fixture) → single donor creation (phone duplicate check) — and
asserts **zero error toasts** throughout. That is the real acceptance test for this plan.

### Phase 7 — regenerate + verify

```
docker compose exec backend npm run tsoa:routes
docker compose exec backend npx tsc --noEmit
docker compose exec frontend npm run build
docker compose run --rm backend-test <test cmd>
docker compose run --rm frontend-test <test cmd>
```

`tsoa:routes` is mandatory — new decorated methods do not exist until
[tsoaRoutes/routes.ts](badhan-backend/src/tsoaRoutes/routes.ts) is regenerated.

---

## Guardrail against future drift

The root cause is that guest fakes are hand-written literals with **no compile-time or
test-time link** to their real twin. Two cheap, durable options — recommend the first:

1. **Test-level (low cost, high value, no production risk).** Make the shared-JSON-Schema
   convention a hard rule, and add a single meta-test that walks
   [tsoaRoutes/routes.ts](badhan-backend/src/tsoaRoutes/routes.ts), collects every
   registered path, and asserts that **every non-`/guest` path that appears in
   `badhan-frontend/src/api/index.ts` has a `/guest` twin**. That one test would have caught
   all six A-findings, and it fails loudly the next time someone adds a route without a
   guest fake.

2. **Type-level (larger refactor).** Replace the `Promise<{ … donor: any }>` return
   annotations on both sides with shared exported response interfaces
   (`GETDonorsResponse`, `GETDonationsReportResponse`, …) that both the real and guest
   controllers implement. Kills the `any`s, makes field omissions a `tsc` error, and
   improves the generated OpenAPI docs — but touches all 13 controllers.

## Acceptance criteria

**Routes**
- No route reachable from [api/index.ts](badhan-frontend/src/api/index.ts) 404s in guest mode.
- Every guest response validates against the **same** JSON Schema object as its authenticated twin.
- Success messages are byte-identical between each guest route and its real twin.
- HTTP status codes match between each guest route and its real twin (201 vs 200).
- A guest can complete: search → donor details → create donor → CSV upload → generate report
  → view logs → view volunteers, with no error toast.
- `GET /guest/admins` is gone; `GET /guest/volunteers/all` mirrors `GET /volunteers/all`.
- The route-parity meta-test passes.

**Tests**
- Every guest route has a guest test (36 routes, 36 covered — currently 31/36).
- `validateSchema` asserts the HTTP status wherever the schema pins `statusCode`.
- No schema in the suite is missing a `required` array.
- Every guest test goes through `lib/http.js`; no test constructs `badhanAxios` calls directly.
- Guest test filenames, import paths, and titles follow one convention each.
