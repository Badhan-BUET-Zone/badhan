# Plan 3: Hall dropdown ("All Halls" + per-hall) on the Donations Report

## Goal

Add a **hall selector** to the statistics report page (`#/statistics/report`) so a super
admin can view a **hall-wise report**. The dropdown lists the halls plus an **"All Halls"**
option at the top. Selecting a hall switches both the Whole Blood and Platelet tables (and
the first-time-donation counts) to that hall; **"All Halls"** shows the full population —
identical to today's behaviour.

**Design (revised):** each report endpoint returns **everything in one call** — the
all-halls report *and* a per-hall breakdown. The frontend fetches once (on "Generate
Report"), caches the response, and the dropdown just switches which slice is displayed —
**no refetch on hall change**. The change spans frontend (`DonationReport.vue`), backend
(both report controllers + the aggregation interfaces), and tests (Jest + Cypress). No
request-parameter or validator changes are needed.

## Current state (investigated)

### Frontend — the report page

[DonationReport.vue](badhan-frontend/src/views/Statistics/DonationReport.vue)
(route `report`, name `DonationsReport`, Super-Admin-only —
[router/index.ts:163-173](badhan-frontend/src/router/index.ts#L163-L173), also self-guards
in `mounted()`).

- Two `DatePicker`s (`startDate` / `endDate`) + a "Generate Report" button; renders two
  `v-simple-table`s (Whole Blood, Platelet) plus two first-time-donor counts.
- `generateReport()` ([DonationReport.vue:102](badhan-frontend/src/views/Statistics/DonationReport.vue#L102))
  calls two api wrappers with **only `startDate` / `endDate`**:
  ```js
  const response  = await handleGETDonationsReport({ startDate, endDate })            // :109
  const pResponse = await handleGETPlateletDonationsReport({ startDate, endDate })    // :166
  ```
- No hall input of any kind exists on this page.

### Halls & the reusable dropdown

- Halls are a **static frontend constant**, indexed by array position —
  [constants.ts:16-27](badhan-frontend/src/mixins/constants.ts#L16-L27):
  `halls = ['Ahsanullah', …, 'Suhrawardy', 'Titumir', 'Attached', '(Unknown)']`.
  The array index **is** the hall id sent to the backend; a name is converted back with
  `halls.indexOf(name)`.
- Reusable select: [Selector.vue](badhan-frontend/src/components/UI Components/Selector.vue)
  (`BadhanSelector`, wraps Vuetify `v-select`; props `id`, `dataCy`, `value`, `items`,
  `label`, `disabled`, `clearable`; `v-model` via `value`/`input`).
- Existing hall-dropdown pattern to mirror —
  [Filters.vue:86-95](badhan-frontend/src/components/Filters.vue#L86-L95): a `Selector`
  bound to a hall name, with `items` = hall names, converted to an index on use.

### API layer

[api/index.ts:456-478](badhan-frontend/src/api/index.ts#L456-L478):
```ts
export interface GETDonationsReportPayloadInterface { startDate: number, endDate: number }
const handleGETDonationsReport = async (payload) =>
  badhanAxios.get('/donations/report', { params: payload })

export interface GETPlateletDonationsReportPayloadInterface { startDate: number, endDate: number }
const handleGETPlateletDonationsReport = async (payload) =>
  badhanAxios.get('/platelet-donations/report', { params: payload })
```
Params are passed straight through as query string. Closest existing **hall-as-query-param**
precedent: the active-donors search
([api/index.ts:595-605](badhan-frontend/src/api/index.ts#L595-L605)) sends `hall: number`.

### Backend — the two report routes

- Whole blood: `GET /donations/report`
  ([DonationsController.ts:181-222](badhan-backend/src/tsoaControllers/DonationsController.ts#L181-L222)),
  `@Query() startDate`, `@Query() endDate`, validator
  `donationValidator.validateGETDonationsReport`, Super-Admin-guarded. Delegates to
  `getDonationCountByTimePeriod(startDate, endDate)` and
  `getCountOfDonorsWhoDonatedForTheFirstTime(startDate, endDate)`.
- Platelet: `GET /platelet-donations/report`
  ([PlateletDonationsController.ts:127-152+](badhan-backend/src/tsoaControllers/PlateletDonationsController.ts#L127))
  — same shape, delegates to `getPlateletDonationCountByTimePeriod(...)` (+ its own
  first-time count).
- The whole-blood aggregation
  ([donationInterface.ts](badhan-backend/src/db/interfaces/donationInterface.ts))
  already `$lookup`s the `donors` collection and `$unwind`s to `$donor`, so **adding `hall`
  to the `$group` key** yields a per-hall breakdown in one query. The platelet interface and
  the first-time-count functions ([donorInterface.ts](badhan-backend/src/db/interfaces/donorInterface.ts))
  get analogous grouped-by-hall variants.

## Implemented design

### API response shape (one call returns everything)

Both routes keep their existing `startDate`/`endDate` query params (no new params, no
validator changes) and add a `hallwiseReport` field alongside the existing all-halls
`report` / first-time count:

```
GET /donations/report → {
  status, statusCode, message,
  report: [{ bloodGroup, counts: [{ month, year, count }] }],   // all halls (unchanged)
  firstDonationCount: number,                                    // all halls (unchanged)
  hallwiseReport: {                                              // NEW
    [hallIndex]: { report: [...], firstDonationCount: number }
  }
}
```

`GET /platelet-donations/report` is identical with `firstPlateletDonationCount` instead.
Halls with no donations in the range are simply **absent** from `hallwiseReport` (the
frontend treats a missing hall as empty → all-zero rows).

### 1. Backend — aggregations
([donationInterface.ts](badhan-backend/src/db/interfaces/donationInterface.ts),
[plateletDonationInterface.ts](badhan-backend/src/db/interfaces/plateletDonationInterface.ts),
[donorInterface.ts](badhan-backend/src/db/interfaces/donorInterface.ts))

The existing all-halls functions are **unchanged**. Four **new** grouped-by-hall functions
were added, each running one aggregation and returning a hall-keyed map:

- `getDonationCountByTimePeriodGroupedByHall(start, end)` → `Record<hall, report[]>` — adds
  `hall` to the `$group` key, then reshapes to `{ hall, report:[{bloodGroup, counts}] }`.
- `getPlateletDonationCountByTimePeriodGroupedByHall(start, end)` — same for platelets.
- `getCountOfDonorsWhoDonatedForTheFirstTimeGroupedByHall(start, end)` → `Record<hall, count>`
  — keeps the donor's `hall` (`$first`) through the first-donation-time computation, then
  `$group` by hall.
- `getCountOfDonorsWhoDonatedPlateletForTheFirstTimeGroupedByHall(start, end)` — same for
  platelets.

### 2. Backend — controllers
([DonationsController.ts](badhan-backend/src/tsoaControllers/DonationsController.ts),
[PlateletDonationsController.ts](badhan-backend/src/tsoaControllers/PlateletDonationsController.ts))

Each report method now also calls the two grouped functions and merges them into a single
hall-keyed `hallwiseReport` map (union of hall keys from both, missing values default to
`[]` / `0`), returned alongside the existing fields. Return type widened accordingly; tsoa
routes/spec regenerated. Super-Admin guard and date validation untouched.

### 3. Frontend — `DonationReport.vue`
([DonationReport.vue](badhan-frontend/src/views/Statistics/DonationReport.vue))

- A `Selector` dropdown above the date pickers, `v-model="selectedHall"` (default
  `'All Halls'`); `hallOptions` computed = `['All Halls', ...halls without 'Attached']`.
- `generateReport()` fetches **once**, caching the full responses in `wholeBloodData` /
  `plateletData`, then calls `renderSelectedHall()`.
- `buildTable(reportArray)` (extracted, shared by both tables) turns a
  `[{bloodGroup, counts}]` array into the monthly rows + Total row.
- `renderSelectedHall()` picks the display source from cache: `'All Halls'` → top-level
  `report`/count; otherwise `wholeBloodData.hallwiseReport[halls.indexOf(name)] ?? empty`.
- A `watch` on `selectedHall` re-renders from cache with **no API call**.

The api-layer payload interfaces are unchanged (no `hall` param).

### 4. Backend tests (`badhan-backend-test`)

Extend the existing report specs (whichever directory covers `GET /donations/report` +
platelet):

- **All-halls fields unchanged:** existing assertions on `report` / `firstDonationCount`
  still hold.
- **`hallwiseReport` present & correct:** seed donors in ≥2 halls with in-range donations;
  assert each hall key contains only that hall's counts, its `firstDonationCount` is
  hall-scoped, and summing the halls reconciles with the all-halls `report`.
- **Empty halls absent:** a hall with no donations does not appear as a key.
- **Permission/guest:** unchanged (Super-Admin-only, guest 401).

### 5. Frontend test (`badhan-frontend-test`)

New/extended Cypress spec (Page Object convention):

1. Sign in as the seeded super admin; open `#/statistics/report`.
2. Assert the hall dropdown (`report-hall-select`) exists, defaults to **"All Halls"** as
   the first option followed by the halls.
3. Generate a report; assert tables render. `cy.intercept` the two report calls and assert
   they fire **once** with no `hall` param.
4. Switch the dropdown to a specific hall and assert the tables/counts update **without a
   new request** (intercept count stays the same) — the hall slice comes from cache.

Test-side additions: `selectReportHall(name)` accessor on the Page Object and the
`data-cy="report-hall-select"` attribute.

### 6. Out of scope

- No new hall-list API — halls stay a frontend constant, index-addressed.
- The report hall dropdown excludes **"Attached"** (index 7), which donors are never
  assigned.
- No changes to other statistics views; auth unchanged (Super-Admin-only).
