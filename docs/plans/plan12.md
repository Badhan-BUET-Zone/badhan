# Plan 12 — every donor carries a designation

The `donors` collection holds documents with **no `designation` field at all**. Two scripts already
work around it in prose ([stale-donors.ts:103-108](../../badhan-backend/scripts/reports/stale-donors.ts#L103-L108),
[archive-dormant-donors.ts:96-102](../../badhan-backend/scripts/tasks/archive-dormant-donors.ts#L96-L102)),
which is the tell: the workaround was written because the query results demanded it.

This plan repairs the data, makes the absence unrepresentable at the database level, closes the two
application-level holes that could reintroduce it, and fixes the report that was supposed to have
told us about it years ago and never did.

**Status: P1–P4 implemented and verified locally.** The rollout below has not been run — no database
other than `local` has been touched. See [§2](#2-as-implemented) for what the implementation added
beyond this plan.

---

## At a glance

| | Today | After plan 12 |
| --- | --- | --- |
| A donor document with no `designation` | exists in production | **backfilled to `0`** |
| Raw-driver insert of a donor with no `designation` | accepted | **rejected by the server** |
| `$unset: { designation }` through mongoose | accepted silently | **rejected** |
| `IDonor.designation` | `designation?: number` — 7 `!` assertions downstream | **`designation: number`, no assertions** |
| Schema Inconsistencies page | silently hides every missing field that has a default | **lists them** |
| Other required fields missing from old documents | present in production | **backfilled where a static default exists** |
| Read paths (search, profile, members, permissions) | unchanged | **unchanged** |

| Phase | Title | Depends on | Deployable alone |
| --- | --- | --- | --- |
| [P1](#phase-p1--materialize-the-missing-defaults) | The backfill migration (all models) | — | yes (data only) |
| [P2](#phase-p2--the-collection-validator) | `$jsonSchema` validator on `donors.designation` | P1 | yes |
| [P3](#phase-p3--mongoose-can-no-longer-drop-it) | `IDonor.designation` non-optional, `runValidators` | — | yes (invisible) |
| [P4](#phase-p4--the-report-stops-hiding-it) | Schema-inconsistency report reads raw documents | — | yes |
| [P5](#phase-p5--tests-manual-rollout) | Tests, manual, rollout | all | — |

**P1 must land before P2.** A validator switched on over documents that violate it makes those
documents unwritable — every later edit to them fails. Same ordering rationale, and the same
sentence, as [20260802_add-archive-flag.ts:10-17](../../badhan-backend/scripts/migrations/files/20260802_add-archive-flag.ts#L10-L17).

---

## §0 What the investigation found

Every claim in this section was verified against a live mongo 7.0.14 (`docker compose exec backend`,
a throwaway collection, the same mongoose version the app runs).

### 0.1 No write path in this repository can produce the absence

Donor creation is one line — [donorInterface.ts:143-151](../../badhan-backend/src/db/interfaces/donorInterface.ts#L143-L151)
— `new DonorModel({...}).save()`, and it does not pass `designation`. That is fine: the schema
declares `default: 0` and `required: true`
([Donor.ts:177-189](../../badhan-backend/src/db/models/Donor.ts#L177-L189)), so mongoose materializes
`0` on insert. The field has carried `default: 0` since the first commit in this repository
(`095e3ed8`, February 2021, then `db/models/Donor.js`), and through the TypeScript port
(`deb985c9`, August 2022). The old `ArchivedDonor` model carried it too.

There is no `insertMany`, no upsert, no `$unset`, and no raw-driver write against `donors` anywhere
in `src/`. The single raw-driver update in the repository is
[20250826_remove-extra-fields.ts:120](../../badhan-backend/scripts/migrations/files/20250826_remove-extra-fields.ts#L120),
and it unsets only paths that are *absent* from `schema.paths` — `designation` is in `schema.paths`,
so that migration cannot have removed it.

**Conclusion: the absence is residue, not an active bug.** The production database predates this
repository (donor `created_at` values reach back to March 2020) and has been written to by tooling
outside this schema. What this plan can prove is the negative — nothing here *maintains* the
invariant either, which is §0.4.

### 0.2 Why the absence is invisible from inside the app

Mongoose applies a schema default **when hydrating a document from the database**, not just on
insert. Verified:

```
raw document          {"_id": "...", "name": "no-designation"}
doc.designation       0            (typeof number)
doc.isModified(...)   false
after doc.save()      {"_id": "...", "name": "touched", "designation": 0}
```

So every read that goes through a mongoose document — `findDonorById`, `findOne`, `find` with a
projection — hands the caller `designation: 0`. That covers the authenticated user
([authenticate.ts:51-58](../../badhan-backend/src/middlewares/authenticate.ts#L51-L58)) and every
permission predicate built on it ([authenticate.ts:91-107](../../badhan-backend/src/middlewares/authenticate.ts#L91-L107),
[DonorsController.ts:561](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L561),
[652](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L652),
[746](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L746),
[826](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L826)).

**There is no privilege-escalation bug here.** `undefined < 2` would be `false` and would have read
as "is a hall admin" — but the value is never `undefined` on that path, because hydration filled it
in. This is worth writing down precisely because it is the first thing a reader will assume.

### 0.3 Where the absence does surface

Three places bypass hydration, and each of them sees the raw document:

**Aggregations.** `$project` on an aggregate returns exactly the fields the document has.
`GET /donors/{id}` uses an **exclusion** projection
([DonorsController.ts:424-429](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L424-L429)),
so for a legacy donor the response has **no `designation` key**. Verified: the aggregate output
document's key list simply omits it.

That lands in [PersonDetails.vue](../../badhan-frontend/src/components/PersonDetails.vue), whose
local default is the empty string ([:584](../../badhan-frontend/src/components/PersonDetails.vue#L584)).
The result is not a crash but an incoherent profile: the role line renders **blank**, because
`'' === DESIGNATIONS_INDEX.DONOR` is false ([:73-76](../../badhan-frontend/src/components/PersonDetails.vue#L73-L76)),
while `this.designation <= DESIGNATIONS_INDEX.VOLUNTEER` is *true* — `'' <= 1` coerces — so the
guards at [:712](../../badhan-frontend/src/components/PersonDetails.vue#L712) and
[:733](../../badhan-frontend/src/components/PersonDetails.vue#L733) treat the same donor as a
volunteer. One donor, two different answers about their role, on one screen.

**Queries on the field.** A missing field matches neither `{designation: 0}` nor any `$in`/`$nin`
list. Verified:

```
{ designation: 0    }  matches a document with the field absent → 0 documents
{ designation: null }  matches                                  → 1 document
```

This is the behaviour the two scripts already document. It is harmless where it lands today
(`{designation: VOLUNTEER}` *should* skip them) but it is a trap for every future query, and
`{designation: null}` matching is the kind of thing someone eventually writes by accident.

**`$type`-sensitive tooling.** Anything reading `donors` outside mongoose — a report, an export, a
future service — sees the hole.

### 0.4 The three gaps that let it happen again

1. **No database-level constraint.** The `donors` collection has no validator. `mongod` will accept
   a donor document with no `designation` from any client.
2. **Mongoose `required` is not enforced on updates.** Verified: `M.updateOne({_id}, {$unset:
   {designation: 1}})` succeeds and leaves the document without the field. With
   `{ runValidators: true }` the same call is rejected — *"Validation failed: designation: Path
   `designation` is required."* — and so is `$set: {designation: null}`. Nothing in the codebase
   passes `runValidators`.
3. **`IDonor.designation?: number`** ([Donor.ts:24](../../badhan-backend/src/db/models/Donor.ts#L24))
   declares the hole as legitimate, and seven call sites answer it with `!`. The type says the
   invariant does not hold; the `!` says it does. One of the two is wrong.

### 0.5 Why the Schema Inconsistencies page never reported it

[schemaInconsistencies.ts:93-127](../../badhan-backend/src/services/schemaInconsistencies.ts#L93-L127)
walks `model.find().cursor()` and tests `doc.toObject()` for missing required paths. By §0.2 the
default has already been applied by the time that check runs, so the `missingRequired` bucket
**cannot ever report a field that has a default**. `designation`, `archiveFlag`, `address`,
`roomNumber`, `comment` and `commentTime` are all invisible to it, on every model.

This is the finding with the longest reach. The report is the app's own answer to "is the data
sound?", it is documented to super admins as exactly that
([16-super-admin-tools.md:69-90](../manual/16-super-admin-tools.md#L69-L90)), and for this entire
class of defect it has been answering "yes" without looking.

---

## §1 The decisions everything else follows from

### 1.1 The backfill covers every required field with a static default, not just `designation`

`designation` is one instance of a general shape: *field added to the schema with a default, older
documents never got it*. `archiveFlag` was the same shape and got its own migration in August 2026.
Fixing one field at a time means writing this migration again next year.

The complete inventory of required-with-default paths, enumerated from `schema.paths` across all
nine registered models:

| Model | Path | Default | Backfill |
| --- | --- | --- | --- |
| Donor | `designation` | `0` | **yes** |
| Donor | `address` | `'(Unknown)'` | **yes** |
| Donor | `roomNumber` | `'(Unknown)'` | **yes** |
| Donor | `comment` | `'(Unknown)'` | **yes** |
| Donor | `commentTime` | `946684800000` | **yes** |
| Donor | `archiveFlag` | `false` | **yes** (no-op — already migrated) |
| CallRecords | `date` | `0` | **yes** |
| Donations | `date` | `0` | **yes** |
| PlateletDonations | `date` | `0` | **yes** |
| PublicContacts | `bloodGroup` | `-1` | **yes** |
| ActiveDonors | `time` | `Date.now`-style **function** | **no** — §1.2 |
| Logs | `date` | **function** | **no** — §1.2 |
| Feedbacks | `date` | **function** | **no** — §1.2 |
| Tokens | `expireAt` | **function**, and not `required` | **no** — §1.2 |
| Donor | `email` | `''`, not `required` | **no** — nothing reads it as absent-vs-empty |

### 1.2 Function defaults are never backfilled

A function default is evaluated at write time. Backfilling `Logs.date` or `Tokens.expireAt` today
would stamp *2026-08-09* onto rows created years ago and, for `expireAt`, hand every affected
session a fresh 30-day life through the TTL index. The migration **reports** function-default gaps
with counts and does not touch them.

The same rule catches a second case: **required with no default at all.** The local database has
13 of 57 `Logs` documents with no `details` field. There is no value to write, so the migration
reports the count and stops there — repairing those is a separate decision about log rows, not part
of this plan.

### 1.3 The validator is narrow: `donors.designation` only

`collMod` with `validationLevel: 'strict'` validates every insert and every update. A validator that
demanded the *whole* donor schema would make every legacy-malformed donor unwritable — someone would
open a profile, hit Save, and get an opaque *"Document failed validation"*. The validator therefore
asserts one thing:

```js
{
  $jsonSchema: {
    bsonType: 'object',
    required: ['designation'],
    properties: {
      designation: { bsonType: 'number', enum: [0, 1, 2, 3] }
    }
  }
}
```

Verified against mongo 7.0.14: a raw `insertOne` without `designation` is **rejected**, a raw
`$unset: {designation}` is **rejected**, and normal mongoose writes are **accepted**.

`bsonType: 'number'`, not `'int'`. Mongoose stores an integral JS number as BSON `int32` today
(verified: `$type` returns `"int"`), so `'int'` would pass current writes — but a legacy document
holding a `double` would then become unwritable, which is precisely the failure mode §1.3 exists to
avoid. `'number'` accepts `int`/`long`/`double`/`decimal`, and `enum` does the real work.

`validationAction: 'error'`, not `'warn'`. A warning that lands in the mongod log is not enforcement.

### 1.4 The validator is re-applied at boot, because a restore destroys it

The Restore button runs `mongorestore --drop`
([internalRoutes/index.ts:254](../../badhan-backend/src/internalRoutes/index.ts#L254)). `--drop`
drops each collection, and **dropping a collection discards its validator**. A restore therefore
both removes the guard and reintroduces pre-migration documents.

So the `collMod` cannot live only in a migration. It goes where index alignment already lives —
`syncAllModels()` in [syncIndexes.ts](../../badhan-backend/src/db/syncIndexes.ts), which runs on
every boot — for exactly the reason the index declarations sit in
[Donor.ts:239-249](../../badhan-backend/src/db/models/Donor.ts#L239-L249): so that a fresh, reset or
restored database converges on the same shape as production. The migration still exists, to apply it
to production immediately and to pin the ordering against the backfill.

Boot-time application must **not** throw when it fails (a restore in progress, a user without
`collMod` rights). It logs, like the index sync does.

### 1.5 No `$ifNull` normalization on the read paths

Adding `designation: { $ifNull: ['$designation', 0] }` to the aggregations was considered and
rejected. After P1 and P2 the absence is unreachable; a defensive `$ifNull` would only convert a
future regression from a visible blank role into silence. Read paths are untouched by this plan —
`GET /donors/{id}`, search, the members list, the feedback pipeline and the call-record caller join
all keep their current projections.

### 1.6 The report is fixed here, not later

Switching [schemaInconsistencies.ts](../../badhan-backend/src/services/schemaInconsistencies.ts) to
`.lean()` is four lines and is the only reason the next instance of this bug gets noticed without
someone hand-writing an `$exists: false` count. Shipping the fix without it means P1 repairs the data
and the instrument stays broken.

---

## §2 As implemented

Four things the implementation added or changed against the plan above.

**The purge re-applies the validators too.** §1.4 covered `mongorestore --drop`; it missed
`dropDatabase()`, which [clearDatabase.ts](../../badhan-backend/src/db/test/clearDatabase.ts) calls on
every local purge and at the start of every test run. The server is already up at that point, so the
boot-time sync does not run again — without a call to `syncCollectionValidators()` right after the
drop, every test run and every local reset would proceed with no guard at all. Verified: purge, then
a raw insert with no `designation`, still rejected.

**The validator lives in [Donor.ts](../../badhan-backend/src/db/models/Donor.ts) as
`DONOR_VALIDATOR`**, beside the index declarations and for the same reason, and is consumed by both
`syncCollectionValidators()` and the migration.

**`donor.designation! > 1` became `donor.designation > DESIGNATIONS_INDEX.VOLUNTEER`.** Dropping the
assertion exposed the last designation literal in that controller; the constant is what the rest of
the file already uses.

**The violation counts are disjoint.** `{designation: {$nin: [0,1,2,3]}}` also matches a document
where the field is *absent*, so the first version of the refusal message counted the same donor
twice. The out-of-range count carries `$exists: true`.

### Verified locally

- `npx tsc --noEmit` and `npm run lint` clean; 217/217 backend tests, 122/122 Cypress specs pass.
- With three donors broken by hand through the driver (one `$unset designation`, one
  `designation: 5`, one missing `comment`/`commentTime`): the dry run reported all four gaps and
  refused the validator; the real run backfilled three paths and then **failed loudly** rather than
  applying a validator that would have made the `designation: 5` donor unwritable; after repairing
  that donor, the re-run applied the validator and confirmed it.
- Against the repaired collection: raw insert without `designation` **rejected**, raw
  `$unset designation` **rejected**, raw `$set designation: 7` **rejected**, raw `$set designation: 2`
  accepted. Still true after a full purge.
- `Logs.details` — 13 of 57 documents, required with no default — reported as needs-review and left
  alone, per §1.2.

---

## Phase P1 — Materialize the missing defaults

**New file** `badhan-backend/scripts/migrations/files/20260809_materialize-required-defaults.ts`,
modelled on [20260802_add-archive-flag.ts](../../badhan-backend/scripts/migrations/files/20260802_add-archive-flag.ts).

One file, two ordered steps — **not** two files. Migrations are selected and sorted alphabetically
with no state tracking ([migrations/README.md](../../badhan-backend/scripts/migrations/README.md)),
so a second file named `20260809_donor-designation-validator.ts` would sort **before**
`20260809_materialize-required-defaults.ts` (`d` < `m`) and switch the validator on ahead of the
backfill. Step numbering inside one file is the only ordering this orchestrator actually guarantees.

Step 1 of 2, for every registered model, for every path where `isRequired` is true:

1. Classify: static default / function default / no default.
2. `countDocuments({ [path]: { $exists: false } })`.
3. Static default and count > 0 → `updateMany({ [path]: { $exists: false } }, { $set: { [path]: <default> } })`.
4. Function default or no default → count only, no write, logged as **needs review**.

`DRY_RUN=1` logs every count and every intended write and performs none, per the migration contract.
Idempotent: a second run finds zero gaps and writes nothing.

The migration writes a report to `badhan-backend/reports/materialize-required-defaults.<env>.json`
(and `.dry-run.json`), matching the shape the task scripts already use — `ranAt`, `environment`,
`dryRun`, then per-model per-path `{ classification, missingBefore, modified }`. The reports in that
directory are committed, so the production before-state is preserved in git.

**Verification before P2:**

```
countDocuments({ designation: { $exists: false } })                → 0
countDocuments({ designation: { $nin: [0, 1, 2, 3] } })            → 0
```

The second query is not redundant: it also catches a document holding `4`, `null`, or a string,
each of which the P2 validator would reject.

## Phase P2 — The collection validator

Step 2 of 2 of the same migration file: `db.command({ collMod: 'donors', validator: …,
validationLevel: 'strict', validationAction: 'error' })`, with the §1.3 schema.

The step **refuses to run** if the §1.4 verification queries return anything but zero, and says why.
Switching a strict validator on over violating documents is the one irreversible mistake available
here, and it fails at the next user edit, not now.

Then, per §1.4, `syncAllModels()` in [syncIndexes.ts](../../badhan-backend/src/db/syncIndexes.ts)
gains a `collMod` pass that applies the same validator on boot. One source of truth for the
validator object — export it from `Donor.ts` beside the index declarations, import it in both places.

## Phase P3 — Mongoose can no longer drop it

1. [Donor.ts:24](../../badhan-backend/src/db/models/Donor.ts#L24): `designation?: number` →
   `designation: number`.
2. Delete the seven now-unnecessary `!` assertions:
   [DonorsController.ts:561](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L561),
   [652](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L652),
   [746](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L746),
   [751](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L751),
   [826](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L826),
   [831](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L831),
   [1024](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L1024).
   No behaviour changes — this is the type catching up with the invariant.
3. `runValidators: true` on the donor update paths that bypass document validation:
   [donorInterface.ts:493-496](../../badhan-backend/src/db/interfaces/donorInterface.ts#L493-L496)
   (`findDonorAndUpdate`, the hall-admin demotion) and the `updateMany` calls in
   [archive-dormant-donors.ts:133-141](../../badhan-backend/scripts/tasks/archive-dormant-donors.ts#L133-L141).
   Update validators run only for the paths named in `$set`, so this cannot fail on an unrelated
   legacy field — verified.

`docker compose exec backend npx tsc --noEmit` is the whole test for step 1 and 2. Note that
`new DonorModel({...})` keeps compiling without `designation`: the constructor takes a partial.

## Phase P4 — The report stops hiding it

In [schemaInconsistencies.ts](../../badhan-backend/src/services/schemaInconsistencies.ts):

```diff
- const cursor: AsyncIterable<any> = model.find().cursor() as any
+ const cursor: AsyncIterable<any> = model.find().lean().cursor() as any
  for await (const doc of cursor) {
-   const plain: any = doc.toObject({ depopulate: true, virtuals: false })
+   const plain: any = doc
```

Two consequences to handle in the same change:

- `doc.validateSync()` at [:155](../../badhan-backend/src/services/schemaInconsistencies.ts#L155)
  needs a document. Rehydrate only when a constraint check is wanted — `model.hydrate(plain)` — or
  drop to `new model(plain).validateSync()`. Do not silently lose the `constraintViolations` bucket.
- The `missingRequired` bucket will get longer the first time it runs against a real database. That
  is the point, and it is why P1 ships first: by then the static-default entries are gone and what
  remains is the §1.2 needs-review list.

The page's own copy already frames the output as a to-do list rather than an alarm
([16-super-admin-tools.md:86-90](../manual/16-super-admin-tools.md#L86-L90)), so no reassurance
work is needed beyond the manual note in P5.

## Phase P5 — Tests, manual, rollout

### Backend tests

`badhan-backend-test` is an HTTP suite: axios against the running backend, no database handle and no
`mongodb` dependency. The enforcement this plan adds is *below* HTTP, so the assertions that matter
most cannot live there, and inventing a database-capable test project to host four assertions is a
worse trade than saying so.

What the existing suite already pins, and must keep passing:

- `designation` is a **required property** of the donor-detail response schema
  ([tests/donors/schemas.js:502](../../badhan-backend-test/tests/donors/schemas.js#L502)), and of the
  members list and the call-record caller object. §0.3's blank-role profile is therefore already a
  test failure for any donor created through the API — it only ever escaped because the legacy
  documents predated the API.
- `PATCH /donors/designation` across all four levels, `PATCH /donors` with `archiveFlag: true`
  demoting to `0`, and the higher-designation refusals — the regression surface for both the removed
  `!` assertions and `runValidators`.

The database-level guarantees are verified where they live instead:

- The migration **verifies its own work**: step 2 reads the two violation counts, refuses to apply
  the validator unless both are zero, reads the validator back after `collMod`, and throws on a real
  run that finished the backfill without applying it. A half-done migration reports as failure, not
  as *"Migration complete."*
- `syncCollectionValidators()` reads the validator back on every boot and logs
  `donors 🔒 validator applied` or a warning. The boot log is the standing check that a restore or a
  purge has not left the collection unguarded.

There is deliberately **no** test asserting that a missing `designation` reads as `0` through
mongoose. That behaviour is real (§0.2) but it is the mask, not the contract, and pinning it would
argue against P2.

### Frontend / Cypress

None. No screen, permission or route changes. The blank-role profile of §0.3 stops existing because
the data is repaired, not because the UI changed.

### Manual ([docs/manual/](../manual/))

Per [CLAUDE.md](../../CLAUDE.md), the behaviour that changes for a reader is on the super-admin
tools page and in the quiet-rules list:

- **[16-super-admin-tools.md](../manual/16-super-admin-tools.md), Schema Inconsistencies** — one
  paragraph: the page previously could not see a missing field when the app had a sensible fallback
  value for it, and now it can, so the list may be longer than it was and longer is not worse.
- **[17-rules-the-app-enforces.md](../manual/17-rules-the-app-enforces.md), "Rules that apply
  quietly"** — one line: *every donor record carries a role, and a record that somehow has none is
  read and repaired as Donor.*

No change to [04-roles-and-permissions.md](../manual/04-roles-and-permissions.md) or
[12-members-and-promotions.md](../manual/12-members-and-promotions.md): the four levels, the
permission table and the promotion rules are all untouched.

### Rollout

One rule, applied twice: **migrate the database, then deploy the code against it** — development
first, production second.

`./deploy` picks its target from the current branch: `main` → `env.production` + `app_prod.yaml`,
anything else → `env.development` + `app_dev.yaml`
([upload-gcloud.js:28-42](../../badhan-backend/upload-gcloud.js#L28-L42)). The migration picks its
target from `NODE_ENV` alone — the branch is irrelevant to it — so both migrations run from whichever
working tree happens to hold the migration file.

**1. Commit all of P1–P4 on `test-branch`.** Nothing is deployed and no database is touched yet. From
here the file `scripts/migrations/files/20260809_materialize-required-defaults.ts` exists locally,
which is all either migration run needs.

**2. Migrate the development database, from `test-branch`:**

```bash
docker compose run --rm -e NODE_ENV=development -e DRY_RUN=1 backend \
  npx ts-node --transpile-only scripts/migrations/index.ts 20260809_materialize-required-defaults
```

Then the same command without `DRY_RUN`. This is the rehearsal: the dev database is a restore of
production, so its dry-run report is a preview of the production one, and the whole two-step
sequence — backfill, verification queries, `collMod` — is exercised for real before production sees
it. Read the report and compare its `designation` count against what you expect in production.

**3. `./deploy` from `test-branch`.**
Deploys backend and frontend to the development environment behind the full two-suite test gate. The
boot-time validator sync (§1.4) now finds an already-repaired collection, exactly as it will in
production. Exercise the donor profile, a promotion, an archive, and the Schema Inconsistencies page.

**4. Switch to `main` and merge `test-branch` locally — do not push yet.**

**5. Migrate production, same command with `NODE_ENV=production`:** dry run, read the report, then
the real run. It performs the backfill, re-checks the two verification queries, and only then applies
the validator. Commit the produced report under `badhan-backend/reports/` alongside the development
one.

**6. Push `main`, then `./deploy`.**
Now on `main`, so the same script deploys to production, again behind the test gate. Production code
arrives at an already-repaired database — the boot-time validator sync finds nothing to break.

**7. Open the Schema Inconsistencies page on production once and read it** — the acceptance check for
P4, and the first genuinely informative run it has ever had.

All migration commands run inside the container, per [CLAUDE.md](../../CLAUDE.md); `./deploy` itself
is host tooling and stays on the host.

### Why the database goes first, in both environments

Deploying P2 ahead of the backfill is the one sequencing mistake that breaks users. The boot-time
validator sync applies a `validationLevel: 'strict'` validator the moment the new backend starts;
every donor still missing `designation` is then unwritable, and the failure surfaces as an opaque
*"Document failed validation"* the next time somebody edits one of them — minutes or days later, with
nothing on screen connecting it to the deploy. Migrating first cannot fail this way, and it costs
nothing: the backfill needs no deployed code at all, only a working tree and the right `NODE_ENV`.

Running it against development first is what makes the production run boring. Same script, same two
steps, against a restore of the same data, with a report to compare — so the production run has
already been performed once by the time it matters.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Validator switched on over violating documents → later edits fail with *"Document failed validation"* | P2 refuses to run unless both verification queries return 0; each environment's database is migrated before its code is deployed (rollout steps 2–3, then 5–6) |
| The production migration behaves differently from the rehearsal | Development is a restore of production and is migrated first with the identical script; the two reports are committed side by side for comparison |
| `mongorestore --drop` silently removes the validator | §1.4 re-applies it on every boot; a backend test asserts a raw insert is rejected |
| `bsonType: 'int'` would reject a legacy `double` | §1.3 uses `bsonType: 'number'` + `enum` |
| Backfilling a function default rewrites history / resets TTLs | §1.2 never writes them; report-only |
| `.lean()` in P4 breaks the `constraintViolations` bucket | P4 rehydrates explicitly for `validateSync()`; the bucket is covered by the acceptance check in rollout step 6 |
| The longer inconsistency list reads as a new problem | Manual paragraph in P5 says why it grew |
