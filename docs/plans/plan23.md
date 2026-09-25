# Plan 23 — Optional parents' names, and the end of the temporary feedback token

Two unrelated-looking changes ship together because both are about *asking for less*: the
single donor creation form stops demanding two names it cannot verify, and the public
feedback feature stops minting a fifteen-minute credential to do a job a phone number and a
student ID already do.

---

## Decisions taken before this plan was written

Asked and answered. Not re-argued below.

* **Parents' names follow the comment field.** Not required in the form, blanked to
  `(Unknown)` on submit. The backend's 3–100 character rule is untouched and still passes.
* **A message needs no token.** `POST /feedbacks` with `type: 'feedback'` takes the phone and
  student ID again at submission time, exactly as it already carries them inside
  `feedbackJSON`.
* **`POST /feedbacks/token` is deleted.** Not deprecated, not dual-served.
* **The registration QR carries a permanent token.** `{ hall }` signed with `JWT_SECRET`, no
  `exp`, no other claim.
* **The registration token is minted by a new authenticated route.** Session required, body is
  `{ hall }` alone — no phone, no student ID, no `durationMinutes`. Super admin may state any
  hall; everybody else only their own. Logged, as minting is today.
* **`POST /feedbacks` stays one route.** `type` keeps selecting the branch: `feedback` requires
  phone + student ID and forbids a token, `newDonor` requires the token.
* **The donor keeps seeing their record before writing.** `/#/donor` stays a two-step page; the
  lookup moves to its own public route under `/feedbacks`, returning the same nine fields and
  no token.
* **Permanent means unrevocable, and the app says so.** No version claim, no kill switch, no
  list of live codes. Panel, printed sheet and manual all state plainly that a registration
  code works forever and cannot be withdrawn.

---

## 1. Parents' names stop being required

### 1.1 `badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue`

Four edits, all mirroring what `comment` already does:

| Line today | Change |
| --- | --- |
| `class="required"` on `newDonorFatherNameTextBoxId` / `newDonorMotherNameTextBoxId` | remove the class, so the asterisk goes |
| `fatherName: { required }`, `motherName: { required }` in `validations` | delete both keys entirely |
| `fatherNameErrors` / `motherNameErrors` computed properties | delete; also delete their `:error-messages` and `@blur="$v.fatherName.$touch()"` bindings on the two fields |
| `createDonorClicked` | add, beside the three lines that already do this: `if (this.fatherName === '' || this.fatherName === null) this.fatherName = '(Unknown)'` and the same for `motherName` |

`String(this.fatherName)` in the posted object then sends `(Unknown)`, which is nine
characters and clears `validateBODYFatherName`'s `isLength({min: 3})`. **No backend change.**

The CSV path already does exactly this — `donorCsv.ts:137` blanks both names to `(Unknown)` —
so after this change the two entry points agree instead of disagreeing.

### 1.2 `badhan-frontend/src/views/SingleDonorCreation.vue`

The `HelpTooltip` list names every field's rule. Add two rows next to the Comment one:

* **Father's Name:** Field can be null but must be a string if not null
* **Mother's Name:** Field can be null but must be a string if not null

`prefillFromQuery` and `reset` already carry `fatherName` / `motherName` as `null`; nothing
there changes, and `keysExpected` in NewPersonCard keeps both keys.

### 1.3 Explicitly **not** in scope

The donor **edit** form (`PersonDetails.vue`) keeps its rules. Certificate rendering keeps
reading both fields. `POST /donors` keeps rejecting an absent or under-length name — the
client is what stops demanding one, and the server is what stops a blank reaching the
certificate.

---

## 2. What depends on the temporary token today

The audit the brief asks for. `verifyFeedbackToken` / `mintFeedbackToken` have exactly four
callers, and every route below is reached from them.

| Route | Uses the token for | After this plan |
| --- | --- | --- |
| `POST /feedbacks/token` | minting, both branches | **deleted** |
| `POST /feedbacks` (`type: 'feedback'`) | authorising the message, supplying the row's hall | token forbidden; hall comes from the matched donor record |
| `POST /feedbacks` (`type: 'newDonor'`) | authorising the registration, supplying the row's hall | unchanged, but the token never expires |
| `POST /guest/feedbacks/token` | demo mirror, mints a real token | **deleted**, replaced by two guest mirrors |
| `POST /guest/feedbacks` | accepts and ignores a token | body shape follows the real route |
| `GET /feedbacks`, `DELETE /feedbacks` | nothing — session auth | untouched |

