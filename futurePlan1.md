# Plan 2: Fold super-admin promotion into `PATCH /donors/designation`

## Goal

Extend the existing donor-designation route so a **super admin can promote any donor
to super admin, and demote a super admin back down**, then **delete the dedicated
`PATCH /admins/superadmin` route** that does this today. Surface the capability in the
frontend as a **"Promote to Super Admin" / "Demote to Donor"** button on the donor
details screen, shown according to the target's current designation. Backend (Jest) and
frontend (Cypress) tests accompany the change.

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

### The route being deleted — `PATCH /admins/superadmin`

[AdminsController.ts:77-137](badhan-backend/src/tsoaControllers/AdminsController.ts#L77-L137)

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

`PATCH /admins` (the *hall* admin route, [AdminsController.ts:15-76](badhan-backend/src/tsoaControllers/AdminsController.ts#L15-L76))
is **not** in scope and stays — it is wrapped as `handlePATCHAdmins`
([api/index.ts:406](badhan-frontend/src/api/index.ts#L406)) and used by the
"Promote to Hall admin" button.

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
- `badhan-backend-test/tests/donors/patchAdminsSuperAdmin/` — `success`, `permission`,
  `guest` specs for the route being deleted; these must be **removed or migrated**.
- `badhan-backend-test/tests/lib/operations/donors.js` contains the `superadmin`
  request helper used by those specs.
- No Cypress coverage of super-admin promotion exists.

## Proposed design

### 1. API shape

The current `promoteFlag: boolean` cannot express three levels. Two options — Q1 asks
you to pick; **option A is planned** below.

**Option A (planned): replace the flag with an explicit target designation.**

```
PATCH /donors/designation
{ donorId: string, designation: 0 | 1 | 3 }
```

The caller states the designation the target should end up with. This is explicit,
extends to hall admin later, and removes the "promote from what, to what?" ambiguity.
It is a **breaking change to an existing route**, so the frontend caller and the
backend tests change with it.

**Option B: keep `promoteFlag` and infer from the target's current designation** —
promote `0→1`, `1→3`; demote `3→1`, `1→0`. No signature change, but a super admin
promoting a volunteer twice silently produces different results, and the frontend
cannot express "demote this super admin straight to donor".

### 2. Permission rules for the merged route

| Caller | Target's current | Allowed transitions |
|---|---|---|
| Hall admin (2), same hall | `0` | `0 → 1` (promote to volunteer) |
| Hall admin (2), same hall | `1` | `1 → 0` (demote to donor) |
| Super admin (3) | `0` | `0 → 1` |
| Super admin (3) | `1` | `1 → 0`, `1 → 3` |
| Super admin (3) | `3` | `3 → 1`, `3 → 0` (see Q2) |
| Anyone below hall admin | any | none (403) |

Carried over from the deleted route: **only a super admin may set or clear designation
`3`** — implemented as an explicit check inside the controller rather than
`handleSuperAdminCheck` middleware, since the route still serves hall admins for the
`0 ↔ 1` cases.

Rules that need a decision because the two routes disagree today:

- The designation route enforces a **hall check**; the superadmin route does **not**.
  Q3 asks which applies to super-admin transitions.
- The designation route 409s when the target's hall is `> 6`; the superadmin route
  allows it. Same question.
- **Self-demotion**: nothing currently stops a super admin demoting themselves, which
  could leave the system with zero super admins. Q4.

### 3. Backend changes

| # | Change | File |
|---|---|---|
| 1 | Replace `promoteFlag` with `designation` in the `@Body()` of `updateDesignation`; rewrite the transition/permission logic per §2 | [DonorsController.ts:740-822](badhan-backend/src/tsoaControllers/DonorsController.ts#L740-L822) |
| 2 | New `validateBODYDesignation` (integer, `isIn([0,1,3])`); swap it into `validatePATCHDonorsDesignation` | `validations/validateRequest/validateBody.ts`, `validations/donors.ts` |
| 3 | **Delete `changeSuperAdmin`** and its `@Patch('superadmin')` decorator | [AdminsController.ts:77-137](badhan-backend/src/tsoaControllers/AdminsController.ts#L77-L137) |
| 4 | Delete `validatePATCHAdminsSuperAdmin` and its now-unused export | [validations/donors.ts:88-91](badhan-backend/src/validations/donors.ts#L88-L91) |
| 5 | Regenerate tsoa routes/spec (`npm run build` runs tsoa) | `src/tsoaRoutes/` |
| 6 | Log line: keep a single `PATCH DONORS DESIGNATION (<from> → <to>)` entry covering all transitions | controller |

### 4. Frontend changes

**Donor details ([PersonDetails.vue](badhan-frontend/src/components/PersonDetails.vue))**

- Add a **`promoteToSuperAdminButtonId`** button, visible when the viewer is a super
  admin and the target is **not** already a super admin. Calls the designation route
  with `designation: 3`.
- Add a **`demoteFromSuperAdminButtonId`** button, visible when the viewer is a super
  admin and the target **is** a super admin (`designation === 3`). Label and target
  designation per Q2 — planned: **"Demote to Donor"**, sending `designation: 0`.
- Exactly one of the two renders for any given target, mirroring the existing
  promote/demote volunteer pair.
- Both are hidden when the viewer is looking at themselves (`$isMe(id)`) — see Q4.
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
- No wrapper for `/admins/superadmin` exists, so nothing to delete there.

### 5. Backend tests (`badhan-backend-test`)

Mirror the existing directory convention — `success` / `permission` / `guest` specs per
route.

**Update `tests/donors/patchDonorsDesignation/`**

- Rewrite existing cases for the new `designation` body field.
- New success cases: super admin promotes a volunteer to super admin (`1 → 3`); super
  admin demotes a super admin (`3 → 0` or `3 → 1` per Q2); the resulting designation is
  verified by re-fetching the donor.
- New permission cases: a **hall admin** attempting `designation: 3` gets 403; a
  volunteer attempting anything gets 403; a guest gets 401.
- Validation cases: `designation: 2` rejected by the validator (hall admin promotion
  stays on `PATCH /admins`); out-of-range and non-integer values rejected.

**Delete `tests/donors/patchAdminsSuperAdmin/`** (all three specs) and the
`superadmin` helper in `tests/lib/operations/donors.js`. Also add a case asserting the
deleted route now returns **404**, so its removal is pinned by a test.

### 6. Frontend test (`badhan-frontend-test`)

New spec `cypress/e2e/donors/promote-super-admin.cy.ts`, following the Page Object
convention used by
[promote-to-volunteer-and-hall-admin.cy.ts](badhan-frontend-test/cypress/e2e/donors/promote-to-volunteer-and-hall-admin.cy.ts),
which is the closest existing analogue and should be read first.

Flow:

1. Sign in as a super admin (credentials from `@auth/credentials` — Q5 confirms which
   seeded account qualifies).
2. Create or search a donor, open their details via `HomePage` → `ProfilePage`.
3. Promote to volunteer first if the transition rules require it (Q2 decides whether a
   plain donor can go straight to super admin).
4. Click `promoteToSuperAdminButtonId`; assert the success notification and that the
   designation label now reads **Super Admin**.
5. Reload the details page and assert the label persists and the button has flipped to
   `demoteFromSuperAdminButtonId`.
6. Click demote; assert the notification and that the label returns to Donor/Volunteer.
7. Negative case: sign in as a hall admin, open the same donor, assert
   `promoteToSuperAdminButtonId` does **not** exist.

Test-side additions: `promoteToSuperAdmin()` / `demoteFromSuperAdmin()` /
`assertDesignation()` methods on `cypress/support/pages/ProfilePage.ts`, and the new
`data-cy` attributes on the buttons.

---

## Open questions — please answer inline

**Q1. Explicit `designation` field, or keep `promoteFlag`?**
Option A (planned) replaces the boolean with `designation: 0 | 1 | 3` — explicit, but
a breaking change to a route the frontend already calls in two places. Option B keeps
`promoteFlag` and infers the next step from the current designation — no signature
change, but ambiguous and cannot express "demote a super admin straight to donor".
> **Answer:**

**Q2. What should demoting a super admin produce?**
The deleted route demotes `3 → 1` (Volunteer). Your request says the button should read
**"Demote to Donor"**, which implies `3 → 0`. Which is right — and correspondingly,
should promotion be allowed from any designation (`0 → 3` directly), or only from
volunteer as the old route required?
> **Answer:**

**Q3. Do hall restrictions apply to super-admin transitions?**
`PATCH /donors/designation` refuses cross-hall targets and refuses donors whose hall is
`> 6`; `PATCH /admins/superadmin` applies neither check. After the merge, should a
super admin be able to promote a donor from any hall — including hall `8` (Unknown) —
to super admin? (Being super admin is a system-wide role, so I would say yes, and skip
the hall checks whenever the requested designation is `3`.)
> **Answer:**

**Q4. Can a super admin demote themselves?**
Nothing prevents it today, and doing so could leave zero super admins in the system.
Options: (a) block self-demotion in the controller, (b) block it only when they are the
last remaining super admin, or (c) allow it and accept the risk.
> **Answer:**

**Q5. Which seeded account should the Cypress test sign in as?**
`AUTH_CREDENTIALS` in `cypress/support/auth/credentials.ts` — is the default account a
super admin, and is there a seeded hall-admin account available for the negative case
in step 7? If not, the spec needs to create and promote one first.
> **Answer:**

**Q6. Should the deleted route return 404, or 410 with a deprecation message?**
A hard delete gives 404 (planned). If any external client or script calls
`PATCH /admins/superadmin` today, a temporary 410 with "use PATCH /donors/designation"
would be gentler. Do you know of any caller outside this repo?
> **Answer:**

**Q7. Should `PATCH /admins` (hall admin) be folded in too?**
This plan leaves the hall-admin route alone, so designation `2` is still set by a
different endpoint. Folding it in as `designation: 2` would unify all four levels
behind one route — worth doing now, or a separate change?
> **Answer:**

**Q8. Does the Members page need updating?**
[Members.vue](badhan-frontend/src/views/Members.vue) lists super admins from
`GET /donors/designation`. Should it also gain promote/demote controls, or is the donor
details screen the only entry point?
> **Answer:**
