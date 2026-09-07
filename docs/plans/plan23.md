# Plan 23 — REST resource-naming refactor of the backend routes

Source convention: [REST API URI Naming Conventions and Best Practices](https://restfulapi.net/resource-naming/)
(Lokesh Gupta, restfulapi.net). Rule numbers below (§2.1, §2.2, …) refer to that page's sections.

The backend is a tsoa + Express API whose routes live in
`badhan-backend/src/tsoaControllers/` (plus `src/internalRoutes/index.ts` for the
internal backup server and `GuestController.ts` for the demo mirror). The routes work,
but as a REST resource model they break almost every rule on that page. This plan is an
audit (§1–§2) plus a mechanical refactor (§3–§5) that brings the API into line without
changing what it does.

What this plan does **not** do: change auth semantics, permission predicates, rate
limits, response envelopes (`status`/`statusCode`/`message`), or the frontend's
information architecture. Every `old → new` row below is a rename / re-addressing of
the same operation, verified by the same tests hitting a new path.

---

## Decisions taken before this plan was written

Asked and answered. Not re-litigated below.

* **The envelope stays.** `status`/`statusCode`/`message` plus the payload key
  (`donor`, `filteredDonors`, …) is unchanged. Resource naming is about *addressing*
  resources, not about response shapes.
* **No behaviour change rides along.** No new permission, no new query, no widened
  visibility. A refactor commit that also changes who can see what is unreviewable.
* **The frontend and the mobile app move in the same release train.** Old paths are
  kept as deprecated shims for one release (Phase R0) so a shipped phone app never
  404s mid-session. Printed certificates are exempt forever (Phase R6) because paper
  cannot be re-deployed.
* **Guest mirrors move with their originals.** `GuestController.ts` exists so the demo
  can click through every feature; a guest route renamed differently from its real
  counterpart breaks the base-URL rewrite contract. Every row in §3 has a guest row.

### Decisions taken in this plan, stated up front

* **Dual-serve, then migrate, then delete — not a flag day.** Phase R0 registers each new
  path alongside the old one (same handler, two `@Get`/`@Post`/… decorators or a thin
  forwarding method). The frontend migrates to the new paths, the tests assert both,
  and only then are the old decorators removed. The cost is a temporary doubling of the
  route table; the alternative is a coordinated atomic deploy of backend + frontend +
  every installed phone app, which does not exist.
* **Versioning is orthogonal and stays out.** The ad-hoc `v2`/`v3` suffixes (see §2.6)
  are removed as part of the rename, but no global `/v1` prefix is introduced here.
  If the API ever needs versioning it gets its own plan; this one only stops minting
  per-resource versions.
* **`platelet-donations` is the spelling reference.** It is the one base path that
  already satisfies lowercase + hyphen + plural (§2.2.3–§2.2.5, §2.1.2). Every rename
  below converges on that shape.
* **Out of scope, named so nobody has to guess:** HATEOAS links, pagination envelopes,
  status-code redesign (e.g. `PATCH /users/password` answering 201), splitting the
  `donors` god-resource into separate services, and renaming query-parameter keys
  (only paths are renamed; `donorId`, `phoneList` etc. keep their names so the diff
  stays a routing diff).

---

## 1. The convention in six rules

| # | Rule (restfulapi.net) | In one sentence |
| --- | --- | --- |
| R1 | §2.1 + §3 — **nouns, never verbs** | A path names a *thing* (`/sessions`, `/reports`); the HTTP method names the action. A path containing `signin`, `signout`, `search`, `checkDuplicate`, `execute` is RPC, not REST. |
| R2 | §2.4 — **never CRUD function names in URIs** | `GET` reads, `POST` creates, `PATCH` updates, `DELETE` removes. A path that re-states the method (`/deleteDonor`, `/signout/all`) is redundant at best. |
| R3 | §2.1.1–§2.1.3 — **plural collections, singular documents, one archetype each** | Collections (and stores) are plural (`/donors`, `/messages`); one resource has one shape. A path that is sometimes a collection and sometimes an RPC endpoint (`/donors/designation` as both list and update) breaks this. |
| R4 | §2.2.1 — **hierarchy with `/`** | A child lives under its parent: `/donors/{id}/donations`, not `/donations` with the parent id smuggled in the body. |
| R5 | §2.5 — **filter a collection with query params, don't mint new APIs** | `GET /donors?hall=5&bloodGroup=2`, not `GET /donors/new`, `GET /donors/all`, `GET /donors/certificateEnabled`. |
| R6 | §2.2.2–§2.2.5 + §2.3 — **spelling: lowercase, hyphens, no trailing slash, no file extension** | `call-records`, not `callrecords`; `active-donors`, not `activeDonors`; `public-contacts`, not `publicContacts`. No underscores, no uppercase, no `.xml`. |

Compliant today (keep as reference): no file extensions anywhere (§2.3 ✓), no trailing
slashes (§2.2.2 ✓), no underscores (§2.2.4 ✓ — the failure mode here is camelCase, not
`snake_case`), and `POST /donors`, `POST /messages`, `GET /messages`, `GET /feedbacks`,
`GET /publicContacts`-shaped collection reads that correctly use the method as the verb.

---

## 2. Audit — how the current routes break the rules

Route inventory is generated from the `@Route` base plus the method decorators in
`badhan-backend/src/tsoaControllers/*.ts` (frontend call sites in
`badhan-frontend/src/api/index.ts` confirm every path below is live).

### 2.1 Verbs and RPC calls in paths (breaks R1, R2)

| Current route | Location | Problem |
| --- | --- | --- |
| `POST /users/signin` | `UsersController.ts:32` | Verb `signin`. Creating a session/token is `POST` on a *session* noun. |
| `DELETE /users/signout` | `UsersController.ts:104` | Verb `signout`. Deleting is what `DELETE` already says. |
| `DELETE /users/signout/all` | `UsersController.ts:129` | Verb + CRUD restatement (`/all` after `DELETE` = "delete all"). |
| `POST /users/redirection` | `UsersController.ts:209` | Action nominalised: minting a second token. The noun it creates (a token/session) never appears. |
| `GET /search/v3` | `SearchController.ts:24` | Base path *is* a verb. Searching a collection is `GET` on that collection with query params (R5). |
| `GET /donors/checkDuplicate?phone=` | `DonorsController.ts:980` | Verb phrase + camelCase (triple violation with §2.2.5). A duplicate check is `GET /donors?phone=X` and reading the result. |
| `POST /donors/password` | `DonorsController.ts:524` | "Password" is a noun, but the operation (mint a recovery token) is an action with no resource of its own; the target id travels in the body instead of the path (§2.2.1). Same shape as `POST /feedbacks/token` below. |
| `POST /feedbacks/token` | `FeedbacksController.ts:71` | Singular `token` minted by action; should be a plural sub-collection (`…/tokens`) created with `POST`. |
| `GET /donations/report`, `GET /donations/report/donors` | `DonationsController.ts:181,243` | `report` as an action endpoint + `report/donors` mixing two domains in one hierarchy. A report is a derived noun — it should be addressed as one (§3), not as a verb hanging off the source collection. Same for the two `platelet-donations/report…` routes. |
| `GET /log/statistics`, `GET /log/donations` | `LogsController.ts:18,62` | `statistics`/`donations` as RPC report endpoints under a singular base; should be noun resources filtered by query. |
| `POST /purge-local-db`, `POST /populate-local-db`, `POST /purge-development-db`, `POST /populate-development-db`, `POST /backup`, `POST /restore/:date` | `internalRoutes/index.ts:426–454` | Bare verbs (`purge`, `populate`, `restore`, `backup` as imperative). Internal-only, so lowest priority, but the same rule. |
| Guest copies: `POST /guest/users/signin`, `DELETE /guest/users/signout…`, `GET /guest/search/v3`, `POST /guest/donors/password`, `POST /guest/feedbacks/token` | `GuestController.ts` | Inherit every violation above by mirroring. |

### 2.2 Singletons addressed by query/body instead of path (breaks R3, R4)

The most widespread violation. `GET /donors?donorId=X`,
`DELETE /donors?donorId=X`, `PATCH /donors/comment` + `{donorId,…}`,
`PATCH /donors/designation` + `{donorId,…}`, `PATCH /donors/v2` + `{donorId,…}`,
`POST /donations` + `{donorId,…}`, `DELETE /donations?donorId&date`,
`POST /callrecords` + `{donorId}`, `DELETE /callrecords?donorId&callRecordId`,
`DELETE /publicContacts?donorId&contactId`, `DELETE /feedbacks?feedbackId`,
`DELETE /messages?messageId` all identify *one* document anywhere except in the path.
Per §1.1–§1.2 the singleton form is `/collection/{id}` (and sub-collections nest:
`/donors/{id}/donations`). Query strings are for *filtering collections* (R5), bodies
are for *representations* — neither is an identity.

Consequences beyond aesthetics: logs and caches keyed on path see one endpoint instead
of one resource; `DELETE /donations?donorId&date` keys identity on a mutable timestamp
rather than an id; `DELETE /activeDonors/{donorId}` (`ActiveDonorsController.ts:99`)
*does* use a path but keys it on the *donor's* id rather than the active-donor row's
id, so two resource types share one identifier space.

### 2.3 Pseudo-collections that should be query filters (breaks R5)

| Current route | Location | Should be |
| --- | --- | --- |
| `GET /donors/new?startTime&endTime` | `DonorsController.ts:55` | `GET /donors?createdAfter&createdBefore` |
| `GET /donors/all?archiveFlag=` | `DonorsController.ts:1073` | `GET /donors?archived=` (`all` restates what `GET` on a collection already means) |
| `GET /donors/certificateEnabled` | `DonorsController.ts:1116` | `GET /donors?certificateEnabled=true` |
| `GET /donors/phone?phoneList=` | `DonorsController.ts:1039` | `GET /donors?phone=in:…` (batch filter on the collection) |
| `GET /donors/checkDuplicate?phone=` | `DonorsController.ts:980` | `GET /donors?phone=` (empty result = no duplicate) |
| `GET /volunteers/all` | `VolunteersController.ts:15` | `GET /volunteers` (same `all` redundancy; long term: `GET /donors?designation=gte:1`) |
| `GET /donors/designation` (list) | `DonorsController.ts:928` | `GET /donors?designation=…` or the existing `/volunteers` collection — one of them must go |
| `GET /search/v3?…` | `SearchController.ts:24` | `GET /donors?…` (it *is* a filtered donor list; `filteredDonors` is the giveaway) |
| `GET /activeDonors?…` filters | `ActiveDonorsController.ts:171` | Shape is already correct (R5 ✓) — only the spelling changes (see §2.5) |

### 2.4 Hierarchy flattened: child operations on the wrong parent (breaks R4)

* `POST /donations` / `DELETE /donations` carry `donorId` in body/query
  (`DonationsController.ts:47,125`). A donation belongs to a donor:
  `POST /donors/{donorId}/donations`, `DELETE /donors/{donorId}/donations/{donationId}`.
* Same for platelet donations (`PlateletDonationsController.ts:38,91`),
  call records (`CallRecordsController.ts:42,113`), `PATCH /donors/comment`,
  `PATCH /donors/designation`, `POST /donors/password` (all take `donorId` in the body).
* `GET /certificates/{donorId}` (`CertificatesController.ts:59`) conflates two resources:
  the path calls it a certificate id but the value is a *donor* id. The honest hierarchy
  is `GET /donors/{donorId}/certificate` (singleton sub-resource, PDF representation).
* `GET /donors/me` (`DonorsController.ts:23`) duplicates `GET /users/me`
  (`UsersController.ts:158`): two paths, one representation, neither carrying an id.

### 2.5 Spelling: case and separators (breaks R6)

| Current base/segment | Location | Fix |
| --- | --- | --- |
| `@Route('callrecords')` | `CallRecordsController.ts:14` | `call-records` |
| `@Route('activeDonors')` | `ActiveDonorsController.ts:14` | `active-donors` |
| `@Route('publicContacts')` | `PublicContactsController.ts:15` | `public-contacts` |
| `@Route('log')` (singular) | `LogsController.ts:14` | `logs` (R3: collections are plural) |
| `checkDuplicate`, `certificateEnabled`, `phone` (as operation names) | `DonorsController.ts:980,1039,1116` | disappear with §2.3 (query params, not paths) |
| `internalServerError/controller`, `internalServerError/dbinterface` | `TestController.ts:14,27` | `internal-server-errors/controller` — or, better, excluded: test-only hidden routes are not part of the public resource model |
| `platelet-donations` | `PlateletDonationsController.ts:15` | already correct — the template |

Note there are no `_` separators and no file extensions anywhere (R6 partially ✓);
the violation is consistently camelCase / concatenated words where hyphens belong,
plus one singular collection (`log`).

### 2.6 Overloaded paths and version fragments (breaks R3)

* `PATCH /donors/v2` (`DonorsController.ts:604`): `v2` is a version fragment as a *final*
  path segment on one operation only. Versions are a deployment concern, not a resource;
  the canonical update is `PATCH /donors/{donorId}`.
* `GET /search/v3` (`SearchController.ts:24`): same, `v3` as final segment.
* `GET /donors/designation` + `PATCH /donors/designation` (same string, one a list, one
  a single-target update) and `GET /donors` (singleton-by-query) + `POST /donors`
  (collection create) + `DELETE /donors` (singleton-by-query): one spelling, three
  archetypes. After the refactor each spelling has exactly one archetype.
* `DELETE /users/logins` (missing-id 400) + `DELETE /users/logins/{tokenId}`
  (`UsersController.ts:352,368`): the 400-for-missing-id is expressed as a *second route*
  rather than validation. It collapses into `DELETE /users/me/sessions/{sessionId}`
  with the validator rejecting a missing id.

---

## 3. Target route map (old → new)

`{id}` below is the target document's own id (donor id for donor sub-resources, donation
id for donations, message id for messages, …). The `DELETE /donations`-by-date change
requires the client to learn donation ids — `GET /donors/{id}` already embeds the
donation rows with `_id` (`DonorsController.ts:322`), so no new read is needed.