Two more things die with the mint route, and both are dead code the moment it goes:

* `authenticator.handleAuthenticationIfHallStated` (`middlewares/authenticate.ts:83`) — the
  "authenticate only when `hall` is present" middleware exists for that one route's optional
  branch. The new mint route is authenticated unconditionally, so **delete it** and its export.
* `validateBODYDurationMinutes` (`validateRequest/validateBody.ts:168`) — **delete**, along
  with the `FEEDBACK_TOKEN_MAX_MINUTES` import at the top of that file.

`validateBODYQrHall` survives and gets stricter: it becomes **required** on the new route
rather than optional.

---

## 3. The token service

`badhan-backend/src/services/feedbackToken.ts`

* `FEEDBACK_TOKEN_DEFAULT_MINUTES`, `FEEDBACK_TOKEN_MAX_MINUTES` and `clampDurationMinutes`
  are deleted.
* `mintFeedbackToken(hall)` takes one argument and returns `{ token }` — no `expiresAt`, no
  second field for callers to thread through. `jwt.sign({ hall }, secret, { noTimestamp: true })`:
  no `expiresIn`, so the payload is exactly `{ hall }` and nothing else. The QR gets shorter,
  which helps it scan from the back of a room.
* `verifyFeedbackToken` **keeps** its `expired` branch. New tokens have no `exp` and can never
  produce it, but every code printed before this ships does, and `jwt.verify` will keep
  rejecting those for as long as they are on a wall. Telling that person "this code has
  expired, ask for a new one" stays the right sentence.
* **Delete the `typeof payload.exp !== 'number'` check.** It is what would reject every token
  this plan mints. Everything else in the shape check stays *word for word* — the
  `'_id' in payload || 'access' in payload` rejection is still the entire separation between a
  feedback token and a session token, and it is now the only one, since the payload has shrunk
  to a single claim.
* Rewrite the file header comment: the "nothing can be revoked, which is why the ceiling is 24
  hours" paragraph is now false in its second half and more important in its first. Say that a
  leaked token is live forever.

---

## 4. Backend routes

### 4.1 `POST /feedbacks/donorLookup` — new, public

Replaces the half of the mint route that answered "here is your record".

* **Unauthenticated**, like the route it comes from. Middlewares:
  `feedbackValidator.validatePOSTDonorLookup` (phone + student ID, the existing two chains),
  then `rateLimiter.feedbackLookupLimiter`.
* Renames `feedbackTokenLimiter` → `feedbackLookupLimiter`, same 10/min budget, same comment
  about being the feature's only guessing surface — it is now the *only* place that comment
  belongs, since volunteers minting QR codes no longer pass through it.
* Body: `{ phone: number, studentId: string }`. Response 200:
  `{ status, statusCode, message, donor }` where `donor` is the same `IPublicDonorSummary`,
  built field by field from `findPublicDonorProfile`. **Never spread the document.**
* Every failure — no match, phone right and ID wrong, ID right and phone wrong — is the same
  404 with `MINT_FAILURE_MESSAGE`, byte for byte. That constant is no longer about minting;
  rename it `LOOKUP_FAILURE_MESSAGE` and keep the text identical, because it is printed in the
  manual and in the frontend's own copy.
* No log entry: there is no user id.

### 4.2 `POST /feedbacks/registrationToken` — new, authenticated

Replaces the half of the mint route that made QR codes.

* Middlewares: `feedbackValidator.validatePOSTRegistrationToken` (just `validateBODYQrHall`,
  now required), `rateLimiter.commonLimiter`, `authenticator.handleAuthentication`.
  A signed-in member on the ordinary limiter — not on the public one.
* Body: `{ hall: number }`. Nothing else. `durationMinutes` is gone and phone/student ID are
  gone; the session already says who this is, which is strictly better than a pair of fields
  the caller could have typed.
* The designation rule is copied unchanged from the old handler: super admin may state any
  hall including `HALL_ANY`; anybody else gets 403 `NOT_AUTHORIZED_MESSAGE` unless
  `body.hall === requester.hall`. `validateBODYQrHall` keeps refusing ATTACHED and UNKNOWN for
  everyone.
* Response 200: `{ status, statusCode, message, token }`. **No `expiresAt`** — there is nothing
  to put in it, and an `expiresAt: null` would have every caller wondering.
