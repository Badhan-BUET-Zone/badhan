# Plan: CSV bulk donor upload (frontend-driven, one-by-one via existing API)

## Goal

Let a logged-in member upload a CSV file in the Badhan frontend and have every row
created as a donor by calling the **existing** `POST /donors` endpoint once per row.
No new backend endpoint — the frontend drives the loop, so authentication,
validation, duplicate detection and the donor-insertion queue all stay exactly as
they are today. The single backend change is unrelated to the loop: the
`GET /donors/phone` pre-flight route loses its rate limiter so the chunked existence
check can run freely (see §2b).

## Current state (investigated)

### Backend — `POST /donors`

[DonorsController.ts:90-262](badhan-backend/src/tsoaControllers/DonorsController.ts#L90-L262)

- Middleware chain: `donorValidator.validatePOSTDonors` → `queue.donorInsertionQueue`
  → `authenticator.handleAuthentication`. Note there is **no rate limiter** on this
  route (unlike most others, which use `rateLimiter.commonLimiter`), and requests are
  serialized by `queue.donorInsertionQueue`.
- Body fields: `phone`, `studentId`, `bloodGroup`, `hall`, `address`, `roomNumber`,
  `name`, `comment`, `availableToAll`, `extraDonationCount`, plus optional
  `lastDonation`, `lastPlateletDonation`, `extraPlateletDonationCount`.
- Validation rules of note ([validateBody.ts](badhan-backend/src/validations/validateRequest/validateBody.ts)):
  - `phone` — 13 digits, integer in `[8801000000000, 8801999999999]`
  - `bloodGroup` — integer `0..7`
  - `hall` — integer; `8` = unknown, and the controller forces `availableToAll = true` for hall 8
- Responses: `201` success (`newDonor`), `409` duplicate phone (message names the
  hall; includes `donorId` only when the caller is permitted to see that donor),
  `500` on insertion failure, `400` from the validator on bad fields.
- Duplicates are detected by phone only.

### Backend — existence-check routes (searched; two exist)

Both are authenticated and return `200` whether or not the donor exists — existence is
in the payload, not the status code.

**1. `GET /donors/checkDuplicate?phone=<13-digit>` — single phone**
[DonorsController.ts:876-931](badhan-backend/src/tsoaControllers/DonorsController.ts#L876-L931)

- Returns `{ found: boolean, donor: IDonor | null, message }`.
- Visibility rule: the full donor object comes back only if the caller is a super
  admin (`designation === 3`), or the donor is in the caller's hall, or the donor's
  hall is `> 6`, or the donor is `availableToAll`. Otherwise `found: true` but
  `donor: null` and the message ends "You are not permitted to access this donor."
- The frontend already wraps it as `handleGETDonorsDuplicate`
  ([api/index.ts:195](badhan-frontend/src/api/index.ts#L195)).

**2. `GET /donors/phone?phoneList[]=<13-digit>&…` — many phones at once** ← the useful one
[DonorsController.ts:933-966](badhan-backend/src/tsoaControllers/DonorsController.ts#L933-L966)

- Returns `{ donors: [{ phone, donorId }] }` containing **only the phones that already
  exist**; anything absent from the response is a new donor.
- Same visibility rule, applied per element: for a donor the caller may not access,
  `donorId` comes back as the literal string `'FORBIDDEN'` rather than an id
  ([donorInterface.ts:657-709](badhan-backend/src/db/interfaces/donorInterface.ts#L657-L709)).
- Validation: every element must be a 13-digit string starting `880`
  ([validateQuery.ts:92](badhan-backend/src/validations/validateRequest/validateQuery.ts#L92)) — i.e. phones must
  already be normalized before the call. No documented cap on list length; the uploader
  batches into groups of 100 anyway (§2b).
- **No frontend wrapper exists yet** — one must be added to `api/index.ts`.
- **Its `rateLimiter.commonLimiter` middleware is removed** as part of this plan so the
  chunked pre-flight calls are never rate-limited (§2b, and the backend note under the
  work breakdown).

Note: an earlier draft of this plan called the bulk route `checkDuplicateMany`. That
endpoint does not exist; the correct path is `GET /donors/phone`.

### Frontend

- API wrapper `handlePOSTDonors` + `POSTDonorsPayloadInterface`
  ([api/index.ts:277-299](badhan-frontend/src/api/index.ts#L277-L299)) — already
  returns the error response object instead of throwing, which is exactly what a
  per-row loop needs.
- [SingleDonorCreation.vue](badhan-frontend/src/views/SingleDonorCreation.vue) — the
  one-donor form (route `/singleDonorCreation`, `designation: 1`).
- [DonorCreation.vue](badhan-frontend/src/views/DonorCreation.vue) — "Advanced Donor
  Creation" (route `/donorCreation`, `designation: 1`). Today it uploads nothing
  itself: it calls `handlePOSTRedirection()` and opens the external
  `badhan-datainput` Netlify site with a token. **This page is being deleted
  outright** — see "Removal of Advanced Donor Creation" below.
- No CSV parsing dependency is currently installed in `badhan-frontend`.

## Proposed design

### 0. UI conventions (applies to every new view/component)

Build the UI out of **Vuetify components and their built-in props** — layout, spacing,
colours, elevation, tables (`v-data-table`), file input (`v-file-input`), buttons,
progress bars, alerts and the expansion panel for the help section all come from
Vuetify. Use Vuetify's **animations/transitions** (e.g. `v-expand-transition`,
`v-fade-transition`, the `v-progress-linear` indeterminate/animated states, row and
status-change transitions) so state changes — parsing, per-row status updates, showing
the "already exists" table — are animated rather than snapping into place.

Write **minimal to no custom CSS.** Prefer Vuetify utility classes (`ma-*`, `pa-*`,
`d-flex`, `text-*`, colour classes) and component props over hand-written styles. A
`<style>` block should be the last resort, only for something Vuetify genuinely cannot
express, and kept as small as possible.

### 1. CSV format

A UTF-8 CSV with a **header row**. Column order does not matter — columns are matched
by header name (case-insensitive, trimmed).

```
name,phone,studentId,bloodGroup,hall,roomNumber,address,comment,donationCount,lastDonation,plateletDonationCount,lastPlateletDonation,availableToAll
```

#### Validation is strict — exactly one accepted form per field

**The parser accepts one spelling of each value and rejects everything else.** No
alternative formats, no coercion, no "helpful" guessing. A value that is not exactly
what the table below specifies produces an inline error on that row rather than being
silently converted. Rationale: a bulk uploader that guesses is a bulk uploader that
creates hundreds of subtly wrong donor records, and the person who wrote the CSV is
the only one who can say what a malformed value was meant to be.

Concretely, this rejects rather than accepts:

- `hall` — **hall names only.** Numeric codes (`0`–`8`) are rejected, even though that
  is what the API takes. `4` is not a hall; `Sher-e-Bangla` is.
- `phone` — **13 digits, `8801XXXXXXXXX`, only.** The local `01XXXXXXXXX` form is
  rejected, as are spaces, dashes, `+` prefixes and a leading `+880`.
- `bloodGroup` — **labels only** (`A+`, `O-`, …). The raw codes `0`–`7` are rejected.
- `availableToAll` — **`yes` or `no` only.** `true`/`false`, `1`/`0`, `Y`/`N`, and
  blank are all rejected.
- Blank is never a substitute for a value in a required column.

**Case is enforced too.** For every field with a fixed set of accepted values —
`hall`, `bloodGroup`, `availableToAll` — the value must match the canonical spelling
**exactly, including case**. `Sher-e-Bangla` is accepted; `sher-e-bangla`,
`SHER-E-BANGLA` and `Sher-E-Bangla` are each rejected with an inline error. Likewise
`A+` but not `a+`, and `yes`/`no` but not `Yes`, `YES` or `NO`. The canonical forms are
exactly those printed in the column table below and in the demo CSV, so a user who
starts from the demo file or the help panel is always correct.

The only normalization applied before matching is `trim()` of surrounding whitespace
(so a trailing space from a spreadsheet export is not a hard error); the value is not
lower-cased, upper-cased, or otherwise altered. Free-text fields (`name`, `roomNumber`,
`address`, `comment`) have no canonical form and so no case rule.

#### Column specification

Two kinds of rule apply per column, and they are enforced differently:

- **Format / representation rules** (how a value must be *spelled* in the CSV so it can
  be parsed and mapped) are **always enforced client-side** — the 13-digit `8801…`
  phone, hall names, blood-group labels, `yes`/`no`, `23 September 2010` dates. These are what
  make the strict-input section above meaningful and have no single-donor analogue
  because the single-donor form uses dropdowns/pickers instead of free text.
- **Value-range validations** are enforced client-side **only where single-donor
  creation already validates them in the browser** (`NewPersonCard.vue`'s `validations`
  block). Anything the single-donor form leaves to the server, the uploader also leaves
  to the server: such a row still passes client validation, is sent to `POST /donors`,
  and routes to Table 3 on a non-`201` response with the server's message inline. So,
  concretely, the parser does **not** enforce `name` 3–100 length, the exact backend
  department list, or a `studentId` batch-year range, because single-donor creation does
  not — it enforces `name` `required`, `studentId` = 7 numeric digits + `substr(2,2) ≤
  departments.length`, the bidirectional count/date checks, etc., exactly as that form
  does. The column table below reflects this split; where a cell documents a backend
  rule the client does not check, it says so.

| Column | Required | Accepted in CSV — nothing else | Sent to API | Rules |
|---|---|---|---|---|
| `name` | **yes** | text | `name` | client checks **non-blank only** (single-donor validates `name` as `required` and nothing more); the backend's 3–100-character rule is left to the server, and an out-of-range name routes to Table 3 on rejection |
| `phone` | **yes** | exactly 13 digits, `8801XXXXXXXXX` | `phone` (number) | must fall in `8801000000000`–`8801999999999`. `01XXXXXXXXX`, `+8801…`, and any value containing spaces, dashes or punctuation are **rejected** |
| `studentId` | **yes** | exactly 7 digits, e.g. `1605011` | `studentId` | **only the checks single-donor creation runs client-side**: 7 numeric digits and department code `substr(2,2)` ≤ `departments.length` ([NewPersonCard.vue:171-175](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L171-L175)). **No batch-year check**, and no validation against the exact backend department list `[0,1,2,4,5,6,8,10,11,12,15,16,17,18]` — the server is the authority on those, and any row the server rejects routes to Table 3. Use `00` for an unknown department |
| `bloodGroup` | **yes** | one of `A+ A- B+ B- O+ O- AB+ AB-` | `bloodGroup` (int) | mapped via `bloodGroups` = `['A+','A-','B+','B-','O+','O-','AB+','AB-']`. Numeric codes **rejected** |
| `hall` | **yes** | one of `Ahsanullah`, `Chatri`, `Nazrul`, `Rashid`, `Sher-e-Bangla`, `Suhrawardy`, `Titumir`, `Unknown` | `hall` (int) | mapped to `0,1,2,3,4,5,6,8` respectively. Numeric codes **rejected**. **`Attached` is rejected** — the API's donor-creation validator allows only `[0,1,2,3,4,5,6,8]`, and the create/edit dropdowns already omit it; `Attached` is a clear row error, never silently mapped to `Unknown`. `Unknown` forces `availableToAll = true` server-side |
| `roomNumber` | no | text | `roomNumber` | 2–500 characters; **blank is auto-filled with `(Unknown)`**, matching single-donor creation |
| `address` | no | text | `address` | 2–500 characters; **blank auto-filled with `(Unknown)`** |
| `comment` | no | text | `comment` | 2–500 characters; **blank auto-filled with `(Unknown)`** |
| `donationCount` | **yes** | integer `0`–`99` | `extraDonationCount` = `donationCount - 1` (or `0`) | the CSV value is the donor's **total** blood-donation count. Range `0`–`99` matches single-donor creation's 2-digit cap ([NewPersonCard.vue:184-194](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L184-L194)). Send `donationCount - 1` when it is `> 0` and `0` when it is `0`, exactly matching single-donor creation (see the "Count → `extraDonationCount`" rule below). Blank rejected — write `0` |
| `lastDonation` | conditional | `23 September 2010` (`<day> <Month> <year>`) | `lastDonation` (epoch ms) | must be blank when `donationCount` is `0`, and present when it is `> 0`. **The only accepted date form** is day-of-month, a single space, the full month name with an initial capital (`January`…`December`), a single space, then the 4-digit year — e.g. `23 September 2010`. No other format, and no impossible date, is accepted (see the date rules below). Future dates are **allowed** (matching single-donor creation, which does not reject them) |
| `plateletDonationCount` | **yes** | integer `0`–`99` | `extraPlateletDonationCount` = `plateletDonationCount - 1` (or `0`) | total platelet-donation count; range `0`–`99` (single-donor 2-digit cap); same `- 1` mapping as `donationCount`. Blank rejected — write `0` |
| `lastPlateletDonation` | conditional | `23 September 2010` (`<day> <Month> <year>`) | `lastPlateletDonation` (epoch ms) | same rule and same accepted date form as `lastDonation`, against `plateletDonationCount` |
| `availableToAll` | **yes** | `yes` or `no` | `availableToAll` (bool) | `true`/`false`/`1`/`0`/blank **rejected**. **A row with `hall=Unknown` and `availableToAll=no` is a row error** (→ Table 3), *not* silently overridden — single-donor creation makes that combination impossible by force-setting and disabling the checkbox for the Unknown hall ([NewPersonCard.vue:80](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L80), [296-300](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L296-L300)), so with `hall=Unknown` the value must be `yes` |

The `lastDonation`/`donationCount` rule is **bidirectional**, matching single-donor
creation ([NewPersonCard.vue:274-284](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L274-L284)):
the date must be present when the count is `> 0`, **and** the count must be non-zero
when a date is present — otherwise a row error. The same pair of checks applies to
`lastPlateletDonation` / `plateletDonationCount`.

**Count → `extraDonationCount` (must be decremented by one).** The CSV `donationCount`
is the donor's **total** number of donations, matching the single-donor UI field, but the
API's `extraDonationCount` is the number of donations *in addition to* the one implied by
`lastDonation`. So the uploader must send

```
extraDonationCount = donationCount === 0 ? 0 : donationCount - 1
```

exactly as single-donor creation does on save
([NewPersonCard.vue:427](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L427):
`extraDonationCount: lastDonation === 0 ? 0 : this.donationCount - 1`). Passing
`donationCount` straight through would create one donation too many on every row. The
bidirectional rule above guarantees `donationCount > 0` iff a `lastDonation` date is
present, so the two forms are equivalent. The identical `- 1` mapping applies to
`plateletDonationCount` → `extraPlateletDonationCount`
([NewPersonCard.vue:430](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L430)).

**Hall creation permission is left to the server — not checked client-side.** Unlike
single-donor creation, which blocks a non–super-admin from creating a donor in a hall
other than their own
([NewPersonCard.vue:179-182](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L179-L182)),
the uploader performs **no** per-hall permission check. Any row whose hall is one of the
accepted names passes client-side validation and is sent to `POST /donors`; if the server
rejects it for permission reasons, that row routes to Table 3 (broken rows, §2c) through
the normal non-`201` failure path, with the server's message shown inline. The server is
the sole authority on who may create donors in which hall.

**Date format — strict `<day> <Month> <year>`, real dates only.** A date cell is
accepted **only** when it matches `^\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$`
— day-of-month digits (1–2, no other padding rules imposed), exactly one space, the
full English month name with its **initial letter capitalised and the rest lowercase**
(`September`, never `september`, `SEPTEMBER` or `Sept`), exactly one space, and a
4-digit year, e.g. `23 September 2010`. This is a **format rule, always enforced
client-side.** Everything else is a row error, including: any other separator or
format (`2010-09-23`, `23/09/2010`, `23-Sep-2010`, `Sep 23 2010`), extra or missing
spaces, a lower-cased or abbreviated month, and — critically — a **well-formed but
impossible date** (`31 February 2024`, `31 September 2010`). After the regex passes,
the day is range-checked against the actual length of that month in that year
(leap years included), so `29 February 2024` is accepted but `29 February 2023` is a
row error. There is no silent roll-over.

**Date → epoch conversion.** Once validated, the `<day> <Month> <year>` value is
**reformatted to `YYYY-MM-DD`** (zero-padded) and converted with
`new Date('YYYY-MM-DD').getTime()` — deliberately the *same* call single-donor creation
makes on save
([NewPersonCard.vue:400-411](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L400-L411)),
where the `DatePicker` emits a `YYYY-MM-DD` string. Because that ISO form parses to
**UTC midnight**, stored donation timestamps match the single-donor path byte-for-byte.
Note: the human-readable string is *not* passed to `new Date()` directly (`new
Date('23 September 2010')` would parse to **local** midnight and drift the epoch by the
timezone offset); it is normalised to `YYYY-MM-DD` first, then parsed. A blank date
sends `0`, again matching single-donor creation. No timezone adjustment is applied.

**The delimiter is forced to comma.** papaparse is configured with `delimiter: ','`
rather than left to auto-detect, so a semicolon- or tab-exported file is **not**
silently re-interpreted. Such a file collapses to a single column, fails the structural
header check below, and produces a clear whole-file alert ("Unknown column …") instead
of a confusing pile of per-row errors. Comma is the only accepted delimiter.

**File-level failures come before rows or columns.** If the file cannot be parsed
at all — papaparse errors (bad quoting), an empty file, a file with no
header row, or a non-CSV file — the view renders **only one Vuetify `v-alert` at the top
of the page and nothing else** (no tables, no "Upload All"). The alert message must be
**informative**: it states exactly what failed and, when papaparse provides it, where —
e.g. *"Could not parse CSV: unclosed quote on line 42"*, *"The file is empty"*, *"No
header row found — the first row must be the column headers"* — so the user can fix the
file from the message alone. Empty and header-only files are hard errors.

Structural checks run next, before any row is validated: a **missing required column**,
an **unrecognised column header**, or a **duplicate column header** (the same header
appearing twice) fails the whole file with the same single-alert treatment and a clear
message ("Unknown column `bloodgroup_`; expected one of …", or "Duplicate column
`phone`"), rather than being ignored — an unexpected or repeated header usually means a
mis-saved or wrong file, and silently dropping (or arbitrarily picking) it would upload
donors with fields quietly missing or ambiguous.

**Blank rows are not skipped.** papaparse runs with `skipEmptyLines: false`, so a
completely empty row (all cells blank) — a common artefact of spreadsheet exports and
stray trailing newlines — is **not** silently dropped. It fails the required-field
checks like any other invalid row and lands in Table 3 (§2c) as a broken row, so the
user sees exactly how many rows the file really contained.

**Ragged rows are a per-row error, not a file failure.** A data row with **more cells
than there are headers** — almost always an unescaped comma inside an unquoted
`address` or `comment` — is distinct from the header-level structural failures above:
it does not abort the whole file. papaparse surfaces the extra cells (via
`__parsed_extra` / a `FieldMismatch` error on that row), and the uploader routes that
single row to Table 3 (§2c) with an inline error such as *"row has more values than
columns — check for an unescaped comma; wrap the field in double quotes."* The rest of
the file parses and validates normally.

A row with **fewer** cells than there are headers is **likewise a per-row error**,
symmetrically with the extra-cell case — it is routed to Table 3 with an inline error
such as *"row has fewer values than columns — a value is missing or a field was left
off."* This is enforced on the cell count directly, **not** left to the downstream
required-field checks: an under-width row whose only missing columns happen to be
optional (`roomNumber`/`address`/`comment`) would otherwise pad to blank and pass
validation, silently uploading a truncated line — almost always a mistake. Counting
cells catches it regardless of which columns are short.

**Free-text values are trimmed; newlines in `comment` are stripped.** Before any blank
check or API call, all four free-text fields (`name`, `roomNumber`, `address`,
`comment`) are `trim()`-ed of surrounding whitespace, so a whitespace-only cell counts
as **blank** — `name` then fails its required check, and `roomNumber`/`address`/`comment`
auto-fill to `(Unknown)` (below). Additionally, any embedded newlines inside a `comment`
value (a quoted multi-line cell that papaparse preserves as a single field) are
**stripped** — every `\r`/`\n` collapsed to a single space and re-trimmed — so a
comment never carries line breaks into the donor record.

The three "required but usually blank" fields — `roomNumber`, `address`, `comment` —
carry a 2-character minimum in the current API, but the uploader **auto-fills a blank
value with `(Unknown)`** before sending, exactly as single-donor creation does
([NewPersonCard.vue:413-415](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L413-L415)).
So a blank in these three columns is accepted, not a row error. Their column
*headers* must still be present — a missing column is still a structural whole-file
failure; only the per-row value may be blank.

#### On-screen documentation

The view carries a collapsible **"CSV format"** help panel rendering the table above,
alongside the existing `HelpTooltip` idiom used by
[SingleDonorCreation.vue](badhan-frontend/src/views/SingleDonorCreation.vue). It is
expanded by default until a file has been selected.

#### Demo CSV download button

A **"Download demo CSV"** button sits next to the file input and, with no network
call, saves a small ready-to-edit sample built from a constant in
`src/utils/donorCsv.ts` and written out with the `file-saver` dependency the frontend
already has. It contains the header row plus **three example donors** that between
them exercise every column — a fully-populated donor, one with a hall of `Unknown`,
and one with all optional fields blank:

```csv
name,phone,studentId,bloodGroup,hall,roomNumber,address,comment,donationCount,lastDonation,plateletDonationCount,lastPlateletDonation,availableToAll
Demo Donor One,8801712345678,1605011,A+,Sher-e-Bangla,304,"Dhanmondi, Dhaka",Sample row - delete before uploading,3,20 November 2024,1,14 February 2025,no
Demo Donor Two,8801898765432,1805062,O-,Unknown,N/A,Chattogram,Hall unknown - becomes available to all,0,,0,,yes
Demo Donor Three,8801911223344,2000011,B+,Titumir,112,Mirpur,No donation history,0,,0,,no
```

Every value in the demo file is in the single accepted form, in its canonical case —
13-digit phones, exactly-cased hall names (`Sher-e-Bangla`, not `sher-e-bangla`),
lowercase `yes`/`no`, `<day> <Month> <year>` dates (`20 November 2024`, with the
capitalised full month name), explicit `0` counts rather than blanks — so it doubles as
the worked example of the strict rules, and copying from it can never produce a
case- or format-rejection.

The demo file is deliberately tiny and its `comment` fields say it is sample data, so
that a user who uploads it unedited creates obvious throwaway records rather than
plausible-looking fake donors. It ships as three valid rows only — no broken row and no
header-only template.

### 2. New view: `CsvDonorCreation.vue`

Route `/csvDonorCreation`, `requiresAuth: true`, `designation: 1` — bulk upload
requires only `designation: 1`, matching single-donor creation and the other creation
routes. Three phases in one view, driven by **three stacked tables** —
Table 1 (to be created, §2), Table 2 (exists in the database, §2b), Table 3 (broken
rows, §2c) — all present on screen at once, each hidden while empty. The tables are
**read-only** (to fix a broken row the user edits the CSV and re-uploads), and they
**render every row with no pagination or virtualization**, accepting the slowdown on
very large files. There is **no upper bound on rows per file**; the sequential upload
loop and the backend's `donorInsertionQueue` throttle the request rate naturally.

1. **Select** — file input. The CSV is parsed entirely in the browser; **nothing is
   sent to the server at this stage** (the §2b pre-flight existence check is a read, not a
   write). Selecting a file (including re-selecting after a completed run) **fully resets
   the view first** — all three tables, the pre-flight existence-check state and any
   file-level alert are cleared — and parsing plus the §2b pre-flight then run from scratch
   on the new file. The input stays usable for another upload without a page reload; there
   is no leftover state from a previous file. While parsing and the pre-flight run, the
   view shows only the app's default GIF loader and none of the review UI (§2b).
2. **Review** — every parsed donor is placed into one of the three tables, one row per
   donor, with a column per CSV field (name, phone, student ID, blood group, hall,
   room, address, comment, donation counts, dates, availableToAll). The tables render only
   after the pre-flight completes (§2b). Each table row is **numbered with its original CSV
   line number** — the row's displayed number *is* that line number (using the Vuetify
   row-number/item slot, not an extra data column), so a user can find any row back in
   their file; the numbers are not renumbered per table. A **per-table heading with a
   count** sits above each table (e.g. Table 1 "N donors to be created", Table 2 "…already
   exist", Table 3 "…have errors"). **These three headings are the only summary** — there
   is no separate overall results screen, banner, or completion toast (answer 5). Valid,
   new donors land in Table 1; donors whose phone already exists land in Table 2; **rows
   that fail client-side validation land in Table 3 (§2c), never in Table 1**, so "Upload
   All" only ever sees clean rows.
3. **Upload All** — a single **"Upload All"** button starts the upload. It calls
   `POST /donors` for each Table 1 row **once at a time**, walking top to bottom. As
   each call returns, that row's status cell updates live (*pending* → *uploading* →
   *created* / *duplicate* / *rejected* / *failed*), so the tables double as the
   progress report — no separate results screen. A progress bar shows `n / total`, and
   the button is disabled while a run is in flight. When Table 1 is empty (every row was
   a duplicate or broken), the button is **disabled, not hidden**, with a hint such as
   *"No new donors to upload"* so its disabled state explains itself.

   As each call returns the row **moves out of Table 1** into the table matching its
   outcome, with an animated Vuetify row transition:
   - `201 created` → **Table 2** (§2b), joining pre-existing donors.
   - `409 duplicate` → **Table 2** (the donor exists).
   - `400 rejected` / other failure → **Table 3** (§2c), where the server's field
     messages (or *"duplicate phone number in <hall> hall"*) are shown inline exactly
     like a client-side error.

   So when the run finishes Table 1 is empty (every row was routed somewhere),
   Table 2 is the "these exist now" report, and Table 3 is the "still needs fixing"
   report. "Download failed rows as CSV" exports Table 3 so the user can fix and
   re-upload just those.

Implementation note: the parse/validate module returns each row as
`{ raw, normalized, errors: [{ field, message }], status }`, and the view routes the row
to a table by its `status`, rendering the `errors` array inline within Table 3. The
upload loop appends server-reported errors to that same array, which is what lets
client-side and server-side problems render identically in Table 3.

### 2b. Second table: donors that exist in the database

Immediately after the CSV is parsed, the view fires `GET /donors/phone` **in chunks of
100 phones**, sequentially, and merges the returned `donors` arrays. Batching keeps each
request's URL well under Express/proxy length limits on large files; because the route's
`commonLimiter` is removed, the successive chunks are never rate-limited.

**The entire review stays hidden until the pre-flight finishes.** While parsing and the
chunked existence check run, the view shows **only the app's default loader** — the
[`LoadingMessage.vue`](badhan-frontend/src/components/LoadingMessage.vue) component that
renders `assets/loading.gif` (the same GIF loader used elsewhere) — and none of the three
tables, the "Upload All" button, or any summary. All three tables appear together only
once the pre-flight has completed successfully. There is no partial/streaming render and
no per-chunk progress bar.

**Any chunk failure fails the whole pre-flight, with no retry.** If **any** chunk request
fails, the pre-flight is treated as failed outright: the loader is replaced by a single
Vuetify `v-alert` describing the error, and **nothing else renders** — no tables, no
"Upload All", and **no retry button**. The only way forward is to select the file again
(which resets and re-runs from scratch, §1). There is no fall-back to discovering
duplicates via `409`.

**Broken wins, and only valid rows are pre-flighted.** Client-side validation runs first:
a row that fails any §1 rule goes straight to Table 3 and is **never** included in the
pre-flight. Only rows that pass validation contribute their phone to `GET /donors/phone`.
So a row that has *both* a validation error *and* a phone that already exists in the
database lands in Table 3 (broken), not Table 2 (exists) — the broken classification takes
precedence, and such a row's phone is never sent to the existence check.

Together with client-side validation this splits the CSV across three stacked tables
(Table 3 covered in §2c):

**Table 1 (top) — donors to be created.** As described in §2. Rows whose phone came
back as already existing are **removed** from this table (not greyed out), so "Upload
All" only ever attempts genuinely new donors. Likewise, once a row inserts successfully
it is removed from this table and moved to Table 2 — nothing stays here greyed out.

**Table 2 (below) — donors that exist in the database.** This table starts as the
pre-flight result (one row per CSV entry whose phone was already found) and **grows
during the run: every row that inserts successfully moves here from the top table**
(§2 phase 3), as does any row that comes back `409 duplicate`. Each row shows the CSV's
values plus a status column distinguishing *already existed* from *just created*.
Nothing in this table is uploaded — it is the record of donors that now exist. A
heading states the count (e.g. *"7 of 120 donors already exist and will be skipped"*
before the run, updating to include the newly created ones after). The table is hidden
only while it is empty — i.e. before the run when no donor pre-existed.

A phone listed twice in the **same CSV** is not special-cased at parse time: both rows
pass pre-flight (neither is in the database yet), the first copy inserts `201` and moves
to Table 2, and any later copy comes back `409` mid-run and lands in Table 2 as a
duplicate. The server is the authority on intra-file collisions.

#### Permission-dependent "See Donor" button

`GET /donors/phone` returns `{ phone, donorId }` per existing donor, and the backend
already encodes the caller's permission in that field
([donorInterface.ts:685-701](badhan-backend/src/db/interfaces/donorInterface.ts#L685-L701)):

- **A real `donorId`** — the caller may view this donor (super admin, or same hall, or
  the donor's hall is `> 6`, or `availableToAll`). Render a **"See Donor"** button in
  that row.
- **The literal string `'FORBIDDEN'`** — the donor exists but belongs to another hall
  that the caller cannot access. Render **no button**, and show a short explanation in
  the row instead: *"Exists in another hall — you do not have permission to view this
  donor."*

For **just-created rows** that move into this table during the run, the `donorId` comes
from the `POST /donors` `201` response (`newDonor`) rather than the pre-flight call, and
the caller can always view a donor they just created, so these rows always get a working
"See Donor" button. Duplicate (`409`) rows get the button only when the `409` response
carries a real `donorId`; otherwise no button and no other follow-up action (there is no
"add donation to existing donor").

The button reuses the mechanism already built for single-donor creation, so behaviour
matches what users know from that screen:
[NewPersonCard.vue:439-441](badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L439-L441)
calls `createNewPopUpWindow` ([mixins/helpers.ts:58](badhan-frontend/src/mixins/helpers.ts#L58)) with
`getFrontendBaseURL() + '#/home/details?id=' + donorId`, opening the donor's profile in
a 600×600 popup. The CSV table's button does the same, per row.

That existing implementation is the single-donor analogue of this whole feature: it
calls `GET /donors/checkDuplicate` on phone blur, stores `duplicateDonorId`, and
renders a "See Duplicate" button (`donorCreationSeeDuplicateButtonId`) only when the
id is non-null. The batch version generalizes it — the one difference is that the
single-donor path reads `response.data.donor._id` from the *singular* endpoint, whereas
the batch endpoint returns a flat `donorId` per phone and uses the `'FORBIDDEN'`
sentinel instead of a `null` donor object.

### 2c. Third table: broken rows

**Table 3 (bottom) — rows that could not be uploaded.** Every row with at least one
error lives here, and nowhere else. It is populated in two moments:

- **At parse time** — rows that fail client-side validation (§1's strict rules: bad
  phone, unknown blood group, non-canonical hall case, blank required field, a
  date/count mismatch, etc.) go straight here instead of Table 1, so they are never
  uploaded.
- **During the run** — a row that comes back `400 rejected` (or any non-`201`/`409`
  failure) moves here from Table 1 with an animated transition.

Each row shows the CSV's values plus a **full-width inline error area** listing every
problem for that donor — one line per bad field, e.g. *"phone: `0171234` is not a valid
Bangladeshi number (expected 13 digits starting `8801`)"*, *"bloodGroup: `AB` is not a
recognised blood group"* — so a row with three problems shows all three at once, not
just the first. The offending cell is highlighted so the error line and the value it
refers to are visually connected. Client-side and server-side errors render identically
because both come from the same `errors: [{ field, message }]` array on the row.

A heading states the count (*"5 of 120 rows have errors and were not uploaded"*), and
**"Download failed rows as CSV"** exports the broken rows' **original raw cell values
under the identical header row — no error column and no other added fields** — so the
downloaded file is byte-compatible with the uploader and can be edited and re-uploaded
directly, with no columns to strip first. The table is hidden while empty.

### 3. Upload loop

- Triggered only by the explicit **"Upload All"** click — parsing and previewing never
  writes anything.
- Strictly **sequential**: a `for` loop that `await`s each `handlePOSTDonors` call
  before issuing the next. Not `Promise.all` — the backend `donorInsertionQueue`
  serializes insertions anyway, and sequential keeps the per-row status honest and the
  server unstressed.
- Every row's outcome recorded by HTTP status (`201` created, `409` duplicate, `400`
  rejected with the validator's field messages, anything else failed) and written back
  onto that row in the table.
- **No automatic abort and no automatic retry.** The loop pushes through the whole file
  regardless of how many rows fail; each failure simply lands in Table 3. Retrying is
  done by fixing the CSV and re-uploading.
- Cancel button that stops before the next request (the in-flight one still completes);
  rows not yet reached stay *pending*. **There is no resume**: after a Cancel, "Upload
  All" stays **disabled** — the run cannot be restarted or continued in place. To upload
  the remaining rows the user selects a file again (a fresh selection fully resets and
  re-runs from scratch, §1). Rows already routed by the point of cancellation keep their
  outcome in their tables until that reset.

### 4. Parsing library

Use `papaparse` (small, battle-tested; handles quoted fields, embedded commas, and the
BOM Excel exports carry) rather than a hand-rolled `split(',')`, which breaks on any
address containing a comma. It is configured with `header: true`,
`skipEmptyLines: false` (blank rows are surfaced, not dropped — see §1) and
**`delimiter: ','`** (comma forced, never auto-detected — see §1), so a non-comma
export fails the structural header check rather than being silently re-parsed.

### 5. Removal of Advanced Donor Creation

The existing "Advanced Donor Creation" page is deleted completely; the CSV uploader
takes its place. Concretely:

| Change | Location |
|---|---|
| Delete the view | [badhan-frontend/src/views/DonorCreation.vue](badhan-frontend/src/views/DonorCreation.vue) |
| Delete the `/donorCreation` route (`name: 'Donor Creation'`) | [router/index.ts:197-207](badhan-frontend/src/router/index.ts#L197-L207) |
| Delete the `donorCreationId` "Advanced Donor Creation" sub-link | [AppBar.vue:134-140](badhan-frontend/src/components/AppShell/AppBar.vue#L134-L140) |
| Delete the "Advanced donor creation" button that links to `/donorCreation` | [SingleDonorCreation.vue](badhan-frontend/src/views/SingleDonorCreation.vue) |
| Drop `getDataInputAPIBaseURL` and its interface member | [mixins/environment.ts:34,59](badhan-frontend/src/mixins/environment.ts#L59) |
| Drop `VUE_APP_DATAINPUT_URL` | `badhan-frontend/.env.local`, `.env.development`, `.env.production` |

In place of each deleted link, add the equivalent link to the new
`/csvDonorCreation` route (nav sub-link `csvDonorCreationId`, and the button on the
single-donor page). Both use the display text **"Upload CSV of Donors"**.

**Things that must NOT be removed** (verified — they are separate features that share
the redirection-token machinery):

- `POST /users/redirection` and `PATCH /users/redirection` in
  [UsersController.ts:186-308](badhan-backend/src/tsoaControllers/UsersController.ts#L186-L308) — still used by
  "Go to web" ([AppBar.vue:267](badhan-frontend/src/components/AppShell/AppBar.vue#L267)) and
  "Download in mobile" ([Home.vue:432](badhan-frontend/src/views/Home.vue#L432)).
- `handlePOSTRedirection` in [api/index.ts:235](badhan-frontend/src/api/index.ts#L235) and the
  `requestRedirectionToken` store action — same reason. Only `DonorCreation.vue`'s
  direct import of it goes away.
- [views/Redirection.vue](badhan-frontend/src/views/Redirection.vue) and the `RedirectionPage` route.
- The `donorCreationNavigationId` **parent** nav item — it points at
  `/singleDonorCreation`, not at the page being deleted, and the Cypress page object
  [NavigationDrawer.ts:10](badhan-frontend-test/cypress/support/pages/NavigationDrawer.ts#L10) clicks it.

The external data-input site itself is **left untouched**: the Netlify site and
`badhan-automated-form/` stay in the repo, to be taken down separately by the user. Only
the in-app link and `getDataInputAPIBaseURL` / `VUE_APP_DATAINPUT_URL` are removed;
`PATCH /users/redirection` stays (still used by "Go to web" / "Download in mobile").

### 6. Cypress end-to-end test

New spec `badhan-frontend-test/cypress/e2e/donors/csv-upload.cy.ts`, following the
existing Page Object convention (`@pages`/`@components`/`@support` aliases, as in
[create-single.cy.ts](badhan-frontend-test/cypress/e2e/donors/create-single.cy.ts)).
This is the **only** test coverage for the feature — no unit tests for the
parse/normalize module and no `badhan-backend-test` changes.

**File upload is natively supported** — `cy.selectFile()` is built into Cypress since
9.3 and this project is on Cypress `^15.1.0`
([package.json](badhan-frontend-test/package.json)), so **no `cypress-file-upload`
plugin is needed**.

#### Test flow

1. Sign in with `AUTH_CREDENTIALS` and assert the sign-in notification, matching the
   existing specs.
2. Navigate to the CSV page through the drawer (new
   `NavigationDrawer.goToCsvDonorCreation()`, clicking
   `donorCreationNavigationId` → `csvDonorCreationId`).
3. **Generate random donors in the test** — a helper builds N (default 5) donors with
   randomized name, phone, studentId, blood group and hall, then serializes them to a
   CSV string. Every generated donor must satisfy the §1 rules, so the helper reuses
   the same constraints: phone `016`/`017`/`018` + 8 random digits, a studentId whose
   department code is drawn from the allowed list and whose batch year is ≤ the current
   year, and non-empty `roomNumber`/`address`/`comment`. **Hall is pinned to the
   authenticated tester's own hall** (not drawn at random), so that every generated
   donor is one the tester is permitted to view — this is what makes the "See Donor"
   assertion below deterministic. `Attached` is never used.
   Phones are suffixed from `Date.now()` (as `create-single.cy.ts` already does) so
   reruns never collide with donors left behind by a previous run.
4. **Attach the file without touching disk** — pass the generated string straight to
   `cy.selectFile()` via `Cypress.Buffer.from(...)`, so no fixture file has to be
   written or cleaned up:
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
5. Assert the review table rendered N rows and that none of them carries an inline
   error row.
6. **Click "Upload All"** (`[data-cy=csvUploadAllButtonId]`).
7. Wait for the run to finish and assert every row reached the *created* state, and
   that the summary reports N created / 0 failed.
8. Verify the donors really exist — search for one of the generated phones on the home
   page (reusing `HomePage`), or assert against the `POST /donors` responses via
   `cy.intercept`.

No explicit cleanup is needed: the `before:spec` hook already purges and repopulates the
local DB before every spec
([cypress.config.ts:103-113](badhan-frontend-test/cypress.config.ts#L103-L113) —
`POST /purge-local-db` then `POST /populate-local-db`), so generated donors never
accumulate, and the `Date.now()` phone suffix guarantees no collision within a run.

#### Additional cases in the same spec

- **Malformed rows** — a CSV with a bad phone and an unknown blood group; assert each
  offending row lands in Table 3 (broken rows, §2c) with its inline errors and that
  "Upload All" never uploads them.
- **Already-existing donors** — upload a CSV containing a donor created earlier in the
  same spec; assert it lands in the second ("exists in the database") table rather than
  the upload table, and that a "See Donor" button is present. Because the generator pins
  every donor to the tester's own hall (§6 step 3), the caller is always permitted to
  view it, so the button is guaranteed to render.

The **demo-CSV download** case is deliberately excluded — it is the flakiest part of the
suite and is not worth the maintenance.

#### Required test-side additions

| Addition | File |
|---|---|
| `goToCsvDonorCreation()` | `cypress/support/pages/NavigationDrawer.ts` |
| `CsvDonorCreationPage` page object (file input, Upload All, row/status selectors, error rows, existing-donors table) | `cypress/support/pages/CsvDonorCreationPage.ts` (new) |
| Random-donor + CSV-string generator | `cypress/support/helpers/donorCsvGenerator.ts` (new) |
| `data-cy` attributes on the new view's file input, Upload All button, table rows, status cells, error rows and See Donor buttons | `CsvDonorCreation.vue` |

Note there is no `cypress/fixtures/` directory in the project today; the inline-buffer
approach above means one is not needed.

## Work breakdown

| # | Change | File |
|---|---|---|
| 1 | Add `papaparse` + `@types/papaparse` | `badhan-frontend/package.json` |
| 2 | CSV parse + normalize + client-side validate module, returning per-row `errors: [{field, message}]` | `badhan-frontend/src/utils/donorCsv.ts` (new) |
| 2b | New API wrapper `handleGETDonorsPhoneList` for `GET /donors/phone`, batching phones 100 per call | `badhan-frontend/src/api/index.ts` |
| 2c | Remove `rateLimiter.commonLimiter` from the `GET /donors/phone` route and regenerate the tsoa routes/spec | `badhan-backend/src/tsoaControllers/DonorsController.ts` |
| 3 | CSV upload view: file input → three stacked tables (to-create / exists-in-db / broken rows) → "Upload All" → live per-row status with animated row routing | `badhan-frontend/src/views/CsvDonorCreation.vue` (new) |
| 3b | "Exists in the database" table (§2b) with permission-aware "See Donor" popup button, and "broken rows" table (§2c) with inline per-field errors + failed-rows CSV export | same view |
| 4 | Route registration | `badhan-frontend/src/router/index.ts` |
| 5 | Entry points: nav sub-link + button on single-donor page, pointing at `/csvDonorCreation` | `AppBar.vue`, `SingleDonorCreation.vue` |
| 6 | **Delete Advanced Donor Creation** (view, route, nav sub-link, button, `getDataInputAPIBaseURL`, `VUE_APP_DATAINPUT_URL`) | see §5 table |
| 7 | "Download demo CSV" button + demo constant, and failed-rows CSV export (reuse existing `file-saver`) | `donorCsv.ts`, view |
| 7b | Collapsible "CSV format" help panel documenting every column | view |
| 8 | Cypress spec `csv-upload.cy.ts`: generate random donors → `cy.selectFile()` → "Upload All" → assert all created (see §6) | `badhan-frontend-test` |
| 8b | Page object, drawer method, random-donor CSV generator, and `data-cy` hooks on the new view | `badhan-frontend-test`, `CsvDonorCreation.vue` |
| 9 | Cypress: remove any assertion on the deleted nav sub-link | `badhan-frontend-test` |

**Backend: one change only** — remove `rateLimiter.commonLimiter` from the
`GET /donors/phone` route (item 2c) so the chunked pre-flight calls are never
rate-limited, then regenerate the tsoa routes/spec. The upload loop stays entirely
frontend-driven against the unchanged `POST /donors`; no new endpoint, and no extra
batch-level server logging — the per-row `POST DONORS` log entries already suffice.
