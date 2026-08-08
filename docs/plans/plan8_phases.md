# Plan 8 — Public donor portal and feedback, split into standalone phases

This document restates [plan8.md](plan8.md) as **ten self-contained phases**, in English, aimed at
whoever implements it. Each phase repeats the decisions, files, rules and tests it depends on rather
than pointing sideways at another phase, so it can be read, built, reviewed and deployed on its own.

**Where `plan8.md` left a choice open, or where the phasing exposed one, the answer is written down
in the phase that builds it** — beside the code it governs, not in a register at the front. A phase
that begins with an `N.0` section is one whose reasoning was worth stating before the mechanics. Only
two rules are stated centrally, in [Phase 0](#two-rules-that-hold-in-every-phase), because they are
not implemented anywhere in particular: **the public side can speak but cannot act**, and **a
submission is a message, not an instruction.**

Nothing from `plan8.md` is dropped — §1–§7 are all carried through, and
[Appendix B](#appendix-b--traceability) maps each original section to the phase that implements it.
[Appendix C](#appendix-c--where-this-document-departs-from-plan8md) lists every place where this
document knowingly contradicts `plan8.md`, and why.

> **This plan is deliberately built wider than `plan8.md` §1–§7 asks for.** Those sections describe
> one journey: an existing donor scans a printed QR, proves who they are, and leaves a message. This
> document builds that journey on a **general-purpose submission pipe** — one collection, one signed
> short-lived token, one submit route — so that the **new-donor registration flow** drops in as a
> second `feedbackJSON` shape, not as a second system. That flow is
> specified and built here, in phases 3, 7 and 8, and is now described for volunteers in
> [`plan8.md` §২ক](plan8.md). Everything that exists only to serve it is marked.

| Phase | Title | Depends on | Deployable alone |
| --- | --- | --- | --- |
| [1](#phase-1--the-feedbacks-collection) | The `feedbacks` collection | — | yes (invisible) |
| [2](#phase-2--the-token-service) | The token service — mint and verify one hall-only token | — | yes (invisible) |
| [3](#phase-3--the-token-route) | `POST /feedbacks/token` — identity check → summary + hall token | 2 | yes (invisible) |
| [4](#phase-4--the-submit-route) | One submit route, both submission types | 1, 2, 3 | yes (invisible) |
| [5](#phase-5--the-volunteer-facing-endpoints) | List and discard, with the visibility rule | 1 | yes (invisible) |
| [6](#phase-6--the-public-donor-page) | `/#/donor` — the existing-donor journey | 3, 4 | yes (unlinked) |
| [7](#phase-7--the-public-registration-page) | `/#/register` — the new-donor question sequence | 3, 4 | yes (unlinked) |
| [8](#phase-8--the-feedback-page-prefill-and-the-manual) | Feedback page, prefilled donor creation, sidebar, manual | 5, 6, 7 | yes |
| [9](#phase-9--the-two-qr-surfaces-and-the-scan-gate) | Printed QR sheet, in-app QR generator, **scan gate**, manual | 8 | yes |
| [10](#phase-10--full-suite-build-and-rollout) | Full suite, production build, rollout checklist | all | — |

**Phases 1–5 ship dark.** They are individually deployable but change nothing anybody can see.
Phases 6 and 7 ship pages that exist and work but that nothing links to — reachable only by
hand-typing a URL. Phase 8 is the first thing a volunteer sees. **Phase 9 is last on purpose:**
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
**hall, and nothing else**. The donor writes a message; the browser submits it with the token, and
repeats the phone and student ID in the submission itself.

**Journey B — a student who is not in the database registers.** A volunteer opens a page in the app,
picks a duration (up to 24 hours) and generates a **QR code containing a hall token** — the same kind
of token, minted from the volunteer's own record. Students at a
desk or a hall event scan it and answer a short sequence of questions on their own phone — one
question per screen, submitted in one go at the end. That submission lands in the same queue, tagged
as a new-donor submission.

**Both journeys end in the same place.** A new **Feedback** page inside the app lists everything
waiting, oldest first, filtered to the halls the viewer is allowed to see. A message gets read and
**discarded**. A registration gets opened into a **prefilled Single Donor Creation form**, and then
discarded. Nothing is ever created or changed automatically.

### Two rules that hold in every phase

Everything else in this document is stated in the phase that builds it. These two are not, because
they are not implemented anywhere in particular — they are the reason the feature is safe to expose
publicly at all, and every phase is downstream of them.

**The public side can speak; it cannot act.** No endpoint reachable without a session may modify a
donor, a donation, a call record or anything else. The single write the public side can perform is
appending a row to the `feedbacks` collection. A registration submission **does not create a donor** —
it creates a row that a member later turns into a donor by hand. Phase 4 adds one *read* of the donor
collection to that picture and says so where it does it; nothing else moves. (§5)

**A submission is a message, not an instruction.** It is stored and interpreted by a human. The app
never parses a message, never extracts a date from it, and never changes a donor record because of
one. `Discard` deletes the row and nothing else. This is not a limitation to be engineered away
later; it is what makes the rest of the design tolerable, and it is the only control standing between
a forged message and a wrong edit to a real donor's record (phase 4.1). (§4)

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
| Feedback controller | `badhan-backend/src/tsoaControllers/FeedbacksController.ts` (new) — **all four routes** (3.0) |
| Validators | `badhan-backend/src/validations/feedbacks.ts` (new) + additions to [validateBody.ts](../../badhan-backend/src/validations/validateRequest/validateBody.ts) / [validateQuery.ts](../../badhan-backend/src/validations/validateRequest/validateQuery.ts) |
| Rate limiters | [badhan-backend/src/middlewares/rateLimiter.ts](../../badhan-backend/src/middlewares/rateLimiter.ts) — two new: `feedbackTokenLimiter`, `feedbackSubmissionLimiter` |
| Donor reads | [badhan-backend/src/db/interfaces/donorInterface.ts](../../badhan-backend/src/db/interfaces/donorInterface.ts) |
| Guest mirrors | [badhan-backend/src/tsoaControllers/GuestController.ts](../../badhan-backend/src/tsoaControllers/GuestController.ts) |
| Backend tests | `badhan-backend-test/tests/feedbacks/` (new) |
| Public donor page | `badhan-frontend/src/views/PublicDonor.vue` (new) |
| Public registration page | `badhan-frontend/src/views/PublicRegistration.vue` + `views/PublicRegistration/` — one component per question, per 7.2 (new) |
| Feedback page | `badhan-frontend/src/views/Feedback.vue` + `views/Feedback/` (new) |
| QR panel + generator | `badhan-frontend/src/views/Feedback/FeedbackQrPanel.vue` (a collapsible on the Feedback page), `views/RegistrationQr.vue` + `views/FeedbackQr/` (new) |
| Donor creation prefill | [badhan-frontend/src/views/SingleDonorCreation.vue](../../badhan-frontend/src/views/SingleDonorCreation.vue) |
| Frontend routes | [badhan-frontend/src/router/index.ts](../../badhan-frontend/src/router/index.ts) |
| Frontend API calls | [badhan-frontend/src/api/index.ts](../../badhan-frontend/src/api/index.ts) |
| Sidebar | [badhan-frontend/src/components/AppShell/AppBar.vue](../../badhan-frontend/src/components/AppShell/AppBar.vue) |
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

### 1.0 The shape, and why it is this shape

**The collection stores `type`, `hall`, `feedbackJSON`, `date` — and nothing else.** No donor id, and
**no `phone` or `studentId` columns either.** Who a submission is about lives inside `feedbackJSON`
along with the rest of what was submitted.

No donor id, because that is what makes the new-donor journey possible: a person filling the
registration form has no donor record to point at, so a foreign key would be null for exactly the
rows that need it most.

No phone or student ID columns, because they would be a **second copy** of values the payload already
carries. A registration payload must contain them — it is the donor-creation draft (phase 8.3) — so
promoting them to columns would mean storing each twice, keeping the copies in step, and rejecting
submissions where they disagree. One copy, in the payload, removes all of that.

What is left on the row is the pair of fields the *server* owns: `type`, which selects the validator
and the card, and `hall` — copied from the token, never from the submitter — which routes the row to
the right volunteers. **Everything a submitter said is inside `feedbackJSON`; everything the server
decided is a column.** That is the line, and it is worth keeping.

Two consequences to accept:

- **The schema can no longer validate a phone number or a student ID.** They sit inside a
  `Schema.Types.Mixed` column, so Mongoose enforces nothing about them. All of that moves to the
  route (phase 4.2), which is where the strict edge already lives — but it does mean there is no
  database-level backstop, and a direct write bypassing the route could store anything.
- **Reading them means a dotted path into Mixed** — `feedbackJSON.phone` — in the donor join (phase
  5.2) and anywhere the frontend renders them. That works, and it is unindexed unless declared; see
  1.1.

**`type` is a column, not a key inside `feedbackJSON`.** It is the discriminator, so it lives where a
discriminator belongs: on the row, and in the request body beside the token. That keeps
`feedbackJSON` a bare payload, which has a concrete payoff in phase 8.3 — the registration payload
becomes byte-for-byte the draft shape `NewPersonCard` expects, with no key to strip before handing it
over.

**Nothing ever deletes a row except a volunteer's Discard.** No TTL index, no age-based cleanup, no
archive, and — per 1.4 — no cascade when a donor is deleted. An unworked queue therefore grows
without bound, which is the point: an unbounded list is the only signal anybody gets that the queue
is not being worked (the same reasoning rules out pagination in phase 5.2), and a TTL would quietly
destroy unread submissions while bypassing the `DELETE FEEDBACKS` log that makes a discard
recoverable (phase 5.4). **Do not add a TTL index to this schema.**

### 1.1 The model

New file `badhan-backend/src/db/models/Feedback.ts`, following the shape of
[PublicContact.ts](../../badhan-backend/src/db/models/PublicContact.ts):

```ts
export interface IFeedback extends Document {
  type: 'feedback' | 'newDonor'   // the discriminator, on the row (1.0)
  hall: number           // HALLS_INDEX — copied from the token, never from the submitter (4.0)
  feedbackJSON: any      // Schema.Types.Mixed — everything the submitter sent, phone and
                         // student ID included (1.0)
  date: number           // submission timestamp
}
```

- `type` — `String`, `required`, `enum: ['feedback', 'newDonor']` (1.0). The database enforces the
  two values; the route enforces everything else. **No index** — the list is deliberately unfiltered
  (5.2), so nothing queries on it.
- **There is no `phone` or `studentId` field** (1.0). They live at `feedbackJSON.phone` and
  `feedbackJSON.studentId` for both submission types. Nothing is unique and nothing is a reference:
  several rows may carry the same phone (4.0), and a row may carry one that matches no donor at all —
  a `newDonor` row always does, and a `feedback` row does once its donor is deleted (1.4).
- `hall` — `Number`, `required`, validated against `HALL_INDICES_ALLOWED_FOR_DONOR` plus
  `HALLS_INDEX.ATTACHED`, since a token may legitimately carry an unrestricted hall.
- `feedbackJSON` — `Schema.Types.Mixed`, `required`. **Flexible storage behind a strict edge:** the
  database enforces nothing beyond presence, and the route enforces everything — the `type` column
  selects a per-type validator, and a size cap applies to all of them (phase 4.2). New submission
  kinds are added by writing a new `type` value and its validator: no migration, no schema change, no
  new collection. What is never allowed is an unvalidated blob reaching the database. Add a
  schema-level guard that the serialised value is under **4 KB**, as a backstop to the route's
  validator.
- `date` — `Number`, `required`, defaulted to insertion time, validated with the existing
  `checkNumber` / `checkTimeStamp` validators from [models/validators](../../badhan-backend/src/db/models/validators).
- Schema options `{ versionKey: false, id: false }`, as everywhere else.
- Register as `model<IFeedback>('Feedbacks', feedbackSchema)`, matching `PublicContacts`,
  `CallRecords` and the rest.

Three indexes, all load-bearing:

```ts
feedbackSchema.index({ hall: 1, date: 1 })   // the visibility filter, then the oldest-first sort
feedbackSchema.index({ date: 1 })            // the super admin's unfiltered list
```

**Two indexes, not three.** An earlier revision carried a third on `{ phone, studentId }`, justified
as "the donor join that renders the card" — and that justification was wrong even then: a `$lookup`
is served by an index on the **foreign** collection, and `Donors.phone` is already unique-indexed.
With the fields moved into `feedbackJSON` the index would also have to be declared on dotted Mixed
paths. It buys nothing, so it is not created. If a future query ever filters feedback rows *by*
phone, index `feedbackJSON.phone` then, with a reason.

### 1.2 The `feedbackJSON` envelope

Flexible in the database, strict at the edge (1.1). **The `type` lives on the row, not in the JSON**
(1.0), so what follows is a bare payload:

```jsonc
// type: 'feedback'  — journey A, an existing donor's message
{ "phone": 8801700000000, "studentId": "1905001",
  "text": "I donated on 12 March, please add it" }

// type: 'newDonor'  — journey B, a registration submission
{ "name": "...", "phone": 8801700000000, "studentId": "1905001",
  "bloodGroup": 2, "hall": 6, "address": "...", "roomNumber": "...",
  "comment": "...", "donationCount": 0, "lastDonation": null,
  "plateletDonationCount": 0, "lastPlateletDonation": null, "availableToAll": false }
```

The `newDonor` key list is **not invented here** — it is exactly the `keysExpected` array in
[NewPersonCard.vue:347](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L347),
minus `key`, which the prefill adds at render time. With `type` moved onto the row the match is now
exact rather than exact-minus-one, so phase 8.3's prefill is a straight handoff with nothing to
strip. That component already hydrates every field from a draft object and warns about unexpected or
missing keys. **Keep the two lists in step**; a comment in both places should say so.

The registration page asks for **every one of these except `hall`** (7.2), which is fixed by the
token. A step the student skips sends its default rather than being omitted — `0`, `null`, `false`,
`''` — so the key list is always complete and phase 4.2 can reject unknown *and* missing keys.

**Both shapes carry `phone` and `studentId`, and each carries them exactly once** (1.0). There are no
columns duplicating them, so there is no pair to keep in step and no mismatch to reject. The
`newDonor` shape carries them because the whole object is the donor-creation draft; the `feedback`
shape carries them because a message has to say who it is about.

Write these shapes down in the interface file as TypeScript types, and validate against them at the
route (phase 4.2). The database's flexibility is for *future* kinds, not for present sloppiness.

### 1.3 The interface

New file `badhan-backend/src/db/interfaces/feedbackInterface.ts`, returning the project's usual
`{data?, message, status}` triple:

- `insertFeedback(type, hall, feedbackJSON)` → the created row. Three arguments: the two the server
  owns, and the payload (1.0).
- `findFeedbacksForUser(user)` → the visible list, enriched (written in phase 5.2).
- `findFeedbackById(feedbackId)` → one row, **for the discard permission check only**. There is no
  read-one route (8.3) and no count (8.4), so this function is internal to `DELETE /feedbacks`.
- `deleteFeedbackById(feedbackId)` → the deleted row, or `status: 'ERROR'` when it was already gone.

### 1.4 No cascade delete

**`plan8.md` §7 promises that deleting a donor deletes their feedback. That promise is withdrawn.**
The `post('findOneAndDelete')` hook at the bottom of
[Donor.ts](../../badhan-backend/src/db/models/Donor.ts) is **not** extended, and the cascade that
already runs there is left alone. Deleting a donor leaves their feedback rows in the queue for a
volunteer to clear by hand.

The consequence is accepted: the Feedback page must render a row whose phone and student ID match no
donor. **That rendering path is needed anyway** — every registration row has no donor record — so the
withdrawal costs nothing new, and building the cascade would cost a hook, a test and a second way for
rows to vanish.

Write this down where a future reader will trip over it — a one-line comment beside that hook
listing `Feedbacks` as a deliberate omission — because every other donor-owned collection is in
there and the next person to read it will assume an oversight.

### 1.5 Tests — deferred, and why

**`badhan-backend-test` is HTTP-only.** It drives the API over axios and has no mongoose dependency
and no database handle; `badhan-backend` itself has no test framework at all. There is no way to
assert on a model here without either inventing a unit-test harness in the backend or giving the test
suite direct database access — both larger changes than this phase, and neither asked for.

So the three model tests **land in phase 4's suite**, where `POST /feedbacks` exists and each one can
be asserted through a route. They are listed here so they are not lost:

1. A row round-trips with all four fields intact — `type`, `hall`, `feedbackJSON`, `date` — and
   `feedbackJSON` comes back as an object rather than a string, **with no `type` key inside it and
   with `phone` and `studentId` inside it** (1.0). → phase 4.5 test 1 and test 9.
2. A `type` outside `['feedback', 'newDonor']` is rejected. → phase 4.5, via the validator, which
   answers 400 before the schema enum is reached.
3. A `feedbackJSON` over 4 KB is rejected. → phase 4.5, via the route's size cap; the schema guard
   sits behind it.
4. **Deleting the donor leaves the feedback row in place** (1.4). This is the test that pins a
   decision someone will otherwise "fix", and it needs both `DELETE /donors` and `GET /feedbacks`, so
   it lands in **phase 5.6**.

**What was verified for this phase instead**, by a throwaway script run against the model inside the
backend container and then deleted: the four-field round trip; `feedbackJSON` stored as an object
with its `phone`, `studentId` and apostrophes intact; the `date` default; the `type` enum; the hall
bounds, including `ATTACHED` being accepted; the 4 KB guard rejecting 5 KB and accepting 3.9 KB;
`findFeedbackById` / `deleteFeedbackById` returning `OK` then `ERROR`; the donor-delete cascade
leaving the row; and exactly three indexes on the collection (`_id`, `{hall,date}`, `{date}`).

**Phase 1 is done when** the container boots and `syncIndexes` reports the two new indexes
(`Feedbacks ➕ added`), `tsc --noEmit` and `tslint` are clean, and the model behaviour in 1.5 holds.

---

## Phase 2 — The token service

**Goal:** one module that mints and verifies the feature's single token kind, with no routes
attached. Small, pure, and the single place where anything about tokens is decided.

### 2.0 What the token is, and what it deliberately is not

**One token, carrying a hall and an expiry.** Not two kinds, no `purpose` discriminator, no identity.
Every submission the public side makes is authorised by this one thing; which *kind* of submission it
is gets decided by the body's `type` field at the submit route (phase 4.1), never by the token.

**The payload is public. Design it that way.** A JWT is *signed, not encrypted* — the payload is
base64url, and anyone holding the token can read every claim in a browser console or on any JWT
decoder. A registration token is printed into a QR code that a room full of students scans, so
**anything in the payload is public to everyone who scans it**. A hall number is not worth
protecting; the phone number of the volunteer who generated the code is. That is the whole reason the
token carries no phone, no student ID, no name and no id.

**Nothing is stored, and nothing can be revoked.** No `jti`, no denylist, no "active links" page. A
registration QR that leaks — photographed, forwarded, posted in a group — stays live until it
expires. Accepted knowingly, and the mitigations are duration and blast radius: the default is 15
minutes, a generator asks for what its event needs, the ceiling is 24 hours, and the worst outcome is
junk rows in one hall's queue that a volunteer discards. The token itself exposes nothing and creates
nothing. Revisit only if it actually happens; the fix — a `jti` plus a small collection — is a
contained follow-up.

**Minting is not logged, and cannot be.** The mint route is unauthenticated (phase 3.1), so there is
no user id to log against. A leaked QR is therefore untraceable: it names a hall and an expiry, and
nothing about who made it. That is the price of one route with no session, and it is carried as a
standing risk in Appendix A.

### 2.1 The module

New file `badhan-backend/src/services/feedbackToken.ts`:

```ts
export const FEEDBACK_TOKEN_DEFAULT_MINUTES = 15          // see 2.4
export const FEEDBACK_TOKEN_MAX_MINUTES = 1440            // 24 hours (2.0, 2.3)

mintFeedbackToken(hall: number, durationMinutes?: number): { token: string, expiresAt: number }
verifyFeedbackToken(token: string): { valid: false, reason: 'expired' | 'invalid' }
                                  | { valid: true, hall: number, exp: number }
// the payload is exactly { hall, exp } — there is no purpose claim (2.2)
```

**One mint function, and its only input is a hall.** Not a donor, not a phone, not a student ID — the
caller resolves the donor and passes the hall, so this module cannot leak an identity into a payload
even by accident (2.0).

Rules:

- **Sign with `dotenv.JWT_SECRET`**, the same secret `tokenInterface` uses. No new environment
  variable is introduced (2.2).
- **`verifyFeedbackToken` validates the payload's shape, not just its signature** (2.2).
  Require `hall` to be a number in the allowed hall set, and **reject any payload carrying `_id` or
  `access`** — that is what stops a stolen **session** token being used as a submission token, since
  session payloads are `{ _id, access: 'auth' }` and have no `hall`. Since the two token kinds share
  a secret, **this check is the entire separation** — comment it as such, note that it would have to
  become an explicit discriminator claim if a session payload ever grew a `hall`, and treat weakening
  it as re-opening the shared-secret decision in 2.2.
- **The payload is `{ hall, exp }` and nothing else** (2.2). A JWT is signed, not encrypted:
  anything here is readable by anyone holding the token, and this token gets printed into a QR code
  (phase 9.3). Adding a claim is a privacy decision, not a convenience — re-read 2.0 first.
- **Expiry is a JWT `exp` claim**, so `jwt.verify` enforces it and nothing in the app has to compare
  clocks by hand. Distinguish `TokenExpiredError` from every other failure — the pages want to say
  "this QR code has expired", which is actionable, rather than "invalid". Pass
  **`noTimestamp: true`** alongside `expiresIn`: `jsonwebtoken` otherwise adds an `iat` claim that
  nothing reads, and dropping it is what keeps the payload exactly two claims.
- **A small payload keeps the QR scannable.** Two claims is about as low-density as a signed JWT
  gets, which is what makes the code readable from the back of a room (phase 9.3).
- **Nothing is stored** (2.0). The module touches no collection.

### 2.2 Separation from session tokens, and the claim that is not there

**Feedback tokens are signed with the existing `JWT_SECRET`.** There is no `FEEDBACK_JWT_SECRET`; a
second secret would mean a new variable in the dotenv config, `docker-compose.yml`, the test
environment and the production deployment, plus a rotation story. A feedback token must never be
usable as a session token, and vice versa — and since both are JWTs signed with the same secret,
`jwt.verify` alone cannot tell them apart. The separation is enforced by **shape**, and tested:

A session token's payload is `{ _id, access: 'auth' }`
([tokenInterface.ts](../../badhan-backend/src/db/interfaces/tokenInterface.ts)). A feedback token's
is `{ hall, exp }`. They are disjoint, and each verifier must check for what it needs rather than
trust the signature:

- **`verifyFeedbackToken` requires `hall` to be a number in the allowed hall set, and rejects a
  payload carrying `_id` or `access`.** A session token presented as a submission token then fails
  cleanly as `invalid`, rather than sliding through to the insert and failing there as a 500.
- **`authenticate.ts` additionally requires a matching row in the `Tokens` collection.** A feedback
  token is never stored, so it has no such row and is rejected in that direction.
- Both directions get an explicit test (2.5 and phase 4.5).

Those two checks are the *whole* separation. Neither is optional and neither may be weakened without
re-opening the shared-secret question. Say so in a comment in `verifyFeedbackToken`.

**There is no `purpose` claim, and the omission has a condition attached.** Earlier revisions carried
one — first with two values to separate the journeys, then with a single literal to separate feedback
tokens from session tokens. The first job disappeared when the submission's own `type` became the
only selector; a token has never constrained which kind of submission it files. The second job is
what the shape check above now does, against the same threat.

What is given up is a **positive** assertion — "this token was minted by the feedback service" — in
favour of an **inferred** one — "this token has the shape a feedback token has". They are equivalent
today *because the two payloads are disjoint*. They would stop being equivalent the day a session
payload grows a `hall` claim, which is not a far-fetched thing for a session token to want. **If that
happens, the shape check silently stops discriminating and an explicit claim must come back.** Name
that condition in a comment at the verifier, so the next person recognises it rather than rediscovers
it.

### 2.3 Duration handling lives here

`mintFeedbackToken` applies the 15-minute default when `durationMinutes` is absent and clamps it into
`[1, FEEDBACK_TOKEN_MAX_MINUTES]` otherwise, rather than trusting its caller. The route
validates too (phase 3.2), but the ceiling and the default are properties of the token, not of one
endpoint that happens to mint it today — which is the whole reason this module exists.

**24 hours is the ceiling and it is not negotiable at the route.** A caller may ask for any lifetime
inside it; the clamp is what makes a long-lived token bounded rather than open-ended.

### 2.4 The lifetimes, and why

- **15 minutes by default.** The donor page never sends a duration, so this is journey A's lifetime.
  The thing it guards is a submission that a human then reads, and the realistic threat is someone
  picking up an unlocked phone within the window and filing a message the volunteers would have to
  discard. That is cheap. Cutting the donor off mid-sentence is not: a donor who loses what they
  typed does not type it again. Fifteen minutes covers reading your own record, thinking, being
  interrupted, and writing a few sentences on a phone keyboard.
- **Up to 24 hours when asked for.** A registration code is pinned on a wall or shown on a laptop at
  a desk; it has to outlive the event. It carries no personal data — only a hall (2.0) — and the worst
  it can do is add rows to one hall's queue (2.0).

### 2.5 Tests

Unit-level, against the module:

1. A minted token verifies and returns the hall it was minted with.
2. **The decoded payload has exactly two claims** — `hall` and `exp` — and **contains no phone,
   student ID, name or id** (2.0, 2.2). Decode it in the test with plain base64, not with the
   verifier, to make the point that anyone can. This is the test that stops an identity claim being
   added back for convenience.
3. **A token minted 16 minutes ago fails as `expired`**, not as `invalid`. Do not sleep — mint with
   a backdated `exp`.
4. A token signed with the wrong secret fails as `invalid`.
5. **A real session token, taken from a sign-in, fails verification as `invalid`** — the shape check
   (2.2). Its signature is genuine, so this test fails the day someone reduces the verifier to a
   bare `jwt.verify`. Assert the reason, not just the falsity.
6. A 2000-minute duration is clamped to 1440.
7. An absent `durationMinutes` gives 15 minutes (2.3).

**Phase 2 is done when** all seven pass and nothing outside this module knows how a token is built.

Four more were worth adding while the module was in front of me, and they are cheap to keep: the
lower clamp (0 → 1 minute), a token whose `hall` is out of range, a token with no `hall` at all, and
malformed input — `'not.a.jwt'` and `''` — returning `invalid` rather than throwing. The last pair
matters because the submit route hands this function whatever arrived in a request body.

---

## Phase 3 — The token route

**Goal:** one route, `POST /feedbacks/token`, mints every token this feature uses. It takes a phone
and a student ID, matches a donor, and answers with a read-only summary and a token carrying that
donor's hall — or with one indistinguishable failure. **No authentication, one mode, no branches.**

### 3.0 One route, and what it deliberately does not have

**There is one mint route, it is unauthenticated, and it has no modes.** Earlier revisions had two
routes on two controllers, then one route that branched on whether a session was present. Both are
gone. A signed-in volunteer generating a QR code **uses this same route with their own credentials**:
the frontend already holds them —
[store/myprofile.ts](../../badhan-frontend/src/store/myprofile.ts) carries `phone`, `studentId` and
`hall` for the signed-in member — so phase 9.3's generator sends its own user's pair and gets back a
token for its own hall. No session-aware branch, no optional authentication, no second code path.

**The `hall` claim is read from the matched donor record, and there is no `hall` in the request
body.** One rule, one source, every time: whoever's phone and student ID were sent, that donor's hall
goes in the token. For a QR code that means the generating volunteer's own hall.

That withdraws the cross-hall rules earlier revisions put on registration minting. There is no
`body.hall`, so there is nothing to compare against, no
`You are not authorized to access a donor of different hall` 403, and **no super-admin hall selector**
on the QR page (phase 9.3). A super admin mints for whatever hall their own record carries — which,
if that is the unrestricted hall, produces a token whose rows are visible to everyone, which phase
1.1's schema already allows.

Two consequences to know:

- **A super admin cannot generate a QR code on another hall's behalf.** If a hall needs a code,
  someone with a record in that hall makes it. If that becomes a real obstacle, the fix is a `hall`
  body parameter guarded by a designation check — a contained follow-up, deliberately not built in
  advance.
- **Anyone who knows a volunteer's phone and student ID can mint a token for that volunteer's hall.**
  The route is unauthenticated, so this needs no session. It is the same capability a photographed QR
  already grants, reached a different way, and bounded by the same thing: the token buys nothing but
  rows in one hall's queue.

**The whole feature is four routes on one controller**, `FeedbacksController`:

| Route | Auth | What it does | Phase |
| --- | --- | --- | --- |
| `POST /feedbacks/token` | **none** | phone + student ID → summary + hall-only token | 3 |
| `POST /feedbacks` | token in the body | the one public write | 4 |
| `GET /feedbacks` | session | the queue | 5 |
| `DELETE /feedbacks` | session | discard | 5 |

`PublicDonorsController` and `validations/publicDonors.ts` are **not created**.

### 3.1 The route

New file `badhan-backend/src/tsoaControllers/FeedbacksController.ts` — the whole feature lives on
this one controller, and the rest of it arrives in phases 4 and 5. There is **no
`PublicDonorsController`** (3.0).

```ts
@Route('feedbacks')
@Tags('Feedbacks')
export class FeedbacksController extends Controller {
  @Post('token')
  @Middlewares([feedbackValidator.validatePOSTToken, rateLimiter.feedbackTokenLimiter])
  public async postToken(@Body() body: {
    phone: number, studentId: string, durationMinutes?: number
  }): Promise<{
    status: string, statusCode: number, message: string,
    token?: string, expiresAt?: number,
    donor?: { name, phone, studentId, bloodGroup, hall,
              donationCount, plateletDonationCount, lastDonation, lastPlateletDonation }
  }>
}
```

**It is a `POST`, not a `GET`, even though it reads.** A phone number and student ID in a query
string end up in access logs, proxy logs and browser history. A body does not.

**There is no authentication middleware, and no `@Request()` parameter.** A donor scanning a printed
QR is anonymous and must get 200; a signed-in volunteer generating a QR code sends their own phone
and student ID through the very same path (3.0). The handler never asks who is calling, which is what
makes this one route with no branches.

Rules the handler must hold to:

- **The response contains exactly nine donor fields, plus the token.** `name`, `phone`, `studentId`,
  `bloodGroup`, `hall`, `donationCount`, `plateletDonationCount`, `lastDonation`,
  `lastPlateletDonation`. **Never** address, room number, email, comment, call records, designation,
  `availableToAll`, `archiveFlag`, or the donation list. Anyone who knows both a phone number and a
  student ID can read this payload, and that is accepted knowingly — which is exactly why nothing
  more sensitive is in it (§2.1, §2.2). Build the donor object
  field by field. Do **not** spread the Mongoose document, do not `toObject()` it, do not return
  `donor`. That is how addresses, comments and `archiveFlag` escape onto a public page.
- **The token carries the matched donor's hall and nothing else** (2.0, 3.0). Pass `donor.hall` to
  `mintFeedbackToken` and let the phone and student ID fall out of scope. They are used to find the
  record; they do not travel any further.
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
- **`durationMinutes` is optional and clamped to `[1, 1440]`**; absent → 15 minutes (2.3). The
  default and the ceiling are constants in the token service (phase 2.1), not literals here.
- **Return `expiresAt` as a timestamp**, so a page can show "valid until 6:30 pm" without decoding
  the JWT.
- **No log entry, ever** (2.0). [logInterface.addLog](../../badhan-backend/src/db/interfaces/logInterface.ts)
  requires a user id and there is no session on this route. Public reads are not logged — the rule
  the certificate endpoint already follows — and the consequence is that **generating a registration
  QR is unattributable**: nothing records who made a code, for which hall or for how long. That is a
  real loss against the earlier revision and is carried in Appendix A.
- **Donation counts come from the collections, not from a field.** Extra donations recorded at donor
  creation are materialised as real `Donations` rows, so `$size` of the joined arrays is the true
  count.

Add `findPublicDonorProfile(phone, studentId)` to
[donorInterface.ts](../../badhan-backend/src/db/interfaces/donorInterface.ts): a small aggregate
matching on both fields, `$lookup`ing `donations` and `plateletdonations`, computing the four
count/last-date fields, and `$project`ing the nine public fields **plus `hall`** for the token. Keep
it an **inclusion** projection, so a field added to the Donor schema later cannot leak by default.

### 3.2 Validation

New file `badhan-backend/src/validations/feedbacks.ts`, using the existing `validate([...])` helper.
`validatePOSTToken`:

- `phone` and `studentId` are **both required**. Reuse
  [validateBODYPhone](../../badhan-backend/src/validations/validateRequest/validateBody.ts) and
  `validateBODYStudentId` unchanged — they already pin the 13-digit `8801XXXXXXXXX` phone and the
  7-digit student ID with department and batch checks, so malformed input fails with the project's
  standard 400 before the lookup happens.
- `durationMinutes` — the new `validateBODYDurationMinutes`:

```ts
export const validateBODYDurationMinutes: ValidationChain = body('durationMinutes')
  .optional()
  .isInt({ min: 1, max: 1440 }).toInt()
  .withMessage('durationMinutes must be an integer between 1 and 1440')
```

There is **no `validateBODYHall` on this route** (3.0).

### 3.3 Rate limiting

One **new** limiter in [rateLimiter.ts](../../badhan-backend/src/middlewares/rateLimiter.ts):

```ts
const feedbackTokenLimiter: RequestHandler = rateLimit({
  windowMs: minute, max: 10 * rateLimiterEnabled, message: commonRateLimiterError
})
```

Why not reuse `commonLimiter`: it is shared by several authenticated routes, and this is the only
unauthenticated endpoint in the project where a wrong answer is *informative* to the caller. It
deserves its own budget so that tightening it later — the obvious response to an abuse report — does
not throttle signed-in volunteers.

**It is the only guessing surface in the feature.** The submit route stores whatever phone and
student ID it is given without checking them (2.0), so it reveals nothing; this route is the one place
where a response tells an attacker whether a pair exists. Ten a minute per IP.

A volunteer generating a QR code passes through the same limiter, since it is the same route. That is
acceptable: generating a code is a once-an-event action.

Two honest limitations, recorded rather than papered over:

- `express-rate-limit` is **in-memory and per instance**. Behind a multi-instance deployment the
  effective ceiling is `10 × instances`.
- It is keyed by IP, so one hall's NAT shares a bucket and an attacker with many IPs shares none. It
  raises the cost of guessing; it does not prevent it. The real control is the payload itself — there is little
  worth stealing in the payload — nine fields, none of them sensitive (3.1).

### 3.4 Guest mode mirror

[GuestController.ts](../../badhan-backend/src/tsoaControllers/GuestController.ts) mirrors every real
route with faker data, because in guest mode `badhanAxios` has `/guest` glued onto its base URL. Add
`@Post('feedbacks/token')` + `@Hidden()`, returning a faker donor and a **real, mintable token** —
guest mode should exercise the same code path, not a stub.

### 3.5 Tests (`badhan-backend-test/tests/feedbacks/`)

Use `operations.guestPost` from [lib/http.js](../../badhan-backend-test/tests/lib/http.js) — it sends
no `x-auth` header — and a JSON schema with `additionalProperties: false`, exactly as
[tests/certificates/schemas.js](../../badhan-backend-test/tests/certificates/schemas.js) does.

1. **No session, correct pair → 200** with the summary and a token.
2. **The donor payload is exactly the nine fields.** `Object.keys(body.donor).sort()` deep-equals
   the list. This is the regression test that matters most; it fails loudly the day someone adds
   `address` "because the donor asked for it".
3. **The token carries the donor's hall — and no phone, no student ID, no name** (2.0). Decode it in
   the test and assert the exact claim set. Paired with phase 2.4's test 2, this is what keeps an
   identity out of a QR code.
4. **Right phone, wrong student ID → 404**, standard message, **and no token in the body**.
5. **Wrong phone, right student ID → 404**, byte-identical to case 4.
6. **Neither matches → 404**, same again.
7. **Archived donor → 200** with correct counts.
8. **Counts are right** — create a donor with N extra donations plus a platelet donation and assert
   all four count/date fields.
9. **Malformed phone / student ID → 400** from the validator, never a 500.
10. **A missing phone or a missing student ID → 400**, not 404. Both are required (3.0).
11. Omitted `durationMinutes` → a token expiring in 15 minutes (2.3).
12. `durationMinutes: 1440` → 200, expiring in 24 hours.
13. `durationMinutes: 2000` → 400 from the validator.
14. **A signed-in caller gets exactly the same answer as an anonymous one** — same status, same
    body shape, same claim set. There is no session branch (3.0), and this pins that.
15. **No log row is written**, for any caller (2.0).
16. **No rate-limit test.** `RATE_LIMITER_ENABLE` is off in the test environment, multiplying every
    limiter by 100; tripping this one would take 1000 sequential requests and the harness has no
    per-test way to flip the flag. The same reasoning is already recorded for the certificate suite.
    That the limiter is attached is visible in the controller source.

**Phase 3 is done when** `curl -X POST` with a phone and student ID returns the nine-field body and a
decodable token with no credentials, the three failure cases are indistinguishable in body and
status, and the decoded token contains nothing but a hall and an expiry.

---

## Phase 4 — The submit route

**Goal:** one public route accepts a token, a `type` and a payload, and writes one row. This is the
only write the public side can perform.

### 4.0 The rules this route exists to hold

**One submit route, and the submission's `type` decides what it is.** Not the token — there is only
one kind of token (phase 2.0), so the body's `type` field is the whole selection: `'feedback'` runs
the message validator and fetches the donor, `'newDonor'` runs the registration validator and fetches
nothing. A third kind later is a third `type` value and a third validator on the same route.

The consequence is named rather than buried: **any valid token can file either kind of submission.**
There is no cross-purpose barrier. What is left is the rule from phase 0 — whatever kind is filed,
the only thing that happens is a row in one hall's queue that a volunteer reads and discards.

**The hall comes from the token; everything else comes from the submitter.** The token carries a hall
and an expiry and no identity (phase 2.0), so a submission's phone and student ID can only come from
the submission itself — from `feedbackJSON`, where they are self-asserted (phase 1.0). For
`type: 'feedback'` they are then matched against the donor collection (4.1); for `type: 'newDonor'`
they are not, because the whole premise is that this person is not in the database yet.

**What that costs, stated plainly.** A message can no longer be filed under a phone and student ID
that belong to nobody — the fetch rejects that — but it can still be filed under a **real donor's
pair by anyone who knows it**, and the Feedback page will render it under that donor's genuine card.
The fetch proves the donor exists; it does not prove the submitter is that donor. The realistic harm
is a volunteer acting on a forged message — adding a donation date to the wrong person's record — and
**the only control is phase 0's second rule**: a submission is a message, not an instruction. The
manual says so, test 20 pins the behaviour, and Appendix A carries the risk. If it is ever abused,
the fix is an opaque donor reference in the token, resolved server-side — a contained follow-up that
keeps the QR free of personal data.

**The hall stays the token's even though the donor record is now in hand.** Reading it off the
fetched donor was considered and rejected: one rule is worth more than a marginally better routing,
and the hall must remain the one field a submitter cannot influence. The consequence is small and
deliberate — a message submitted with a registration QR's token lands in the queue of the hall that
*generated the code*, not the donor's own hall. The volunteers who see it can still act on it, and
the donor's real hall is on the card in front of them.

**There is no per-donor submission cap.** The limits are the per-IP rate limiters (4.3) and the size
caps on `feedbackJSON`. This withdraws `plan8.md` §5's "একজন ডোনারের ফিডব্যাকের সীমা" paragraph and
the "your previous message is still under review" message it describes. One donor can file several
messages, and the queue can hold several rows for the same person. If that becomes a real nuisance
the fix is small and known — a uniqueness rule plus a 409 — and deliberately not built in advance.
(§5)

### 4.1 The route

In `FeedbacksController.ts`, beside the mint route from phase 3 (3.0):

```ts
@Post()
@Middlewares([feedbackValidator.validatePOSTFeedback, rateLimiter.feedbackSubmissionLimiter])
public async postFeedback(@Body() body: {
  token: string, type: 'feedback' | 'newDonor', feedbackJSON: any
}): Promise<{ status, statusCode, message }>
```

**`POST /feedbacks` is public; `GET` and `DELETE` on the same path are not** (phase 5). Middleware is
per-route in tsoa, so this is fine — but it is the one place in the project where one path is
anonymous under one verb and authenticated under another, so say so in a comment. There is no
`authenticator.handleAuthentication` here, and adding one would break every printed QR.

The flow, in order:

1. **Verify the token** with `feedbackToken.verifyFeedbackToken`. Expired → **401**,
   `This link has expired. Please scan again or ask a volunteer for a new code.` Invalid → **401**,
   `This link is not valid.` These two are worth distinguishing — one is actionable by the person
   holding the phone, the other is not. A valid token yields exactly one thing: **a hall** (2.0).
2. **Switch on `body.type`** (4.0, 1.0) to pick the validator. There is only one kind of token, so
   the token has no say in which submission this is — a `type` outside the two known values is a
   **400** from the validator.
3. **Validate `feedbackJSON` against that type** (phase 4.2).
4. **For `type: 'feedback'` only, fetch the donor** by `feedbackJSON.phone` +
   `feedbackJSON.studentId`. Not
   exactly one match → **404**, `Information does not match. Please contact a volunteer.` — the mint
   route's wording, for the mint route's reason. **`type: 'newDonor'` performs no lookup**; the
   person is not in the database yet, which is the entire premise.
5. **Build the row:**

   | Column | Source |
   | --- | --- |
   | `type` | `body.type` (1.0) |
   | `hall` | **from the token** — the only field the submitter cannot influence (4.0), even though step 4 now has the donor record in hand |
   | `feedbackJSON` | as validated, `phone` and `studentId` included, no `type` key (1.0) |
   | `date` | insertion time |

   **Four columns, and two of them are the server's.** There is no phone or student ID to copy out
   of the payload onto the row (1.0); the payload is stored whole.

6. **Insert the row** and return **201** with a message the page shows verbatim:
   `Thank you. Your message has reached the volunteers.`

Rules:

- **The hall always comes from the token** (4.0). `feedbackJSON` carries a `hall` for `newDonor`
  submissions — phase 1.2's key list requires it — and that value is stored inside the JSON for the
  volunteer to read and has **no effect** on the row's `hall` column. Since phase 7.2 froze the hall in the
  registration UI the two will normally be equal, which makes this the single most likely thing for a
  later change to "simplify" away. **Do not read the hall from the body even when it matches.** Write
  that down in a comment at the assignment site: the body is attacker-controlled and the token is
  not.
- **No per-donor cap** (4.0).
- **No log entry** — no user id exists. The row is the record.
- **The write still touches nothing but `feedbacks`.** Step 4 above adds one **read** of `donors` for
  `type: 'feedback'`, and that is the whole extent of it: no donor is created or updated, and a
  `newDonor` submission is not looked up at all — **not even to check whether it duplicates an
  existing donor.** Duplicate detection already lives in the donor-creation form the volunteer will
  use (`handleGETDonorsDuplicate` in
  [NewPersonCard.vue](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue)),
  which is the right place for it: a human is there to decide.

### 4.2 Validating `feedbackJSON`

Flexible storage, strict edge (1.1). Write the two validators as plain functions in the validator
module, selected by `type`:

`type` is a **body field**, validated by the ordinary chain — `validateBODYType`
(`isIn(['feedback','newDonor'])`). Everything else lives inside `feedbackJSON` (1.0) and is checked
by the per-type function below, **including `phone` and `studentId`**, using the same rules
`validateBODYPhone` and `validateBODYStudentId` apply: the 13-digit `8801XXXXXXXXX` form, and the
7-digit student ID with department and batch checks. Since the schema can no longer enforce these
(1.0), this is the only place they are checked — a malformed pair must be a 400 here, never a cast
error later.

**`type: 'feedback'`** — exactly three keys: `phone`, `studentId`, and `text`, a string of 1–500
characters after trimming. Nothing else may be present. The pair is then checked against the donor
collection by the handler (4.1), not by this validator.

**`type: 'newDonor'`** — the key list from phase 1.2, which is
[NewPersonCard.vue](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue)'s
`keysExpected`. Required: `name`, `phone`, `studentId`, `bloodGroup`, `hall`. Optional, defaulted if
absent: `address`, `roomNumber`, `comment`, `donationCount`, `lastDonation`,
`plateletDonationCount`, `lastPlateletDonation`, `availableToAll`.

**The donation-history fields are now genuinely populated** (7.2 asks for them), so validate them
rather than waving them through: `donationCount` and `plateletDonationCount` as integers within
`validateBODYDonationCount`'s bounds — 0 to 98 — and `lastDonation` / `lastPlateletDonation` as
timestamps that are **not in the future** and `null` when the matching count is `0`. Note the key
names differ from the creation route's `extraDonationCount` / `extraPlateletDonationCount`: this
payload follows `keysExpected`, which is what the prefill hands to `NewPersonCard`, and that
component does the mapping. Match the *bounds*, not the names.

Validate the rest with the same rules — a 13-digit phone, a 7-digit student ID with a valid department
and batch, a blood group in range — so that a submission which passes here is one the volunteer can
actually save later. **Unknown keys are rejected**, not silently dropped: a form sending a field the
server does not know about is a bug worth surfacing while it is still cheap.

And in both cases: **the whole serialised `feedbackJSON` must be under 4 KB.**

**Escaping differs by type, and the difference is load-bearing.**

- **`type: 'feedback'` — no `.escape()`, deliberately**, unlike the neighbouring
  `validateBODYComment`. `.escape()` stores HTML entities, so a donor writing `I can't donate` would
  be read by a volunteer as `I can&#x27;t donate`. This text exists to be read verbatim by a human,
  so it is stored as typed.
- **`type: 'newDonor'` — `name`, `comment`, `address` and `roomNumber` are escaped once**, with the
  same rules the real donor-creation route uses. These fields are destined to *become a donor*
  through that route, which escapes them itself
  ([validateBODYName](../../badhan-backend/src/validations/validateRequest/validateBody.ts),
  `validateBODYComment`). Storing them raw and letting phase 8.3's prefill hand them on would produce
  a donor record differing from a typed one; storing them escaped and handing them on unchanged would
  escape them **twice** — `O'Brien` → `O&#x27;Brien` → `O&amp;#x27;Brien`.

  So both halves are pinned, and **either half alone is a bug**: the route escapes once, and the
  frontend **decodes HTML entities once at each read boundary** — phase 8.2's card before display,
  phase 8.3's prefill before hydrating the draft. Write a comment at the validator and at both decode
  sites saying that the three are a set. Test 13 here and phase 8.6's test 10 pin it end to end.

Safety at render time is enforced regardless of which of the two applies, and that requirement is
not optional:

> **Submitted text is rendered with Vue text interpolation only.** Never `v-html`, never
> `VueMarkdown` (which the donor *comment* field does use). Vue escapes `{{ }}` output, so stored
> markup cannot execute. State this in a comment beside every render site in phase 8.

### 4.3 Rate limiting

A second new limiter:

**Two budgets on one route, chosen by `type`:**

```ts
const feedbackSubmissionLimiter: RequestHandler = rateLimit({      // type: 'newDonor'
  windowMs: minute, max: 60 * rateLimiterEnabled, message: commonRateLimiterError
})
const feedbackMessageLimiter: RequestHandler = rateLimit({          // type: 'feedback'
  windowMs: minute, max: 10 * rateLimiterEnabled, message: commonRateLimiterError
})
```

The choice depends on the request **body**, which ordinary middleware ordering does not give you, so
either run both conditionally inside the route's own chain or key one limiter's `max` off
`req.body.type`. **Fail closed:** a body whose `type` cannot be read gets the tighter budget.

- **`newDonor` gets sixty a minute.** The case that earns the feature is a room of students
  at a new-intake event scanning a projected code (phase 9.3), **all sharing one hall or campus
  NAT**, and a per-IP budget in single digits turns that room into a wall of 429s. It performs no
  lookup and discloses nothing, so a loose budget costs only junk rows in one hall's queue — the
  accepted blast radius, reached faster. The 4 KB cap still bounds each row.
- **`feedback` gets ten a minute, matching the mint route.** The donor fetch means a 201 rather
  than a 404 tells the caller a pair exists, which is exactly the disclosure phase 3.3 rations. The
  two oracles must have one combined story, or an attacker simply uses whichever door is wider.

Write the reason beside both. The asymmetry looks backwards — the *anonymous bulk* path is the loose
one — and the next person to tidy it will collapse them unless the comment explains that one path
reveals something and the other does not.

### 4.4 Guest mirror

`@Post('feedbacks')` + `@Hidden()`, returning the same 201 without writing.

### 4.5 Tests

Journey A:

1. `POST /feedbacks/token` with a phone and student ID → take the token → submit `type: 'feedback'`
   → **201**, and exactly one row exists with `type: 'feedback'`, that hall (from the token), and
   that phone and student ID **inside `feedbackJSON`** — the row itself has no such columns (1.0).
2. **The stored text is byte-identical to what was sent**, including apostrophes, newlines and
   Bangla characters. This is the test that catches a stray `.escape()`.
3. 501 characters → 400; 500 characters → 201.
4. Empty / whitespace-only text → 400.
5. **An expired token → 401** with the expired message, and **no row is written**. Assert the
   absence, not just the status.
6. **Two submissions from the same donor both succeed** (4.0) — this pins the decision so that
   re-introducing a cap becomes a visible, deliberate change.
7. **Nothing on the donor changed.** Read the donor back through an authenticated route and compare
   field by field with the pre-submission snapshot. This is the test that guards phase 0's first rule.

Journey B:

8. Registration token → `newDonor` submission → 201, and the row's `hall` is **the token's hall**,
   not the one in `feedbackJSON`. Send a *different* hall in the body specifically to prove the hall rule (4.0) — the
   app's own form can no longer do this (7.2), which is exactly why the test must, since the body is
   attacker-controlled.
9. **The row has exactly four fields** — `type`, `hall`, `feedbackJSON`, `date` — and no `phone` or
   `studentId` alongside them (1.0). `Object.keys()` on the stored document pins it.
10. **No donor was created** — count the donors before and after.
11. A `newDonor` payload missing `bloodGroup` → 400.
12. A `newDonor` payload with an unknown key → 400.
12b. **A malformed `feedbackJSON.phone` or `feedbackJSON.studentId` → 400**, for both types. The
    schema no longer checks these, so the validator is the only guard (1.0, 4.2).
13. **A `newDonor` `name` of `O'Brien` is stored escaped once** — `O&#x27;Brien`, not
    `O&amp;#x27;Brien` — and the same for `comment` (4.2). Paired with test 2, which pins that
    journey A's text is *not* escaped, this is what stops the two rules being merged later.

Token handling:

14. **A real session token used as the submission token → 401** (2.2) — a genuine one from a
    sign-in, not a forgery, since it is correctly signed and only its shape gives it away.
15. A token signed with the wrong secret → 401.
16. **One token files both kinds.** Mint once, submit a `type: 'feedback'` row and a
    `type: 'newDonor'` row with the same token — **both 201** (4.0). This pins the withdrawal of the
    cross-purpose barrier so that re-introducing one is a visible, deliberate change rather than an
    accident.

The donor fetch (4.1):

17. **`type: 'feedback'` naming a phone/student ID pair that matches no donor → 404**, with the
    standard message, and **no row is written**. Assert the absence.
18. **`type: 'newDonor'` naming a pair that matches no donor → 201.** The same input, the opposite
    answer — this is the test that pins why `type` is on the body at all.
19. **`type: 'newDonor'` naming a pair that matches an *existing* donor → 201 as well.** No duplicate
    check at submission time; the volunteer's creation form catches it later.
20. **A row's phone is whatever the payload said, not whatever the token's minter was** (2.0, 4.1).
    Mint with donor A's credentials, submit a `type: 'feedback'` row naming donor B — who exists —
    and assert `feedbackJSON` carries **B's** phone and student ID while the row's `hall` is **A's**,
    from the token. This is both the impersonation path recorded in Appendix A and the hall rule
    (4.0), in one test.

**Phase 4 is done when** both journeys write rows, neither can wear the other's hat, and nothing
outside `feedbacks` moved.

Seven more earned their place while building it: a `type` outside the enum → 400; a missing `token` →
400; an extra key on a `feedback` payload → 400; an oversized payload → **400 rather than 500** (the
size is checked *after* escaping, because escaping expands and the schema's own 4 KB guard would
otherwise fail the insert); `lastDonation` in the future → 400; `lastDonation` set while its count is
`0` → 400; and the guest mirror answering 201 while writing nothing.

---

## Phase 5 — The volunteer-facing endpoints

**Goal:** signed-in members can list and discard the rows they are allowed to see. **Two routes, not
four** — there is no count endpoint (8.4) and no read-one endpoint (8.3). Still no UI.

### 5.1 The visibility rule — the one thing to get right

`plan8.md` §3.2 is explicit that **there is no new permission concept**: you see the feedback of the
donors you can already find in search.

| Viewer | Sees |
| --- | --- |
| Volunteer (1) | rows whose `hall` is their hall, rows whose `hall` is unrestricted, and rows whose `feedbackJSON` phone+student ID match a donor with `availableToAll: true` |
| Hall admin (2) | the same |
| Super admin (3) | all |

Notes that decide the implementation:

- **The row's own `hall` column does most of the work** (1.0, 4.0), so the filter is a plain match, not
  a join — which is why phase 1.1 indexes `{ hall: 1, date: 1 }`.
- **`hasNoSpecificHall` / `isHallRestricted`** from [constants](../../badhan-backend/src/constants/index.ts)
  already encode "a donor with no specific hall is visible to everyone". Reuse them; do not write
  `hall <= 6` by hand.
- **The `availableToAll` clause needs the donor join**, which the list performs anyway to render the
  card. Apply the `$match` *after* the `$lookup`, and join on the dotted `feedbackJSON` paths (1.0). A journey-B row has no matching donor, so it falls
  through to the hall rule — correct, since a person who is not in the database cannot be marked
  available to all halls.
- **Filtering happens in the aggregate, not in the UI.** Another hall's row must never reach the
  browser — "greyed out" is not a thing here. (§3.2)
- **Archived donors are included.** No `archiveFlag` filter anywhere in this phase. (§7)

### 5.2 `GET /feedbacks`

```ts
@Get()
@Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
public async getFeedbacks(@Request() req: any): Promise<{
  status, statusCode, message,
  feedbacks?: Array<{ _id, type, hall, feedbackJSON, date, donor: object | null }>
}>
```

- **Sorted oldest first** (`date: 1`), so nothing sinks to the bottom and rots. (§3.3)
- **Return the `type` column on every row** (1.0). It is what the card wrapper dispatches on
  (phase 8.2), and it is no longer inside `feedbackJSON` to be read out.
- **Each row carries a donor-card payload, or `null`.** §3.1 requires the card to be *the same card*
  volunteers see in search results. Join the donor on `{ feedbackJSON.phone, feedbackJSON.studentId }`
  — dotted paths into the Mixed column, since there are no such columns on the row (1.0) — and then
  apply the same
  enrichment [generateAggregatePipeline](../../badhan-backend/src/db/interfaces/donorInterface.ts)
  performs for bookmarked donors — `donations`, `plateletdonations`, `callrecords`, `activedonors`,
  giving `donationCount`, `plateletDonationCount`, `lastDonation`, `lastPlateletDonation`,
  `lastCalled`, `callCountLast3Days`, `markerName`. Read that function before writing this one; the
  field names must match what
  [PersonCardNew.vue](../../badhan-frontend/src/components/PersonCardNew.vue) reads or the card
  renders blanks.
- **`donor: null` is a normal, expected value**, not an error — every journey-B row has one, and so
  does any row whose donor was deleted (1.4). Phase 9 renders a fallback header for these.
- **Project the donor sub-object explicitly.** `password`, `email` and `designation` must not ride
  along; the bookmarked-donor pipeline shows exactly which fields to name.
- **No pagination, no filtering, and no retention rule.** The list is a work queue that volunteers
  are expected to empty. If it grows past a few hundred rows, the queue is not being worked — and
  pagination, a `?type=` filter or a TTL index would each hide that rather than fix it. There is no
  query parameter on this route at all; both journeys come back in one oldest-first array and the
  frontend tells them apart by the `type` column.

  **The queue is one list, and that is a decision, not an omission.** No tabs, no split counts, no
  server-side type filter. The known cost is accepted: one intake event drops a hundred `newDonor`
  rows in front of the messages the printed sheet exists to collect, and a volunteer works through
  them in order. The queue is meant to be emptied; a filter would make it comfortable not to.
  Revisit only with evidence.
- **No row is ever deleted except by `DELETE /feedbacks`** (phase 1.0). Do not add a TTL index to the
  schema: it would destroy unread submissions silently and bypass the `DELETE FEEDBACKS` log that
  makes a discard recoverable (5.4).
- **Log the read** with `logInterface.addLog(user._id, 'GET FEEDBACKS', { resultCount })`, matching
  what `/search/v3` does.

### 5.3 The two routes that are not built

Named here because an earlier revision had them and a reader coming from it will look:

- **`GET /feedbacks/count` — cut** (8.4). There is no sidebar badge, so nothing consumes a count.
- **`GET /feedbacks/{feedbackId}` — cut** (8.3). Phase 8.3's prefill reads the donor draft out of the
  URL's query parameters rather than fetching a row by id, so nothing consumes a read-one either.

Neither has a guest mirror, a validator, or a test. `findFeedbackById` still exists in the interface
(phase 1.3) because `DELETE /feedbacks` needs it for the permission check — it just has no route in
front of it.

### 5.4 `DELETE /feedbacks`

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
   `logInterface.addLog(user._id, 'DELETE FEEDBACKS', { feedbackId, type, hall, feedbackJSON, date })`.
   `feedbackJSON` carries the phone and student ID, so the whole submission is still in the log
   (1.0).
   The **full submission goes into the log** so a discarded message can still be recovered by a
   super admin (§4.1). Write the log *after* a successful delete, so a failed delete leaves no
   misleading entry.
4. Return **200** with `Feedback discarded successfully`.

Add `validateQUERYFeedbackId` to
[validateQuery.ts](../../badhan-backend/src/validations/validateRequest/validateQuery.ts), copying
`validateQUERYDonorId`'s Mongo-id check, so a malformed id is a 400 rather than a cast error.

### 5.5 Guest mirrors

`@Get('feedbacks')` and `@Delete('feedbacks')`, both `@Hidden()`, returning faker donors and one row
of each `type`. Two mirrors, matching the two real routes (5.3). Guest
mode is how the Feedback page gets demoed without touching real records — and it is the only way to
show the new-donor card without filing a real submission.

### 5.6 Tests

The visibility matrix is the point of this suite. Seed rows in several halls, then sign in as each
role:

1. **Volunteer sees their own hall's rows.**
2. **Volunteer does not see another hall's rows** — assert *absence from the array*, not a 403.
3. **Volunteer sees a row whose donor is `availableToAll`, whatever its hall.**
4. **Volunteer sees a row whose `hall` is unrestricted.**
5. **Hall admin behaves exactly like the volunteer** in cases 1–4.
6. **Super admin sees all of them.**
7. **A row whose donor was deleted still appears**, with `donor: null` (1.4).
8. **A journey-B row appears** with `donor: null` and `type === 'newDonor'`, and the `type` column
   is returned on every row (1.0).
9. **Archived donor's row appears** for whoever can see that donor.
10. **Oldest first** — file three with distinct dates and assert the order.
11. **The card payload has the fields `PersonCardNew` reads**, and does **not** have `password`,
    `email` or `designation`.
12. **Discard removes the row**, returns 200, and writes a `DELETE FEEDBACKS` log containing the
    full `feedbackJSON`.
13. **Second discard of the same id → 404** with the already-resolved message.
14. **Cross-hall discard → 403**, and the row is **still there** afterwards.
15. **The donor is untouched by a discard** — compare the record before and after.

**Phase 5 is done when** the matrix passes and a volunteer cannot obtain another hall's row through
either of the two routes.

Six more were added while building it: `GET` and `DELETE` without a session → 401; a malformed
`feedbackId` → 400 rather than a cast error; `GET FEEDBACKS` logged with a `resultCount`; the guest
mirror returning one row of each `type` with the registration row's `donor` null; and — pinning the
one-list decision — **`?type=newDonor` returning exactly the same array as no query at all**, so
adding a filter later has to be a deliberate change rather than a silently honoured parameter.

---

## Phase 6 — The public donor page

**Goal:** `/#/donor` works end to end for a donor with no account and no session — identity check,
read-only summary, message box, thank-you. Nothing links to it yet.

### 6.1 The route

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
- **One address for all of Badhan, and it freezes the day the first sheet is printed.** No per-hall
  link, nothing secret about it — sharing it in a Facebook group or a hall WhatsApp group is a
  feature, not a leak, because the privacy control is the phone+ID match and not the obscurity of the
  address (§1.3, §7). Phase 9 prints this path onto paper that cannot be recalled, so **change it now
  if it is ever going to change.**
- The app bar renders only when a token exists ([App.vue](../../badhan-frontend/src/App.vue)), so an
  anonymous donor gets a bare page for free.

### 6.2 The API calls

Add to [api/index.ts](../../badhan-frontend/src/api/index.ts), following the file's existing
try/catch-and-return-`e.response` shape:

```ts
const handlePOSTFeedbackToken = async (payload: { phone: number, studentId: string, durationMinutes?: number }) => …
const handlePOSTFeedback      = async (payload: { token: string, feedbackJSON: object }) => …
```

Two calls serve all three pages (3.0). This page sends the donor's typed pair; phase 9's QR generator
sends **the signed-in member's own pair**, read from
[store/myprofile.ts](../../badhan-frontend/src/store/myprofile.ts), plus a duration; both public
pages submit through the second.

**This page never sends `durationMinutes`** — it takes the 15-minute default (2.3). The parameter is
in the signature for the QR generator's duration selector.

Use `badhanAxios` so guest mode and the interceptors keep working. The `x-auth` header is simply
empty for anonymous visitors and **the route ignores it either way** — there is no session branch
(3.0), so a signed-in volunteer can open `/#/donor` and get exactly the donor journey, which is what
makes the page testable without signing out.

### 6.3 The page

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

**State 2 — the summary and the box.** A read-only table of the nine fields the route returns (phase 3.1), in the order
`plan8.md` §2.2 lists them, with blood group and hall run through the existing display filters
(`getBloodGroupString`, `getHallName`) and the two dates formatted as dates. No input, no edit
button, no link into the app. Below it:

- a `textarea`, `maxlength="500"` with a visible character counter;
- the four example messages from §2.3, as static hint text;
- a **Submit** button, disabled while empty or in flight.

**The token lives in component state only** — never `localStorage`, never the URL, never a cookie.
It dies with the page, which is the point of a fifteen-minute default (2.3). The page never sends
a `durationMinutes`.

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
arrives from a phone camera; keep a network-error state distinct from the mismatch state.

**Every string on this page is English**, and so is every string on `/#/register` (phase 7). No
Bangla line beside the labels, no language toggle, no translation layer. A web page would not need an
embedded font the way the printed sheet does, so this is not the font argument — it is that one
language is one set of strings to write, review and keep true as the pages change, and the app has
never had a second one. **The risk is real and recorded in Appendix A:** the readers are students who
mostly read Bangla. If they do not use the pages, a Bangla pass over these two files is a contained
follow-up, and unlike the printed sheet it costs nothing irreversible.

### 6.4 Tests (`badhan-frontend-test/cypress/e2e/feedback/public-donor-page.cy.ts`)

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

**Phase 6 is done when** a phone in a private window, with no session, completes the whole journey.

---

## Phase 7 — The public registration page

**Goal:** `/#/register?t=<token>` lets a student who is not in the database submit their own details.
Nothing links to it yet; the QR that carries the token arrives in phase 9.

> This phase implements journey B, which `plan8.md` does not describe. It exists because the
> collection, the token service and the submit route were all built to carry it (phases 1.0, 2.0), and
> building the page now is what proves that generality is real rather than aspirational.

### 7.1 The route

```ts
{
  name: 'PublicRegistration',
  path: '/register',
  component: () => import('../views/PublicRegistration.vue'),
  meta: { requiresAuth: false, title: 'Register with Badhan', designation: 0, reRouteIfAuthorized: false }
}
```

The token travels as `?t=<jwt>`. It is a capability, not a secret about a person: it names a hall and
an expiry and nothing else (2.0), which is why it is safe in a URL, in a QR code and in a browser
history.

### 7.2 The page

`badhan-frontend/src/views/PublicRegistration.vue`. Do not import `NewPersonCard`: it carries
duplicate-checking, donation counts and a save button wired to authenticated routes. Copy its
**validation rules**, not its component — and not its layout either, because **this page is not a
form at all.**

**One question per screen.** The page holds an `answers` object and a `step` index, and renders
exactly one question component at a time — "What is your name?", then that whole component is
replaced by "What is your student ID?", and so on. Answering advances the step; the previous
question's component is replaced, not stacked. There is no partial save, no draft on the server, and
**nothing is sent until the sequence completes**; a student who closes the tab halfway has sent
nothing.

This is the right shape for the surface it lives on: every visitor arrives from a phone camera, and a
phone showing one question with one large input is answerable while standing at a desk in a queue,
where an eight-field form is not. It also makes validation kind — each answer is checked at its own
step, so a mistake is corrected in place instead of surfacing as a list of errors after everything
has been typed.

**The sequence asks for every field the donor-creation form holds, with exactly one exception.**
`hall` is hardcoded from the token and never shown as an input — a screen that cannot be answered is
not a step, so it comes out of the sequence entirely and appears as a read-only line on the review
screen instead. What that costs is real and small: a student standing at another hall's desk cannot
state where they actually live, and the volunteer creating the donor will pick the hall by asking
them. The comment step carries anything they want to say about it.

Everything else is asked, **including the donation history**. A student's self-reported history is
unverifiable and the volunteer checks it at creation time regardless — but asking is what makes the
prefilled form (phase 8.3) a form the volunteer *corrects* rather than one they *fill in*, and a
student who has donated before is exactly the student worth having complete numbers for. The cost is
paid in steps, and steps are where a wizard loses people; 7.3's abandonment risk and Appendix A both
carry it.

Journey A's page (`/#/donor`, phase 6) is unaffected — it is two fields and a textarea, and stays a
single form.

The sequence, one screen each:

| # | Question | Field | Validation at this step |
| --- | --- | --- | --- |
| 1 | What is your name? | `name` | non-empty after trimming |
| 2 | What is your student ID? | `studentId` | 7 digits, valid department and batch — the same rules as `validateBODYStudentId` |
| 3 | What is your phone number? | `phone` | 11 digits, `01XXXXXXXXX`; the client prefixes `88` exactly as phase 6.3 does |
| 4 | What is your blood group? | `bloodGroup` | one of the eight, chosen from buttons — not a dropdown, not free text |
| 5 | How many times have you donated blood? | `donationCount` | integer 0–98, the bounds `validateBODYDonationCount` uses; defaults to `0`, and a **Skip** means `0` |
| 6 | When did you last donate blood? | `lastDonation` | a date, not in the future; **skipped entirely when step 5 answered `0`** — see below |
| 7 | How many times have you donated platelets? | `plateletDonationCount` | as step 5 |
| 8 | When did you last donate platelets? | `lastPlateletDonation` | as step 6, conditional on step 7 |
| 9 | What is your room number? | `roomNumber` | optional — a **Skip** control, not an empty Next |
| 10 | What is your address? | `address` | optional, same |
| 11 | May donors from other halls contact you? | `availableToAll` | a yes/no choice, defaulting to **no**; explain in one line what it means before asking |
| 12 | Anything else we should know? | `comment` | optional; the catch-all, and the right place for anything the fixed hall or a fiddly date could not capture |

**Twelve questions, and `hall` is not one of them.** It is fixed by the token and the student cannot
change it.

**Steps 6 and 8 are conditional, and this is the same rule that removed `hall`.** Asking "when did
you last donate?" of somebody who has just answered "never" is a screen with no valid answer. When
the preceding count is `0`, skip the date step, send `null`, and **do not count it in the progress
indicator** — a student who answers 0 and 0 sees ten steps, not twelve. Going *back* into a count and
changing it from `0` re-inserts the date step; changing it to `0` removes it and clears any date
already given.

Then a **review screen**: every answer listed with an edit control that jumps back to that step, and
one **Submit** button. This is the only place the whole thing can be sent, and it is the answer to
the obvious objection to a wizard — that you cannot see what you are about to send.

Rules for the sequence:

- **Every key in phase 1.2's list is sent, always.** A skipped optional step sends its default —
  `0` for a count, `null` for a date, `false` for `availableToAll`, `''` for a text field — rather
  than being omitted, so the payload matches `keysExpected` exactly and phase 4.2's unknown-key
  rejection can stay strict in both directions.
- **Back is always available** except on step 1, and going back must not clear the answer already
  given. A student who mistypes a digit and notices two screens later should not restart.
- **Show progress** — "3 of 12" or a thin bar, **counting only the steps this student will actually
  see** (the conditional date steps drop out of the denominator). Twelve questions is long enough
  that a sequence with no visible end is one people abandon, and a counter that silently shrinks is
  worse than one that was honest from the start.

  In practice that means **the denominator starts at ten and grows**. Until a count is answered it
  is not greater than zero, so both date steps are already excluded and the student sees "of 10"
  from question one; answering a non-zero count inserts a step and the denominator becomes 11 or
  12. Growth is the honest direction — the warning above is about shrinking — and it is asserted in
  7.3's conditional-step test.
- **`hall` is set once, from the token, and never from an input.** It goes into the `answers` object
  at mount time, so the submitted payload matches phase 1.2's key list exactly.
- **Validate at the step, not at the end.** The step's Next button is disabled until its own answer
  is valid, which is the main thing this shape buys over a single form.
- **One `Enter` keypress advances a text step.** Most of these are one-handed on a phone.
- **The whole sequence is English** (6.3).

Four states wrap the sequence:

| State | Shown |
| --- | --- |
| No `t` at all, or a malformed one | "This link is not valid. Please ask a volunteer for the QR code." — and **no first question**; do not let a student answer twelve screens and fail at submit |
| Token expired (401 on submit, or an expiry visible client-side) | "This QR code has expired. Please ask a volunteer for a new one." |
| Ready | the sequence, starting at step 1 |
| Submitted | a thank-you, and a plain sentence that a volunteer will add them and this is not an account |

Two details worth getting right:

- **The hall is shown, not asked.** Decode it from the token and render it on the **review
  screen** as a read-only line — *"This form was opened for Titumir Hall."* — so a student can see
  where their submission is going without being offered a control that would not work. There is no
  hall input anywhere on this page. A student at the wrong hall's desk tells the volunteer, who picks
  the right hall when creating the donor; the comment step carries anything they want to write about
  it.
- **Decode the expiry client-side for display only** — "this form is open until 6:30 pm" — but never
  trust it. The server is the authority; the client-side read exists so the page can fail early and
  kindly instead of after a student has answered twelve questions. **Re-check it at the review screen
  too**: the sequence takes minutes, and finding out at submit is the one place this shape is worse
  than a form.

### 7.3 Tests

1. A valid token → **step 1 renders, and only step 1** — assert the student-ID and phone inputs are
   absent from the DOM, which is what pins the one-question shape against a later "simplify" into one form.
2. Walking the whole sequence reaches the review screen with every answer shown, then Submit →
   thank-you, and an authenticated API read shows the row with `type: 'newDonor'` and the **token's**
   hall in the `hall` column.
3. **Nothing is submitted before the last step.** Abandon the sequence at step 4 and assert through
   an authenticated read that no row exists.
4. **Back preserves answers** — advance three steps, go back two, and assert the fields still hold
   what was typed.
5. An invalid answer keeps Next disabled and does not advance.
6. **There is no hall input anywhere in the sequence** (7.2) — assert its absence on every step and
   on the review screen — and the submitted `feedbackJSON.hall` equals the token's hall, as does the
   row's `hall` column.
7. **The donation-history answers reach the payload.** Answer a non-zero `donationCount` and a
   date, and assert `feedbackJSON` carries both, plus the platelet pair and `availableToAll`.
7b. **Answering `0` skips the date step.** Assert the "when did you last donate" screen never
   renders, that the payload carries `lastDonation: null`, that the progress denominator drops, and
   that going back and changing the count to a non-zero value re-inserts the step.
8. No `t` → the invalid-link state, and **no step 1**.
9. An expired token → the expired state.
10. **No donor is created** — count donors before and after.

**Phase 7 is done when** a signed-out browser with a valid token can answer its way through the
sequence, and the row lands in the right hall's queue.

Two more were added: **every skipped step sends its default** — asserted by walking the sequence
using nothing but Skip and then deep-equalling the payload's key list against phase 1.2's — and the
**review screen names the hall** the code was opened for.

A note for whoever writes the next spec against this page: the steps sit inside a transition with
`mode="out-in"`, so the leaving component is removed before the entering one appears. A test that
clicks Back or Next twice without asserting the new step in between lands on a detached button and
fails for reasons that have nothing to do with the page. The helpers in
`cypress/support/helpers/feedback.ts` assert the step first; do the same for direct clicks.

---

## Phase 8 — The Feedback page, prefill, and the manual

**Goal:** the first thing existing users see. A **Feedback** entry in the sidebar, a page of cards, a
working Discard, and a one-click path from a registration submission to a prefilled donor-creation
form. **No count and no badge** (8.4), and **no fetch behind the prefill** (8.3).

### 8.1 The route

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

### 8.2 The page

`badhan-frontend/src/views/Feedback.vue`, modelled on
[ActiveDonors.vue](../../badhan-frontend/src/views/ActiveDonors.vue): `PageTitle`, a `Reload`
button, `LoadingMessage` while fetching, a `max-width: 700px` column of cards, and `<router-view>`
for the details child.

**Leave room at the top for the QR panel.** Phase 9.1 inserts a collapsed expansion panel between
`PageTitle` and the card list — the printable poster for journey A lives there rather than on a route
of its own. Nothing about it is built in this phase; just do not design the header so that adding one
collapsed line above the list is awkward.

**Three card shapes, one wrapper.** `views/Feedback/FeedbackCard.vue` dispatches on the row's
`type` column (1.0) and on whether `donor` is null:

**(a) A message from a known donor** (`type: 'feedback'`, `donor` present) — the common case.

- **The top is `PersonCardNew` verbatim**, given the row's `donor` object and
  `:detailsBasePath="'/feedback'"`. §3.1 asks for the card volunteers already know; the way to
  deliver that is to use the component, not to imitate it. Everything it offers — the call button,
  the expansion, See profile, even adding a donation date straight from the card — keeps working,
  which is precisely the workflow §4 describes.
- Below it: the message rendered with `{{ }}` and `white-space: pre-wrap` (never `v-html`, never
  `VueMarkdown` — see phase 4.2), the submission time via `new Date(date).toLocaleString()`, and
  **Discard**.

**(b) A message from an unknown donor** (`type: 'feedback'`, `donor` null) — a deleted donor, per
phase 1.4, or a phone/student ID that no longer matches.

- A plain header instead of the card: the phone and student ID **from `feedbackJSON`** (1.0), the
  hall, and one line —
  *"No donor record matches this phone number and student ID."*
- The message, the time, and **Discard**.

**(c) A registration submission** (`type: 'newDonor'`).

- A header that says clearly what it is — *"New donor submission"* — followed by the submitted
  fields laid out for reading: name, phone, student ID, blood group, the hall the code was made for,
  the donation history they reported (blood and platelet counts and dates), whether they are willing
  to be contacted by other halls, room, address, comment. **Label the donation history as reported by
  the student**, so nobody reads it as a Badhan record.
- **`name`, `comment`, `address` and `roomNumber` are decoded once before display** (4.2). They were
  escaped by the submit route so that the prefill matches what donor creation produces; a card that
  renders them as stored shows `O&#x27;Brien`. Decode, then render with `{{ }}` as everywhere else —
  decoding is not a licence for `v-html`.
- Two buttons: **Create donor** and **Discard**.

Common to all three:

- **Discard is confirmed first**, through the existing
  [confirmationBox](../../badhan-frontend/src/store/confirmationBox.ts) store the rest of the app
  uses. The wording must say what actually happens (§4.1): the message is deleted permanently and
  nothing is added to any donor's record.
- **On 200 or 404** remove the card — 404 means someone else discarded it first, which §4.2 says
  should be a calm message, not an error. There is no count to decrement (8.4).
- **Empty state:** a plain "No feedback is waiting."

### 8.3 The prefill

**Create donor** navigates to `/singleDonorCreation` with the whole draft in the query string:

```
/#/singleDonorCreation?name=…&phone=…&studentId=…&bloodGroup=…&hall=…&roomNumber=…&address=…&comment=…
```

[SingleDonorCreation.vue](../../badhan-frontend/src/views/SingleDonorCreation.vue) currently builds
its draft in `reset()` and passes it to `NewPersonCard` as the `donor` prop. That component already
hydrates every field from the draft and warns about unexpected or missing keys
([NewPersonCard.vue:347](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L347)),
so the prefill is a **draft-shaped object, not a new code path**:

- **The Feedback page builds the link.** It already holds the row from `GET /feedbacks`, so it
  decodes the HTML entities once (4.2), then `encodeURIComponent`s each value onto the query. Only
  the fields the student actually answered are emitted — which is now **all of them** (7.2), the
  donation history and `availableToAll` included. A field left at its default may be omitted;
  `SingleDonorCreation` defaults it exactly as `reset()` does.
- **On mount, `SingleDonorCreation` builds the draft from `$route.query`** when any of the known keys
  is present, and calls `reset()` as today when none is. **Coerce `phone`, `bloodGroup` and `hall`
  to numbers** — query values arrive as strings, and `NewPersonCard`'s blood-group and hall selectors
  compare numerically. Add `key` and default anything absent exactly as `reset()` does.
- **Decode nothing here.** The decoding happened once on the Feedback page; the values in the query
  are already plain text, and the creation route this form posts to escapes them itself. A second
  decode is as wrong as a missing one — `O'Brien` must arrive at the save call as `O'Brien` (4.2).
- **Read only the keys you expect.** An unknown query parameter is ignored, not passed through to
  the draft, so `NewPersonCard`'s unexpected-key warning stays quiet and a hand-edited URL cannot
  inject a field.
- **The URL is the state, so a reload is safe.** This is why the query string carries the data rather
  than a store handoff, and why there is no read-one endpoint to fetch it from: a volunteer who
  refreshes mid-typing keeps the submission, and a link is shareable. It works because the router is
  in **hash mode** — the query sits after the `#`, so it never reaches Firebase Hosting, never enters
  a server access log and never enters a proxy log. The 4 KB `feedbackJSON` cap bounds the URL, and
  there is no server-side length limit to bump into. **The cost:** a student's name, phone and
  comment land in the volunteer's browser history. Accepted — it is the volunteer's own machine and
  they are authorised to see all of it — but worth knowing on a shared laptop at a desk.
- **Nothing is auto-saved.** The volunteer reviews every field and presses the existing save button.
  The duplicate check that already runs on the phone field
  ([NewPersonCard.vue:144](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L144))
  now earns its keep — a student registering themselves twice at two events is exactly what it
  catches.
- **The feedback is not discarded automatically.** The volunteer discards it themselves, like every
  other row: the app does not mutate the queue as a side effect of a different page succeeding, and a
  volunteer who created a *different* person by mistake still has the original submission in front of
  them (§4, extended to registrations). Say so on the page, in one line under the save button, or the
  row will sit in the queue looking unhandled. **The creation page no longer knows which row it came
  from**, so it could not offer to discard even if someone later wanted it to — worth knowing before
  wiring one up.

### 8.4 The sidebar

In [AppBar.vue](../../badhan-frontend/src/components/AppShell/AppBar.vue)'s `menusForAll`, between
Bookmarked Donors and Donor Creation:

```js
{ icon: 'mdi-message-alert', text: 'Feedback', to: '/feedback', id: 'feedbackNavigationId', designation: 1 }
```

That is the whole change. **No badge, no count, no `store/feedback.ts`:** the menu loop keeps
rendering an icon and a label, exactly as it does for every other entry, and needs no conditional and
no store binding. The app bar makes no request on mount, and there is no count endpoint for it to
call (phase 5.3).

An earlier revision put an unresolved-count badge here. It is **cut** along with the endpoint that
fed it. `plan8.md` §7 already rules out notifications, so this extends that to the badge: **the app
tells nobody that work is waiting.** The consequence is real and is not mitigated in software — the
only thing making a volunteer open the page is habit, which is why phase 8 ships a week before phase
9 and why the rollout notes insist on telling volunteers first. It is carried as a standing risk in
Appendix A, and the badge is the named follow-up if the first messages sit unread. (§3, §7)

### 8.5 The manual

Per [CLAUDE.md](../../CLAUDE.md), behaviour changes ship with documentation in the same change.

**A new chapter: `docs/manual/20-donor-feedback.md`.** The manual runs 01–19 with the glossary last,
and renumbering to slot a chapter in the middle would break every existing cross-reference for
cosmetic gain. A new chapter is appended instead, and the README index lists it under "Everyday
work" where a reader looks for it. Write the QR half in phase 9; write these parts now, in the
voice of the existing chapters, for readers with no technical background:

- What the public page is, and that donors need no account and no login.
- What a donor sees and types, and that they **cannot change anything** from it.
- What the Feedback page is and how to reach it — and that **nothing announces new feedback**
  (8.4): there is no badge, no number and no notification, so opening the page has to be a habit.
  Say plainly how often to check it.
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
  appeared most likely stopped partway — ask them to scan again (7.2).
- That the student is **never asked which hall they are in** (7.2) — the code decides that, so a
  student who scanned another hall's code will appear in that hall's list. If the person is actually
  in a different hall, say so in the comment or just pick the right hall when creating the donor.
- That a new-donor card **does carry donation history** — the student is asked how many times they
  have donated and when (7.2) — but that **every number on it is the student's own claim**, not a
  Badhan record. Check it before saving, exactly as you would if they told you at a desk.
- That both public pages are **in English** (6.3), so a volunteer helping a student at a desk knows
  what they are looking at.
- That **messages and new donor submissions share one list**, oldest first, with no way to filter or
  separate them (5.2) — so after an intake event the new-donor cards will be the bulk of it for a
  while, and the messages are further down rather than missing.
- That **nothing ever leaves the list on its own** (1.0). A message waits until somebody discards it,
  however old it is. A long list means the queue is not being worked, not that something is broken.
- **That a message is not proof of who sent it.** The phone number and student ID on a card are
  whatever the sender typed; nobody checks them (2.0). Treat the message as a claim, verify with the
  donor if it matters, and never change a record on the strength of a message alone — which is
  already the rule in the three steps above, and this is why it is the rule.
- That a card sometimes shows a phone number with no donor attached — because the donor was deleted,
  or because they were never in the database — and that discarding it is the right response.

Then wire it in:

- Add the chapter to the [manual README index](../manual/README.md).
- Add "feedback", "the public donor page", "registration QR code" and "QR code" to
  [19-glossary.md](../manual/19-glossary.md).
- Add the new sidebar entries to
  [05-the-screen-and-the-menu.md](../manual/05-the-screen-and-the-menu.md) — **Feedback**, and
  **Donor Registration QR** beneath Donor Creation. There is no Print Poster entry; say where the
  poster is instead (9.1).
- Add the feedback visibility row to
  [04-roles-and-permissions.md](../manual/04-roles-and-permissions.md).
- Cross-reference from [11-adding-new-donors.md](../manual/11-adding-new-donors.md): registration
  submissions are now a third way a donor gets created, alongside the single form and the CSV
  upload.

### 8.6 Tests (`badhan-frontend-test/cypress/e2e/feedback/`)

1. Signed in as a volunteer with a seeded message: the sidebar shows a plain **Feedback** entry
   with **no badge or count anywhere on it** (8.4), the page lists the card, and the card shows the
   donor's name and the message text.
2. **A message containing `<script>` or markdown renders as literal text** — the anti-`v-html` test.
3. Discard → confirmation → the card disappears and an authenticated API read confirms the row is
   gone.
4. Cancelling the confirmation leaves everything alone.
5. **A volunteer never sees another hall's row**, seeded through the API.
6. **See profile** opens the donor profile with the right id.
7. A row with `donor: null` renders the fallback header, not a broken card.
8. **A `newDonor` row renders the registration card**, and **Create donor** lands on
   `/singleDonorCreation?name=…&phone=…` **with every field already filled in** — assert the field
   values, not just the URL.
8b. **Reloading that prefilled URL keeps every field** (8.3). This is the property the cut read-one
   endpoint used to provide, and the reason the draft is in the query string rather than the store.
9. **Saving the prefilled form creates the donor, and the feedback row is still there** (8.3).
10. **A `newDonor` submission whose name is `O'Brien` renders as `O'Brien` on the card, prefills the
    creation form as `O'Brien`, and creates a donor whose stored name matches one typed by hand into
    the same form** (4.2). Three assertions, one test — it is the only place the escape-once/
    decode-once pair can be checked end to end.
11. **Messages and new-donor submissions appear in one list, interleaved by date** (5.2) — seed one
    of each with adjacent timestamps and assert the DOM order. No tab strip, no filter control.
12. Add `goToFeedback()` to
    [NavigationDrawer.ts](../../badhan-frontend-test/cypress/support/pages/NavigationDrawer.ts),
    matching the existing helpers.

---

## Phase 9 — The two QR surfaces and the scan gate

**Goal:** volunteers can produce both codes — the permanent printed sheet for journey A, and a
time-limited registration code for journey B — and the printed one, on real paper, works.

### 9.0 What is not being built, and where the URL comes from

**This is a deliberately small phase. There is no poster.** `plan8.md` §1.1 describes a designed
sheet — QR, readable URL, a Bangla instruction line, the Badhan logo, the hall name. All of it
reduces to **one English caption and a QR code on white paper**, and each withdrawal removes work:
no hall name (§1.3 already makes the URL zone-wide), no Bangla text and therefore **no embedded
font**, no logo, no border, no printed address. Every volunteer's download is byte-identical.

Everything below that reads like ceremony — a millimetre layout module, a vector QR, a physical scan
gate — is there because the output is *printed*, and printed mistakes cannot be recalled.

**QR codes are built from the configured frontend base URL, not from `window.location.href`.** The
page that generates a code and the page the code points at are different routes, so the certificate's
"encode my own address" trick does not apply. Read
[environmentService.getFrontendBaseURL()](../../badhan-frontend/src/mixins/environment.ts), strip any
trailing slash (development's value carries one, production's does not), and append the resolved
route. The consequence is the certificate's: **a code produced on a dev or staging host encodes that
host.** For the printed sheet that means permanently dead paper — **print only from production**, and
run the scan gate (9.4) against production too.

### 9.1 Where each surface lives

**The two codes are reached in two different ways, and neither gets a top-level "Print Poster"
sidebar entry.** Each sits where the person who needs it already is.

**Journey A's sheet is a collapsible panel at the top of the Feedback page** — no route of its own.
A volunteer who is looking at the queue is exactly the person who wants to put a code on a notice
board, and the sheet is downloaded once and then not again for months, which is too rare to earn a
permanent line in the sidebar.

- New component `badhan-frontend/src/views/Feedback/FeedbackQrPanel.vue`, rendered by
  [Feedback.vue](../../badhan-frontend/src/views/Feedback.vue) (phase 8.2) **above the card list**,
  before `LoadingMessage`.
- **Collapsed by default**, using the same expansion-panel pattern the app already uses elsewhere.
  Collapsed it is one line — *"Print a QR poster for donors"* — and the queue is still the first
  thing on the page. Expanded it shows the artwork preview and the download button.
- **Nothing renders or imports until it is expanded.** The QR is built and `qrcode` is imported on
  first expansion, not on page mount. This matters more here than it did on a dedicated route: the
  Feedback page is a volunteer's daily page, so an eager import would put the QR and PDF libraries
  into the load path of every visit (see 9.5 and phase 10 step 4).

**Journey B's generator is a page of its own, in the sidebar directly beneath Donor Creation.** It is
a thing a volunteer *does* — at a desk, at an intake event — and it is a sibling of creating a donor,
which is what it eventually leads to.

```ts
{ name: 'RegistrationQr', path: '/registrationQr', component: () => import('../views/RegistrationQr.vue'),
  meta: { requiresAuth: true, title: 'Donor Registration QR', designation: 1, reRouteIfAuthorized: false } }
```

```js
// in AppBar.vue's menusForAll, immediately after the existing Donor Creation entry
{ icon: 'mdi-account-plus-outline', text: 'Donor Registration QR', to: '/registrationQr', id: 'registrationQrNavigationId', designation: 1 }
```

One sidebar entry is added by this phase, not two — **Feedback** (phase 8.4) and **Donor Registration
QR** are the only new lines in the menu.

> **`plan8.md` §1.2 names a "Print Poster" menu item.** There is no such item: the poster became a
> caption and a QR (9.0), and now it has become a panel on a page a volunteer already opens. The
> manual (9.6) must therefore describe *where the panel is*, not a menu entry to look for.

### 9.2 The printed sheet (journey A)

`badhan-frontend/src/views/Feedback/FeedbackQrPanel.vue` plus `views/FeedbackQr/FeedbackQrArtwork.vue`,
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
  because the caption is English; do not add Bangla text to this sheet without also adding a
  font, and prefer not adding either.

The complete contents: the caption **"Scan to submit feedback to Badhan BUET Zone"**,
centred, and the **QR code** beneath it. That is the whole list. No logo, no border, no hall name, no
readable URL, no Bangla line. If the page renders anything else, it is wrong.

The QR:

- `qrcode` is already a dependency; `import()` it dynamically **on first expansion of the panel**,
  exactly as [Certificate.vue:146](../../badhan-frontend/src/views/Certificate.vue#L146) does inside
  its view, and use `qrcode.create()` to get the module matrix so the artwork can draw vector
  rectangles. Because the panel lives on the Feedback page (9.1), a static import here would load on
  every volunteer's daily page.
- **It encodes the absolute `/#/donor` URL**, built from `environmentService.getFrontendBaseURL()`
  with trailing slashes stripped — **not** `window.location.href`, which on this page is the
  generator route.
- Error correction **M**, quiet zone ≥ 4 modules, pure black on pure white, **at least 80 mm
  printed**. With nothing else competing for the page there is no reason to be shy. Nothing may
  overlap it.

The PDF: A4 portrait, one page, filename `Badhan-Feedback-QR.pdf`, byte-identical for every
volunteer. `jspdf` and `svg2pdf.js` are **dynamically imported on button click**, so neither the
Feedback page nor the expanded panel pulls ~500 KiB until someone actually downloads.

### 9.3 The registration code (journey B)

`badhan-frontend/src/views/RegistrationQr.vue` — a generator, not a document:

- **Hall**: **not a control at all** (3.0). The hall is whichever one the member's own record
  carries, because the member's own credentials are what mints the token, so the page simply
  *displays* it — read-only, for everyone including super admins. Say in one line that a code can
  only be made for your own hall, or a super admin will look for the selector an earlier revision
  promised them.
- **The member's record must be loaded.** The generator depends on `myprofile` holding `phone` and
  `studentId`; if either is missing, show a plain message and disable Generate rather than sending
  `undefined` into a 400.
- **Duration**: a selector with a few sensible values (1, 2, 4, 8, 24 hours), defaulting to 4. It is sent as `durationMinutes`; the server clamps to 1440 regardless.
- **Generate** calls `POST /feedbacks/token` with **the signed-in member's own `phone` and
  `studentId`**, read from [store/myprofile.ts](../../badhan-frontend/src/store/myprofile.ts), plus
  the chosen `durationMinutes` (3.0). It is the same call `/#/donor` makes; the server has no idea a
  volunteer is on the other end, and the token it returns carries only a hall (2.0), so nothing about
  that volunteer reaches the QR code. Ignore the donor summary that comes back with it. Then render
  the QR **on screen, large**.
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

- **Download PDF** reuses `feedbackQrPdf.ts` with a different caption
  (*"Scan to register as a blood donor with Badhan BUET Zone"*) for events where a printed copy is
  easier. The same A4 portrait layout; no new pipeline. English caption, matching the sheet. Note that
a printed registration code still expires — the duration chosen above is baked into it — so a sheet
printed for a four-hour event is waste paper the next morning.
- **A warning line, always visible:** anyone who has this code can submit until it expires, and it
  **cannot be cancelled** — there is no revocation anywhere in this feature (phase 2.0). Generate a
  short one for a short event.
- The QR encodes `<frontend base>/#/register?t=<token>`, built from the configured base URL as above. Keep an eye on density: a JWT is
  200–300 characters, which pushes the code to a higher version with smaller modules. If it scans
  poorly at 80 mm, shorten the claim names before enlarging the code.

### 9.4 The scan gate — not optional

This is the acceptance test for the phase, and it is physical. **Run it against production**, or
against a build served from the production origin: the QR carries whatever host produced it (9.0
above), so a staging print tests nothing that will be true of real paper.

1. Open the Feedback page on a desktop browser, expand the QR panel, and download the journey-A PDF.
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

### 9.5 Tests

- **The panel is collapsed on arrival at the Feedback page**, and the card list is visible without
  interacting with it (9.1). Assert that no `<svg>` artwork is in the DOM before expansion — that is
  what pins the deferred import.
- Expanding the panel renders the artwork; clicking Download produces `Badhan-Feedback-QR.pdf`
  beginning with `%PDF-`.
- **The QR is rasterised and decoded with `jsQR`** (already a test-only devDependency, used by
  [decodeQr.ts](../../badhan-frontend-test/cypress/support/helpers/decodeQr.ts)) and the decoded
  string is asserted to be exactly the `/#/donor` URL. Existence and bounding-box checks would all
  still pass if the module grid were transposed or off by a row — and a subtly wrong code prints,
  goes on a wall, and never scans.
- **The registration QR decodes to `/#/register?t=…`, and the token in it decodes to the expected
  hall and expiry.**
- The `viewBox` is `0 0 210 297`, and the QR's rendered box is ≥ 80 mm square.
- The caption text is exactly the caption named in 9.2, and the sheet contains nothing else.
- The download button is **outside** the artwork SVG, so it cannot reach the PDF.
- A volunteer's registration page shows their own hall read-only, and so does a super admin's —
  there is no selector for anyone (3.0).
- **The registration page states its validity** in words after generating, and the stated time
  matches the token's `exp` (9.3).
- **The sidebar has a `Donor Registration QR` entry directly after `Donor Creation`, and no
  `Print Poster` entry at all** (9.1).
- **Full-screen mode hides the app chrome and the form**, and the QR still decodes to the same
  `/#/register?t=…` string it did before entering it.
- Inspect one generated PDF by hand: `MediaBox` of `0 0 595.28 841.89` pt, one page, no embedded
  font file, no raster image at all, QR vector.

### 9.6 The manual

Complete `20-donor-feedback.md`: **where the poster actually is** — open the Feedback page and expand
the panel at the top of it, since there is no menu entry for it (9.1) and a volunteer told to look
for one will not find it — then download, print and pin it; that the
sheet is the same for every hall, so one download serves everyone; that the link on it is safe to
share in Facebook and WhatsApp groups (§7); that it must be printed from the real app, not a test
copy, or the QR leads nowhere. Then the registration code: that it lives at **Donor Registration QR in the sidebar, just under
Donor Creation** (9.1); what it is for; how to generate one; **how to choose a duration, and that the
page tells you in plain words when the code stops working**; that **it cannot be cancelled once
made**, so a short event gets a short code; and that submissions from it arrive in the Feedback page
as new-donor cards. **Give the new-intake case its own short passage**, since
it is the one that earns the feature: put the code on a slide at orientation, use full-screen, pick
a duration that covers the session, and let the whole room enter itself. Add one line for the
volunteer standing at the desk: the
student is answering **one question per screen and can go back**, so "it is still asking me
things" is the form working, not stuck. Also say that **a code is always for your own hall** (3.0):
there is no way to make one on another hall's behalf, so a hall that wants a code makes its own.

---

## Phase 10 — Full suite, build, and rollout

1. `docker compose exec backend npx tsc --noEmit`
2. `docker compose exec backend npm run tsoa:routes` — a build step; `src/tsoaRoutes/` is gitignored
   and produces no diff.
3. `docker compose build backend-test` then `docker compose run --rm backend-test` — the **full**
   backend suite, not only the new tests.
4. `docker compose exec frontend npm run build`, and **check the bundle**: `qrcode`, `jspdf` and
   `svg2pdf.js` must all sit behind dynamic imports on the QR routes. Grep the built chunks rather
   than eyeballing sizes; if `app.js` grew noticeably, an import escaped. Nothing else should have
   grown — the sheet embeds no font and no image.
5. `docker compose run --rm frontend-test` — the full Cypress suite.
6. Re-run the **physical scan gate** (9.4) against a build produced from the final merged code.

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
- **Do not change the domain or the `/donor` path** after the first sheet is printed (6.1, 9.0).
- **Tell volunteers before the sheets go up.** The Feedback page has to be someone's habit before
  donors start filling it, or the first messages sit unread for weeks and the feature teaches donors
  that nobody is listening. Phase 8 ships before phase 9 for exactly this reason; give it a week
  and a message in the volunteers' group before paper reaches a notice board.
- **Introduce the registration QR at one event first.** It is the newer half and the one with a
  bearer credential in it (2.0). One hall, one afternoon, a 4-hour token, and a look at what actually
  lands in the queue before it is handed to everybody.
- **Watch the first fortnight's volume.** Phase 4.0 removed the per-donor cap on the strength of expected
  behaviour, not measurement. If a single donor or a leaked registration QR floods a queue, the fix
  is small and known.

---

## Appendix A — Risks carried forward

| Risk | Standing decision |
| --- | --- |
| Anyone who knows a phone number **and** a student ID can read that donor's summary | Intentional and stated in §2.1. Mitigated by payload starvation (3.1), enforced by the exact-nine-fields test in phase 3.5. |
| Guessing phone/ID pairs at scale | `feedbackTokenLimiter`, 10/min/IP, on the mint route — the feature's only oracle (phase 3.3). In-memory and per instance — a known weakness, defence in depth rather than the primary control. |
| **A message can be filed under a real donor's phone and student ID by someone who knows them** | **Introduced by the hall-only token (2.0); narrowed, not closed, by the donor fetch (4.1).** The token carries no identity, so the row's pair is self-asserted. The fetch rejects a pair matching nobody, so junk attribution is gone — but a pair belonging to a *real* donor is accepted, and the Feedback page renders the message under that donor's genuine card. The realistic harm is a volunteer acting on a forged message, e.g. adding a donation date to the wrong record. **The control is phase 0's second rule:** a submission is a message, not an instruction; a human reads it and does the work by hand. The manual says so, and phase 4.5's test 20 pins the behaviour so it is not discovered by surprise. If it is ever abused, the fix is an opaque donor reference in the token, resolved server-side — a contained follow-up that keeps the QR free of personal data. |
| **The submit route is a second guessing oracle** | Re-introduced by the donor fetch (4.1): a 201 rather than a 404 on `type: 'feedback'` reveals that a pair exists. Held to the same budget as the mint route by 4.3 — 10/min/IP for messages, with `newDonor` left at 60 because it performs no lookup. The two must be tuned together; widening either alone reopens the gap. |
| **Generating a registration code is unattributable** | Accepted (2.0, 3.0). The mint route is unauthenticated, so there is no user id to log and nothing records who made a code, for which hall or for how long. A leaked QR names a hall and an expiry and nothing else. This is a real loss against an earlier revision that required a session to mint; it is the price of one route with no branches. |
| A leaked registration QR | Accepted (2.0). No revocation. Default 15 min, ceiling 24 h, generator picks what its event needs. **The token itself exposes nothing** — a hall and an expiry (2.0) — so a photographed code leaks no personal data even though a JWT payload is publicly readable. Blast radius is junk rows in one hall's queue; **4.3 widened the rate to 60 submissions/min/IP for registrations**, so that radius is reached ten times faster. Still bounded by the 4 KB cap and cleared by discarding. The fix, if it ever happens, is a `jti` plus a denylist. |
| **An event burst throttles the students it exists for** | Resolved by 4.3 in favour of the event: the submit limiter is 60/min/IP because a room scanning a projected code shares one NAT. Not fully eliminated — a very large orientation could still crest 60 in a minute — but the remaining exposure is a retry, not a wall. |
| A feedback token used as a session token, or vice versa | Blocked by **shape**, not by a discriminator claim (2.2): `verifyFeedbackToken` requires a valid `hall` and rejects `_id`/`access`, and `authenticate.ts` requires a matching `Tokens` row that a feedback token never has. Both directions are tested (phases 2.4, 4.5). **No separate signing key** (2.2), so those two checks are the whole separation. **This holds only while the two payloads stay disjoint:** if a session token ever gains a `hall` claim, the feedback verifier stops discriminating and an explicit claim must come back. |
| A donor's fifteen-minute token expiring while they type (a caller may ask for longer; the donor page does not) | The most likely everyday failure. Handled in phase 6.3: the typed text survives, the donor re-verifies, the same message is submitted. Not handled well, this loses donors' words and they do not retype them. |
| A flood of submissions | Accepted (4.0). No per-donor cap; only the IP limiters and the 4 KB / 500-character caps — and the submission limiter is now the loose one (4.3). Watch the first fortnight. |
| **An unworked queue grows without bound** | Accepted (1.0). No TTL, no archive, no pagination (5.2). This is deliberate: the growing list is the only signal that nobody is reading it, and a TTL would delete unread submissions while bypassing the `DELETE FEEDBACKS` log. The mitigation is social — phase 8 ships before phase 9, and volunteers are told first. |
| **A registration burst buries the messages** | Accepted (5.2). One intake event can put a hundred `newDonor` rows ahead of the journey-A messages the printed sheet collects, and the list is oldest-first with no tabs and no filter. The queue is meant to be emptied; a filter would make it comfortable not to. If it becomes a real nuisance the fix is contained — a client-side split of a response the page already has. |
| **Escaped text escaped twice** | Structural to 4.2: the submit route escapes a `newDonor`'s name and comment, and the donor-creation route the prefill posts to escapes them again. Held off by decoding once at each read site (8.2, 8.3), which is two small pieces of code that must both exist. Pinned end to end by phase 8.6's test 10 — without it, the failure is a silently corrupted donor record that the volunteer who created it had no way to see. |
| A volunteer discards a message before acting on it | Unfixable in software — Discard deletes and nothing else (phase 0, §4.1). Mitigated by the confirmation dialog, by the full submission being written to the log, and by the manual saying so twice. |
| Submitted text is attacker-controlled and rendered in the app | Journey A's message is stored raw on purpose (phase 4.2); journey B's name and comment are escaped once and decoded once for display (4.2). Neither is safe because of its storage form — both are safe because they render through Vue text interpolation. **`v-html` or `VueMarkdown` on any of these fields is a security bug**, and the decode step in 8.2 is not a licence for one. Pinned by a Cypress test. |
| Rows with no matching donor accumulate | Expected, not a bug (1.4, and every registration row). The page renders a fallback header and the volunteer discards. `plan8.md` §7's cascade promise is withdrawn. |
| A registration submission duplicates an existing donor | Caught by the duplicate check already running in the donor-creation form (phase 8.3), with a human present to decide. Deliberately not checked at submission time. |
| **Printing from a non-production host** | 9.0: the QR carries the configured frontend base URL, so a sheet downloaded from dev or staging encodes a host that dies with that environment — and paper on a wall cannot be recalled. Process control only: print from `badhan-buet.web.app`, and run the scan gate against production. |
| Domain or `/donor` path change | Every printed sheet dies. Accepted knowingly (6.1). |
| The sheet is English-only, and its readers mostly read Bangla | Accepted (9.2). The caption is short and a QR needs little explanation. If people do not scan it, the fix is a Bangla caption — which costs an embedded font and a re-run of the scan gate. A deliberate follow-up, not a gap. |
| **The public pages are English-only, and their readers mostly read Bangla** | Accepted (6.3), and a larger version of the row above: a caption is one line, but `/#/register` is twelve questions. The signal is submissions that start and stop partway through, which phase 8 cannot see — nothing is stored before the last step (7.2). If uptake is poor, translating these two files is a contained follow-up with no font cost and nothing irreversible. |
| **A student abandons the registration sequence partway** | Structural to 7.2, and **the largest cost of asking for donation history**: the sequence is twelve questions rather than seven, and a wizard loses people per step. Nothing is submitted until the review screen, so an abandoned sequence leaves no row and no trace — the loss is invisible. Mitigated by a visible step counter, per-step validation, working Back, Skip on every optional step, and the conditional rule that drops the two date screens for a first-time donor (so the common case is ten steps, not twelve). If abandonment is suspected, the shape to compare against is a single scrolling form — not a partial-save endpoint, which would put unfinished personal data on the server for no one to act on. |
| **Nobody reads the Feedback page** | **The largest unmitigated risk in the feature.** 8.4 withdrew the sidebar count, so there is now *no* in-app signal at all — no badge, no number, and §7 already ruled out notifications. A queue nobody opens teaches donors that nobody is listening, which is worse than not printing the sheet. The only controls are procedural: ship phase 8 a week before phase 9, tell volunteers in their group first, and say in the manual how often to check. If the first messages sit unread, the fix is the badge that was cut — a contained follow-up, one count endpoint and one store field. |
| **The prefill lives in a URL** | Accepted (8.3). A student's name, phone and comment sit in the volunteer's browser history and in any link they paste. Bounded by hash-mode routing — the query never reaches Firebase Hosting, an access log or a proxy — and by the fact that the volunteer is already authorised to see all of it. Worth knowing on a shared laptop. |

## Appendix B — Traceability

| plan8.md section | Phase |
| --- | --- |
| §1.1 Poster contents (**reduced to a caption and a QR — 9.2**) | 9.2 |
| §1.2 How to print it (**no Print Poster menu item — 9.1**) | 9.1, 9.2, 9.6 |
| §1.3 One URL for all halls | 6.1 |
| §2.1 Identity check, two fields, one failure message | 3.1, 6.3 |
| §2.2 What the donor sees, read-only | 3.1, 6.3 |
| §2.3 The feedback box, examples, free text | 4.1, 6.3 |
| §3.1 The Feedback page and the reused donor card | 5.2, 8.2 |
| §3.2 Who sees which feedback | 5.1, 5.6 |
| §3.3 Oldest first | 5.2 |
| §4 The volunteer's three steps | 8.2, 8.5 |
| §4.1 Discard deletes permanently, and is logged | 0, 5.4 |
| §4.2 Two people discarding at once | 5.4, 8.2 |
| §5 Abuse prevention (**per-donor cap withdrawn — 4.0**) | 4.0, 3.3, 4.3 |
| §6 What does not change (**Pending Donations does not exist**) | 0 ("A note on plan 7") |
| §7 FAQ — no account, no editing, no notification, archived donors, duplicates, shared links | 3.1, 5.1, 6.3, 8.4 (**no badge either**), 8.5, 9.6 |
| §7 FAQ — deleted donors (**withdrawn — 1.4**) | 1.4, 8.2 |
| §২ক New-donor registration flow, one question per screen | 1.0, 1.2, 2.0, 3, 4, 7.2, 8.3, 9.3 |
| §২ক.১ Registration QR — hall, duration, no cancellation | 3.1, 9.3 |
| §২ক.১ Projected on a slide at a new-intake event | 9.3 (full-screen mode), 9.4, 9.6 |
| §২ক.৩ The hall comes from the code, not the student (**and is no longer asked — 7.2**) | 3.0, 4.0, 4.1, 7.2 |
| §২ক.৪ Create donor from a submission, then discard | 8.3 |
| §৩.১ The new-donor card | 5.2, 8.2 |
| §২ক.২, §৭ Language of the public pages | 6.3, 7.2 |

## Appendix C — Where this document departs from plan8.md

1. **The per-donor feedback limit is withdrawn** (4.0). §5's "your previous message is still under
   review" message does not exist, and one donor may file several messages. Only the per-IP limiters
   and the size caps remain.
2. **There is no poster** (9.2). §1.1 describes a designed sheet — QR, readable URL, a Bangla
   instruction line, the Badhan logo and the hall name. All of it reduces to one English caption and
   a QR code. The hall name goes because §1.3 already makes the URL zone-wide; the Bangla line goes
   with the embedded font it would have required; the rest is decoration. The sidebar entry is still
   called **Print Poster**, per §1.2. That menu item is gone too (9.1): the sheet is now a
   collapsible panel at the top of the Feedback page, and the only new sidebar line this feature adds
   besides Feedback is **Donor Registration QR**, beneath Donor Creation.
3. **Deleting a donor no longer deletes their feedback** (1.4). §7 promises it does. The queue may
   hold rows whose phone and student ID match nobody, and a volunteer clears them by hand. The
   rendering path this needs is required anyway by the registration flow.
4. **A new-donor registration flow is built that §1–§7 never mention** — now written up for
   volunteers as `plan8.md` §২ক, which also corrects §7's "নতুন ডোনার তৈরি করা যাবে না" answer.
   It is the reason the
   collection stores a hall and a payload instead of a donor id (1.0), the reason `feedbackJSON` is
   flexible (1.1), and the reason submission is token-authorised at all (2.0, 4.0). `plan8.md`'s
   journey is one `type` value on that pipe. Its page asks for **everything the donor-creation form
   holds except the hall**, but it is **not** a form in that screen's shape: it asks one question at
   a time and submits once at the end (7.2).
5. **Submission is authorised by a short-lived, hall-only token** (2.0), minted by one
   unauthenticated route (3.0). The browser does still send a phone and student ID with each
   submission, inside `feedbackJSON` — a `feedback` submission has them matched against a donor
   (4.1), a `newDonor` one does not, and the token is what supplies the hall. The trade is stated in phase 4.0 and carried in Appendix A: identity on
   a submission is self-asserted, and a human is the check.
6. **§২ক.৩'s hall question is removed, not just constrained** (7.2). `plan8.md` describes a student
   stating which hall they live in, with the code deciding routing separately. The form no longer
   asks: the hall is the token's, shown read-only on the review screen, and a student in the wrong
   hall is sorted out by the volunteer at creation time. Seven questions, not eight.
7. **A super admin cannot generate a registration code for another hall** (3.0). `plan8.md` §২ক.১
   implies a member choosing a hall; there is no hall parameter at all now — the server reads it off
   the minter's own record — so a code is always for the hall of whoever made it.