### 3.1 Sessions & own profile (today: `UsersController`, base `users`)

| Old | New | Notes |
| --- | --- | --- |
| `POST /users/signin` | `POST /sessions` | Creates a session (token). Noun collection + `POST` = create (R1–R3). |
| `DELETE /users/signout` | `DELETE /sessions/current` | Ends the calling session. `current` is the standard self-alias; the id form `DELETE /sessions/{sessionId}` also works. |
| `DELETE /users/signout/all` | `DELETE /sessions` | Deletes the *collection* = ends all sessions. No `/all` restatement (R2). |
| `GET /users/me` | `GET /users/me` (keep) | Deliberate exception: the authenticated-user alias. Documented as such; the duplicate `GET /donors/me` is deleted, not aliased. |
| `POST /users/redirection` | `POST /users/me/sessions` | Sub-collection of the caller (R4): "mint me another session". Body keeps `durationSeconds`. |
| `PATCH /users/password` | `PATCH /users/me/password` | Singleton sub-resource under the caller (R4), not a top-level operation. |
| `GET /users/logins` | `GET /users/me/sessions` | `logins` → `sessions` (one vocabulary for the thing); nested under `me` (R4). Response keys `logins`/`currentLogin` may keep their names. |
| `DELETE /users/logins` (missing-id 400) | *deleted* | Folded into validator: missing `{sessionId}` is a 400 from the path validator, not a route. |
| `DELETE /users/logins/{tokenId}` | `DELETE /users/me/sessions/{sessionId}` | Singleton delete by path (R3). Param renamed `tokenId → sessionId` for the same reason as the path. |

