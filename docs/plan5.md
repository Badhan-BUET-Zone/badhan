# Plan 5: Anonymize the DB snapshot into CSVs for donor-suggestion ML

## Goal

Turn the mongodump snapshot at
`badhan-backend/backup/1784737620663/Badhan/*.bson` into a set of **de-identified CSV
files** that can be handed to a modelling notebook: names, student IDs, phone numbers,
emails, password hashes and raw ObjectIds do not survive the export, and hall is
substituted.

"De-identified", not "anonymized" — `donors.csv` retains the free-text `address`,
`room_number` and `comment` fields by request, which keeps it in the sensitive-data
category. See the note under the donors table.

One script. No DB connection — it reads the `.bson` files directly and writes CSVs.

Scope note: this plan produces **faithful anonymized tables**, one CSV per exported
collection,
not engineered features. Building the recommender's feature matrix (recency /
frequency / call-outcome windows) is a separate step that reads these CSVs.

## Source snapshot — what is actually in there

Verified by reading the BSON (counts are exact for this snapshot):

| Collection | Docs | Referenced donors | Notes |
| --- | --- | --- | --- |
| `donors` | 4142 | — | the only collection with direct PII |
| `donations` | 8945 | `donorId` | also carries a denormalised `phone` |
| `callrecords` | 7671 | `callerId`, `calleeId` | **1 doc has a dangling ref** |
| `logs` | 35896 | `donorId` | `details` is a free-form blob, PII-heavy — **dropped** |
| `plateletdonations` | 10 | `donorId` | also carries `phone` |
| `activedonors` | 175 | `donorId`, `markerId` | **not exported** — current-roster state, not history |
| `publiccontacts` | 9 | `donorId` | **not exported** — 9 rows, no ML value |
| `tokens` | — | `donorId` | **not exported** — auth material, zero ML value |

Field presence in `donors` (out of 4142): every doc has `_id`, `studentId`, `name`,
`roomNumber`, `bloodGroup`, `phone`, `comment`, `hall`, `commentTime`, `availableToAll`,
`address`, `email`; `designation` is present on 2793; `password` on 471.

## Field-by-field disposition

### `donors` → `donors.csv`

| Source field | Disposition | Output column(s) |
| --- | --- | --- |
| `_id` | replaced by surrogate key | `donor_key` |
| `_id` timestamp | derived (ObjectIds embed a creation time — useful, not identifying) | `created_at` |
| `name` | **deleted** | — |
| `studentId` | **deleted**, split into its two non-identifying parts | `batch_year`, `department_id` |
| `phone` | **deleted** | — |
| `bloodGroup` | kept as-is | `blood_group` |
| `hall` | substitution cipher over the hall indices | `hall_code` |
| `designation` | kept, missing → `0` (the schema default) | `designation` |
| `availableToAll` | kept as-is | `available_to_all` |
| `password` | **deleted**, reduced to a boolean | `has_account` |
| `email` | **deleted**, reduced to a boolean (`''` → false) | `has_email` |
| `address` | **kept verbatim** | `address` |
| `roomNumber` | **kept verbatim** | `room_number` |
| `comment` | **kept verbatim** | `comment` |
| `commentTime` | kept as-is | `comment_time` |

