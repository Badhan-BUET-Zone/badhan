# Plan 11 — `(Unknown)` hall becomes a legacy value

`(Unknown)` (hall index `8`) is today a hall like any other on the write path: a volunteer can pick
it on the creation form, a CSV row can name it, a student can answer it on the public registration
page, and the backend validator admits it everywhere a donor hall is accepted.

This plan stops new records from being born without a hall, **and leaves every record that already
has one alone**. There is no migration script, no backfill, and no read path that stops working.

**This is a plan, not an implementation. None of it is in the app yet.**

---

## At a glance

| | Today | After plan 11 |
| --- | --- | --- |
| Create a donor with `(Unknown)` — form, CSV, public registration | allowed | **rejected** |
| A donor record already holding `(Unknown)` | — | **kept, untouched** |
| Edit that donor (`PATCH /donors`) | allowed | **still allowed, `(Unknown)` still offered in the dropdown** |
| Archive / unarchive that donor | allowed | **still allowed** |
| Search, filter and report on `(Unknown)` | allowed | **still allowed** |
| Update that donor's **comment** | allowed | **rejected** |
| Promote that donor to volunteer / hall admin | already rejected | rejected (unchanged, now documented) |

The two blocks on an existing `(Unknown)` record — comment and promotion — are the whole of the
"no further edits" pressure. They are deliberately the two writes that are *optional*: nobody is
stopped from correcting the record, only from decorating it.

