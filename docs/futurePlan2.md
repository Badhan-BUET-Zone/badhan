# Plan 3: Replace hardcoded numeric values with named constants

## Goal

Remove the magic numbers scattered through the backend and frontend — designation
levels, hall codes, blood groups, and the `hall > 6` / `hall === 8` idioms — and
replace them with named constants that already largely exist but are barely used.
Pure refactor: **no behaviour change, no API change**.

## The core finding

**The constants already exist and are almost entirely unused.**

Both codebases define identical `HALLS_INDEX` and `DESIGNATIONS_INDEX` maps —
[badhan-backend/src/constants/index.ts](badhan-backend/src/constants/index.ts) and
[badhan-frontend/src/mixins/constants.ts](badhan-frontend/src/mixins/constants.ts):

```ts
export const HALLS_INDEX = { AHSANUALLAH: 0, CHATRI: 1, NAZRUL: 2, RASHID: 3,
  SHEREBANGLA: 4, SUHRAWARDY: 5, TITUMIR: 6, ATTACHED: 7, UNKNOWN: 8 }
export const DESIGNATIONS_INDEX = { DONOR: 0, VOLUNTEER: 1, HALL_ADMIN: 2, SUPER_ADMIN: 3 }
```

Yet in the backend they are referenced in only **three files** — `constants/index.ts`
itself plus `db/test/populate.ts` and `db/test/clearDatabase.ts`. **Not one controller
or middleware uses them.** In the frontend they appear in five views, while the
components doing the actual permission logic use raw numbers.

Meanwhile the raw numeric comparisons number roughly **29 designation comparisons and
21 hall comparisons in `badhan-backend/src`**, and about **23 designation comparisons
in `badhan-frontend/src`**. So the work is mostly mechanical substitution, not
designing something new.

## What is hardcoded today

### 1. Designation levels (`0` donor, `1` volunteer, `2` hall admin, `3` super admin)

```ts
// middlewares/authenticate.ts:66,73
if (res.locals.middlewareResponse.donor.designation === 3) { return next() }
if (res.locals.middlewareResponse.donor.designation < 2) { … }

// AdminsController.ts:48,66,118,125,128
if (targetDonor.designation !== 1) { … }
targetDonor.designation = 2
if (targetDonor.designation !== 1 && targetDonor.designation !== 3) { … }
```

Appears across `authenticate.ts`, `DonorsController.ts`, `AdminsController.ts`,
`ActiveDonorsController.ts`, `CallRecordsController.ts`, `SearchController.ts`.

### 2. Hall codes, and the two idioms built on them

The genuinely confusing ones — these are not simple constants but **encoded rules**:

| Idiom | Occurrences | What it actually means |
|---|---|---|
| `hall <= 6` | ~10 | "is a real, hall-restricted hall" (0–6), as opposed to Attached/Unknown |
| `hall > 6` | ~5 | "has no meaningful hall" (Attached=7 or Unknown=8) |
| `hall === 8` | ~4 | "hall unknown → force `availableToAll`" |
| `hall !== 7 && hall !== 8` | frontend | same as `hall <= 6`, written differently |

```ts
// repeated near-verbatim in at least 6 places
if (targetDonor.hall <= 6 && user.hall !== targetDonor.hall && user.designation !== 3) {
  return { status: 'ERROR', statusCode: 403, message: 'You are not authorized to access a donor of different hall' }
}
```

This block is the single most duplicated piece of logic in the backend — see §4.

### 3. Validator literal arrays

[validateBody.ts](badhan-backend/src/validations/validateRequest/validateBody.ts) and
[validateQuery.ts](badhan-backend/src/validations/validateRequest/validateQuery.ts):

```ts
.isIn([0, 1, 2, 3, 4, 5, 6, 7])          // blood groups
.isIn([-1, 0, 2, 4, 6])                   // public-contact blood groups
.isIn([0, 1, 2, 3, 4, 5, 6, 8])           // allowed halls — note: no 7
.isIn([-1, 0, 1, 2, 3, 4, 5, 6, 7])       // blood groups, or -1 for "any"
.custom(… [0,1,2,4,5,6,8,10,11,12,15,16,17,18].includes(…))  // department codes
```