`address`, `room_number` and `comment` are kept as free text at your instruction. Be
aware of what that means for the output: `comment` carries medical notes (*"Has high
blood pressure"*) and, in a set of rows already stamped with batch year, department,
blood group and hall, free text is usually the field that makes a row identifiable —
comments naming a person or a hall room pin down an individual regardless of the
surrogate keys. `donors.csv` should therefore be handled as **sensitive personal data,
not an anonymized extract**. Two things follow, and the second is the important one:

- Do not upload it to a hosted notebook, and drop these three columns before sharing the
  file with anyone.
- **`docs/` is tracked by git** — the root `.gitignore` contains only `.DS_Store`, unlike
  `badhan-backend/backup/` which is ignored. So `docs/anonymized/donors.csv` is
  commit-ready the moment it is written, and `git add docs/` or `git commit -a` would put
  4142 donors' addresses, hall room numbers and medical comments into the repository —
  irreversible once pushed, since rewriting history does not recall what others already
  fetched. **Add `docs/anonymized/` to the root `.gitignore` in the same commit that adds
  the script.** If the intent is instead to commit the CSVs deliberately, the free-text
  columns have to go first.

The other four CSVs are unaffected — they carry no free text.

### `donations` → `donations.csv`

`donation_key`, `donor_key`, `date`, `created_at`.

The denormalised `phone` is **dropped**, as it is everywhere else — `donorId` already
joins.

### `plateletdonations` → `platelet_donations.csv`

Same shape as `donations.csv`.

### `callrecords` → `call_records.csv`

`call_key`, `caller_key`, `callee_key`, `date`, `created_at`.

This is the **primary training signal** for donor suggestion (who was called, when),
so it is exported in full.

### `logs` → `logs.csv`

`log_key`, `donor_key`, `operation`, `date`. **`details` is dropped entirely.**

It is an untyped blob: across the snapshot it holds the keys `name`, `phone`,
`password`, `studentId`, `address`, `roomNumber`, `comment`, `email`, `callee`, `donor`,
`filter`, `resultCount`, plus numeric keys `0`–`7` — i.e. whole donor records and 125
password hashes pasted into log rows. Never allowlist keys out of it; the next new log
line will add a key nobody redacted.

## The three anonymization primitives

### 1. Surrogate keys (replaces every `_id` / ref)

Build one map `ObjectId hex → integer` per collection, assigned in the order documents
appear in the BSON file. Donor keys are allocated first, from `donors.bson`, so that
every foreign key in every other file resolves against the same map.

Format: `d1`, `d2`, … for donors; `dn1`, `cr1`, `pd1`, `lg1` for the
others. Prefixes stop a donor key and a donation key from being silently joined.

The map itself is the re-identification key. **The script never writes it** — it lives
only in memory for the duration of the run, so there is no key file to leak or to
remember to delete.

### 2. Hall substitution cipher

`hall` is replaced by `hall_code`: a fixed permutation of the hall indices, so hall `0`
might come out as `5`, `1` as `2`, and so on.

- Domain = the 8 values a donor may hold, `{0, 1, 2, 3, 4, 5, 6, 8}` —
  `HALL_INDICES_ALLOWED_FOR_DONOR` in
  [src/constants/index.ts](badhan-backend/src/constants/index.ts). `7` (Attached) is
  excluded by the schema and all 8 allowed values occur in this snapshot
  (0: 981, 1: 249, 2: 510, 3: 246, 4: 407, 5: 576, 6: 610, 8: 563).
- Key = `HALL_PERMUTATION`, a hard-coded permutation of those 8 values at the top of the
  script. Hard-coded rather than generated so that a re-run — or a run against a later
  snapshot — yields the same mapping and can be joined to earlier work.
- Being a permutation, it is a bijection: cardinality and group sizes are untouched, so
  the column still works as a categorical feature and same-hall / different-hall
  comparisons still hold. Only the *label* is hidden.
- The column is named `hall_code`, not `hall`, so nobody joins it against
  `halls`/`HALLS_INDEX` and silently mislabels every chart.
- Out-of-domain value (e.g. a stray `7`): emit `''` and count it, rather than passing
  the real index through unciphered.

**This hides the label, not the hall.** Hall sizes in the snapshot are distinct enough
(981 vs 249 vs 246 …) that anyone with the real per-hall counts recovers most of the
mapping by frequency alone. It is obfuscation against a casual reader, not protection
against an analyst — do not treat a ciphered hall as licence to relax handling of the
file.

### 3. `studentId` → `batch_year` + `department_id`

BUET IDs are 7 chars: `YY` `DD` `RRR` — batch, department, roll. The roll is the
identifying part, so:

- `batch_year = 2000 + parseInt(studentId.slice(0, 2))`
- `department_id = parseInt(studentId.slice(2, 4))`
- roll (`slice(4)`) is discarded, along with the full `studentId`.

Both are low-cardinality group attributes over thousands of people, which is why they
survive where the ID does not. Observed in this snapshot: years `00, 10–25`;
departments `00, 01, 02, 04, 05, 06, 08, 10, 11, 12, 15, 16, 17, 18` — consistent with
`DEPARTMENT_CODES_FOR_VALIDATION` in
[src/constants/index.ts](badhan-backend/src/constants/index.ts), including the
code-`00` case that has no department name.

Note `batch_year = 2000` exists (one legacy row) even though the live validator
requires ≥ 2001. Emit it as-is; do not "fix" source data in an export script.

## Edge cases found in this snapshot

The script must handle these without crashing and must **report the count of each** at
the end. Silent coercion here is how a bad training set gets built.

1. **1 `callrecord` references a donor that no longer exists.** Emit the row with the
   unresolved side as an empty cell, and log it. A cleaning step in the notebook can
   drop it; the export should not decide that.
2. **`designation` absent on 1349 donors** → write `0`.
3. **`hall` outside the allowed 8 values** — none in this snapshot, but emit `''` and
   count rather than leaking an unciphered index.
4. **Blank `email`** is `''`, not absent → `has_email = false`.
5. **`address` / `room_number` / `comment` carry the sentinel `(unknown)`** (lowercase
   in the data, `(Unknown)` in the schema default). Passed through verbatim — the
   notebook should treat both casings as missing.
6. **Free text may contain commas, quotes and newlines**, so CSV escaping is
   load-bearing (see the writer below), and a naive `split(',')` reader will corrupt the
   file.
7. **1 donor has `bloodGroup` as the empty string** rather than an index — it is not
   absent, so a presence check does not catch it. Emit `''` and count it; do not coerce
   it to a blood group. So `blood_group` is 0–7 **or empty** on exactly one row.
8. **Malformed phones** (11 not starting with `8801`, 2 not 13 digits long) need no
   handling at all now that the column is gone — noted only so nobody re-adds a phone
   column assuming the field is well-formed.

## Script

**Path:** `docs/anonymize-snapshot.js`
**Output:** `docs/anonymized/*.csv`

This is **host-only tooling**, run with the host's own `node` — it is not part of the
Docker project. It touches no database, no container, and no application code. That puts
it in the same category as the three existing exceptions in
[CLAUDE.md](CLAUDE.md#exceptions) (`upload-googleplay.js`, `upload-firebase.js`,
`upload-gcloud.js`), though it is deliberately **not** added to that list — the list names
the deploy scripts, and this is a one-off analysis tool that need not become part of the
project's standing rules.

Two consequences of being host-only, and they shape the whole script:

- **Plain JavaScript, CommonJS.** The host has no `typescript` and no `ts-node` — those
  live in the container's `node_modules` volume. So no `.ts`, no build step.
- **Zero dependencies.** The host has no `node_modules` at all, so `require('bson')` is
  not available. The BSON decoding must be hand-rolled against Node's `Buffer` — see the
  reader below. Do not add a `package.json` to `docs/` to pull in `bson`; that
  reintroduces an install step for a 60-line decoder.

**No arguments, no flags, no env vars.** One fixed behaviour, so two runs cannot produce
two differently-shaped datasets. The input directory, output directory and the hall
permutation are module-level `const`s at the top of the file; changing what the script
does means editing the script. Paths resolve from `__dirname`, not `cwd`, so it runs the
same from anywhere.

```js
const SNAPSHOT_DIR = path.join(__dirname, '../badhan-backend/backup/1784737620663/Badhan')
const OUT_DIR      = path.join(__dirname, 'anonymized')
const HALL_PERMUTATION = { /* 8 → 8, a derangement */ }
```

**Run it:**

```bash
node docs/anonymize-snapshot.js
```

`OUT_DIR` is created if missing and its `*.csv` overwritten on re-run.

**Structure**, top to bottom in one file:

1. **BSON reader**, hand-rolled — the only non-obvious part of the script, ~60 lines.
   A `.bson` dump file is just concatenated BSON documents, each prefixed with its own
   `int32` length, so:
   - `function* readBson(file)` — `readFileSync` into a Buffer, then loop:
     `len = buf.readInt32LE(cursor)`, `yield parseDoc(buf, cursor, cursor + len)`,
     `cursor += len`. A generator, not an array, so `logs.bson` (6 MB) streams.
   - `parseDoc(buf, start, end)` — skip the 4 length bytes, then per element read a
     `uint8` type tag, a NUL-terminated `cstring` name (`buf.indexOf(0, p)`), then the
     value by type. Stop at the trailing `0x00`.
   - Element types actually present in this snapshot — implement exactly these and
     `throw` on anything else, so a future field can't be silently skipped:

     | Tag | Type | Read as |
     | --- | --- | --- |
     | `0x01` | double | `readDoubleLE` |
     | `0x02` | string | `int32` length, then `utf8` minus the trailing NUL |
     | `0x03` | embedded doc | `int32` length — **skip it**, only `logs.details` is one, and it is dropped |
     | `0x07` | ObjectId | 12 raw bytes → hex string; bytes 0–3 are the big-endian creation time (`created_at = ts * 1000`) |
     | `0x08` | boolean | one byte |
     | `0x09` | UTC datetime | `readBigInt64LE` → `Number` |
     | `0x10` | int32 | `readInt32LE` |
     | `0x12` | int64 | `readBigInt64LE` → `Number` (safe: these are ms timestamps and phone numbers, all well under 2^53) |
     | `0x0A` | null | no bytes |

   Skipping `0x03` by its length prefix is what lets `details` be dropped without ever
   decoding the blob — the PII in it is never even materialised in memory.
2. **CSV writer** — a tiny `writeCsv(path, header, rows)`. Because `address`,
   `room_number` and `comment` are free text, RFC-4180 quoting is **required**, not
   optional: wrap any value containing `,`, `"`, `\n` or `\r` in double quotes and
   double every embedded `"`. Also normalise embedded newlines in those three fields to
   a space before quoting — pandas handles multi-line quoted fields, but `wc -l` and
   every shell check in the verification list below do not. `\n` line endings, header
   row always written even when there are zero rows.
3. **Key allocator** — `makeKeyer(prefix)` returning `(objectIdLike) => string`, backed
   by a `Map`. Resolution of a foreign key that is absent from the donor map returns
   `''` and bumps a counter.
4. **Hall cipher** — key validation (must be a permutation of the 8 allowed hall
   indices; throw loudly otherwise), then `maskHall(hall) -> number | ''`.
5. **Per-collection passes** — donors first (allocates donor keys), then the rest in
   any order. Each pass is ~15 lines: iterate, map fields, push a row.
6. **Report** — print, to stdout: rows written per file, and each edge-case counter
   (unresolved refs, missing `designation`, out-of-domain halls). A zero-row output or
   a spike in unresolved refs should be obvious without diffing CSVs.

Style: plain CommonJS with `console.log`, matching the other host-only scripts
([upload-firebase.js](badhan-frontend/upload-firebase.js)) rather than the container's TS
conventions — nothing here imports from `src/`, so `myConsole` and the TS style guide
don't apply.

## Verification

1. `donors.csv` has 4142 data rows; `donations.csv` 8945; `call_records.csv` 7671;
   `logs.csv` 35896; `platelet_donations.csv` 10. `OUT_DIR` contains exactly these five
   files — no `active_donors.csv`, `public_contacts.csv` or `tokens.csv`.
2. `grep -cE '8801[0-9]{9}'` over every CSV returns 0, and a `grep -cFf` against the
   real name and student-ID lists returns 0 outside the free-text columns. Expect some
   `comment` hits — free text does contain names; that is the residual risk the field
   carries, and the reason `donors.csv` stays on this machine.
3. `donor_key` is unique in `donors.csv` and every `donor_key` / `caller_key` /
   `callee_key` elsewhere is either in that set or empty.
4. Row counts survive a real CSV parse, not just `wc -l` — load each file in pandas (or
   any RFC-4180 reader) and compare against step 1. This is what catches a quoting bug in
   the free-text columns; `wc -l` will happily agree with a corrupted file.
5. No column named `name`, `student_id`, `phone`, `password`, or `details` exists in any
   emitted file.
6. `batch_year` ∈ {2000, 2010…2025}; `department_id` ∈ the 14 observed codes;
   `blood_group` ∈ 0–7 plus one empty cell (edge case 7); `designation` ∈ 0–3; `hall_code` has exactly 8 distinct values
   whose group sizes are a permutation of {981, 249, 510, 246, 407, 576, 610, 563} —
   and **no** `hall_code` group size matches the real count for that same index, i.e.
   the permutation is a derangement, so no hall accidentally maps to itself.

## Out of scope

- Feature engineering / the model itself.
- Committing the CSVs, or copying them off this machine. That is a separate decision and a
  weightier one than it looks: with `address`, `room_number` and `comment` retained,
  `donors.csv` is **pseudonymized production data, not an anonymized extract**, and it now
  lands in a git-tracked directory (see the note under the donors table). Even without
  those columns the call graph in `call_records.csv` is structurally distinctive enough to
  be re-identifiable against an external source.
- `activedonors.bson`, `publiccontacts.bson`, `tokens.bson`.