| Phase | Title | Depends on | Deployable alone |
| --- | --- | --- | --- |
| [P1](#phase-p1--one-constant-becomes-two) | The creation set, and `POST /donors` | — | yes (invisible) |
| [P2](#phase-p2--the-public-registration-payload) | The registration payload rejects `(Unknown)` | P1 | yes (invisible) |
| [P3](#phase-p3--comments-on-a-record-with-no-hall) | Comment updates blocked on an `(Unknown)` donor | — | yes |
| [P4](#phase-p4--the-creation-form) | The creation form and the registration page | P1, P2 | yes |
| [P5](#phase-p5--csv-bulk-import) | CSV bulk import | P1 | yes |
| [P6](#phase-p6--tests-manual-rollout) | Tests, manual, rollout | all | — |

**P1–P3 ship dark to a user**, but P1 and P2 are the enforcement: ship them before the UI phases so
that a stale browser tab cannot slip an `(Unknown)` creation past a form that no longer offers it.
P3 is independent of the rest and can go at any point.

---

## §0 The decisions everything else follows from

### 0.1 The database is not migrated

Every donor whose stored hall is `8` keeps it. They stay searchable, editable, archivable,
bookmarkable, and they keep receiving donations and call records. Nothing about them changes except
the two blocks in §0.3.

Deciding not to migrate is what makes every read path off-limits to this plan. It also means
`(Unknown)` never disappears from the codebase — `halls[8]` still has to render, still has to be a
search filter option, and `HALLS_INDEX.UNKNOWN` still has to exist.

### 0.2 The rule is on the value being written, not on the record

The single question at every write site is: *is this write trying to produce a record with hall 8?*
Not *does this record have hall 8?* That is why `PATCH /donors` is untouched — it re-sends a
donor's own stored hall, so forbidding `8` there would forbid **editing and archiving the very
records this plan promises to leave alone**, and the bulk archive sweep
([Home.vue:429-455](../../badhan-frontend/src/views/Home.vue#L429-L455)) echoes `donor.hall`
verbatim and would halt on the first one.

The two exceptions in §0.3 are exceptions on purpose, and they are the only ones.

### 0.3 The two blocks on an existing `(Unknown)` record

| Write | Rule | Where |
| --- | --- | --- |
| `PATCH /donors/comment` | 409 when the target's stored hall is `(Unknown)` | new, [P3](#phase-p3--comments-on-a-record-with-no-hall) |
| `PATCH /donors/designation` | 409 *"Donor does not have a valid hall"* | **already exists** — [DonorsController.ts:855-861](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L855-L861) |

Donations, call records, bookmarks, password resets, archiving, deletion and the full profile edit
are **not** blocked. A record with no hall must stay repairable by whoever finds it, and the repair
usually happens in the same visit as the donation being logged.

### 0.4 One constant becomes two — and the in-place narrowing is a trap

`HALL_INDICES_ALLOWED_FOR_DONOR` ([constants/index.ts:59](../../badhan-backend/src/constants/index.ts#L59))
is `[0..6, 8]` and it has **five** consumers, only one of which this plan wants to change:

| # | Consumer | What it governs | Change? |
| --- | --- | --- | --- |
| 1 | [validateBODYHall](../../badhan-backend/src/validations/validateRequest/validateBody.ts#L24-L27) → `POST /donors` | a new donor's hall | **yes** |
| 2 | [validateBODYHall](../../badhan-backend/src/validations/validateRequest/validateBody.ts#L24-L27) → `PATCH /donors` | an edited donor's hall | no — §0.2 |
| 3 | [validateQUERYHall / validateQUERYHallOrAny](../../badhan-backend/src/validations/validateRequest/validateQuery.ts#L26-L37) | search and report drill-down | no — existing donors must stay findable |
| 4 | [Feedback model](../../badhan-backend/src/db/models/Feedback.ts#L64-L75), [feedbackToken](../../badhan-backend/src/services/feedbackToken.ts#L28) | a feedback row's / token's hall | no — rows already stored with `8` must still validate |
| 5 | [feedbackInterface UNRESTRICTED_HALLS](../../badhan-backend/src/db/interfaces/feedbackInterface.ts#L104-L105) | **who can see which feedback rows** | no — silently changes visibility |

Narrowing the constant in place would change 3, 4 and 5 as a side effect. Consumer 5 is the
dangerous one: it is derived, not written out, so a narrowed set would quietly stop `(Unknown)`
feedback rows from reaching every hall's queue and nothing would fail loudly.

So a **new** constant is added and the old one keeps its value and gains a comment saying why.

### 0.5 No banner on the profile

The disabled comment editor carries its own inline explanation. The `(Unknown)` donor profile gets
no alert and no extra chrome — the record is not broken, it is merely incomplete, and a permanent
banner on a record nobody is obliged to fix is noise.

---

## Phase P1 — one constant becomes two

### P1.1 The new constant

[badhan-backend/src/constants/index.ts](../../badhan-backend/src/constants/index.ts), after
`HALL_INDICES_ALLOWED_FOR_DONOR`:

```ts
// The halls a donor record may be CREATED with. (Unknown) is out: plan11 stopped new records
// being born without a hall.
//
// This is NOT the set a record may HOLD. That is still HALL_INDICES_ALLOWED_FOR_DONOR above,
// which keeps (Unknown) so the donors created before plan11 stay searchable, editable and
// archivable — the database was deliberately not migrated.
//
// Equal in value to HALL_INDICES_ALLOWED_FOR_QR today and deliberately not defined as it: a QR
// code excludes (Unknown) because a code is aimed at a room of people, this excludes it because
// a new record must name a hall. Two rules that happen to agree, and either may move alone.
export const HALL_INDICES_ALLOWED_FOR_DONOR_CREATION: number[] =
  HALL_INDICES_ALL.filter(isHallRestricted)
```

`isHallRestricted` is declared below `HALL_INDICES_ALLOWED_FOR_DONOR` in the file today, so either
the new constant goes after line 88 or the three helpers move up. Prefer moving the constant down —
the helpers are the primitives.

And amend the comment on line 58 of the existing constant:

```ts
// The halls a donor record may HOLD. Attached (7) is deliberately not one of them. (Unknown) IS
// one of them and must stay one: records created before plan11 carry it, and search, the report
// drill-down, the feedback model and feedback visibility are all keyed on this set.
// For what a NEW record may carry, use HALL_INDICES_ALLOWED_FOR_DONOR_CREATION.
```

### P1.2 The validator splits in two

[validateBody.ts:24-27](../../badhan-backend/src/validations/validateRequest/validateBody.ts#L24-L27)
becomes two chains. `validateBODYHall` keeps its name, its set and every current use — that use is
now `PATCH /donors` alone.

```ts
// The hall on a donor EDIT. Still admits (Unknown), because an edit re-sends the donor's own
// stored hall: the bulk archive sweep echoes it verbatim, and forbidding it here would make the
// records plan11 promised to leave alone the only ones that cannot be archived.
export const validateBODYHall: ValidationChain = body('hall')
  .exists().withMessage('hall is required')
  .isInt().toInt().withMessage('hall must be integer')
  .isIn(HALL_INDICES_ALLOWED_FOR_DONOR).withMessage('Please input an allowed hall number')

// The hall on a donor CREATION. (Unknown) is rejected here and only here.
export const validateBODYHallForCreation: ValidationChain = body('hall')
  .exists().withMessage('hall is required')
  .isInt().toInt().withMessage('hall must be integer')
  .isIn(HALL_INDICES_ALLOWED_FOR_DONOR_CREATION)
  .withMessage('Please input an allowed hall number')
```

The message stays byte-identical so no client parses a new string.

[validations/donors.ts:10](../../badhan-backend/src/validations/donors.ts#L10) —
`validatePOSTDonors` swaps to `validateBODYHallForCreation`.
[validations/donors.ts:30](../../badhan-backend/src/validations/donors.ts#L30) —
`validatePATCHDonors` is untouched.

### P1.3 A dead branch in `postDonor`

[DonorsController.ts:168-172](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L168-L172):

```ts
// if the hall is unknown, then the donor must be available to all
let availableToAll: boolean = body.availableToAll
if (isHallUnknown(body.hall)) {
  availableToAll = true
}
```

`body.hall` can no longer be `8` on this route, so the branch is unreachable. Delete it and pass
`body.availableToAll` straight through. **The `PATCH` counterpart at
[:673-675](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L673-L675) stays** — that
route still accepts `8`, and the invariant "an `(Unknown)` donor is contactable by every hall" must
survive an edit that keeps the hall as it is.

Check whether `isHallUnknown` is still imported for a live use after both P1.3 and P3 land.

---

## Phase P2 — the public registration payload

[feedbackPayload.ts:185](../../badhan-backend/src/validations/feedbackPayload.ts#L185) validates the
`newDonor` payload a student submits through a registration QR code. It is a creation, so it takes
the creation set:

```ts
if (!Number.isInteger(payload.hall) || !HALL_INDICES_ALLOWED_FOR_DONOR_CREATION.includes(payload.hall)) {
  return fail('Please input an allowed hall number')
}
```

This tightens two things at once. Under a **named-hall** token the payload's `hall` is stored inside
`feedbackJSON` and read by the volunteer later; under an **All Halls** token it *decides the row's
hall column* ([FeedbacksController.ts:268-271](../../badhan-backend/src/tsoaControllers/FeedbacksController.ts#L268-L271)).
After this phase neither can be `8`.

The `HALL_ANY` backstop at
[FeedbacksController.ts:276](../../badhan-backend/src/tsoaControllers/FeedbacksController.ts#L276)
keeps the **wider** set: it also guards the `feedback` type, whose `rowHall` comes from a matched
donor's record and may legitimately be `8`. Update its comment to say so — the parenthetical
"which excludes -1" is now only half the reason it uses that set.

`ALLOWED_TOKEN_HALLS` in [feedbackToken.ts:28](../../badhan-backend/src/services/feedbackToken.ts#L28)
is untouched. The QR generator has never offered `(Unknown)`
([HALL_INDICES_ALLOWED_FOR_QR](../../badhan-backend/src/constants/index.ts#L94)), but tokens are
signed blobs with a 24-hour ceiling and there is no reason to start rejecting one mid-life.

---

## Phase P3 — comments on a record with no hall

### P3.1 Backend

[DonorsController.updateComment](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L466-L501),
after the hall-permission check at
[:481-487](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L481-L487):

```ts
// A record with no recorded hall is one waiting to be completed, not one to annotate. Same
// message as the designation route (:858-861), which has always refused for the same reason.
// isHallUnknown rather than hasNoSpecificHall: a donor record cannot hold Attached, so the two
// agree today, and naming the value keeps the rule readable when they stop agreeing.
if (isHallUnknown(targetDonor.hall)) {
  this.setStatus(HTTP_STATUS.CONFLICT)
  return { status: 'ERROR', statusCode: HTTP_STATUS.CONFLICT, message: 'Donor does not have a valid hall' }
}
```

Add the matching `@Response<...>(409, ...)` decorator so it reaches the tsoa spec, then regenerate:
`docker compose exec backend npm run tsoa:routes`.

### P3.2 Frontend

[PersonDetails.vue:173-181](../../badhan-frontend/src/components/PersonDetails.vue#L173-L181) — the
comment textarea and its save button. Add a computed beside the other permission computeds
([:717-740](../../badhan-frontend/src/components/PersonDetails.vue#L717-L740)):

```js
isCommentEditable () {
  return !isHallUnknown(halls.indexOf(this.hall))
}
```

Both controls take `:disabled="commentLoaderFlag || !isCommentEditable"`, and the textarea's
`:messages` binding gains the reason when disabled — per §0.5 the explanation lives here and
nowhere else:

> Set this donor's hall before adding a comment.

`isHallUnknown` is already imported at
[PersonDetails.vue:523](../../badhan-frontend/src/components/PersonDetails.vue#L523).

The blank-comment default at
[:954-957](../../badhan-frontend/src/components/PersonDetails.vue#L954-L957) (`'' → '(Unknown)'`) is
about the *comment text*, not the hall. Leave it.

---

## Phase P4 — the creation form and the registration page

### P4.1 `NewPersonCard.vue`

[views/SingleDonorCreation/components/NewPersonCard.vue](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue)
— four edits, three of them deletions:

| Line | Today | After |
| --- | --- | --- |
| [227](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L227) | `[...restrictedHallNames(), halls[HALLS_INDEX.UNKNOWN]]` | `restrictedHallNames()` |
| [80](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L80) | Public Data checkbox `:disabled="isHallUnknown(...)"` | binding removed — always enabled |
| [295-301](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L295-L301) | `watch: hall → availableToAll = true` | deleted |
| [370-372](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L370-L372) | prefill falls back to `''` only for an out-of-range hall | also falls back to `''` when `donor.hall === HALLS_INDEX.UNKNOWN` |

The last one is the one that is easy to miss. This form is also the **feedback-approval draft**: a
registration already sitting in the queue from before P2 can carry `hall: 8` inside `feedbackJSON`.
Prefilling it would put a value in the model that the dropdown no longer offers, and Vuetify renders
that as a blank field that silently submits `8`. Falling back to `''` makes the existing
`required` validator do the work — the volunteer sees *"Hall is required"* and picks one of the
seven. Per §0.5 no extra explanatory line is added.

Then check whether `HALLS_INDEX` and `isHallUnknown` are still used in this file
([import at :118](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L118));
drop them from the import if not.

The `permission` validator at
[:179-182](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L179-L182)
needs no change — it already passes for a non-super-admin only on their own hall, and `(Unknown)`
passed it merely because `isHallRestricted(8)` is false.

**What replaces `(Unknown)` for the volunteer who wanted a cross-hall donor.** Picking `(Unknown)`
forced `availableToAll = true`, and that is what some people were actually reaching for. The Public
Data checkbox does exactly that and is now always enabled. Say so in the manual (P6).

### P4.2 The public registration page

[views/PublicRegistration/steps.ts:54-64](../../badhan-frontend/src/views/PublicRegistration/steps.ts#L54-L64):

```ts
// The halls a student may say they are in: the seven residential halls, and nothing else.
// Exactly the set NewPersonCard offers the volunteer, and exactly
// HALL_INDICES_ALLOWED_FOR_DONOR_CREATION on the backend. The three must stay in step — a hall a
// student can pick but a volunteer cannot save would be a dead end at creation time.
// Since plan11 this is narrower than HALL_INDICES_ALLOWED_FOR_DONOR, which still admits
// (Unknown) for records that already hold it. Attached is in none of them; HALL_ANY is in none
// of them either, because it is a property of a code and never of a person.
export const HALL_CHOICES: { label: string, value: number }[] =
  restrictedHallNames().map((label: string, value: number) => ({ label, value }))
```

Check the `halls` / `HALLS_INDEX` imports in the file afterwards.

`PublicRegistration.vue`'s `claimsRealHall` check at
[:252](../../badhan-frontend/src/views/PublicRegistration.vue#L252) tests `halls[payload.hall] !== undefined`,
which is about a *token*'s hall, not a student's answer. Leave it.

### P4.3 What is deliberately not touched

[PersonDetails.vue `availableHalls`:784-793](../../badhan-frontend/src/components/PersonDetails.vue#L784-L793)
keeps `halls[HALLS_INDEX.UNKNOWN]` in both branches. The profile edit form is the *edit* path
(§0.2): removing the option would leave an `(Unknown)` donor's dropdown showing a value not in its
own item list, and would break the archive sweep's sibling — the single-donor archive switch, which
goes through the same `PATCH /donors`.

`isDeletable` and `isDetailsEditable`
([:733](../../badhan-frontend/src/components/PersonDetails.vue#L733),
[:737](../../badhan-frontend/src/components/PersonDetails.vue#L737)) both grant access via
`isHallUnknown`. Keep them: **any member may repair an `(Unknown)` record**, which is the whole
reason the record stays repairable.

---

## Phase P5 — CSV bulk import

[badhan-frontend/src/utils/donorCsv.ts](../../badhan-frontend/src/utils/donorCsv.ts):

1. **[:23-34](../../badhan-frontend/src/utils/donorCsv.ts#L23-L34)** — drop `Unknown: 8` from
   `CSV_HALL_TO_INDEX`. A row naming it now fails with the existing message,
   `` `Unknown` is not a recognised hall ``, and lands in the broken-rows list. Amend the comment:
   the CSV label `Unknown` is gone along with the internal `(Unknown)`, and `Attached` is still
   deliberately absent.
2. **[:186-189](../../badhan-frontend/src/utils/donorCsv.ts#L186-L189)** — delete the
   `hall === Unknown ⇒ availableToAll === 'yes'` pairing rule. It has nothing left to check, and
   `CSV_HALL_TO_INDEX.Unknown` would be `undefined`, making the comparison silently true for any
   row with an unrecognised hall.
3. **[:313-320](../../badhan-frontend/src/utils/donorCsv.ts#L313-L320)** — the sample CSV's second
   row is the `hall=Unknown` demonstration, comment `Hall unknown - becomes available to all`. Give
   it a real hall and keep `availableToAll=yes` with a comment that demonstrates the *replacement*:
   a donor in one hall who is contactable by all of them.
4. **[CsvDonorCreation.vue:288](../../badhan-frontend/src/views/CsvDonorCreation.vue#L288)** — the
   on-page column reference lists `..., Titumir, Unknown` as accepted. Drop `Unknown`.

The blank-field defaults at
[:133-135](../../badhan-frontend/src/utils/donorCsv.ts#L133-L135) fill `roomNumber`, `address` and
`comment` with the literal string `(Unknown)`. Those are free-text fields, not halls. **Leave them**
— and note the collision of names, because a search-and-replace through this file will eat them.

There is no backend CSV route: the page loops `POST /donors`, so P1 already blocks a hand-edited
payload that bypasses the parser.

---

## Phase P6 — tests, manual, rollout

### P6.1 Backend tests (`badhan-backend-test`)

New, and they are the specification:

| Test | Expectation |
| --- | --- |
| `POST /donors` with `hall: 8` | 400, *"Please input an allowed hall number"* |
| `PATCH /donors` with `hall: 8` | **200** — the guarantee that existing records stay editable |
| `PATCH /donors` with `hall: 8`, `archiveFlag: true` | **200** — the archive sweep |
| `PATCH /donors/comment` on a stored-hall-8 donor | 409, *"Donor does not have a valid hall"* |
| `PATCH /donors/comment` on a real-hall donor | 200 — unchanged |
| `POST /feedbacks` `newDonor` payload with `hall: 8` | 400 |
| `GET /search/v3` with `hall=8` | 200 with results — existing donors stay findable |

Existing files to check:
[patchDonorsDesignation.success.test.js](../../badhan-backend-test/tests/donors/patchDonorsDesignation/patchDonorsDesignation.success.test.js)
and [feedbacks/modify/tokenHall.test.js](../../badhan-backend-test/tests/feedbacks/modify/tokenHall.test.js)
both already reference hall `8`; confirm neither creates a donor with it through `POST /donors`.

Run: `docker compose run --rm backend-test <cmd>`.

### P6.2 Cypress (`badhan-frontend-test`)

Three specs create their donor with `(Unknown)` on the creation form — they will fail at P4:

- [donors/create-single.cy.ts:41](../../badhan-frontend-test/cypress/e2e/donors/create-single.cy.ts#L41)
- [donors/create-and-search.cy.ts:33](../../badhan-frontend-test/cypress/e2e/donors/create-and-search.cy.ts#L33)
- [donors/newly-created.cy.ts:36](../../badhan-frontend-test/cypress/e2e/donors/newly-created.cy.ts#L36)

They pick `(Unknown)` to make the donor visible to whichever account the spec signs in as. The
replacement is a real hall plus the Public Data checkbox — the same substitution the manual will
describe for volunteers (P4.1). The comment at
[donorCsvGenerator.ts:73](../../badhan-frontend-test/cypress/support/helpers/donorCsvGenerator.ts#L73)
refers to that trick by name and needs the same update.

**The checkbox is not optional in two of them.** The Home page's search defaults to
`radios: 'AvailableToAll'` ([Home.vue:229](../../badhan-frontend/src/views/Home.vue#L229)), so a
spec that creates a donor and then finds it by search was matching on the `availableToAll` that
`(Unknown)` was silently forcing — not on the hall at all. Swapping the hall without ticking Public
Data makes those specs fail at the search, not at the form.

[auth/my-profile.cy.ts:31,55](../../badhan-frontend-test/cypress/e2e/auth/my-profile.cy.ts#L31) also
has to change, and the reason corrects P4.3: the spec sets its own hall to `(Unknown)` **and then
edits the comment**, which P3 now refuses. The edit form does still offer `(Unknown)` — that
coverage moves to the new `donors/unknown-hall.cy.ts`, which asserts it directly.

`HALLS` and `HALL.UNKNOWN` in
[cypress/support/constants.ts:49-52](../../badhan-frontend-test/cypress/support/constants.ts#L49-L52)
stay: the edit form, search filters and the profile spec all still need them.

New specs: the creation dropdown does **not** list `(Unknown)`; the public registration hall step
does not list it; a CSV row naming `Unknown` is reported broken; the comment box is disabled on an
`(Unknown)` donor profile.

[docs-screenshots/new-feature-new-student-data-collection/02b-hall-dropdown.cy.ts](../../badhan-frontend-test/cypress/docs-screenshots/new-feature-new-student-data-collection/02b-hall-dropdown.cy.ts)
screenshots a hall dropdown for the manual. Regenerate it after P4.

Run: `docker compose run --rm frontend-test <cmd>`.

### P6.3 Manual

Per [CLAUDE.md](../../CLAUDE.md), the behaviour change ships with its documentation. Eight files
describe today's rules:

| File | What it says now |
| --- | --- |
| [04-roles-and-permissions.md:97-99](../manual/04-roles-and-permissions.md) | `(Unknown)` records are open to every hall; setting it is "a small favour" — now the standing ask |
| [07-the-donor-profile.md:59](../manual/07-the-donor-profile.md) | Public Data tick unavailable for `(Unknown)` donors — still true on the profile |
| [11-adding-new-donors.md:45](../manual/11-adding-new-donors.md) | *"If you pick a hall of Unknown…"* — **delete**; replace with the Public Data substitution |
| [11-adding-new-donors.md:83](../manual/11-adding-new-donors.md) | CSV `hall` accepted values include `Unknown` — **drop it** |
| [12-members-and-promotions.md:97](../manual/12-members-and-promotions.md) | *"Donor does not have a valid hall"* — extend to the comment box |
| [17-rules-the-app-enforces.md:24,65](../manual/17-rules-the-app-enforces.md) | the `(Unknown)` visibility exception, and the promotion rule |
| [19-glossary.md:129](../manual/19-glossary.md) | the `(Unknown)` entry — **rewrite as a legacy value** |
| [20-donor-feedback.md:236-240](../manual/20-donor-feedback.md) | says a student may answer `(Unknown)` and the volunteer sets the real hall later — **now wrong** |

Rows 84-86 of `11-adding-new-donors.md` (`roomNumber` / `address` / `comment` blank → `(Unknown)`)
are the free-text defaults of P5 and stay.

The glossary entry sets the tone for all of them:

> **(Unknown).** A hall setting meaning nobody recorded which hall. **New donors can no longer be
> given it** — the creation form, the CSV import and the public registration page all require one
> of the seven halls. Donors added before that rule keep it, and can still be searched, edited and
> archived; their comment cannot be changed and they cannot be made a volunteer until someone sets
> their real hall.

### P6.4 Rollout order

1. **P1, P2, P3 backend** — deploy together. Nothing a user sees, except the comment box starting
   to 409; P3's frontend follows within the same release so the button is disabled before it can
   fail.
2. **P4, P5 frontend** — the dropdown and the CSV parser. Safe only after step 1: shipping them
   first would leave a stale browser tab able to create `(Unknown)` donors against a permissive API.
3. **P6 manual and screenshots** — with step 2.

No feature flag and no rollback data risk: every phase is a narrowing of what is accepted, so
reverting a phase re-accepts what it rejected and nothing needs repairing.

---

## Appendix A — every place `(Unknown)` can be written today

The survey this plan is built on. Verdict column is the plan's decision for each.

| # | Site | Verdict |
| --- | --- | --- |
| 1 | [constants/index.ts:59](../../badhan-backend/src/constants/index.ts#L59) `HALL_INDICES_ALLOWED_FOR_DONOR` | **kept**, joined by a creation-only set — P1.1 |
| 2 | [validateBody.ts:24](../../badhan-backend/src/validations/validateRequest/validateBody.ts#L24) `validateBODYHall` → `POST /donors` | **blocked** — P1.2 |
| 3 | [validateBody.ts:24](../../badhan-backend/src/validations/validateRequest/validateBody.ts#L24) `validateBODYHall` → `PATCH /donors` | allowed — §0.2 |
| 4 | [DonorsController.ts:170](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L170) `POST` forces `availableToAll` | **dead, deleted** — P1.3 |
| 5 | [DonorsController.ts:673](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L673) `PATCH` forces `availableToAll` | kept — still reachable |
| 6 | [feedbackPayload.ts:185](../../badhan-backend/src/validations/feedbackPayload.ts#L185) registration payload | **blocked** — P2 |
| 7 | [FeedbacksController.ts:276](../../badhan-backend/src/tsoaControllers/FeedbacksController.ts#L276) `rowHall` backstop | kept, comment updated — P2 |
| 8 | [feedbackToken.ts:28](../../badhan-backend/src/services/feedbackToken.ts#L28) `ALLOWED_TOKEN_HALLS` | kept — §P2 |
| 9 | [Donor.ts:164,172,200](../../badhan-backend/src/db/models/Donor.ts#L164) schema defaults `'(Unknown)'` | kept — free text, not halls |
| 10 | [NewPersonCard.vue:227](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L227) creation dropdown | **removed** — P4.1 |
| 11 | [NewPersonCard.vue:297](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L297) hall watcher | **deleted** — P4.1 |
| 12 | [NewPersonCard.vue:370](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L370) draft prefill | **falls back to blank** — P4.1 |
| 13 | [steps.ts:61](../../badhan-frontend/src/views/PublicRegistration/steps.ts#L61) `HALL_CHOICES` | **removed** — P4.2 |
| 14 | [donorCsv.ts:33](../../badhan-frontend/src/utils/donorCsv.ts#L33) `CSV_HALL_TO_INDEX.Unknown` | **removed** — P5 |
| 15 | [donorCsv.ts:187](../../badhan-frontend/src/utils/donorCsv.ts#L187) `availableToAll` pairing rule | **deleted** — P5 |
| 16 | [donorCsv.ts:319](../../badhan-frontend/src/utils/donorCsv.ts#L319) sample CSV row | **rewritten** — P5 |
| 17 | [donorCsv.ts:133-135](../../badhan-frontend/src/utils/donorCsv.ts#L133) free-text `(Unknown)` defaults | kept — P5 |
| 18 | [PersonDetails.vue:787,789](../../badhan-frontend/src/components/PersonDetails.vue#L787) edit dropdown | kept — P4.3 |
| 19 | [PersonDetails.vue:733,737](../../badhan-frontend/src/components/PersonDetails.vue#L733) permission grants | kept — P4.3 |
| 20 | [GuestController.ts](../../badhan-backend/src/tsoaControllers/GuestController.ts) | untouched — faker data, no DB write |

## Appendix B — what this plan does not do

- **No migration.** No script, no backfill, no one-off. §0.1.
- **No read-path change.** Search, filters, the report drill-down, the feedback queue and every
  donor card render `(Unknown)` exactly as they do today.
- **No new endpoint.** Archiving keeps going through `PATCH /donors`; the sweep is untouched.
- **No blocking of donations, call records, bookmarks, archiving, password resets or deletion** on
  an `(Unknown)` donor. §0.3.
- **No change to `Attached` (hall 7).** It has never been a legal donor hall and this plan does not
  make it one.
