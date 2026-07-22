# Plan 3: Replace hardcoded numeric values with named constants

## Goal

Remove the magic numbers scattered through the backend and frontend — designation
levels, hall codes, blood groups, HTTP status codes, and the `hall > 6` / `hall === 8`
idioms — and replace them with named constants that already largely exist but are barely
used. Pure refactor: **no behaviour change, no API change**.

## Specifications

These are settled. The steps below implement them; where a step and a spec disagree, the
spec wins.

**S1 — Renames only, with three named exceptions.** This pass substitutes names for numbers
and does nothing else. No consolidation of duplicated logic — extracting the duplicated
permission block is a real improvement but is explicitly deferred to its own change, since
a mistake there is a permission bug that compiles cleanly, whereas a mistake in a rename is
a build failure.

The three permitted shape changes, all of which are provably value-preserving and all of
which exist to *increase* how many call sites use the named helpers:

- **S1a** — `x !== 7 && x !== 8` collapses to `isHallRestricted(x)` (see S9). Identical
  truth table; the alternative leaves three frontend sites spelled differently from every
  other hall check in the codebase.
- **S1b** — a numeric literal inside a Vue template is replaced by a constant or helper
  exposed on the component (see S11). This adds a `data`/`methods` entry but does not alter
  the expression's logic.
- **S1c** — `halls.slice(0, 7)` collapses to `restrictedHallNames()` (see S13). The `7`
  there is an exclusive slice bound naming no hall, so no constant substitution alone can
  remove it.

**S2 — The three hall idioms become three helpers.** `hall <= 6` → `isHallRestricted(hall)`,
`hall > 6` → `hasNoSpecificHall(hall)`, `hall === 8` → `isHallUnknown(hall)`. Helper
functions, not a bare `LAST_RESIDENTIAL_HALL` constant and not a
`RESIDENTIAL_HALL_INDICES.includes()` array — the helpers read best at the ~19 call
sites, and they confine the "last hall in the list" fragility to their definitions.

**S3 — Each project keeps its own hand-maintained constants file.** No shared package, no
generation from the tsoa spec. Three copies, not two:

| File | Project |
|---|---|
| `badhan-backend/src/constants/index.ts` | backend |
| `badhan-frontend/src/mixins/constants.ts` | frontend |
| `badhan-backend-test/tests/lib/utils/constants.js` | backend tests (new, see S10) |

They are **not** required to be exact mirror images — each carries only what its project
uses (S12). The known cost is silent drift across the API boundary; the mitigation is a
cross-reference comment in all three files naming the other two, not tooling.

`badhan-frontend-test/cypress/support/constants.ts` already exists and is **not** a fourth
copy: it is keyed by hall *name strings*, not indices, and serves a different purpose. It
is untouched by this refactor except for the S5 typo fix, and gets no cross-reference
comment.

**S4 — HTTP status codes are in scope.** All three literal shapes (`this.setStatus(n)`,
`statusCode: n`, `res.status(n)`) become `HTTP_STATUS.*`. This is ~419 sites in
`badhan-backend/src`, ~64 in `badhan-backend-test`, and **~62 in `badhan-frontend/src`**
— the largest group in the refactor by volume, and the lowest in risk.

The frontend's are a fourth shape the original survey undercounted: axios response guards
(`if (response.status !== 200) return`) in `PersonDetails.vue`, `PersonCardNew.vue`,
`AppBar.vue` and most views. **All 62 are in scope.**

**S5 — The `AHSANUALLAH` key is corrected to `AHSANULLAH` everywhere it appears**, as the
first commit, before any step multiplies its references. That is three files today:
`badhan-backend/src/constants/index.ts`, `badhan-frontend/src/mixins/constants.ts`, and
`badhan-frontend-test/cypress/support/constants.ts` (plus its one call site in
`cypress/e2e/donors/promote-to-volunteer-and-hall-admin.cy.ts`). If a grep turns up more,
they are in scope too — the rule is "everywhere", not "these three".