The hall array silently omits `7` (Attached) — a real rule that reads as a typo. The
department list is an unexplained set of integers duplicated from the `departments`
array's non-`NULL` positions.

### 4. Other magic values

- Blood group `-1` = "any/unspecified" in queries.
- `year2000TimeStamp` — already a constant, and correctly used for placeholder
  donations. Good precedent for the rest.
- HTTP status codes are written as literals (`this.setStatus(403)`) throughout. Q4 asks
  whether those are in scope; my recommendation is **no**.

## Proposed refactor

### Step 1 — Extend the constants module (backend)

Add to [badhan-backend/src/constants/index.ts](badhan-backend/src/constants/index.ts):

```ts
// Blood groups
export const BLOOD_GROUPS_INDEX = { A_POS: 0, A_NEG: 1, B_POS: 2, B_NEG: 3,
  O_POS: 4, O_NEG: 5, AB_POS: 6, AB_NEG: 7 } as const
export const BLOOD_GROUP_ANY = -1

// Derived sets — single source of truth for the validators
export const HALL_INDICES_ALL      = [0,1,2,3,4,5,6,7,8]
export const HALL_INDICES_ALLOWED_FOR_DONOR = [0,1,2,3,4,5,6,8]   // Attached (7) excluded
export const BLOOD_GROUP_INDICES   = [0,1,2,3,4,5,6,7]
export const DEPARTMENT_CODES      = [0,1,2,4,5,6,8,10,11,12,15,16,17,18]

// The two encoded rules, named
export const isHallRestricted = (hall: number): boolean => hall <= HALLS_INDEX.TITUMIR
export const hasNoSpecificHall = (hall: number): boolean => hall > HALLS_INDEX.TITUMIR
```

Naming the `hall <= 6` boundary as `HALLS_INDEX.TITUMIR` is honest but ugly — it ties
the rule to whichever hall happens to sit last in the list. Q2 proposes the
alternative: an explicit `LAST_RESIDENTIAL_HALL` constant, or a
`RESIDENTIAL_HALL_INDICES` array with `.includes()`.

Change `Record<string, number>` to `as const` so the maps become literal types rather
than open-ended records, giving real type-checking at the call sites.

### Step 2 — Substitute in the backend, file by file

| File | Roughly |
|---|---|
| `middlewares/authenticate.ts` | 4 designation comparisons, 1 hall block |
| `tsoaControllers/DonorsController.ts` | ~12 designation, ~8 hall |
| `tsoaControllers/AdminsController.ts` | 5 designation, 1 hall |
| `tsoaControllers/ActiveDonorsController.ts` | 3 hall/designation blocks |
| `tsoaControllers/CallRecordsController.ts` | 2 blocks |
| `tsoaControllers/SearchController.ts` | 1 block |
| `validations/validateRequest/validateBody.ts` | 4 literal arrays |
| `validations/validateRequest/validateQuery.ts` | 2 literal arrays |
| `db/interfaces/donorInterface.ts` | hall/designation comparisons inside aggregations |

