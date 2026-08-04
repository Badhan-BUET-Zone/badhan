# Plan 6 — Donor archiving, split into standalone phases

This document restates [plan6.md](plan6.md) as **ten self-contained phases**. Each phase can be
read, implemented, reviewed and deployed on its own: it repeats every decision, rule, file, code
block and test it depends on, rather than pointing at another phase. Nothing from `plan6.md` is
dropped — the semantics section (**S1**–**S15**), every section §2–§10, the implementation order
§11 and the resolved-questions table §12 are all carried through. A traceability map at the end
([Appendix B](#appendix-b--traceability-plan6md--phases)) shows where each original section landed.

Cross-phase reading aid only (each phase repeats what it needs):

| Phase | Title | Depends on | Deployable alone |
| --- | --- | --- | --- |
| [1](#phase-1--data-model-migration-and-indexes) | Data model, migration, indexes | — | yes |
| [2](#phase-2--search-read-path) | Search read path (`GET /search/v3`) | 1 | yes |
| [3](#phase-3--write-path) | Write path (`PATCH /donors/v2`) + limiter removal | 1 | yes |
| [4](#phase-4--frontend-foundations) | Frontend API layer, `localDatabase`, Vuex module | 3 | yes (inert) |
| [5](#phase-5--person-detail-page-toggle) | Person detail page toggle + chip | 3, 4 | yes |
| [6](#phase-6--settings-switch-search-mirror-banner-and-shareable-url) | Settings switch, search mirror, banner, shareable URL | 2, 4 | yes |
| [7](#phase-7--search-results-footer-batch-sweep) | Full result rendering + footer batch sweep + card chip | 2, 3, 6 | yes |
| [8](#phase-8--the-all-donors-page-rename-then-partition) | All-donors page: rename, then partition | 1 | yes (2 commits) |
| [9](#phase-9--full-suite-and-build) | Full suite + production build | all | — |
| [10](#phase-10--manual-database-migration-before-deploying-to-development-and-production) | **Manual database migration, before any deploy to development or production** | 1 (code merged) | — |

Phase 8 is **independent of phases 2–7**; it needs only phase 1. It may land at any point after
phase 1.

Phase 10 is not code. It is the **manual gate that must be cleared before the backend or frontend
is deployed to development or production**: the `archiveFlag` migration is run by hand against each
environment's database, and nothing in the deploy path does it for you.

---

## Phase 0 — Shared context (read once; each phase repeats what it needs)

### Goal of the whole change

Introduce an `archiveFlag` on every donor so that inactive/stale donors can be moved out of the
default search space. The flag becomes the **first** `$match` predicate in the donor search
pipeline (`GET /search/v3`), so an index on it turns "search the live roster" into a cheap,
index-backed partition instead of a full-collection scan. Exactly one other read path partitions
on it — the super-admin all-donors table, `GET /donors/all` (phase 8) — and the Active Donors page
in particular ignores archiving entirely (**S7**). See **S8**.

### Surfaces

| Surface | Who | What | Phase |
| --- | --- | --- | --- |
| Person detail page | rendered for super admins only; backend allows anyone who may edit that donor | per-donor archive toggle | 5 |
| Search page ([Filters.vue](../badhan-frontend/src/components/Filters.vue)) | super admin only | archive-search flag, rendered **disabled** (read-only mirror of the setting); this is where archived donors are browsed — there is no separate archive page | 6 |
| Shareable search URL | anyone holding the link | `archiveFlag` travels in the query string and is honoured verbatim on open (**S13**) | 6 |
| Search results footer | super admin only | "Archive these donors?" → confirmation → a **client-side loop of `GET /donors` + `PATCH /donors/v2`**, one pair per donor, **capped at 200 donors** (**S15**); becomes "Unarchive these donors?" while browsing the archive | 7 |
| Super-admin settings | super admin only | the *only* place the archive-search flag can be flipped; browser-local, self-expires in 24 h | 6 |
| Statistics → "All Donors" tab | super admin only | today's "All Members" / `/statistics/membersAll`, which despite its name lists *every* donor — renamed to `donorsAll` end to end, **label included**, and partitioned to non-archived | 8 |
| Statistics → "Archived Donors" tab | super admin only | new read-only tab over the same table with `archiveFlag: true` | 8 |

**There is no dedicated batch-archive route.** `PATCH /donors/v2` is the single write primitive for
archiving, called once per donor. See **S12** and phase 3.

### The fifteen semantic decisions, in full

These are the reading of the request this plan implements. Every previously open question has been
decided and folded into the phase it affects, so there is nothing left assumed silently. Each phase
below repeats the ones it enforces; this list is the master copy.

**S1 — the flag partitions, it does not widen.**
`archiveFlag` is a boolean on the donor. The search filter is a boolean **also named `archiveFlag`**
— the same identifier end to end: the Mongo field, the `GET /search/v3` query param, the
`PATCH /donors/v2` body field, the frontend search payload key and the Vue data property are all
`archiveFlag`, with no `archived` alias anywhere. It is *always* sent, and the pipeline *always*
pins the donor's `archiveFlag` to it:

- `archiveFlag=false` → only non-archived donors.
- `archiveFlag=true` → only archived donors.

Consequence: a single equality predicate on an indexed field is always the leading stage. There is
no "show both" mode — that would defeat the optimization. Browsing the archive is therefore the
ordinary search page with the flag flipped, not a separate view.

**S2 — the search-page control is a mirror, not an input.**
[Filters.vue](../badhan-frontend/src/components/Filters.vue) renders the flag for super admins only,
as an ordinary **`disabled` checkbox — legible, not blurred** — showing the current value. Clicking
it does nothing except surface a hint pointing at the settings page. It is what switches the search
page between the live roster and the archive.

Decided against a CSS blur: the mirror's job is to tell a super admin *which partition they are
searching*, which a deliberately unreadable control does badly. A standard greyed-out checkbox
already reads as "not editable here", and the `:messages` hint says where it is editable. Nothing
else about the control changes — still `pointer-events`-inert by virtue of `disabled`, still
super-admin-only, still never the source of the payload value.

**S3 — the archive-search setting is frontend-only, per browser, and expires by construction.**
It is **not** stored on the donor document and there is no route that writes it. Nothing about it
reaches the backend except the resulting `archiveFlag` value on the search query. It lives in
`localStorage`, written when a super admin flips the switch in their own settings page and read by
the search page.

Expiry falls out of the storage helper that already exists —
[localDatabase/helpers.ts](../badhan-frontend/src/localDatabase/helpers.ts) has
`setWithExpiry(key, value, ttl)` / `getWithExpiry(key)`, and `getWithExpiry` deletes the key and
reports `EXPIRED` once the TTL has passed. So "resets within 24 h" is one call with
`ttl = 24 * 3600 * 1000`; no scheduler, no server field, no clock-skew race.

The 24 h runs from **enabling**, not from last use — reading never re-arms it. Toggling the switch
off removes the key outright; toggling it on again arms a fresh 24 h.

Two consequences, both accepted:

- **It is per browser, not per account.** A super admin who enables it on their phone does not get
  it on their laptop. Fine — it is a view toggle, not a preference worth syncing.
- **Logging out clears it.** `ldb.reset()` is `localStorage.clear()`
  ([localDatabase/index.ts:6](../badhan-frontend/src/localDatabase/index.ts#L6)) and runs on logout
  and on auth failure ([store/auth.ts:116](../badhan-frontend/src/store/auth.ts#L116)), so the next
  session starts with archive search off. That is the safe direction to fail.

**S4 — the gate is frontend-only; the API honours whatever `archiveFlag` it is sent.**
Confirmed as the intended end state, not a first cut. The search route takes `archiveFlag` at face
value for every caller regardless of designation. The backend has no notion of the archive-search
setting at all — it does not exist server-side (**S3**) — so there is nothing to enforce: no
coercion, no 403. The restriction lives entirely in the Vue layer:

- non-super-admins never see the flag at all — no control is rendered anywhere for them, and their
  search payload is hardcoded to `archiveFlag: false`, i.e. all non-archived donors;
- super admins send the value of their own browser-local, self-expiring setting.

The 24 h expiry exists **only** for a super admin flipping the flag in their own settings. It is a
convenience timer on a client-side toggle, not a security control.

The setting is therefore a **UI state store, not an authorization boundary**. Consequence to be
aware of: a volunteer who hand-crafts `GET /search/v3?...&archiveFlag=true` will get the archive
back, and so will a super admin whose 24 h has lapsed — and, after **S13**, so will anyone who is
*handed a shared search link* carrying `archiveFlag=true`, no hand-crafting required. Since archived
donors are the same donor documents the same caller can already read at `archiveFlag=false` — minus
none of the fields — this exposes ordering and partitioning, not new data. Accepted deliberately (it
is what keeps the read path free of per-request designation branching); revisit only if archived
status is ever meant to carry confidentiality.

Auditability covers the gap after the fact: the audit log records the effective `archiveFlag` value
on every search, so "who read the archive" stays answerable without enforcement. If enforcement is
ever wanted later, the natural place is a designation check in the search controller — but the
expiry could not be enforced there without first moving the setting server-side, and the backend and
Cypress tests deliberately assert the *permissive* behaviour and would have to be inverted.

**S5 — archiving demotes.**
On archive, if `designation` is `1` (volunteer) or `2` (hall admin) it becomes `0` (donor).
`designation === 3` (super admin) is left untouched — a super admin *can* be archived, they just
keep their designation. Unarchiving does **not** restore the old designation — demotion is one-way
and re-promotion is done by hand from the Settings block. No `preArchiveDesignation` field is stored.

Because archiving is always a `PATCH /donors/v2` (**S12**), this rule lives in exactly one place —
the controller body in phase 3 — and applies identically to the detail-page switch and to the
search-footer loop. There is no second implementation to keep in sync.

**S6 — permission to archive == permission to edit.**
Server side there is nothing new to write: archiving *is* a donor edit, so it inherits the predicate
`PATCH /donors/v2` already enforces
([DonorsController.ts:599](../badhan-backend/src/tsoaControllers/DonorsController.ts#L599)) — hall
restriction (`isHallRestricted(target.hall) && user.hall !== target.hall` → 403 unless super admin)
plus "cannot modify a member of higher designation". A hall admin who hand-crafts a `PATCH` with
`archiveFlag: true` for a donor in their own hall succeeds; for a donor in another hall they get the
same 403 they already get today.

Frontend side, none of the archive controls are exposed to non-super-admins: the detail-page switch
(phase 5), the batch footer button (phase 7) and the settings switch (phase 6) all render behind
`designation === SUPER_ADMIN`. Same split as **S4** — the API is permissive, the UI is narrow.

Note what this buys the footer loop: a super admin passes the predicate for *every* donor, so a
batch run from the search page cannot produce a permission failure. That is what makes a naive loop
acceptable — there is no partial-permission case to report.

**S7 — archiving does not cascade to other collections.**
Archiving flips one boolean (plus the **S5** demotion) and nothing else. Specifically:

- `activedonors` rows are **not** deleted, and the Active Donors page **does not filter on
  archiving** — an archived donor with an `activedonors` row keeps showing up there exactly as
  before. `GET /activeDonors` takes no `archiveFlag` param and no `$match` on it is ever added. The
  one edit its pipeline does take is a **projection** line so the shared `PersonCardNew` can render
  the "Archived" chip there (**S14**); that changes what the row *says*, never which rows come back.
- `tokens` are **not** revoked. A demoted hall admin keeps their session; the frontend nav degrades
  on their next `/users/me`, not immediately. Acceptable: the demotion is a designation change like
  any other, and existing designation changes behave the same way.
- donations, platelet donations, logs and every other collection are untouched.

**S8 — exactly two routes partition on `archiveFlag`: `GET /search/v3` and `GET /donors/all`.**
Archived donors stay fully visible in the Active Donors page (**S7**), the hall-scoped members list
(`GET /donors/designation`, [Members.vue](../badhan-frontend/src/views/Members.vue)), donation
reports, CSV export, the newly-created-donors view and the duplicate-phone check
(`GET /donors/checkDuplicate`). The last one matters: if duplicate detection skipped archived
donors, creating a donor would fail with "phone already exists" against a record nobody could find.

The two that *do* partition:

- **`GET /search/v3`** — the path whose cost this change is meant to cut (**S1**).
- **`GET /donors/all`** — the super-admin all-donors table, today `GET /donors/designation/all`. It
  is added by phase 8 and is the reason this decision reads "two routes" rather than "one". Its
  motivation is different: not cost, but that an unpartitioned list of every donor makes the archive
  meaningless on the one page most likely to be read as a roster. Both partitions are browsed
  through their own UI — the search page for the first (**S1**), the "Archived Donors" tab for the
  second (phase 8).

Everything phase 8 adds obeys the rules already set here: `archiveFlag` is the same identifier
(**S1**), mandatory with no server-side default (**S10**), taken at face value with no designation
branch in the controller (**S4**) — though unlike `/search/v3` this route is already behind
`handleSuperAdminCheck`, so the permissive read is moot in practice.

**S9 — archiving is a purely manual, per-donor action.**
There is no automatic archiving rule — no "batch older than X", no "no donation in N years", no
scheduled sweep. The migration (phase 1) only backfills `archiveFlag: false`; every subsequent
archive is a human pressing the detail-page switch (phase 5) or the search-footer button (phase 7),
and even the footer button is per-donor underneath (**S12**).

**S10 — `archiveFlag` is mandatory on the API; no backward compatibility.** Both the
`GET /search/v3` query param and the `PATCH /donors/v2` body field are **required, with no
server-side default and no fallback**. Concretely, that means all four of:

- the tsoa signatures declare them non-optional — `@Query() archiveFlag: boolean`, not
  `archiveFlag?: boolean` — so tsoa's own generated validation rejects a missing param before the
  controller body runs;
- the express-validator chains assert `.exists()`, so the rejection is a 400 with the project's
  standard error shape whichever layer catches it first;
- `generateSearchQuery` never substitutes a value when the key is absent — it emits no `archiveFlag`
  predicate at all, so a request that somehow bypassed validation would fail loudly as an
  unpartitioned search rather than silently defaulting to `false`;
- nothing in the frontend sends the request without the key: the `Filters.vue` computed always
  resolves to a boolean (`false` for non-super-admins and guests), and `PersonDetails.vue`'s
  `sendData` includes `archiveFlag` unconditionally even for users who never see the switch.

Older clients — a stale PWA/TWA bundle, any external caller — get a 400 until they update. Accepted
deliberately; the 400-on-missing-param tests pin it.

`email` is the one field moving the *other* way — see **S12**.

**S11 — guest mode is unaffected.** `GET /guest/search/v3`
([GuestController.ts:123](../badhan-backend/src/tsoaControllers/GuestController.ts#L123)) takes no
query params and returns fabricated donors, so nothing needs hardcoding on the guest path. The
`Filters.vue` computed still resolves to `false` for a guest (no designation in the store), which is
harmless since the value is ignored.

**S12 — there is no batch route; `PATCH /donors/v2` is called in a loop.**
No `POST /donors/archive`, no `POST /donors/unarchive`, no `donorInterface.archiveDonorsByIds`. The
search-footer button is a **client-side loop** over the donors on screen, and for each one it issues
`GET /donors?donorId=…` followed by `PATCH /donors/v2` with the fetched record and `archiveFlag`
flipped.

Why the `GET` is not optional: `PATCH /donors/v2` takes a **full** donor body — `name`, `phone`,
`studentId`, `bloodGroup`, `hall`, `roomNumber`, `address`, `availableToAll` and `email` — and
assigns every field onto the target. The search response projects `email: 0`
([donorInterface.ts:392](../badhan-backend/src/db/interfaces/donorInterface.ts#L392)), so a search
result alone cannot build a valid body: omitting `email` fails `validateBODYEmail`, and inventing
one trips the "you do not have permission to edit email address of another user" 403. Fetching the
donor first and round-tripping the real value clears both. `email` stays out of the search
projection — it is hidden from volunteers on purpose.

Three consequences, all accepted:

- **2N requests for N donors.** A 100-donor archive is 200 round trips. Sequential, with progress
  shown on the button. This is what **S15** caps at 200 donors / 400 requests.
- **The rate limiter has to go** from both routes in the loop. `commonLimiter` is 12
  requests/minute, which a loop blows through on its 12th call.
- **N audit-log rows**, one `PATCH DONORS` per donor, instead of one batch entry. Arguably better:
  the existing per-donor log already records the full target document, so an archive sweep is fully
  reconstructible from the log without a new verb.

What is *gained* is that the archive write path has exactly one implementation. **S5**'s demotion,
**S6**'s permission predicate, the `isHallUnknown` fixup and the audit log are all the code that
already exists and is already tested.

The loop makes **no exception for Badhan members**, including super admins. Every donor on screen is
patched; volunteers and hall admins are demoted by the **S5** rule in the controller and
designation-`3` donors are archived with their designation intact. That is deliberate — the batch
path and the detail-page switch apply exactly the same rule, so there is no second policy to keep in
sync, and no "some of these were skipped" state to report.

**S13 — `archiveFlag` travels in the shareable search URL and is honoured verbatim.**
`shareClicked` and `downloadInMobileClicked` include `archiveFlag` in the query they build, and
`Home.vue`'s `mounted()` reads it back with **no designation gate and no setting check** —
`this.archiveFlag = this.$route.query.archiveFlag === 'true'`. Opening an archive link reproduces
the archive search for whoever opens it.

This is the same permissiveness as **S4**, one step more reachable: there it took a hand-crafted
request, here it takes a forwarded link. Accepted for the same reason — archived donors are the same
documents, with the same fields, that the recipient can already read at `archiveFlag=false`; what a
link discloses is the partition, not new data. The audit log still records the effective flag on
every search.

Two structural consequences:

- the query the search page emits gains a **10th** key, which retires the exact-arity auto-search
  gate at [Home.vue:234](../badhan-frontend/src/views/Home.vue#L234) in favour of a presence check
  on the marker keys a shared link always carries — so legacy 9-key links keep auto-searching, on
  the live roster;
- the URL is a *third* source for `archiveFlag`, alongside the Filters mirror and the store.
  Precedence: the URL wins on mount, a manual search from the panel wins afterwards.

**S14 — the "Archived" chip is shown to everyone, unguarded by designation.**
On `PersonCardNew` and in the detail-page header the chip renders purely off `person.archiveFlag`,
with no `designation === SUPER_ADMIN` condition — unlike every *control*, all of which stay
super-admin-only (**S6**).

Where a non-super-admin actually meets it: the **Active Donors** page, which by **S7** still lists
archived donors, and any direct link to a donor's detail page. Search never shows them one, since
their payload is pinned to `archiveFlag: false` (**S4**) — unless they open a shared archive link
(**S13**), in which case the chip is exactly the label that explains what they are looking at.

The cost is one field: `generateAggregatePipeline`'s `$project` is an **inclusion** projection, so
`archiveFlag` has to be named there or the chip silently never renders on Active Donors.

**S15 — the batch sweep is hard-capped at 200 donors.**
`GET /search/v3` has **no `$limit`** — `findDonorsByAggregate`
([donorInterface.ts:234](../badhan-backend/src/db/interfaces/donorInterface.ts#L234)) returns every
match — and after phase 7's render change every match is on screen. A broad search
(`AvailableToAll`, no blood group, no batch) therefore puts thousands of donors in `this.persons`,
and the **S12** loop would fire 2N requests against them.

**Decision: the footer button refuses rather than throttles.** When
`persons.length > ARCHIVE_BATCH_LIMIT` (200) the button renders `disabled` with the hint *"Narrow
your search to 200 donors or fewer to archive in bulk"*. There is no second confirmation tier, no
"archive the first 200", no chunking — the sweep either covers exactly what is on screen or does not
run.

Why a refusal and not a sterner prompt:

- 200 donors is already 400 sequential round trips, minutes of a tab that must stay open. The
  failure mode past that is not "the user regrets it" but "the user closes the laptop mid-sweep" —
  and a stopped sweep leaves the donors it already patched patched.
- Archiving is manual and per-donor by **S9**; a four-thousand-donor sweep is closer to the "batch
  older than X" rule **S9** explicitly rejects than to the workflow this button is for.
- Unarchiving is the same button in the other direction, so an unbounded mistake would have an
  equally unbounded undo — but only if the archive partition itself stays under the cap, which
  nothing guarantees.

The cap is a **frontend-only** guard, like every other archive control (**S4**, **S6**). The backend
gains no batch-size notion, because it has no batch route to put one on (**S12**) —
`PATCH /donors/v2` neither knows nor cares that it is the 199th call in a loop. A caller who scripts
5000 patches still succeeds, which is the same permissiveness **S4** and **S13** accept, and the
limiter removal is what makes it cheap.

`ARCHIVE_BATCH_LIMIT` is exported from
[src/mixins/constants.ts](../badhan-frontend/src/mixins/constants.ts) — the file that already holds
`DESIGNATIONS_INDEX` and the rest of the shared frontend constants; there is no `src/constants`
module and none is created. Named, not inlined, so the Cypress case imports the same symbol the
button reads and retuning the cap cannot orphan the test.

### How to run anything

Never run `npm`/`node`/`npx` on the host — everything goes through Docker:

```
docker compose up -d
docker compose exec backend npx tsc --noEmit
docker compose exec backend npm run tsoa:routes
docker compose exec backend npm run migrate          # DRY_RUN=1 first
docker compose exec frontend npm run build
docker compose run --rm backend-test <cmd>
docker compose run --rm frontend-test <cmd>
```

---

## Phase 1 — Data model, migration and indexes

**Depends on:** nothing. **Unblocks:** every other phase. **Deployable alone:** yes — after this
phase every donor has `archiveFlag: false` and nothing reads it.

### What this phase enforces

- **S9** — archiving is purely manual. The migration only backfills `archiveFlag: false`; **no donor
  is archived by it**. The collection comes out of the migration in exactly the state it went in,
  just with the field materialized and indexed.
- **S3** — the archive-search setting is *not* stored on the donor or anywhere else server-side, so
  there is no expiry timestamp to model, no validator for it, and no projection to patch to keep it
  out of donor payloads.
- **S14** — `archiveFlag` must stay in every donor payload, because the frontend renders an
  "Archived" chip from it.

### 1.1 `badhan-backend/src/db/models/Donor.ts`

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

That is the **only** new field in this entire plan. The only new column in the database is
`archiveFlag` on the donor.

Extend the swagger doc block above the schema with `archiveFlag`, matching the existing comment
style.

`archiveFlag` should *stay* in every donor payload — the search response in particular, since the
frontend needs it to render the "Archived" chip. Search v3 uses an *exclusion* projection
([donorInterface.ts:392](../badhan-backend/src/db/interfaces/donorInterface.ts#L392)), so new fields
flow through by default and nothing has to be added there.

### 1.2 Indexes

Two compound indexes:

```
{ archiveFlag: 1, hall: 1, bloodGroup: 1 }
{ archiveFlag: 1, availableToAll: 1, bloodGroup: 1 }
```

Rationale: `generateSearchQuery`
([donorInterface.ts:638](../badhan-backend/src/db/interfaces/donorInterface.ts#L638)) emits either
`hall` or `availableToAll` (never both, except in the `availableToAllOrHall` branch) plus optionally
`bloodGroup`. `studentId`/`name`/`address` are all `$regex` with a leading `.*`, so they are not
index-usable and must stay off the prefix. Putting `archiveFlag` first keeps both indexes usable for
the flag alone.

**They are created explicitly by the migration, not by mongoose `autoIndex`.** `donorSchema`
currently declares no indexes at all, so leaning on autoIndex would make index creation an invisible
side effect of every app boot on every instance. Creating them in the migration makes it one
reviewed, logged, ordered step — backfill first, then index, so the index is built over materialized
values. Declare them in the schema too (`donorSchema.index(...)`) for documentation and for fresh
test databases, but the production build is the migration's job.

### 1.3 Migration

New file `badhan-backend/scripts/migrations/files/20260802_add-archive-flag.ts`, modelled on
[20250826_remove-extra-fields.ts](../badhan-backend/scripts/migrations/files) and
[template.ts](../badhan-backend/scripts/migrations/template.ts) — default-exported
`async function run()`, `import '../_bootstrap'`, models off `mongoose.connection.models`, and
`DRY_RUN` honoured on both steps (`process.env.DRY_RUN === '1' | 'true'`, logging what it *would*
write). Two steps, in this order:

```
// 1. backfill
DonorModel.updateMany({ archiveFlag: { $exists: false } }, { $set: { archiveFlag: false } })

// 2. index
DonorModel.collection.createIndex({ archiveFlag: 1, hall: 1, bloodGroup: 1 })
DonorModel.collection.createIndex({ archiveFlag: 1, availableToAll: 1, bloodGroup: 1 })
```

Plain `createIndex` with no options — no `background: true`, no `TTL`, no partial filter. At ~4 k
donors the build is sub-second, so the foreground build is simpler and finishes before the
migration's next log line. Index build on production is a non-issue at this size.

Run with `docker compose exec backend npm run migrate` (dry run first: `DRY_RUN=1`). Backfilling
explicitly rather than relying on the mongoose default matters, because a missing field would not
match `{ archiveFlag: false }` and those donors would vanish from search. `createIndex` is
idempotent, so a re-run is harmless.

### 1.4 Test fixtures

The donor factory
([db/test/factories/donorFactory.ts](../badhan-backend/src/db/test/factories/donorFactory.ts)) needs
`archiveFlag` so fixtures are not built with the field missing. Seed it as `false`, not a faker
boolean — a randomly archived fixture would make the phase-2 search tests non-deterministic.

### 1.5 Consequences of the field appearing in every donor payload

`archiveFlag` is now part of every response built from the donor document, which two places
notice immediately:

- **Backend-test JSON schemas use `additionalProperties: false`.** Every donor-shaped schema needs
  `archiveFlag: { type: 'boolean' }` in `properties`, and `'archiveFlag'` in `required` wherever the
  route really returns it — `tests/donors/schemas.js` (donorsNew, search, duplicateDonor, getDonors,
  newDonor), `tests/users/fetchMe/schemas.js`, `tests/users/redirection/schemas.js`. In
  `tests/activeDonors/schemas.js` add the **property only**: that pipeline uses an inclusion
  projection that does not carry `archiveFlag` until phase 2, which is exactly when it becomes
  required there.
- **Guest fabrications must mirror the real payloads.** Add `archiveFlag: false` to the fabricated
  donor in `GET /guest/users/me`, `POST /guest/donors`, `GET /guest/search/v3`, `GET /guest/donors`,
  `GET /guest/donors/checkDuplicate` and `GET /guest/donors/new`
  ([GuestController.ts](../badhan-backend/src/tsoaControllers/GuestController.ts)). Leave the guest
  **active-donors** fabrication alone for the same reason as above — it gains the field in phase 2.

### 1.6 Note on `syncIndexes()`

Declaring the two indexes on `donorSchema` is **load-bearing, not documentation**: this codebase runs
`model.syncIndexes()` on every boot
([syncIndexes.ts:112](../badhan-backend/src/db/syncIndexes.ts#L112), called from
[mongoose.ts](../badhan-backend/src/db/mongoose.ts)). Indexes present in the database but absent from
the schema are **dropped**, so a migration-only index would survive exactly until the next app start.

### Verification

- `docker compose exec backend npx tsc --noEmit` and `docker compose exec backend npm run lint`
- `docker compose exec -e DRY_RUN=1 backend npx ts-node --transpile-only scripts/migrations/index.ts 20260802_add-archive-flag`,
  then the same command without `DRY_RUN`.
- Confirm both indexes exist on the `donors` collection and that no donor's `archiveFlag` is
  missing.
- Existing backend suite stays green — 139/139:
  `docker compose run --rm -v "$(pwd)/badhan-backend-test/tests:/app/tests" -v "$(pwd)/badhan-backend-test/logs:/app/logs" backend-test npm test`.
  The bind mounts matter: the `backend-test` image bakes its sources at build time, so without them
  the run silently exercises the previously built copy of the tests, and per-test failure detail
  (written to `logs/error/`) is discarded with the container.
- The suite's `global-setup` purges the local database, so re-run the migration afterwards if you
  want the local indexes and backfill back.

---

## Phase 2 — Search read path

**Depends on:** phase 1 (the field must exist and be backfilled). **Deployable alone:** yes — with
nothing archived yet, behaviour is unchanged apart from the now-required param.

### What this phase enforces

- **S1** — `archiveFlag` is the same identifier end to end (Mongo field, query param, payload key);
  no `archived` alias. `archiveFlag=false` → only non-archived donors; `archiveFlag=true` → only
  archived donors. There is no "show both" mode.
- **S4** — the search route takes `archiveFlag` at face value for every caller regardless of
  designation: no coercion, no 403, no designation branch. The backend has no notion of the
  archive-search setting at all. A volunteer hand-crafting `?archiveFlag=true` gets the archive back;
  this is accepted deliberately because archived donors are the same documents with the same fields
  the caller can already read at `archiveFlag=false`. The audit log is what answers "who read the
  archive".
- **S7** — archiving does not cascade. `GET /activeDonors` takes no `archiveFlag` param and gains no
  `$match`; archived donors keep appearing there.
- **S8** — of the routes in this phase, only `GET /search/v3` partitions. `GET /activeDonors`,
  `GET /donors/designation`, donation reports, CSV export, the newly-created-donors view and
  `GET /donors/checkDuplicate` are all untouched. The duplicate check matters: if it skipped archived
  donors, creating a donor would fail with "phone already exists" against a record nobody could find.
- **S10** — the param is required, with no server-side default and no fallback, enforced at both the
  tsoa signature and the express-validator chain.
- **S11** — guest mode is unaffected: `GET /guest/search/v3` takes no query params and returns
  fabricated donors.
- **S14** — the Active Donors pipeline gains one **display-only** projection line so the shared card
  can render the "Archived" chip there.

### 2.1 Validator — `validateQUERYArchiveFlag`

`badhan-backend/src/validations/validateRequest/validateQuery.ts`

```ts
export const validateQUERYArchiveFlag: ValidationChain = query('archiveFlag')
  .exists().withMessage('archiveFlag is required')
  .isBoolean().withMessage('archiveFlag must be boolean')
  .toBoolean()
```

`.exists()` with no options is the strict form: `?archiveFlag=` (present but empty) fails
`.isBoolean()`, and an omitted param fails `.exists()`. Neither is defaulted (**S10**).
`.toBoolean()` matters because a query param arrives as the string `'false'`, which is truthy —
without the coercion, `typeof reqQuery.archiveFlag === 'boolean'` in §2.2 would be false and the
predicate would be dropped, turning an `archiveFlag=false` search into an unpartitioned one.

`badhan-backend/src/validations/donors.ts` — add `validateQUERYArchiveFlag` to
`validateGETSearchDonors`.

The `QUERY`/`BODY` prefixes are what keep this chain distinct from the body chain added in phase 3 —
the wire name is `archiveFlag` in both places, per **S1**.

`badhan-backend/src/validations/activeDonors.ts` — **untouched** (**S7**).

`badhan-backend/src/validations/users.ts` — **untouched**. There is no `PATCH /users/archiveSearch`
(**S3**), so no `validateBODYEnabled` and no `validatePATCHUsersArchiveSearch` are added.

### 2.2 `generateSearchQuery` ([donorInterface.ts:638](../badhan-backend/src/db/interfaces/donorInterface.ts#L638))

Add `archiveFlag?: boolean` to the parameter type and `archiveFlag?: boolean` to `IQueryBuilder`
([donorInterface.ts:629](../badhan-backend/src/db/interfaces/donorInterface.ts#L629)). Set it
**first**, before the blood-group branch, so the emitted object's first key is the indexed equality
— but only when a boolean was actually supplied:

```ts
if (typeof reqQuery.archiveFlag === 'boolean') {
    queryBuilder.archiveFlag = reqQuery.archiveFlag
}
```

The guard is **load-bearing**, not defensive noise. `generateSearchQuery` has a second caller —
`generateAggregatePipeline` (Active Donors) — which after **S7** does *not* pass `archiveFlag`. An
unguarded `queryBuilder.archiveFlag = undefined` would still emit the key, and the driver serializes
`undefined` to `null` by default (`ignoreUndefined` is off), so the Active Donors `$match` would
become `archiveFlag: null` and match **zero** donors. Setting the key conditionally is what keeps
Active Donors untouched.

The optional `?` here is **not** a softening of **S10**. `generateSearchQuery` is an internal helper
shared by two callers with different needs; mandatoriness is enforced at the API edge (tsoa
signature + `.exists()` validator), which every `/search/v3` request passes through before this
function is reached. By the time the search path calls it the key is always a real boolean — the
guard exists solely for the Active Donors caller, which deliberately passes nothing.

(Key order in the object does not drive index selection — the planner does — but keeping it first
makes the intent legible and matches "the very first filtering".)

### 2.3 `findDonorsByAggregate` ([donorInterface.ts:234](../badhan-backend/src/db/interfaces/donorInterface.ts#L234))

The only caller that passes `archiveFlag`. Nothing further to change: stage 1 is already
`{ $match: queryBuilder }`, which now carries `archiveFlag`. This is the ideal shape — the flag is
applied before the `donations` and `plateletdonations` `$lookup`s, which is where the current cost
sits.

### 2.4 `generateAggregatePipeline` ([donorInterface.ts:499](../badhan-backend/src/db/interfaces/donorInterface.ts#L499)) — projection only

**No filtering change** (**S7**). It does not pass `archiveFlag`, so its `queryBuilder` comes back
without `archiveFlag`, no early `$match` is added, and archived donors keep appearing in the Active
Donors list exactly as today. The `undefined` trap above is the thing to be careful about.

One line does change, and it is display-only (**S14**). The `$project` at
[donorInterface.ts:527](../badhan-backend/src/db/interfaces/donorInterface.ts#L527) is an
**inclusion** projection over `$donorDetails`, so unlike search v3 nothing flows through by default:

```ts
$project: {
    markerId: 1,
    _id: '$donorDetails._id',
    …
    archiveFlag: '$donorDetails.archiveFlag',   // ← added, for the PersonCardNew chip
    markedTime: '$time'
}
```

Note the ordering hazard this creates: `{ $match: queryBuilder }` runs **after** this projection, so
now that `archiveFlag` survives it, a `queryBuilder` that ever carried the key would genuinely
filter the Active Donors list. The `typeof … === 'boolean'` guard above is what keeps that from
happening; the test that an archived donor still appears in `GET /activeDonors` is what keeps it
from regressing.

### 2.5 `GET /search/v3` — one new query param

[SearchController.ts](../badhan-backend/src/tsoaControllers/SearchController.ts)

Add `@Query() archiveFlag: boolean` — **required, not `archiveFlag?: boolean` and with no default
value** (**S10**) — and put it in `reqQuery` under the same key. A non-optional tsoa `@Query()` makes
the generated route reject a request that omits it, so the mandatoriness holds even for a caller
that somehow skips the express-validator chain. That is the whole change — no designation check, no
expiry check, no coercion (**S4**). The existing
`logInterface.addLog(user._id, 'GET SEARCH V3', …)` call already logs the whole filter object, so
`archiveFlag` lands in the audit log for free; since the route is deliberately permissive (**S4**),
that log is the only record of who browsed the archive.

### 2.6 `GET /activeDonors` — no controller change

[ActiveDonorsController.ts:206](../badhan-backend/src/tsoaControllers/ActiveDonorsController.ts#L206)
is left alone: no `archiveFlag` query param, no validator, no `$match` (**S7**). Archived donors who
have an `activedonors` row still appear in the Active Donors list. The controller signature is
untouched — the only edit on this path is the one projection line inside `generateAggregatePipeline`
(§2.4) that carries `archiveFlag` out to the card chip (**S14**).

### 2.7 tsoa regeneration

Any controller signature or `@Middlewares` change requires:

```
docker compose exec backend npm run tsoa:routes
docker compose exec backend npx tsc --noEmit
```

Generated output under [badhan-backend/src/tsoaRoutes](../badhan-backend/src/tsoaRoutes) is **not**
committed — `src/tsoaRoutes/` is in [badhan-backend/.gitignore](../badhan-backend/.gitignore), and
`npm run build` regenerates it (`build` = `tsoa:routes && tsoa:spec && tsc`). Regenerate locally so
the running container serves the new signature; never hand-edit it, and expect no diff to review.
(plan6.md §5.6 says it is committed — it is not.)

### 2.8 Test-suite plumbing this phase must update

`archiveFlag` is now required on the search route, and present on every active-donors row:

- the shared `searchDonors` helper
  ([tests/lib/operations/search.js](../badhan-backend-test/tests/lib/operations/search.js)) must put
  `archiveFlag` on the query string — default it to `false` so every existing spec keeps describing
  the live roster, and accept an override for the archive;
- [tests/activeDonors/schemas.js](../badhan-backend-test/tests/activeDonors/schemas.js) moves
  `archiveFlag` from "allowed property" (phase 1) to **required** — that is the assertion pinning the
  §2.4 projection line;
- the guest **active-donors** fabrication in
  [GuestController.ts](../badhan-backend/src/tsoaControllers/GuestController.ts) gains
  `archiveFlag: false`, so the guest payload keeps matching the same schema (**S11**).

### 2.9 Backend tests ([badhan-backend-test](../badhan-backend-test))

**Scope note — nothing can be archived yet.** `PATCH /donors/v2` does not accept `archiveFlag` until
phase 3, and the test suite talks to the API over HTTP with no direct database access, so this phase
can only assert the partition's *shape*, not its contents. The assertions that need a real archived
donor are listed in phase 3 (§3.6) and land with the write path that makes them possible.

Testable here, in `tests/donors/searchDonors/`:

- **`archiveFlag` partitions.** A freshly created donor is returned by `archiveFlag=false` and is
  **absent** from `archiveFlag=true`. This is what fails if the predicate is dropped rather than
  applied — without it the same donor comes back for both values.
- **`archiveFlag` is mandatory** → 400 (pins **S10**: no compatibility fallback, no server-side
  default). Three variants, all 400: the param omitted entirely, `?archiveFlag=` empty, and
  `?archiveFlag=maybe` non-boolean. A request sending the legacy name `archived` also 400s — there is
  no alias (**S1**). Critically, the assertion is *400*, not "returns non-archived donors" — a
  regression that defaults the param would otherwise pass unnoticed.
- **the search response omits `email`** (unchanged behaviour, but now load-bearing: phase 7's
  per-donor `GET` exists precisely because of it — **S12**).
- **`archiveFlag=true` as a volunteer is a 200** — no 403, no coercion. This test exists to pin
  **S4** down deliberately, so that a later reader does not "fix" the missing designation check and
  silently break the archive page for the frontend.
- **every `GET /activeDonors` row carries `archiveFlag`** — via the now-required schema field. It
  pins the inclusion-projection line in §2.4 (**S14**), which is the only thing standing between the
  Active Donors chip and a silent `undefined`. Asserting the field's *presence* rather than its
  truthiness is what makes a dropped projection line fail instead of reading as "not archived".
  Every existing `GET /activeDonors` spec doubles as the regression test for the
  `archiveFlag: undefined → null` serialization trap in `generateSearchQuery` (§2.2): if the guard
  were missing, that list would come back empty and those specs would fail.

### Verification

At this point nothing is archived, so behaviour is unchanged.

- Full backend suite green: 143 tests (139 pre-existing plus the four above).
- `explain()` shows the new indexes are chosen and that the flag alone is index-backed:
  `{archiveFlag, hall, bloodGroup}` → `IXSCAN archiveFlag_1_hall_1_bloodGroup_1`,
  `{archiveFlag, availableToAll, bloodGroup}` → `IXSCAN archiveFlag_1_availableToAll_1_bloodGroup_1`,
  `{archiveFlag}` alone → `IXSCAN`. Note the suite's purge **drops every index** on the collection,
  so re-run the phase-1 migration (or restart the backend, which triggers `syncIndexes()`) before
  measuring — a `COLLSCAN` right after a test run means the indexes are gone, not that they are
  unusable.
- Smoke-test Active Donors: it shares `generateSearchQuery`, and its payload should now carry
  `archiveFlag: false` per row.

---

## Phase 3 — Write path

**Depends on:** phase 1. Independent of phase 2. **Deployable alone:** yes.

### What this phase enforces

- **S5** — archiving demotes: designation `1` (volunteer) or `2` (hall admin) becomes `0` (donor) on
  archive; `designation === 3` (super admin) is left untouched. Unarchiving does **not** restore the
  old designation — demotion is one-way, re-promotion is manual from the Settings block, and no
  `preArchiveDesignation` field is stored. This rule lives in **exactly one place**, the controller
  body below.
- **S6** — permission to archive == permission to edit. Nothing new server side: archiving inherits
  the hall restriction and the "cannot modify a member of higher designation" predicate
  `PATCH /donors/v2` already enforces. A hall admin patching `archiveFlag: true` for a donor in their
  own hall succeeds; another hall gives the existing 403.
- **S10** — `archiveFlag` is a **required** body field with no default: a body without it is a 400,
  never an implicit unarchive.
- **S12** — this is the **only** write path. There is no `POST /donors/archive`, no
  `POST /donors/unarchive`, no `donorInterface.archiveDonorsByIds`. The batch sweep in phase 7 loops
  this route, one `GET /donors` + one `PATCH /donors/v2` per donor, which is why the limiter must go.
- **S3** — no user route and no `/users/me` field: the archive-search toggle never leaves the browser.

### 3.1 Validator — `validateBODYArchiveFlag`

`badhan-backend/src/validations/validateRequest/validateBody.ts`

```ts
export const validateBODYArchiveFlag: ValidationChain = body('archiveFlag')
  .exists().withMessage('archiveFlag is required')
  .isBoolean().withMessage('archiveFlag must be boolean')
  .toBoolean()
```

Note the `.withMessage()` binds to `.isBoolean()` and `.toBoolean()` comes last — attaching the
message after the sanitizer would label the wrong assertion.

`badhan-backend/src/validations/donors.ts` — add `validateBODYArchiveFlag` to `validatePATCHDonors`.

No `validateBODYDonorIds`, no `validatePOSTDonorsArchive` / `validatePOSTDonorsUnarchive` — there are
no batch routes (**S12**).

`badhan-backend/src/validations/users.ts` — **untouched** (**S3**).

### 3.2 `PATCH /donors/v2` — one new body field, and the only write path

[DonorsController.ts:599](../badhan-backend/src/tsoaControllers/DonorsController.ts#L599)

Add `archiveFlag: boolean` to the `@Body()` type — **required**, exactly like the sibling
`availableToAll`, so a body without it is a 400 rather than an implicit unarchive (**S10**). This is
why phase 5 sends the field unconditionally, including for users who never see the switch. After the
existing permission checks and alongside `target.availableToAll = body.availableToAll`:

```ts
const isNewlyArchived: boolean = body.archiveFlag && !target.archiveFlag
target.archiveFlag = body.archiveFlag
if (isNewlyArchived && target.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
  target.designation = DESIGNATIONS_INDEX.DONOR
}
```

The `isHallUnknown(target.hall)` fixup and `await target.save()` stay where they are. Note the
demotion happens *inside* `save()`, so the schema's `designation` validator still runs.

This block is the **whole** archiving implementation (**S12**). The detail-page switch (phase 5) hits
it once; the search-results footer (phase 7) hits it once per donor. Nothing else writes
`archiveFlag`.

Everything else about the route is unchanged — in particular `email` stays a required body field with
its existing "cannot edit another user's email" 403, which is exactly why the footer loop fetches
each donor before patching it (**S12**).

### 3.3 Rate limiters on the two looped routes

`PATCH /donors/v2` ([DonorsController.ts:598](../badhan-backend/src/tsoaControllers/DonorsController.ts#L598))
and `GET /donors` ([DonorsController.ts:293](../badhan-backend/src/tsoaControllers/DonorsController.ts#L293))
both sit behind `rateLimiter.commonLimiter` — **12 requests per minute** in production
(`windowMs: 60_000, max: 12 * rateLimiterEnabled`, and `rateLimiterEnabled` is `1` when
`RATE_LIMITER_ENABLE=true`). The footer loop issues one of each per donor, so it would 429 on its
sixth donor.

**Decision: remove `rateLimiter.commonLimiter` from both middleware chains.**

```ts
// DonorsController.ts, GET /donors
@Middlewares([donorValidator.validateGETDonors, authenticator.handleAuthentication])

// DonorsController.ts, PATCH /donors/v2
@Middlewares([donorValidator.validatePATCHDonors, authenticator.handleAuthentication])
```

Both keep `handleAuthentication`, so they remain authenticated routes with the full **S6**
permission predicate; what goes away is only the per-IP request ceiling. Precedent exists in the same
controller — `POST /donors` runs `queue.donorInsertionQueue` instead of a limiter, and
`GET /donors/checkDuplicateMany`
([DonorsController.ts:983](../badhan-backend/src/tsoaControllers/DonorsController.ts#L983)) has no
limiter at all for the same reason: it is driven in bulk by the client.

Every other limiter is untouched — `donorDeletionLimiter`, `signInLimiter`,
`passwordRequestLimiter` and the rest keep their current caps, and `commonLimiter` stays on the
routes that are not part of this loop.

Two alternatives were considered and rejected. Raising `commonLimiter`'s `max` globally is one line
but changes the ceiling on **every** route that uses it — a far wider blast radius than removing it
from two. Introducing a new high-cap limiter (say 600/min) sized for the sweep keeps a ceiling on
these two routes, but adds a limiter whose only job is to be too large to ever fire, plus a test
threshold that has to track the cap. Removal matches the precedent already sitting in this
controller for exactly this reason.

Worth stating plainly since it is the one security-relevant edit in this plan: this widens the write
budget for *any* authenticated caller on `PATCH /donors/v2`, not just super admins running an
archive sweep. The route was never a credential-guessing surface (it requires a valid token and a
donor the caller may already edit), and the audit log still records every call, so the exposure is
volume, not new capability.

### 3.4 No batch routes, no user routes, no `/users/me` change

There is **no** `POST /donors/archive`, no `POST /donors/unarchive` and no
`donorInterface.archiveDonorsByIds` (**S12**).

There is likewise **no** `PATCH /users/archiveSearch`, and neither `GET /users/me`
([UsersController.ts:172](../badhan-backend/src/tsoaControllers/UsersController.ts#L172)) nor
`GET /donors/me` ([DonorsController.ts:36](../badhan-backend/src/tsoaControllers/DonorsController.ts#L36))
gains a field. The archive-search toggle never leaves the browser (**S3**); the only thing the
backend ever learns about it is the `archiveFlag` value on the next search query. No schema field,
no projection to patch, no backend test — and therefore nothing that could leak.

### 3.5 tsoa regeneration

```
docker compose exec backend npm run tsoa:routes
docker compose exec backend npx tsc --noEmit
```

The limiter removal lands in the generated routes, so it will **not take effect** until this is run.

### 3.6 Test-suite plumbing this phase must update

`archiveFlag` is now a required body field, so **every** `PATCH /donors/v2` in the suite must send
it — the validator runs before authentication, so a body missing it 400s before the permission
assertions the older specs are about:

- the `updateDonor` helper
  ([tests/lib/operations/donors.js](../badhan-backend-test/tests/lib/operations/donors.js)) defaults
  `archiveFlag: false`, overridable per call;
- the raw PATCH bodies in `tests/donors/patchDonorsV2/*.test.js` and
  `tests/donors/donorsPostPatchDelete/success.test.js` gain `archiveFlag: false` (they bypass the
  helper because they assert 403s with a specific token).

Two facts about the existing designation rules that the new specs have to work with, both easy to
trip over when writing cleanup steps:

- a donor must be at designation `0` to be deletable, and designation changes move **one step at a
  time** (`3 → 1 → 0`); and
- the designation route **never demotes a hall admin directly** — that happens only as a side effect
  of promoting someone else in the same hall. Archiving is the way down for a hall admin, which the
  §3.7 cleanup uses, and which is itself the **S5** demotion.

### 3.7 Backend tests, under `tests/donors/`

- `PATCH /donors/v2` with `archiveFlag: true` archives and demotes a volunteer to `0`; a hall admin
  likewise; a super admin is archived but **stays at `3`** (pins **S5**).
- `PATCH /donors/v2` with `archiveFlag: false` on an archived member does **not** restore the old
  designation (pins the one-way demotion in **S5**).
- `PATCH /donors/v2` with an otherwise-valid body that **omits** `archiveFlag` → 400, and the donor
  is left unmodified (pins **S10** on the write path: a missing field must not be read as `false` and
  silently unarchive someone).
- `PATCH /donors/v2` as a **hall admin, on a donor in their own hall**, with `archiveFlag: true` →
  200 (pins **S6**: archiving carries no gate beyond edit permission, even though the UI never offers
  it to them). Same call on a donor of another restricted hall → the existing 403.
- **Rate limiter removal (§3.3):** 30 sequential `PATCH /donors/v2` calls all succeed, and so do 30
  sequential `GET /donors` calls. This is the test that would catch someone re-adding
  `commonLimiter` and silently capping every archive sweep at 6 donors. Note it only *bites* with
  `RATE_LIMITER_ENABLE=true`: [env.local](../badhan-backend/env.local) sets it to `false`, which
  multiplies every cap by 100, so locally the assertion passes whether or not the limiter is there.
  Treat a local pass as "not broken", not as proof — the real check is reading the two
  `@Middlewares` lists.

There are **no** `POST /donors/archive` / `POST /donors/unarchive` tests, because there are no such
routes (**S12**). Archiving many donors is exercised at the Cypress layer (phase 7), where the loop
actually lives.

**Carried over from phase 2**, because this is the first phase in which a donor can actually be
archived — `PATCH /donors/v2` is the only way to produce one, and the test suite has no direct
database access. Land these with the write path, using a patch-to-archive as the seed step:

- `GET /search/v3?archiveFlag=false` **excludes** an archived donor (the core regression test).
- `archiveFlag=true` returns **only** archived donors — and, as a volunteer, still returns them
  (**S4** again, now with real contents rather than an empty partition).
- `GET /activeDonors` (which takes no `archiveFlag` param) **still returns** an archived donor who
  has an `activedonors` row, and that row carries `archiveFlag: true` — pins **S7** and **S14**
  together: archiving changes what the row *says*, never whether it comes back.
- `GET /donors/checkDuplicate` still reports a conflict against an archived donor's phone number,
  and the hall-scoped members list (`GET /donors/designation`) still counts them (pins **S8**). The
  duplicate check matters most: if it skipped archived donors, creating a donor would fail with
  "phone already exists" against a record nobody could find.

No `tests/users/` changes — no user route is added or modified (**S3**).

---

## Phase 4 — Frontend foundations

**Depends on:** phase 3 (the `PATCH` body field must be accepted). **Deployable alone:** yes — this
phase adds interfaces and modules that nothing renders yet.

### What this phase enforces

- **S1** — the frontend search payload key and the Vue data property are `archiveFlag`, the same
  identifier the backend `@Query()` declares, so the payload object serializes straight onto the
  query string.
- **S3** — the archive-search setting is browser-local, per browser, self-expiring in 24 h from
  *enabling* (reading never re-arms it), removed outright when toggled off, and wiped by
  `ldb.reset()` on logout. No API call, no store field, no `myprofile` involvement.
- **S7** — the Active Donors payload interface is untouched.

### 4.1 API layer — [badhan-frontend/src/api/index.ts](../badhan-frontend/src/api/index.ts)

- `GETSearchPayloadInterface` → add `archiveFlag: boolean` (same key the backend `@Query()` declares,
  so the payload object serializes straight onto the query string — **S1**)
- `GETActiveDonorsPayloadInterface` → **unchanged** (**S7**);
  [ActiveDonors.vue](../badhan-frontend/src/views/ActiveDonors.vue#L163) is not touched by this
  change at all.
- `PATCHDonorsPayloadInterface` → add `archiveFlag: boolean`

**No new API functions.** The footer loop (phase 7) composes the two handlers that already exist,
`handleGETDonors` and `handlePATCHDonors`, and the settings switch calls no API at all (**S3**). This
section is three interface edits and nothing more. (Phase 8 adds one handler of its own, for a
different route.)

### 4.2 State — no `myprofile` change

The archive-search flag is **not** part of `myprofile` — that store mirrors the server profile
(`GET /users/me`), and this value has no server side (**S3**). Nothing in
[store/myprofile.ts](../badhan-frontend/src/store/myprofile.ts) changes.

### 4.3 New persistence module

`badhan-frontend/src/localDatabase/archiveSearch.ts`, modelled on
[theme.ts](../badhan-frontend/src/localDatabase/theme.ts) but using the TTL helpers that already
exist in [helpers.ts](../badhan-frontend/src/localDatabase/helpers.ts):

```ts
import { setWithExpiry, getWithExpiry, remove } from '@/localDatabase/helpers'

const storeKey = 'archiveSearch'
const TTL = 24 * 3600 * 1000

const save = () => setWithExpiry(storeKey, true, TTL)
const load = () => getWithExpiry(storeKey).status === 'OK'
const clear = () => remove(storeKey)

const expiry = (): number | null => {
  const itemStr = localStorage.getItem(storeKey)
  if (!itemStr) return null
  return JSON.parse(itemStr).expiry
}

export default { save, load, expiry, clear }
```

`expiry()` reads `localStorage` directly rather than going through `getWithExpiry`, on purpose:
`getWithExpiry` *deletes* the key on a lapse, and rendering a hint must never be the thing that
clears the setting. It returns the raw epoch-ms `expiry` that `setWithExpiry` wrote
([helpers.ts](../badhan-frontend/src/localDatabase/helpers.ts) stores `{ value, expiry }`), or `null`
when the key is absent — including the case where a previous `load()` already expired it.

Register it in [localDatabase/index.ts](../badhan-frontend/src/localDatabase/index.ts) next to
`theme`. `getWithExpiry` already deletes the key and returns `EXPIRED` past the TTL, so `load()`
going false after 24 h needs no extra code. `expiry()` exists only to render the "turns off in about
7 hours" hint (phase 6); it reads the same JSON blob
(`JSON.parse(localStorage.getItem(storeKey)).expiry`) without consuming it.

`ldb.reset()` on logout wipes the key along with everything else (**S3**) — no extra call needed.

### 4.4 New Vuex module

`badhan-frontend/src/store/archiveSearch.ts` — tiny, and the reason it exists is reactivity:
`darkTheme` gets away with reading `ldb` directly from components because Vuetify re-renders on the
theme object, but the search page's checkbox and payload must update the moment the settings switch
flips, in the same session and without a reload (asserted by Cypress in phase 6).

```ts
state:     { enabled: ldb.archiveSearch.load() }        // seeded at module init
getters:   getArchiveSearchEnabled: (state) => state.enabled
mutations: setArchiveSearchEnabled (state, enabled) {
             enabled ? ldb.archiveSearch.save() : ldb.archiveSearch.clear()
             state.enabled = enabled
           }
```

The state is seeded once at boot, so a window left open past the 24 h would otherwise keep
`enabled === true` in memory after `ldb` has already expired the key — payload honest, checkbox
stale. **Decision: close the gap by writing back from the `Filters.vue` computed** (phase 6). That
computed re-checks `ldb.archiveSearch.load()` on every read and, when it finds the key gone while
store state is still `true`, commits `setArchiveSearchEnabled(false)`. No timer, no reload.

**Decision: the write-back lives in `Filters.vue`'s computed only — the residual staleness on the
settings page is accepted.** The check is *not* pushed down into the Vuex getter or a shared action,
so it fires only where that computed is evaluated: the search page. Consequence, stated so it is not
read as an oversight — a super admin who is sitting on
[MyProfile.vue](../badhan-frontend/src/views/MyProfile.vue) when the 24 h lapses keeps seeing the
switch in the "on" position until they navigate to the search page, at which point the resync fires
and the switch reads off on their return.

What this does *not* compromise is the thing that matters: **the payload is always honest**, because
`Filters.vue`'s computed re-checks `ldb` immediately before every manual search and resolves to
`false` on a lapsed key regardless of what the store or the switch says. The stale switch is a
display artefact on one page, never a search that partitions wrong. Keeping the check in one
component also keeps the mutation-inside-a-computed confined to a single place rather than spreading
it across the store, where every getter read would become a potential write.

---

## Phase 5 — Person detail page toggle

**Depends on:** phases 3 and 4. **Deployable alone:** yes — and it is **the first way to actually
archive anything**.

### What this phase enforces

- **S5** — archiving demotes (executed server side); the UI only hints at it.
- **S6** — the switch is super-admin-only. Hall admins and volunteers never see it, even though the
  API would permit a hall admin to archive a donor in their own hall.
- **S10** — `archiveFlag` is a required body field, so `sendData` includes it **unconditionally**,
  including for users who never see the switch.
- **S14** — the "Archived" chip renders purely off `archiveFlag`, **unguarded by designation**,
  unlike the switch above it.

### 5.1 [PersonDetails.vue](../badhan-frontend/src/components/PersonDetails.vue)

- `data`: `archiveFlag: false`
- both hydration paths set it: the `handleGETDonors` branch and the `this.profile` branch around
  [PersonDetails.vue:1188](../badhan-frontend/src/components/PersonDetails.vue#L1188)
- a `v-switch` next to the existing "Public Data" checkbox
  ([PersonDetails.vue:143](../badhan-frontend/src/components/PersonDetails.vue#L143)), rendered for
  super admins only (**S6**):

```html
<v-switch
  v-if="$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN"
  id="donorDetailsArchiveSwitchId"
  data-cy="donorDetailsArchiveSwitchId"
  v-model="archiveFlag"
  :disabled="!isDetailsEditable"
  inset dense
  label="Archived"
  :messages="archiveHint"
/>
```

`:disabled="!isDetailsEditable"` stays as a second condition: a super admin can be looking at a donor
whose details are not in edit mode.

### 5.2 No confirmation dialog for the demotion

Turning the switch on for a donor whose `designation > 0` shows a hint, not a prompt:

```js
archiveHint () {
  if (this.archiveFlag && this.designation > DESIGNATIONS_INDEX.DONOR) {
    return 'Will also demote this member to a regular donor on save'
  }
  return this.archiveFlag ? 'Hidden from normal search' : ''
}
```

Decided this way for consistency: the footer loop (phase 7) demotes without prompting too, and a
confirmation on toggle that has to be un-toggled on cancel is more moving parts than the consequence
warrants. The hint sits under the switch from the moment it is flipped until save.

### 5.3 Save path

- `saveDetailsClicked`'s `sendData`
  ([PersonDetails.vue:1051](../badhan-frontend/src/components/PersonDetails.vue#L1051)) gains
  `archiveFlag: this.archiveFlag`. This is **unconditional** — the validator makes `archiveFlag` a
  required body field (phase 3), so a non-super-admin saving unrelated edits must still send it.
  Because `archiveFlag` is hydrated from the loaded donor and the switch is never rendered for them,
  they round-trip the donor's existing value and change nothing.
- After a successful save where the donor was newly archived and had `designation > 0`, set
  `this.designation = DESIGNATIONS_INDEX.DONOR` locally so the Settings block's `isAllowedTo…`
  computeds ([PersonDetails.vue:673-692](../badhan-frontend/src/components/PersonDetails.vue#L673-L692))
  re-evaluate without a reload.

### 5.4 Header chip

Show an "Archived" chip in the card header when `archiveFlag` is true. **Unguarded by designation**
(**S14**) — unlike the switch above it, the chip renders for volunteers and hall admins too, so a
member who reaches an archived donor from Active Donors or a direct link sees why the record looks
the way it does.

### 5.5 Cypress tests ([badhan-frontend-test/cypress/e2e](../badhan-frontend-test/cypress/e2e))

- `donors/`: the detail-page archive switch is **absent** for a volunteer and for a hall admin, and
  saving unrelated edits as one of them still round-trips the donor's existing `archiveFlag` (assert
  on the intercepted `PATCH /donors/v2` body, since the field is required by the validator).
- `donors/`: as a super admin, flipping the detail-page switch on a volunteer shows the demotion
  **hint text** (not a dialog — pins §5.2) and the designation display updates after save.
- `activeDonors/` (pairs with the chip): an archived donor's detail page shows the chip but **no**
  archive switch when viewed as a volunteer.

---

## Phase 6 — Settings switch, search mirror, banner and shareable URL

**Depends on:** phases 2 and 4. **Deployable alone:** yes — at the end of this phase browsing the
archive works, since the search page *is* the archive browser.

**Land the URL param in this same phase**: `mounted()` parse, `shareClicked`,
`downloadInMobileClicked` and the arity-gate → presence-gate swap all move together, or shared links
carry the wrong partition in between.

### What this phase enforces

- **S1** — the search page with the flag flipped *is* the archive; there is no separate view and no
  "show both" mode.
- **S2** — the search-page control is a **mirror, not an input**: an ordinary `disabled` checkbox,
  legible and not blurred, with a `:messages` hint pointing at the settings page. No CSS, no wrapper
  div.
- **S3** — the setting is browser-local, per browser, self-expiring 24 h from enabling; toggling off
  removes the key; logout wipes it; no network request of any kind.
- **S4** — the Vue layer is the *entire* enforcement mechanism: non-super-admins have their payload
  hardcoded to `archiveFlag: false`; super admins send their own browser-local setting. The backend
  enforces nothing.
- **S11** — guest mode needs nothing extra: a guest has no designation in the store, so the computed
  yields `false`, and `/guest/search/v3` ignores query params regardless.
- **S13** — `archiveFlag` travels in the shareable URL and is honoured verbatim on open, with no
  designation gate and no setting check.

### 6.1 Super-admin settings — the only writable control

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

`archiveSearchHint` renders the remaining lifetime from `ldb.archiveSearch.expiry()` ("Automatically
turns off in about 7 hours") or "Turns itself off 24 hours after being enabled" when off. It is
computed on render, not on a timer — the phrasing is deliberately coarse so a value that is a few
minutes stale never reads as wrong.

The `v-model` is a computed with a getter/setter, exactly like `darkTheme` at
[MyProfile.vue:116](../badhan-frontend/src/views/MyProfile.vue#L116) — but **synchronous**, because
there is no API call (**S3**):

```js
archiveSearchEnabled: {
  get () { return this.$store.getters['archiveSearch/getArchiveSearchEnabled'] },
  set (newValue) { this.$store.commit('archiveSearch/setArchiveSearchEnabled', newValue) }
}
```

The mutation writes through to `localStorage` with the 24 h TTL (phase 4). No await, no revert path,
no failure mode — flipping it cannot fail.

### 6.2 Search filters — the disabled mirror

[Filters.vue](../badhan-frontend/src/components/Filters.vue)

Below the Available / Not Available row (~line 119), wrapped in
`v-if="$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN"`:

```html
<v-checkbox
  id="filterArchiveSearchCheckboxId"
  data-cy="filterArchiveSearchCheckboxId"
  dense
  disabled
  :input-value="archiveSearchEnabled"
  label="Search archived donors"
  :messages="'Changeable only from Super Admin settings'"
/>
```

No wrapper `<div>` and **no CSS at all** (**S2**) — `disabled` alone gives Vuetify's standard
greyed-out, unclickable checkbox, and it stays readable so a super admin can tell at a glance which
partition they are about to search.

`archiveSearchEnabled` is a computed reading the store getter. `searchClickInsideComponent` adds
`archiveFlag: this.archiveSearchEnabled` to the payload it hands to `searchClicked`.

**This computed is the entire enforcement mechanism** (**S4**), and it is also where the TTL
write-back from phase 4 happens. For a non-super-admin the getter must yield `false`, so designation
is part of the expression rather than something the hidden control implies:

```js
archiveSearchEnabled () {
  const stored = ldb.archiveSearch.load()          // re-checks the TTL, may delete the key
  const inStore = this.$store.getters['archiveSearch/getArchiveSearchEnabled']
  if (!stored && inStore) {
    // TTL lapsed while this window was open — resync the store so the switch and the
    // mirror stop showing a setting that no longer exists
    this.$store.commit('archiveSearch/setArchiveSearchEnabled', false)
  }
  return this.$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN &&
         inStore && stored
}
```

The commit inside a computed is deliberate and self-limiting: it can only ever fire on the
`true → false` edge, and the mutation writes `state.enabled = false`, so the next evaluation takes
the `!stored && !inStore` path and does nothing. It cannot loop.

The `v-if` hides the widget; this computed is what hardcodes the payload. Keep both — the `v-if`
alone would leave `archiveFlag` undefined in the payload, and the query validator requires the param
to exist.

Scope, given **S13**: this computed governs **manual searches** — every search started from the
Filters panel. It is *not* consulted on the deep-link path, where the URL's own `archiveFlag` is
taken verbatim (§6.3). So "a volunteer's own searches always send `archiveFlag=false`" remains true
and is Cypress-pinned; "a volunteer can never see an archived donor" is not, and never was (**S4**,
**S13**).

Guest mode needs nothing extra (**S11**): a guest has no designation in the store, so the computed
yields `false`, and `/guest/search/v3` ignores query params regardless.

Also extend the `HelpTooltip` `<ul>` at the top of the card with an entry explaining the archive
partition, matching the existing bullet style.

### 6.3 Search page plumbing — [Home.vue](../badhan-frontend/src/views/Home.vue)

- `data`: `archiveFlag: false`
- `search(payload)` → `sendData.archiveFlag = payload.archiveFlag`
- `searchClickedFromFilterComponent` → `this.archiveFlag = filterValues.archiveFlag`
- `searchClicked()` → pass `archiveFlag: this.archiveFlag` into `this.search({…})`

**Decision: `archiveFlag` is part of the shareable URL** (**S13**). It is a filter like any other on
that page, and a link that silently drops it would reproduce a *different* search than the one being
shared. Four edits, all in `Home.vue`:

- `mounted()` parses it alongside the other filters, verbatim — no designation check, no setting
  check:

  ```js
  this.archiveFlag = query.archiveFlag === 'true'
  ```

  `=== 'true'` (not truthiness) makes the absent case and the string `'false'` both resolve to
  `false`, so a legacy link without the key opens on the live roster rather than the archive.

- the auto-search gate at [Home.vue:234](../badhan-frontend/src/views/Home.vue#L234) —
  `if (Object.keys(this.$route.query).length === 9)` — **stops being an arity check altogether**.
  **Decision: replace it with a presence check on the keys a generated link always carries**, rather
  than bumping the count to `10`:

  ```js
  // src/mixins/constants.ts, next to ARCHIVE_BATCH_LIMIT
  export const SHARE_LINK_MARKER_KEYS = ['hall', 'radios', 'bloodGroup', 'availability', 'notAvailability']

  // Home.vue mounted()
  const isSharedSearchLink = SHARE_LINK_MARKER_KEYS.every(k => query[k] !== undefined)
  if (isSharedSearchLink) {
    await this.searchClicked()
    if (this.download) this.downloadInWeb()
  }
  ```

  Those five are exactly the keys both builders emit with an **always-non-empty** value — `hall` and
  `radios` are strings, `bloodGroup` is `-1` when unset, and the two availability flags are booleans.
  `name`, `batch` and `address` are deliberately **not** in the marker set: they serialize to
  `?name=` when empty, which is present-but-blank and a weaker signal. `archiveFlag` is **not** in
  the set either, and that is the point.

  Why the change, given the count-bump would have been one character: the arity check has to move in
  lockstep with the param count forever — every future filter is a silent break of every link already
  in circulation — and this plan is the second time it would have moved. Under the presence check the
  gate is a statement about *shape*, not *size*, so adding a tenth or eleventh filter later needs no
  edit here at all.

  What it also buys immediately: **legacy 9-key links keep working.** A link generated by the old
  build has all five marker keys and no `archiveFlag`, so it auto-searches as before and
  `query.archiveFlag === 'true'` resolves to `false` — it reopens on the live roster, which is the
  search it originally described. That removes the one-way break the arity bump would have caused, so
  unlike **S10** this part of the change is backward compatible.

- `shareClicked` ([Home.vue:408](../badhan-frontend/src/views/Home.vue#L408)) adds
  `archiveFlag: this.archiveFlag` to the resolved query — note it must be the flag that *produced*
  the results on screen, the same value the banner keys off, not the live setting.

- `downloadInMobileClicked` ([Home.vue:432](../badhan-frontend/src/views/Home.vue#L432)) adds the
  same key to the query it hands the redirection token, so the CSV opened on desktop covers the same
  partition as the results the user is looking at. Both builders emit the same nine keys today (eight
  filters plus `download`) and both must gain `archiveFlag` — **edit them together.** With the
  presence gate above, missing one no longer breaks auto-search; it does something quieter and worse,
  which is why they are still called out as a pair: a share link built without the key silently
  reopens the *live roster* while the user believed they were sharing the archive, and a mobile CSV
  download built without it exports the wrong partition.

Precedence between the three sources is therefore: **URL on mount → Filters computed on every manual
search afterwards**. The store/`ldb` setting reaches the payload only through the Filters computed
(§6.2); it never overrides a link.

### 6.4 "Showing archived donors" banner

When the result set on screen came from `archiveFlag: true`, a message sits **above** the results so
the mode is unmissable — the disabled sidebar checkbox is easy to scroll past:

```html
<v-alert v-if="archiveFlag && searchResultShown" data-cy="archivedResultsBanner"
         dense text type="info" class="rounded-xl">
  Showing archived donors
</v-alert>
```

Place it immediately before the `actions-` transition block that renders `personGroups`
([Home.vue:74](../badhan-frontend/src/views/Home.vue#L74)). It keys off the `archiveFlag` value that
*produced* the results, not the current setting, so it cannot claim the archive while live donors are
on screen. The search page carries deliberately **no** countdown and **no** lapse warning — this
banner plus the per-card chip (phase 7) are its only archive-mode indicators. The remaining lifetime
is shown once, as hint text under the settings switch that owns it (§6.1). A super admin whose window
expires mid-session simply sees the banner disappear on their next search.

### 6.5 No new page on the search path

There is **no** `Archive.vue`, no `/archive` route, and no new nav entry. Browsing archived donors is
the existing search page with the setting on: same `Filters`, same `handleGETSearchV3`, same
`PersonCardNew` list, same `Home/Details.vue` child route for drilling into a donor. The only thing
that changes between the two modes is one boolean in the search payload, the banner above the
results, and (after phase 7) the direction of the footer button.

Consequence worth stating so it is not mistaken for an oversight: **the archive is not browsable
*from search* while the setting is off.** A super admin who wants to search archived donors flips the
settings switch first; there is no per-search override. Phase 8's "Archived Donors" tab is the
exception and is deliberately not gated on the setting — it is a flat list under Statistics, not a
search, so there is no partition to get wrong and nothing for a 24 h timer to protect. The two
surfaces answer different questions: "find me an archived donor matching X" versus "show me
everything archived".

### 6.6 Cypress tests

- `home/`: the archive checkbox is absent for a volunteer; present-but-`disabled` for a super admin
  **and its label readable** — assert the rendered text, so a reintroduced blur or `visibility` trick
  fails (**S2**).
- `home/`: **a volunteer's search request carries `archiveFlag=false`** — asserted with
  `cy.intercept` on the outgoing query, not by inspecting the DOM. Since the backend does not enforce
  this (**S4**), this interception is the only automated check that the hardcoding holds; without it
  a regression in the §6.2 computed is invisible until a volunteer reports seeing archived donors.
- `home/`: with the setting on, a super admin's search sends `archiveFlag=true`, the "Showing
  archived donors" banner appears above the results, and results render the "Archived" chip. The
  banner is absent on an `archiveFlag=false` search.
- `home/`: **the shared URL round-trips the mode** (**S13**). As a super admin with the setting on,
  run an archive search, press share, and assert the copied URL carries `archiveFlag=true`. Visiting
  that URL directly auto-runs the search and sends `archiveFlag=true`. Assert on the **key's presence
  and value**, not on a query-key count — the gate is no longer an arity check and a test that counts
  keys would reintroduce the brittleness §6.3 removed.
- `home/`: **a legacy 9-key link still auto-searches.** Visit a hand-built URL carrying the old eight
  filters plus `download` and no `archiveFlag`: the search fires on mount and sends
  `archiveFlag=false`. This is the case the arity bump would have broken, and the reason the presence
  check exists — it must not regress into "lands on a filled-but-unsubmitted form".
- `home/`: **a URL missing a marker key does not auto-search.** Visit `?name=x` alone and assert no
  `GET /search/v3` fires and the form is merely pre-filled — the presence gate must still distinguish
  a shared search link from an arbitrary query string.
- `home/`: **a link is honoured verbatim**. Visiting `?…&archiveFlag=true` **as a volunteer** sends
  `archiveFlag=true` and renders archived donors with the banner. This pins **S13** against a future
  reader "fixing" it into a designation gate — and, like the **S4** backend test, it is deliberately
  asserting the permissive behaviour.
- `home/`: a super admin's **own** manual search still sends the setting's value even after visiting
  a link with the opposite flag — i.e. the URL wins on mount, the Filters computed wins afterwards
  (pins the §6.3 precedence).
- `auth/` or `home/`: flipping the settings switch in
  [MyProfile.vue](../badhan-frontend/src/views/MyProfile.vue) changes what the search page sends on
  the next search, without a reload — and issues **no** network request of its own (`cy.intercept` +
  no-call assertion), pinning **S3**.
- `home/`: the setting survives a page reload (localStorage), and a `cy.clearLocalStorage()` — or a
  logout, which calls `ldb.reset()` — leaves the next search sending `archiveFlag=false`.
- `home/`: with the stored expiry stubbed into the past
  (`cy.window().then(w => w.localStorage.setItem('archiveSearch', …))`), the next search sends
  `archiveFlag=false` and the disabled mirror in `Filters.vue` reads off, without any user action —
  pins the TTL (phase 4) and the store write-back (§6.2). Then navigate to MyProfile and assert the
  settings switch also reads off. Deliberately asserted **in that order**: the write-back fires in
  `Filters.vue`'s computed, so the switch only resyncs after the search page has been visited. Do not
  assert the switch resyncs while the user sits on MyProfile — that is the accepted staleness, not a
  bug.

---

## Phase 7 — Search results footer batch sweep

**Depends on:** phases 2, 3 and 6. **Deployable alone:** yes. **Land the cap with the loop, not
after**: without the older-batches gate, the first broad search on the new build would otherwise offer
a thousand-donor sweep.

### What this phase enforces

- **S12** — there is no batch route. The button is a **client-side loop**: per donor, one
  `GET /donors?donorId=…` then one `PATCH /donors/v2` with the fetched record and `archiveFlag`
  flipped. The `GET` is not optional, because `PATCH /donors/v2` requires a full body including
  `email`, which the search response projects away. 2N requests for N donors, N audit-log rows, and
  the rate limiter removed from both routes (phase 3).
- **S15** — hard cap of 200 donors (`ARCHIVE_BATCH_LIMIT`, exported from
  [src/mixins/constants.ts](../badhan-frontend/src/mixins/constants.ts) next to `DESIGNATIONS_INDEX`;
  there is no `src/constants` module). Over the cap the button **refuses** rather than throttles:
  rendered `disabled` with a hint, no second confirmation tier, no "archive the first 200", no
  chunking. Frontend-only guard — the backend gains no batch-size notion.
- **S6** — the button is super-admin-only, and a super admin passes the permission predicate for
  every donor, so a batch run cannot produce a permission failure. There is no partial-permission
  case to report.
- **S5** — volunteers and hall admins in the sweep are demoted by the controller; super admins are
  archived at designation `3`. One rule, both paths.
- **S1** — one button, two directions: the `archiveFlag` value that produced the result set decides
  which way the flag is flipped, because the search page *is* the archive browser.
- **S14** — the `PersonCardNew` chip is shown to **every designation**, which is how it lights up on
  the Active Donors page too.

### 7.1 Remove the older-batches gate

[Home.vue](../badhan-frontend/src/views/Home.vue) currently renders only the 5 most recent batches
and hides the rest behind "Show results from older batches"
([Home.vue:319-336](../badhan-frontend/src/views/Home.vue#L319-L336)). That partial rendering goes
away with this change — a button labelled "archive these donors" next to a partially-shown list is a
genuine footgun, and archiving is what the older batches are mostly *for*. It also keeps
`this.persons` (what the loop iterates) and what the user sees in exact correspondence.

**S15's cap does not replace this.** The cap bounds how many donors the *loop* will touch; the
older-batches gate bounded how many the *page renders*. Keeping the gate would mean a 200-donor sweep
silently including batches the user never scrolled to — the exact footgun the removal is for. With
both changes in place the chain holds end to end: everything matched is rendered, everything rendered
is in `persons`, and the button only runs when `persons` is under 200.

Delete, in `search()` and the template:

- `const countOfBatchesToShow = 5` and the two `slice` calls → `this.personGroups = sortedBatches`
- `morePersonGroups`, `isMorePersonGroupsAvailable` (both `data` entries) and
  `concatenateMorePersonGroups()`
- the `#olderBatchResultsButton` `v-btn` and its wrapping `<transition name="fade-in">`
  ([Home.vue:94-101](../badhan-frontend/src/views/Home.vue#L94-L101))

No Cypress spec references `#olderBatchResultsButton` (grepped: the id appears only in `Home.vue`),
so nothing in the e2e suites needs adjusting.

### 7.2 The footer button

All search results are rendered at once (§7.1), so the footer button goes last inside the `actions-`
transition block, where `#olderBatchResultsButton`
([Home.vue:95](../badhan-frontend/src/views/Home.vue#L95)) used to be:

```html
<div v-if="isArchiveBatchVisible" class="ma-2">
  <v-btn
    id="archiveTheseDonorsButtonId"
    data-cy="archiveTheseDonorsButtonId"
    small rounded color="warning"
    :loading="archiveBatchLoader"
    :disabled="archiveBatchLoader || isArchiveBatchOverLimit"
    @click="archiveTheseDonorsClicked"
  >
    <v-icon left>{{ archiveFlag ? 'mdi-archive-arrow-up' : 'mdi-archive-arrow-down' }}</v-icon>
    {{ archiveBatchProgressLabel }}
  </v-btn>
  <div v-if="archiveBatchHint" data-cy="archiveBatchHintId"
       class="caption text--secondary mt-1">
    {{ archiveBatchHint }}
  </div>
</div>
```

**Decision: the over-limit hint is caption text under the button, not a `messages` prop.** `v-btn` is
not a Vuetify input component and has **no `messages` prop** — binding one renders nothing and the
**S15** refusal would be a button that is mysteriously disabled with no explanation. Hence the
wrapping `<div>` (the one place in this plan that needs one — §6.2's checkbox still needs none) and a
plain `caption text--secondary` line below it. Chosen over a `v-tooltip`, which needs a second
wrapper because a `disabled` button swallows hover events and which is invisible on touch — and the
primary client here is the PWA/TWA. The hint is therefore always visible when it applies, on every
device.

The button stays **at the bottom** of the `actions-` block, where `#olderBatchResultsButton` was. Now
that every batch renders, a broad-but-under-cap result set means scrolling to reach it; accepted
rather than introducing a sticky action bar, which would be new layout machinery on a page that has
none.

One button, two directions — since the search page *is* the archive browser (**S1**), the
`archiveFlag` value that produced the result set also decides which way the flag is flipped.

### 7.3 Visibility vs enablement

Visibility and enablement are **two different conditions** (**S15**), which is what makes the cap a
legible refusal rather than a button that mysteriously vanishes on broad searches:

```js
// exported from src/mixins/constants.ts, next to DESIGNATIONS_INDEX (see S15)
ARCHIVE_BATCH_LIMIT = 200

isArchiveBatchVisible () {
  return this.$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN &&
         this.searchResultShown && this.persons.length > 0
}
isArchiveBatchOverLimit () {
  return this.persons.length > ARCHIVE_BATCH_LIMIT
}
archiveBatchHint () {
  return this.isArchiveBatchOverLimit
    ? `Narrow your search to ${ARCHIVE_BATCH_LIMIT} donors or fewer to archive in bulk`
    : ''
}
```

Over the limit the button is rendered, `disabled`, and carries the hint. Under it, no hint.
`archiveConfirmed` re-checks `isArchiveBatchOverLimit` and returns immediately if it is true, so the
cap does not depend on the disabled attribute alone.

`archiveBatchProgressLabel` is `'Archive these donors?'` / `'Unarchive these donors?'` when idle, and
`'Archiving 37 / 120…'` while the loop runs — the loop is 2N requests (**S12**), so even a capped
200-donor sweep is 400 round trips and long enough that a bare spinner would read as a hang.

### 7.4 Confirmation

Using the existing confirmation store
([store/confirmationBox.ts](../badhan-frontend/src/store/confirmationBox.ts), rendered by
[AppShell/ConfirmationBox.vue](../badhan-frontend/src/components/AppShell/ConfirmationBox.vue)):

```js
archiveTheseDonorsClicked () {
  const verb = this.archiveFlag ? 'unarchive' : 'archive'
  this.$store.commit('confirmationBox/setConfirmationMessage', {
    confirmationMessage: `Are you sure you want to ${verb} these ${this.persons.length} donors?`,
    confirmationAction: this.archiveConfirmed
  })
}
```

The confirmation text stays exactly that — **it does not mention demotion**, even though every
volunteer and hall admin in the list gets demoted (**S5**, phase 3). Decided deliberately: consistent
with the detail-page switch, which also only hints rather than prompting (phase 5).

### 7.5 The loop

`archiveConfirmed` is the loop. For each donor currently on screen, in order:

```js
async archiveConfirmed () {
  const target = !this.archiveFlag        // browsing live → archive; browsing archive → unarchive
  this.archiveBatchLoader = true
  this.archiveBatchDone = 0
  const succeeded = []
  for (const person of this.persons) {
    const getResponse = await handleGETDonors({ donorId: person._id })
    if (getResponse.status !== HTTP_STATUS.OK) break
    const donor = getResponse.data.donor
    const patchResponse = await handlePATCHDonors({
      donorId: donor._id,
      name: donor.name,
      phone: donor.phone,
      studentId: donor.studentId,
      email: donor.email,
      bloodGroup: donor.bloodGroup,
      hall: donor.hall,
      roomNumber: donor.roomNumber,
      address: donor.address,
      availableToAll: donor.availableToAll,
      archiveFlag: target
    })
    if (patchResponse.status !== HTTP_STATUS.OK) break
    succeeded.push(person._id)
    this.archiveBatchDone++
  }
  this.archiveBatchLoader = false
  // drop the donors that actually moved out of the partition being viewed
  …
}
```

Points that matter:

- **The body is built field by field from the fetched donor, not spread.** `GET /donors` returns an
  aggregate carrying `donations`, `plateletDonations`, `callRecords` and friends; spreading it would
  put megabytes of unrelated data on a `PATCH` body.
- **`email` is round-tripped from the fetch**, which is the entire reason the `GET` exists (**S12**)
  — it is absent from search results and the route 403s on a mismatch.
- **Sequential, not parallel.** With the limiter gone (phase 3) nothing forces this, but N concurrent
  writes to the same collection buys little and makes the progress counter and the audit-log ordering
  incoherent.
- **Permission failures cannot happen here** (**S6**): the button is super-admin-only, and a super
  admin passes both the hall check and the designation check for every donor — including another
  super admin, since the controller's guard is `user.designation < target.designation` and `3 < 3` is
  false. The `break` on a non-200 exists for network and server errors, not for a partial-permission
  case — there isn't one.
- **Nobody is skipped.** No designation filter runs before the loop: volunteers and hall admins are
  archived *and demoted* by the phase-3 controller block, super admins are archived and keep
  designation `3` (**S5**, **S12**). The count in the confirmation is therefore always
  `this.persons.length`, and the completion notification never has to explain a discrepancy.
- **The sweep is capped at 200 donors** (**S15**). `archiveConfirmed` re-asserts the limit before its
  first request, so the guard survives someone re-enabling the button from devtools or a future
  refactor that drops the `:disabled` binding. There is no chunking and no "archive the first 200" —
  over the cap, nothing runs.
- **On an error the loop stops rather than pressing on — no retry, no skip-and-continue.** Donors
  already patched stay patched; `succeeded` is exactly what moved. Report it:
  `notifyError('Stopped after N of M donors')`, so a half-finished sweep never reads as a clean one.
  Pressing the button again resumes from what is still on screen — the succeeded donors have already
  left the partition being viewed, so the retry naturally covers only the remainder. Considered and
  rejected: a per-donor retry (absorbs a transient blip at the cost of a fuzzier progress count) and
  skip-failures-and-continue (maximises completion but reintroduces exactly the "N archived, K
  failed" partial-state reporting that **S6** and **S12** were arranged to make impossible).
  Fail-fast plus a resumable button is the smaller surface.

On completion: `notification/notifySuccess` with the count, then drop the `succeeded` ids from
`persons` / `personGroups` / `numOfDonor` locally rather than re-running the search — they no longer
belong to the partition being viewed either way.

### 7.6 `PersonCardNew` chip

An **"Archived" chip** on
[PersonCardNew.vue](../badhan-frontend/src/components/PersonCardNew.vue), driven by
`person.archiveFlag` and shown to **every designation** (**S14**). On the search page it costs
nothing — the field is already in the search response (phase 1) — and it reinforces the phase-6
banner card by card, so the mode stays obvious after scrolling past the top of the list.

`PersonCardNew` is **shared with the Active Donors page**
([ActiveDonors.vue:47](../badhan-frontend/src/views/ActiveDonors.vue#L47)), which is where a
non-super-admin actually meets the chip: by **S7** that page still lists archived donors. That is the
reason `archiveFlag` has to be named in `generateAggregatePipeline`'s inclusion `$project` (phase 2)
— without it `person.archiveFlag` is `undefined` there and the chip never renders, silently and only
on that one page.

### 7.7 Cypress tests

- `home/`: the footer button only renders after a search with results; the confirmation dialog text
  matches; cancelling issues no request (`cy.intercept` + no-call assertion).
- `home/`: **the 200-donor cap** (**S15**). With a seeded search returning more than
  `ARCHIVE_BATCH_LIMIT` donors, the footer button is **visible but `disabled`** and the "Narrow your
  search…" hint is visible at `[data-cy=archiveBatchHintId]` — assert the rendered **text**, which is
  what would have silently failed had the hint stayed on a `v-btn` `:messages` prop (§7.2). Clicking
  the button issues **zero** `PATCH /donors/v2` calls (`cy.intercept` + no-call assertion). With a
  result set at exactly the limit the button is enabled, the hint element is absent, and the sweep
  runs. Assert against the constant imported from `src/mixins/constants.ts`, not a hardcoded 200, so
  retuning the cap does not silently orphan the test.
- `home/`: **the footer loop.** With a search returning e.g. 3 donors, pressing the button and
  confirming issues **3 `GET /donors` and 3 `PATCH /donors/v2`** calls (`cy.intercept`, count
  asserted), every PATCH body carries `archiveFlag: true` **and the donor's real `email`** (the field
  the search response does not provide — pins **S12**), and all 3 donors disappear from the list
  afterwards. This is the test that fails if someone tries to build the body from the search result
  alone.
- `home/`: with a search returning more donors than the old `commonLimiter` allowed (≥ 15), the whole
  loop completes without a 429 — the frontend-side counterpart to the phase-3 backend test.
- `home/`: a search returning more than 5 batches renders **all** of them and no "Show results from
  older batches" button exists (pins §7.1).
- `home/`: with the setting on, the footer button reads "Unarchive these donors?" (pairs with the
  phase-6 archive-mode assertions).
- `activeDonors/`: an archived donor with an `activedonors` row appears in the list **and** renders
  the "Archived" chip **as a volunteer** (pins **S14** end to end: the phase-2 projection line plus
  the unguarded chip). The same donor's detail page shows the chip but **no** archive switch.

---

## Phase 8 — The all-donors page: rename, then partition

**Depends on:** phase 1 only. **Independent of phases 2–7.** **Deployable alone:** yes — as **two
commits, in this order**, because mixing them makes the diff unreviewable. Regenerate tsoa after each
(both change controller signatures).

- **Commit 8a — pure rename** (§8.2). Path, controller, interface, handler, component, route, tab
  link, log verb, test directories. No behaviour change; the suite should pass untouched except for
  the moved paths and renamed hooks.
- **Commit 8b — partition** (§8.3–§8.6). The required `archiveFlag`, the filter, the projection line,
  the second route, the fourth tab, the re-fetch-on-tab-change watcher.

### What this phase enforces

- **S8** — this is the *second and last* route that partitions on `archiveFlag`. Its motivation is
  different from search's: not cost, but that an unpartitioned list of every donor makes the archive
  meaningless on the one page most likely to be read as a roster.
- **S1** — same identifier, `archiveFlag`, wire name included.
- **S10** — required query param, no server-side default, no fallback; stale clients get a 400 (and,
  for the renamed path, a 404).
- **S4** — no designation branch in the controller — though the route is already behind
  `handleSuperAdminCheck`, so the permissive read is moot in practice.
- **S9** — no automatic archiving; this page does not archive anything.
- **S11** — the guest twin takes no params and fabricates donors.
- **S14** — the chip is *not* added to these rows (see §8.5), but `archiveFlag` is projected so a
  future row affordance has the data.

### 8.1 What the route actually does today

`GET /donors/designation/all` → `getAllDesignatedDonors` → `findAllDesignatedDonors`
([donorInterface.ts:220](../badhan-backend/src/db/interfaces/donorInterface.ts#L220)):

```ts
const data: IDonor[] = await DonorModel.find({}, {
    name: 1, hall: 1, studentId: 1, designation: 1
}).populate({path: 'logCount'})
```

The filter is `{}`. Every donor comes back, designated or not — the `designation: 1` projection is
the only thing "designation" ever referred to, and it is a *field being selected*, not a filter being
applied. The page it feeds
([VolunteersAll.vue](../badhan-frontend/src/views/Statistics/VolunteersAll.vue)) is titled "List of
all members" and lists ~4 k donors of whom a few dozen are members. Every name on the path — the URL
segment, the controller method, the interface function, the Vue component, the route name, the
frontend handler — describes a filter that does not exist.

This is not cosmetic once archiving lands: an unpartitioned table of every donor is precisely where
an archived donor is most likely to be mistaken for an active one.

### 8.2 Commit 8a — the rename, including the wire path

**Decision: rename end to end, HTTP path included.** Half-renaming would leave `handleGETDonorsAll()`
calling `/donors/designation/all`, which is the confusion this step exists to remove.

| Layer | Was | Becomes |
| --- | --- | --- |
| Authenticated route | `GET /donors/designation/all` | `GET /donors/all` |
| Guest route ([GuestController.ts:631](../badhan-backend/src/tsoaControllers/GuestController.ts#L631)) | `GET /guest/donors/designation/all` | `GET /guest/donors/all` |
| Controller method | `getAllDesignatedDonors` | `getAllDonors` |
| Guest controller method | `viewAllVolunteers` | `viewAllDonors` |
| Interface fn | `findAllDesignatedDonors` | `findAllDonors` |
| Frontend handler | `handleGETDonorDesignatedAll` | `handleGETDonorsAll` |
| Vue component | `views/Statistics/VolunteersAll.vue` | `views/Statistics/DonorsAll.vue` |
| Route name | `VolunteersAll` | `DonorsAll` |
| Route path | `/statistics/membersAll` | `/statistics/donorsAll` |
| Tab label / page title | "All Members" / "List of all members" | "All Donors" / "List of all donors" |
| Tab test hook | `statisticsAllVolunteersTabId` | `statisticsAllDonorsTabId` |
| Log verb | `GET DONORS DESIGNATION ALL` | `GET DONORS ALL` |

Note the frontend handler was already inconsistent with itself — the export is
`handleGETDonorDesignatedAll` (singular `Donor`) while every sibling uses `handleGETDonors…`.

Do **not** rename the hall-scoped `GET /donors/designation`
([DonorsController.ts:863](../badhan-backend/src/tsoaControllers/DonorsController.ts#L863)) or its
`handleGETDonorsDesignation` / [Members.vue](../badhan-frontend/src/views/Members.vue) page. That one
genuinely filters on designation, and it is untouched by this plan (**S8**).

Two accepted breaks, both the same shape as **S10**:

- **Stale clients 404.** A cached PWA/TWA bundle calling `/donors/designation/all` gets a 404 rather
  than a 400. Same one-way break, same acceptance.
- **`GET DONORS DESIGNATION ALL` log rows already in the database keep their old verb.** No backfill
  — the log collection is append-only history, and rewriting it would misrepresent what the app
  called at the time. Anything querying that verb has to match both.

Renaming the log verb *does* mean the audit trail for this route splits at the deploy boundary.
Called out here so it is a decision rather than a surprise.

Test files move with the paths: `tests/donors/designationAll/` → `tests/donors/all/`, and
`tests/donors/fetchAllDesignatedDonors/fetchAllDesignatedDonors.guest.test.js` → the same directory.
`allDesignatedDonorSchema` → `allDonorSchema`.

### 8.3 Commit 8b, backend — a required `archiveFlag` on `GET /donors/all`

Mirroring the search route exactly:

- `@Query() archiveFlag: boolean` on `getAllDonors` — **required, no default** (**S10**).
- `validateQUERYArchiveFlag` — the chain from phase 2 — added to a `validateGETDonorsAll` chain in
  `badhan-backend/src/validations/donors.ts`. The chain is reused verbatim — same wire name, same
  `.toBoolean()`, same 400s. (If phase 8 lands before phase 2, add the chain here with exactly the
  definition given in phase 2 §2.1.)
- `findAllDonors(archiveFlag: boolean)` puts it in the filter:

  ```ts
  const data: IDonor[] = await DonorModel.find({ archiveFlag }, {
      name: 1, hall: 1, studentId: 1, designation: 1, archiveFlag: 1
  }).populate({path: 'logCount'})
  ```

  Two edits: `{}` → `{ archiveFlag }`, and `archiveFlag: 1` added to the **inclusion** projection —
  the same trap as `generateAggregatePipeline`. Without it the chip and any future per-row affordance
  see `undefined`.

- the `archiveFlag` filter is served by the `{ archiveFlag: 1, hall: 1, bloodGroup: 1 }` index from
  phase 1 on its leading field alone, so **no new index** is needed. The route gets faster, not
  slower: it goes from scanning every donor to scanning one partition.
- **`archiveFlag` is a real parameter here, not an optional one.** Unlike `generateSearchQuery`,
  `findAllDonors` has exactly one caller and no Active-Donors-style second use, so there is no
  `typeof … === 'boolean'` guard and no `undefined → null` trap to avoid. Declare it
  `archiveFlag: boolean` and pass it straight through.

The route keeps `authenticator.handleSuperAdminCheck`, so **S4**'s permissiveness never surfaces here
— a volunteer hand-crafting `?archiveFlag=true` gets the existing 403 before the param is read. It
also keeps `rateLimiter.commonLimiter`: this route is not in the phase-7 loop, and phase 3 removed
the limiter only from the two routes that are.

The guest route (`GET /guest/donors/all`) is **`@Hidden()` and takes no params** — same posture as
**S11**. It fabricates donors and ignores the query string; add `archiveFlag: false` to each
fabricated object so the guest table renders the same columns as the real one, and nothing else.

Regenerate tsoa:

```
docker compose exec backend npm run tsoa:routes
docker compose exec backend npx tsc --noEmit
```

### 8.4 Commit 8b, frontend — one component, two routes

**Decision: one component driven by route meta**, not two near-identical pages. The archived table
differs from the live one by a single boolean; duplicating the headers, the fetch and the row
template would guarantee they drift.

[router/index.ts:143](../badhan-frontend/src/router/index.ts#L143) — the renamed route plus a
sibling, both `designation: 3`, both pointing at the same component:

```js
{
  name: 'DonorsAll',
  path: 'donorsAll',
  component: () => import('../views/Statistics/DonorsAll.vue'),
  meta: { title: 'All Donors', requiresAuth: true, designation: 3,
          reRouteIfAuthorized: false, archiveFlag: false }
},
{
  name: 'ArchivedDonorsAll',
  path: 'archivedDonorsAll',
  component: () => import('../views/Statistics/DonorsAll.vue'),
  meta: { title: 'Archived Donors', requiresAuth: true, designation: 3,
          reRouteIfAuthorized: false, archiveFlag: true }
}
```

**Decision: the rename reaches the user-facing wording too, not just the internals.** The tab labels
become **"All Donors"** and **"Archived Donors"**, the `meta.title` strings follow, and `pageTitle`
reads "List of all donors" / "List of archived donors". §8.1's whole argument is that this route
never filtered on designation and that calling its output "members" is wrong; renaming the
controller, the interface and the component while leaving the label a super admin actually reads
saying "Members" would preserve exactly the confusion the rename exists to remove — the ~4 k-row
table would still announce itself as a list of the few dozen members.

Only the two tabs on this route change wording.
[Members.vue](../badhan-frontend/src/views/Members.vue) and its nav entry keep "Members" throughout —
that page *is* designation-filtered and the word is correct there (**S8**).

`DonorsAll.vue` (renamed from `VolunteersAll.vue`) reads the flag from the route rather than from
props or the store:

```js
computed: {
  archiveFlag () { return this.$route.meta.archiveFlag === true },
  pageTitle () { return this.archiveFlag ? 'List of archived donors' : 'List of all donors' }
},
async mounted () {
  const response = await handleGETDonorsAll({ archiveFlag: this.archiveFlag })
  …
}
```

`=== true` rather than truthiness so a route that forgets the meta key resolves to `false` (the live
roster) rather than to `undefined` reaching the query string, where the required validator would 400.

Two things this shape needs care with:

- **Vue reuses the component instance** when navigating between two routes that share it, so
  `mounted()` does not re-run and the table would still show the previous partition. Add
  `watch: { '$route.meta.archiveFlag': 'fetchDonors' }` — or `:key="$route.name"` on the
  `<router-view>` in [Statistics.vue](../badhan-frontend/src/views/Statistics.vue) — and move the body
  of `mounted()` into a `fetchDonors()` method both call. **This is the most likely bug in phase 8**;
  the Cypress case below pins it by switching tabs and asserting the rows change.
- The empty state matters more on the archived tab, which is legitimately empty until someone
  archives a donor. Render "No archived donors" rather than a bare table.

Rename the data properties with the component — `volunteers` → `donors`, `volunteersShown` →
`donorsShown`, `volunteersLoaderFlag` → `donorsLoaderFlag` — and the test hooks:
`statisticsAllVolunteersTableId` → `statisticsAllDonorsTableId`, `volunteerRow` → `donorRow`,
`volunteerRowDesignation` → `donorRowDesignation`. These are referenced by
[StatisticsPage.ts](../badhan-frontend-test/cypress/support/pages/StatisticsPage.ts).

`volunteerRow` is a **name collision that this rename resolves**: it is currently used by both
`VolunteersAll.vue:19` and [Members.vue:30](../badhan-frontend/src/views/Members.vue#L30), where it
sits alongside `hallAdminRow` and `superAdminRow` and genuinely means "a volunteer row".
`MembersPage.assertAnyVolunteerExists` targets *that* one. So: rename only the `VolunteersAll.vue`
occurrence to `donorRow`, leave `Members.vue` and
[MembersPage.ts](../badhan-frontend-test/cypress/support/pages/MembersPage.ts) alone (**S8**), and
update `StatisticsPage.ts` alone.

### 8.5 Commit 8b — the fourth tab

[Statistics.vue](../badhan-frontend/src/views/Statistics.vue) gains a fourth `v-tab` between "All
Donors" and "App Activity", matching the existing style:

```html
<v-tab id="statisticsArchivedDonorsTabId" data-cy="statisticsArchivedDonorsTabId"
       to="/statistics/archivedDonorsAll" style="text-decoration: none">
  Archived Donors
</v-tab>
```

and the existing tab ([Statistics.vue:13](../badhan-frontend/src/views/Statistics.vue#L13)) changes
on three counts: `to` becomes `/statistics/donorsAll`, its label "All Members" becomes **"All
Donors"**, and its hook `statisticsAllVolunteersTabId` becomes `statisticsAllDonorsTabId` — the same
`Volunteers → Donors` rename as the table hooks above, and referenced from the same
`StatisticsPage.ts`. Four tabs may need `show-arrows` to actually engage on narrow screens — it is
already set, so nothing to add, but check it on a phone width.

The "Archived" chip (**S14**) is **not** added to these rows: on the "All Donors" tab it can never be
true, and on the "Archived Donors" tab it would be true for every row, which is what the tab title
already says. `archiveFlag` is projected (§8.3) so the data is there if a future row affordance wants
it.

### 8.6 Commit 8b — API layer

[api/index.ts](../badhan-frontend/src/api/index.ts):

```ts
export interface GETDonorsAllPayloadInterface {
  archiveFlag: boolean
}
const handleGETDonorsAll = async (payload: GETDonorsAllPayloadInterface) => {
  try {
    return await badhanAxios.get('/donors/all', { params: payload })
  } catch (e) {
    return (e as BadhanAxiosErrorInterface<BadhanAxiosResponseDataInterface>).response
  }
}
```

Note the shape change: the old handler took no argument and called `.get(url)` with no config. Follow
whichever convention the file's other query-param handlers use for `params` — match
`handleGETDonorsNew` rather than inventing a third style. Update the export list at
[api/index.ts:687](../badhan-frontend/src/api/index.ts#L687).

### 8.7 Relationship to the rest of the plan

- **Independent of the search work.** This phase needs only `archiveFlag` to exist on the donor
  (phase 1). It can land any time after phase 1 and does not depend on phases 3, 4, 6 or 7.
- **No new semantics.** Every rule it obeys — the identifier (**S1**), mandatoriness (**S10**), no
  cascade (**S7**), manual archiving only (**S9**) — is already decided. The only decision this phase
  adds is **S8**'s widening from one partitioned route to two.
- **It does not archive anything.** There is no per-row toggle and no batch button on either tab;
  archiving stays the detail-page switch (phase 5) and the search footer (phase 7). The "Archived
  Donors" tab is read-only, exactly like the tab it sits next to.

### 8.8 Backend tests — `GET /donors/all`, in `tests/donors/all/` (the renamed `tests/donors/designationAll/`)

- `?archiveFlag=false` returns non-archived donors **including designation-`0` donors** — the
  positive assertion that the route was never designation-filtered and still is not (§8.1). Seed at
  least one plain donor and one volunteer and assert both come back.
- `?archiveFlag=true` returns **only** archived donors.
- missing / empty / non-boolean `archiveFlag` → 400, same three variants as `/search/v3` (**S10**).
- each row carries `archiveFlag` — pins the inclusion-projection line in §8.3, the same trap as the
  Active Donors one in phase 2.
- still 403s for a volunteer and a hall admin, `archiveFlag=true` included — the
  `handleSuperAdminCheck` in front of the route means **S4** never applies here.
- the old path `GET /donors/designation/all` now **404s** (pins the §8.2 rename; without this a
  half-applied rename leaves both paths live and nobody notices).
- `GET /guest/donors/all` still returns fabricated donors and **ignores** `archiveFlag` entirely — no
  400 when it is omitted (**S11**, §8.3), and each fabricated row carries `archiveFlag: false`.

### 8.9 Cypress tests

- `statistics/`: **the two tabs show different data** (§8.4). As a super admin, the "All Donors" tab
  lists a seeded non-archived donor and not the archived one; clicking "Archived Donors" **without a
  page reload** flips it — the archived donor appears and the non-archived one is gone. This is the
  case that catches the reused-component trap: if `mounted()` is not re-run on the meta change, the
  second assertion sees the first tab's rows and fails. Assert on the intercepted query too
  (`archiveFlag=false` then `archiveFlag=true`), so a stale table cannot pass by coincidence.
- `statistics/`: deep-linking straight to `/statistics/archivedDonorsAll` renders the archived list
  (not the live one), and the tab is absent for a volunteer and a hall admin — both are bounced by
  the `designation: 3` route guard before the page loads.

---

## Phase 9 — Full suite and build

**Depends on:** everything that has landed.

- Run the full backend suite: `docker compose run --rm backend-test <cmd>`.
- Run the full Cypress suite: `docker compose run --rm frontend-test <cmd>`.
- Production frontend build: `docker compose exec frontend npm run build`.
- Backend typecheck and tsoa freshness: `docker compose exec backend npx tsc --noEmit`,
  `docker compose exec backend npm run tsoa:routes` (the generated routes under
  [badhan-backend/src/tsoaRoutes](../badhan-backend/src/tsoaRoutes) are gitignored and rebuilt by
  `npm run build`, so there is no diff to review — regenerate to be sure the running container and
  the deployed build agree with the controller signatures).

Everything up to here has run against the **local** database only. Deploying any of it to
development or production is gated on phase 10.

---

## Phase 10 — Manual database migration, before deploying to development and production

**Depends on:** phase 1's code being merged (the migration file and the schema field). **This phase
ships no code.** It is the manual step that must be completed **before the backend or the frontend
is deployed to development or to production** — once per environment, by a human.

### Why it is a phase and not a deploy step

**Nothing in the deploy path runs migrations.** The backend deploy
([upload-gcloud.js](../badhan-backend/upload-gcloud.js)) builds and pushes to App Engine; the
frontend deploy ([upload-firebase.js](../badhan-frontend/upload-firebase.js)) builds and pushes to
Firebase Hosting. Neither touches the database, and `npm run migrate` is never invoked by either.
`gcp-build` runs `npm run build` only. So if this step is skipped, nothing fails loudly at deploy
time — the breakage shows up later, as donors silently missing from search.

Both deploy scripts pick their target **from the current git branch**: `main` → production
(`env.production`, `app_prod.yaml`, project `badhan-buet`); any other branch → development
(`env.development`, `app_dev.yaml`, project `badhan-buet-test`). The migration must be run against
the database of whichever environment you are about to deploy to, so the branch you deploy from and
the `NODE_ENV` you migrate with have to agree.

### What breaks without it

The migration's indexes are **not** the risky part — `syncIndexes()` runs at every backend boot
([syncIndexes.ts:112](../badhan-backend/src/db/syncIndexes.ts#L112)), so a deployed phase-1 backend
creates them on startup by itself. The **backfill** is the part only the migration does, and it is
load-bearing:

- donors created after the deploy get `archiveFlag: false` from the schema default;
- donors that already existed keep **no `archiveFlag` field at all** until the backfill runs;
- a document with no `archiveFlag` does **not** match `{ archiveFlag: false }`, so the moment the
  phase-2 search partition is live in that environment, **every pre-existing donor disappears from
  search** — and, after phase 8, from the "All Donors" table too.

That is the whole failure mode: silent, total, and invisible in the deploy logs.

### The per-environment sequence

Run this once for development and once for production. The migration is additive (a new field plus
two indexes) and every currently-deployed build ignores the field, so it is safe to run **before**
the code deploy — which is the order to use, because it is the only order with no window where a
partitioning read path is live over an unmigrated collection.

1. **Get the environment file.** `npm run migrate` resolves its database from `env.<NODE_ENV>` —
   `env.development` or `env.production` — the same secrets-repo file the deploy fetches
   ([upload-gcloud.js](../badhan-backend/upload-gcloud.js)). It must be present locally before the
   migration can connect.
2. **Dry run first**, and read the count it reports:

   ```
   docker compose exec -e NODE_ENV=development -e DRY_RUN=1 backend \
     npx ts-node --transpile-only scripts/migrations/index.ts 20260802_add-archive-flag
   ```

   Check the log line `Step 1/2 backfill: N donor(s) without an archiveFlag field` — on a first run
   `N` should be the environment's whole donor count. `Connecting to Production database…` in the
   output is the flavour label from the URI, **not** a confirmation of which environment you hit;
   confirm that from `NODE_ENV` and the env file.
3. **Run it for real** (same command without `DRY_RUN`), and confirm the two log lines for
   `archiveFlag_1_hall_1_bloodGroup_1` and `archiveFlag_1_availableToAll_1_bloodGroup_1`.
4. **Verify against that database**: zero donors match `{ archiveFlag: { $exists: false } }`, and
   both compound indexes are listed on the `donors` collection.
5. **Then deploy the backend**, then the frontend. Backend first, because the frontend of phases 6–8
   calls routes and parameters that only the new backend accepts.
6. **Repeat for the other environment.** Production is a separate run against a separate database —
   a successful development migration says nothing about production.

The migration is **idempotent**: the backfill matches nothing on a second run and `createIndex` is a
no-op when the index exists, so re-running after a deploy — or running it again because you are
unsure whether it was done — is harmless.

### Notes carried from the other phases

- **The migration archives nobody** (**S9**). It materializes and indexes the field; the collection
  comes out in exactly the state it went in. Every archive is a human action afterwards.
- **Stale clients 400 until the frontend deploy lands** (**S10**), and stale clients calling
  `/donors/designation/all` 404 after phase 8's rename. Both are accepted, deliberate breaks — they
  are not symptoms of a missed migration, and the fix for them is finishing the deploy, not rolling
  the database back.
- **The PWA/TWA is a client like any other.** A user sitting on a cached bundle keeps hitting the
  old paths until it updates; that is the same accepted break, on a longer timer.

---

## Appendix A — Resolved questions (nothing is open)

Carried verbatim from `plan6.md` §12, re-pointed at phases. **There are no open questions.**

| Was | Now | Phase |
| --- | --- | --- |
| A dedicated batch-archive route? | **S12** — no; `PATCH /donors/v2` is looped client-side, one `GET` + one `PATCH` per donor | 3, 7 |
| How does the loop get `email`, which search omits? | **S12** — `GET /donors` per donor first; `email` stays out of the search projection | 7 |
| `commonLimiter` caps the loop at 12/min | removed from `PATCH /donors/v2` and `GET /donors`; every other limiter untouched | 3 |
| Failure handling for a partial sweep | permission failures are impossible for a super admin (**S6**); on a network/server error the loop stops and reports "N of M" | 7 |
| Does archiving warn about demotion? | hint text only, no dialog, on both the single and the looped path | 5, 7 |
| How do the new indexes reach production? | explicit `createIndex` in the migration, after the backfill | 1 |
| Stale checkbox after the 24 h lapses mid-session | the `Filters.vue` computed commits `false` on the lapse edge. Deliberately **not** pushed into the Vuex getter: the payload and the search-page mirror are always correct, the MyProfile switch resyncs on the next visit to the search page | 4, 6 |
| What does the Active Donors page send? | **S7** — nothing; the page ignores archiving entirely | 2 |
| Guest mode | **S11** — `/guest/search/v3` takes no params; nothing to do | 2, 6 |
| Bulk-archive criterion? | **S9** — archiving is purely manual | 1 |
| Backward compatibility for the required params | **S10** — none; older clients get a 400 | 2, 3 |
| Index build on production | non-issue at ~4 k donors; plain foreground `createIndex`, no options | 1 |
| What bounds the batch sweep, given search has no `$limit`? | **S15** — hard cap of 200 donors; over it the button renders `disabled` with a "narrow your search" hint and nothing runs | 7 |
| Blurred or plainly disabled search-page mirror? | **S2** — plainly `disabled` and readable; no CSS, no wrapper div | 6 |
| Can hall admins archive from the UI? | **S6** — no. The API permits it for their own hall (pinned by a backend test), the UI never offers it | 3, 5 |
| Is the all-members page really a members page? | no; `findAllDesignatedDonors` filters on `{}` and always returned every donor. Renamed end to end | 8 |
| Rename the wire path, or only the internals? | the wire path too: `GET /donors/all` and `GET /guest/donors/all`. Stale clients 404; log rows keep their old verb | 8 |
| Where do archived donors get browsed, then? | Two places — the search page with the setting on (**S1**) and the new "Archived Donors" tab. Both read-only lists of the same partition | 6, 8 |
| One page or two for archived vs live members? | one `DonorsAll.vue` behind two routes, flag from `$route.meta`; needs a watcher because Vue reuses the instance across the tab switch | 8 |
| Does the "Archived Donors" tab let you archive? | no. Read-only; archiving stays the detail switch and the search footer | 8 |
| Render guard on older batches | removed; every result renders, so `persons` matches the screen | 7 |
| Does `archiveFlag` belong in the shareable URL? | **S13** — yes, in `shareClicked` and `downloadInMobileClicked` | 6 |
| What happens to the `=== 9` exact-arity auto-search gate? | retired, not bumped to `=== 10`. Replaced by a presence check on `SHARE_LINK_MARKER_KEYS`, so legacy 9-key links keep auto-searching (on the live roster) and future filters need no edit here | 6 |
| How is the over-limit hint rendered, given `v-btn` has no `messages` prop? | caption text in a wrapper `div` below the button, `data-cy=archiveBatchHintId`; not a tooltip, which is invisible on touch | 7 |
| Where does `ARCHIVE_BATCH_LIMIT` live? | **S15** — `src/mixins/constants.ts`, alongside `DESIGNATIONS_INDEX`; there is no `src/constants` module | 7 |
| Where does the footer button sit on a long, fully-rendered result set? | at the bottom of the `actions-` block as planned; no sticky bar | 7 |
| Do the Statistics tabs keep saying "Members"? | no. Labels, `meta.title`s, page headings and the tab test hook all become "Donors"; [Members.vue](../badhan-frontend/src/views/Members.vue) keeps "Members", since it really is designation-filtered | 8 |
| What does a link's `archiveFlag=true` do for the recipient? | **S13** — honoured verbatim, any designation, no setting check. Same permissiveness as **S4**, one step more reachable; Cypress pins it | 6 |
| Where does the search payload's flag come from, then? | URL on mount, Filters computed on every manual search after that | 6 |
| Does the batch loop skip Badhan members? | **S12** — no. Volunteers and hall admins are demoted (**S5**), super admins archived at designation `3`; one rule, both paths | 7 |
| Who sees the "Archived" chip? | **S14** — everyone, on `PersonCardNew` and the detail header. Controls stay super-admin-only | 5, 7 |
| How does the chip reach the Active Donors page? | one `archiveFlag` line in `generateAggregatePipeline`'s **inclusion** `$project`; display only, no `$match` | 2 |
| Stripping `archiveSearchEnabledUntil` from donor payloads | moot — **S3** — the field does not exist; the setting is browser-local | 3, 4 |

The last one is worth spelling out, since it deleted a whole slice of the plan rather than answering
it: the archive-search toggle is a `localStorage` value on the super admin's own browser. No schema
field, no `PATCH /users/archiveSearch`, no `/users/me` addition, no projection to patch, no backend
test — and therefore nothing that could leak. The only new column in the database is `archiveFlag` on
the donor.

---

## Appendix B — Traceability: plan6.md → phases

| plan6.md | Lands in |
| --- | --- |
| Goal, surfaces table | Phase 0 |
| §1 **S1**–**S15** | Phase 0 (master copy); each phase repeats the rules it enforces |
| §2 data model, indexes, migration | Phase 1 |
| §3 `validateQUERYArchiveFlag`, `validateGETSearchDonors`, untouched `activeDonors.ts` / `users.ts` | Phase 2 §2.1 |
| §3 `validateBODYArchiveFlag`, `validatePATCHDonors` | Phase 3 §3.1 |
| §4 `generateSearchQuery`, `findDonorsByAggregate`, `generateAggregatePipeline` | Phase 2 §2.2–§2.4 |
| §5.1 `GET /search/v3` | Phase 2 §2.5 |
| §5.2 `GET /activeDonors` no change | Phase 2 §2.6 |
| §5.3 `PATCH /donors/v2` | Phase 3 §3.2 |
| §5.4 rate limiters | Phase 3 §3.3 |
| §5.5 no batch/user routes | Phase 3 §3.4 |
| §5.6 tsoa regeneration | Phases 2 §2.7, 3 §3.5, 8 §8.3, 9 |
| §6 API layer | Phase 4 §4.1 |
| §7 no `myprofile` change, `localDatabase/archiveSearch`, Vuex module, write-back decision | Phase 4 §4.2–§4.4 |
| §8.1 Filters mirror + enforcement computed | Phase 6 §6.2 |
| §8.2 Home.vue plumbing, URL param, presence gate, share/download builders, precedence | Phase 6 §6.3 |
| §8.2b banner | Phase 6 §6.4 |
| §8.3 footer button, cap, confirmation, loop | Phase 7 §7.2–§7.5 |
| §8.3b older-batches removal | Phase 7 §7.1 |
| §8.4 detail-page toggle, hint, save path, header chip | Phase 5 |
| §8.5 settings switch | Phase 6 §6.1 |
| §8.6 no new page; `PersonCardNew` chip | Phase 6 §6.5 (no new page), Phase 7 §7.6 (chip) |
| §9.1–§9.2 rename | Phase 8 §8.1–§8.2 (commit 8a) |
| §9.3 partition, guest route | Phase 8 §8.3 |
| §9.4 router, component, tabs, hook renames | Phase 8 §8.4–§8.5 |
| §9.5 API layer | Phase 8 §8.6 |
| §9.6 relationship to the rest | Phase 8 §8.7 |
| §10 backend tests — search / active donors / duplicate check | Phase 2 §2.8 |
| §10 backend tests — PATCH, demotion, limiter | Phase 3 §3.6 |
| §10 backend tests — `GET /donors/all`, guest | Phase 8 §8.8 |
| §10 donor factory | Phase 1 §1.4 |
| §10 Cypress — detail page | Phase 5 §5.5 |
| §10 Cypress — mirror, volunteer payload, banner, URL, settings switch, TTL | Phase 6 §6.6 |
| §10 Cypress — cap, loop, limiter, older batches, chip on Active Donors | Phase 7 §7.7 |
| §10 Cypress — statistics tabs | Phase 8 §8.9 |
| §11 implementation order | The phase order itself (phase 8 = original step 8's two commits; phase 9 = original step 9) |
| §11 step 1's "deploy and run the migration *before* any read path depends on the field" | Phase 1 for the local database; **phase 10** for development and production, where it is a manual, per-environment gate ahead of both deploys |
| §12 open questions | Appendix A |