**S6 — Validators derive their arrays from the constants** rather than restating literals
(`.isIn(HALL_INDICES_ALLOWED_FOR_DONOR)`). Because these arrays are an API contract, the
derivations must reproduce today's accepted sets exactly; any derivation that would widen
or narrow one is wrong, and S7 is the case where that bites. The five derivations, settled:

| Today | Becomes |
|---|---|
| `.isIn([0, 1, 2, 3, 4, 5, 6, 7])` | `.isIn(BLOOD_GROUP_INDICES)` |
| `.isIn([-1, 0, 1, 2, 3, 4, 5, 6, 7])` | `.isIn([BLOOD_GROUP_ANY, ...BLOOD_GROUP_INDICES])` |
| `.isIn([-1, 0, 2, 4, 6])` | `.isIn([BLOOD_GROUP_ANY, ...BLOOD_GROUP_INDICES_POSITIVE])` |
| `.isIn([0, 1, 2, 3, 4, 5, 6, 8])` | `.isIn(HALL_INDICES_ALLOWED_FOR_DONOR)` |
| `[0,1,2,4,5,6,8,10,11,12,15,16,17,18].includes(…)` | `DEPARTMENT_CODES_FOR_VALIDATION.includes(…)` |

The `-1` spread form is deliberate — no further named constants for the two combined sets.

**S7 — Department codes derive into two constants, each named for its purpose.**
`DEPARTMENT_CODES_WITH_NAMES` is the honest derivation from the `departments` array's
non-`NULL` positions. `DEPARTMENT_CODES_FOR_VALIDATION` is that set plus the anomalous
`0`, and is **the one every validator uses** — the name is the instruction, so no call
site has to guess which list is correct. See Step 1 for why a single list would be a
behaviour change.

**S8 — The test projects are in scope.** `badhan-backend-test` and `badhan-frontend-test`
get the same substitution. This changes the verification story materially, since the
specs can no longer serve as a frozen oracle — see the two-phase rule under Verification.

**S9 — Call sites are found by grep, not by the tables in this document.** Every file table
below is *indicative*. The authoritative scope is whatever a grep for the numeric idioms
turns up in a project's source. Files the original survey missed but which are in scope
include `DonationsController.ts` (two `hall <= 6` blocks),
`PlateletDonationsController.ts`, `UsersController.ts`, `GuestController.ts`,
`VolunteersController.ts`, `db/interfaces/callRecordInterface.ts`, and — in the frontend —
`views/SingleDonorCreation/components/NewPersonCard.vue` and the `halls.slice(0, 7)` /
`halls[8]` expressions in `PersonDetails.vue`.

**Exclusions.** A grep hit in any of the following is *not* a call site:

- **Generated files.** `badhan-backend/src/tsoaRoutes/routes.ts` contains designation
  references but is emitted by `tsoa routes`; edits there are overwritten on the next
  generation. Same for any other generated artefact.