Note the aggregation pipelines embed the numbers inside Mongo query objects
(`{ $gt: ['$hall', 6] }` in
[donorInterface.ts:685-701](badhan-backend/src/db/interfaces/donorInterface.ts#L685-L701)) —
these substitute fine but must be read carefully, since a wrong edit there changes query
semantics silently rather than failing to compile.

### Step 3 — Same substitution in the frontend

[PersonDetails.vue:657-671](badhan-frontend/src/components/PersonDetails.vue#L657-L671) is the
worst offender — five computed properties, each a single-line boolean mixing
`designation === 3`, `halls.indexOf(this.hall) <= 6`, and `=== 8`. Also
[Filters.vue:222](badhan-frontend/src/components/Filters.vue#L222) and
[Home.vue:215](badhan-frontend/src/views/Home.vue#L215), which contain the same
`!== 7 && !== 8` expression duplicated verbatim.

The frontend's `constants.ts` gets the same additions as the backend's, keeping the two
files mirror images (Q3 asks whether they should instead be shared).

### Step 4 (optional, recommended) — Extract the duplicated permission block

The `hall <= 6 && user.hall !== target.hall && user.designation !== 3` block appears at
least six times, near-verbatim, with the same 403 message. Once the constants land, it
should collapse into one helper:

```ts
const canAccessDonorOfHall = (user: IDonor, target: IDonor): boolean =>
  hasNoSpecificHall(target.hall) ||
  user.hall === target.hall ||
  user.designation === DESIGNATIONS_INDEX.SUPER_ADMIN
```

This is the change that actually pays for the refactor — the constants make the
duplication visible, the helper removes it. But it is a behaviour-carrying edit rather
than a pure rename, so Q1 asks whether to include it in the same pass or split it out.

## Verification strategy

This refactor has no tests of its own — its correctness claim is that **behaviour is
unchanged**, so the existing suites are the safety net:

1. `badhan-backend-test` (Jest/API) — the permission specs under `tests/donors/`,
   `tests/activeDonors/`, `tests/callRecords/` exercise exactly the hall/designation
   rules being touched. These must pass unchanged, with no edits to the specs.
2. `badhan-frontend-test` (Cypress) — covers the promote/demote and search flows that
   depend on the frontend comparisons.
3. TypeScript build in both projects — with `as const` maps, a mistyped constant name
   becomes a compile error rather than a silent `undefined` comparison.

**If any test needs modifying to pass, the refactor has changed behaviour and the edit
is wrong.** That rule is the whole verification story.

Suggested sequencing: land the constants module first (additive, zero risk), then one
substitution PR per file or small group, so a regression bisects to a small diff.

---

## Open questions — please answer inline

**Q1. Pure substitution only, or also extract the duplicated permission helper?**
Step 4 removes a block duplicated ~6 times, which is the real win — but it changes
control flow rather than just names, so a mistake there is a permission bug rather than
a compile error. Do it in the same pass, or land the constants first and extract
afterwards as a separate reviewable change?
> **Answer:**

**Q2. How should the `hall <= 6` rule be named?**
Options: (a) `isHallRestricted(hall)` / `hasNoSpecificHall(hall)` helper functions
(planned), (b) a `LAST_RESIDENTIAL_HALL = HALLS_INDEX.TITUMIR` constant with the
comparisons left inline, or (c) a `RESIDENTIAL_HALL_INDICES` array queried with
`.includes()`. Option (a) reads best at the call sites; (c) is the most robust if a hall
is ever added in the middle of the list.
> **Answer:**

**Q3. Should the backend and frontend share one constants source?**
`constants/index.ts` and `mixins/constants.ts` are currently near-identical copies that
must be kept in sync by hand — and they can silently drift, which would be a real bug
since these numbers cross the API boundary. Extract to a shared package, keep the
duplication with a "keep in sync" comment, or generate the frontend copy from the
backend's tsoa spec?
> **Answer:**

**Q4. Are HTTP status codes in scope?**
`this.setStatus(403)` / `statusCode: 409` are literals everywhere. Naming them
(`HTTP.FORBIDDEN`) is arguably less readable than the numbers, which are universally
understood. I recommend leaving them alone — confirm?
> **Answer:**

**Q5. Should `AHSANUALLAH` be corrected to `AHSANULLAH`?**
The key is misspelled in both `HALLS_INDEX` maps (the display string `'Ahsanullah'` is
correct). Fixing it is trivial now, while there are only a handful of references, but
it touches both codebases at once.
> **Answer:**

**Q6. Should the validators derive their arrays from the constants, or stay literal?**
Deriving (`.isIn(HALL_INDICES_ALLOWED_FOR_DONOR)`) removes the duplication and
documents *why* `7` is missing. The counter-argument: validator arrays are a public API
contract, and a constant that changes would silently widen or narrow what the API
accepts. Derive, or keep them literal with an explanatory comment?
> **Answer:**

**Q7. Does the department-code list belong here too?**
`[0,1,2,4,5,6,8,10,11,12,15,16,17,18]` in the studentId validator is really "the indices
of the `departments` array that are not `NULL`" and could be computed from it rather
than hand-listed. Worth deriving, or too clever?
> **Answer:**

**Q8. Do the test projects need the same treatment?**
`badhan-backend-test` and `badhan-frontend-test` build donor fixtures with raw numbers
too. Include them in this refactor, or leave the test data literal on the grounds that
tests should state values explicitly rather than through indirection?
> **Answer:**