### 3.2 Donors (today: `DonorsController`, base `donors`)

| Old | New | Notes |
| --- | --- | --- |
| `POST /donors` | `POST /donors` (keep) | Already correct: create in collection. |
| `GET /donors?donorId=X` | `GET /donors/{donorId}` | Singleton by path (§1.1). |
| `DELETE /donors?donorId=X` | `DELETE /donors/{donorId}` | Same. |
| `PATCH /donors/v2` + body `donorId` | `PATCH /donors/{donorId}` | Full-body update on the singleton; `v2` fragment gone (§2.6). |
| `PATCH /donors/comment` + body `donorId` | `PATCH /donors/{donorId}/comment` | Comment as singleton sub-resource (R4). |
| `PATCH /donors/designation` + body `donorId` | `PATCH /donors/{donorId}/designation` | Same. |
| `POST /donors/password` + body `donorId` | `POST /donors/{donorId}/password-resets` | Recovery token as a created sub-collection noun (cf. `POST /feedbacks/tokens`). Returns the token as today. |
| `GET /donors/designation` | `GET /donors?designation=gte:1` (preferred) **or** `GET /members` | Decide in R1 (open question Q1). Either way the overloaded `designation` path disappears. |
| `GET /donors/checkDuplicate?phone=` | `GET /donors?phone=` | Filter, not RPC (R5). `found` is `donor !== null`. |
| `GET /donors/phone?phoneList=` | `GET /donors?phone=in:A,B,…` | Batch filter on the collection (R5). |
| `GET /donors/new?startTime&endTime` | `GET /donors?createdAfter&createdBefore` | Time filter (R5). |
| `GET /donors/all?archiveFlag=` | `GET /donors?archived=` | `all` gone (R2); archived state as filter (R5). |
| `GET /donors/certificateEnabled` | `GET /donors?certificateEnabled=true` | Case violation disappears with the path (R5, R6). |
| `GET /donors/me` | *deleted* (no alias) | Duplicate of `GET /users/me`. One self-alias, under `users`. |

