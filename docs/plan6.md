# Plan 6: Donor archiving

## Goal

Introduce an `archiveFlag` on every donor so that inactive/stale donors can be moved out of
the default search space. The flag becomes the **first** `$match` predicate in the donor
search pipeline (`GET /search/v3`), so an index on it turns "search the live roster" into a
cheap, index-backed partition instead of a full-collection scan. No other read path is
affected — the Active Donors page in particular ignores archiving entirely (**S7**).

Surfaces:

| Surface | Who | What |
| --- | --- | --- |
| Person detail page | rendered for super admins only; backend allows anyone who may edit that donor | per-donor archive toggle |
| Search page ([Filters.vue](../badhan-frontend/src/components/Filters.vue)) | super admin only | archive-search flag, rendered **blurred + disabled** (read-only mirror of the setting); this is where archived donors are browsed — there is no separate archive page |
| Search results footer | super admin only | "Archive these donors?" → confirmation → one batch call (becomes "Unarchive these donors?" while browsing the archive) |
| Super-admin settings | super admin only | the *only* place the archive-search flag can be flipped; browser-local, self-expires in 24 h |

---

## 1. Semantics — decisions taken

These are the reading of the request this plan implements. Every previously open question
has been decided and folded into the section it affects, so there is nothing left assumed
silently.

**S1 — the flag partitions, it does not widen.**
`archiveFlag` is a boolean on the donor. The search filter is a boolean `archived` that is
*always* sent, and the pipeline *always* pins `archiveFlag` to it:

- `archived=false` → only non-archived donors.
- `archived=true` → only archived donors.

Consequence: a single equality predicate on an indexed field is always the leading stage.
There is no "show both" mode — that would defeat the optimization. Browsing the archive is
therefore the ordinary search page with the flag flipped, not a separate view.

**S2 — the search-page control is a mirror, not an input.**
[Filters.vue](../badhan-frontend/src/components/Filters.vue) renders the flag for super
admins only, `disabled` and with a CSS blur, showing the *server's* current value. Clicking
it does nothing except surface a hint pointing at the settings page. It is what switches the
search page between the live roster and the archive.

**S3 — the archive-search setting is frontend-only, per browser, and expires by construction.**
It is **not** stored on the donor document and there is no route that writes it. Nothing
about it reaches the backend except the resulting `archived` value on the search query. It
lives in `localStorage`, written when a super admin flips the switch in their own settings
page (§8.5) and read by the search page (§8.1).

Expiry falls out of the storage helper that already exists —
[localDatabase/helpers.ts](../badhan-frontend/src/localDatabase/helpers.ts) has
`setWithExpiry(key, value, ttl)` / `getWithExpiry(key)`, and `getWithExpiry` deletes the key
and reports `EXPIRED` once the TTL has passed. So "resets within 24 h" is one call with
`ttl = 24 * 3600 * 1000`; no scheduler, no server field, no clock-skew race.

The 24 h runs from **enabling**, not from last use — reading never re-arms it. Toggling the
switch off removes the key outright; toggling it on again arms a fresh 24 h.

Two consequences, both accepted:

- **It is per browser, not per account.** A super admin who enables it on their phone does
  not get it on their laptop. Fine — it is a view toggle, not a preference worth syncing.
