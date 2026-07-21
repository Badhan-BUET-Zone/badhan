# Phases: CSV bulk donor upload (frontend-driven, one-by-one via existing API)

This document restructures [plan.md](plan.md) into ordered, independently-verifiable
phases. **Every specification from plan.md is preserved** — nothing is dropped, only
re-sequenced. Each phase ends with a **"How to verify"** section listing concrete,
manual checks a developer can perform before moving on.

## Goal (unchanged)

Let a logged-in member upload a CSV file in the Badhan frontend and have every row
created as a donor by calling the **existing** `POST /donors` endpoint once per row.
No new backend endpoint — the frontend drives the loop, so authentication, validation,
duplicate detection and the donor-insertion queue all stay exactly as they are today.
The single backend change is unrelated to the loop: the `GET /donors/phone` pre-flight
route loses its rate limiter so the chunked existence check can run freely (Phase 3).

## Global conventions (apply to every UI phase)

Build the UI out of **Vuetify components and their built-in props** — layout, spacing,
colours, elevation, tables (`v-data-table`), file input (`v-file-input`), buttons,
progress bars, alerts and the expansion panel for the help section all come from
Vuetify. Use Vuetify's **animations/transitions** (e.g. `v-expand-transition`,
`v-fade-transition`, the `v-progress-linear` indeterminate/animated states, row and
status-change transitions) so state changes — parsing, per-row status updates, showing
the "already exists" table — are animated rather than snapping into place.

Write **minimal to no custom CSS.** Prefer Vuetify utility classes (`ma-*`, `pa-*`,
`d-flex`, `text-*`, colour classes) and component props over hand-written styles. A
`<style>` block is the last resort, only for something Vuetify genuinely cannot express,
and kept as small as possible.

### Running commands — Docker only

**Docker Compose is the only supported environment; Node, npm, and MongoDB are never
assumed to exist on the host.** Every `npm`/`npx`/build/test command in this document runs
**inside a container**, never from the host machine. The relevant invocations:

- **Dev stack** (frontend on :8080, backend on :3000, internal on :4000, mongo):
  `docker compose up --attach backend --attach internal --attach frontend`. Source is
  bind-mounted with hot reload, so a code change recompiles inside the `frontend` container
  with no host-side `npm run serve`.
- **Adding a frontend dependency**: edit `badhan-frontend/package.json` (and lockfile), then
  rebuild the image so the install runs in-container —
  `docker compose up --build frontend` (node_modules lives in the container, not on the host).
- **A one-off npm/npx command in a service**: `docker compose run --rm frontend npm <…>`
  (or `docker compose exec frontend npm <…>` against the already-running stack).
- **Cypress suite** (one-off container under the `test` profile, always `--build`):
  `docker compose --profile test run --build --rm frontend-test`. To scope to a single
  spec, override the command:
  `docker compose --profile test run --build --rm frontend-test npx cypress run --spec <path>`.
- **Backend (Jest) suite**: `docker compose --profile test run --build --rm backend-test`.

Wherever a "How to verify" step below says to run a command, run it through one of these
container entry points — do not run it on the host.

---

## Phase 0 — Dependencies & scaffolding

**Scope:** get the tooling in place before writing feature code.

- Add `papaparse` + `@types/papaparse` to `badhan-frontend/package.json` (work-breakdown
  item 1).
- Confirm `file-saver` is already a `badhan-frontend` dependency (used later for the
  demo CSV and failed-rows export); no new dependency needed for it. No CSV parsing
  dependency exists in `badhan-frontend` today.

**How to verify (developer):** (all commands run in-container — see "Running commands — Docker only")
- `docker compose run --rm frontend npm ls papaparse @types/papaparse` resolves both.
- `import Papa from 'papaparse'` in a scratch file type-checks with no missing-types error.
- `docker compose up --build frontend` rebuilds the image and the container logs
  `Compiled successfully` with no build error (this is the in-container equivalent of the
  old host-side `npm run serve`).

---

## Phase 1 — Backend: drop the rate limiter on `GET /donors/phone`

**Scope:** the *only* backend change in the whole feature (work-breakdown item 2c).