### 3.3 Donations & platelet donations

Base `donations` (keep — plural ✓); base `platelet-donations` (keep — the reference
spelling ✓). Both gain the same hierarchy:

| Old | New | Notes |
| --- | --- | --- |
| `POST /donations` + body `donorId` | `POST /donors/{donorId}/donations` | Sub-collection create (R4). |
| `DELETE /donations?donorId&date` | `DELETE /donors/{donorId}/donations/{donationId}` | Identity by id in path, not by timestamp in query (§2.2). Frontend reads ids from the embedded `donations` array it already fetches. |
| `POST /platelet-donations` + body `donorId` | `POST /donors/{donorId}/platelet-donations` | Same. |
| `DELETE /platelet-donations?donorId&date` | `DELETE /donors/{donorId}/platelet-donations/{donationId}` | Same. |
| `GET /donations/report?startDate&endDate` | `GET /donation-reports?startDate&endDate` | Report as its own noun collection (top-level, since it aggregates across donors and halls). |
| `GET /donations/report/donors?…` | `GET /donation-reports/donors?startDate&endDate&bloodGroup&hall` | Drill-down stays beside its report. `report/donors` nesting under the *source* collection is what goes away. |
| `GET /platelet-donations/report…` (×2) | `GET /platelet-donation-reports…` (×2, same shape) | Symmetric. |