* Logs `POST FEEDBACK REGISTRATION TOKEN` with `{ hall }`. Every code is attributable, as
  today; `durationMinutes` and `expiresAt` leave the log entry.
* No donor summary in the response. The panel ignored it anyway.

### 4.3 `POST /feedbacks` — the submit route

The route, the `type` field and the `feedbackJSON` shapes are unchanged. What changes is the
credential and where the hall comes from.

`validations/feedbacks.ts`: `validateBODYToken` moves out of the flat chain list and becomes
conditional — required when `type === 'newDonor'`, **forbidden** when `type === 'feedback'`
(`400` if present, so there is exactly one way to submit each kind rather than two that differ
silently). `validateFeedbackJSON` already enforces the per-type key lists and needs no edit:
a `feedback` payload is still exactly `{ phone, studentId, text }`.

The handler becomes two branches that share only the insert:

```
type = 'feedback'   → look up feedbackJSON.phone + feedbackJSON.studentId
                      no match → 404 LOOKUP_FAILURE_MESSAGE (unchanged)
                      row hall = THE MATCHED DONOR'S HALL, always
type = 'newDonor'   → verify body.token
                      invalid/expired → 401, the two messages unchanged
                      row hall = the token's hall, or feedbackJSON.hall when HALL_ANY
```

**The one behaviour change worth naming:** a message used to be filed under the *token's* hall
and is now filed under the *donor record's* hall. The two differed only when a volunteer minted
a hall-bearing token and then sent a message with it — the `OwnFeedbackPanel` path, where the
member's own hall and their record's hall are the same thing anyway. The new rule is also the
one the queue's visibility filter assumes, so this removes a way for a row to land in a queue
its donor does not belong to.

The `HALL_ANY`-must-never-be-stored guard and the final
`HALL_INDICES_ALLOWED_FOR_DONOR + ATTACHED` check stay exactly as they are, in the shared tail.

`rateLimiter.feedbackSubmissionLimiter` is untouched: 60/min for `newDonor`, 10/min for
`feedback`, failing closed to the strict budget when `type` cannot be read. The asymmetry's
justification is unchanged — the message branch still performs the lookup that makes it an
oracle, and it now shares that budget's story with `feedbackLookupLimiter`.

### 4.4 Guest mirrors — `GuestController.ts`

`POST /guest/feedbacks/token` is deleted and replaced by two `@Hidden()` mirrors matching the
real routes:

* `POST /guest/feedbacks/donorLookup` → `{ donor: <faker profile> }`, no token.
* `POST /guest/feedbacks/registrationToken` → a **real, verifiable** token from
  `mintFeedbackToken(body.hall ?? faker.getHall())`, so the guest QR generator and guest
  registration page work end to end as they do today. Guest routes stay unauthenticated;
  the guest user is a super admin, so there is no designation branch to mirror.

`POST /guest/feedbacks` keeps returning 201 without writing; drop `token` from its body type so
it matches the real route's now-conditional shape.

### 4.5 Regenerate

`docker compose exec backend npm run tsoa:routes`, then
`docker compose exec backend npx tsc --noEmit`.

---

## 5. Frontend

### 5.1 `api/index.ts`

* Delete `handlePOSTFeedbackToken`.
* Add `handlePOSTFeedbackDonorLookup({ phone, studentId })` → `POST /feedbacks/donorLookup`.
* Add `handlePOSTRegistrationToken({ hall })` → `POST /feedbacks/registrationToken`.
* `handlePOSTFeedback`'s payload type becomes `{ token?: string, type, feedbackJSON }`.

### 5.2 `views/PublicDonor.vue`

* `verify()` calls the lookup. Every branch below it is unchanged: `undefined` → network error,
  non-200 → the single mismatch line, 200 → `this.donor = response.data.donor` and
  `state = 'summary'`.
* **Delete `data.token`** and the comment about it living nowhere else.
* `submit()` sends `{ type: 'feedback', feedbackJSON: { phone, studentId, text } }` — the same
  `feedbackJSON` it builds today, minus the `token` field.
* **Delete the whole expiry path**: the `expiredNotice` flag, its `v-card-text`, the
  `HTTP_STATUS.UNAUTHORIZED` branch in `submit()` that sent the donor back to the form with
  their text preserved. There is no token to expire between the two steps any more. A 404 on
  submit (the record changed underneath them, which is vanishingly rare) falls into the generic
  failure line.