- **Logging out clears it.** `ldb.reset()` is `localStorage.clear()`
  ([localDatabase/index.ts:6](../badhan-frontend/src/localDatabase/index.ts#L6)) and runs on
  logout and on auth failure ([store/auth.ts:116](../badhan-frontend/src/store/auth.ts#L116)),
  so the next session starts with archive search off. That is the safe direction to fail.

**S4 — the gate is frontend-only; the API honours whatever `archived` it is sent.**
Confirmed as the intended end state, not a first cut. The search route takes `archived` at
face value for every caller regardless of designation. The backend has no notion of the
archive-search setting at all — it does not exist server-side (**S3**) — so there is nothing
to enforce: no coercion, no 403. The restriction lives entirely in the Vue layer:

- non-super-admins never see the flag at all — no control is rendered anywhere for them, and
  their search payload is hardcoded to `archived: false`, i.e. all non-archived donors;
- super admins send the value of their own browser-local, self-expiring setting.

The 24 h expiry exists **only** for a super admin flipping the flag in their own settings
(§8.5). It is a convenience timer on a client-side toggle, not a security control.

The setting is therefore a **UI state store, not an authorization boundary**. Consequence to
be aware of: a volunteer who hand-crafts `GET /search/v3?...&archived=true` will get the
archive back, and so will a super admin whose 24 h has lapsed. Since archived donors are the
same donor documents the same caller can already read at `archived=false` — minus none of the
fields — this exposes ordering and partitioning, not new data. Accepted deliberately (it is
what keeps the read path free of per-request designation branching); revisit only if archived
status is ever meant to carry confidentiality.

Auditability covers the gap after the fact: the audit log records the effective `archived`
value on every search (§5.1), so "who read the archive" stays answerable without enforcement.
If enforcement is ever wanted later, the natural place is a designation check in the search
controller — but the expiry could not be enforced there without first moving the setting
server-side, and the backend and Cypress tests in §9 deliberately assert the *permissive*
behaviour and would have to be inverted.

**S5 — archiving demotes.**
On archive, if `designation` is `1` (volunteer) or `2` (hall admin) it becomes `0` (donor).
`designation === 3` (super admin) is left untouched. Unarchiving does **not** restore the
old designation — demotion is one-way and re-promotion is done by hand from the Settings
block. No `preArchiveDesignation` field is stored.

**S6 — permission to archive == permission to edit, but the controls are super-admin-only in the UI.**
Server side, reuse the predicate already enforced by `PATCH /donors/v2`
([DonorsController.ts:599](../badhan-backend/src/tsoaControllers/DonorsController.ts#L599)):
hall restriction (`isHallRestricted(target.hall) && user.hall !== target.hall` → forbidden
unless super admin) plus "cannot modify a member of higher designation". The batch routes
apply it **per donor** and report skips rather than failing the whole call. No extra
designation gate is added — a hall admin who calls `POST /donors/archive` for a donor in
their own hall succeeds.

Frontend side, none of the archive controls are exposed to non-super-admins: the
detail-page switch (§8.4), the batch footer button (§8.3) and the settings switch (§8.5) all
render behind `designation === SUPER_ADMIN`. Same split as **S4** — the API is permissive,
the UI is narrow — so a non-super-admin has no path to archiving through the app, but
hand-crafted requests within their edit rights are honoured rather than rejected.

**S7 — archiving does not cascade to other collections.**
Archiving flips one boolean (plus the **S5** demotion) and nothing else. Specifically:

- `activedonors` rows are **not** deleted, and the Active Donors page **ignores archiving
  entirely** — an archived donor with an `activedonors` row keeps showing up there exactly as
  before. `GET /activeDonors` takes no `archived` param and its pipeline is untouched by this
  change.
- `tokens` are **not** revoked. A demoted hall admin keeps their session; the frontend nav
  degrades on their next `/users/me`, not immediately. Acceptable: the demotion is a
  designation change like any other, and existing designation changes behave the same way.
- donations, platelet donations, logs and every other collection are untouched.

**S8 — the blast radius is one route: `GET /search/v3`.**
Archived donors stay fully visible in the Active Donors page (**S7**), the members list,
statistics, donation reports, CSV export, the newly-created-donors view and the
duplicate-phone check (`GET /donors/checkDuplicate`). The last one matters: if duplicate
detection skipped archived donors, creating a donor would fail with "phone already exists"
against a record nobody could find. `GET /search/v3` is the only route that partitions on
`archiveFlag`, because it is the path whose cost this change is meant to cut.

**S9 — archiving is a purely manual, per-donor or per-result-set action.**
There is no automatic archiving rule — no "batch older than X", no "no donation in N years",
no scheduled sweep. The migration (§2) only backfills `archiveFlag: false`; every subsequent
archive is a human pressing the detail-page switch (§8.4) or the search-footer batch button
(§8.3).

**S10 — no backward compatibility.** The new `archived` query param and `archiveFlag` body
field are **required** (§3). Older clients — a stale PWA/TWA bundle, any external caller —
get a 400 until they update. Accepted deliberately; the 400-on-missing-param tests in §9 pin
it.

**S11 — guest mode is unaffected.** `GET /guest/search/v3`
([GuestController.ts:123](../badhan-backend/src/tsoaControllers/GuestController.ts#L123))
takes no query params and returns fabricated donors, so nothing needs hardcoding on the
guest path. The §8.1 computed still resolves to `false` for a guest (no designation in the
store), which is harmless since the value is ignored.

---

## 2. Data model

### `badhan-backend/src/db/models/Donor.ts`

Add to `IDonor`:

```ts
archiveFlag: boolean;
```

Add to `donorSchema`:

```ts
archiveFlag: {
  type: Boolean,
  required: true,
  default: false
}
```

That is the **only** new field. The archive-search setting is not stored on the donor (or
anywhere else server-side) — it is browser-local (**S3**) — so there is no expiry timestamp
to model, no validator for it, and no projection to patch to keep it out of donor payloads.

Extend the swagger doc block above the schema with `archiveFlag`, matching the existing
comment style.

`archiveFlag` should *stay* in every donor payload — the search response in particular, since
the frontend needs it to render the "Archived" chip (§8.6). Search v3 uses an *exclusion*
projection
([donorInterface.ts:392](../badhan-backend/src/db/interfaces/donorInterface.ts#L392)), so new
fields flow through by default and nothing has to be added there.

### Indexes

```ts
donorSchema.index({ archiveFlag: 1, hall: 1, bloodGroup: 1 })
donorSchema.index({ archiveFlag: 1, availableToAll: 1, bloodGroup: 1 })
```

Rationale: `generateSearchQuery`
([donorInterface.ts:638](../badhan-backend/src/db/interfaces/donorInterface.ts#L638)) emits
either `hall` or `availableToAll` (never both, except in the `availableToAllOrHall` branch)
plus optionally `bloodGroup`. `studentId`/`name`/`address` are all `$regex` with a leading
`.*`, so they are not index-usable and must stay off the prefix. Putting `archiveFlag`
first keeps both indexes usable for the flag alone.

### Migration

New file `badhan-backend/scripts/migrations/files/<YYYYMMDD>_add-archive-flag.ts`, modelled
on [20250826_remove-extra-fields.ts](../badhan-backend/scripts/migrations/files) and
[template.ts](../badhan-backend/scripts/migrations/template.ts):

```
DonorModel.updateMany({ archiveFlag: { $exists: false } }, { $set: { archiveFlag: false } })
```

Run with `docker compose exec backend npm run migrate` (dry run first: `DRY_RUN=1`).
Backfilling explicitly rather than relying on the mongoose default matters, because a
missing field would not match `{ archiveFlag: false }` and those donors would vanish from
search.

That backfill is the migration's *whole* job — no donor is archived by it. Archiving is
manual (**S9**), so the collection comes out of the migration in exactly the state it went
in, just with the field materialized.

---

## 3. Backend — validators

`badhan-backend/src/validations/validateRequest/validateQuery.ts`

```ts
export const validateQUERYArchived: ValidationChain = query('archived')
  .exists().withMessage('archived is required')
  .isBoolean().withMessage('archived must be boolean')
```

`badhan-backend/src/validations/validateRequest/validateBody.ts`

```ts
export const validateBODYArchiveFlag: ValidationChain = body('archiveFlag')
  .exists().withMessage('archiveFlag is required')
  .isBoolean().toBoolean().withMessage('archiveFlag must be boolean')

export const validateBODYDonorIds: ValidationChain = body('donorIds')
  .exists().withMessage('donorIds is required')
  .isArray({ min: 1 }).withMessage('donorIds must be a non-empty array')  // no upper cap
  // plus a .custom() asserting every element is a 24-char hex ObjectId

export const validateBODYEnabled: ValidationChain = body('enabled')
  .exists().withMessage('enabled is required')
  .isBoolean().toBoolean().withMessage('enabled must be boolean')
```

`badhan-backend/src/validations/donors.ts`

- add `validateQUERYArchived` to `validateGETSearchDonors`
- add `validateBODYArchiveFlag` to `validatePATCHDonors`
- new `validatePOSTDonorsArchive` / `validatePOSTDonorsUnarchive` = `[validateBODYDonorIds]`

`badhan-backend/src/validations/activeDonors.ts` — **untouched** (**S7**).

`badhan-backend/src/validations/users.ts`

- new `validatePATCHUsersArchiveSearch` = `[validateBODYEnabled]`

---

## 4. Backend — query construction

### `generateSearchQuery` ([donorInterface.ts:638](../badhan-backend/src/db/interfaces/donorInterface.ts#L638))

Add `archived?: boolean` to the parameter type and `archiveFlag?: boolean` to
`IQueryBuilder` ([donorInterface.ts:629](../badhan-backend/src/db/interfaces/donorInterface.ts#L629)).
Set it **first**, before the blood-group branch, so the emitted object's first key is the
indexed equality — but only when a boolean was actually supplied:

```ts
if (typeof reqQuery.archived === 'boolean') {
    queryBuilder.archiveFlag = reqQuery.archived
}
```

The guard is **load-bearing**, not defensive noise. `generateSearchQuery` has a second
caller — `generateAggregatePipeline` (Active Donors) — which after **S7** does *not* pass
`archived`. An unguarded `queryBuilder.archiveFlag = undefined` would still emit the key, and
the driver serializes `undefined` to `null` by default (`ignoreUndefined` is off), so the
Active Donors `$match` would become `archiveFlag: null` and match **zero** donors. Setting
the key conditionally is what keeps Active Donors untouched.

(Key order in the object does not drive index selection — the planner does — but keeping it
first makes the intent legible and matches "the very first filtering".)

### Main search — `findDonorsByAggregate` ([donorInterface.ts:234](../badhan-backend/src/db/interfaces/donorInterface.ts#L234))

The only caller that passes `archived`. Nothing further to change: stage 1 is already
`{ $match: queryBuilder }`, which now carries `archiveFlag`. This is the ideal shape — the
flag is applied before the `donations` and `plateletdonations` `$lookup`s, which is where the
current cost sits.

### Active donors — `generateAggregatePipeline` ([donorInterface.ts:499](../badhan-backend/src/db/interfaces/donorInterface.ts#L499))

**No change** (**S7**). It does not pass `archived`, so its `queryBuilder` comes back without
`archiveFlag` and the pipeline behaves exactly as it does today — no projection addition, no
early `$match`, and archived donors keep appearing in the Active Donors list. The only thing
to be careful about is the `undefined` trap above.

---

## 5. Backend — routes

### 5.1 `GET /search/v3` — one new query param

[SearchController.ts](../badhan-backend/src/tsoaControllers/SearchController.ts)

Add `@Query() archived: boolean` and put it in `reqQuery`. That is the whole change — no
designation check, no expiry check, no coercion (**S4**). The existing
`logInterface.addLog(user._id, 'GET SEARCH V3', …)` call already logs the whole filter
object, so `archived` lands in the audit log for free; since the route is deliberately
permissive (**S4**), that log is the only record of who browsed the archive.

### 5.2 `GET /activeDonors` — no change

[ActiveDonorsController.ts:206](../badhan-backend/src/tsoaControllers/ActiveDonorsController.ts#L206)
is left alone: no `archived` param, no validator, no pipeline edit (**S7**). Archived donors
who have an `activedonors` row still appear in the Active Donors list.

### 5.3 `PATCH /donors/v2` — one new body field

[DonorsController.ts:599](../badhan-backend/src/tsoaControllers/DonorsController.ts#L599)

Add `archiveFlag: boolean` to the `@Body()` type. After the existing permission checks and
alongside `target.availableToAll = body.availableToAll`:

```ts
const isNewlyArchived: boolean = body.archiveFlag && !target.archiveFlag
target.archiveFlag = body.archiveFlag
if (isNewlyArchived && target.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
  target.designation = DESIGNATIONS_INDEX.DONOR
}
```

The `isHallUnknown(target.hall)` fixup and `await target.save()` stay where they are. Note
the demotion happens *inside* `save()`, so the schema's `designation` validator still runs.

### 5.4 `POST /donors/archive` (new)

```
POST /donors/archive
body: { donorIds: string[] }
200: { status, statusCode, message, archivedCount, demotedCount, skippedIds: string[] }
```

Middlewares: `[donorValidator.validatePOSTDonorsArchive, rateLimiter.commonLimiter, authenticator.handleAuthentication]`.

Implementation sketch (new `donorInterface.archiveDonorsByIds`):

1. `DonorModel.find({ _id: { $in: donorIds } }).select('_id hall designation archiveFlag')`
2. Partition into `allowed` / `skipped` using the **S6** predicate.
3. Two `bulkWrite`/`updateMany` ops, not a loop of `save()`:
   - `updateMany({ _id: { $in: allowedIds } }, { $set: { archiveFlag: true } })`
   - `updateMany({ _id: { $in: allowedIds }, designation: { $in: [1, 2] } }, { $set: { designation: 0 } })`
4. One `logInterface.addLog(user._id, 'POST DONORS ARCHIVE', { count, donorIds, skippedIds })`.

`updateMany` bypasses mongoose validators and the `pre('save')` hook. That is fine here —
neither field has a custom validator that a literal `true`/`0` could violate, and the
`pre('save')` hook only touches `password`. Worth a comment in the code so the next reader
does not have to re-derive it.

**No upper cap on `donorIds`.** The route accepts an id list of any length, so the frontend
never has to chunk and "archive these donors" always means the whole result set (§8.3). The
two `updateMany` calls are `$in` queries on `_id`, which stay a single round trip
regardless of size; the natural bound is however many donors one search returns. Only the
`min: 1` check remains, to reject an empty request.

### 5.5 `POST /donors/unarchive` (new)

Identical, `$set: { archiveFlag: false }`, no designation touch (**S5**).
Returns `{ unarchivedCount, skippedIds }`. Log verb `POST DONORS UNARCHIVE`.

### 5.6 / 5.7 — no user routes, no `/users/me` change

There is **no** `PATCH /users/archiveSearch`, and neither `GET /users/me`
([UsersController.ts:172](../badhan-backend/src/tsoaControllers/UsersController.ts#L172)) nor
`GET /donors/me` ([DonorsController.ts:36](../badhan-backend/src/tsoaControllers/DonorsController.ts#L36))
gains a field. The archive-search toggle never leaves the browser (**S3**); the only thing
the backend ever learns about it is the `archived` value on the next search query.

### 5.8 tsoa regeneration

Any controller signature change requires:

```
docker compose exec backend npm run tsoa:routes
docker compose exec backend npx tsc --noEmit
```

Generated output under [badhan-backend/src/tsoaRoutes](../badhan-backend/src/tsoaRoutes) is
committed — regenerate, don't hand-edit.

---

## 6. Frontend — API layer

[badhan-frontend/src/api/index.ts](../badhan-frontend/src/api/index.ts)

- `GETSearchPayloadInterface` → add `archived: boolean`
- `GETActiveDonorsPayloadInterface` → **unchanged** (**S7**);
  [ActiveDonors.vue](../badhan-frontend/src/views/ActiveDonors.vue#L163) is not touched by
  this change at all.
- `PATCHDonorsPayloadInterface` → add `archiveFlag: boolean`
- new:

```ts
const handlePOSTDonorsArchive   = async (payload: { donorIds: string[] }) => …  // POST /donors/archive
const handlePOSTDonorsUnarchive = async (payload: { donorIds: string[] }) => …  // POST /donors/unarchive
```

Two, not three — the settings switch calls no API (**S3**). Both follow the existing `try/catch → (e as BadhanAxiosErrorInterface<…>).response`
shape and get exported from the bottom barrel.

---

## 7. Frontend — state

The archive-search flag is **not** part of `myprofile` — that store mirrors the server profile
(`GET /users/me`), and this value has no server side (**S3**). Nothing in
[store/myprofile.ts](../badhan-frontend/src/store/myprofile.ts) changes.

### New persistence module

`badhan-frontend/src/localDatabase/archiveSearch.ts`, modelled on
[theme.ts](../badhan-frontend/src/localDatabase/theme.ts) but using the TTL helpers that
already exist in [helpers.ts](../badhan-frontend/src/localDatabase/helpers.ts):

```ts
import { setWithExpiry, getWithExpiry, remove } from '@/localDatabase/helpers'

const storeKey = 'archiveSearch'
const TTL = 24 * 3600 * 1000

const save = () => setWithExpiry(storeKey, true, TTL)
const load = () => getWithExpiry(storeKey).status === 'OK'
const expiry = (): number | null => { /* raw item.expiry, or null */ }
const clear = () => remove(storeKey)

export default { save, load, expiry, clear }
```

Register it in [localDatabase/index.ts](../badhan-frontend/src/localDatabase/index.ts) next to
`theme`. `getWithExpiry` already deletes the key and returns `EXPIRED` past the TTL, so
`load()` going false after 24 h needs no extra code. `expiry()` exists only to render the
"turns off in 7 h 12 m" hint (§8.5); it reads the same JSON blob
(`JSON.parse(localStorage.getItem(storeKey)).expiry`) without consuming it.

`ldb.reset()` on logout wipes the key along with everything else (**S3**) — no extra call
needed.

### New Vuex module

`badhan-frontend/src/store/archiveSearch.ts` — tiny, and the reason it exists is reactivity:
`darkTheme` gets away with reading `ldb` directly from components because Vuetify re-renders
on the theme object, but the search page's checkbox and payload must update the moment the
settings switch flips, in the same session and without a reload (asserted in §9).

```ts
state:     { enabled: ldb.archiveSearch.load() }        // seeded at module init
getters:   getArchiveSearchEnabled: (state) => state.enabled
mutations: setArchiveSearchEnabled (state, enabled) {
             enabled ? ldb.archiveSearch.save() : ldb.archiveSearch.clear()
             state.enabled = enabled
           }
```

One gap worth knowing: the state is seeded once at boot, so a window that stays open past the
24 h keeps `enabled === true` in memory even after `ldb` has expired the key. Close it by
having the getter used at search time re-check `ldb.archiveSearch.load()` — the §8.1 computed
is where that happens, so the payload is always honest even if the checkbox lags.

Worst case remains benign either way: a lapsed super admin searches the archive once.

## 8. Frontend — views

### 8.1 Search filters — blurred, disabled mirror

[Filters.vue](../badhan-frontend/src/components/Filters.vue)

Below the Available / Not Available row (~line 119), wrapped in
`v-if="$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN"`:

```html
<div class="archive-flag-wrapper" data-cy="filterArchiveSearchWrapper">
  <v-checkbox
    id="filterArchiveSearchCheckboxId"
    data-cy="filterArchiveSearchCheckboxId"
    dense
    disabled
    :input-value="archiveSearchEnabled"
    label="Search archived donors"
    :messages="'Changeable only from Super Admin settings'"
  />
</div>
```

```css
.archive-flag-wrapper { filter: blur(2px); pointer-events: none; user-select: none; }
```

`archiveSearchEnabled` is a computed reading the store getter. `searchClickInsideComponent`
adds `archived: this.archiveSearchEnabled` to the payload it hands to `searchClicked`.

**This computed is the entire enforcement mechanism** (**S4**). For a non-super-admin the
getter must yield `false`, so write it so that designation is part of the expression rather
than relying on the control being hidden:

```js
archiveSearchEnabled () {
  return this.$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN &&
         this.$store.getters['archiveSearch/getArchiveSearchEnabled'] &&
         ldb.archiveSearch.load()   // re-checks the TTL, see §7
}
```

The `v-if` hides the widget; this computed is what hardcodes the payload. Keep both — the
`v-if` alone would leave `archived` undefined in the payload, and the query validator
requires the param to exist.

Guest mode needs nothing extra (**S11**): a guest has no designation in the store, so the
computed yields `false`, and `/guest/search/v3` ignores query params regardless.

Also extend the `HelpTooltip` `<ul>` at the top of the card with an entry explaining the
archive partition, matching the existing bullet style.

### 8.2 Search page plumbing

[Home.vue](../badhan-frontend/src/views/Home.vue)

- `data`: `archived: false`
- `search(payload)` → `sendData.archived = payload.archived`
- `searchClickedFromFilterComponent` → `this.archived = filterValues.archived`
- `searchClicked()` → pass `archived: this.archived` into `this.search({…})`
- `mounted()` reads filters off `this.$route.query`, and there is a brittle
  `if (Object.keys(this.$route.query).length === 9)` gate at
  [Home.vue:234](../badhan-frontend/src/views/Home.vue#L234). Adding a shared-URL param
  would break it. **Decision: do not put `archived` in the shareable URL** — it derives from
  the viewer's own setting, so a shared link should resolve against the recipient's, and a
  link carrying `archived=true` would hand a volunteer the archive in one click (**S4** does
  not stop it server-side). `shareClicked` and `downloadInMobileClicked` stay as they are,
  and the `=== 9` gate is untouched.

### 8.2b "Showing archived donors" banner

When the result set on screen came from `archived: true`, a message sits **above** the
results so the mode is unmissable — the blurred sidebar checkbox is too easy to miss:

```html
<v-alert v-if="archived && searchResultShown" data-cy="archivedResultsBanner"
         dense text type="info" class="rounded-xl">
  Showing archived donors
</v-alert>
```

Place it immediately before the `actions-` transition block that renders `personGroups`
([Home.vue:74](../badhan-frontend/src/views/Home.vue#L74)). It keys off the `archived` value
that *produced* the results, not the current setting, so it cannot claim the archive while
live donors are on screen. The search page carries deliberately **no** countdown and **no**
lapse warning — this banner plus the per-card chip (§8.6) are its only archive-mode
indicators. The remaining lifetime is shown once, as hint text under the settings switch
that owns it (§8.5). A super admin whose window expires mid-session simply sees the banner
disappear on their next search.

### 8.3 Search results footer — batch archive / unarchive

All search results are rendered at once as part of this change (§8.3b), so the footer button
goes last inside the `actions-` transition block, where `#olderBatchResultsButton`
([Home.vue:95](../badhan-frontend/src/views/Home.vue#L95)) used to be:

```html
<v-btn
  id="archiveTheseDonorsButtonId"
  data-cy="archiveTheseDonorsButtonId"
  v-if="isArchiveBatchAllowed"
  small rounded color="warning" class="ma-2"
  :disabled="archiveBatchLoader"
  @click="archiveTheseDonorsClicked"
>
  <v-icon left>{{ archived ? 'mdi-archive-arrow-up' : 'mdi-archive-arrow-down' }}</v-icon>
  {{ archived ? 'Unarchive these donors?' : 'Archive these donors?' }}
</v-btn>
```

One button, two directions — since the search page *is* the archive browser (**S1**), the
`archived` flag that produced the result set also decides which batch route the footer hits.
`isArchiveBatchAllowed`: super admin **and** `searchResultShown` **and** `persons.length > 0`.

Handler, using the existing confirmation store
([store/confirmationBox.ts](../badhan-frontend/src/store/confirmationBox.ts), rendered by
[AppShell/ConfirmationBox.vue](../badhan-frontend/src/components/AppShell/ConfirmationBox.vue)):

```js
archiveTheseDonorsClicked () {
  const verb = this.archived ? 'unarchive' : 'archive'
  this.$store.commit('confirmationBox/setConfirmationMessage', {
    confirmationMessage: `Are you sure you want to ${verb} these ${this.persons.length} donors?`,
    confirmationAction: this.archiveConfirmed
  })
}
```

The batch confirmation text stays exactly that — **it does not mention demotion**, even
though the route demotes every volunteer and hall admin in the list (**S5**, §5.4). Decided
deliberately: the batch path demotes silently, unlike the single-donor switch (§8.4) which
warns. No preflight count, no per-donor breakdown. (Search results do not carry `designation`
anyway — §2 keeps `designation: 0` in the projection — so a client-side count would need an
extra round trip.)

`archiveConfirmed` sends **one** call — `handlePOSTDonorsArchive` or
`handlePOSTDonorsUnarchive` depending on `this.archived` — with every `_id` in
`this.persons`, uncapped (§5.4). Since every result is now on screen (§8.3b), "these donors"
means exactly what is rendered, and the count in the confirmation message says so.

On success: `notification/notifySuccess` with the returned counts, then drop the affected
donors from `persons` / `personGroups` / `numOfDonor` locally rather than re-running the
search — they no longer belong to the partition being viewed either way. If `skippedIds` is
non-empty, surface it via `notification/notifyError` — a partial success must not read as a
clean one.

### 8.3b Remove the older-batches gate

[Home.vue](../badhan-frontend/src/views/Home.vue) currently renders only the 5 most recent
batches and hides the rest behind "Show results from older batches"
([Home.vue:319-336](../badhan-frontend/src/views/Home.vue#L319-L336)). That partial
rendering goes away with this change — a batch button labelled "archive these donors" next
to a partially-shown list is a genuine footgun, and archiving is what the older batches are
mostly *for*.

Delete, in `search()` and the template:

- `const countOfBatchesToShow = 5` and the two `slice` calls → `this.personGroups = sortedBatches`
- `morePersonGroups`, `isMorePersonGroupsAvailable` (both `data` entries) and
  `concatenateMorePersonGroups()`
- the `#olderBatchResultsButton` `v-btn` and its wrapping `<transition name="fade-in">`
  ([Home.vue:94-101](../badhan-frontend/src/views/Home.vue#L94-L101))

No Cypress spec references `#olderBatchResultsButton` (grepped: the id appears only in
`Home.vue`), so nothing in the e2e suites needs adjusting.

### 8.4 Person detail page — per-donor toggle

[PersonDetails.vue](../badhan-frontend/src/components/PersonDetails.vue)

- `data`: `archiveFlag: false`
- both hydration paths set it: the `handleGETDonors` branch and the `this.profile` branch
  around [PersonDetails.vue:1188](../badhan-frontend/src/components/PersonDetails.vue#L1188)
- a `v-switch` next to the existing "Public Data" checkbox
  ([PersonDetails.vue:143](../badhan-frontend/src/components/PersonDetails.vue#L143)),
  rendered for super admins only (**S6**):

```html
<v-switch
  v-if="$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN"
  id="donorDetailsArchiveSwitchId"
  data-cy="donorDetailsArchiveSwitchId"
  v-model="archiveFlag"
  :disabled="!isDetailsEditable"
  inset dense
  label="Archived"
  :messages="archiveFlag ? 'Hidden from normal search' : ''"
/>
```

`:disabled="!isDetailsEditable"` stays as a second condition: a super admin can be looking
at a donor whose details are not in edit mode.

- `saveDetailsClicked`'s `sendData`
  ([PersonDetails.vue:1051](../badhan-frontend/src/components/PersonDetails.vue#L1051))
  gains `archiveFlag: this.archiveFlag`. This is **unconditional** — the validator makes
  `archiveFlag` a required body field (§3), so a non-super-admin saving unrelated edits must
  still send it. Because `archiveFlag` is hydrated from the loaded donor and the switch is
  never rendered for them, they round-trip the donor's existing value and change nothing.
- Because archiving demotes (**S5**), turning the switch on for a donor whose
  `designation > 0` should route through the confirmation box first, with a message that
  names the consequence: *"Archiving will also demote this member to a regular donor.
  Continue?"* On success, set `this.designation = DESIGNATIONS_INDEX.DONOR` locally so the
  Settings block's `isAllowedTo…` computeds
  ([PersonDetails.vue:673-692](../badhan-frontend/src/components/PersonDetails.vue#L673-L692))
  re-evaluate without a reload.
- Show an "Archived" chip in the card header when `archiveFlag` is true.

### 8.5 Super-admin settings — the only writable control

[MyProfile.vue](../badhan-frontend/src/views/MyProfile.vue), in the existing `Settings`
`v-card-text` next to the dark-theme switch
([MyProfile.vue:11](../badhan-frontend/src/views/MyProfile.vue#L11)), guarded by
`v-if="$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN"`:

```html
<v-switch
  id="archiveSearchSwitchId"
  data-cy="archiveSearchSwitchId"
  v-model="archiveSearchEnabled"
  inset
  label="Enable archive search"
  :messages="archiveSearchHint"
/>
```

`archiveSearchHint` renders the remaining lifetime from `ldb.archiveSearch.expiry()`
("Automatically turns off in 7 h 12 m") or "Turns itself off 24 hours after being enabled"
when off.

The `v-model` is a computed with a getter/setter, exactly like `darkTheme` at
[MyProfile.vue:116](../badhan-frontend/src/views/MyProfile.vue#L116) — but **synchronous**,
because there is no API call (**S3**):

```js
archiveSearchEnabled: {
  get () { return this.$store.getters['archiveSearch/getArchiveSearchEnabled'] },
  set (newValue) { this.$store.commit('archiveSearch/setArchiveSearchEnabled', newValue) }
}
```

The mutation writes through to `localStorage` with the 24 h TTL (§7). No await, no revert
path, no failure mode — flipping it cannot fail.

### 8.6 No new page

There is **no** `Archive.vue`, no `/archive` route, and no new nav entry. Browsing archived
donors is the existing search page with the setting on (§8.1–8.3): same `Filters`, same
`handleGETSearchV3`, same `PersonCardNew` list, same `Home/Details.vue` child route for
drilling into a donor. The only thing that changes between the two modes is one boolean in
the search payload, the banner above the results, and the direction of the footer button.

Two consequences worth stating so they are not mistaken for oversights:

- **The archive is not browsable while the setting is off.** A super admin who wants to see
  archived donors flips the settings switch first. There is no per-search override.
- **An "Archived" chip on `PersonCardNew`** ([PersonCardNew.vue](../badhan-frontend/src/components/PersonCardNew.vue)),
  driven by `person.archiveFlag`. It costs nothing (the field is already in the search
  response, §2) and reinforces the §8.2b banner at the level of the individual card, so the
  mode stays obvious after scrolling past the top of the list.

---

## 9. Tests

### Backend ([badhan-backend-test](../badhan-backend-test))

Under `tests/donors/`:

- `PATCH /donors/v2` with `archiveFlag: true` archives and demotes a volunteer to `0`;
  leaves a super admin at `3`.
- `POST /donors/archive` — happy path counts; a **hall admin archiving a donor in their own
  hall succeeds** (pins **S6**: no super-admin-only gate on the route, even though the UI
  never offers it to them); hall-restricted donor skipped for a hall admin of another hall;
  higher-designation target skipped; empty `donorIds` → 400; a large list (e.g. 2000 ids)
  succeeds, pinning the absence of an upper cap (§5.4); unknown ids counted as skipped, not
  404.
- `POST /donors/unarchive` — round-trip restores search visibility; designation is **not**
  restored (locks in **S5**).

No `tests/users/` changes — no user route is added or modified (§5.6, **S3**).

Search behaviour:

- `GET /search/v3?archived=false` excludes archived donors (the core regression test).
- `archived=true` returns **only** archived donors.
- `archived=true` as a **volunteer** also returns only archived donors — no 403, no
  coercion. This test exists to pin **S4** down deliberately, so that a later reader does not
  "fix" the missing designation check and silently break the archive page for the frontend.
- missing `archived` param → 400 from the validator (pins **S10**: no compatibility
  fallback, no server-side default).
- `GET /activeDonors` (which takes no `archived` param) **still returns** an archived donor
  who has an `activedonors` row — pins **S7** and, more importantly, catches the
  `archiveFlag: undefined → null` serialization trap in `generateSearchQuery` (§4), which is
  the most likely bug in this change and would empty the Active Donors list for everyone.
- `GET /donors/checkDuplicate` still reports a conflict against an archived donor's phone
  number, and the members list / statistics routes still count them (pins **S8**).

The donor factory ([db/test/factories/donorFactory.ts](../badhan-backend/src/db/test/factories/donorFactory.ts))
needs `archiveFlag` so fixtures are not built with the field missing.

### Cypress ([badhan-frontend-test/cypress/e2e](../badhan-frontend-test/cypress/e2e))

- `home/`: the archive checkbox is absent for a volunteer; present-but-`disabled` for a
  super admin; the footer button only renders after a search with results; the confirmation
  dialog text matches; cancelling issues no request (`cy.intercept` + no-call assertion).
- `home/`: **a volunteer's search request carries `archived=false`** — asserted with
  `cy.intercept` on the outgoing query, not by inspecting the DOM. Since the backend does not
  enforce this (**S4**), this interception is the only automated check that the hardcoding
  holds; without it a regression in the computed at §8.1 is invisible until a volunteer
  reports seeing archived donors.
- `home/`: with the setting on, a super admin's search sends `archived=true`, the "Showing
  archived donors" banner appears above the results, results render the "Archived" chip, and
  the footer button reads "Unarchive these donors?". The banner is absent on an
  `archived=false` search.
- `home/`: a search returning more than 5 batches renders **all** of them and no
  "Show results from older batches" button exists (pins §8.3b).
- `donors/`: the detail-page archive switch is **absent** for a volunteer and for a hall
  admin, and saving unrelated edits as one of them still round-trips the donor's existing
  `archiveFlag` (assert on the intercepted `PATCH /donors/v2` body, since the field is
  required by the validator).
- `donors/`: as a super admin, toggling the detail-page switch on a volunteer shows the
  demotion warning and the designation display updates after save.
- `auth/` or `home/`: flipping the settings switch in
  [MyProfile.vue](../badhan-frontend/src/views/MyProfile.vue) changes what the search page
  sends on the next search, without a reload — and issues **no** network request of its own
  (`cy.intercept` + no-call assertion), pinning **S3**.
- `home/`: the setting survives a page reload (localStorage), and a
  `cy.clearLocalStorage()` — or a logout, which calls `ldb.reset()` — leaves the next search
  sending `archived=false`.
- `home/`: with the stored expiry stubbed into the past
  (`cy.window().then(w => w.localStorage.setItem('archiveSearch', …))`), the next search sends
  `archived=false` without any user action — pins the TTL in §7.

Run: `docker compose run --rm backend-test <cmd>` / `docker compose run --rm frontend-test <cmd>`.

---

## 10. Implementation order

Each step leaves the tree green and deployable on its own.

1. **Schema + migration + indexes.** Deploy and run the migration *before* any read path
   depends on the field.
2. **Search read path.** `archived` param on `/search/v3` only, the guarded
   `generateSearchQuery` change. Regenerate tsoa. At this point nothing is archived, so behaviour is unchanged — verify
   with `explain()` that the new index is chosen, and smoke-test Active Donors (it shares
   `generateSearchQuery`).
3. **Write paths.** `archiveFlag` on `PATCH /donors/v2` plus the two batch routes — that is
   the entire backend surface. Backend tests.
4. **Frontend API layer**, the `localDatabase/archiveSearch` module and the small Vuex
   module (§7).
5. **Person detail toggle** — the first way to actually archive anything.
6. **Settings switch**, then the **blurred search-page mirror** and the "Showing archived
   donors" banner — at which point browsing the archive works, since the search page *is* the
   archive browser.
7. **Remove the older-batches gate** (§8.3b) so every result is on screen, then the
   **search-results batch button** (both directions) and the `PersonCardNew` chip.
8. Cypress suites; `docker compose exec frontend npm run build`.

---

## 11. Open questions

**None.** Everything raised has been decided and folded into the section it affects:

| Was | Now |
| --- | --- |
| What does the Active Donors page send? | **S7** / §5.2 — nothing; the page ignores archiving entirely |
| Guest mode | **S11** — `/guest/search/v3` takes no params; nothing to do |
| Bulk-archive criterion? | **S9** — archiving is purely manual |
| Backward compatibility for the required params | **S10** — none; older clients get a 400 |
| Does batch archiving warn about demotion? | §8.3 — no, it demotes silently |
| Index build on production | non-issue at ~4 k donors |
| Render guard on older batches | §8.3b — removed |
| Stripping `archiveSearchEnabledUntil` from donor payloads | moot — **S3** — the field does not exist; the setting is browser-local |

The last one is worth spelling out, since it deleted a whole slice of the plan rather than
answering it: the archive-search toggle is a `localStorage` value on the super admin's own
browser. No schema field, no `PATCH /users/archiveSearch`, no `/users/me` addition, no
projection to patch, no backend test — and therefore nothing that could leak. The only new
column in the database is `archiveFlag` on the donor.