Open question Q2: `donation-reports` vs `GET /donations?startDate&…&groupBy=month`.
Either satisfies R5; the plan defaults to the separate noun because the payload
(`report` + `firstDonationCount` + `hallwiseReport`) is an aggregation, not a filtered
donation list, and stuffing it into the collection response overloads that archetype
(R3).

### 3.4 Call records, bookmarks, public contacts, feedbacks, messages

| Old | New | Notes |
| --- | --- | --- |
| `POST /callrecords` + body `donorId` | `POST /donors/{donorId}/call-records` | Base respelled `call-records` (R6); nested create (R4). |
| `DELETE /callrecords?donorId&callRecordId` | `DELETE /call-records/{callRecordId}` | Singleton by path; the donor check stays server-side, it was never identity. |
| `POST /activeDonors` + body `donorId` | `POST /active-donors` (keep shape, fix spelling) | Creating a bookmark *is* a collection create — body id is correct here. Only the base spelling changes (R6). |
| `DELETE /activeDonors/{donorId}` | `DELETE /active-donors/{donorId}` (keep shape, fix spelling) | Path already correct; spell it right. |
| `GET /activeDonors?…` | `GET /active-donors?…` (same params) | Already proper filtered collection (R5 ✓); spelling only. |
| `POST /publicContacts` | `POST /public-contacts` (same) | Spelling only (R6). |
| `GET /publicContacts` | `GET /public-contacts` (same) | Spelling only. |
| `DELETE /publicContacts?donorId&contactId` | `DELETE /public-contacts/{contactId}` | Singleton by path (§2.2). |
| `POST /feedbacks/token` | `POST /feedbacks/tokens` | Plural sub-collection (R3); body unchanged. |
| `POST /feedbacks` (public submit) | `POST /feedbacks` (keep) | Already correct collection create. |
| `GET /feedbacks` (queue) | `GET /feedbacks` (keep) | Already correct collection read. |
| `DELETE /feedbacks?feedbackId` | `DELETE /feedbacks/{feedbackId}` | Singleton by path (§2.2). |
| `DELETE /messages?messageId` | `DELETE /messages/{messageId}` | Singleton by path (§2.2). `GET`/`POST /messages` already correct. |
| `GET /volunteers/all` | `GET /volunteers` | Drop `all` (R2). Long-term merge with §3.2's designation filter is noted, not done here. |

### 3.5 Logs, search, certificates, misc

| Old | New | Notes |
| --- | --- | --- |
| `@Route('log')` + `GET /log` | `GET /logs` | Pluralise the collection (R3). |
| `DELETE /log` | `DELETE /logs` | Clear-the-store stays a collection `DELETE`; documented as such. |
| `GET /log/statistics` | `GET /statistics` | Statistics as its own top-level noun; the `log/` prefix was a categorisation, not a hierarchy (nothing under it is a log row). |
| `GET /log/donations` | `GET /donations?groupBy=year-month` | Year-month counts as a filtered/grouped view of the donations collection (R5). Falls back to `GET /statistics/donations-by-month` if the aggregation shape resists query-param form — decide in R2. |
| `GET /search/v3?…` | `GET /donors?…` (same params) | The search *is* the filtered collection (R1, R5). `v3` gone. Frontend's `handleGETSearchDonors` retargets; `filteredDonors` key stays. |
| `GET /certificates/{donorId}` | `GET /donors/{donorId}/certificate` | Certificate as singleton sub-resource of its donor (R4); PDF representation unchanged. **Permanent alias:** the old path stays forever (Phase R6) — paper outlives deploys. |
| `GET /` (online check), `GET /deprecated`, `GET /maintenance` | keep | Non-resource plumbing, `@Hidden()`. Not part of the resource model; renaming them buys nothing. |
| `POST /test/internalServerError/…` | keep (hidden) **or** respell to `internal-server-errors/…` | Test-only, `@Hidden()`. Respell only if touched anyway; explicitly excluded from the naming lint (Phase R0). |
| Internal `internalRoutes` (`/backup…`, `/restore…`, `/purge-…`, `/populate-…`) | `GET /backups`, `POST /backups`, `DELETE /backups/{ts}`, `POST /restores`, … | Lowest priority (separate server, super-admin operators, no mobile clients). Phase R7 sketches the map; it may ship later than the rest. |