### 5.3 `views/Feedback/OwnFeedbackPanel.vue`

Drops from two calls to one. `submit()` posts the feedback directly with the signed-in member's
own `phone` and `studentId` from `$store.state.myprofile`; `canSubmit` still guards on both
being present. The "your own donor record could not be matched" message moves onto the
submission's 404. The panel's header comment — *it deliberately takes no shortcut and exercises
the real public contract* — is still true and still worth keeping.

### 5.4 `views/Feedback/RegistrationQrPanel.vue`

The biggest frontend diff, almost all deletions:

* Delete `durationMinutes`, `durations`, the `registrationQrDurationSelector` `v-select`,
  `expiresAt`, `expiryClock`, `expiryLine`, `durationLabel`, the `registrationQrExpiry`
  card, the `:sub-caption="expiryLine"` binding on the artwork, and the trailing "a printed
  registration code expires too" paragraph.
* Delete `canGenerate` and its `registrationQrProfileMissing` message: the mint no longer reads
  the member's phone or student ID, so a half-loaded profile cannot block it. The Generate
  button's `:disabled` becomes `generatingFlag` alone.
* `generate()` calls `handlePOSTRegistrationToken({ hall: this.hallToMint })` and reads
  `response.data.token`. The 403 and 401 branches stay word for word — 401 is now genuinely
  reachable on an expired session, which is what it always claimed to be about.
* Rewrite `registrationQrWarning`, which is the sentence this whole change turns on:
  *"Anyone who has this code can submit new donors to this hall **forever**. It never expires
  and it cannot be cancelled — take the sheet down and delete the link when the event is over."*
* `registrationQrLinkWarning` keeps saying the link is the credential, with "until it expires"
  struck out.
* `hallToMint`, `hallOptions`, `isAllHalls`, `generatedHall`, full screen and PDF download are
  all untouched.

### 5.5 `views/PublicRegistration.vue`

* The `?t=` token, the client-side `atob` peek at the payload, `hallLocked`, the `HALL_ANY`
  behaviour and the submit call are all **unchanged** — the token still carries a hall and the
  page still decodes it the same way.
* The `payload.exp < now` check and the `'expired'` state it sets on mount: keep both. An old
  printed code still exists and this is the page that has to explain it. A token with no `exp`
  simply skips the check.
* The 401-on-submit branch also stays, for the same reason.

### 5.6 `views/FeedbackQr/*`

`qrUrl.ts`, `FeedbackQrArtwork.vue`, `feedbackQrLayout.ts` and `feedbackQrPdf.ts` need no code
change — `subCaption` is already optional. Review `COPY` in `feedbackQrLayout.ts` for any
printed sentence that promises an expiry and rewrite it if one is there.

The donor-feedback poster (`FeedbackQrPanel.vue`) encodes `/#/donor` with no token at all and
is **completely untouched** by this plan.

---

## 6. Tests

### Backend — `badhan-backend-test/tests/feedbacks/`

| File | Action |
| --- | --- |
| `modify/token.test.js` | rewrite as `modify/donorLookup.test.js`: the summary is returned, the payload is exactly the nine public fields, every kind of mismatch answers identically, one credential alone is 400. **Delete** the duration-default/clamp test and the "token carries a hall and an expiry" test. |
| `modify/tokenHall.test.js` | rewrite as `modify/registrationToken.test.js`: no session → 401; volunteer stating their own hall → 200; volunteer stating another hall → 403; super admin stating any hall and `HALL_ANY` → 200; ATTACHED/UNKNOWN → 400; response has `token` and **no** `expiresAt`; the log row is written. |
| *new* `modify/registrationToken.test.js` assertion | decode the minted token and assert the payload is **exactly** `{ hall }` — no `exp`, no `iat`, no `_id`, no `access`. This is the test that pins the whole brief. |
| `modify/submit.test.js` | message submissions drop the token and pass phone + student ID; a `feedback` body carrying a token is 400; a mismatched pair is 404. |
| `modify/submitHall.test.js` | the `feedback` rows' hall now comes from the donor record — rewrite the hall-from-token cases for that type. The `newDonor` cases (token hall, `HALL_ANY` → `feedbackJSON.hall`) stay as they are. |
| `guest.test.js` | replace the `/guest/feedbacks/token` case with one per new guest mirror. |
| `helpers.js`, `schemas.js` | drop the token/`expiresAt` fields from the shared response schemas; add the lookup and registration-token shapes. |