- Remove `rateLimiter.commonLimiter` from the `GET /donors/phone` route in
  [DonorsController.ts:933-966](badhan-backend/src/tsoaControllers/DonorsController.ts#L933-L966)
  so the chunked pre-flight calls are never rate-limited.
- Regenerate the tsoa routes/spec after the middleware change.
- No new endpoint, no extra batch-level server logging — the per-row `POST DONORS` log
  entries already suffice.

**Context (do NOT change):** the two existence-check routes both stay `200`-on-either-outcome:
- `GET /donors/checkDuplicate?phone=` (single) returns `{ found, donor, message }`;
  `donor` is non-null only when the caller may view it (super admin, same hall, hall > 6,
  or `availableToAll`).
- `GET /donors/phone?phoneList[]=` (many) returns `{ donors: [{ phone, donorId }] }` for
  **only the phones that already exist**; a donor the caller may not access comes back
  with `donorId === 'FORBIDDEN'`. Each element must be a 13-digit string starting `880`.
- `POST /donors` keeps its middleware chain (`validatePOSTDonors` → `donorInsertionQueue`
  → `handleAuthentication`), still has **no** rate limiter, still serializes via the queue,
  and still detects duplicates by phone only (`201`/`409`/`500`/`400`).

**How to verify (developer):**
- Diff the route: `commonLimiter` is gone from `GET /donors/phone` and present nowhere it
  wasn't before; `POST /donors` and every other route are untouched.
- Regenerated tsoa routes file shows no limiter on that route; `git diff` on the generated
  spec is limited to this route.
- With the backend running, fire `GET /donors/phone?phoneList[]=8801...` (authenticated)
  ~150 times in a tight loop — none return `429`. Compare against another `commonLimiter`
  route that still throttles.
- Backend test suite still passes, run in-container:
  `docker compose --profile test run --build --rm backend-test` (`badhan-backend-test`
  unchanged by design).

---

## Phase 2 — CSV parse + normalize + validate module (`donorCsv.ts`)

**Scope:** the pure logic core, no UI. Work-breakdown item 2. New file
`badhan-frontend/src/utils/donorCsv.ts`. Each parsed row is returned as
`{ raw, normalized, errors: [{ field, message }], status }`; the view (Phase 4) routes
by `status` and renders `errors` inline.

### 2.1 CSV format & parser configuration

- UTF-8 CSV with a **header row**. Column order does not matter — columns matched by
  header name (case-insensitive, trimmed).
- Canonical header:
  ```
  name,phone,studentId,bloodGroup,hall,roomNumber,address,comment,donationCount,lastDonation,plateletDonationCount,lastPlateletDonation,availableToAll
  ```
- Use `papaparse`, configured `header: true`, `skipEmptyLines: false`, **`delimiter: ','`**
  (comma forced, never auto-detected). papaparse handles quoted fields, embedded commas,
  and the Excel BOM.

### 2.2 Strict validation — exactly one accepted form per field

The parser accepts one spelling of each value and rejects everything else. No alternative
formats, no coercion, no guessing. A non-conforming value produces an inline error on that
row rather than being silently converted. Concretely rejected:

- `hall` — **hall names only.** Numeric codes `0`–`8` rejected. `Attached` rejected.
- `phone` — **13 digits, `8801XXXXXXXXX`, only.** Local `01XXXXXXXXX`, spaces, dashes,
  `+` prefixes, leading `+880` all rejected.
- `bloodGroup` — **labels only** (`A+`, `O-`, …). Raw codes `0`–`7` rejected.
- `availableToAll` — **`yes` or `no` only.** `true`/`false`, `1`/`0`, `Y`/`N`, blank rejected.
- Blank is never a substitute for a value in a required column.

**Case is enforced** for every fixed-value field (`hall`, `bloodGroup`, `availableToAll`):
the value must match the canonical spelling **exactly, including case**. `Sher-e-Bangla`
accepted; `sher-e-bangla`, `SHER-E-BANGLA`, `Sher-E-Bangla` rejected. `A+` not `a+`.
`yes`/`no` not `Yes`/`YES`/`NO`. The only normalization before matching is `trim()` of
surrounding whitespace — no lower/upper-casing. Free-text fields (`name`, `roomNumber`,
`address`, `comment`) have no canonical form and so no case rule.

### 2.3 The client-vs-server validation split

- **Format / representation rules** (how a value must be *spelled*): **always enforced
  client-side** — 13-digit `8801…` phone, hall names, blood-group labels, `yes`/`no`,
  `23 September 2010` dates.
- **Value-range validations**: enforced client-side **only where single-donor creation
  already validates them in the browser** (`NewPersonCard.vue`'s `validations`). Anything
  the single-donor form leaves to the server, the uploader also leaves to the server —
  that row still passes client validation, is sent to `POST /donors`, and routes to
  Table 3 on a non-`201` response with the server's message inline.
  - So the parser does **not** enforce `name` 3–100 length, the exact backend department
    list, or a `studentId` batch-year range (single-donor doesn't).
  - It **does** enforce `name` `required`, `studentId` = 7 numeric digits +
    `substr(2,2) ≤ departments.length`, and the bidirectional count/date checks.

### 2.4 Column specification

| Column | Required | Accepted in CSV — nothing else | Sent to API | Rules |
|---|---|---|---|---|
| `name` | **yes** | text | `name` | client checks **non-blank only**; backend's 3–100-char rule left to server; out-of-range name → Table 3 on rejection |
| `phone` | **yes** | exactly 13 digits, `8801XXXXXXXXX` | `phone` (number) | must fall in `8801000000000`–`8801999999999`; `01XXXXXXXXX`, `+8801…`, spaces/dashes/punctuation **rejected** |
| `studentId` | **yes** | exactly 7 digits, e.g. `1605011` | `studentId` | **only the client-side single-donor checks**: 7 numeric digits and dept code `substr(2,2)` ≤ `departments.length` ([NewPersonCard.vue:171-175](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L171-L175)). **No batch-year check**, no validation vs backend dept list `[0,1,2,4,5,6,8,10,11,12,15,16,17,18]` — server is authority, rejects → Table 3. Use `00` for unknown dept |
| `bloodGroup` | **yes** | one of `A+ A- B+ B- O+ O- AB+ AB-` | `bloodGroup` (int) | mapped via `bloodGroups` = `['A+','A-','B+','B-','O+','O-','AB+','AB-']`. Numeric codes **rejected** |
| `hall` | **yes** | one of `Ahsanullah`, `Chatri`, `Nazrul`, `Rashid`, `Sher-e-Bangla`, `Suhrawardy`, `Titumir`, `Unknown` | `hall` (int) | mapped to `0,1,2,3,4,5,6,8`. Numeric codes **rejected**. **`Attached` rejected** (validator allows only `[0,1,2,3,4,5,6,8]`; never silently mapped to `Unknown`). `Unknown` forces `availableToAll = true` server-side |
| `roomNumber` | no | text | `roomNumber` | 2–500 chars; **blank auto-filled with `(Unknown)`** |
| `address` | no | text | `address` | 2–500 chars; **blank auto-filled with `(Unknown)`** |
| `comment` | no | text | `comment` | 2–500 chars; **blank auto-filled with `(Unknown)`** |
| `donationCount` | **yes** | integer `0`–`99` | `extraDonationCount` = `donationCount - 1` (or `0`) | CSV value is the donor's **total** blood-donation count. `0`–`99` matches single-donor 2-digit cap. Send `donationCount - 1` when `> 0`, else `0`. Blank rejected — write `0` |
| `lastDonation` | conditional | `23 September 2010` (`<day> <Month> <year>`) | `lastDonation` (epoch ms) | blank when `donationCount` is `0`, present when `> 0`. Only accepted date form (below). Future dates **allowed** |
| `plateletDonationCount` | **yes** | integer `0`–`99` | `extraPlateletDonationCount` = `plateletDonationCount - 1` (or `0`) | total platelet count; `0`–`99`; same `- 1` mapping. Blank rejected — write `0` |
| `lastPlateletDonation` | conditional | `23 September 2010` (`<day> <Month> <year>`) | `lastPlateletDonation` (epoch ms) | same rule/form as `lastDonation`, against `plateletDonationCount` |
| `availableToAll` | **yes** | `yes` or `no` | `availableToAll` (bool) | `true`/`false`/`1`/`0`/blank **rejected**. **`hall=Unknown` + `availableToAll=no` is a row error** (→ Table 3), not silently overridden — with `hall=Unknown` the value must be `yes` |

### 2.5 The bidirectional count/date rule

Matching single-donor creation ([NewPersonCard.vue:274-284](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L274-L284)):
the date must be present when the count is `> 0`, **and** the count must be non-zero when
a date is present — otherwise a row error. Same pair of checks for
`lastPlateletDonation` / `plateletDonationCount`.

### 2.6 Count → `extraDonationCount` decrement

CSV `donationCount` is the **total** number of donations; the API's `extraDonationCount`
is donations *in addition to* the one implied by `lastDonation`. So send:
```
extraDonationCount = donationCount === 0 ? 0 : donationCount - 1
```
exactly as single-donor creation does ([NewPersonCard.vue:427](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L427)).
Passing `donationCount` straight through would create one donation too many per row. The
bidirectional rule guarantees `donationCount > 0` iff a `lastDonation` date is present.
Identical `- 1` mapping for `plateletDonationCount` → `extraPlateletDonationCount`
([NewPersonCard.vue:430](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L430)).

### 2.7 Hall permission is left to the server

Unlike single-donor creation (which blocks a non–super-admin from creating in another
hall, [NewPersonCard.vue:179-182](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L179-L182)),
the uploader performs **no** per-hall permission check. Any row whose hall is an accepted
name passes client validation and is sent to `POST /donors`; a server permission rejection
routes that row to Table 3 through the normal non-`201` path with the server's message inline.

### 2.8 Date format — strict `<day> <Month> <year>`, real dates only

Accepted **only** when it matches
`^\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$`
— 1–2 day digits, exactly one space, the full English month name with initial capital and
rest lowercase (`September`, never `september`/`SEPTEMBER`/`Sept`), exactly one space, a
4-digit year. **Format rule, always enforced client-side.** Everything else is a row error:
other separators/formats (`2010-09-23`, `23/09/2010`, `23-Sep-2010`, `Sep 23 2010`),
extra/missing spaces, lower-cased/abbreviated month, and — critically — a **well-formed but
impossible date** (`31 February 2024`, `31 September 2010`). After the regex passes, the day
is range-checked against the actual month length in that year (leap years included), so
`29 February 2024` is accepted but `29 February 2023` is a row error. No silent roll-over.

### 2.9 Date → epoch conversion

Once validated, reformat `<day> <Month> <year>` to `YYYY-MM-DD` (zero-padded) and convert
with `new Date('YYYY-MM-DD').getTime()` — the *same* call single-donor creation makes
([NewPersonCard.vue:400-411](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L400-L411)).
The ISO form parses to **UTC midnight**, so stored timestamps match single-donor
byte-for-byte. Do **not** pass the human-readable string to `new Date()` directly
(`new Date('23 September 2010')` parses to *local* midnight and drifts by the timezone
offset). Blank date sends `0`. No timezone adjustment.

### 2.10 File-level, structural, and row-shape failures (ordering matters)

1. **File-level failures come first.** If the file can't be parsed at all — papaparse
   errors (bad quoting), empty file, no header row, non-CSV — the module signals a single
   whole-file failure with an **informative** message stating what failed and, when
   papaparse provides it, where (e.g. *"Could not parse CSV: unclosed quote on line 42"*,
   *"The file is empty"*, *"No header row found — the first row must be the column
   headers"*). Empty and header-only files are hard errors.
2. **Structural checks next**, before any row is validated: a **missing required column**,
   an **unrecognised column header**, or a **duplicate column header** fails the whole file
   with the same single-alert treatment and a clear message (*"Unknown column `bloodgroup_`;
   expected one of …"*, *"Duplicate column `phone`"*). Because `delimiter: ','` is forced,
   a semicolon-/tab-exported file collapses to one column and fails here (*"Unknown
   column …"*) rather than producing a pile of per-row errors.
3. **Blank rows are not skipped** (`skipEmptyLines: false`): an all-blank row fails the
   required-field checks like any other invalid row and lands in Table 3, so the count
   reflects the real number of rows.
4. **Ragged rows are per-row errors, not file failures:**
   - **More cells than headers** (usually an unescaped comma in `address`/`comment`) →
     Table 3, inline *"row has more values than columns — check for an unescaped comma;
     wrap the field in double quotes."* (papaparse surfaces via `__parsed_extra` /
     `FieldMismatch`). Rest of the file parses normally.
   - **Fewer cells than headers** → Table 3, inline *"row has fewer values than columns —
     a value is missing or a field was left off."* Enforced on **cell count directly**,
     not left to required-field checks, so an under-width row whose only missing columns are
     optional is still caught.

### 2.11 Free-text trimming & comment newline stripping

Before any blank check or API call, all four free-text fields (`name`, `roomNumber`,
`address`, `comment`) are `trim()`-ed, so a whitespace-only cell counts as **blank** —
`name` then fails required; `roomNumber`/`address`/`comment` auto-fill to `(Unknown)`.
Additionally, embedded newlines inside a `comment` (a quoted multi-line cell) are
**stripped** — every `\r`/`\n` collapsed to a single space and re-trimmed. The three
"required but usually blank" fields carry a 2-char API minimum but the uploader auto-fills
blank with `(Unknown)` before sending ([NewPersonCard.vue:413-415](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L413-L415)),
so a blank in those three is accepted; their *headers* must still be present.

**How to verify (developer):**
- Unit-exercise the module from a Node/ts-node scratch script (no formal unit tests ship —
  this is dev spot-checking only) with hand-built CSV strings:
  - A fully-valid 3-row CSV → 3 rows, all `status` valid, empty `errors`, `normalized`
    phones are numbers, dates are UTC-midnight epoch ms, `extraDonationCount` = total − 1.
  - Confirm `new Date('2010-09-23').getTime()` equals the produced epoch for a
    `23 September 2010` cell (UTC midnight, no TZ drift) — run in a non-UTC `TZ`.
  - Case rejections: `sher-e-bangla`, `a+`, `Yes` each yield a row error, not a mapping.
  - Format rejections: `01712345678`, `+8801712345678`, `2010-09-23`, `23-Sep-2010`,
    `31 February 2024`, `29 February 2023` each a row error; `29 February 2024` passes.
  - `Attached` hall and numeric `4` hall → row errors.
  - `hall=Unknown, availableToAll=no` → row error; `hall=Unknown, availableToAll=yes` → valid.
  - Bidirectional: `donationCount=0` with a date, and `donationCount=3` with blank date,
    each a row error.
  - File-level: empty string, header-only, unclosed quote, semicolon-delimited file each
    return a single whole-file failure with an informative message.
  - Structural: missing `phone` column, extra `bloodgroup_` column, duplicate `phone`
    column each a whole-file failure.
  - Ragged: a row with an unquoted comma (too many cells) and a short row (too few) each
    land as per-row errors with the specified messages.
  - Blank row present → surfaced as a broken row (not dropped).
  - Whitespace-only `comment` → `(Unknown)`; multi-line quoted `comment` → newlines gone.

---

## Phase 3 — API wrapper for the bulk existence check

**Scope:** work-breakdown item 2b. `badhan-frontend/src/api/index.ts`.

- Add `handleGETDonorsPhoneList` wrapping `GET /donors/phone`, **batching phones 100 per
  call**, firing chunks **sequentially**, and merging the returned `donors` arrays.
- Phones passed to it must already be normalized 13-digit `8801…` strings (the route's
  validator requires 13-digit strings starting `880`).
- Follow the existing wrapper idiom. Note the sibling `handleGETDonorsDuplicate` already
  wraps the *singular* `checkDuplicate` route ([api/index.ts:195](badhan-frontend/src/api/index.ts#L195));
  the batch endpoint returns a flat `donorId` per phone and uses the `'FORBIDDEN'` sentinel
  instead of a `null` donor object.
- `handlePOSTDonors` + `POSTDonorsPayloadInterface` ([api/index.ts:277-299](badhan-frontend/src/api/index.ts#L277-L299))
  already **return the error response object instead of throwing** — exactly what the
  per-row loop needs; no change required there.

**How to verify (developer):**
- Type-check passes; the wrapper's return type is `{ donors: [{ phone, donorId }] }`.
- From a scratch component/console with a valid session, call it with 250 known phones
  (mix of existing + non-existing): observe **3 sequential** network requests (100/100/50)
  in the Network tab, none `429`, and a single merged array containing only the existing
  phones.
- Include one phone belonging to another hall the caller can't access → its entry has
  `donorId === 'FORBIDDEN'`.

---

## Phase 4 — The view: `CsvDonorCreation.vue` (three-table core + upload loop)

**Scope:** work-breakdown items 3 and 3b. New file
`badhan-frontend/src/views/CsvDonorCreation.vue`. Route `/csvDonorCreation`,
`requiresAuth: true`, `designation: 1`.

Three phases in one view, driven by **three stacked tables**, all present on screen at
once, each hidden while empty:
- **Table 1** — donors to be created.
- **Table 2** — donors that exist in the database.
- **Table 3** — broken rows.

Tables are **read-only** (fix a broken row by editing the CSV and re-uploading) and
**render every row with no pagination or virtualization**, accepting the slowdown on very
large files. **No upper bound on rows per file** — the sequential loop and the backend's
`donorInsertionQueue` throttle the request rate naturally. The view routes each row to a
table by its `status` (from Phase 2's module) and renders the `errors` array inline in
Table 3; the upload loop appends server-reported errors to that same array so client- and
server-side problems render identically.

### 4.1 Select

- File input (`v-file-input`). The CSV is parsed entirely in the browser; **nothing is
  sent to the server at parse time** (the Phase 5 pre-flight is a read, not a write).
- Selecting a file — **including re-selecting after a completed run** — **fully resets the
  view first**: all three tables, the pre-flight state, and any file-level alert are
  cleared, then parsing + pre-flight run from scratch. The input stays usable for another
  upload without a page reload; no leftover state.
- While parsing and the pre-flight run, the view shows **only the app's default GIF loader**
  ([LoadingMessage.vue](badhan-frontend/src/components/LoadingMessage.vue), rendering
  `assets/loading.gif`) and none of the review UI.

### 4.2 Review

- Every parsed donor is placed into one of the three tables, one row per donor, with a
  column per CSV field (name, phone, student ID, blood group, hall, room, address, comment,
  donation counts, dates, availableToAll). Tables render **only after the pre-flight
  completes** (Phase 5).
- Each row is **numbered with its original CSV line number** — the displayed number *is*
  that line number (Vuetify row-number/item slot, not an extra data column); numbers are
  **not** renumbered per table.
- A **per-table heading with a count** sits above each table (Table 1 "N donors to be
  created", Table 2 "…already exist", Table 3 "…have errors"). **These three headings are
  the only summary** — no separate overall results screen, banner, or completion toast.
- Valid new donors → Table 1; existing-phone donors → Table 2; rows failing client-side
  validation → **Table 3, never Table 1**, so "Upload All" only ever sees clean rows.

### 4.3 Upload All

- A single **"Upload All"** button starts the upload. It calls `POST /donors` for each
  Table 1 row **once at a time**, top to bottom.
- Each call updates that row's status cell live (*pending* → *uploading* → *created* /
  *duplicate* / *rejected* / *failed*), so the tables double as the progress report. A
  progress bar shows `n / total`; the button is disabled while a run is in flight.
- When Table 1 is empty (every row a duplicate or broken), the button is **disabled, not
  hidden**, with a hint *"No new donors to upload"*.
- As each call returns the row **moves out of Table 1** with an animated Vuetify row
  transition:
  - `201 created` → **Table 2** (joins pre-existing donors).
  - `409 duplicate` → **Table 2** (donor exists).
  - `400 rejected` / other failure → **Table 3**, server field messages (or *"duplicate
    phone number in <hall> hall"*) shown inline exactly like a client-side error.
- When the run finishes Table 1 is empty, Table 2 is the "these exist now" report, Table 3
  is the "still needs fixing" report.

### 4.4 Table 3 (broken rows) detail

- Every row with **at least one error** lives here and nowhere else, populated in two
  moments: **at parse time** (client-side validation failures) and **during the run**
  (`400`/other non-`201`/`409`).
- Each row shows the CSV values plus a **full-width inline error area** listing **every**
  problem for that donor — one line per bad field (e.g. *"phone: `0171234` is not a valid
  Bangladeshi number (expected 13 digits starting `8801`)"*, *"bloodGroup: `AB` is not a
  recognised blood group"*) — so a 3-problem row shows all three, not just the first. The
  offending cell is **highlighted** so the error line and its value are visually connected.
- Heading states the count (*"5 of 120 rows have errors and were not uploaded"*).
- **"Download failed rows as CSV"** exports the broken rows' **original raw cell values
  under the identical header row — no error column, no added fields** — byte-compatible
  with the uploader, editable and re-uploadable directly. Hidden while empty. (The export
  wiring itself is Phase 6.)

**How to verify (developer):**
- Route to `/csvDonorCreation` while logged in as a `designation: 1` user; a lower
  designation / logged-out user is bounced by the auth guard (guard wiring is Phase 7, but
  the route metadata is set here).
- Upload a small all-valid CSV: loader shows, then Table 1 renders N rows numbered by CSV
  line, heading "N donors to be created"; Tables 2 & 3 hidden.
- Upload a CSV mixing valid, malformed, and (later) existing rows: valid → Table 1,
  malformed → Table 3 with all inline errors + highlighted cells and correct count heading.
- Click "Upload All": rows animate out of Table 1 as each `POST` returns; statuses tick
  *uploading* → *created*; progress bar advances `n/total`; button disabled during run;
  when done Table 1 empty, Table 2 populated.
- Force a server `400` (e.g. a name too long / dept the server rejects) → that row lands in
  Table 3 mid-run with the server message inline, rendered identically to a client error.
- Re-select a file after a finished run → everything resets and re-runs from scratch.
- With Table 1 empty, "Upload All" is disabled with the *"No new donors to upload"* hint.

---

## Phase 5 — Pre-flight existence check → Table 2

**Scope:** work-breakdown item 3b (Table 2 half) and §2b of plan.md. Same view; wires
Phase 3's wrapper into Phase 4's Table 2.

- Immediately after parse, fire `GET /donors/phone` **in chunks of 100 phones,
  sequentially**, and merge the returned `donors` arrays. Batching keeps each URL under
  Express/proxy length limits; the removed `commonLimiter` (Phase 1) means chunks are never
  rate-limited.
- **The entire review stays hidden until the pre-flight finishes.** During parse + check,
  show only the default loader — no tables, no "Upload All", no summary. All three tables
  appear together only once the pre-flight completes successfully. No partial/streaming
  render, no per-chunk progress bar.
- **Any chunk failure fails the whole pre-flight, no retry.** On any chunk error the loader
  is replaced by a **single `v-alert`** describing it and **nothing else renders** — no
  tables, no "Upload All", **no retry button**. The only way forward is to select the file
  again (resets + re-runs, §4.1). No fall-back to discovering duplicates via `409`.
- **Broken wins, and only valid rows are pre-flighted.** Client-side validation runs first;
  a row failing any Phase-2 rule goes straight to Table 3 and is **never** in the pre-flight.
  Only valid rows contribute a phone. So a row with *both* a validation error *and* an
  existing phone lands in Table 3 (broken), not Table 2 — broken takes precedence and its
  phone is never sent.

### 5.1 Table 2 behaviour

- Starts as the pre-flight result (one row per CSV entry whose phone was already found) and
  **grows during the run**: every successful `201` insert moves here from Table 1, as does
  any `409 duplicate`.
- Each row shows the CSV values plus a status column distinguishing *already existed* from
  *just created*. Nothing here is uploaded.
- Heading states the count (e.g. *"7 of 120 donors already exist and will be skipped"*
  before the run, updating to include newly-created ones after). Hidden only while empty.
- A phone listed twice in the **same CSV** is not special-cased at parse time: both pass
  pre-flight, the first inserts `201` → Table 2, any later copy returns `409` mid-run →
  Table 2 as duplicate. The server is the authority on intra-file collisions.

### 5.2 Permission-dependent "See Donor" button

`GET /donors/phone` encodes the caller's permission in `donorId`
([donorInterface.ts:685-701](badhan-backend/src/db/interfaces/donorInterface.ts#L685-L701)):
- **Real `donorId`** (super admin, or same hall, or donor's hall > 6, or `availableToAll`)
  → render a **"See Donor"** button in that row.
- **`'FORBIDDEN'`** → render **no button**, show *"Exists in another hall — you do not have
  permission to view this donor."*

For **just-created rows**, `donorId` comes from the `POST /donors` `201` response
(`newDonor`), and the caller can always view a donor they just created, so those rows
always get a working button. Duplicate (`409`) rows get the button only when the `409`
carries a real `donorId`; otherwise no button and no other follow-up (no "add donation to
existing donor").

The button reuses the single-donor mechanism: `createNewPopUpWindow`
([mixins/helpers.ts:58](badhan-frontend/src/mixins/helpers.ts#L58)) with
`getFrontendBaseURL() + '#/home/details?id=' + donorId`, opening the profile in a 600×600
popup, per row — matching the "See Duplicate" behaviour users know from single-donor
creation ([NewPersonCard.vue:439-441](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L439-L441)).

**How to verify (developer):**
- Upload a CSV containing a phone already in the DB (create one via single-donor first, or
  use a seeded donor): after the loader, Table 2 shows that row pre-run with the correct
  count heading; Table 1 excludes it.
- Confirm exactly `ceil(validPhones/100)` sequential `GET /donors/phone` requests fire and
  the review UI stays hidden (loader only) until they all resolve.
- Simulate a chunk failure (block the endpoint / return 500 via devtools): loader replaced
  by a single alert, no tables, no retry button; re-selecting the file recovers.
- A donor in the caller's hall → "See Donor" opens the 600×600 profile popup; a donor in a
  forbidden hall (`donorId==='FORBIDDEN'`) → no button + the permission message.
- During a run, a `201` row moves into Table 2 marked *just created* with a working button;
  a duplicate phone appearing twice in-file behaves as specified (`201` then `409`).
- A row with both a bad field and an existing phone lands in Table 3, not Table 2.

---

## Phase 6 — Upload loop semantics, cancel, and CSV exports

**Scope:** §3 (upload loop), the demo-CSV + failed-rows exports (work-breakdown items 7),
and the help panel (item 7b). Same view + `donorCsv.ts`.

### 6.1 Upload loop (formalizes §4.3)

- Triggered **only** by the explicit "Upload All" click — parsing/previewing never writes.
- **Strictly sequential**: a `for` loop that `await`s each `handlePOSTDonors` before the
  next. Not `Promise.all` — the `donorInsertionQueue` serializes anyway, and sequential
  keeps per-row status honest and the server unstressed.
- Every outcome recorded by HTTP status (`201` created, `409` duplicate, `400` rejected
  with validator field messages, anything else failed) and written back onto the row.
- **No automatic abort and no automatic retry.** The loop pushes through the whole file;
  each failure lands in Table 3. Retrying is done by fixing the CSV and re-uploading.
- **Cancel button** that stops before the next request (the in-flight one completes); rows
  not yet reached stay *pending*. **No resume**: after Cancel, "Upload All" stays
  **disabled** — the run cannot be restarted/continued in place. To upload the rest, select
  a file again (fresh selection fully resets + re-runs, §4.1). Rows already routed by the
  cancellation point keep their outcome until that reset.

### 6.2 Demo CSV download button

- A **"Download demo CSV"** button next to the file input saves, **with no network call**,
  a sample built from a constant in `src/utils/donorCsv.ts` and written with the existing
  `file-saver` dependency.
- Contains the header row plus **three example donors** exercising every column — one
  fully-populated, one with `hall=Unknown`, one with all optional fields blank:
  ```csv
  name,phone,studentId,bloodGroup,hall,roomNumber,address,comment,donationCount,lastDonation,plateletDonationCount,lastPlateletDonation,availableToAll
  Demo Donor One,8801712345678,1605011,A+,Sher-e-Bangla,304,"Dhanmondi, Dhaka",Sample row - delete before uploading,3,20 November 2024,1,14 February 2025,no
  Demo Donor Two,8801898765432,1805062,O-,Unknown,N/A,Chattogram,Hall unknown - becomes available to all,0,,0,,yes
  Demo Donor Three,8801911223344,2000011,B+,Titumir,112,Mirpur,No donation history,0,,0,,no
  ```
- Every value is in the single accepted form and canonical case (13-digit phones,
  exactly-cased hall names, lowercase `yes`/`no`, `<day> <Month> <year>` dates, explicit
  `0` counts) — so it doubles as the worked example and copying from it can never produce a
  case/format rejection. Deliberately tiny; `comment` fields say it's sample data so an
  unedited upload creates obvious throwaway records. Three valid rows only — no broken row,
  no header-only template.

### 6.3 Failed-rows CSV export (formalizes §4.4's export)

- **"Download failed rows as CSV"** exports Table 3's **original raw cell values under the
  identical header row — no error column, no added fields** — byte-compatible with the
  uploader, editable and re-uploadable directly. Reuses `file-saver`.

### 6.4 Collapsible "CSV format" help panel

- The view carries a collapsible **"CSV format"** help panel rendering the column table
  (§2.4), alongside the existing `HelpTooltip` idiom used by
  [SingleDonorCreation.vue](badhan-frontend/src/views/SingleDonorCreation.vue). **Expanded
  by default until a file has been selected.**

**How to verify (developer):**
- "Download demo CSV" saves the exact three-row file with no network request; re-uploading
  it unedited yields 3 valid Table-1 rows (all pass, proving the demo matches the rules).
- Start an upload of a larger file, click **Cancel** mid-run: the in-flight row completes,
  later rows stay *pending*, "Upload All" is now disabled; re-selecting a file resets and
  re-enables.
- After a run with failures, "Download failed rows as CSV" produces a file with the
  identical header, only the broken rows, raw values, **no error column**; re-uploading it
  round-trips (the same rows reappear as broken until fixed).
- Confirm the loop is sequential in the Network tab (one `POST /donors` outstanding at a
  time, not parallel).
- Help panel is expanded on entry, collapses after a file is selected, and renders the full
  column table.

---

## Phase 7 — Routing, nav entry points, and removal of Advanced Donor Creation

**Scope:** work-breakdown items 4, 5, 6.

### 7.1 Register the route

- Add `/csvDonorCreation` in [router/index.ts](badhan-frontend/src/router/index.ts) with
  `requiresAuth: true`, `designation: 1`.

### 7.2 Add entry points

- Nav sub-link `csvDonorCreationId` in [AppBar.vue](badhan-frontend/src/components/AppShell/AppBar.vue)
  and a button on [SingleDonorCreation.vue](badhan-frontend/src/views/SingleDonorCreation.vue),
  both pointing at `/csvDonorCreation`, both with display text **"Upload CSV of Donors"**.

### 7.3 Delete Advanced Donor Creation

| Change | Location |
|---|---|
| Delete the view | [DonorCreation.vue](badhan-frontend/src/views/DonorCreation.vue) |
| Delete the `/donorCreation` route (`name: 'Donor Creation'`) | [router/index.ts:197-207](badhan-frontend/src/router/index.ts#L197-L207) |
| Delete the `donorCreationId` "Advanced Donor Creation" sub-link | [AppBar.vue:134-140](badhan-frontend/src/components/AppShell/AppBar.vue#L134-L140) |
| Delete the "Advanced donor creation" button linking to `/donorCreation` | [SingleDonorCreation.vue](badhan-frontend/src/views/SingleDonorCreation.vue) |
| Drop `getDataInputAPIBaseURL` and its interface member | [mixins/environment.ts:34,59](badhan-frontend/src/mixins/environment.ts#L59) |
| Drop `VUE_APP_DATAINPUT_URL` | `badhan-frontend/.env.local`, `.env.development`, `.env.production` |

The new `/csvDonorCreation` links replace each deleted link (nav sub-link + single-donor
button), both labelled **"Upload CSV of Donors"**.

### 7.4 Must NOT be removed (verified — separate features sharing the redirection-token machinery)

- `POST /users/redirection` and `PATCH /users/redirection`
  ([UsersController.ts:186-308](badhan-backend/src/tsoaControllers/UsersController.ts#L186-L308))
  — still used by "Go to web" ([AppBar.vue:267](badhan-frontend/src/components/AppShell/AppBar.vue#L267))
  and "Download in mobile" ([Home.vue:432](badhan-frontend/src/views/Home.vue#L432)).
- `handlePOSTRedirection` ([api/index.ts:235](badhan-frontend/src/api/index.ts#L235)) and
  the `requestRedirectionToken` store action — same reason. Only `DonorCreation.vue`'s
  direct import of it goes away.
- [Redirection.vue](badhan-frontend/src/views/Redirection.vue) and the `RedirectionPage` route.
- The `donorCreationNavigationId` **parent** nav item — it points at `/singleDonorCreation`,
  not the deleted page, and the Cypress page object
  [NavigationDrawer.ts:10](badhan-frontend-test/cypress/support/pages/NavigationDrawer.ts#L10)
  clicks it.

The external data-input site is **left untouched**: the Netlify site and
`badhan-automated-form/` stay in the repo (to be taken down separately by the user). Only
the in-app link and `getDataInputAPIBaseURL` / `VUE_APP_DATAINPUT_URL` are removed.

**How to verify (developer):**
- Nav drawer shows "Upload CSV of Donors" under the donor-creation parent and **no**
  "Advanced Donor Creation"; the single-donor page's "Advanced donor creation" button is
  gone and replaced by "Upload CSV of Donors".
- Navigating to `/donorCreation` no longer resolves; `/csvDonorCreation` does.
- `grep -r VUE_APP_DATAINPUT_URL badhan-frontend` and `grep -r getDataInputAPIBaseURL
  badhan-frontend` return nothing.
- "Go to web" and "Download in mobile" still work (redirection machinery intact); the
  `RedirectionPage` route still resolves.
- `DonorCreation.vue` file is deleted; app builds with no dangling import.
- Regression-click the `donorCreationNavigationId` parent nav item — still present and
  working.

---

## Phase 8 — Cypress end-to-end test

**Scope:** work-breakdown items 8, 8b, 9. This is the **only** test coverage for the
feature — no unit tests for the parse/normalize module and no `badhan-backend-test` changes.
New spec `badhan-frontend-test/cypress/e2e/donors/csv-upload.cy.ts`, following the existing
Page Object convention (`@pages`/`@components`/`@support` aliases, as in
[create-single.cy.ts](badhan-frontend-test/cypress/e2e/donors/create-single.cy.ts)).

`cy.selectFile()` is built into Cypress (since 9.3; project is on `^15.1.0`), so **no
`cypress-file-upload` plugin** is needed. There is no `cypress/fixtures/` directory; the
inline-buffer approach means none is created.

### 8.1 Required test-side additions

| Addition | File |
|---|---|
| `goToCsvDonorCreation()` (clicks `donorCreationNavigationId` → `csvDonorCreationId`) | `cypress/support/pages/NavigationDrawer.ts` |
| `CsvDonorCreationPage` page object (file input, Upload All, row/status selectors, error rows, existing-donors table) | `cypress/support/pages/CsvDonorCreationPage.ts` (new) |
| Random-donor + CSV-string generator | `cypress/support/helpers/donorCsvGenerator.ts` (new) |
| `data-cy` on the view's file input, Upload All button, table rows, status cells, error rows, See Donor buttons | `CsvDonorCreation.vue` |

(The `data-cy` hooks must be added to the view — coordinate back into Phase 4/5 markup:
`csvFileInputId`, `csvUploadAllButtonId`, plus row/status/error/See-Donor selectors.)

### 8.2 Main test flow

1. Sign in with `AUTH_CREDENTIALS`, assert the sign-in notification (matching existing specs).
2. Navigate via the drawer (`NavigationDrawer.goToCsvDonorCreation()`).
3. **Generate random donors in the test** — a helper builds N (default 5) donors with
   randomized name, phone, studentId, blood group and hall, then serializes to a CSV
   string. Every donor satisfies the Phase-2 rules: phone `016`/`017`/`018` + 8 random
   digits, a studentId whose dept code is from the allowed list and batch year ≤ current
   year, non-empty `roomNumber`/`address`/`comment`. **Hall is pinned to the authenticated
   tester's own hall** (not random) so every donor is viewable by the tester — this makes
   the "See Donor" assertion deterministic. `Attached` never used. Phones suffixed from
   `Date.now()` (as `create-single.cy.ts` does) so reruns never collide.
4. **Attach without touching disk** — pass the generated string to `cy.selectFile()` via
   `Cypress.Buffer.from(...)`:
   ```ts
   cy.get('[data-cy=csvFileInputId] input[type=file]')
     .selectFile({
       contents: Cypress.Buffer.from(csvString),
       fileName: 'donors.csv',
       mimeType: 'text/csv'
     }, { force: true });
   ```
   `force: true` is required because Vuetify's `v-file-input` keeps the real
   `<input type=file>` visually hidden.
5. Assert the review table rendered N rows and none carries an inline error row.
6. Click "Upload All" (`[data-cy=csvUploadAllButtonId]`).
7. Wait for the run to finish; assert every row reached *created* and the summary reports
   N created / 0 failed.
8. Verify the donors really exist — search one generated phone on the home page (reusing
   `HomePage`), or assert against the `POST /donors` responses via `cy.intercept`.

No explicit cleanup: the `before:spec` hook purges + repopulates the local DB before every
spec ([cypress.config.ts:103-113](badhan-frontend-test/cypress.config.ts#L103-L113) —
`POST /purge-local-db` then `POST /populate-local-db`), so generated donors never
accumulate, and the `Date.now()` suffix guarantees no collision within a run.

### 8.3 Additional cases in the same spec

- **Malformed rows** — a CSV with a bad phone and an unknown blood group; assert each
  offending row lands in Table 3 with its inline errors and that "Upload All" never uploads
  them.
- **Already-existing donors** — upload a CSV containing a donor created earlier in the same
  spec; assert it lands in the "exists in the database" table (not the upload table) and
  that a "See Donor" button is present. Because the generator pins every donor to the
  tester's own hall, the caller is always permitted to view it, so the button renders.

The **demo-CSV download** case is deliberately excluded — flakiest part of the suite, not
worth the maintenance.

### 8.4 Cypress cleanup (item 9)

- Remove any assertion on the deleted nav sub-link.

**How to verify (developer):** (in-container — see "Running commands — Docker only")
- `docker compose --profile test run --build --rm frontend-test npx cypress run --spec
  cypress/e2e/donors/csv-upload.cy.ts` passes: the main flow, the malformed-rows case, and
  the already-existing case all green.
- Removing a `data-cy` hook makes the spec fail (confirms selectors are real).
- The full suite passes — `docker compose --profile test run --build --rm frontend-test` —
  no other spec references the removed nav sub-link.

---

## Cross-phase completion checklist

- [ ] `POST /donors` and its middleware chain are byte-for-byte unchanged; only
      `GET /donors/phone` lost `commonLimiter` (Phase 1).
- [ ] Stored donation timestamps from a CSV upload match single-donor creation exactly
      (UTC-midnight epoch, `extraDonationCount = total − 1`).
- [ ] Every strict-input rule in Phase 2 rejects as specified — no silent coercion.
- [ ] The three-table review, live per-row routing, permission-aware "See Donor", cancel
      (no resume), and both CSV exports all behave per Phases 4–6.
- [ ] Advanced Donor Creation is fully removed; redirection-token features and the parent
      nav item survive (Phase 7).
- [ ] The Cypress spec is the sole automated coverage and passes (Phase 8).