### 3.6 Guest mirror (base `guest` — kept as a namespace exception)

`guest` is a role, not a resource, and under a strict reading it breaks R1. It stays
anyway: it is a demo namespace, not a domain resource, and renaming it to a noun would
hide what it is. What changes is everything *under* it — each guest path tracks its
original's rename 1:1 (`/guest/sessions`, `/guest/donors/{id}`, `/guest/call-records`,
`/guest/search/v3` → `/guest/donors?…`, …). The base-URL rewrite that powers guest mode
keeps working because the suffixes stay identical between the two trees.

---

## 4. Phases

Each phase is independently shippable behind the dual-serve pattern and ends with its
verification. Suggested order is spelling → identity → hierarchy → filters → callers,
so that at no point do two phases touch the same decorator.

### Phase R0 — scaffolding: inventory test + dual-serve pattern + lint

1. Add a route-inventory test (backend, no DB): import the tsoa-generated
   `routes.ts`, extract `method + path` for every non-`@Hidden()` route, and assert the
   set equals a checked-in snapshot. From here on, adding a route without updating the
   snapshot fails the build — which is the point: new RPC paths must be noticed.
2. Add a naming lint beside it (same test file, pure string checks on the snapshot):
   every path segment matches `^[a-z0-9-]+$`, no segment is in a denylist
   (`signin signout signup search all new checkDuplicate v2 v3 token log` — singular
   `token`/`log` only as full segments), no collection base is singular. `guest/…`
   suffixes are checked; the leading `guest` and the `me`/`current` aliases are
   allow-listed with a comment pointing at this plan.
3. Establish the dual-serve helper: the new path gets the implementation, the old path
   a `@Deprecated()`-marked forwarder that logs `DEPRECATED_ROUTE <old> → <new>` via
   `logInterface.addLog` (same attribution as the real call). Old paths keep exact
   status codes and bodies — the forwarder calls the new handler, it does not reimplement.
4. Mark `TestController` and `OtherController` excluded in the lint config with reasons.

**Verification:** `docker compose exec backend npx tsc --noEmit` clean;
`docker compose --profile test run --rm backend-test <inventory suite>` passes on the
unchanged table; `curl` of any route shows no behaviour change.

### Phase R1 — spelling: bases and segments (no semantics)

Rename bases only, dual-served:

* `callrecords` → `call-records`, `activeDonors` → `active-donors`,
  `publicContacts` → `public-contacts`, `log` → `logs`
  (controllers' `@Route`, validators' error strings, frontend `api/index.ts` call sites,
  MCP `tools.ts` `toCall` paths, guest mirrors, backend-test helpers, Cypress intercepts).
* Decide open question **Q1**: `GET /donors/designation` list → `GET /donors?designation=…`
  vs `GET /members`. Recommendation: query filter (no new collection for what is a
  filtered donor list). Record the answer in this plan before implementing.

**Verification:** old and new spellings both answer 200 with identical bodies;
frontend unit/Cypress suite passes with the base URL pointed at either spelling;
lint snapshot updated.

### Phase R2 — identity: singletons move into the path

For `donors` (get/delete/patch-comment/patch-designation/patch-v2/password-request),
`messages`, `feedbacks`, `public-contacts`, `call-records` deletes, `users/me/sessions/{id}`:

1. New `@Get('{id}')` / `@Delete('{id}')` / `@Patch('{id}/comment')` etc. with `@Path()`
   params; validators gain `validatePATHDonorId`-style param checks (reuse the existing
   ObjectId validation, move the source from `query`/`body` to `path`).