- **Mongo projection and `select` objects.** In `{ _id: 1, name: 1, hall: 1, designation: 1 }`
  the `1` means *include this field*, not `CHATRI` or `VOLUNTEER`. Substituting would be a
  semantic error that still compiles and still passes types. Applies to `select:`,
  `$project:` and projection arguments throughout `db/interfaces/` and the controllers.
  The inverse holds: genuine filters such as `DonorModel.find({ designation: 1 })`
  ([donorInterface.ts:384](badhan-backend/src/db/interfaces/donorInterface.ts#L384)) **are**
  in scope, so read each object for which kind it is rather than matching on shape.
- **tsoa `@Example` / `@Response` decorator bodies.** The ~30 sites carrying `hall: 5` or
  `designation: 3` as OpenAPI sample payloads are documentation, not logic, and stay as
  literals. (Their `statusCode:` fields are still substituted by Step 2b, which is
  shape-blind and safe.)
- **`badhan-backend/src/doc/`**, including `faker.ts`. `db/test/factories/donorFactory.ts`
  was listed above in an earlier draft but holds no literals of its own — it delegates to
  `faker.getHall()` / `faker.getDesignation()`, and `doc/` is out of scope, so the factory
  is out of scope with it.
- **`archive/`, `deploy/`, and `badhan-automated-form/`** (a single Python file).

**S10 — `badhan-backend-test` gets a third constants copy** at
`badhan-backend-test/tests/lib/utils/constants.js`, alongside the existing `helpers.js` and
`builders.js`. CommonJS, exporting only what the tests actually use: **`HALLS_INDEX` and
`HTTP_STATUS`, and nothing else.**

`DESIGNATIONS_INDEX` is deliberately **not** exported there. The project has 76 `hall: <n>`
literals and 64 `statusCode: { const: n }` assertions but **zero** substitutable designation
literals — every `designation` mention is a JSON-schema type declaration
(`designation: { type: 'integer' }`) or a URL path. Exporting it would violate S12.

Because this project is plain JavaScript with no compile-time safety net, it also gets
`tests/lib/utils/constants.test.js` — a smoke test asserting every value of every exported
map is a number and that each map has the expected key count (**9 halls, 8 status codes;
two maps, not three**). That is the whole mitigation; no `Object.freeze` + Proxy, no lint rule.

**S11 — Vue templates are in scope, via exposed constants.** Numeric literals in `<script>`
blocks *and* in templates are replaced. Templates cannot see module imports, so each
component imports what it needs and exposes it the way `PersonDetails.vue` already exposes
`halls` — added to the object returned by `data()`, or to `methods` for the hall helpers.
This is the existing idiom in the codebase, not new machinery.

**S12 — Constants are defined where they are used; unused exports are not mirrored across
projects.** The one deliberate exception is `DEPARTMENT_CODES_WITH_NAMES` in the backend,
which is defined despite having no call site today because its existence is what makes the
`0` in `DEPARTMENT_CODES_FOR_VALIDATION` visibly anomalous (S7). Everywhere else, if a
project has no call site for a constant, that project does not define it — notably the
frontend, which has no validators and therefore gets neither department constant, and
`badhan-backend-test`, which gets no `DESIGNATIONS_INDEX` (S10).

`HALL_INDICES_ALL` is a further case: it has no call site of its own and exists only to
feed the `HALL_INDICES_ALLOWED_FOR_DONOR` filter, so it stays a **module-local `const`,
unexported**.

**S13 — `halls.slice(0, 7)` becomes a `restrictedHallNames` helper.** Four sites —
[Filters.vue:232](badhan-frontend/src/components/Filters.vue#L232),
[Home.vue:134](badhan-frontend/src/views/Home.vue#L134),
[PersonDetails.vue:721](badhan-frontend/src/components/PersonDetails.vue#L721),
[NewPersonCard.vue:227](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L227).
The `7` there is an *exclusive slice bound*, so it names neither a hall nor the `TITUMIR`
boundary the helpers use; leaving it as `HALLS_INDEX.ATTACHED` or `TITUMIR + 1` would just
relocate the puzzle. Instead the frontend `constants.ts` exports:

```ts
export const restrictedHallNames = (): string[] => halls.slice(0, HALLS_INDEX.ATTACHED)
```

and the four sites call it. The two `halls[8]` neighbours become
`halls[HALLS_INDEX.UNKNOWN]`, so `[...halls.slice(0, 7), halls[8]]` reads
`[...restrictedHallNames(), halls[HALLS_INDEX.UNKNOWN]]`. This is a third permitted shape
change alongside S1a and S1b, on the same grounds: value-preserving, and it removes a
literal that no constant name could otherwise carry.

**S14 — Blood-group `-1` gets a different name in each project, because it means different
things.** The backend's is a query wildcard
([donorInterface.ts:601](badhan-backend/src/db/interfaces/donorInterface.ts#L601)) and is
named `BLOOD_GROUP_ANY`. The frontend's two sites are not that:

| Site | Today | Constant |
|---|---|---|
| [mixins/filters.ts:10](badhan-frontend/src/mixins/filters.ts#L10) | `-1` renders as `'All Negative'` | `BLOOD_GROUP_ALL_NEGATIVE` |
| [utils/donorCsv.ts:120](badhan-frontend/src/utils/donorCsv.ts#L120) | `-1` means "not a recognised blood group" | `BLOOD_GROUP_UNRECOGNISED` |

Three names for one numeric value is intentional: each says what its call site actually
means, and a single `BLOOD_GROUP_ANY` would make the `filters.ts` line read as a
contradiction. If that divergence is itself a latent bug, it is now visible — flag it,
don't fix it here.

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

With HTTP status codes now in scope, the volume shifts decisively: ~419 status literals
in `badhan-backend/src` against ~50 hall/designation comparisons. The status work is the
bulk of the diff but carries almost none of the risk — which is why the plan keeps the
two in separate commit series rather than sweeping them together.

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
| `hall !== 7 && hall !== 8` | frontend, 3 sites | same as `hall <= 6`, written differently — collapses to `isHallRestricted` per S1a |

```ts
// repeated near-verbatim in at least 6 places
if (targetDonor.hall <= 6 && user.hall !== targetDonor.hall && user.designation !== 3) {
  return { status: 'ERROR', statusCode: 403, message: 'You are not authorized to access a donor of different hall' }
}
```

This block is the single most duplicated piece of logic in the backend. Per S1 it is
spelled with constants here but **not** consolidated — see "Out of scope" below.

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
department list is an unexplained set of integers *approximately* duplicated from the
`departments` array's non-`NULL` positions: it also contains `0`, which is a `'NULL'`
slot. Step 1 splits this into `DEPARTMENT_CODES_WITH_NAMES` and
`DEPARTMENT_CODES_FOR_VALIDATION` rather than papering over the difference.

### 4. Other magic values

- Blood group `-1` = "any/unspecified" in queries.
- `year2000TimeStamp` — already a constant, and correctly used for placeholder
  donations. Good precedent for the rest.
- HTTP status codes are written as literals throughout, in three shapes —
  `this.setStatus(403)`, `statusCode: 403`, and `res.status(403)`. **These are in scope**
  (S4). They are by far the largest group: ~419 occurrences in `badhan-backend/src`
  alone, across all thirteen tsoa controllers.

  | Code | `setStatus` | `statusCode:` | `res.status` | Total |
  |---|---|---|---|---|
  | 200 | 36 | 101 | 1 | 138 |
  | 404 | 26 | 45 | 2 | 73 |
  | 500 | 25 | 37 | 3 | 65 |
  | 403 | 19 | 33 | 4 | 56 |
  | 201 | 18 | 28 | — | 46 |
  | 409 | 10 | 17 | — | 27 |
  | 401 | 2 | 4 | 2 | 8 |
  | 400 | 1 | 2 | 3 | 6 |

  A further ~64 appear in `badhan-backend-test` as JSON-schema assertions
  (`statusCode: { const: 404 }`), and ~10 in `badhan-frontend/src`.

## Proposed refactor

### Step 1 — Extend the constants module (backend)

Add to [badhan-backend/src/constants/index.ts](badhan-backend/src/constants/index.ts):

```ts
// Blood groups
export const BLOOD_GROUPS_INDEX = { A_POS: 0, A_NEG: 1, B_POS: 2, B_NEG: 3,
  O_POS: 4, O_NEG: 5, AB_POS: 6, AB_NEG: 7 } as const
export const BLOOD_GROUP_ANY = -1

// Derived sets — single source of truth for the validators (S6)
export const HALL_INDICES_ALL = Object.values(HALLS_INDEX)
export const HALL_INDICES_ALLOWED_FOR_DONOR =                     // Attached (7) excluded
  HALL_INDICES_ALL.filter(h => h !== HALLS_INDEX.ATTACHED)
export const BLOOD_GROUP_INDICES = Object.values(BLOOD_GROUPS_INDEX)

// The public-contact rule: Rh-positive groups only. Listed by name, NOT derived from
// index parity — "even index means Rh-positive" is a coincidence of the ordering, and
// deriving from it would encode a rule nobody wrote down.
export const BLOOD_GROUP_INDICES_POSITIVE = [
  BLOOD_GROUPS_INDEX.A_POS, BLOOD_GROUPS_INDEX.B_POS,
  BLOOD_GROUPS_INDEX.O_POS, BLOOD_GROUPS_INDEX.AB_POS]

// Departments that actually exist: the non-NULL positions of `departments` (S7).
// NOT for validation — see below.
export const DEPARTMENT_CODES_WITH_NAMES =
  departments.flatMap((name, index) => name === 'NULL' ? [] : [index])

// >>> The list every studentId validator uses. <<<
// Deliberately wider than DEPARTMENT_CODES_WITH_NAMES: code 0 has no department
// name but is accepted today, so it is preserved rather than silently dropped.
export const DEPARTMENT_CODES_FOR_VALIDATION = [0, ...DEPARTMENT_CODES_WITH_NAMES]

// The three encoded rules, named (S2)
export const isHallRestricted = (hall: number): boolean => hall <= HALLS_INDEX.TITUMIR
export const hasNoSpecificHall = (hall: number): boolean => hall > HALLS_INDEX.TITUMIR
export const isHallUnknown = (hall: number): boolean => hall === HALLS_INDEX.UNKNOWN

// HTTP status codes (S4)
export const HTTP_STATUS = { OK: 200, CREATED: 201, BAD_REQUEST: 400,
  UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500 } as const
```

Naming the `hall <= 6` boundary as `HALLS_INDEX.TITUMIR` ties the rule to whichever hall
happens to sit last in the list, which is a real fragility — but per S2 the helpers are the
chosen form, so the fragility is confined to these three lines rather than spread across
~19 call sites. If a hall is ever inserted mid-list, only these definitions need revisiting.

Change `Record<string, number>` to `as const` so the maps become literal types rather
than open-ended records, giving real type-checking at the call sites. Verified safe:
nothing in either project indexes these maps dynamically (`HALLS_INDEX[someVar]`), so the
narrowing breaks no existing consumer. **This applies to the frontend's `constants.ts`
too**, not just the backend's.

The narrowing has one consequence to absorb: `Object.values(HALLS_INDEX)` on an `as const`
map types as `(0 | 1 | … | 8)[]`, not `number[]`. Every derived array therefore carries an
**explicit `: number[]` annotation** — `HALL_INDICES_ALLOWED_FOR_DONOR: number[]`,
`BLOOD_GROUP_INDICES: number[]`, both department arrays, and so on — so the exported
surface stays stable and a later addition to a map cannot change a consumer's inferred type.

> **⚠ Why there are two department lists.** The hand-written validator array is
> `[0, 1, 2, 4, 5, 6, 8, 10, 11, 12, 15, 16, 17, 18]`, but `departments[0]` is `'NULL'`.
> The non-`NULL` positions are `[1, 2, 4, 5, 6, 8, 10, 11, 12, 15, 16, 17, 18]` — code
> `0` is accepted by the validator today despite having no department name. A single
> derived list would therefore **narrow** what the API accepts and start rejecting student
> IDs with department code `00`, which is a behaviour change this refactor is not allowed
> to make.
>
> So the derivation stays clean, the anomaly is quarantined in its own constant, and both
> names say which is which:
>
> | Constant | Means | Use for |
> |---|---|---|
> | `DEPARTMENT_CODES_WITH_NAMES` | departments that actually exist (non-`NULL` slots) | display, pickers, anything enumerating real departments |
> | `DEPARTMENT_CODES_FOR_VALIDATION` | the above **plus `0`** | **every validator — this is the one** |
>
> Validators use `DEPARTMENT_CODES_FOR_VALIDATION`, which preserves today's behaviour
> exactly. Picking the other one at a validator site would reject department code `00` and
> is the single most likely way to get this step wrong — hence `_FOR_VALIDATION` in the
> name rather than a vaguer `_ACCEPTED` or `_ALL`.
>
> The payoff is that the oddity is now visible and named rather than buried in a literal
> array: deleting the `0` from `DEPARTMENT_CODES_FOR_VALIDATION` is a one-line, obviously
> behaviour-changing edit whenever someone decides code `00` should be rejected. Whether
> it should be is a separate question for a separate change — flag it, don't fix it here.

Note also that this list is duplicated in a second place the original survey missed:
[db/models/Donor.ts:121](badhan-backend/src/db/models/Donor.ts#L121), a mongoose
validator with the identical array. Both call sites — that one and
[validateBody.ts:35](badhan-backend/src/validations/validateRequest/validateBody.ts#L35) —
use `DEPARTMENT_CODES_FOR_VALIDATION`, since both are validators.

Also fix the `AHSANUALLAH` → `AHSANULLAH` misspelling in `HALLS_INDEX` (S5), in both
codebases. Do this as the very first commit, while the references are still only in
`constants/index.ts`, `db/test/populate.ts`, `db/test/clearDatabase.ts` and five frontend
views — every later step adds new references to the correct name, so fixing it first
avoids a second sweep.

### Step 2 — Substitute in the backend, file by file

Per S9 this table is indicative; grep is authoritative. Files marked † were missing from
the original survey and are in scope.

| File | Roughly |
|---|---|
| `middlewares/authenticate.ts` | 4 designation comparisons, 1 hall block |
| `tsoaControllers/DonorsController.ts` | ~12 designation, ~8 hall |
| `tsoaControllers/AdminsController.ts` | 5 designation, 1 hall |
| `tsoaControllers/ActiveDonorsController.ts` | 3 hall/designation blocks |
| `tsoaControllers/CallRecordsController.ts` | 2 blocks |
| `tsoaControllers/SearchController.ts` | 1 block |
| `tsoaControllers/DonationsController.ts` † | 2 `hall <= 6` permission blocks |
| `tsoaControllers/PlateletDonationsController.ts` † | hall/designation comparisons |
| `tsoaControllers/UsersController.ts` † | designation comparisons |
| `tsoaControllers/GuestController.ts` † | designation comparisons |
| `tsoaControllers/VolunteersController.ts` † | designation comparisons |
| `validations/validateRequest/validateBody.ts` | 4 literal arrays |
| `validations/validateRequest/validateQuery.ts` | 2 literal arrays |
| `db/interfaces/donorInterface.ts` | hall/designation comparisons inside aggregations |
| `db/interfaces/callRecordInterface.ts` † | designation comparisons |
| `db/models/Donor.ts` | department-code array (mongoose validator) |

Excluded per S9: `tsoaRoutes/routes.ts` (tsoa-generated), `doc/` and the
`db/test/factories/` fixtures that draw from it, projection/`select` objects, and
`@Example` / `@Response` decorator bodies.

Note the aggregation pipelines embed the numbers inside Mongo query objects
(`{ $gt: ['$hall', 6] }` in
[donorInterface.ts:685-701](badhan-backend/src/db/interfaces/donorInterface.ts#L685-L701)) —
these substitute fine but must be read carefully, since a wrong edit there changes query
semantics silently rather than failing to compile. The `isHallRestricted` helper does
**not** apply inside a pipeline: it takes a `number`, not a field reference, so these
sites use `HALLS_INDEX.TITUMIR` inline (`{ $gt: ['$hall', HALLS_INDEX.TITUMIR] }`).

### Step 2b — HTTP status codes across all thirteen controllers

Per S4 this is in scope, and it is the bulk of the mechanical work: ~419 sites, versus
~50 for halls and designations combined. Keep it in its own commits, separate from the
hall/designation substitution — mixing them makes every diff unreviewable, and the two
have completely different risk profiles.

The status set is exactly the eight codes in the table above — verified, with counts
matching. No 204/422/429/503 appears anywhere in either project, and nothing is added
pre-emptively.

| File group | Roughly |
|---|---|
| all 13 `tsoaControllers/*.ts` | `this.setStatus(n)` and `statusCode: n` pairs |
| `middlewares/*`, route handlers | `res.status(n)` |

Two properties make this the safest step in the plan despite the volume: the replacement
is context-free (`403` always means `HTTP_STATUS.FORBIDDEN`, with no rule encoded in the
number), and `setStatus`/`statusCode` are typed, so a wrong constant name fails the
build. The one thing to watch is that `setStatus(n)` and the `statusCode: n` in the
returned body must stay equal to each other at each site — they are set independently
today, so substitute them as pairs and don't assume they always matched.

### Step 3 — Same substitution in the frontend

[PersonDetails.vue:657-671](badhan-frontend/src/components/PersonDetails.vue#L657-L671) is the
worst offender — five computed properties, each a single-line boolean mixing
`designation === 3`, `halls.indexOf(this.hall) <= 6`, and `=== 8`. The
`!== 7 && !== 8` expression is duplicated verbatim across three files:
[Filters.vue:222](badhan-frontend/src/components/Filters.vue#L222),
[Home.vue:215](badhan-frontend/src/views/Home.vue#L215) and
[NewPersonCard.vue:181](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L181).
Per S1a all three collapse to `isHallRestricted(halls.indexOf(hall))`.

**Templates are in scope too (S11).** `PersonDetails.vue` carries numeric literals outside
the computed properties — `v-if="designation === 0"`
([:73-75](badhan-frontend/src/components/PersonDetails.vue#L73-L75)),
`designation === 2 || designation === 1`
([:141](badhan-frontend/src/components/PersonDetails.vue#L141)),
`halls.indexOf(hall)===8` ([:143](badhan-frontend/src/components/PersonDetails.vue#L143)),
and the `halls.slice(0, 7)` / `halls[8]` expressions at
[:721-723](badhan-frontend/src/components/PersonDetails.vue#L721-L723).
`NewPersonCard.vue:80` has the same `===8` checkbox condition.

The exposure mechanism already exists in the file: `PersonDetails.vue` imports `halls` from
`@/mixins/constants` and returns it from `data()`
([:472](badhan-frontend/src/components/PersonDetails.vue#L472),
[:543](badhan-frontend/src/components/PersonDetails.vue#L543)). Follow that idiom —
`DESIGNATIONS_INDEX` and `HALLS_INDEX` join the `data()` object, the hall helpers go on
`methods` — rather than inventing a global mixin.

The frontend's `constants.ts` gets the same additions as the backend's *minus what it does
not use* (S12): `HTTP_STATUS` (covering ~62 status literals in `badhan-frontend/src`, S4), the
blood-group constants (under the S14 names), the three hall helpers and `restrictedHallNames`
(S13), but **neither department constant** —
the frontend has no validators. Its `DEPARTMENT_CODES_WITH_NAMES` derivation would also
differ from the backend's, since the frontend array uses a `nullDepartment` constant as its
sentinel rather than a literal `'NULL'`; if a call site for it ever appears, filter on
`nullDepartment`.

Per S3 the files stay separate hand-maintained copies; no shared package, no generation
from the tsoa spec. Since drift across the API boundary is the real hazard here, add a
header comment to each of the three files naming the other two as its counterparts, so the
next person editing one knows where the others are.

### Step 4 — The test projects

Per S8, `badhan-backend-test` and `badhan-frontend-test` are in scope.

- **`badhan-backend-test`** — first add the constants module required by S10:
  `tests/lib/utils/constants.js`, CommonJS, exporting `HALLS_INDEX`,
  and `HTTP_STATUS` only — no `DESIGNATIONS_INDEX`, which has no call site there (S10).
  Then substitute: ~64 status-code
  assertions written as JSON schemas (`statusCode: { const: 404 }`) become
  `{ const: HTTP_STATUS.NOT_FOUND }`, and donor fixtures carrying raw `hall: 1` /
  `hall: 2` / `hall: 5` values (~76 sites) become `HALLS_INDEX.CHATRI` and friends.

  This project is JavaScript, not TypeScript, so there is **no compile-time safety net
  here** — a typo'd constant name yields `undefined` and an assertion that silently stops
  asserting what it used to. The mitigation is the S10 smoke test,
  `tests/lib/utils/constants.test.js`: assert every value of every exported map is a
  number, and that each map has its expected key count (9 halls, 4 designations, 8 status
  codes). That is sufficient; no `Object.freeze` + Proxy, no custom lint rule.
- **`badhan-frontend-test`** (Cypress) — contains no hall/designation numeric literals;
  nothing to substitute beyond any status codes it asserts on.

### Out of scope — extracting the duplicated permission block

The `hall <= 6 && user.hall !== target.hall && user.designation !== 3` block appears at
least six times, near-verbatim, with the same 403 message, and could collapse into one
`canAccessDonorOfHall` helper. Per S1 this is **deferred to a separate change**: it
rewrites control flow rather than renaming, so a mistake is a permission bug that
compiles cleanly, and it deserves its own small reviewable diff. This pass leaves the six
copies in place — spelled with named constants, which is what makes the duplication
obvious enough to remove next.

## Verification strategy

This refactor has no tests of its own — its correctness claim is that **behaviour is
unchanged**, so the existing suites are the safety net:

1. `badhan-backend-test` (Jest/API) — the permission specs under `tests/donors/`,
   `tests/activeDonors/`, `tests/callRecords/` exercise exactly the hall/designation
   rules being touched.
2. `badhan-frontend-test` (Cypress) — covers the promote/demote and search flows that
   depend on the frontend comparisons.
3. TypeScript build in both projects — with `as const` maps, a mistyped constant name
   becomes a compile error rather than a silent `undefined` comparison. Note this does
   **not** cover `badhan-backend-test`, which is plain JavaScript.

The natural rule for a pure refactor is *"if any test needs modifying to pass, the edit
is wrong."* S8 makes that unstatable on its own, since the tests are themselves being
edited. It is therefore split into a two-phase rule that preserves the same guarantee by
never letting `src` and the specs move at the same time.

**Phase A — refactor `src`, tests frozen.** Steps 1 through 3 (sequencing steps 1–5) touch application code
only. Throughout, the specs stay byte-for-byte unchanged and must pass. Here the natural
rule holds in full force: *if a spec needs modifying to pass, the refactor has changed
behaviour and the edit is wrong.*

**Phase B — refactor the tests, `src` frozen.** Only after Phase A is complete and green,
Step 4 substitutes constants into the test projects, with **no application-code changes
in the same commits**. The rule inverts: *the suite must stay green without touching
`src`, and every edit must be value-preserving* — `404` → `HTTP_STATUS.NOT_FOUND`,
`hall: 1` → `hall: HALLS_INDEX.CHATRI`, and nothing else. Any test that starts passing,
starts failing, or changes what it asserts means the substitution was wrong.

The ordering matters and is not negotiable: editing `src` and the specs in the same pass
would let a behaviour change in one be masked by a matching change in the other — exactly
the failure the frozen-tests rule exists to prevent.

### How the suites are actually run (S15)

Both suites run as one-off containers under the `test` compose profile, with the dev stack
already up. Per the [README](README.md):

```
docker compose --profile test run --build --rm backend-test     # Jest / API
docker compose --profile test run --build --rm frontend-test    # Cypress
```

`--build` is mandatory. The test images bake the test code in at build time, so omitting it
reuses a stale image and produces failures that came from old code rather than from the
change under test.

**Running the suites is the verification.** `npm run lint && npm run build` is a useful
local smoke check but is not the gate, and is not sufficient on its own.

- **After each backend change reaches a stable point, run the backend suite.** Green before
  moving on; a red suite is fixed or reverted, never carried forward into the next step.
- **For each frontend step, run the frontend suite once**, at the end of that step.

Expected baselines from the README: 46 backend suites / 73 tests passing, and all Cypress
specs passing. Establish the baseline *before* the first edit, so a pre-existing failure is
never mistaken for a regression this refactor introduced.

### Sequencing — one commit per step

Each step is a single commit, and each commit must be independently green by the rule above.

1. `AHSANULLAH` typo fix, everywhere (tiny, isolated — S5).
2. Constants module — backend then frontend (additive, zero risk).
3. Hall/designation substitution in the backend.
4. HTTP status substitution — high volume, low risk, kept apart so it never shares a diff
   with the permission logic.
5. Frontend substitution.
6. Test-project substitution (Phase B), last.

Steps 1–5 are Phase A; a regression in any of them bisects to a single step's diff. The
order is not negotiable; how these commits are eventually reviewed or shipped is outside
the scope of this plan.

