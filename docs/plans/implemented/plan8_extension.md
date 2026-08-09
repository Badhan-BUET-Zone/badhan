# Plan 8 extension — flexible hall on the registration QR code

This document extends [plan8_phases.md](implemented/plan8_phases.md), which is built and deployed. It
changes one thing and everything downstream of it: **who decides the hall a registration QR code is
minted for.**

Today the answer is "nobody decides — it is whichever hall the minter's own record carries." Phase 3.0
made the mint route unauthenticated with no `hall` parameter, and named the two consequences it was
accepting: a super admin cannot generate a code on another hall's behalf, and generating a code is
unattributable. [Appendix C item 7](implemented/plan8_phases.md#appendix-c--where-this-document-departs-from-plan8md)
records the first as a deliberate departure from `plan8.md` §২ক.১, which had always promised a super
admin the choice. This extension takes phase 3.0's own named follow-up — *"a `hall` body parameter
guarded by a designation check"* — and builds it, and gets the log entry back as a side effect.

What a user sees when this ships:

- **A hall dropdown on the Donor Registration QR page**, for super admins. Its options are the seven
  halls, `(Unknown)`, and one more: **All Halls**.
- **A code for a named hall** behaves exactly as today — every submission lands in that hall's queue.
- **A code for All Halls** asks the student which hall they are in, and the submission lands in the
  queue of the hall *they named*.
- **The registration page always shows the hall**, as a field rather than as a line on the review
  screen: **disabled and prefilled** under a named-hall code, **an enabled selector** under an
  All Halls code.
- **The QR sheet and the on-screen code carry the hall in words** — `Titumir Hall`, or `All Halls`.

| Phase | Title | Depends on | Deployable alone |
| --- | --- | --- | --- |
| [E1](#phase-e1--the-token-learns-one-more-hall-value) | `HALL_ANY` becomes a legal token claim | — | yes (invisible) |
| [E2](#phase-e2--the-hall-parameter-and-the-branch) | `POST /feedbacks/token` gains an optional `hall` | E1 | yes (invisible) |
| [E3](#phase-e3--where-the-rows-hall-comes-from) | The submit route resolves the hall in four cases | E1 | yes (invisible) |
| [E4](#phase-e4--the-hall-question-on-the-registration-page) | The hall field: disabled, or a selector | E1, E3 | yes |
| [E5](#phase-e5--the-generator-page-and-the-artwork) | The dropdown, and the hall on the artwork | E2, E4 | yes |
| [E6](#phase-e6--manual-suite-and-rollout) | Manual, full suite, rollout | all | — |

**E1–E3 ship dark.** E4 changes the public page but a named-hall code behaves as it does today, so it
is safe ahead of E5. **E5 is the first thing a super admin sees**, and it is last because it is the
only phase that can mint a token E3 has to understand — ship it after E3 is in production, never
before.

---

## E.0 The three decisions everything else follows from

### E.0.1 One route, one branch, and the branch is keyed on `hall`

**There is still exactly one mint route.** `POST /feedbacks/token` gains one optional body field,
`hall`, and this is phase 3.0's own named follow-up built as it was named: *"a `hall` body parameter
guarded by a designation check."*

The rule is one sentence: **stating a hall requires a session and permission; not stating one changes
nothing.**

| Body | Auth | Hall the token carries |
| --- | --- | --- |
| `{ phone, studentId }` | none | the matched donor's hall — **today's behaviour, untouched** |
| `{ phone, studentId, hall }` | **required** | `hall`, if the caller is allowed to state it |

**The branch key is the presence of `hall`, not the presence of a session.** That distinction is the
whole design and it is what keeps phase 3.0's property mostly intact: a signed-in volunteer who sends no
hall still gets byte-identically what an anonymous donor gets, so phase 3.5's test 14 — *"a signed-in
caller gets exactly the same answer as an anonymous one"* — survives unchanged for every body that omits
the field. The route never inspects the session to decide what to do; it inspects the body, and the
session is only how a stated hall gets authorised.

**A second route was considered and rejected in favour of this.** Splitting it would have kept each URL
single-mode, but at the cost of a fourth route on the controller, a second frontend API function, and a
duplicate of the mint-and-respond path that would then have to be kept in step. The branch is one
wrapper middleware and one `if`, and it is contained to this phase.

**Phone and student ID stay required in both branches**, and the response keeps its exact shape,
donor summary included. This is deliberate frugality: one body shape, one donor lookup, one response
type, and the QR generator page keeps sending what it already sends. The summary an authenticated
caller gets back is **their own** record — it is looked up from the phone and student ID *they* sent —
so a super admin minting for another hall learns nothing about that hall. The generator page ignores it
today and keeps ignoring it.

**Because the hall branch has a user, minting through it is logged.** Phase 2.0 recorded "minting is not
logged, and cannot be" — true of an anonymous request, and no longer true of one that states a hall.
E2 writes `POST FEEDBACK TOKEN` with the hall and the duration, and **E5 has the generator page always
send a hall — even a volunteer's own** — so that *every* QR code minted in the app takes the logged
branch. That is what `plan8.md` §২ক.১ told volunteers already happens
("কে কখন কোন হলের জন্য কত সময়ের কোড বানিয়েছেন তা লগে জমা থাকে") and what phase 3.0 had to withdraw.
Appendix A's *"Generating a registration code is unattributable"* row closes for QR codes; journey A's
donor page states no hall, stays anonymous, and stays unlogged, exactly as before.

### E.0.2 "All Halls" is `HALL_ANY = -1`, and it is a token claim, never a stored hall

`HALL_ANY` already exists in all three constants files as the report drill-down's "match any hall"
sentinel, and the frontend's copy already says *"Corresponds to the report's 'All Halls' view."* Reuse
it. Do not invent a second sentinel, and **do not reach for `HALLS_INDEX.ATTACHED` (7) or
`UNKNOWN` (8)** — those are real stored halls that happen to be visible to everyone through
`hasNoSpecificHall`, which is a *visibility* property. `HALL_ANY` is a different idea: it means **the
submitter names the hall**, and the row that results is visible under whatever hall they named.
Conflating the two would make an All Halls code produce rows every volunteer in the zone sees, which is
not what anyone asked for.

The token payload stays **exactly two claims**, `{ hall, exp }` — phase 2.0's rule and phase 2.4's test
survive untouched. `hall` gains one legal value. A JWT is one character longer, so the QR density note
in phase 9.3 is unaffected.

**`HALL_ANY` never reaches the `feedbacks` collection.** Every stored row's `hall` is a real hall
index; E3 is the code that guarantees it, and the model's own hall validator is the backstop.

### E.0.3 The dropdown is a super-admin control, and the server is what enforces that

| Caller | May mint for |
| --- | --- |
| Volunteer (1) | their own hall only |
| Hall admin (2) | their own hall only |
| Super admin (3) | any hall in the donor-allowed set, **or `HALL_ANY`** |

Volunteers and hall admins get no dropdown and no All Halls option — not because the page hides them,
but because the route answers **403** to either. The page's job is to not offer a control that would
fail; the route's job is to be right when someone posts to it directly.

**Why All Halls is super-admin-only.** Under an All Halls code the hall on the row is chosen by the
person filling in the form (E3), which is the single place in this feature where a submitter influences
routing. It is a small, bounded capability — the worst case is a junk row in a queue of the submitter's
choosing, which a volunteer discards — but it is a capability, and it belongs with the designation that
already sees every hall.

---

## Phase E1 — The token learns one more hall value

**Goal:** `mintFeedbackToken(HALL_ANY, …)` produces a token that `verifyFeedbackToken` accepts and
reports as `hall: -1`. Nothing else changes. No route calls it yet.

### E1.1 The change

[feedbackToken.ts](../../badhan-backend/src/services/feedbackToken.ts):

```ts
// HALL_ANY is not a hall. It is the claim an "All Halls" registration code carries, and it
// means: the submitter names the hall. It never reaches a stored row — the submit route
// resolves it to a real hall or answers 400.
const ALLOWED_TOKEN_HALLS: number[] = [...HALL_INDICES_ALLOWED_FOR_DONOR, HALLS_INDEX.ATTACHED, HALL_ANY]
```

That is the whole diff in this module. Three things must **not** change with it, and each has a test
standing on it already:

- **The payload stays `{ hall, exp }`.** No `mode`, no `anyHall` boolean, no `purpose`. The extra
  value goes in the claim that already exists (E.0.2), and phase 2.4's test 2 — exactly two claims —
  keeps passing unmodified.
- **The shape check is untouched.** `_id`/`access` rejection and the `exp` type check are the entire
  separation from session tokens (phase 2.2), and widening a hall list does not touch either. Phase
  2.4's test 5 (a real session token fails as `invalid`) must still pass.
- **`HALL_ANY` is not special-cased anywhere in this module.** It is a legal value of `hall`; the
  meaning lives at the submit route.

Add a sentence to the module's header comment saying `hall` may be `HALL_ANY`, and pointing at E3 for
what that means. The next person to read this file will otherwise assume `-1` is a bug.

### E1.2 Tests (`badhan-backend/…` unit level, alongside phase 2.4's)

1. A token minted with `HALL_ANY` verifies and reports `hall: -1`.
2. Its decoded payload still has **exactly two claims**.
3. `hall: -2`, `hall: 9`, and `hall: '6'` (a string) all still fail as `invalid` — widening the list
   by one value must not have widened it by more.
4. A real session token still fails as `invalid` (phase 2.2's regression test, re-run).

**Phase E1 is done when** those four pass and `git diff` on this file is the one-line array change plus
comments.

---

## Phase E2 — The hall parameter and the branch

**Goal:** `POST /feedbacks/token` accepts an optional `hall`; stating one requires a session and a
designation that allows it, and is logged. Omitting one leaves the route exactly as it is today. No UI
yet.

### E2.1 The conditional authentication middleware

The route has no authentication today and must not grow unconditional authentication — a donor
scanning a printed poster sends no `x-auth` header and must still get 200. So the branch is expressed
as one thin wrapper in
[authenticate.ts](../../badhan-backend/src/middlewares/authenticate.ts), beside the middleware it
delegates to:

```ts
// Authentication that applies only to a request that states a `hall`.
//
// The mint route is public: a donor arriving from a printed QR has no session and must get
// 200. But stating a hall is a permissioned act, so a body carrying one has to identify its
// caller. The branch is keyed on the BODY, never on whether an x-auth header happens to be
// present — a request with no hall is treated identically whether or not somebody is signed
// in, which is what keeps the route's public behaviour one thing.
//
// Runs after the body validator, so `hall` has already been checked and coerced by the time
// this reads it: a malformed hall is a 400, not a 401.
const handleAuthenticationIfHallStated = async (req, res, next) => {
  if (req.body.hall === undefined || req.body.hall === null) return next()
  return handleAuthentication(req, res, next)
}
```

It belongs in `authenticate.ts` rather than in the feedback validator because it is an authentication
concern and that is where the next person will look for it. `handleAuthentication` itself is
**not modified**: it already answers 401 for a missing, invalid or logged-out token and already
populates `res.locals.middlewareResponse.donor`.

### E2.2 The route

In [FeedbacksController.ts](../../badhan-backend/src/tsoaControllers/FeedbacksController.ts),
`postToken` changes in four places and nowhere else:

```ts
@Middlewares([
  feedbackValidator.validatePOSTToken,
  rateLimiter.feedbackTokenLimiter,
  authenticator.handleAuthenticationIfHallStated     // new, and last: validate, then throttle, then identify
])
public async postToken(
  @Body() body: { phone: number; studentId: string; durationMinutes?: number; hall?: number },
  @Request() req: any                                 // new — only read on the hall branch
): Promise<IPostTokenResponse>
```

- **`hall?: number` must be declared on the body type.** `tsoa.json` sets
  `noImplicitAdditionalProperties: "throw-on-extras"`, so an undeclared field is rejected before the
  handler runs — the field cannot be added by the validator alone. Regenerate with
  `npm run tsoa:routes` after the change.
- **Middleware order is load-bearing.** Validator first, so `hall: "abc"` is a 400 rather than a 401.
  The limiter keeps its existing position.

The handler, after the donor lookup that already happens:

```ts
// The hall the token will carry. Absent `hall` → the matched donor's own, exactly as before.
let tokenHall: number = profile.hall

if (body.hall !== undefined && body.hall !== null) {
  // Only reachable with a session: handleAuthenticationIfHallStated answered 401 otherwise.
  const user: IDonor = (req as any).res.locals.middlewareResponse.donor

  // The same comparison SearchController and DonorsController use. HALL_ANY needs no clause
  // of its own: no member's hall is -1, so this rejects it for anyone below super admin.
  if (user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN && body.hall !== user.hall) {
    return 403 'You are not authorized to access a donor of different hall'
  }

  tokenHall = body.hall
  // Attributable at last, because this branch has a user (E.0.1).
  await logInterface.addLog(user._id, 'POST FEEDBACK TOKEN', {
    hall: body.hall, durationMinutes: body.durationMinutes, expiresAt: minted.expiresAt
  })
}
```

Rules:

- **The 403 wording is the project's existing string**, byte for byte, as every other cross-hall
  refusal in the codebase.
- **This check is deliberately stricter than `isHallRestricted` is elsewhere.** A volunteer may not
  state `ATTACHED` or `(Unknown)` either, even though those are unrestricted halls for *reading*. A
  code is something you make for a hall you belong to, and nobody belongs to `(Unknown)`.
- **The response shape does not change** (E.0.1) — same nine-field donor summary, same `token`, same
  `expiresAt`. It is the caller's own record either way, so the hall branch discloses nothing new.
  Phase 3.5's test 2 (exactly nine fields) applies to both branches.
- **The anonymous path keeps its "no log entry, ever" comment**, now qualified: no log entry when no
  hall is stated. Leave the reasoning in place — it explains why journey A is unlogged.
- **The limiter stays `feedbackTokenLimiter`** — same route, same 10/min/IP. A member generating codes
  therefore shares the oracle budget phase 3.3 rationed. Accepted: generating is a once-an-event act
  and ten a minute is far above it. This is a small, named cost of one URL, and phase 3.3's paragraph
  about the limiter being the feature's only oracle stays true.

### E2.3 Validation

In [validations/feedbacks.ts](../../badhan-backend/src/validations/feedbacks.ts), `validatePOSTToken`
gains one chain — and the comment at the top of that file, which currently says *"There is deliberately
no `hall` here"*, must be rewritten rather than left to mislead:

```ts
const validatePOSTToken = validate([
  validateBODYPhone,              // unchanged
  validateBODYStudentId,          // unchanged
  validateBODYDurationMinutes,    // unchanged
  validateBODYQrHall              // new, optional
])
```

`validateBODYQrHall` in
[validateBody.ts](../../badhan-backend/src/validations/validateRequest/validateBody.ts), beside the
existing hall validators:

```ts
// Optional. Present only on a registration-QR mint, where it says which hall the code is
// for. Accepts the halls a donor may be assigned to, plus HALL_ANY for an "All Halls" code.
// Deliberately NOT the same set as validateBODYHall: ATTACHED is out (nobody makes a code
// for it) and HALL_ANY is in (no donor record is ever -1).
export const validateBODYQrHall: ValidationChain = body('hall')
  .optional()
  .isInt().toInt()
  .isIn([...HALL_INDICES_ALLOWED_FOR_DONOR, HALL_ANY])
  .withMessage('Please input an allowed hall number')
```

`hall: null` fails `isInt()` and is a 400, so the middleware's `null` guard is belt-and-braces rather
than a second meaning. A malformed or out-of-range hall is a **400** from here before authentication
runs; a *valid* hall the caller may not have is a **403**; a valid hall with no session is a **401**.
Three different answers to three different mistakes, and the tests assert each.

### E2.4 Guest mirror

[GuestController.ts](../../badhan-backend/src/tsoaControllers/GuestController.ts)'s
`@Post('feedbacks/token')` mirror already mints a real token. Give it the same optional `hall` — minting
for it when present, including `HALL_ANY`, and falling back to the faker donor's hall when absent. No
designation branch: the guest user is already a super admin.

### E2.5 Tests (`badhan-backend-test/tests/feedbacks/modify/token.test.js`)

The branch and the designation matrix are the point of this suite:

1. **No hall, no session → unchanged.** Re-run phase 3.5's tests 1, 2, 3 and 14 verbatim. This is the
   regression that matters most: journey A and phase 8.2's self-service panel both ride on this path,
   and this is the phase most likely to disturb it by accident.
2. **A hall with no session → 401**, and **no token in the body**.
3. **Volunteer, own hall → 200**, with a token whose decoded `hall` is their hall.
4. **Volunteer, another hall → 403**, the standard message, and no token.
5. **Volunteer, `HALL_ANY` → 403** — same message, same shape as case 4.
6. **Hall admin behaves exactly as the volunteer** in cases 3–5.
7. **Super admin, any named hall → 200**, decoded `hall` equals the one asked for.
8. **Super admin, `HALL_ANY` → 200**, decoded `hall` is `-1`.
9. **`hall: 7` (Attached) → 400** for a super admin too — the validator, not the permission check.
   `hall: 99` and `hall: "abc"` likewise, **and with no session as well**: a 400, not a 401, because
   the validator runs first.
10. **A signed-in caller sending no hall gets byte-identically what an anonymous one gets** (E.0.1).
    Phase 3.5's test 14, re-run and now load-bearing for the branch key.
11. **The response still has exactly the nine donor fields on both branches** — phase 3.5's test 2,
    re-run against a hall-stating request.
12. **`durationMinutes` behaviour is unchanged on both branches** — omitted → 15 minutes, `1440` → 200,
    `2000` → 400.
13. **A `POST FEEDBACK TOKEN` log row is written on the hall branch** with the hall and duration; **no
    log row on the 403 path**; and **no log row when no hall is stated** (journey A stays unlogged).

**Phase E2 is done when** a volunteer cannot obtain a token for a hall that is not theirs by any body
they can construct, and a body with no `hall` behaves exactly as it did before this phase.

---

## Phase E3 — Where the row's hall comes from

**Goal:** the submit route resolves `HALL_ANY` into a real hall, or refuses. This is the phase that
amends the single most emphatic rule in `plan8_phases.md`, so it is written to be read by whoever
finds the old comment first.

### E3.0 The rule, amended in full

Phase 4.0 says: **"The hall comes from the token; everything else comes from the submitter."** That was
true when a token could only carry a real hall. It is now true in three of four cases, and the fourth is
the whole feature:

| Token's `hall` | `type` | Row's `hall` | Decided by |
| --- | --- | --- | --- |
| a real hall `h` | `feedback` | `h` | the token — **unchanged** |
| a real hall `h` | `newDonor` | `h` | the token — **unchanged** |
| `HALL_ANY` | `feedback` | the **fetched donor's** hall | the server, from the donor record |
| `HALL_ANY` | `newDonor` | `feedbackJSON.hall` | **the submitter** |

Row three costs nothing: step 4 of phase 4.1 already fetches the donor for every `feedback`
submission, so its hall is in hand, and it comes off a database record rather than off the request. A
message filed with an All Halls code therefore lands in the queue of the hall the donor actually
belongs to — which, for a message, is the most useful place it could land.

**Row four is the only submitter-influenced hall in the feature, and it is deliberate.** An All Halls
code exists precisely so a student can say which hall they are in and be routed there. What it costs:
while such a code is live, anyone holding it can aim a `newDonor` row at any hall's queue. The blast
radius is unchanged in kind from phase 2.0's — junk rows that a volunteer discards — and changed only
in *which* queue receives them. It is bounded by the code's duration, by the 60/min submission limiter,
by the 4 KB payload cap, and by the fact that only a super admin can mint one. Recorded in Appendix A.

**Row four does not weaken rows one and two.** Under a named-hall code the body's `hall` is still
ignored entirely, still stored inside `feedbackJSON` for the volunteer to read, and still has no effect
on the column. Phase 4.5's test 8 — which deliberately sends a *different* hall in the body to prove
this — must keep passing untouched. Keep the shouty comment at the assignment site and extend it rather
than replacing it.

### E3.1 The change

In `postFeedback`, replacing the single `verification.hall` argument:

```ts
// The hall still comes from the token in every case the token names one. HALL_ANY is the
// one exception, and it is the point of an "All Halls" code: nobody named a hall when the
// code was made, so the submission names it.
//   - a message: the hall of the donor we just fetched — a database record, not the body
//   - a registration: feedbackJSON.hall, which the validator has already pinned to a real
//     hall, and which the form presented as a selector
// HALL_ANY must never be stored. If neither branch can produce a real hall, that is a 400,
// not an insert the model's own hall validator would reject as a 500.
```

Mechanics:

- For `type: 'feedback'` the existing donor lookup already returns the profile; **use its `hall`**.
  The lookup result is currently only checked for status — keep the returned data.
- For `type: 'newDonor'`, read `body.feedbackJSON.hall`. The payload validator
  ([feedbackPayload.ts](../../badhan-backend/src/validations/feedbackPayload.ts) line 185) already
  requires it to be in `HALL_INDICES_ALLOWED_FOR_DONOR`, so `-1` is rejected there as a 400 before this
  code runs. **Do not relax that check** — it is what makes this branch safe, and it needs a comment
  saying so, because "the token allows -1, why doesn't the payload?" is the obvious wrong simplification.
- **A final guard before the insert:** if the resolved hall is not in
  `[...HALL_INDICES_ALLOWED_FOR_DONOR, HALLS_INDEX.ATTACHED]`, answer **400** with the standard
  mismatch message rather than inserting. Unreachable given the two branches above; it exists so that a
  future third `type` cannot reach the collection with `-1`.

Nothing else in the route moves. The token verification, the expired/invalid split, the validator
dispatch, the 201 message and the "no log entry" rule are all unchanged.

### E3.2 Tests (`badhan-backend-test/tests/feedbacks/modify/submit.test.js`)

One test per row of the table, plus the guards:

1. **Named-hall token + `newDonor` carrying a different hall → row's `hall` is the token's**
   (phase 4.5 test 8, re-run unmodified — the regression that matters most here).
2. **All Halls token + `newDonor` naming hall X → row's `hall` is X**, and `feedbackJSON.hall` is X too.
3. **All Halls token + `newDonor` naming a different hall Y → row's `hall` is Y.** Two halls, two
   rows, one token: this is what pins that the token is genuinely not deciding.
4. **All Halls token + `newDonor` with `hall: -1` in the payload → 400**, and **no row is written**.
5. **All Halls token + `feedback` for a donor in hall Z → row's `hall` is Z**, the donor's own — not
   `-1`, and not the hall of whoever minted the code.
6. **All Halls token + `feedback` for a pair matching no donor → 404**, unchanged from phase 4.5's
   test 17, and no row.
7. **No stored row anywhere has `hall: -1`** — query the collection after the whole file and assert it.
8. The row still has exactly four fields (phase 4.5 test 9, re-run).

**Phase E3 is done when** an All Halls token routes by the submission and a named-hall token still
cannot be aimed.

---

## Phase E4 — The hall question on the registration page

**Goal:** `/#/register` shows the hall as a field in both modes — disabled under a named-hall code, an
enabled selector under an All Halls code.

### E4.0 A departure from phase 7.2, stated plainly

Phase 7.2 removed the hall question with a rule: *"a screen that cannot be answered is not a step"*, and
put the hall on the review screen as a read-only line instead. **That rule is being set aside, on
purpose.**

Under an All Halls code the hall is a real question with a real answer, so it has to be a step. Having
it appear as a step in one mode and vanish in the other would give the two codes visibly different
sequences for no reason a student could see, and would make the step count depend on something they were
never told. **So the step is always there** — answerable under one code, disabled and prefilled under
the other. A disabled field that says *"This code was made for Titumir Hall"* is not a screen with no
valid answer; it is a screen whose answer has already been given, and telling a student where their
submission is going before they finish is worth one tap.

The review screen's read-only hall line stays as well, in both modes. It costs nothing and it is the
last thing a student sees before submitting.

### E4.1 The step

Add to [steps.ts](../../badhan-frontend/src/views/PublicRegistration/steps.ts), **at position 5**, after
blood group — the position `plan8.md` §২ক.২ always gave it:

```ts
{
  field: 'hall',
  question: 'Which hall are you in?',
  kind: 'choice',
  // The same set the donor-creation form offers: the seven halls plus (Unknown).
  // Attached is not among them, exactly as in NewPersonCard.
  choices: [...],           // restrictedHallNames() + halls[HALLS_INDEX.UNKNOWN], as index/label pairs
  valid: (v) => Number.isInteger(v) && HALL_CHOICES.includes(v)
}
```

- **The choice set is `restrictedHallNames()` plus `(Unknown)`** — indices 0–6 and 8. It is the set
  [NewPersonCard.vue:227](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L227)
  builds for the volunteer's own form, and the two must stay in step: a hall a student can pick but a
  volunteer cannot save would be a dead end at creation time. Derive it from the same helpers rather
  than listing halls by hand.
- **It is never optional and has no Skip**, in either mode.
- **Remove the `hall` comment at the top of the file** that says the field is deliberately absent, and
  replace it with what is now true.

### E4.2 The two modes in `PublicRegistration.vue`

`readToken()` already decodes `hall` from the token. Extend it:

- **`payload.hall === HALL_ANY`** → `hallLocked = false`, and `answers.hall` is left **unset** so the
  student must choose. The step validates as any other choice step does.
- **A real hall** → `hallLocked = true`, `answers.hall = payload.hall` at mount exactly as today, and
  the step renders **disabled**.
- **Anything else** → the `invalid` state, unchanged. Note the current guard is
  `halls[payload.hall] === undefined`, which rejects `-1` today; it must now accept `HALL_ANY`
  explicitly and keep rejecting everything else.

The disabled rendering:

- The choice control is rendered with every option except the token's hall **disabled**, or as a plain
  disabled field showing the hall name — either is fine, but it must be *visibly a field showing a
  value*, not a sentence. Below it, one line: *"This code was made for Titumir Hall. Your submission
  goes to that hall's volunteers."*
- **Next is enabled immediately** — the answer is already valid.
- **A disabled step must still be skippable by Back/Next navigation without clearing the value.** The
  existing `setAnswer` path must not be reachable from it.

`buildPayload()` currently hardcodes `hall: this.hall`. It becomes `hall: this.answers.hall` — the same
value in the locked mode, the student's choice in the other. **The progress denominator grows by one in
both modes** (eleven steps for a first-time donor, up from ten), which is the honest direction phase 7.2
asked for.

The review screen's hall line stays, with mode-appropriate wording: *"This form was opened for Titumir
Hall"* when locked, *"You chose Titumir Hall"* when not.

### E4.3 Tests (`badhan-frontend-test/cypress/e2e/feedback/public-registration-page.cy.ts`)

1. **Named-hall token: the hall step renders, its control is disabled, and it shows the token's hall.**
   This replaces phase 7.3's test 6, which asserts the *absence* of a hall input everywhere — that test
   must be rewritten, not deleted, and the rewrite should still assert there is no way to change the
   value.
2. **Named-hall token: the submitted `feedbackJSON.hall` and the row's `hall` are both the token's**,
   even after walking back and forth through the step.
3. **All Halls token: the hall step renders enabled**, with the eight expected options and **no
   preselected value**, and **Next is disabled until one is chosen**.
4. **All Halls token: choosing hall X puts X in `feedbackJSON.hall` and in the row's `hall`** — read
   back through an authenticated API call as a super admin.
5. **The progress denominator includes the hall step in both modes** (eleven for a 0/0 donor).
6. **Back preserves the chosen hall** (phase 7.3's test 4, extended to the new step).
7. **A token with `hall: -2` still lands on the invalid-link state** — widening the decoder by one
   value must not have widened it further.

---

## Phase E5 — The generator page and the artwork

**Goal:** the super admin's dropdown, and the hall in words on every surface the code appears on.

### E5.1 The API call

**No new function.** `handlePOSTFeedbackToken` in
[api/index.ts](../../badhan-frontend/src/api/index.ts) gains one optional field:

```ts
const handlePOSTFeedbackToken = async (payload: {
  phone: number, studentId: string, durationMinutes?: number, hall?: number
}) => …
```

Journey A's page and the self-service panel keep calling it with no `hall` and are unaffected. It
already goes through `badhanAxios`, so guest mode keeps working through E2.4's mirror.

### E5.2 `RegistrationQr.vue`

- **The hall control**, replacing the read-only sentence at
  [RegistrationQr.vue:46-49](../../badhan-frontend/src/views/RegistrationQr.vue#L46-L49):
  - **Super admin** → a `v-select`, options = the seven halls, `(Unknown)`, and **All Halls**
    (`HALL_ANY`), defaulting to **their own hall**. A default of All Halls would make the most permissive
    code the easiest one to make by accident.
  - **Everyone else** → keep today's read-only line, wording adjusted: it can no longer say *"a hall
    that wants one makes its own"*, because now a super admin can make one for them. Say instead that a
    code is for your own hall, and that a super admin can make one for any hall.
  - Under an All Halls selection, one visible line: *"Students who scan this code will be asked which
    hall they are in, and their submission goes to that hall's volunteers."* It changes what the code
    does, so it says so at the moment of choosing.
- **`generate()` always sends a `hall`** — the super admin's selection, or, for everyone else, their
  own hall from `myprofile`. Sending it even when it is redundant is deliberate: it puts **every QR
  mint on the authenticated, logged branch** (E.0.1), so "who made this code" is answerable for
  volunteers too and not only for super admins. The call is otherwise the one this page already makes,
  with the member's own phone and student ID.
- **`canGenerate` and the `registrationQrProfileMissing` message stay.** The route still needs the
  member's own phone and student ID in both branches (E.0.1), so the guard is still earning its keep.
- **A 403 gets its own message** — *"You can only generate a code for your own hall."* — distinct from
  the generic failure, and a **401** gets *"Your session has expired. Please sign in again."* Both
  should be unreachable from the UI; saying so plainly is how the next person finds out that one
  wasn't.
- **The hall label is computed from the response's `hall`**, not from the local selection, so what the
  page claims and what the token carries cannot drift.

### E5.3 The artwork carries the hall

[FeedbackQrArtwork.vue](../../badhan-frontend/src/views/FeedbackQr/FeedbackQrArtwork.vue) gains a third
text line and a third prop:

- **`hallLine`**, default `''`. Rendered only when non-empty, exactly as `subCaption` is. Its content is
  the hall name plus `Hall`, or the literal **`All Halls`**.
- **`HALL_LINE` in [feedbackQrLayout.ts](../../badhan-frontend/src/views/FeedbackQr/feedbackQrLayout.ts)**:
  `centerX: PAGE.width / 2`, `baseline: 82`, `fontSize: 6`, the same
  `Helvetica, Arial, sans-serif` as the other two. It sits between the sub-caption (72) and the QR box
  (y 90) — inside the existing gap, so **no other measurement moves and the QR does not shrink.** One
  source of truth for layout is phase 9.2's rule; the PDF builder picks this up for free because it
  renders the same SVG.
- **The feedback poster passes nothing** and is byte-identical to today's. Journey A's sheet is
  zone-wide and has no hall (phase 9.0); the layout comment saying "no hall name" applies to *that*
  sheet and must be reworded rather than deleted.
- **Full-screen mode shows the hall line only** — `caption: ''`, `subCaption: ''`,
  `hallLine: <the hall>`. A projected code at an event should say which hall it is for, in one short
  line that costs the QR nothing; the caption and expiry are chrome the back row cannot read anyway.

### E5.4 Tests (`badhan-frontend-test/cypress/e2e/feedback/qr-surfaces.cy.ts`)

1. **A super admin sees a hall dropdown**, defaulting to their own hall, whose options include every
   hall name and **All Halls**.
2. **A volunteer sees no dropdown** and sees the read-only line — replacing phase 9.5's *"there is no
   selector for anyone"* assertion, which is now false and must be rewritten rather than deleted.
3. **A hall admin sees no dropdown either.**
3b. **A volunteer's Generate still sends its own hall in the body** — asserted through `cy.intercept`,
    because that is the mechanism that puts every QR mint on the logged branch (E5.2) and "it worked"
    would pass without it.
4. **Generating for another hall as a super admin: the decoded QR is `/#/register?t=…` and the token's
   `hall` is the chosen one.** Decode the rendered QR with `jsQR` through the existing
   [decodeQr.ts](../../badhan-frontend-test/cypress/support/helpers/decodeQr.ts) helper — assert the
   token from the pixels, not from the page's own state.
5. **Generating for All Halls: the token's `hall` is `-1`**, and the artwork's hall line reads exactly
   `All Halls`.
6. **The artwork's hall line reads `Titumir Hall`** for a named hall, and the same string appears in the
   downloaded PDF's text.
7. **The feedback poster still has no hall line** and its artwork is unchanged (phase 9.5's caption
   assertion, re-run).
8. **Full-screen mode still decodes to the same string** it did before entering it (phase 9.5's test,
   re-run), and now also shows the hall line.
9. **The QR box is still ≥ 80 mm square and the `viewBox` is still `0 0 210 297`** — the third text
   line must not have moved the code.

---

## Phase E6 — Manual, suite, and rollout

### E6.1 The manual

Per [CLAUDE.md](../../CLAUDE.md), the behaviour change ships with its documentation.

**[20-donor-feedback.md](../manual/20-donor-feedback.md)** — the chapter currently says a code is
always for your own hall. Rewrite that passage:

- A volunteer or hall admin still makes codes for their own hall only, and nothing about their page has
  changed except the wording.
- **A super admin picks the hall from a dropdown**, including halls they are not in — so a hall that
  wants a code can now ask a super admin for one, instead of finding somebody with a record there.
- **What All Halls is:** a code that does not name a hall, for events where students from several halls
  are in one room. The student is asked which hall they are in, and their submission goes to that
  hall's volunteers. Say plainly that the student's answer is what routes it, so a student who picks
  wrongly lands in the wrong hall's queue — and that the volunteer creating the donor can correct the
  hall at that point, exactly as they already correct anything else.
- **Which code to use.** A hall event gets that hall's code; a zone-wide event — a joint orientation, a
  campus-wide drive — gets All Halls. The named code is the safer default and is what most volunteers
  will use.
- **The sheet and the screen now say which hall the code is for**, in words under the caption, so a code
  left on a desk can be identified without scanning it.
- **The student is now asked, or shown, their hall** — it is a field on their phone, disabled under a
  named-hall code. A volunteer at the desk being asked "why can't I change this?" should know the
  answer.
- **Making a code is recorded in the log** — who, which hall, how long. This is the line §২ক.১ always
  promised and the app can finally keep.

**[04-roles-and-permissions.md](../manual/04-roles-and-permissions.md)** — add the row: generating a
registration QR for another hall, and for All Halls, is super admin only.

**[05-the-screen-and-the-menu.md](../manual/05-the-screen-and-the-menu.md)** — the Donor Registration QR
entry is unchanged, but its one-line description should mention the hall choice.

**[plan8.md](implemented/plan8.md) §২ক.১** already describes a super admin choosing any hall and a log
of who made what. Both become true with this extension; no edit is needed there, but note in the commit
that Appendix C item 7 of `plan8_phases.md` is withdrawn.

### E6.2 The suite

Nothing runs on the host ([CLAUDE.md](../../CLAUDE.md)):

```
docker compose up -d
docker compose exec backend npx tsc --noEmit
docker compose exec backend npm run tsoa:routes          # a controller changed
docker compose exec frontend npm run build
docker compose build backend-test                        # no volume mount — rebuild or you run old tests
docker compose run --rm backend-test
docker compose run --rm frontend-test
```

Two things to know before reading a failure:

- **Two full backend runs inside five minutes fail spuriously** on `signInLimiter`, with dozens of
  unrelated 429s. Phase 10's note explains it; this extension adds roughly a dozen more sign-ins to that
  budget. Check one failure's message before hunting a regression.
- **The bundle check still applies.** `qrcode`, `jspdf` and `svg2pdf.js` must stay behind dynamic
  imports:
  `docker compose exec frontend grep -c "jsPDF\|svg2pdf\|QRCode" dist/js/app.*.js` must be **0**. This
  extension touches the generator page, which is where an accidental static import would come from.

### E6.3 Rollout

- **E3 must be in production before any All Halls code is minted.** A token whose hall is `-1` reaching
  a submit route that does not understand it produces a 400 at best and a 500 at worst, for a student
  standing at a desk. Ship E1–E3, then E4, then E5 — or ship them together, but never E5 first.
- **No printed paper is affected.** Journey A's poster is unchanged and every sheet already on a wall
  keeps working.
- **Existing live registration codes keep working.** They carry real halls and take rows one and two of
  E3.0's table, which are unchanged.
- **Try All Halls at one event first**, as phase 10 said of the registration QR itself. It is the one
  new capability where a submitter picks the queue, and the thing worth watching is whether students
  actually pick their own hall correctly.

---

## Appendix — Risks this extension adds or changes

| Risk | Standing decision |
| --- | --- |
| **A submitter chooses which hall's queue receives their row** | New, and only under an All Halls code (E3.0 row four). It is the feature, not a leak: the code exists so a student can say where they are. Bounded by the code's duration, the 60/min limiter, the 4 KB cap, and by All Halls being super-admin-only. The harm is a junk row in a chosen queue, discarded like any other. |
| **A student picks the wrong hall under an All Halls code** | Expected and cheap. The submission lands in that hall's queue and the volunteer creating the donor sets the right hall — the same correction phase 7.2 already relies on for a student standing at another hall's desk. The manual says so. |
| **`HALL_ANY` reaching the `feedbacks` collection** | Blocked in three places: the payload validator rejects `-1` for `newDonor` (unchanged from today), E3.1's explicit guard answers 400 before the insert, and the model's own hall validator is the backstop. Pinned by E3.2's test 7. |
| **A volunteer minting for another hall** | Blocked at the route by the designation check (E2.2), not by the page. Pinned by E2.5's cases 4–6. The dropdown's absence for non-super-admins is cosmetic. |
| **The public mint route now has two behaviours behind one URL** | Accepted knowingly, as the cost of one URL (E.0.1). Narrowed by keying the branch on the **body** rather than on the session, so a request with no `hall` behaves identically signed in or out — pinned by E2.5's cases 1 and 10. The risk is that a future change makes the anonymous path depend on the session by accident; those two tests are what catch it. |
| **A member generating codes shares the mint route's rate budget with donors** | Accepted (E2.2). `feedbackTokenLimiter` is 10/min/IP and generating a code is a once-an-event act, so the ceiling is far above real use — but a hall's NAT is one bucket, so a desk generating codes eats into the same allowance as donors scanning the poster from that network. The fix, if it ever bites, is a separate limiter selected by the presence of `hall` — the same body-keyed branch, applied to throttling. |
| **The named-hall rule quietly becoming "read the body's hall"** | The likeliest bad simplification, now that one branch legitimately does read it. Held off by the comment at the assignment site, by the payload validator's continued rejection of `-1`, and by phase 4.5's test 8 being re-run as E3.2's test 1. |
| Generating a registration code is unattributable | **Closed for QR codes** (E.0.1). `POST FEEDBACK TOKEN` records who, which hall and how long, on every request that states a hall — and E5.2 has the generator page always state one, including for volunteers. A request with no hall is still unlogged, but it can only ever mint for the hall of the record whose credentials it was given. |
| A leaked registration QR | Unchanged in kind (phase 2.0). An All Halls code leaks the same nothing — the payload is still a hall claim and an expiry — but its blast radius now spans queues rather than one. Same mitigation: short durations, and it cannot be revoked. |
| The registration sequence grows by one step | Accepted (E4.0). Eleven steps for a first-time donor rather than ten. Phase 7.2's abandonment risk grows slightly; the step is one tap under a named-hall code, which is the common case. |

## Appendix — What this supersedes in `plan8_phases.md`

1. **§3.0's "no super-admin hall selector"** and **"there is no `hall` in the request body"** —
   withdrawn. There is one optional `hall`, on the same route, guarded by a designation check —
   phase 3.0's own named follow-up (E.0.1). Both consequences it accepted are addressed: a super admin
   can mint for another hall, and a mint that states a hall is logged. What survives is the more
   important half of 3.0: **still one mint route**, and it is still session-blind for every request
   that does not state a hall.
2. **§2.0's "minting is not logged, and cannot be"** — true only of a request with no `hall` (E2.2).
3. **§4.0's "the hall always comes from the token"** — amended to E3.0's four-case table. Three cases
   unchanged; the fourth exists only under an All Halls token.
4. **§7.2's "`hall` is not one of the questions"** — withdrawn (E4.0). It is a step in both modes,
   disabled in one of them. Phase 7.3's test 6 is rewritten, not deleted.
5. **§9.2/§9.3's "no hall name on the artwork"** — still true of journey A's poster, no longer true of
   the registration code (E5.3).
6. **Appendix C item 7** — *"A super admin cannot generate a registration code for another hall"* — no
   longer a departure from `plan8.md` §২ক.১; the original promise is restored.