2. Old query/body forms become forwarders that 1:1 map `{query,body}.donorId → path id`
   (and `messageId`/`feedbackId`/`contactId`/`callRecordId` likewise).
3. Decide **Q2** (`donation-reports` collection vs grouped `GET /donations`) and **Q3**
   (`GET /log/donations` target shape) before touching report routes — both answers
   affect only new-path names, not the forwarding.

**Verification:** per-route backend tests assert old ≡ new (status, body keys, side
effects incl. audit rows); 400/404/403 matrices unchanged; `DELETE /messages/{badId}`
→ the same `already-deleted` 404 as query form.

### Phase R3 — verbs become nouns: sessions, tokens, reports, statistics

Implement §3.1 (sessions), §3.3 reports (`donation-reports`, `platelet-donation-reports`),
`POST /donors/{id}/password-resets`, `POST /feedbacks/tokens`, `GET /statistics`:

1. New controllers/methods with noun paths; `POST /sessions` reuses the `validateLogin`
   + `signInLimiter` chain, `DELETE /sessions` reuses the sign-out-all chain.
2. `GET /users/me` stays; `GET /donors/me` is deleted outright (no forwarder — it was
   always an alias, and forwarding an alias to an alias preserves the confusion).
3. Donation deletes switch identity from `(donorId, date)` to `(donorId, donationId)`;
   the old `(donorId, date)` form forwards by resolving the row first (unique per donor
   per millisecond in practice; on collision the forwarder deletes the latest match and
   logs the ambiguity — the ambiguity is *why* the old form dies).

**Verification:** sign-in/out flows pass end-to-end on new paths (backend-test
`tests/users/…` duplicated to new paths, then old-path copies marked deprecated);
report payloads byte-identical between old and new; MCP `auth.test.js`-style handshake
against `POST /sessions`.

### Phase R4 — filters replace pseudo-APIs: search, new, all, phone, certificateEnabled

1. Extend `GET /donors` (and its aggregate `findDonorsByAggregate`) with the union of
   query params from `/search/v3`, `/donors/new`, `/donors/all`, `/donors/phone`,
   `checkDuplicate`, `certificateEnabled`. New params use the existing `validateQuery`
   conventions; `phone` accepts a single number, `phone=in:…` (name TBD in implementation,
   keep `phoneList` as deprecated alias) accepts the batch form.
2. `GET /search/v3` becomes a forwarder to `GET /donors` (same aggregate, same `filteredDonors`
   key). `GET /donors/new|all|phone|checkDuplicate|certificateEnabled` forward likewise.
3. `GET /volunteers/all` → `GET /volunteers` forwarder; `GET /active-donors` keeps params.

**Verification:** search Cypress suite (`search.cy.ts` and equivalents) passes unmodified
against forwarded paths and again with specs rewritten to new query params; result sets
identical for a seeded fixture (assert counts, not just status).

### Phase R5 — hierarchy: donor sub-collections

`POST /donors/{id}/donations`, `POST /donors/{id}/platelet-donations`,
`POST /donors/{id}/call-records`, `PATCH /donors/{id}/comment`,
`PATCH /donors/{id}/designation`, `GET /donors/{id}/certificate`:

1. Move `loadTargetDonor` / hall-permission logic from body/query reads to the path id
   (the middleware already resolves from `donorId` — repoint it at the path param).
2. Old top-level forms forward with `{body,query}.donorId → path`.
3. `GET /donors/{id}/certificate` streams the same PDF with the same headers
   (`Content-Type`, `Content-Disposition`); old `GET /certificates/{donorId}` forwards
   **and is never removed** (Phase R6).

**Verification:** hall-permission 403 matrices pass on new paths (volunteer vs
other-hall vs super-admin); certificate `Content-Length` identical old vs new.

### Phase R6 — callers: frontend, MCP, guest, docs-spec

1. Frontend `badhan-frontend/src/api/index.ts`: retarget every call site to the new path
   (≈50 lines; the grep in §2 is the checklist). No store/view logic changes. Guest mode
   needs no branch — suffixes match by construction (§3.6).
2. `badhan-backend/src/mcp/tools.ts`: retarget `toCall` paths (tool *names* unchanged —
   `log_donation` etc. are already nouns). `dispatch.test.js` / `permissions.test.js`
   gain new-path cases.
3. `GuestController.ts`: mirror every rename; guest Cypress specs updated.
4. Regenerate tsoa routes + spec (`docker compose exec backend npm run tsoa:routes`,
   spec build per `package.json`), confirm `/docs` renders and `openapi.json` contains
   no old paths except explicitly-aliased ones.

