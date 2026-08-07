# Plan 8 — Public donor portal and feedback, split into standalone phases

This document restates [plan8.md](plan8.md) as **eleven self-contained phases**, in English, aimed at
whoever implements it. Each phase repeats the decisions, files, rules and tests it depends on rather
than pointing sideways at another phase, so it can be read, built, reviewed and deployed on its own.
Nothing from `plan8.md` is dropped — §1–§7 are all carried through, and
[Appendix B](#appendix-b--traceability) maps each original section to the phase that implements it.
[Appendix C](#appendix-c--where-this-document-departs-from-plan8md) lists every place where this
document knowingly contradicts `plan8.md`, and why.

> **This plan is deliberately built wider than `plan8.md` §1–§7 asks for.** Those sections describe
> one journey: an existing donor scans a printed QR, proves who they are, and leaves a message. This
> document builds that journey on a **general-purpose submission pipe** — one collection, one signed
> short-lived token, one submit route — so that the **new-donor registration flow** drops in as a
> second token purpose and a second `feedbackJSON` shape, not as a second system. That flow is
> specified and built here, in phases 4, 8 and 9, and is now described for volunteers in
> [`plan8.md` §২ক](plan8.md). Everything that exists only to serve it is marked.

> **Open questions have been decided.** Where `plan8.md` left a choice open, or where the phasing
> exposed one, the answer is recorded as a **D**-numbered decision in
> [Phase 0](#the-decisions-that-everything-else-follows-from) and applied throughout. The decisions
> taken: the collection stores **phone, studentId, hall, feedbackJSON, date** and **no donor id**
> (D2); submission is authorised by a **short-lived signed token**, in two purposes — 15 minutes for
> a verified donor, up to 24 hours for a hall registration QR (D5, D6), signed with the **existing
> `JWT_SECRET`** (D8); tokens are **stateless and cannot be revoked** (D7); there is **no per-donor
> cap** (D9); deleting a donor **no longer deletes their feedback** (D12, withdrawing part of §7);
> creating a donor from a submission **does not discard it** (D13); the printed sheet is **a QR and
> one English line, nothing else** (D15); the public page lives at **`/#/donor`**, frozen the moment
> the first sheet is printed (D14); both public pages are **English-only** (D18); and the
> registration form is **one question per screen** rather than a wall of fields (D19).

| Phase | Title | Depends on | Deployable alone |
| --- | --- | --- | --- |
| [1](#phase-1--the-feedbacks-collection) | The `feedbacks` collection | — | yes (invisible) |
| [2](#phase-2--the-token-service) | The token service — mint and verify, two purposes | — | yes (invisible) |
| [3](#phase-3--the-fifteen-minute-donor-token-route) | Identity check → donor summary + 15-minute token | 2 | yes (invisible) |
| [4](#phase-4--the-registration-token-route) | Member-generated hall token, up to 24 hours | 2 | yes (invisible) |
| [5](#phase-5--the-submit-route) | One submit route, both token purposes | 1, 2, 3, 4 | yes (invisible) |
| [6](#phase-6--the-volunteer-facing-endpoints) | List / count / discard, with the visibility rule | 1 | yes (invisible) |
| [7](#phase-7--the-public-donor-page) | `/#/donor` — the existing-donor journey | 3, 5 | yes (unlinked) |
| [8](#phase-8--the-public-registration-page) | `/#/register` — the new-donor question sequence | 4, 5 | yes (unlinked) |
| [9](#phase-9--the-feedback-page-prefill-and-the-manual) | Feedback page, prefilled donor creation, sidebar, manual | 6, 7, 8 | yes |
| [10](#phase-10--the-two-qr-surfaces-and-the-scan-gate) | Printed QR sheet, in-app QR generator, **scan gate**, manual | 9 | yes |
| [11](#phase-11--full-suite-build-and-rollout) | Full suite, production build, rollout checklist | all | — |

**Phases 1–6 ship dark.** They are individually deployable but change nothing anybody can see.
Phases 7 and 8 ship pages that exist and work but that nothing links to — reachable only by
hand-typing a URL. Phase 9 is the first thing a volunteer sees. **Phase 10 is last on purpose:**
printing is the one irreversible act here. Paper goes on a notice board and cannot be recalled, so
the URL it carries must already be a finished page backed by a working Feedback list.

---

## Phase 0 — Shared context (read once; every phase repeats what it needs)

### What is being built

Most donors in the database have no account and cannot sign in. Today the only way a donation gets
recorded is that the donor finds a volunteer and tells them. And a student who is not in the
database at all has no way in except through a volunteer with a laptop.

Both problems are the same problem — **there is no way for someone without an account to tell Badhan
something** — so both get the same answer: a public page, a signed short-lived token, and a queue
that a volunteer works through by hand.

**Journey A — an existing donor leaves a message.** A printed sheet on a notice board carries a QR
code pointing at a fixed public page:

```
https://badhan-buet.web.app/#/donor
```

The donor types their **phone number and student ID**. If both match one donor record, the server
returns a small read-only summary *and* **a token valid for fifteen minutes** carrying that donor's
phone, student ID and hall. The donor writes a message; the browser submits it with the token.

**Journey B — a student who is not in the database registers.** A volunteer opens a page in the app,
picks a duration (up to 24 hours) and generates a **QR code containing a hall token**. Students at a
desk or a hall event scan it and answer a short sequence of questions on their own phone — one
question per screen, submitted in one go at the end. That submission lands in the same queue, tagged
as a new-donor submission.

**Both journeys end in the same place.** A new **Feedback** page inside the app lists everything
waiting, oldest first, filtered to the halls the viewer is allowed to see. A message gets read and
**discarded**. A registration gets opened into a **prefilled Single Donor Creation form**, and then
discarded. Nothing is ever created or changed automatically.

### The decisions that everything else follows from

**D1 — the public side can speak, it cannot act.** No endpoint reachable without a session may
modify a donor, a donation, a call record or anything else. The single write the public side can
perform is appending a row to the `feedbacks` collection. This is the whole security model, and
every other decision is downstream of it. **A registration submission does not create a donor** — it
creates a row that a member later turns into a donor by hand. (§5)

**D2 — the collection stores `phone`, `studentId`, `hall`, `feedbackJSON`, `date` — and no donor
id.** This is the decision that makes journey B possible: a person filling the registration form has
no donor record to point at, so a foreign key would be null for exactly the rows that need it most.
Phone and student ID are stored as plain data, and `hall` — copied from the token, never from the
submitter — is what routes the row to the right volunteers.

**D3 — `feedbackJSON` is flexible storage behind a strict edge.** The column is `Schema.Types.Mixed`
and the database enforces nothing about its shape. The *route* enforces everything: a required
`type` discriminator, a per-type validator, and a total size cap. New submission kinds are added by
writing a new `type` and its validator — no migration, no schema change, no new collection. What is
never allowed is an untyped or unvalidated blob reaching the database. (Future-proofing, not in
`plan8.md`.)

**D4 — one submit route, not one per kind.** `POST /publicDonors/feedbacks` handles both journeys.
The **token decides** which one: its `purpose` claim selects the validator and decides where phone,
student ID and hall come from. A third kind later is a third `purpose` and a third validator on the
same route.

**D5 — submission is authorised by a signed, short-lived, stateless token.** Two purposes:

| Purpose | Lifetime | Claims | Minted by | Journey |
| --- | --- | --- | --- | --- |
| `donorFeedback` | 15 minutes | `purpose`, `hall`, `phone`, `studentId`, `exp` | the identity-check route, after a database match | A |
| `donorRegistration` | configurable, ≤ 24 h (default 4 h) | `purpose`, `hall`, `exp` | a signed-in member | B |

Neither is written to any collection. Both are signed with the existing `JWT_SECRET`.

> **This supersedes an earlier decision in this document.** A previous revision had the submit route
> re-send phone and student ID for the server to re-match. The token replaces that, and the change
> is an improvement worth naming: the submit route **no longer looks at a phone/student-ID pair at
> all** for journey A, so it stops being a second place where someone can sit and guess pairs. The
> only guessing surface left is the identity-check route itself, which is rate-limited and answers
> every failure identically.

**D6 — the hall on a row always comes from the token, never from the submitter.** For journey A the
server reads it off the matched donor record; for journey B it is fixed when the member generates
the QR. A student filling the registration form **may** state a hall in the form body — that value
lands inside `feedbackJSON` for the volunteer to read and use, and has no effect whatsoever on who
sees the row. Routing and content are separate on purpose: otherwise anyone could aim submissions at
any hall's queue.

**D7 — tokens are stateless and cannot be revoked.** No `jti`, no denylist, no "active links" page.
A registration QR that leaks — photographed, forwarded, posted in a group — stays live until it
expires. This is accepted knowingly, and the mitigations are duration and blast radius: the default
is **4 hours**, the ceiling is **24 hours**, and the worst outcome is junk rows in one hall's queue
that a volunteer discards. No donor data is exposed and nothing is created. Revisit only if it
actually happens; the fix (a `jti` plus a small collection) is a contained follow-up.

**D8 — feedback tokens are signed with the existing `JWT_SECRET`, and separation is enforced by
claims.** There is **no `FEEDBACK_JWT_SECRET`**; a second secret would mean a new variable in the
dotenv config, `docker-compose.yml`, the test environment and the production deployment, plus a
rotation story, to harden a boundary that the `purpose` check already closes. A feedback token must
never be usable as a session token, and vice versa. Both are JWTs signed with the same secret, so
this is enforced by claims and tested, not assumed:

- A **session** token's payload is `{_id}` and [authenticate.ts](../../badhan-backend/src/middlewares/authenticate.ts)
  additionally requires a matching row in the `Tokens` collection. A feedback token has no such row,
  so it fails there — but do not rely on that alone.
- The feedback verifier **must require `purpose` to be exactly one of the two known values**. A
  session token has no `purpose` claim and is therefore rejected outright.
- Both directions get an explicit test (phases 2.4 and 5.5).

Because the two checks above are now the *whole* separation, neither is optional and neither may be
weakened without re-opening this decision. A comment at the `purpose` check in
`verifyFeedbackToken` should say so.

**D9 — there is no per-donor submission cap.** The limits are per-IP rate limiters and the size caps
on `feedbackJSON`. This **withdraws** `plan8.md` §5's "একজন ডোনারের ফিডব্যাকের সীমা" paragraph and
the "your previous message is still under review" message it describes. One donor can file several
messages, and the queue can hold several rows for the same person. If that becomes a real nuisance
the fix is small and known — a uniqueness rule plus a 409 — and deliberately not built in advance.
(§5)

**D10 — the public payload for journey A is deliberately small, and read-only.** Exactly these nine
fields leave the server: `name`, `phone`, `studentId`, `bloodGroup`, `hall`, `donationCount`,
`plateletDonationCount`, `lastDonation`, `lastPlateletDonation`. Never address, room number, email,
comment, call records, designation, `availableToAll`, `archiveFlag`, or the donation list. Anyone
who knows both a phone number and a student ID can read this, and that is accepted knowingly — which
is exactly why nothing more sensitive is in it. (§2.1, §2.2)

**D11 — a submission is a message, not an instruction.** It is stored verbatim and interpreted by a
human. The app never parses a message, never extracts a date from it, and never changes a donor
record because of one. `Discard` deletes the row and nothing else. This is not a limitation to be
engineered away later; it is the reason the feature is safe to expose publicly at all. (§4)

**D12 — deleting a donor does not delete their feedback.** `plan8.md` §7 promises the opposite, and
that promise is **withdrawn**. The cascade that already runs on donor deletion is left alone. The
consequence is accepted: a discarded person's messages stay in the queue until a volunteer clears
them by hand, and the Feedback page must render a row whose phone and student ID match no donor.
That rendering path is needed anyway — every journey-B row has no donor record — so this costs
nothing new. (§7, amended)

**D13 — creating a donor from a registration submission does not discard it.** The volunteer
discards it themselves, like every other row. The app does not mutate the queue as a side effect of
a different page succeeding, and a volunteer who created a *different* person by mistake still has
the original submission in front of them. (§4, extended to journey B)

**D14 — the public URLs are `/#/donor` and `/#/register`, and `/#/donor` freezes the day the first
sheet is printed.** One address for all of Badhan; no per-hall link, nothing secret about it.
Sharing it in a Facebook group or a hall WhatsApp group is a feature, not a leak — the privacy
control is the phone+ID match, not the obscurity of the address. (§1.3, §7)

**D15 — the printed sheet is a QR code and one line of English text.** Exactly:

> **Scan to submit feedback to Badhan BUET Zone**

and the QR beneath it. Nothing else — **no logo, no hall name, no readable URL, no Bangla line, no
design.** This withdraws most of `plan8.md` §1.1, and each withdrawal removes work: no hall name
(§1.3 already makes the URL zone-wide), no Bangla text and therefore **no embedded font**, no logo,
no border, no printed address. Every volunteer's download is byte-identical. (§1.1, §1.3)

**D16 — the unresolved count beside the sidebar entry is fetched, never pushed.** A cheap count
endpoint, called when the app bar mounts, when the Feedback page loads, and after each discard. No
polling, no websocket, no notification — `plan8.md` §7 already promises none. (§3, §7)

**D17 — QR codes are built from the configured frontend base URL, not from `window.location.href`.**
The page that generates a code and the page the code points at are different routes, so the
certificate's "encode my own address" trick does not apply. Read
[environmentService.getFrontendBaseURL()](../../badhan-frontend/src/mixins/environment.ts), strip any
trailing slash (development's value carries one, production's does not), and append the resolved
route. The consequence is the certificate's: **a code produced on a dev or staging host encodes that
host.** For the printed sheet that means permanently dead paper — print only from production.

**D18 — both public pages are English-only.** Every label, hint, error message, button and
confirmation on `/#/donor` and `/#/register` is written in English, matching the printed caption
(D15) and the rest of the app's interface. No Bangla line, no language toggle, no translation layer.
A web page would not need an embedded font the way the PDF does, so this is not the font argument —
it is that one language is one set of strings to write, review and keep true as the pages change,
and the app has never had a second one. The risk is real and recorded in Appendix A: the readers are
students who mostly read Bangla. If they do not use the pages, a Bangla pass over these two files is
a contained follow-up, and unlike the printed sheet it costs nothing irreversible.

**D19 — the registration form asks one question at a time.** `/#/register` is **not** a wall of
fields. It is a sequence of single-question screens — "What is your name?", then that whole component
is replaced by "What is your student ID?", and so on — with the answers accumulating in component
state and **the whole `feedbackJSON` submitted once, after the last question**. There is no partial
save, no draft on the server, and no submission until the sequence completes; a student who closes
the tab halfway has sent nothing.

This is the right shape for the surface it lives on: every visitor arrives from a phone camera, and
a phone showing one question with one large input is answerable while standing at a desk in a queue,
where an eight-field form is not. It also makes validation kind — each answer is checked at its own
step, so a mistake is corrected in place instead of surfacing as a list of errors after everything
has been typed.

The consequence for the field list: **the four donation-history fields are not asked.**
`donationCount`, `lastDonation`, `plateletDonationCount` and `lastPlateletDonation` are defaulted
(`0` / `null`) rather than turned into four more screens. A student's self-reported donation history
is unverifiable and the volunteer has to check it at creation time regardless, so asking costs four
steps of attrition and buys nothing the comment box cannot carry. The comment step's hint text
invites it in prose instead. Journey A's page (`/#/donor`) is unaffected — it is two fields and a
textarea, and stays a single form. (Not in `plan8.md`.)

### A note on plan 7

`plan8.md` positions this feature as the complement to [plan7](implemented/plan7.md)'s donor accounts
and Pending Donations page, and §6 promises that page is unchanged. **Plan 7 has not been
implemented.** There is no pending-donation model, controller, route or page anywhere in the
repository. Nothing here depends on it — but do not go looking for a Pending Donations page to leave
alone, and do not write manual text that refers to one.

### Where the code goes

| Area | Path |
| --- | --- |
| Feedback model | `badhan-backend/src/db/models/Feedback.ts` (new) |
| Feedback interface | `badhan-backend/src/db/interfaces/feedbackInterface.ts` (new) |
| Token service | `badhan-backend/src/services/feedbackToken.ts` (new) |
| Public controller | `badhan-backend/src/tsoaControllers/PublicDonorsController.ts` (new) |
| Feedback controller | `badhan-backend/src/tsoaControllers/FeedbacksController.ts` (new) |
| Validators | `badhan-backend/src/validations/publicDonors.ts`, `feedbacks.ts` (new) + additions to [validateBody.ts](../../badhan-backend/src/validations/validateRequest/validateBody.ts) / [validateQuery.ts](../../badhan-backend/src/validations/validateRequest/validateQuery.ts) |
| Rate limiters | [badhan-backend/src/middlewares/rateLimiter.ts](../../badhan-backend/src/middlewares/rateLimiter.ts) — two new |
| Donor reads | [badhan-backend/src/db/interfaces/donorInterface.ts](../../badhan-backend/src/db/interfaces/donorInterface.ts) |
| Guest mirrors | [badhan-backend/src/tsoaControllers/GuestController.ts](../../badhan-backend/src/tsoaControllers/GuestController.ts) |
| Backend tests | `badhan-backend-test/tests/publicDonors/`, `badhan-backend-test/tests/feedbacks/` (new) |
| Public donor page | `badhan-frontend/src/views/PublicDonor.vue` (new) |
| Public registration page | `badhan-frontend/src/views/PublicRegistration.vue` + `views/PublicRegistration/` — one component per question, per D19 (new) |
| Feedback page | `badhan-frontend/src/views/Feedback.vue` + `views/Feedback/` (new) |
| QR sheet + generator | `badhan-frontend/src/views/FeedbackQr.vue`, `views/RegistrationQr.vue` + `views/FeedbackQr/` (new) |
| Donor creation prefill | [badhan-frontend/src/views/SingleDonorCreation.vue](../../badhan-frontend/src/views/SingleDonorCreation.vue) |
| Frontend routes | [badhan-frontend/src/router/index.ts](../../badhan-frontend/src/router/index.ts) |
| Frontend API calls | [badhan-frontend/src/api/index.ts](../../badhan-frontend/src/api/index.ts) |
| Sidebar | [badhan-frontend/src/components/AppShell/AppBar.vue](../../badhan-frontend/src/components/AppShell/AppBar.vue) |
| Count store | `badhan-frontend/src/store/feedback.ts` (new), registered in [store.ts](../../badhan-frontend/src/store/store.ts) |
| E2E tests | `badhan-frontend-test/cypress/e2e/feedback/` (new) |
| Manual | `docs/manual/20-donor-feedback.md` (new) + edits to chapters 04, 05, 11, 19 and the README index |

### Running commands

Nothing runs on the host. Everything runs in the container, per [CLAUDE.md](../../CLAUDE.md):

```
docker compose up -d
docker compose exec backend npx tsc --noEmit
docker compose exec backend npm run tsoa:routes      # after any controller change
docker compose exec frontend npm run build
docker compose build backend-test                    # the test image has no volume mount
docker compose run --rm backend-test <cmd>
docker compose run --rm frontend-test <cmd>
```

`src/tsoaRoutes/` is gitignored, so regenerating routes produces no diff — it is a build step the
running container needs, not a deliverable. New indexes need no migration: models self-register and
[syncIndexes.ts](../../badhan-backend/src/db/syncIndexes.ts) aligns indexes on every boot.

---

## Phase 1 — The `feedbacks` collection

**Goal:** the collection exists, with the shape every later phase writes to and reads from. Nothing
is visible; the phase is verified by tests and by a boot log line showing the new indexes.

### 1.1 The model

New file `badhan-backend/src/db/models/Feedback.ts`, following the shape of
[PublicContact.ts](../../badhan-backend/src/db/models/PublicContact.ts):

```ts
export interface IFeedback extends Document {
  phone: number          // 8801XXXXXXXXX, as everywhere else in the project
  studentId: string      // 7 digits
  hall: number           // HALLS_INDEX — copied from the token, never from the submitter (D6)
  feedbackJSON: any      // Schema.Types.Mixed — see D3
  date: number           // submission timestamp
}
```

- `phone` — `Number`, `required`, the same 8801000000000–8801999999999 bounds the Donor schema uses.
  **Not unique, and not a reference.** Several rows may carry the same phone (D9), and a row may
  carry a phone that matches no donor at all (journey B, and D12).
- `studentId` — `String`, `required`, `trim`, length 7.
- `hall` — `Number`, `required`, validated against `HALL_INDICES_ALLOWED_FOR_DONOR` plus
  `HALLS_INDEX.ATTACHED`, since a token may legitimately carry an unrestricted hall.
- `feedbackJSON` — `Schema.Types.Mixed`, `required`. The schema enforces nothing beyond presence;
  the route enforces the rest (D3). Add a schema-level guard that the serialised value is under
  **4 KB**, as a backstop to the route's validator.
- `date` — `Number`, `required`, defaulted to insertion time, validated with the existing
  `checkNumber` / `checkTimeStamp` validators from [models/validators](../../badhan-backend/src/db/models/validators).
- Schema options `{ versionKey: false, id: false }`, as everywhere else.
- Register as `model<IFeedback>('Feedbacks', feedbackSchema)`, matching `PublicContacts`,
  `CallRecords` and the rest.

Three indexes, all load-bearing:

```ts
feedbackSchema.index({ hall: 1, date: 1 })   // the visibility filter, then the oldest-first sort
feedbackSchema.index({ date: 1 })            // the super admin's unfiltered list
feedbackSchema.index({ phone: 1, studentId: 1 })  // the donor join that renders the card
```

### 1.2 The `feedbackJSON` envelope

Flexible in the database, strict at the edge (D3). Every value has a `type`:

```jsonc
// type: 'feedback'  — journey A, an existing donor's message
{ "type": "feedback", "text": "I donated on 12 March, please add it" }

// type: 'newDonor'  — journey B, a registration submission
{ "type": "newDonor",
  "name": "...", "phone": 8801700000000, "studentId": "1905001",
  "bloodGroup": 2, "hall": 6, "address": "...", "roomNumber": "...",
  "comment": "...", "donationCount": 0, "lastDonation": null,
  "plateletDonationCount": 0, "lastPlateletDonation": null, "availableToAll": false }
```

The `newDonor` key list is **not invented here** — it is exactly the `keysExpected` array in
[NewPersonCard.vue:347](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L347),
minus `key`, which the prefill adds at render time. That component already hydrates every field from
a draft object and warns about unexpected or missing keys, which is what makes phase 9's prefill a
straight handoff rather than a mapping layer. **Keep the two lists in step**; a comment in both
places should say so.

Note that the registration page **never asks** for `donationCount`, `lastDonation`,
`plateletDonationCount`, `lastPlateletDonation` or `availableToAll` (D19) — it sends them at the
defaults shown above. They stay in the key list because the shape must match `keysExpected` for
phase 9.3's prefill to be a straight handoff, and because a later submission kind may fill them.

Write these shapes down in the interface file as TypeScript types, and validate against them at the
route (phase 5.2). The database's flexibility is for *future* kinds, not for present sloppiness.

### 1.3 The interface

New file `badhan-backend/src/db/interfaces/feedbackInterface.ts`, returning the project's usual
`{data?, message, status}` triple:

- `insertFeedback(phone, studentId, hall, feedbackJSON)` → the created row.
- `findFeedbacksForUser(user)` → the visible list, enriched (written in phase 6.2).
- `countFeedbacksForUser(user)` → a number.
- `findFeedbackById(feedbackId)` → one row, for the discard permission check and the prefill read.
- `deleteFeedbackById(feedbackId)` → the deleted row, or `status: 'ERROR'` when it was already gone.

### 1.4 No cascade delete

Per **D12**, the `post('findOneAndDelete')` hook at the bottom of
[Donor.ts](../../badhan-backend/src/db/models/Donor.ts) is **not** extended. Deleting a donor leaves
their feedback rows in the queue for a volunteer to clear by hand.

Write this down where a future reader will trip over it — a one-line comment beside that hook
listing `Feedbacks` as a deliberate omission — because every other donor-owned collection is in
there and the next person to read it will assume an oversight.

### 1.5 Tests (`badhan-backend-test/tests/feedbacks/`)

There is no route yet, so reach the model the way the existing suites reach the database, or defer
these into phase 6's suite — but do not skip them:

1. A row round-trips with all five fields intact, `feedbackJSON` included as an object rather than
   a string.
2. A `feedbackJSON` over 4 KB is rejected.
3. **Deleting the donor leaves the feedback row in place** (D12). This is the test that pins a
   decision someone will otherwise "fix".

**Phase 1 is done when** the container boots, `syncIndexes` reports the three new indexes, and the
round-trip tests pass.

---

## Phase 2 — The token service

**Goal:** one module that mints and verifies both token purposes, with no routes attached. Small,
pure, and the single place where anything about tokens is decided.

### 2.1 The module

New file `badhan-backend/src/services/feedbackToken.ts`:

```ts
export const FEEDBACK_TOKEN_PURPOSES = { DONOR_FEEDBACK: 'donorFeedback', DONOR_REGISTRATION: 'donorRegistration' } as const

export const DONOR_FEEDBACK_TOKEN_MINUTES = 15
export const REGISTRATION_TOKEN_DEFAULT_MINUTES = 240    // 4 hours (D7)
export const REGISTRATION_TOKEN_MAX_MINUTES = 1440       // 24 hours (D7)

mintDonorFeedbackToken(donor): string
mintRegistrationToken(hall: number, durationMinutes: number): { token: string, expiresAt: number }
verifyFeedbackToken(token: string): { valid: false, reason: 'expired' | 'invalid' }
                                  | { valid: true, purpose, hall, phone?, studentId?, exp }
```

Rules:

- **Sign with `dotenv.JWT_SECRET`**, the same secret `tokenInterface` uses. No new environment
  variable is introduced (D8).
- **Every payload carries `purpose`.** `verifyFeedbackToken` rejects any token whose `purpose` is
  not one of the two known values — which is what stops a stolen **session** token being used as a
  submission token, since session payloads are `{_id}` and carry no `purpose` (D8). Since the two
  token kinds share a secret, **this check is the entire separation** — comment it as such, and
  treat weakening it as re-opening D8.
- **Expiry is a JWT `exp` claim**, so `jwt.verify` enforces it and nothing in the app has to compare
  clocks by hand. Distinguish `TokenExpiredError` from every other failure — the pages want to say
  "this QR code has expired", which is actionable, rather than "invalid".
- **Keep the payload small.** A registration token ends up inside a QR code (phase 10.3): every
  extra claim raises the QR version and shrinks the modules on paper. Two claims plus `exp` keeps
  the code low-density and scannable.
- **Nothing is stored** (D7). The module touches no collection.

### 2.2 Duration clamping lives here

`mintRegistrationToken` clamps `durationMinutes` into `[1, REGISTRATION_TOKEN_MAX_MINUTES]` itself,
rather than trusting its caller. The route validates too (phase 4.2), but the ceiling is a property
of the token, not of one endpoint that happens to mint it today.

### 2.3 The lifetimes, and why

- **15 minutes for `donorFeedback`.** It carries a phone and a student ID, so it is the more
  sensitive of the two — but the thing it actually guards is a submission that a human then reads,
  and the realistic threat is someone picking up an unlocked phone within the window and filing a
  message the volunteers would have to discard. That is cheap. Cutting the donor off mid-sentence is
  not: a donor who loses what they typed does not type it again. Fifteen minutes covers reading your
  own record, thinking, being interrupted, and writing a few sentences on a phone keyboard.
- **4 hours default / 24 hours maximum for `donorRegistration`.** It is pinned on a wall or shown on
  a laptop at a desk; it has to outlive the event. It carries no personal data — only a hall — and
  the worst it can do is add rows to one hall's queue (D7).

### 2.4 Tests

Unit-level, against the module:

1. A minted `donorFeedback` token verifies, and returns the phone, student ID and hall it was minted
   with.
2. A minted `donorRegistration` token verifies and returns its hall.
3. **A token minted 16 minutes ago fails as `expired`**, not as `invalid`. Do not sleep — mint with
   a backdated `exp`.
4. A token signed with the wrong secret fails as `invalid`.
5. **A real session token, taken from a sign-in, fails verification** — the `purpose` check (D8).
6. A `donorFeedback` token is not accepted where a `donorRegistration` token is required, and the
   reverse. (The check belongs to the submit route, but the service must expose `purpose` clearly
   enough that the route can make it.)
7. A 2000-minute duration is clamped to 1440.

**Phase 2 is done when** all seven pass and nothing outside this module knows how a token is built.

---

## Phase 3 — The fifteen-minute donor token route

**Goal:** `POST /publicDonors/verify` answers, with no session, either with a donor's read-only
summary **and a fifteen-minute token**, or with one indistinguishable failure message.

### 3.1 The route

New file `badhan-backend/src/tsoaControllers/PublicDonorsController.ts`. The precedent to copy is
[PublicContactsController.ts](../../badhan-backend/src/tsoaControllers/PublicContactsController.ts)'s
`GET`, which is already unauthenticated — `@Middlewares([rateLimiter.commonLimiter])` and no
`authenticator.handleAuthentication`.

```ts
@Route('publicDonors')
@Tags('Public Donors')
export class PublicDonorsController extends Controller {
  @Post('verify')
  @Middlewares([publicDonorValidator.validatePOSTVerify, rateLimiter.publicDonorLookupLimiter])
  public async verifyDonor(@Body() body: { phone: number, studentId: string }): Promise<{
    status: string, statusCode: number, message: string,
    donor?: { name, phone, studentId, bloodGroup, hall,
              donationCount, plateletDonationCount, lastDonation, lastPlateletDonation },
    token?: string, expiresInSeconds?: number
  }>
}
```

**It is a `POST`, not a `GET`, even though it reads.** A phone number and student ID in a query
string end up in access logs, proxy logs and browser history. A body does not.

Rules the handler must hold to:

- **No authentication middleware at all.** A donor scanning a printed QR sends no `x-auth` header
  and must still get 200.
- **The response contains exactly the nine fields in D10, plus the token.** Build the donor object
  field by field. Do **not** spread the Mongoose document, do not `toObject()` it, do not return
  `donor`. That is how addresses, comments and `archiveFlag` escape onto a public page.
- **The token's `hall` claim is read from the matched donor record** (D6), never from the request.
- **One failure message for every kind of failure.** No match, phone matched but student ID did not,
  student ID matched but phone did not, more than one record matched — all return **404** with the
  identical message: `Information does not match. Please contact a volunteer.` Anything that
  distinguishes these turns the endpoint into an oracle for probing which phone numbers exist.
  (§2.1, §7)
- **More than one match is a failure, not a pick-the-first.** `phone` is unique in the Donor schema
  so this should be unreachable, but duplicate records are exactly the mess `plan8.md` §7
  anticipates. Count the matches; if it is not exactly one, answer with the standard message.
- **Archived donors match normally.** Do not filter on `archiveFlag`. Archiving is a search
  behaviour, not a record state. (§7)
- **No log entry.** [logInterface.addLog](../../badhan-backend/src/db/interfaces/logInterface.ts)
  requires a user id and there is none here. Public reads are not logged — the rule the certificate
  endpoint already follows.
- **Donation counts come from the collections, not from a field.** Extra donations recorded at donor
  creation are materialised as real `Donations` rows, so `$size` of the joined arrays is the true
  count.

Add `findPublicDonorProfile(phone, studentId)` to
[donorInterface.ts](../../badhan-backend/src/db/interfaces/donorInterface.ts): a small aggregate
matching on both fields, `$lookup`ing `donations` and `plateletdonations`, computing the four
count/last-date fields, and `$project`ing the nine public fields **plus `hall`** for the token. Keep
it an **inclusion** projection, so a field added to the Donor schema later cannot leak by default.

### 3.2 Validation

New file `badhan-backend/src/validations/publicDonors.ts`, using the existing `validate([...])`
helper. Reuse [validateBODYPhone](../../badhan-backend/src/validations/validateRequest/validateBody.ts)
and `validateBODYStudentId` unchanged — they already pin the 13-digit `8801XXXXXXXXX` phone and the
7-digit student ID with department and batch checks. Malformed input therefore fails with the
project's standard 400 before the lookup happens.

### 3.3 Rate limiting

One **new** limiter in [rateLimiter.ts](../../badhan-backend/src/middlewares/rateLimiter.ts):

```ts
const publicDonorLookupLimiter: RequestHandler = rateLimit({
  windowMs: minute, max: 10 * rateLimiterEnabled, message: commonRateLimiterError
})
```

Why not reuse `commonLimiter`: it is shared by several authenticated routes, and this is the only
unauthenticated endpoint in the project where a wrong answer is *informative* to the caller. It
deserves its own budget so that tightening it later — the obvious response to an abuse report — does
not throttle signed-in volunteers. The shared `rateLimiterEnabled` multiplier keeps it loose in dev
and test automatically.

Two honest limitations, recorded rather than papered over:

- `express-rate-limit` is **in-memory and per instance**. Behind a multi-instance deployment the
  effective ceiling is `10 × instances`.
- It is keyed by IP, so one hall's NAT shares a bucket and an attacker with many IPs shares none. It
  raises the cost of guessing; it does not prevent it. The real control is D10 — there is little
  worth stealing in the payload.

### 3.4 Guest mode mirror

[GuestController.ts](../../badhan-backend/src/tsoaControllers/GuestController.ts) mirrors every real
route with faker data, because in guest mode `badhanAxios` has `/guest` glued onto its base URL. Add
`@Post('publicDonors/verify')` + `@Hidden()`, returning a faker donor and a real, mintable token —
guest mode should exercise the same code path, not a stub.

### 3.5 Tests (`badhan-backend-test/tests/publicDonors/`)

Use `operations.guestPost` from [lib/http.js](../../badhan-backend-test/tests/lib/http.js) — it sends
no `x-auth` header — and a JSON schema with `additionalProperties: false`, exactly as
[tests/certificates/schemas.js](../../badhan-backend-test/tests/certificates/schemas.js) does.

1. **No session → 200** with the summary and a token.
2. **The donor payload is exactly the nine fields.** `Object.keys(body.donor).sort()` deep-equals
   the list. This is the regression test that matters most; it fails loudly the day someone adds
   `address` "because the donor asked for it".
3. **The token verifies and carries the donor's hall, phone and student ID** — decode it in the test.
4. **Right phone, wrong student ID → 404**, standard message, **and no token in the body**.
5. **Wrong phone, right student ID → 404**, byte-identical to case 4.
6. **Neither matches → 404**, same again.
7. **Archived donor → 200** with correct counts.
8. **Counts are right** — create a donor with N extra donations plus a platelet donation and assert
   all four count/date fields.
9. **Malformed phone / student ID → 400** from the validator, never a 500.
10. **No rate-limit test.** `RATE_LIMITER_ENABLE` is off in the test environment, multiplying every
    limiter by 100; tripping this one would take 1000 sequential requests and the harness has no
    per-test way to flip the flag. The same reasoning is already recorded for the certificate suite.
    That the limiter is attached is visible in the controller source.

**Phase 3 is done when** `curl -X POST` returns the nine-field body and a decodable token with no
credentials, and the three failure cases are indistinguishable in body and status.

---

## Phase 4 — The registration token route

**Goal:** a signed-in member can mint a hall token of a chosen duration. This is the backend half of
journey B; nothing in the UI uses it yet.

### 4.1 The route

In `FeedbacksController.ts` (new file — the rest of it lands in phase 6):

```ts
@Post('registrationToken')
@Middlewares([feedbackValidator.validatePOSTRegistrationToken, rateLimiter.commonLimiter, authenticator.handleAuthentication])
public async postRegistrationToken(
  @Body() body: { hall: number, durationMinutes: number },
  @Request() req: any
): Promise<{ status, statusCode, message, token?: string, expiresAt?: number, hall?: number }>
```

Rules:

- **Volunteers and hall admins may only mint for their own hall.** If `body.hall` is anything else,
  answer **403** with the project's existing wording,
  `You are not authorized to access a donor of different hall`. Do not silently coerce it to their
  own hall — a member who picked the wrong hall should be told, not quietly corrected.
- **Super admins may mint for any hall**, mirroring
  [SearchController](../../badhan-backend/src/tsoaControllers/SearchController.ts)'s hall clause.
  Reuse `isHallRestricted` and `DESIGNATIONS_INDEX` rather than writing the comparison by hand.
- **Duration is clamped to `[1, 1440]` minutes** with a default of 240 (D7). The validator rejects
  anything outside; the service clamps again (phase 2.2).
- **Log it.** `logInterface.addLog(user._id, 'POST FEEDBACKS REGISTRATIONTOKEN', { hall, durationMinutes, expiresAt })`.
  Minting one of these creates a public write capability with no revocation (D7), so who created it,
  for which hall, and for how long is exactly the sort of thing a super admin will one day need to
  answer. **The token string itself is not logged** — logs are readable in the app, and a logged
  token is a live token.
- **Return `expiresAt` as a timestamp**, so the page can show "valid until 6:30 pm" without decoding
  the JWT.

### 4.2 Validation

`validateBODYHall` already exists and pins the allowed hall indices. Add:

```ts
export const validateBODYDurationMinutes: ValidationChain = body('durationMinutes')
  .optional()
  .isInt({ min: 1, max: 1440 }).toInt()
  .withMessage('durationMinutes must be an integer between 1 and 1440')
```

### 4.3 Guest mirror

`@Post('feedbacks/registrationToken')` + `@Hidden()`, returning a real token for a faker hall so the
generator page works under the guest login.

### 4.4 Tests

1. Volunteer mints for their own hall → 200, and the token decodes to that hall with
   `purpose: 'donorRegistration'`.
2. Volunteer mints for **another** hall → 403, no token in the body.
3. Hall admin behaves exactly like the volunteer in cases 1 and 2.
4. Super admin mints for any hall → 200.
5. Omitted `durationMinutes` → a token expiring in 4 hours.
6. `durationMinutes: 2000` → 400 from the validator.
7. `durationMinutes: 1440` → 200, expiring in 24 hours.
8. **A `POST FEEDBACKS REGISTRATIONTOKEN` log row exists and does not contain the token string.**
9. No session → 401.

**Phase 4 is done when** the matrix passes and a token minted by a volunteer decodes to their own
hall and nothing else.

---

## Phase 5 — The submit route

**Goal:** one public route accepts a token and a `feedbackJSON`, and writes one row. This is the only
write the public side can perform (D1).

### 5.1 The route

In `PublicDonorsController.ts`:

```ts
@Post('feedbacks')
@Middlewares([publicDonorValidator.validatePOSTFeedback, rateLimiter.feedbackSubmissionLimiter])
public async postFeedback(@Body() body: { token: string, feedbackJSON: any }):
  Promise<{ status, statusCode, message }>
```

The flow, in order:

1. **Verify the token** with `feedbackToken.verifyFeedbackToken`. Expired → **401**,
   `This link has expired. Please scan again or ask a volunteer for a new code.` Invalid → **401**,
   `This link is not valid.` These two are worth distinguishing — one is actionable by the person
   holding the phone, the other is not.
2. **Switch on `purpose`** (D4):

   | `purpose` | required `feedbackJSON.type` | `phone` / `studentId` on the row | `hall` on the row |
   | --- | --- | --- | --- |
   | `donorFeedback` | `'feedback'` | **from the token** | from the token |
   | `donorRegistration` | `'newDonor'` | **from `feedbackJSON`** | from the token |

   A mismatch between `purpose` and `feedbackJSON.type` is a **400**. A registration token must not
   be able to file a message on behalf of a donor, and a donor token must not be able to inject a
   registration.
3. **Validate `feedbackJSON` against its type** (phase 5.2).
4. **Insert the row** and return **201** with a message the page shows verbatim:
   `Thank you. Your message has reached the volunteers.`

Rules:

- **The hall always comes from the token** (D6). If `feedbackJSON` contains a `hall` — the
  registration form does — it is stored inside the JSON for the volunteer to read and has **no
  effect** on the row's `hall` column. Write this down in a comment at the assignment site; it is
  the single most likely thing for a later change to get wrong.
- **No per-donor cap** (D9).
- **No log entry** — no user id exists. The row is the record.
- **The write touches nothing but `feedbacks`** (D1). No donor is created, updated or looked up —
  not even to check whether a registration submission duplicates an existing donor. Duplicate
  detection already lives in the donor-creation form the volunteer will use (`handleGETDonorsDuplicate`
  in [NewPersonCard.vue](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue)),
  which is the right place for it: a human is there to decide.

### 5.2 Validating `feedbackJSON`

Flexible storage, strict edge (D3). Write the two validators as plain functions in the validator
module, selected by `type`:

**`type: 'feedback'`** — one field, `text`, a string of 1–500 characters after trimming. Nothing
else may be present.

**`type: 'newDonor'`** — the key list from phase 1.2, which is
[NewPersonCard.vue](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue)'s
`keysExpected`. Required: `name`, `phone`, `studentId`, `bloodGroup`, `hall`. Optional, defaulted if
absent: `address`, `roomNumber`, `comment`, `donationCount`, `lastDonation`,
`plateletDonationCount`, `lastPlateletDonation`, `availableToAll`. Validate each with the same rules
the real donor-creation route uses — a 13-digit phone, a 7-digit student ID with a valid department
and batch, a blood group in range — so that a submission which passes here is one the volunteer can
actually save later. **Unknown keys are rejected**, not silently dropped: a form sending a field the
server does not know about is a bug worth surfacing while it is still cheap.

And in both cases: **the whole serialised `feedbackJSON` must be under 4 KB.**

**Deliberately no `.escape()`, unlike the neighbouring `validateBODYComment`.** `.escape()` stores
HTML entities, so a donor writing `I can't donate` would be read by a volunteer as
`I can&#x27;t donate`. This text exists to be read verbatim by a human, so it is stored as typed.
Safety is enforced at render time instead, and that requirement is not optional:

> **Submitted text is rendered with Vue text interpolation only.** Never `v-html`, never
> `VueMarkdown` (which the donor *comment* field does use). Vue escapes `{{ }}` output, so stored
> markup cannot execute. State this in a comment beside every render site in phase 9.

### 5.3 Rate limiting

A second new limiter:

```ts
const feedbackSubmissionLimiter: RequestHandler = rateLimit({
  windowMs: minute, max: 6 * rateLimiterEnabled, message: commonRateLimiterError
})
```

Tighter than the lookup limiter because a registration token is a **bearer credential pinned to a
wall** (D7): anyone who has it can submit, for as long as it lives. Six a minute per IP is generous
for a queue of students at a desk and hostile to a script with a photographed QR.

### 5.4 Guest mirror

`@Post('publicDonors/feedbacks')` + `@Hidden()`, returning the same 201 without writing.

### 5.5 Tests

Journey A:

1. Verify → take the token → submit → **201**, and exactly one row exists with the donor's phone,
   student ID and hall.
2. **The stored text is byte-identical to what was sent**, including apostrophes, newlines and
   Bangla characters. This is the test that catches a stray `.escape()`.
3. 501 characters → 400; 500 characters → 201.
4. Empty / whitespace-only text → 400.
5. **An expired token → 401** with the expired message, and **no row is written**. Assert the
   absence, not just the status.
6. **Two submissions from the same donor both succeed** (D9) — this pins the decision so that
   re-introducing a cap becomes a visible, deliberate change.
7. **Nothing on the donor changed.** Read the donor back through an authenticated route and compare
   field by field with the pre-submission snapshot. This is the test that guards D1.

Journey B:

8. Registration token → `newDonor` submission → 201, and the row's `hall` is **the token's hall**,
   not the one in `feedbackJSON`. Send a *different* hall in the body specifically to prove D6.
9. The row's `phone` and `studentId` come from `feedbackJSON`.
10. **No donor was created** — count the donors before and after.
11. A `newDonor` payload missing `bloodGroup` → 400.
12. A `newDonor` payload with an unknown key → 400.

Cross-purpose, the tests that matter most:

13. **A `donorFeedback` token submitting `type: 'newDonor'` → 400.**
14. **A `donorRegistration` token submitting `type: 'feedback'` → 400.**
15. **A real session token used as the submission token → 401** (D8).
16. A token signed with the wrong secret → 401.

**Phase 5 is done when** both journeys write rows, neither can wear the other's hat, and nothing
outside `feedbacks` moved.

---

## Phase 6 — The volunteer-facing endpoints

**Goal:** signed-in members can list, count and discard the rows they are allowed to see. Still no UI.

### 6.1 The visibility rule — the one thing to get right

`plan8.md` §3.2 is explicit that **there is no new permission concept**: you see the feedback of the
donors you can already find in search.

| Viewer | Sees |
| --- | --- |
| Volunteer (1) | rows whose `hall` is their hall, rows whose `hall` is unrestricted, and rows whose phone+student ID match a donor with `availableToAll: true` |
| Hall admin (2) | the same |
| Super admin (3) | all |

Notes that decide the implementation:

- **The row's own `hall` column does most of the work** (D2, D6), so the filter is a plain match, not
  a join — which is why phase 1.1 indexes `{ hall: 1, date: 1 }`.
- **`hasNoSpecificHall` / `isHallRestricted`** from [constants](../../badhan-backend/src/constants/index.ts)
  already encode "a donor with no specific hall is visible to everyone". Reuse them; do not write
  `hall <= 6` by hand.
- **The `availableToAll` clause needs the donor join**, which the list performs anyway to render the
  card. Apply the `$match` *after* the `$lookup`. A journey-B row has no matching donor, so it falls
  through to the hall rule — correct, since a person who is not in the database cannot be marked
  available to all halls.
- **Filtering happens in the aggregate, not in the UI.** Another hall's row must never reach the
  browser — "greyed out" is not a thing here. (§3.2)
- **Archived donors are included.** No `archiveFlag` filter anywhere in this phase. (§7)

### 6.2 `GET /feedbacks`

```ts
@Get()
@Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
public async getFeedbacks(@Request() req: any): Promise<{
  status, statusCode, message,
  feedbacks?: Array<{ _id, phone, studentId, hall, feedbackJSON, date, donor: object | null }>
}>
```

- **Sorted oldest first** (`date: 1`), so nothing sinks to the bottom and rots. (§3.3)
- **Each row carries a donor-card payload, or `null`.** §3.1 requires the card to be *the same card*
  volunteers see in search results. Join the donor on `{ phone, studentId }` and then apply the same
  enrichment [generateAggregatePipeline](../../badhan-backend/src/db/interfaces/donorInterface.ts)
  performs for bookmarked donors — `donations`, `plateletdonations`, `callrecords`, `activedonors`,
  giving `donationCount`, `plateletDonationCount`, `lastDonation`, `lastPlateletDonation`,
  `lastCalled`, `callCountLast3Days`, `markerName`. Read that function before writing this one; the
  field names must match what
  [PersonCardNew.vue](../../badhan-frontend/src/components/PersonCardNew.vue) reads or the card
  renders blanks.
- **`donor: null` is a normal, expected value**, not an error — every journey-B row has one, and so
  does any row whose donor was deleted (D12). Phase 9 renders a fallback header for these.
- **Project the donor sub-object explicitly.** `password`, `email` and `designation` must not ride
  along; the bookmarked-donor pipeline shows exactly which fields to name.
- **No pagination.** The list is a work queue that volunteers are expected to empty. If it grows
  past a few hundred rows, the queue is not being worked, and pagination would hide that. Revisit
  only with evidence.
- **Log the read** with `logInterface.addLog(user._id, 'GET FEEDBACKS', { resultCount })`, matching
  what `/search/v3` does.

### 6.3 `GET /feedbacks/count`

Same middlewares, same visibility rule, `$count` instead of the enrichment, returning
`{ count: number }`. It exists so the sidebar badge (D16) costs a counted query rather than a full
enriched list on every app load. **No log entry** — it fires on every sign-in and would drown the log.

### 6.4 `GET /feedbacks/{feedbackId}`

One row, same visibility rule, used by phase 9's prefill so the donor-creation page can be opened
with a link that survives a reload. 404 when it is gone, 403 when it belongs to another hall.

### 6.5 `DELETE /feedbacks`

```ts
@Delete()
@Middlewares([feedbackValidator.validateDELETEFeedback, rateLimiter.commonLimiter, authenticator.handleAuthentication])
public async deleteFeedback(@Query() feedbackId: string, @Request() req: any)
```

Order of checks, and the answers:

1. **Row not found** (already discarded by someone else) → **404**,
   `This feedback has already been resolved.` This is §4.2's concurrent-discard case: the first
   volunteer wins, the second is told plainly. The frontend removes the card on this response as
   well as on success — the row is gone either way.
2. **Not visible to this user** (6.1's rule) → **403**,
   `You are not authorized to access a donor of different hall` — the project's existing wording.
3. Otherwise **delete the row**, then write the log:
   `logInterface.addLog(user._id, 'DELETE FEEDBACKS', { feedbackId, phone, studentId, hall, feedbackJSON, date })`.
   The **full submission goes into the log** so a discarded message can still be recovered by a
   super admin (§4.1). Write the log *after* a successful delete, so a failed delete leaves no
   misleading entry.
4. Return **200** with `Feedback discarded successfully`.

Add `validateQUERYFeedbackId` to
[validateQuery.ts](../../badhan-backend/src/validations/validateRequest/validateQuery.ts), copying
`validateQUERYDonorId`'s Mongo-id check, so a malformed id is a 400 rather than a cast error.

### 6.6 Guest mirrors

`@Get('feedbacks')`, `@Get('feedbacks/count')`, `@Get('feedbacks/{feedbackId}')`,
`@Delete('feedbacks')`, all `@Hidden()`, returning faker donors and one row of each `type`. Guest
mode is how the Feedback page gets demoed without touching real records — and it is the only way to
show the new-donor card without filing a real submission.

### 6.7 Tests

The visibility matrix is the point of this suite. Seed rows in several halls, then sign in as each
role:

1. **Volunteer sees their own hall's rows.**
2. **Volunteer does not see another hall's rows** — assert *absence from the array*, not a 403.
3. **Volunteer sees a row whose donor is `availableToAll`, whatever its hall.**
4. **Volunteer sees a row whose `hall` is unrestricted.**
5. **Hall admin behaves exactly like the volunteer** in cases 1–4.
6. **Super admin sees all of them.**
7. **A row whose donor was deleted still appears**, with `donor: null` (D12).
8. **A journey-B row appears** with `donor: null` and its `feedbackJSON.type === 'newDonor'`.
9. **Archived donor's row appears** for whoever can see that donor.
10. **Oldest first** — file three with distinct dates and assert the order.
11. **The card payload has the fields `PersonCardNew` reads**, and does **not** have `password`,
    `email` or `designation`.
12. **Count matches the list length** for each role.
13. **Discard removes the row**, returns 200, and writes a `DELETE FEEDBACKS` log containing the
    full `feedbackJSON`.
14. **Second discard of the same id → 404** with the already-resolved message.
15. **Cross-hall discard → 403**, and the row is **still there** afterwards.
16. **The donor is untouched by a discard** — compare the record before and after. (D11)

**Phase 6 is done when** the matrix passes and a volunteer cannot obtain another hall's row through
any of the four routes.

---

## Phase 7 — The public donor page

**Goal:** `/#/donor` works end to end for a donor with no account and no session — identity check,
read-only summary, message box, thank-you. Nothing links to it yet.

### 7.1 The route

Add to [router/index.ts](../../badhan-frontend/src/router/index.ts), before the `/*` catch-all:

```ts
{
  name: 'PublicDonor',
  path: '/donor',
  component: () => import('../views/PublicDonor.vue'),
  meta: { requiresAuth: false, title: 'Badhan Donor', designation: 0, reRouteIfAuthorized: false }
}
```

- **`requiresAuth: false` + `reRouteIfAuthorized: false`** is the combination
  [PublicContacts](../../badhan-frontend/src/views/PublicContacts.vue) and
  [Certificate](../../badhan-frontend/src/views/Certificate.vue) already use, so the existing
  `beforeEach` guard lets both signed-out and signed-in visitors through.
- **The router is in hash mode**, so nothing after `#` reaches Firebase Hosting and no rewrite rule
  is needed.
- **This path is frozen once phase 10 prints it** (D14). Change it now if it is ever going to change.
- The app bar renders only when a token exists ([App.vue](../../badhan-frontend/src/App.vue)), so an
  anonymous donor gets a bare page for free.

### 7.2 The API calls

Add to [api/index.ts](../../badhan-frontend/src/api/index.ts), following the file's existing
try/catch-and-return-`e.response` shape:

```ts
const handlePOSTPublicDonorVerify = async (payload: { phone: number, studentId: string }) => …
const handlePOSTPublicFeedback   = async (payload: { token: string, feedbackJSON: object }) => …
```

Use `badhanAxios` so guest mode and the interceptors keep working; the `x-auth` header is simply
empty for anonymous visitors and the endpoints ignore it.

### 7.3 The page

`badhan-frontend/src/views/PublicDonor.vue`, three states in one component:

**State 1 — the form.** Two fields: phone (11 digits, local `01XXXXXXXXX` form) and student ID
(7 digits). The app's convention is that the user types 11 digits and the client prefixes `88` —
[PersonDetails.vue:1110](../../badhan-frontend/src/components/PersonDetails.vue#L1110) and
[NewPersonCard.vue:421](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L421)
both do `Number('88' + phone)`. Do the same; do not ask a donor to type a country code. Client-side
validation mirrors the server's, with vuelidate as elsewhere.

On failure show exactly one message, whatever went wrong:
**"Information does not match. Please contact a volunteer."** Never hint at which field was wrong,
and never echo the typed values back.

**State 2 — the summary and the box.** A read-only table of the nine fields from D10, in the order
`plan8.md` §2.2 lists them, with blood group and hall run through the existing display filters
(`getBloodGroupString`, `getHallName`) and the two dates formatted as dates. No input, no edit
button, no link into the app. Below it:

- a `textarea`, `maxlength="500"` with a visible character counter;
- the four example messages from §2.3, as static hint text;
- a **Submit** button, disabled while empty or in flight.

**The token lives in component state only** — never `localStorage`, never the URL, never a cookie.
It dies with the page, which is the point of a fifteen-minute lifetime.

**Handle the token expiring while the donor is typing.** Fifteen minutes is generous, but a phone
that goes to sleep mid-sentence spends the whole window doing nothing, so this path is still reached.
On a 401 from the submit call, do not throw the message away: return to state 1 with the typed text
preserved and an explanation — *"That took a little too long. Please enter your phone number and
student ID again; your message is still here."* Re-verifying re-mints a token and the same text is
submitted. **A donor who loses their words to an expiry will not type them a second time**, and this
is the most likely everyday failure in the whole feature.

**State 3 — thank you.** The server's 201 message, and nothing else to click. Do not auto-return to
the form; a donor who submits twice by accident is a nuisance the design should not invite.

Also: set `document.title`; make the page readable on a phone at a glance, since every visitor
arrives from a phone camera; keep a network-error state distinct from the mismatch state. **Every
string on this page is English** (D18) — no Bangla line beside the labels, no toggle.

### 7.4 Tests (`badhan-frontend-test/cypress/e2e/feedback/public-donor-page.cy.ts`)

Signed **out** — make sure no support command silently signs the test in:

1. Seeded donor, correct pair → the nine fields are on screen with the right values.
2. **None of the forbidden fields is anywhere in the DOM** — address, room number, email, comment.
   Assert on the page body text, so a stray debug render is caught too.
3. Wrong student ID → the standard message; wrong phone → the *same* message.
4. Submit → thank-you state, and (through an authenticated API call) the row exists.
5. 500 characters submits; the textarea refuses the 501st.
6. **Expired token path**: stub the submit call to 401 and assert the typed text survives the return
   to state 1.
7. Nothing on the page mutates the donor: read the donor back after submitting and compare.

**Phase 7 is done when** a phone in a private window, with no session, completes the whole journey.

---

## Phase 8 — The public registration page

**Goal:** `/#/register?t=<token>` lets a student who is not in the database submit their own details.
Nothing links to it yet; the QR that carries the token arrives in phase 10.

> This phase implements journey B, which `plan8.md` does not describe. It exists because the
> collection, the token service and the submit route were all built to carry it (D2–D5), and
> building the page now is what proves that generality is real rather than aspirational.

### 8.1 The route

```ts
{
  name: 'PublicRegistration',
  path: '/register',
  component: () => import('../views/PublicRegistration.vue'),
  meta: { requiresAuth: false, title: 'Register with Badhan', designation: 0, reRouteIfAuthorized: false }
}
```

The token travels as `?t=<jwt>`. It is a capability, not a secret about a person: it names a hall and
an expiry and nothing else (D5), which is why it is safe in a URL, in a QR code and in a browser
history.

### 8.2 The page

`badhan-frontend/src/views/PublicRegistration.vue`. Do not import `NewPersonCard`: it carries
duplicate-checking, donation counts and a save button wired to authenticated routes. Copy its
**validation rules**, not its component — and not its layout either, because per **D19** this page
is not a form at all.

**One question per screen** (D19). The page holds an `answers` object and a `step` index, and renders
exactly one question component at a time. Answering advances the step; the previous question's
component is replaced, not stacked. Nothing is sent to the server until the last step.

The sequence, one screen each:

| # | Question | Field | Validation at this step |
| --- | --- | --- | --- |
| 1 | What is your name? | `name` | non-empty after trimming |
| 2 | What is your student ID? | `studentId` | 7 digits, valid department and batch — the same rules as `validateBODYStudentId` |
| 3 | What is your phone number? | `phone` | 11 digits, `01XXXXXXXXX`; the client prefixes `88` exactly as phase 7.3 does |
| 4 | What is your blood group? | `bloodGroup` | one of the eight, chosen from buttons — not a dropdown, not free text |
| 5 | Which hall are you in? | `hall` | prefilled from the token, changeable; see below |
| 6 | What is your room number? | `roomNumber` | optional — a **Skip** control, not an empty Next |
| 7 | What is your address? | `address` | optional, same |
| 8 | Anything else we should know? | `comment` | optional; the hint line invites prior donation history here (D19) |

Then a **review screen**: every answer listed with an edit control that jumps back to that step, and
one **Submit** button. This is the only place the whole thing can be sent, and it is the answer to
the obvious objection to a wizard — that you cannot see what you are about to send.

Rules for the sequence:

- **`donationCount`, `lastDonation`, `plateletDonationCount` and `lastPlateletDonation` are never
  asked** (D19). Send them at their defaults — `0`, `null`, `0`, `null` — so the payload still
  matches the `newDonor` key list from phase 1.2 exactly and phase 5.2's unknown-key rejection stays
  strict. `availableToAll` is likewise `false` and unasked; it is a volunteer's decision, not a
  student's.
- **Back is always available** except on step 1, and going back must not clear the answer already
  given. A student who mistypes a digit and notices two screens later should not restart.
- **Show progress** — "3 of 8" or a thin bar. A sequence with no visible end is one people abandon.
- **Validate at the step, not at the end.** The step's Next button is disabled until its own answer
  is valid, which is the main thing this shape buys over a single form.
- **One `Enter` keypress advances a text step.** Most of these are one-handed on a phone.
- **The whole sequence is English** (D18).

Four states wrap the sequence:

| State | Shown |
| --- | --- |
| No `t` at all, or a malformed one | "This link is not valid. Please ask a volunteer for the QR code." — and **no first question**; do not let a student answer eight screens and fail at submit |
| Token expired (401 on submit, or an expiry visible client-side) | "This QR code has expired. Please ask a volunteer for a new one." |
| Ready | the sequence, starting at step 1 |
| Submitted | a thank-you, and a plain sentence that a volunteer will add them and this is not an account |

Two details worth getting right:

- **The hall (step 5).** The token's hall decides who sees the submission (D6) and the student cannot
  change that. The step is **prefilled from the token and changeable**, because a student standing at
  another hall's desk should still be able to say where they actually live — that value goes into
  `feedbackJSON` for the volunteer to read and use when creating the donor. Say so on that screen in
  one line, so nobody thinks they are choosing which volunteers get it.
- **Decode the expiry client-side for display only** — "this form is open until 6:30 pm" — but never
  trust it. The server is the authority; the client-side read exists so the page can fail early and
  kindly instead of after a student has answered eight questions. **Re-check it at the review screen
  too**: the sequence takes minutes, and finding out at submit is the one place this shape is worse
  than a form.

### 8.3 Tests

1. A valid token → **step 1 renders, and only step 1** — assert the student-ID and phone inputs are
   absent from the DOM, which is what pins D19 against a later "simplify" into one form.
2. Walking the whole sequence reaches the review screen with every answer shown, then Submit →
   thank-you, and an authenticated API read shows the row with `type: 'newDonor'` and the **token's**
   hall in the `hall` column.
3. **Nothing is submitted before the last step.** Abandon the sequence at step 4 and assert through
   an authenticated read that no row exists.
4. **Back preserves answers** — advance three steps, go back two, and assert the fields still hold
   what was typed.
5. An invalid answer keeps Next disabled and does not advance.
6. Step 5's hall is prefilled from the token; changing it changes `feedbackJSON.hall` and **not** the
   row's `hall`.
7. The submitted `feedbackJSON` carries `donationCount: 0`, `lastDonation: null`,
   `plateletDonationCount: 0`, `lastPlateletDonation: null` and `availableToAll: false` even though
   no screen asked for them (D19) — and the submission is **accepted**, proving the payload still
   satisfies phase 5.2's key list.
8. No `t` → the invalid-link state, and **no step 1**.
9. An expired token → the expired state.
10. **No donor is created** — count donors before and after.

**Phase 8 is done when** a signed-out browser with a valid token can answer its way through the
sequence, and the row lands in the right hall's queue.

---

## Phase 9 — The Feedback page, prefill, and the manual

**Goal:** the first thing existing users see. A **Feedback** entry in the sidebar with a count, a
page of cards, a working Discard, and a one-click path from a registration submission to a prefilled
donor-creation form.

### 9.1 The route

```ts
{
  name: 'Feedback',
  path: '/feedback',
  component: () => import('../views/Feedback.vue'),
  meta: { requiresAuth: true, title: 'Feedback', designation: 1, reRouteIfAuthorized: false },
  children: [{
    name: 'FeedbackDetails',
    path: 'details',
    component: Details,
    meta: { title: 'Donor Details', requiresAuth: true, designation: 1, reRouteIfAuthorized: false }
  }]
}
```

The child route reuses the shared [Details.vue](../../badhan-frontend/src/views/Home/Details.vue)
exactly as `ActiveDonors` does, so "See profile" opens the donor's full profile over the list and
the volunteer can do the actual work (§4 step 2) without losing their place.

### 9.2 The page

`badhan-frontend/src/views/Feedback.vue`, modelled on
[ActiveDonors.vue](../../badhan-frontend/src/views/ActiveDonors.vue): `PageTitle`, a `Reload`
button, `LoadingMessage` while fetching, a `max-width: 700px` column of cards, and `<router-view>`
for the details child.

**Three card shapes, one wrapper.** `views/Feedback/FeedbackCard.vue` dispatches on
`feedbackJSON.type` and on whether `donor` is null:

**(a) A message from a known donor** (`type: 'feedback'`, `donor` present) — the common case.

- **The top is `PersonCardNew` verbatim**, given the row's `donor` object and
  `:detailsBasePath="'/feedback'"`. §3.1 asks for the card volunteers already know; the way to
  deliver that is to use the component, not to imitate it. Everything it offers — the call button,
  the expansion, See profile, even adding a donation date straight from the card — keeps working,
  which is precisely the workflow §4 describes.
- Below it: the message rendered with `{{ }}` and `white-space: pre-wrap` (never `v-html`, never
  `VueMarkdown` — see phase 5.2), the submission time via `new Date(date).toLocaleString()`, and
  **Discard**.

**(b) A message from an unknown donor** (`type: 'feedback'`, `donor` null) — a deleted donor, per
D12, or a phone/student ID that no longer matches.

- A plain header instead of the card: the phone, the student ID, the hall, and one line —
  *"No donor record matches this phone number and student ID."*
- The message, the time, and **Discard**.

**(c) A registration submission** (`type: 'newDonor'`).

- A header that says clearly what it is — *"New donor submission"* — followed by the submitted
  fields laid out for reading: name, phone, student ID, blood group, the hall they stated, room,
  address, comment.
- Two buttons: **Create donor** and **Discard**.

Common to all three:

- **Discard is confirmed first**, through the existing
  [confirmationBox](../../badhan-frontend/src/store/confirmationBox.ts) store the rest of the app
  uses. The wording must say what actually happens (§4.1): the message is deleted permanently and
  nothing is added to any donor's record.
- **On 200 or 404** remove the card — 404 means someone else discarded it first, which §4.2 says
  should be a calm message, not an error. Decrement the sidebar count on both.
- **Empty state:** a plain "No feedback is waiting."

### 9.3 The prefill

**Create donor** navigates to `/singleDonorCreation?feedbackId=<id>`.

[SingleDonorCreation.vue](../../badhan-frontend/src/views/SingleDonorCreation.vue) currently builds
its draft in `reset()` and passes it to `NewPersonCard` as the `donor` prop. That component already
hydrates every field from the draft and warns about unexpected or missing keys
([NewPersonCard.vue:347](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L347)),
so the prefill is a **draft-shaped object, not a new code path**:

- On mount, if `$route.query.feedbackId` is present, call `GET /feedbacks/{feedbackId}` (phase 6.4)
  and build the draft from `feedbackJSON` — the keys already match `keysExpected`; add `key` and
  default anything absent exactly as `reset()` does. Otherwise call `reset()` as today.
- **Fetch by id rather than passing the data through the router or the store.** A query parameter
  survives a reload and a shared link; a store handoff does not, and a volunteer who refreshes
  mid-typing should not lose the submission.
- **A 403 or 404 falls back to the blank form** with a notification, rather than a broken page.
- **Nothing is auto-saved.** The volunteer reviews every field and presses the existing save button.
  The duplicate check that already runs on the phone field
  ([NewPersonCard.vue:144](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L144))
  now earns its keep — a student registering themselves twice at two events is exactly what it
  catches.
- **The feedback is not discarded automatically** (D13). After saving, the volunteer returns to the
  Feedback page and discards it. Say so on the page, in one line under the save button, or the row
  will sit in the queue looking unhandled.

### 9.4 The sidebar and the count

In [AppBar.vue](../../badhan-frontend/src/components/AppShell/AppBar.vue)'s `menusForAll`, between
Bookmarked Donors and Donor Creation:

```js
{ icon: 'mdi-message-alert', text: 'Feedback', to: '/feedback', id: 'feedbackNavigationId', designation: 1 }
```

The count rides on the entry as a `v-badge` or a trailing chip. The menu loop currently renders only
an icon and text, so it needs one small conditional — keep it data-driven (a `badgeCount` property
read from the store) rather than special-casing the string `'Feedback'`.

New Vuex module `badhan-frontend/src/store/feedback.ts`, registered in
[store.ts](../../badhan-frontend/src/store/store.ts) beside the others: state `{ unresolvedCount: 0 }`,
an action calling `GET /feedbacks/count`, and mutations to set and decrement it. Per D16 it is
refreshed when the app bar mounts, when the Feedback page loads, and after each discard — **no
polling**. Reset it to 0 on sign-out with the rest of the session state.

### 9.5 The manual

Per [CLAUDE.md](../../CLAUDE.md), behaviour changes ship with documentation in the same change.

**A new chapter: `docs/manual/20-donor-feedback.md`.** The manual runs 01–19 with the glossary last,
and renumbering to slot a chapter in the middle would break every existing cross-reference for
cosmetic gain. A new chapter is appended instead, and the README index lists it under "Everyday
work" where a reader looks for it. Write the QR half in phase 10; write these parts now, in the
voice of the existing chapters, for readers with no technical background:

- What the public page is, and that donors need no account and no login.
- What a donor sees and types, and that they **cannot change anything** from it.
- What the Feedback page is, how to reach it, and what the number beside it means.
- **The three steps** of §4: read it, do the work on the donor's profile, then discard.
- **Discard does nothing by itself** — it does not add a donation, does not change a phone number,
  does not archive anyone. It deletes the message. Say this twice; it is the single most likely
  misunderstanding.
- That discard is **permanent and cannot be undone**, though a super admin can still find what was
  discarded in the logs.
- Which rows you see and which you do not (§3.2's table), stated as "the donors you can find in
  search".
- That two people discarding the same message is harmless.
- That a donor gets no reply — their confirmation is scanning again later and seeing updated numbers.
- **New donor submissions**: what the card looks like, that **Create donor** opens the normal
  creation form already filled in, that every field should be checked before saving, and that the
  submission still has to be discarded afterwards.
- That a student answers the registration questions **one at a time on their phone** and nothing
  reaches Badhan until they finish, so a student who says they filled it in but whose card never
  appeared most likely stopped partway — ask them to scan again (D19).
- That a new-donor card **never carries donation history**, because the student is not asked for it
  (D19). If they have donated before, it will be in their comment, in their own words, and the
  volunteer enters the real numbers when creating the donor.
- That both public pages are **in English** (D18), so a volunteer helping a student at a desk knows
  what they are looking at.
- That a card sometimes shows a phone number with no donor attached — because the donor was deleted,
  or because they were never in the database — and that discarding it is the right response.

Then wire it in:

- Add the chapter to the [manual README index](../manual/README.md).
- Add "feedback", "the public donor page", "registration QR code" and "QR code" to
  [19-glossary.md](../manual/19-glossary.md).
- Add the new sidebar entries to
  [05-the-screen-and-the-menu.md](../manual/05-the-screen-and-the-menu.md).
- Add the feedback visibility row to
  [04-roles-and-permissions.md](../manual/04-roles-and-permissions.md).
- Cross-reference from [11-adding-new-donors.md](../manual/11-adding-new-donors.md): registration
  submissions are now a third way a donor gets created, alongside the single form and the CSV
  upload.

### 9.6 Tests (`badhan-frontend-test/cypress/e2e/feedback/`)

1. Signed in as a volunteer with a seeded message: the sidebar shows **Feedback** with the right
   count, the page lists the card, and the card shows the donor's name and the message text.
2. **A message containing `<script>` or markdown renders as literal text** — the anti-`v-html` test.
3. Discard → confirmation → the card disappears, the count drops, and an authenticated API read
   confirms the row is gone.
4. Cancelling the confirmation leaves everything alone.
5. **A volunteer never sees another hall's row**, seeded through the API.
6. **See profile** opens the donor profile with the right id.
7. A row with `donor: null` renders the fallback header, not a broken card.
8. **A `newDonor` row renders the registration card**, and **Create donor** lands on
   `/singleDonorCreation?feedbackId=…` **with every field already filled in** — assert the field
   values, not just the URL.
9. **Saving the prefilled form creates the donor, and the feedback row is still there** (D13).
10. Add `goToFeedback()` to
    [NavigationDrawer.ts](../../badhan-frontend-test/cypress/support/pages/NavigationDrawer.ts),
    matching the existing helpers.

---

## Phase 10 — The two QR surfaces and the scan gate

**Goal:** volunteers can produce both codes — the permanent printed sheet for journey A, and a
time-limited registration code for journey B — and the printed one, on real paper, works.

**This is a deliberately small phase.** Per D15 there is no poster, no artwork and no design work:
one caption, one QR, white paper. Everything below that reads like ceremony — a millimetre layout
module, a vector QR, a physical scan gate — is there because the output is *printed*, and printed
mistakes cannot be recalled.

### 10.1 The routes and the sidebar entries

```ts
{ name: 'FeedbackQr', path: '/feedbackQr', component: () => import('../views/FeedbackQr.vue'),
  meta: { requiresAuth: true, title: 'Print Poster', designation: 1, reRouteIfAuthorized: false } }

{ name: 'RegistrationQr', path: '/registrationQr', component: () => import('../views/RegistrationQr.vue'),
  meta: { requiresAuth: true, title: 'Donor Registration QR', designation: 1, reRouteIfAuthorized: false } }
```

Sidebar, both at designation 1:

```js
{ icon: 'mdi-qrcode', text: 'Print Poster', to: '/feedbackQr', id: 'posterNavigationId', designation: 1 }
{ icon: 'mdi-account-plus-outline', text: 'Donor Registration QR', to: '/registrationQr', id: 'registrationQrNavigationId', designation: 1 }
```

The first entry stays worded **Print Poster** because that is what `plan8.md` §1.2 names it and what
volunteers will be told to look for; only the artefact behind it got smaller.

### 10.2 The printed sheet (journey A)

`badhan-frontend/src/views/FeedbackQr.vue` plus `views/FeedbackQr/FeedbackQrArtwork.vue`,
`feedbackQrLayout.ts` and `feedbackQrPdf.ts`, mirroring
[views/Certificate/](../../badhan-frontend/src/views/Certificate/) file for file. That directory
already solved every problem this phase has, and three of its conventions carry over unchanged:

- **A fixed `viewBox` of `0 0 210 297`** — A4 portrait in millimetres, which makes the SVG→PDF
  mapping 1:1 and removes an entire class of scaling bug.
- **One source of truth for layout** — the handful of millimetre positions live in
  `feedbackQrLayout.ts` and are consumed by both the SVG component and the PDF builder. Two
  hand-maintained layouts drift, and they drift onto paper.
- **Fonts: `Helvetica, Arial, sans-serif`** — one of jsPDF's standard 14, so `svg2pdf.js` resolves it
  with no `addFileToVFS`, no base64 TTF and no risk of a silent fallback. This is available only
  because D15 made the caption English; do not add Bangla text to this sheet without also adding a
  font, and prefer not adding either.

The complete contents, per D15: the caption **"Scan to submit feedback to Badhan BUET Zone"**,
centred, and the **QR code** beneath it. That is the whole list. No logo, no border, no hall name, no
readable URL, no Bangla line. If the page renders anything else, it is wrong.

The QR:

- `qrcode` is already a dependency; `import()` it dynamically inside the view exactly as
  [Certificate.vue:146](../../badhan-frontend/src/views/Certificate.vue#L146) does, and use
  `qrcode.create()` to get the module matrix so the artwork can draw vector rectangles.
- **It encodes the absolute `/#/donor` URL** (D17), built from
  `environmentService.getFrontendBaseURL()` with trailing slashes stripped — **not**
  `window.location.href`, which on this page is the generator route.
- Error correction **M**, quiet zone ≥ 4 modules, pure black on pure white, **at least 80 mm
  printed**. With nothing else competing for the page there is no reason to be shy. Nothing may
  overlap it.

The PDF: A4 portrait, one page, filename `Badhan-Feedback-QR.pdf`, byte-identical for every
volunteer (D15). `jspdf` and `svg2pdf.js` are **dynamically imported on button click**, so the route
does not pull ~500 KiB until someone downloads.

### 10.3 The registration code (journey B)

`badhan-frontend/src/views/RegistrationQr.vue` — a generator, not a document:

- **Hall**: fixed to the member's own hall and shown read-only for volunteers and hall admins; a
  selector for super admins. This mirrors phase 4.1's server rule, which is the authority — the UI
  restriction is convenience, not enforcement.
- **Duration**: a selector with a few sensible values (1, 2, 4, 8, 24 hours), defaulting to 4 (D7).
- **Generate** calls `POST /feedbacks/registrationToken` and renders the QR **on screen, large**.
  On-screen is the primary use, and it has two shapes: a laptop or phone propped on a desk, and
  **a code projected on a slide at a new-intake event** so an entire room scans at once. The second
  is the one that matters most — it is the difference between one volunteer typing a hundred
  students in and a hundred students entering themselves — and it sets the requirements:
  - **A full-screen mode.** One control that hides the app chrome, the form and the expiry text and
    fills the viewport with the code on white. A QR competing with a sidebar for a projector's
    pixels is a QR the back row cannot scan.
  - **Pure black on pure white, no grey, no rounded modules, no logo in the middle.** Projectors
    wash out contrast, and a hall's screen is rarely clean.
  - The code must stay square and centred at any aspect ratio, since the projector's is not the
    laptop's.

  Outside full-screen, show the expiry in plain words — *"This code stops working at 6:30 pm
  today."*
- **Download PDF** reuses `feedbackQrPdf.ts` with a different caption
  (*"Scan to register as a blood donor with Badhan BUET Zone"*) for events where a printed copy is
  easier. The same A4 portrait layout; no new pipeline. English caption, per D18 and D15.
- **A warning line, always visible:** anyone who has this code can submit until it expires, and it
  **cannot be cancelled** (D7). Generate a short one for a short event.
- The QR encodes `<frontend base>/#/register?t=<token>` (D17). Keep an eye on density: a JWT is
  200–300 characters, which pushes the code to a higher version with smaller modules. If it scans
  poorly at 80 mm, shorten the claim names before enlarging the code.

### 10.4 The scan gate — not optional

This is the acceptance test for the phase, and it is physical. **Run it against production**, or
against a build served from the production origin: per D17 the QR carries whatever host produced it,
so a staging print tests nothing that will be true of real paper.

1. Download the journey-A PDF on a desktop browser.
2. **Print it on real paper.**
3. Pin it at eye level and scan the QR **from the paper**, with a real phone camera, at the distance
   someone actually stands from a notice board, in ordinary corridor light.
4. Confirm the public page opens, and complete one real identity check and one real submission on
   the phone.
5. Repeat the download on **Android and iOS** — mobile download behaviour differs enough to be its
   own bug source.
6. **Separately, scan a generated registration QR off a laptop screen** with a phone and complete
   the sequence. Screen-scanning is the normal use for that one, so test it the way it will be used.
7. **Then scan it off a projector**, in full-screen mode, from the back of a room — the new-intake
   case (§২ক.১). A projected code is dimmer, lower-contrast and further away than anything else
   this feature produces, and the failure is public: a hall full of students who cannot scan.
   Test it in a room with the lights on, which is how orientations actually run.

Record the printer, paper size, phone models and OS versions. If the paper scan fails, the QR
geometry is not the first suspect — an automated test decodes it — so look at printed size, contrast
and paper quality first.

### 10.5 Tests

- Clicking Download produces `Badhan-Feedback-QR.pdf` beginning with `%PDF-`.
- **The QR is rasterised and decoded with `jsQR`** (already a test-only devDependency, used by
  [decodeQr.ts](../../badhan-frontend-test/cypress/support/helpers/decodeQr.ts)) and the decoded
  string is asserted to be exactly the `/#/donor` URL. Existence and bounding-box checks would all
  still pass if the module grid were transposed or off by a row — and a subtly wrong code prints,
  goes on a wall, and never scans.
- **The registration QR decodes to `/#/register?t=…`, and the token in it decodes to the expected
  hall and expiry.**
- The `viewBox` is `0 0 210 297`, and the QR's rendered box is ≥ 80 mm square.
- The caption text is exactly the string in D15.
- The download button is **outside** the artwork SVG, so it cannot reach the PDF.
- A volunteer's registration page shows their own hall read-only; a super admin's shows a selector.
- **Full-screen mode hides the app chrome and the form**, and the QR still decodes to the same
  `/#/register?t=…` string it did before entering it.
- Inspect one generated PDF by hand: `MediaBox` of `0 0 595.28 841.89` pt, one page, no embedded
  font file, no raster image at all, QR vector.

### 10.6 The manual

Complete `20-donor-feedback.md`: how to open **Print Poster**, download, print and pin it; that the
sheet is the same for every hall, so one download serves everyone; that the link on it is safe to
share in Facebook and WhatsApp groups (§7); that it must be printed from the real app, not a test
copy, or the QR leads nowhere. Then the registration code: what it is for, how to generate one, how
to choose a duration, that **it cannot be cancelled once made**, and that submissions from it arrive
in the Feedback page as new-donor cards. **Give the new-intake case its own short passage**, since
it is the one that earns the feature: put the code on a slide at orientation, use full-screen, pick
a duration that covers the session, and let the whole room enter itself. Add one line for the
volunteer standing at the desk: the
student is answering **one question per screen and can go back**, so "it is still asking me
things" is the form working, not stuck.

---

## Phase 11 — Full suite, build, and rollout

1. `docker compose exec backend npx tsc --noEmit`
2. `docker compose exec backend npm run tsoa:routes` — a build step; `src/tsoaRoutes/` is gitignored
   and produces no diff.
3. `docker compose build backend-test` then `docker compose run --rm backend-test` — the **full**
   backend suite, not only the new tests.
4. `docker compose exec frontend npm run build`, and **check the bundle**: `qrcode`, `jspdf` and
   `svg2pdf.js` must all sit behind dynamic imports on the QR routes. Grep the built chunks rather
   than eyeballing sizes; if `app.js` grew noticeably, an import escaped. Nothing else should have
   grown — per D15 the sheet embeds no font and no image.
5. `docker compose run --rm frontend-test` — the full Cypress suite.
6. Re-run the **physical scan gate** (10.4) against a build produced from the final merged code.

`./deploy` runs both suites and refuses to deploy if either fails, so steps 3 and 5 are enforced by
the deploy path. Step 6 is not, and cannot be.

**Branching, commits and merges are not this document's business.** The phase ordering is a build
and rollout order — what must work before the next thing is written, and what must be true before
paper is printed — not a prescription for how the work is packaged into commits. That is the
repository owner's call.

### Rollout notes

- **`index.html` must stay uncached.** A printed QR points at `badhan-buet.web.app/#/donor` for as
  long as the sheet is on the wall; a stale cached `index.html` breaks the route for exactly the
  people it was printed for.
  [firebase.badhan-buet.json](../../badhan-frontend/firebase.badhan-buet.json) already sets
  `no-cache` on `/**` and `immutable` on hashed assets, and Firebase applies the *last* matching
  rule — correct as it stands; do not reorder those blocks.
- **Do not change the domain or the `/donor` path** after the first sheet is printed (D14, D17).
- **Tell volunteers before the sheets go up.** The Feedback page has to be someone's habit before
  donors start filling it, or the first messages sit unread for weeks and the feature teaches donors
  that nobody is listening. Phase 9 ships before phase 10 for exactly this reason; give it a week
  and a message in the volunteers' group before paper reaches a notice board.
- **Introduce the registration QR at one event first.** It is the newer half and the one with a
  bearer credential in it (D7). One hall, one afternoon, a 4-hour token, and a look at what actually
  lands in the queue before it is handed to everybody.
- **Watch the first fortnight's volume.** D9 removed the per-donor cap on the strength of expected
  behaviour, not measurement. If a single donor or a leaked registration QR floods a queue, the fix
  is small and known.

---

## Appendix A — Risks carried forward

| Risk | Standing decision |
| --- | --- |
| Anyone who knows a phone number **and** a student ID can read that donor's summary | Intentional and stated in §2.1. Mitigated by payload starvation (D10), enforced by the exact-nine-fields test in phase 3.5. |
| Guessing phone/ID pairs at scale | `publicDonorLookupLimiter`, 10/min/IP, on the identity-check route (phase 3.3). In-memory and per instance — a known weakness, defence in depth rather than the primary control. |
| The submit route as a second guessing oracle | **Eliminated** by D5: the submit route reads phone and student ID from the token for journey A and never matches a pair. This is the main gain from moving to tokens. |
| A leaked registration QR | Accepted (D7). No revocation. Default 4 h, ceiling 24 h. Blast radius is junk rows in one hall's queue — no donor data exposed, nothing created. The fix, if it ever happens, is a `jti` plus a denylist. |
| A feedback token used as a session token, or vice versa | Blocked by the mandatory `purpose` claim (D8) and by `authenticate.ts`'s `Tokens` lookup. Both directions are tested (phases 2.4, 5.5). **No separate signing key** (D8), so those two checks are the whole separation — weakening either re-opens the decision. |
| A donor's fifteen-minute token expiring while they type | The most likely everyday failure. Handled in phase 7.3: the typed text survives, the donor re-verifies, the same message is submitted. Not handled well, this loses donors' words and they do not retype them. |
| A flood of submissions | Accepted (D9). No per-donor cap; only the IP limiters and the 4 KB / 500-character caps. Watch the first fortnight. |
| A volunteer discards a message before acting on it | Unfixable in software — Discard deletes and nothing else (D11, §4.1). Mitigated by the confirmation dialog, by the full submission being written to the log, and by the manual saying so twice. |
| Submitted text is attacker-controlled and rendered in the app | Stored raw on purpose (phase 5.2). Safe only because it renders through Vue text interpolation. **`v-html` or `VueMarkdown` on this field is a security bug**, pinned by a Cypress test. |
| Rows with no matching donor accumulate | Expected, not a bug (D12, journey B). The page renders a fallback header and the volunteer discards. `plan8.md` §7's cascade promise is withdrawn. |
| A registration submission duplicates an existing donor | Caught by the duplicate check already running in the donor-creation form (phase 9.3), with a human present to decide. Deliberately not checked at submission time (D1). |
| **Printing from a non-production host** | D17: the QR carries the configured frontend base URL, so a sheet downloaded from dev or staging encodes a host that dies with that environment — and paper on a wall cannot be recalled. Process control only: print from `badhan-buet.web.app`, and run the scan gate against production. |
| Domain or `/donor` path change | Every printed sheet dies. Accepted knowingly (D14). |
| The sheet is English-only, and its readers mostly read Bangla | Accepted (D15). The caption is short and a QR needs little explanation. If people do not scan it, the fix is a Bangla caption — which costs an embedded font and a re-run of the scan gate. A deliberate follow-up, not a gap. |
| **The public pages are English-only, and their readers mostly read Bangla** | Accepted (D18), and a larger version of the row above: a caption is one line, but `/#/register` is eight questions. The signal is submissions that start and stop partway through, which phase 8 cannot see — nothing is stored before the last step (D19). If uptake is poor, translating these two files is a contained follow-up with no font cost and nothing irreversible. |
| **A student abandons the registration sequence partway** | Structural to D19: nothing is submitted until the review screen, so an abandoned sequence leaves no row and no trace. Mitigated by a visible step counter, per-step validation, working Back, and Skip on the three optional steps. If abandonment is suspected, the shape to compare against is a single scrolling form — not a partial-save endpoint, which would put unfinished personal data on the server for no one to act on. |
| Nobody reads the Feedback page | The only signal is the sidebar count (D16); §7 rules out notifications for now. Mitigated by shipping phase 9 before phase 10 and by telling volunteers first. |

## Appendix B — Traceability

| plan8.md section | Phase |
| --- | --- |
| §1.1 Poster contents (**reduced to a caption and a QR — D15**) | 10.2 |
| §1.2 How to print it | 10.1, 10.2 |
| §1.3 One URL for all halls | 0 (D14), 7.1 |
| §2.1 Identity check, two fields, one failure message | 3.1, 7.3 |
| §2.2 What the donor sees, read-only | 0 (D10), 3.1, 7.3 |
| §2.3 The feedback box, examples, free text | 5.1, 7.3 |
| §3.1 The Feedback page and the reused donor card | 6.2, 9.2 |
| §3.2 Who sees which feedback | 6.1, 6.7 |
| §3.3 Oldest first | 6.2 |
| §4 The volunteer's three steps | 9.2, 9.5 |
| §4.1 Discard deletes permanently, and is logged | 0 (D11), 6.5 |
| §4.2 Two people discarding at once | 6.5, 9.2 |
| §5 Abuse prevention (**per-donor cap withdrawn — D9**) | 0 (D1, D9), 3.3, 5.3 |
| §6 What does not change (**Pending Donations does not exist**) | 0 ("A note on plan 7") |
| §7 FAQ — no account, no editing, no notification, archived donors, duplicates, shared links | 3.1, 6.1, 7.3, 9.4, 9.5, 10.6 |
| §7 FAQ — deleted donors (**withdrawn — D12**) | 0 (D12), 1.4, 9.2 |
| §২ক New-donor registration flow, one question per screen | 0 (D2–D6, D19), 1.2, 4, 5, 8, 9.3, 10.3 |
| §২ক.১ Registration QR — hall, duration, no cancellation | 4.1, 10.3 |
| §২ক.১ Projected on a slide at a new-intake event | 10.3 (full-screen mode), 10.4, 10.6 |
| §২ক.৩ The hall comes from the code, not the student | 0 (D6), 5.1, 8.2 |
| §২ক.৪ Create donor from a submission, then discard | 0 (D13), 6.4, 9.3 |
| §৩.১ The new-donor card | 6.2, 9.2 |
| §২ক.২, §৭ Language of the public pages | 0 (D18), 7.3, 8.2 |

## Appendix C — Where this document departs from plan8.md

1. **The per-donor feedback limit is withdrawn** (D9). §5's "your previous message is still under
   review" message does not exist, and one donor may file several messages. Only the per-IP limiters
   and the size caps remain.
2. **There is no poster** (D15). §1.1 describes a designed sheet — QR, readable URL, a Bangla
   instruction line, the Badhan logo and the hall name. All of it reduces to one English caption and
   a QR code. The hall name goes because §1.3 already makes the URL zone-wide; the Bangla line goes
   with the embedded font it would have required; the rest is decoration. The sidebar entry is still
   called **Print Poster**, per §1.2.
3. **Deleting a donor no longer deletes their feedback** (D12). §7 promises it does. The queue may
   hold rows whose phone and student ID match nobody, and a volunteer clears them by hand. The
   rendering path this needs is required anyway by the registration flow.
4. **A new-donor registration flow is built that §1–§7 never mention** — now written up for
   volunteers as `plan8.md` §২ক, which also corrects §7's "নতুন ডোনার তৈরি করা যাবে না" answer.
   It is the reason the
   collection stores phone, student ID and hall instead of a donor id (D2), the reason
   `feedbackJSON` is flexible (D3), and the reason submission is token-authorised in two purposes
   (D4, D5). `plan8.md`'s journey is one `type` value on that pipe. Its page is **not** a form in
   the shape of the app's own donor-creation screen: it asks one question at a time and submits once
   at the end (D19), and it never asks for donation history.
5. **Submission is authorised by a short-lived token**, replacing an earlier revision of this
   document in which the browser re-sent the phone and student ID with each submission. This removes
   the submit route as a guessing oracle and is what makes the registration flow possible at all.