Also add one regression test with a hand-signed **expiring** token to prove
`verifyFeedbackToken` still answers `expired` for codes printed before this release.

### Frontend — `badhan-frontend-test/cypress/`

* `support/helpers/feedback.ts` — the two `/feedbacks/token` calls at lines 146 and 162 become
  the lookup and the registration-token calls. Every spec that builds a token goes through here.
* `e2e/feedback/public-donor-page.cy.ts` — retarget the intercepts; **delete the token-expiry
  spec** (the "that took a little too long" path no longer exists).
* `e2e/feedback/public-registration-page.cy.ts` — retarget lines 442/454; keep any spec that
  feeds an old expiring token and expects the expired screen.
* `e2e/feedback/feedback-page.cy.ts:351` and `e2e/feedback/qr-surfaces.cy.ts:385` — retarget the
  `mintToken` / `mint` intercepts; drop assertions on the duration dropdown and the expiry line.
* `e2e/donors/` single-donor-creation specs — add a case that creates a donor with both parent
  name fields left blank and asserts the request body carries `(Unknown)` for each.
* `docs-screenshots/new-feature-new-student-data-collection/` — `02-generator-form`,
  `02b-hall-dropdown`, `03-generated-code`, `03b-all-halls-code`, `12-generated-link` and
  `registrationWalk.ts` all shoot the panel that loses its duration selector and expiry line.
  Re-shoot them; the manual embeds the results.

Run: `docker compose run --rm backend-test <cmd>` and `docker compose run --rm frontend-test <cmd>`.

---

## 7. Manual — `docs/manual/`

Required by the project's documentation rule, and larger than usual because the printed
guidance about expiry is now wrong in a way that matters.

* **`11-adding-new-donors.md`** — the field table at lines 30–31: Father's Name and Mother's
  Name become *"Optional. Printed on the donor's certificate ([chapter 7](07-the-donor-profile.md)),
  so write it in English if you know it. Left blank, it is saved as **(Unknown)** and a
  volunteer can fill it in later."*
* **`07-the-donor-profile.md`** lines 33–34 say both names "cannot be left empty" **on the
  profile**, which stays true — the edit form is unchanged. Add half a sentence noting that a
  donor created without them shows `(Unknown)` here from the start, not only for old records.
* **`20-donor-feedback.md`** — the real work:
  * line 261, "Choose how long it should work" → the step is gone; the generator now asks only
    which hall.
  * line 281, "Who made it, for which hall, and for how long" → drop the duration.
  * lines 302–303, "it works until it expires … pick a duration that matches the event" →
    rewrite as the plan's headline fact: **the code never expires and cannot be cancelled.**
    The advice that replaces "pick a short duration" is: make a code per event, take the sheet
    down afterwards, and do not circulate the link.
  * line 310, "until it expires" → forever.
  * line 323, "Pick a duration that covers the whole session" → delete the bullet.
  * line 328, "a printed registration code still expires" → invert it: a printed code keeps
    working indefinitely, which is why an old sheet on a notice board is a live door.
  * The donor page section: nothing about the fifteen-minute window or re-entering details
    after a delay survives. The donor's summary and message are two steps with no clock.
* **`19-glossary.md`** — no entry names the token today; add one only if the rewrite above
  introduces the word.

---

## 8. Order of work

1. **Section 1** on its own — the form change touches nothing else and can ship first.
2. Token service (§3), then the two new routes and the submit branch (§4.1–§4.3), then
   `tsoa:routes` + `tsc --noEmit`.
3. Guest mirrors (§4.4).
4. Frontend (§5), all five files in one pass — they break together the moment the old route
   goes.
5. Tests (§6), then the manual (§7).

Steps 2–4 are one deployable unit: the old route disappears and the frontend that called it
changes in the same release. There is no shim, so **a stale browser tab left open across the
deploy will fail on Continue and on Generate** until it is reloaded. That is acceptable for a
route whose callers are two public pages and one volunteer panel.

## 9. What this plan deliberately leaves alone

The `feedbacks` collection and its schema; the queue, `FeedbackCard`, the "create donor"
prefill handoff; hall visibility in `findFeedbacksForUser`; the donor-feedback poster and its
`/#/donor` URL; `POST /donors` and its parent-name validation; the certificate; the CSV import;
the MCP donor-creation tool, which already documents `""` for an unknown parent name.
