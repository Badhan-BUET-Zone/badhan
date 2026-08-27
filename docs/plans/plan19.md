# Plan 19 — bring the HTTP API in line with RESTful design practice

Reference: [Web API design best practices](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design)
(Azure Architecture Center). Every rule cited below is from that document.

The API grew one endpoint at a time, and it shows. There are 84 route declarations across 15
controllers ([tsoaControllers/](../../badhan-backend/src/tsoaControllers/)), and the shape of a
route is currently a function of the week it was written in: three different casing conventions in
the path, resource ids passed in the path in three places and the query string in eight, version
numbers glued onto individual routes rather than the API, one collection named in the singular,
`POST` returning 200 and `PATCH` returning 201, and a 1334-line controller whose entire job is to
mirror forty other routes under a different prefix.

None of this is broken. All of it is friction: every new endpoint has to guess which of the existing
conventions to copy, and the frontend's `api/index.ts` has grown a bespoke call signature per route
because no two routes agree on where an id goes.

This plan makes one pass over the whole surface and lands it on a single set of rules.

**Decisions taken before this plan was written** (asked and answered; not re-litigated below):

* **Fix in place. No `/v1` prefix, no dual-mount, no deprecation window.** This is the document's
  "no versioning" option, which it recommends for internal APIs, and it is the right call here
  because there is exactly one client. `badhan-android` is a Trusted Web Activity
  ([twa-manifest.json](../../badhan-android/twa-manifest.json)) — a shell around the live web app,
  not a separate API consumer — so there is no pinned native build to strand. The frontend and the
  128 test files change in the same commits as the routes they call. The per-route `v2`/`v3`
  segments that exist today (`PATCH /donors/v2`, `GET /search/v3`) are deleted, not renumbered:
  they are the residue of a versioning scheme that was never actually a scheme.
* **Guest mode stops being a URI prefix and becomes a claim on the token.** See Phase P6.
* **In scope beyond URIs and verbs:** the response envelope and error shape (P5), the
  `x-auth` → `Authorization: Bearer` move and correlation-id propagation (P7), and HATEOAS links
  (P8).
* **Explicitly out of scope:** pagination (`limit`/`offset`) and a redesigned filter vocabulary.
  The document recommends both, and several collections here are unbounded — `GET /donors/all`,
  `GET /search/v3`, `GET /logs` — so this is real debt, but it is a behavioural change to every
  list screen in the frontend and deserves its own plan. **Where a URI collapse in P2 forces a
  filter parameter to exist, the existing query vocabulary is carried over verbatim.** The
  four-boolean availability filter (`isAvailable`, `isNotAvailable`, `availableToAll`,
  `markedByMe`) is ugly and stays ugly in this plan.

---

## The rules this plan applies

Stated once here so each mapping below can just point at a rule number.

1. **Nouns, never verbs.** The method is the verb. `POST /donors/{id}/password-reset-links`, not
   `POST /donors/password`.
2. **Plural, kebab-case collection names.** `platelet-donations` already does this; `activeDonors`,
   `publicContacts`, `callrecords` and `log` each do something else.
3. **The identity of a resource goes in the path.** Not the query string, not the body. A filter
   goes in the query string.
4. **Depth stops at `collection/item/collection`.** The document's explicit ceiling. Every nesting
   this plan introduces sits exactly at it.
5. **Status codes mean what the spec says.** `201` only when something was created, and with a
   `Location` header. `204` for a successful delete. `PUT` is idempotent; `POST` need not be.
6. **The response body is the resource,** not a restatement of the status line.
7. **Errors share one shape.**

---

## Phase P0 — the two decisions that have to be made before any route moves

### P0.1 Delete `/deprecated` and `/maintenance`