**Verification:** full backend-test run
(`docker compose --profile test run --rm backend-test npm test`) green;
Cypress run (`docker compose run --rm frontend-test npx cypress run`) green;
`jq '.paths | keys' openapi.json` shows the new table.

### Phase R7 — removal + internal routes + manual

1. Delete old-path forwarders **except** `GET /certificates/{donorId}` (permanent) and
   any path a shipped phone build still calls (confirm against the Android call sites in
   `badhan-android/`; if in doubt, keep the forwarder one more release — a forwarder is
   ~5 lines, a bricked app is not).
2. Internal routes (`internalRoutes/index.ts`): remap to `GET /backups`,
   `POST /backups`, `DELETE /backups/{ts}`, `DELETE /backups/old→DELETE /backups?keep=3`,
   `POST /restores/{ts}?environment=`, `POST /database-resets/…`. Separate deploy, may
   trail the public removal by a release.
3. Manual (required by `CLAUDE.md` in the same change as behaviour):
   * New short chapter or appendix section mapping old → new paths for phone-app
     debuggers and API consumers (table form, copy-pasteable).
   * Touch every chapter that prints a path: searching (`06`), donor profile (`07`),
     donations (`08`), call records (`09`), bookmarks (`10`), adding donors (`11`),
     members (`12`), public contacts (`13`), profile/devices (`14`), statistics/reports
     (`15`), super-admin tools (`16`), feedback (`20`), chat (`21`).
   * Glossary (`19`): `session` joins the vocabulary (token/session/login were three
     words for one thing).

**Verification:** `jq` over `openapi.json` shows zero deprecated paths except the
certificate alias; manual chapters each reference only new paths; `tsc --noEmit` clean.

---

## 5. Open questions (answer before R1/R2 implementation)

* **Q1 — designated-members list: query filter or collection?**
  `GET /donors?designation=gte:1` vs `GET /members`. Recommendation: query filter.
  A "member" is a donor with a flag, not a separate resource, and a second collection
  reintroduces the `/donors/designation` duality this plan removes.
* **Q2 — reports: separate noun or grouped collection read?**
  `GET /donation-reports?…` vs `GET /donors?…&groupBy=…`. Recommendation: separate
  `donation-reports` / `platelet-donation-reports` nouns — the payload is an aggregation
  with its own shape, and overloading the donation collection breaks R3.
* **Q3 — `GET /log/donations` target?**
  `GET /donations?groupBy=year-month` vs `GET /statistics/donations-by-month`.
  Recommendation: the former if the response can stay the raw grouped counts, the latter
  if the statistics framing survives. Minor; either satisfies R5.
* **Q4 — phone-batch param name?** Keep `phoneList` (deprecated alias, zero client churn)
  or rename to `phone=in:…`? Recommendation: keep `phoneList` as the query key on the new
  `GET /donors` and skip the rename — param names are out of scope by decision.

---

## 6. Risks restated

* **Bricked phone apps are the dominant risk, not server bugs.** Every rename is a
  breaking change for a client that hardcodes the path. Dual-serve + deprecated
  forwarders (R0) plus the Android call-site audit (R7) are the mitigation; a flag day
  is explicitly rejected. If any shipped build cannot be confirmed migrated, its paths
  stay forwarded.
* **Printed paper cannot be migrated.** Certificate QR codes point at the frontend
  verification page (which does not move), but `GET /certificates/{donorId}` itself is
  referenced from logs, screenshots and operator runbooks. It stays as a permanent alias
  even after every other old path is gone — the one intentional permanent violation in
  the table.
* **Donation identity changes from `(donor, date)` to id.** The old delete keyed on a
  timestamp; two donations in the same millisecond to the same donor are ambiguous under
  the old form and unambiguous under the new one. The forwarder resolves-and-logs (R3);
  the ambiguity window closes when the old form is removed.
* **Search URL compatibility.** Bookmarked/shared search URLs (`/search/v3?...`) exist in
  the wild (chat messages, runbooks). The `GET /search/v3` forwarder should outlive the
  other donor forwarders by one release for exactly this reason.
* **The lint can ossify.** The R0 denylist will false-positive on some future legitimate
  noun (`token` as a real sub-collection already appears in R3 as `tokens` — plural,
  allowed). Allow-list with a pointer to this plan rather than growing regexes silently.
* **No behaviour may hide in the rename.** Review rule for every phase: if a diff hunk
  changes a permission check, a limiter, a validator bound, or a response key alongside
  the path, it belongs in a different commit. The old≡new assertion tests exist to
  enforce this mechanically.
