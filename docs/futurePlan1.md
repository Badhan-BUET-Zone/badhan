# Plan 2: Fold super-admin *and* hall-admin promotion into `PATCH /donors/designation`

## Goal

Make `PATCH /donors/designation` the single route for **all** designation changes.
A **super admin can promote any donor to super admin or hall admin, and demote them back
down**; a hall admin keeps the existing `0 ↔ 1` control in their own hall. Then **delete
both dedicated routes** that do this today — `PATCH /admins/superadmin` (super admin) and
`PATCH /admins` (hall admin). Surface the super-admin capability in the frontend as a
**"Promote to Super Admin" / "Demote to Volunteer"** button, and re-wire the existing
**"Promote to Hall admin"** button onto the merged route. Backend (Jest) and frontend
(Cypress) tests accompany the change.

## Current state (investigated)

Designation codes ([constants/index.ts](badhan-backend/src/constants/index.ts)):
`0 = Donor`, `1 = Volunteer`, `2 = Hall Admin`, `3 = Super Admin`.

### The route being extended — `PATCH /donors/designation`

[DonorsController.ts:740-822](badhan-backend/src/tsoaControllers/DonorsController.ts#L740-L822)

- Body: `{ donorId: string, promoteFlag: boolean }`
  (validator `validatePATCHDonorsDesignation` = `validateBODYDonorId` +
  `validateBODYPromoteFlag`, [validations/donors.ts:47-50](badhan-backend/src/validations/donors.ts#L47-L50)).
- Middleware: `validatePATCHDonorsDesignation`, `commonLimiter`,
  `handleAuthentication`. Permission checks are **inline in the controller**, not
  middleware.
- Current behaviour is strictly a `0 ↔ 1` toggle:
  - 403 if the target's hall is `<= 6`, differs from the caller's hall, and the caller
    is not a super admin.
  - 403 if the caller's designation `< 2` (hall admin or above only).
  - **409 if the target's designation is `3`** — super admins are explicitly
    untouchable here today. Also 409 for promoting a volunteer or demoting a donor.
  - 409 if the target's hall is `> 6` ("Donor does not have a valid hall").
  - Sets designation to `1` on promote, `0` on demote.
- Logs `PATCH DONORS DESIGNATION (PROMOTE|DEMOTE)`.

### Route being deleted #1 — `PATCH /admins/superadmin` (super admin)

[AdminsController.ts:80-140](badhan-backend/src/tsoaControllers/AdminsController.ts#L80-L140)

- Body: `{ donorId: string, promoteFlag: boolean }` (validator
  `validatePATCHAdminsSuperAdmin`).
- Middleware includes `authenticator.handleSuperAdminCheck`, so only super admins can
  call it — this is the permission rule that must be carried over.
- Behaviour: 409 unless the target's designation is `1` or `3`; promote sets `3`,
  demote sets **`1` (Volunteer)**, not `0`.
- Notably it applies **no hall check at all**, unlike the designation route.
- Logs `PATCH DONORS DESIGNATION SUPERADMIN`.
- **The frontend never calls it** — there is no `api/index.ts` wrapper for
  `/admins/superadmin`. It is currently reachable only via direct API access, which is
  presumably why this work is needed.

### Route being deleted #2 — `PATCH /admins` (hall admin)

[AdminsController.ts:14-78](badhan-backend/src/tsoaControllers/AdminsController.ts#L14-L78) — method `changeAdmin`.

- Body: `{ donorId: string }` (validator `validatePATCHAdmins`).
- Middleware includes `authenticator.handleSuperAdminCheck`, so **only super admins**
  promote hall admins — carry this over.
- Behaviour: 409 unless the target's designation is `1` (volunteer); 409 if the target
  has no valid hall (`hasNoSpecificHall`); then **demotes the hall's current admin
  (designation `2`) back to volunteer** and sets the target to `2`. The
  **one-hall-admin-per-hall** side effect must be preserved.
- Logs `PATCH DONORS DESIGNATION (VOLUNTEER)`.
- Wrapped as `handlePATCHAdmins` ([api/index.ts:438](badhan-frontend/src/api/index.ts#L438))
  and called by the "Promote to Hall admin" button — this caller must be re-wired onto
  the merged route (see §4), then the wrapper deleted.

### Frontend — donor details

[PersonDetails.vue](badhan-frontend/src/components/PersonDetails.vue) already hosts the
designation buttons:

- `promoteToVolunteerButtonId` / the matching demote button → `handlePATCHDonorsDesignation`
  ([PersonDetails.vue:935-958](badhan-frontend/src/components/PersonDetails.vue#L935-L958)),
  which is the wrapper for the route being extended
  ([api/index.ts:155](badhan-frontend/src/api/index.ts#L155)).
- `promoteToHallAdminButtonId` → `handlePATCHAdmins`, shown when
  `getDesignation === 3 && designation === 1`
  ([PersonDetails.vue:275-281](badhan-frontend/src/components/PersonDetails.vue#L275-L281)).
- Visibility is computed by `isAllowedToPromoteToVolunteer` /
  `isAllowedToDemoteToDonor` ([PersonDetails.vue:657-662](badhan-frontend/src/components/PersonDetails.vue#L657-L662)).
- **The designation label has no Super Admin case** — it renders Donor / Volunteer /
  Hall Admin only ([PersonDetails.vue:73-75](badhan-frontend/src/components/PersonDetails.vue#L73-L75)), so a
  super admin currently shows as a blank designation. This must be fixed as part of
  the work.

### Existing tests

- `badhan-backend-test/tests/donors/patchDonorsDesignation/` — `success`, `permission`,
  `guest` specs for the route being extended.
- `badhan-backend-test/tests/donors/patchAdminsSuperAdmin/` — specs for the
  `/admins/superadmin` route being deleted; must be **removed or migrated**.
- `badhan-backend-test/tests/donors/patchAdmins/` — specs for the `PATCH /admins`
  hall-admin route being deleted; must be **removed or migrated**.
- `badhan-backend-test/tests/lib/operations/donors.js` contains the `superadmin` and
  `patchAdmins` request helpers used by those specs.
- No Cypress coverage of super-admin promotion exists.

## Proposed design

### 1. API shape

The current `promoteFlag: boolean` cannot express four levels, so it is replaced with an
explicit target designation.

```
PATCH /donors/designation
{ donorId: string, designation: 0 | 1 | 2 | 3 }
```

The caller states the designation the target should end up with. This is explicit,
covers all four levels (donor / volunteer / hall admin / super admin) behind one route,
and removes the "promote from what, to what?" ambiguity. It is a **breaking change to an
existing route**, so the frontend callers and the backend tests change with it.

### 2. Permission rules for the merged route

| Caller | Target's current | Allowed transitions |
|---|---|---|
| Hall admin (2), same hall | `0` | `0 → 1` (promote to volunteer) |
| Hall admin (2), same hall | `1` | `1 → 0` (demote to donor) |
| Super admin (3) | `0` | `0 → 1` |
| Super admin (3) | `1` | `1 → 0`, `1 → 2`, `1 → 3` |
| Super admin (3) | `2` | none — a hall admin is never directly demoted |
| Super admin (3) | `3` | `3 → 1` (demote to Volunteer) |
| Anyone below hall admin | any | none (403) |

The §2 table is an **exhaustive whitelist**: everything not in it is a **409** — a no-op
(`1 → 1`, `2 → 2`, …), a multi-level jump (`0 → 2`, `0 → 3`, `2 → 3`), and `3 → 0` /
`3 → 2` all 409, so hall-admin and super-admin promotion must always route through
volunteer first.

Promotion to super admin (`→ 3`) is allowed **only from a volunteer** (`1 → 3`) — as the
old `changeSuperAdmin` route required; any other source designation 409s. Demotion of a
super admin produces `1` (Volunteer), not `0`. The `→ 2` hall-admin path likewise
requires the target to be a volunteer (`1`) first.

**A hall admin (designation `2`) is never directly demoted.** There is no `2 → 1` or
`2 → 0` transition — both 409. The only way a hall admin loses designation `2` is the
side effect below: promoting a different donor to hall admin in the same hall demotes the
incumbent. This mirrors the current `PATCH /admins` behaviour and is the logic being
preserved.

Carried over from the deleted routes: **only a super admin may set or clear designation
`2` or `3`** — implemented as explicit checks inside the controller rather than
`handleSuperAdminCheck` middleware, since the route still serves hall admins for the
`0 ↔ 1` cases.

**Hall-admin transition (`→ 2`) side effect (carried from `PATCH /admins`):** promoting
a donor to hall admin **demotes that hall's current hall admin back to volunteer** — one
hall admin per hall. The target must also have a valid hall (`hasNoSpecificHall` → 409)
and be a volunteer (`1`) first.

Where the two deleted routes disagreed today, the merged route resolves as follows:

- **No hall check for the `→ 3` transition** — a super admin may promote a volunteer from
  any hall (including hall `> 6`, e.g. Unknown) to super admin, since super admin is a
  system-wide role. (The hall-admin `→ 2` transition keeps its own valid-hall check
  regardless.)
- **The `0 ↔ 1` path keeps its current valid-hall requirement.** As today, a donor with
  no valid hall (`hasNoSpecificHall`, hall `> 6`) 409s on plain promote/demote — this
  existing behaviour is unchanged. Only the `→ 3` transition is exempt from a hall check.
- **Self-demotion is allowed.** No controller guard; a super admin may demote themselves,
  even if they are the last one.

### 3. Backend changes

| # | Change | File |
|---|---|---|
| 1 | Replace `promoteFlag` with `designation` in the `@Body()` of `updateDesignation`; rewrite the transition/permission logic per §2, including the `→ 2` hall-admin path with its valid-hall check and the one-hall-admin-per-hall demotion side effect. The `0 ↔ 1` path retains the existing `hasNoSpecificHall` 409. Return **distinct 409 messages** per failure reason (see below) | [DonorsController.ts:740-822](badhan-backend/src/tsoaControllers/DonorsController.ts#L740-L822) |
| 2 | New `validateBODYDesignation` (integer, `isIn([0,1,2,3])`); swap it into `validatePATCHDonorsDesignation` | `validations/validateRequest/validateBody.ts`, `validations/donors.ts` |
| 3 | **Delete `changeSuperAdmin`** and its `@Patch('superadmin')` decorator | [AdminsController.ts:80-140](badhan-backend/src/tsoaControllers/AdminsController.ts#L80-L140) |
| 4 | **Delete `changeAdmin`** and its `@Patch()` decorator — the whole `AdminsController` becomes empty, so **delete the file entirely** ([AdminsController.ts](badhan-backend/src/tsoaControllers/AdminsController.ts)) and drop any import/registration of it. Remove anything left unused as a result (tsoa regenerates routes) | [AdminsController.ts:14-78](badhan-backend/src/tsoaControllers/AdminsController.ts#L14-L78) |
| 5 | Delete `validatePATCHAdminsSuperAdmin` **and** `validatePATCHAdmins` and their now-unused exports | [validations/donors.ts:88-91](badhan-backend/src/validations/donors.ts#L88-L91) |
| 6 | Regenerate tsoa routes/spec (`npm run build` runs tsoa) | `src/tsoaRoutes/` |
| 7 | Log line: keep a single `PATCH DONORS DESIGNATION (<from> → <to>)` entry covering all transitions, where `<from>`/`<to>` are the **raw numeric designation codes** (e.g. `1 → 3`). Match the current designation route's log call — actor id = `user._id` (the caller), payload = the full `donor` object. The `→ 2` side effect (demoting the incumbent hall admin) gets **no separate log line** — just this one entry for the target | controller |

**Distinct 409 messages** (Q4) — each whitelist-miss reason returns its own message so
the frontend notification is meaningful:

- No-op / illegal transition not otherwise covered (`1 → 1`, `2 → 1`, `2 → 0`, multi-level
  jump like `0 → 2`/`0 → 3`, `3 → 0`/`3 → 2`): `"Invalid designation transition"`.
- Promoting a non-volunteer to super admin (`→ 3` from anything but `1`):
  `"Only a volunteer can be promoted to super admin"`.
- Promoting a non-volunteer to hall admin (`→ 2` from anything but `1`):
  `"Only a volunteer can be promoted to hall admin"`.
- Target has no valid hall on the `→ 2` or `0 ↔ 1` path: `"Donor does not have a valid hall"`.

(Exact strings may be refined during implementation, but keep them distinct per reason.)

**Response body** (Q5): all transitions return only `{ status, statusCode, message }` —
the merged route does **not** echo the updated `donor` (unlike the old `changeSuperAdmin`).

### 4. Frontend changes

**Donor details ([PersonDetails.vue](badhan-frontend/src/components/PersonDetails.vue))**

- **Re-wire the existing "Promote to Hall admin" button** (`promoteToHallAdminButtonId`,
  shown when `getDesignation === 3 && designation === 1`): it currently calls
  `handlePATCHAdmins`; change it to call the designation route with `designation: 2`.
  Keep the same visibility condition.
- Add a **`promoteToSuperAdminButtonId`** button, visible when the viewer is a super
  admin and the target is a **volunteer** (`designation === 1`) — matching the
  volunteer-only promotion rule. Calls the designation route with `designation: 3`.
- Add a **`demoteFromSuperAdminButtonId`** button, visible when the viewer is a super
  admin and the target **is** a super admin (`designation === 3`). Label **"Demote to
  Volunteer"**, sending `designation: 1`.
- Exactly one of the two renders for any given target, mirroring the existing
  promote/demote volunteer pair.
- **Not** hidden on self-view: a super admin viewing their own profile still sees
  "Demote to Volunteer", since self-demotion is allowed.
- New computed properties `isAllowedToPromoteToSuperAdmin` /
  `isAllowedToDemoteFromSuperAdmin` beside the existing
  `isAllowedToPromoteToVolunteer` ([PersonDetails.vue:657](badhan-frontend/src/components/PersonDetails.vue#L657)).
- On success, update the local `designation` and fire the usual
  `notification/notifySuccess`, matching `promoteClicked`
  ([PersonDetails.vue:935](badhan-frontend/src/components/PersonDetails.vue#L935)).
- **Add the missing `Super Admin` designation label** at
  [PersonDetails.vue:73-75](badhan-frontend/src/components/PersonDetails.vue#L73-L75).

**API layer ([api/index.ts](badhan-frontend/src/api/index.ts))**

- Change `PATCHDonorsDesignationPayloadInterface` from `promoteFlag: boolean` to
  `designation: number`, and update the two existing call sites
  (`promoteClicked`, `demoteClicked`) to send `1` and `0`.
- **Delete `handlePATCHAdmins` and `PATCHAdminsPayloadInterface`**
  ([api/index.ts:435-438](badhan-frontend/src/api/index.ts#L435-L438)) and remove the
  `handlePATCHAdmins` export — the hall-admin button now goes through the designation
  wrapper. No wrapper for `/admins/superadmin` exists, so nothing to delete there.

### 5. Backend tests (`badhan-backend-test`)

Mirror the existing directory convention — `success` / `permission` / `guest` specs per
route.

**Update `tests/donors/patchDonorsDesignation/`**

- Rewrite existing cases for the new `designation` body field.
- New success cases: super admin promotes a volunteer to super admin (`1 → 3`); super
  admin demotes a super admin (`3 → 1`); super admin promotes a volunteer whose hall
  is `> 6` to super admin (`1 → 3`, exercising the skipped hall check); super admin
  promotes a volunteer to hall admin (`1 → 2`) and the hall's previous hall admin is
  demoted to volunteer; super admin demotes **themselves** (`3 → 1`). Each resulting
  designation is verified by re-fetching the donor.
- New permission cases: a **hall admin** attempting `designation: 3` **or**
  `designation: 2` gets 403; a volunteer attempting anything gets 403; a guest gets 401.
- Validation cases: `designation: 2` now **accepted** (from a super admin); the
  hall-admin path 409s when the target is not a volunteer or has no valid hall;
  promoting a **non-volunteer** (donor `0` or hall admin `2`) to super admin `3` 409s
  (volunteer-only rule); **demoting a hall admin directly (`2 → 1` or `2 → 0`) 409s** — a
  hall admin is only demoted as the side effect of another donor's `→ 2` promotion;
  out-of-range and non-integer values rejected.

**Migrate then delete the old admin-route specs.** Fold the meaningful assertions from
`tests/donors/patchAdminsSuperAdmin/` **and** `tests/donors/patchAdmins/` (the hall-admin
`PATCH /admins` specs) into `patchDonorsDesignation/`, then delete both old directories
and the `superadmin` / `patchAdmins` helpers in `tests/lib/operations/donors.js` (and
their `patchAdminsSchema` / `patchAdminsSuperAdminSchema` imports). Add cases
asserting **both** deleted routes (`PATCH /admins/superadmin` and `PATCH /admins`) now
return **404**, so their removal is pinned by tests.

### 6. Frontend test (`badhan-frontend-test`)

New spec `cypress/e2e/donors/promote-super-admin.cy.ts`, following the Page Object
convention used by
[promote-to-volunteer-and-hall-admin.cy.ts](badhan-frontend-test/cypress/e2e/donors/promote-to-volunteer-and-hall-admin.cy.ts),
which is the closest existing analogue and should be read first.

Flow:

1. Sign in as a super admin — the default `AUTH_CREDENTIALS` account
   (`01500000000` / `badhandev`) is the seeded super admin.
   [clearDatabase.ts:16-45](badhan-backend/src/db/test/clearDatabase.ts#L16-L45) seeds
   exactly one user — "Mir Mahathir Mohammad", designation `SUPER_ADMIN`, hall Suhrawardy,
   phone `8801500000000`; there is **no seeded hall-admin account** (relevant to step 7).
2. Create or search a donor, open their details via `HomePage` → `ProfilePage`.
3. Promote the donor to volunteer first — promotion to super admin is allowed **only from
   a volunteer**, so `promoteToSuperAdminButtonId` only appears once the target is a
   volunteer.
4. Click `promoteToSuperAdminButtonId`; assert the success notification and that the
   designation label now reads **Super Admin**.
5. Reload the details page and assert the label persists and the button has flipped to
   `demoteFromSuperAdminButtonId`.
6. Click "Demote to Volunteer"; assert the notification and that the label returns to
   **Volunteer** (`3 → 1`).
7. Negative case: no seeded hall admin exists, so first create a donor and promote
   it to hall admin (`designation: 2`) as the super admin; then sign in as that account,
   open a donor, and assert `promoteToSuperAdminButtonId` does **not** exist.

Test-side additions: `promoteToSuperAdmin()` / `demoteFromSuperAdmin()` /
`assertDesignation()` methods on `cypress/support/pages/ProfilePage.ts`, and the new
`data-cy` attributes on the buttons.

**Also update [promote-to-volunteer-and-hall-admin.cy.ts](badhan-frontend-test/cypress/e2e/donors/promote-to-volunteer-and-hall-admin.cy.ts)**:
the hall-admin promotion still exercises the same button but now hits `PATCH
/donors/designation` instead of `PATCH /admins`, so any `cy.intercept`/route assertion on
`/admins` in that spec must be re-pointed at the designation route.

### 7. Out of scope

[Members.vue](badhan-frontend/src/views/Members.vue) (which lists super admins from
`GET /donors/designation`) gains **no** promote/demote controls — the donor details
screen is the only entry point for designation changes.