[OtherController.ts:41-73](../../badhan-backend/src/tsoaControllers/OtherController.ts#L41) exposes
two routes that return **404 with a human message** — `Please update your app` and
`This feature is currently under maintenance`. Nothing references either one: grepping
`badhan-frontend/src` and [environments.js](../../environments.js) for `deprecated` or `maintenance`
returns nothing. They are the remains of a base-URL-swap kill switch that no longer exists.

Delete both. If the kill switch is ever wanted again it is not a resource — it is `503` with
`Retry-After` on every route (there is already a
[ServiceUnavailableError503](../../badhan-backend/src/response/models/errorTypes/ServiceUnavailableError503.ts)
model sitting unused) and `426 Upgrade Required` for the client-too-old case. A 404 saying
"under maintenance" is wrong on both the code and the mechanism.

`GET /` stays, and becomes the service root — in P8 it also becomes the HATEOAS entry point.

### P0.2 Gate `/test` behind the environment

[TestController.ts](../../badhan-backend/src/tsoaControllers/TestController.ts) exposes
`POST /test/internalServerError/controller` and `.../dbinterface`, which deliberately throw. They
are `@Hidden()` from the OpenAPI document but they are *routed in production*. The URIs do not need
to change — `badhan-backend-test/tests/common/` calls them and they are honest names — but
registration must be conditional on `dotenv.NODE_ENV`.

**Verification for P0:** `GET /deprecated` returns the standard 404 route-not-found body from
[errorHandlers.ts:7](../../badhan-backend/src/response/errorHandlers.ts#L7), not the custom one.
`POST /test/internalServerError/controller` returns 404 when `NODE_ENV=production` and still 500
under the test profile, so `docker compose run --rm backend-test npx jest tests/common` stays green.

---

## Phase P1 — sessions

Sign-in and sign-out are the clearest verbs-in-URIs in the codebase, and the fix is the standard
one: **the thing being created is a session.**

| Today | Target | Rule |
| --- | --- | --- |
| `POST /users/signin` → 201 | `POST /sessions` → 201 + `Location: /sessions/{id}` | 1, 5 |
| `PATCH /users/redirection` → 201 | `POST /sessions` (redirection-token body variant) → 201 | 1, 5 |
| `POST /users/redirection` → 201 | `POST /sessions/current/redirection-tokens` → 201 | 1, 4 |
| `DELETE /users/signout` | `DELETE /sessions/current` → 204 | 1, 5 |
| `DELETE /users/signout/all` | `DELETE /sessions` → 204 | 1, 5 |
| `GET /users/logins` | `GET /sessions` → 200 | 1, 3 |
| `DELETE /users/logins/{tokenId}` | `DELETE /sessions/{sessionId}` → 204 | 5 |
| `DELETE /users/logins` → 400 | *deleted* | — |
| `PATCH /users/password` → 201 | `PUT /users/me/password` → 204 | 5 |
| `GET /users/me` | `GET /users/me` (unchanged) | — |

Four things worth spelling out.

**`PATCH /users/redirection` becomes a second way to `POST /sessions`.** It is at
[UsersController.ts:225-306](../../badhan-backend/src/tsoaControllers/UsersController.ts#L225) and
it is a `PATCH` that creates a token and returns `201`. It does not patch anything. It creates the
same resource `POST /users/signin` creates — a logged-in session — from a different credential, so
it collapses into the same endpoint with a discriminated body: `{phone, password}` or
`{redirectionToken}`. One handler, one response shape, one `Location` header.

**`DELETE /users/logins` currently exists only to return 400.**
[UsersController.ts:419-433](../../badhan-backend/src/tsoaControllers/UsersController.ts#L419) is a
route whose entire body is `setStatus(400)`, guarding against a client that forgot the `{tokenId}`
segment. Under the new scheme `DELETE /sessions` is meaningful — it is sign-out-everywhere, which
already exists as `signout/all`. That is a real hazard change: a client that drops a path segment
now signs the user out of every device instead of getting a 400. It is also exactly what the
document's method table prescribes for `DELETE` on a collection, and the frontend never constructs
that URL dynamically ([api/index.ts:648](../../badhan-frontend/src/api/index.ts#L648) interpolates
`payload.tokenId` into a template literal). Accept it, and keep the existing
`tests/users/logins` cases that assert the 400 — rewritten to assert the new semantics.

**`PUT`, not `PATCH`, for the password.** Replacing a single value wholesale with a payload that
*is* the new value is a replace, and it is idempotent — the document's definition of `PUT`. The
current `201` is the plainest status-code error in the file: nothing is created.

**`/sessions/current`** is the same alias idea as `/users/me`, applied to the token in the
`Authorization` header. Keeping `me` for the principal and `current` for the session avoids
inventing an id scheme for "the session you are holding".

**Verification for P1:** sign in, list sessions, revoke one, sign out — all from the app — with the
network tab showing `POST /sessions` → 201 carrying a `Location`, and both `DELETE`s returning 204
with an empty body. `docker compose run --rm backend-test npx jest tests/users` green.

---

## Phase P2 — donors, and the collapse of `/search`

This is the largest phase. Nine of the fourteen donor routes are a filter, an alias, or an id in
the wrong place.

| Today | Target | Rule |
| --- | --- | --- |
| `GET /donors?donorId=` | `GET /donors/{donorId}` | 3 |
| `POST /donors` → 201 | `POST /donors` → 201 + `Location` | 5 |
| `PATCH /donors/v2` (donorId in body) | `PATCH /donors/{donorId}` | 3 |
| `DELETE /donors?donorId=` | `DELETE /donors/{donorId}` → 204 | 3, 5 |
| `PATCH /donors/comment` (donorId in body) | `PUT /donors/{donorId}/comment` | 3, 4, 5 |
| `PATCH /donors/designation` (donorId in body) | `PUT /donors/{donorId}/designation` | 3, 4, 5 |
| `POST /donors/password` (donorId in body) | `POST /donors/{donorId}/password-reset-links` → 201 | 1, 3, 4 |
| `GET /donors/me` | *deleted* | duplicate of `GET /users/me` |
| `GET /donors/all?archiveFlag=` | `GET /donors?archived=` | 3 |
| `GET /donors/new?startTime=&endTime=` | `GET /donors?createdAfter=&createdBefore=` | 1, 3 |
| `GET /donors/certificateEnabled` | `GET /donors?certificateEnabled=true` | 3 |
| `GET /donors/checkDuplicate?phone=` | `GET /donors?phone=` | 1, 3 |
| `GET /donors/phone?phoneList=` | `GET /donors?phone=a,b,c` | 1, 3 |
| `GET /donors/designation` | `GET /donors?designation=…` | 3 |
| `GET /search/v3?…` | `GET /donors?…` (same params) | 1, 3 |
| `GET /volunteers/all` | `GET /donors?designation=…` | 3 |

### P2.1 The dispatcher, and the thing to be careful about

Eight of those rows collapse onto one URI, `GET /donors`. That is correct — they are all "the
donors collection, filtered" — but merging eight URIs must **not** mean merging eight handlers.
Each of them today carries its own middleware chain, its own authorization predicate and its own
Mongo projection. `GET /donors/all` is super-admin-shaped; `GET /donors/checkDuplicate` is reachable
by any volunteer creating a donor; `GET /search/v3` applies a hall restriction at
[SearchController.ts:77](../../badhan-backend/src/tsoaControllers/SearchController.ts#L77). Silently
unioning those into one permissive handler would be a privilege escalation dressed as a refactor.

So: **`GET /donors` is a dispatcher.** One route, a table mapping filter-parameter combinations to
the existing interface function, and each entry keeps its own auth check and projection *verbatim*.
The URIs merge; the logic does not. Nothing in `db/interfaces/donorInterface.ts` changes in this
phase.

Concretely, the table has one row per current endpoint:

```
phone=…                        → the checkDuplicate path        (volunteer+)
phone=a,b,c                    → the phone-list path            (volunteer+)
archived=…                     → findAllDonors                  (existing check)
createdAfter=/createdBefore=   → the "new donors" path          (existing check)
certificateEnabled=true        → findCertificateEnabledDonors   (super admin)
designation=…                  → the designated-members path    (existing check)
bloodGroup=/hall=/batch=/…     → the search path                (hall restriction)
(no filters)                   → 400: this collection requires a filter
```

The last row matters: an unfiltered `GET /donors` must **not** silently become "every donor in the
database". Until pagination exists (out of scope, see above), it returns `400` naming the accepted
filters.

`checkDuplicate` also loses its odd response shape. It currently answers `200` with a message
either way ([DonorsController.ts:958-1010](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L958));
under the collapse it returns a collection of zero or one donors, and the frontend's duplicate
dialog checks the length. That removes the "200 for everything" case rather than papering over it.

### P2.2 Why `comment` and `designation` stay separate sub-resources

The tempting move is to fold both into `PATCH /donors/{donorId}`. Don't. They have different
authorization rules: the donor-edit predicate at
[DonorsController.ts:647-668](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L647) is
hall restriction plus the higher-designation rule; the comment path adds the unknown-hall refusal
at [DonorsController.ts:500](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L500); and
promotion at [DonorsController.ts:824-897](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L824)
is the densest block of 403s and 409s in the codebase. Three rule sets behind one `PATCH` body
whose applicable rules depend on which keys are present is how authorization bugs are written.
Separate sub-resource URIs keep one rule set per route, and rule 4 permits the depth.

Both become `PUT`: each replaces a single field with the payload, and doing it twice is the same as
doing it once.

### P2.3 `/search` and `/volunteers` disappear as controllers

`GET /search/v3` is the single clearest instance of two antipatterns at once — a verb-shaped
resource *and* a version number on one route. Searching donors is the donors collection with
filters. The nine query parameters at
[SearchController.ts:36-44](../../badhan-backend/src/tsoaControllers/SearchController.ts#L36) carry
over **unchanged**, name for name, so this is purely a URI move.
[VolunteersController.ts](../../badhan-backend/src/tsoaControllers/VolunteersController.ts) is 56
lines wrapping one designation filter and folds in the same way.

**Verification for P2:** the donor profile, donor search, add-donor (including the duplicate-phone
dialog), promote/demote, comment edit, delete donor, the new-donors report and the super-admin
certificate list all work from the app. `GET /donors` with no query string returns 400.
`docker compose run --rm backend-test npx jest tests/donors tests/search` green.

---

## Phase P3 — the donor's sub-collections

Donations, platelet donations and call records are records *about a donor*; today all three are
top-level collections that take a `donorId` from the query string or the body. They are exactly the
`collection/item/collection` shape rule 4 sanctions.

| Today | Target | Rule |
| --- | --- | --- |
| `POST /donations` (donorId in body) | `POST /donors/{donorId}/donations` → 201 + `Location` | 3, 4, 5 |
| `DELETE /donations?donorId=&date=` | `DELETE /donors/{donorId}/donations/{donationId}` → 204 | 3, 4, 5 |
| `POST /platelet-donations` | `POST /donors/{donorId}/platelet-donations` → 201 + `Location` | 3, 4, 5 |
| `DELETE /platelet-donations?donorId=&date=` | `DELETE /donors/{donorId}/platelet-donations/{id}` → 204 | 3, 4, 5 |
| `POST /callrecords` (donorId in body) | `POST /donors/{donorId}/call-records` → 201 + `Location` | 2, 3, 4, 5 |
| `DELETE /callrecords?donorId=&callRecordId=` | `DELETE /donors/{donorId}/call-records/{id}` → 204 | 2, 3, 4 |
| `GET /donations/report?startDate=&endDate=` | `GET /donations/statistics?from=&to=` | 1 |
| `GET /donations/report/donors?…` | `GET /donations?from=&to=&bloodGroup=&hall=` | 1, 3 |
| `GET /platelet-donations/report…` | same two, under `/platelet-donations` | 1, 3 |

### P3.1 Deleting a donation by id, not by date

`DELETE /donations?donorId=&date=` at
[DonationsController.ts:125-127](../../badhan-backend/src/tsoaControllers/DonationsController.ts#L125)
identifies the row by *timestamp*. That is not an identifier — two donations recorded on the same
date are indistinguishable to it, and it is the reason the delete path re-searches the donor's
donation array instead of addressing the record directly.

Switch to the document's item-URI form, `…/donations/{donationId}`. **Prerequisite:** the donor
representation must expose each donation's `_id`. Check
[donorInterface.ts](../../badhan-backend/src/db/interfaces/donorInterface.ts) — if the projection
that feeds the donor profile omits it, add it in this phase, exactly as
[plan18](implemented/plan18.md) had to for `archiveFlag`. If it turns out the timestamp genuinely
is the key by design, keep `{date}` as the path segment; it is still an item URI. What must not
survive is the id living in the query string.

### P3.2 Reports become `statistics` and a filtered collection

`/report` and `/report/donors` are two representations of one query: the aggregate, and the rows.
Reworded per rule 1, the rows *are* the collection with a date filter, and the aggregate is a named
summary alongside it. Standardising on `/{collection}/statistics` also lines these up with the
existing `GET /log/statistics`, so there is one word for "the aggregate view" across the API. The
`startDate`/`endDate` parameters are renamed to `from`/`to` for consistency with nothing in
particular — pick one and use it everywhere; this plan picks `from`/`to`.

**Verification for P3:** record and delete a donation and a platelet donation from a donor profile;
add and delete a call record; open the donations report and the platelet report and export the CSV.
`docker compose run --rm backend-test npx jest tests/donations tests/plateletDonations tests/callRecords`
green.

---

## Phase P4 — the remaining collections

| Today | Target | Rule |
| --- | --- | --- |
| `POST /activeDonors` (donorId in body) → 201, 409 on duplicate | `PUT /active-donors/{donorId}` → 201 or 204 | 2, 3, 5 |
| `DELETE /activeDonors/{donorId}` | `DELETE /active-donors/{donorId}` → 204 | 2, 5 |
| `GET /activeDonors?…` | `GET /active-donors?…` (params unchanged) | 2 |
| `POST /publicContacts` → 201 | `POST /public-contacts` → 201 + `Location` | 2, 5 |
| `GET /publicContacts` | `GET /public-contacts` | 2 |
| `DELETE /publicContacts?donorId=&contactId=` | `DELETE /public-contacts/{contactId}` → 204 | 2, 3 |
| `GET /log` | `GET /logs` | 2 |
| `GET /log/statistics` | `GET /logs/statistics` | 2 |
| `GET /log/donations` | `GET /logs?category=donation` | 2, 3 |
| `DELETE /log` | `DELETE /logs` → 204 | 2, 5 |
| `POST /feedbacks/token` → 200 | `POST /feedback-tokens` → 201 | 1, 5 |
| `POST /feedbacks` → 201 | `POST /feedbacks` → 201 + `Location` | 5 |
| `DELETE /feedbacks?feedbackId=` | `DELETE /feedbacks/{feedbackId}` → 204 | 3, 5 |
| `GET /certificates/{donorId}` | `GET /donors/{donorId}/certificate` | 4 |

### P4.1 Marking a donor active becomes idempotent

`POST /activeDonors` returns `409` when the donor is already marked
([ActiveDonorsController.ts:77](../../badhan-backend/src/tsoaControllers/ActiveDonorsController.ts#L77)).
But `donorId` is `unique: true` on the schema
([ActiveDonor.ts:34](../../badhan-backend/src/db/models/ActiveDonor.ts#L34)) — the mark is global,
one row per donor, and the client already knows the URI of the row it wants (`/active-donors/{donorId}`).
That is precisely the case the document says `PUT` is for, and marking an already-marked donor
should be a no-op returning `204`, not a conflict the frontend has to swallow. `201` on first
create, `204` thereafter.

### P4.2 `donorId` comes off the public-contact delete

`DELETE /publicContacts?donorId=&contactId=` takes both, but `contactId` alone identifies the row —
[PublicContactsController.ts:124](../../badhan-backend/src/tsoaControllers/PublicContactsController.ts#L124)
looks it up by id and deletes it by id. The `donorId` is consumed by the `loadTargetDonor`
middleware purely to get the donor's *name* for the audit log at
[PublicContactsController.ts:136](../../badhan-backend/src/tsoaControllers/PublicContactsController.ts#L136).
Two client-supplied keys for one row is an invitation to a mismatch; resolve the name from the
contact record instead and drop the parameter.

### P4.3 `DELETE /logs` is the most dangerous route in the app

It wipes the entire audit log. The document's method table does sanction `DELETE` on a collection,
so the URI is right — but keep the super-admin middleware and note it in the manual's super-admin
chapter as the irreversible action it is.

### P4.4 The certificate is a sub-resource of a donor

`/certificates/{donorId}` is a collection keyed by *another* resource's id, which is the one URI
shape that reliably confuses readers. A donor has at most one certificate, so it is a singular
sub-resource: `GET /donors/{donorId}/certificate`. While the handler is being touched, honour
`Accept`: it always emits `application/pdf`
([CertificatesController.ts:57](../../badhan-backend/src/tsoaControllers/CertificatesController.ts#L57)),
so a request whose `Accept` excludes it should get `406`. The `Content-Disposition` exposure in
[app.ts:23](../../badhan-backend/src/app.ts#L23) is unaffected and must stay.

**Verification for P4:** bookmark and un-bookmark a donor (twice each — the second time must not
error); add and remove a public contact; open statistics; download a certificate; run the feedback
QR flow end to end.
`docker compose run --rm backend-test npx jest tests/activeDonors tests/publicContacts tests/logs tests/feedbacks tests/certificates`
green.

---

## Phase P5 — the envelope and the error shape

Every success response in the API looks like this
([DonorsController.ts:23-33](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L23)):

```json
{ "status": "OK", "statusCode": 200, "message": "Fetched donor details successfully", "donor": { … } }
```

Three of those four fields restate the status line. `statusCode` duplicates it exactly, `status`
duplicates its class, and `message` duplicates the reason phrase. Rule 6 says the body is the
resource.

**Target for success:** the representation itself, plus the `links` array P8 adds. `GET /donors/{id}`
returns the donor object. `POST` returns the created object and a `Location` header. `DELETE`
returns `204` and nothing.

**Target for errors:** one shape, `application/problem+json` per RFC 9457, replacing the nine
hand-rolled classes in
[response/models/errorTypes/](../../badhan-backend/src/response/models/errorTypes/):

```json
{ "type": "https://badhan/errors/forbidden",
  "title": "Forbidden",
  "status": 403,
  "detail": "You are not authorized to edit donors of other halls",
  "instance": "/donors/6412…",
  "correlationId": "…" }
```

### P5.1 The catch: `message` is user-visible today

This is not a purely internal change, and pretending otherwise would break the app.
`response.data.message` is rendered directly as a toast in about twenty places —
[PersonDetails.vue:916](../../badhan-frontend/src/components/PersonDetails.vue#L916),
[auth.ts:109](../../badhan-frontend/src/store/auth.ts#L109),
[MyProfile.vue:176](../../badhan-frontend/src/views/MyProfile.vue#L176) and others — and errors go
through `processError` at
[helpers.ts:8-13](../../badhan-frontend/src/mixins/helpers.ts#L8), which reads the same field.

So:

* **Error text keeps flowing from the server**, because it is genuinely server-side knowledge (which
  rule refused, and why). `processError` changes one line: read `detail` instead of `message`. The
  **strings themselves are copied over verbatim** — no user sees different wording as a result of
  this plan.
* **Success text moves to the client.** "Donor deleted successfully" is presentation, not data, and
  it cannot survive a `204`. Each of the ~20 call sites gets its literal string, copied character
  for character from the `@SuccessResponse` it replaces. Do this **before** the routes start
  returning 204, not after, or the toasts silently render `undefined`.

That constraint — identical user-visible wording — is what keeps
[docs/manual/](../manual/) accurate through P0–P5.

### P5.2 Also delete the response-shape boilerplate

Each controller currently repeats `{ status: string; statusCode: number; message: string; … }` as an
inline type in the signature, the `@Example`, and every `@Response` decorator — that is most of the
bulk of a 1146-line
[DonorsController.ts](../../badhan-backend/src/tsoaControllers/DonorsController.ts). Once the
envelope is gone, the `@Response` decorators reference one shared `ProblemDetails` type and the
handlers declare the resource type they actually return.

**Verification for P5:** the OpenAPI document at `/openapi.json` shows resource schemas rather than
envelopes, and one error schema. Every toast in the app reads exactly as it did before — check the
sign-in, donor-save, donation-add, promote and delete flows specifically. Full suite:
`docker compose run --rm backend-test npx jest`.

---

## Phase P6 — guest mode becomes a claim, not a URI prefix

[GuestController.ts](../../badhan-backend/src/tsoaControllers/GuestController.ts) is 1334 lines
that mirror roughly forty real routes under `/guest/…`, returning faker data. The frontend enters it
by string-appending to the axios base URL
([api/index.ts:27-37](../../badhan-frontend/src/api/index.ts#L27)):

```js
const enableGuestAPI = () => { badhanAxios.defaults.baseURL += '/guest' }
const isGuestEnabled = () => badhanAxios.defaults.baseURL?.includes('/guest')
```

This is the document's path-based tenancy, and it costs what the document says it costs. Every route
exists twice and drifts independently. Worse, the mirror has **no middleware at all** — one
`Middlewares` import at
[GuestController.ts:2](../../badhan-backend/src/tsoaControllers/GuestController.ts#L2) and zero uses
— so the guest tree has no rate limiting and no authentication, and the "token" it hands out
([faker.ts:44](../../badhan-backend/src/doc/faker.ts#L44)) is 32 random hex characters, not a JWT.
And P1–P4 would otherwise require every one of those forty routes to be renamed twice.

**Target:** guest is a claim on a real token.

1. `POST /sessions` with `{ mode: "guest" }` mints a **properly signed JWT** carrying `guest: true`.
   It goes through `jwt.verify` in
   [authenticate.ts:31](../../badhan-backend/src/middlewares/authenticate.ts#L31) like any other
   token, so guest traffic is authenticated and rate-limited for the first time.
2. A middleware sitting after authentication reads the claim and swaps the data source: guest
   requests are served by the faker functions already in
   [doc/faker.ts](../../badhan-backend/src/doc/faker.ts), and every write is a no-op returning the
   success shape it would have returned.
3. Guests call the **same URIs** as everyone else. `enableGuestAPI` stops rewriting the base URL and
   instead stores the guest token; `isGuestEnabled` reads the claim. The comments at
   [api/index.ts:540](../../badhan-frontend/src/api/index.ts#L540) and
   [api/index.ts:592](../../badhan-frontend/src/api/index.ts#L592) that explain the mirroring get
   deleted with it.
4. `GuestController.ts` is deleted. The ~15 `tests/**/guest.test.js` files keep their assertions and
   swap `/guest/x` for `x` plus a guest token.

One deliberate exception survives: the guest feedback-token route already returns a **real, mintable
token** on purpose, so the guest QR flow exercises the production path end to end
([GuestController.ts:30-36](../../badhan-backend/src/tsoaControllers/GuestController.ts#L30)). Under
the claim model that stops being an exception and becomes the default, which is the point.

**Order matters:** run P6 *before* P1–P4 land in the frontend if you want to rename forty routes
once instead of eighty times. Written as P6 here for narrative reasons; sequence it early.

**Verification for P6:** enter guest mode from the sign-in screen and walk every screen the manual's
[03-signing-in.md](../manual/03-signing-in.md) says a guest can reach. The network tab shows no
`/guest` path segment anywhere. `docker compose run --rm backend-test npx jest -t guest` green.

---

## Phase P7 — `Authorization: Bearer`, and correlation ids

### P7.1 The auth header

The API authenticates with a custom `x-auth` header —
[authenticate.ts:28](../../badhan-backend/src/middlewares/authenticate.ts#L28),
[tsoaAuth.ts:6](../../badhan-backend/src/tsoaAuth.ts#L6), the swagger `securitySchemes` block at
[authenticate.ts:17-25](../../badhan-backend/src/middlewares/authenticate.ts#L17), and the frontend
interceptor at [api/index.ts:47](../../badhan-frontend/src/api/index.ts#L47). The value is already a
JWT; only the header name is nonstandard, which costs interop with every tool that understands
bearer tokens (including Swagger UI's own authorize button).

Move to `Authorization: Bearer <jwt>`, `securityScheme: http/bearer`. Note that `Authorization`
triggers a CORS preflight — the `cors()` call at
[app.ts:23](../../badhan-backend/src/app.ts#L23) handles `OPTIONS` by default, but confirm it
against the deployed frontend origin rather than assuming.

### P7.2 Correlation ids

The document calls trace-context propagation a best practice, and this stack has three hops
(frontend → Cloud Run backend → Mongo) with a `myConsole` log line per request and no way to tie
them together. Add a middleware beside
[userAgentHandler](../../badhan-backend/src/middlewares/userAgent.ts) that accepts an inbound
`Correlation-ID` (or `X-Request-ID`), generates one when absent, echoes it on the response, includes
it in every `myConsole` line, and puts it in the `correlationId` field of the P5 problem body. The
frontend request interceptor generates one per request. A user reporting an error can then read the
id off the toast and it is findable in the Cloud Run logs.

**Verification for P7:** Swagger UI's authorize button works against a real token. A request with
`Correlation-ID: test-123` comes back with the same value in the response header, and `docker compose
logs backend` shows it on that request's lines.

---

## Phase P8 — HATEOAS

Weakest justification in the abstract, strongest in this codebase specifically. Here is why.

[PersonDetails.vue:756](../../badhan-frontend/src/components/PersonDetails.vue#L756) computes
whether the current user may edit the donor on screen:

```js
isDetailsEditable () {
  return this.$store.getters['getDesignation'] === DESIGNATIONS_INDEX.SUPER_ADMIN ||
    this.$isMe(this.id) ||
    (this.$store.getters['getHall'] === halls.indexOf(this.hall) &&
     this.$store.getters['getDesignation'] > this.designation) ||
    isHallUnknown(halls.indexOf(this.hall))
}
```

That is a line-for-line reimplementation of the server's predicate at
[DonorsController.ts:647-668](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L647).
The same duplication exists for the comment rule and the promotion rules. **The authorization
policy of this application is written twice, in two languages, and the two copies must be kept in
sync by hand.** Every plan that touches a permission has to touch both.

Emitting the allowed operations as links is the fix the document is pointing at:

```json
{ "_id": "6412…", "name": "…", "hall": 3,
  "links": [
    { "rel": "self",        "href": "/donors/6412…",             "method": "GET" },
    { "rel": "edit",        "href": "/donors/6412…",             "method": "PATCH" },
    { "rel": "comment",     "href": "/donors/6412…/comment",     "method": "PUT" },
    { "rel": "certificate", "href": "/donors/6412…/certificate", "method": "GET" }
  ] }
```

A link is present only when the server would allow the call. The frontend renders a control iff its
`rel` is present, and the client-side predicates are deleted. One source of truth.

Scope it honestly — this is worth doing for the resources whose permissions are actually contested:

* **Do:** donor (`self`, `edit`, `delete`, `comment`, `designation`, `password-reset`,
  `certificate`), session (`self`, `revoke`), public contact (`delete`), feedback (`delete`).
* **Do:** `GET /` as the entry point, listing the top-level collections — this is what makes the API
  navigable from the root and it costs almost nothing.
* **Skip:** log entries, statistics and report rows. They are read-only aggregates with no operations
  to advertise, and links would be pure payload.

**Verification for P8:** as a hall admin, open a donor from another hall — the edit controls are
absent because the server sent no `edit` link, not because the client recomputed the rule. Delete
`isDetailsEditable` and its siblings from
[PersonDetails.vue](../../badhan-frontend/src/components/PersonDetails.vue) and confirm the screen
behaves identically for a super admin, a hall admin in-hall, a hall admin out-of-hall, and a
volunteer.

---

## Documentation

Per [CLAUDE.md](../../CLAUDE.md), changed app behaviour is documented in
[docs/manual/](../manual/) in the same change. Most of this plan is invisible to users by
construction — P5.1 exists specifically to hold the user-visible strings constant — but four things
do change:

* [10-bookmarked-donors.md](../manual/10-bookmarked-donors.md) — bookmarking an already-bookmarked
  donor no longer raises an error (P4.1).
* [16-super-admin-tools.md](../manual/16-super-admin-tools.md) — the log-clearing action, called out
  as irreversible (P4.3).
* [03-signing-in.md](../manual/03-signing-in.md) and
  [19-glossary.md](../manual/19-glossary.md) — guest mode, if either describes it in terms of a
  separate demo endpoint (P6).
* [18-when-something-goes-wrong.md](../manual/18-when-something-goes-wrong.md) — the correlation id
  now shown with errors, and what to do with it when reporting a problem (P7.2).

---

## Sequencing

```
P6  guest → claim            (first: halves the rename surface of everything below)
P0  dead routes, /test gate  (cheap, independent)
P5  envelope + errors        (before the 204s land, so no toast renders undefined)
P1  sessions
P2  donors + /search
P3  donor sub-collections
P4  remaining collections
P7  Authorization + tracing
P8  HATEOAS                  (last: needs the final URIs to link to)
```

Each of P1–P4 is a single commit spanning backend controller, `tsoa:routes` regeneration,
[badhan-frontend/src/api/index.ts](../../badhan-frontend/src/api/index.ts), and the matching
`badhan-backend-test/tests/` directory. The backend and frontend deploy together
([deploy.js](../../deploy.js)), so a phase never ships half-applied — but a phase that leaves the
frontend calling a renamed route is a broken deploy, not a degraded one. Regenerate routes and
typecheck inside the containers after every phase:

```
docker compose exec backend  npm run tsoa:routes
docker compose exec backend  npx tsc --noEmit
docker compose exec frontend npm run build
docker compose run --rm backend-test npx jest
docker compose run --rm frontend-test npx cypress run
```
