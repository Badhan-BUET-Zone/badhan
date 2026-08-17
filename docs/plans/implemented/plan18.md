# Plan 18 — a super admin page listing every donor whose certificate is enabled

A certificate is the one document this app produces that leaves the building. It is rendered
server-side, printed, physically signed, and then verified by strangers who scan the QR code on the
paper — people who have no account and never see the rest of the app. Plan 16 built it and Plan 17
split it into a signed and a public variant.

Whether a given donor *has* one at all is a single boolean, `isCertificateEnabled`
([Donor.ts:258](../../badhan-backend/src/db/models/Donor.ts#L258)), default `false`, and
[CertificatesController.ts:85](../../badhan-backend/src/tsoaControllers/CertificatesController.ts#L85)
refuses to render anything until it is true.

The flag is **not** a super-admin privilege. It is an ordinary checkbox on the donor profile
([PersonDetails.vue:157](../../badhan-frontend/src/components/PersonDetails.vue#L157)), disabled only
by `!isDetailsEditable`, and it is written by the ordinary donor-edit predicate at
[DonorsController.ts:651-668](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L651-L668)
— hall restriction plus the higher-designation rule. So any volunteer or hall admin who may edit a
donor may switch that donor's certificate on, and the manual explicitly tells them to
([07-the-donor-profile.md:121-125](../manual/07-the-donor-profile.md#L121-L125)).

That is the right permission for the act. What is missing is the counterpart: **nothing anywhere in
the app can answer "who currently has one?"** The flag is only ever visible one donor at a time, on
the profile of a donor you already thought to open. A page that lists the whole set is the audit
surface for a permission that is deliberately wide, and that is what this plan adds.

**Decisions taken before this plan was written** (asked and answered, not re-litigated below):

* **The page is read-only.** It lists; it does not edit. Tapping a row opens the donor's profile,
  where the existing checkbox already does the job under the permission rules that already exist.
  Adding an inline toggle would mean a second write path to the same field and a confirmation story
  for revoking a certificate that may already be printed and in circulation — a separate plan if it
  is ever wanted.
* **A data table, not donor cards.** This page is for scanning a list looking for a name that should
  not be on it. `PersonCardNew` is built to show availability and blood group to someone choosing a
  donor to call, which is a different job.
* **Archived donors are included, and marked.** Archiving and this flag are independent: nothing in
  the archive path touches `isCertificateEnabled`, so an archived donor with the flag on still has a
  certificate that verifies. Those are precisely the rows worth auditing, so hiding them would hide
  the point of the page.

---

## Phase P1 — the query

### P1.1 `findCertificateEnabledDonors`

A new function in [donorInterface.ts](../../badhan-backend/src/db/interfaces/donorInterface.ts),
modelled directly on `findAllDonors` at line 301 — same shape, same `{data, message, status}`
return, same `.populate({path: 'logCount'})` if the activity column is wanted.

```
DonorModel.find({ isCertificateEnabled: true }, {
    name: 1, hall: 1, studentId: 1, bloodGroup: 1,
    designation: 1, archiveFlag: 1, isCertificateEnabled: 1
})
```

Two details carried over from `findAllDonors`, both of which its own comment already warns about:

* **Every field the page renders must be named in the projection**, `archiveFlag` included, or rows
  come back with it `undefined` and the archived marker silently never appears. This is the exact
  bug the existing comment at
  [donorInterface.ts:302-304](../../badhan-backend/src/db/interfaces/donorInterface.ts#L302-L304)
  exists to prevent.
* **`isCertificateEnabled` is projected too**, even though every row has it `true` by construction.
  It costs nothing and it means the response can be eyeballed for correctness without trusting the
  filter.

No `archiveFlag` parameter. `findAllDonors` takes one because it partitions; this query deliberately
does not partition, per the decision above.

### P1.2 On not adding an index

The two indexes on this collection
([Donor.ts:289-290](../../badhan-backend/src/db/models/Donor.ts#L289-L290)) both lead with
`archiveFlag`, so neither helps here and this query is a collection scan.

**Leave it that way.** The collection is on the order of 4,000 donors, the page is opened by super
admins and rarely, and every added index is paid for on every donor write — which includes the
per-donor loop that the search-results archive sweep drives. A scan of 4,000 documents to build a
list somebody reads for a minute is not a cost worth an index.

If it ever does matter, the right shape is a *partial* index — `{ isCertificateEnabled: 1 }` with
`partialFilterExpression: { isCertificateEnabled: true }` — because the true set is expected to stay
a small minority of the collection and a full index would mostly store `false`. Do not add it
speculatively.

---

## Phase P2 — the endpoint

`GET /donors/certificateEnabled` on
[DonorsController.ts](../../badhan-backend/src/tsoaControllers/DonorsController.ts), placed beside
`getAllDonors` and built from the same parts:

```
@Middlewares([rateLimiter.commonLimiter,
              authenticator.handleAuthentication,
              authenticator.handleSuperAdminCheck])
```

`handleSuperAdminCheck` is what `GET /donors/all` uses at line 1067, and it is the correct guard
here: the whole value of this page is seeing *across* halls, so the hall-scoped check would defeat
it. A hall admin who wants to know about their own hall's donors already has the profile.

**No validator.** The route takes no path, query or body parameter — the deliberate consequence of
including archived donors rather than passing an `archiveFlag`. `validateGETDonorsAll` exists only
to validate that flag, so there is nothing for a counterpart to check. Do not add an empty one for
symmetry.

Log it as the neighbouring routes do — `logInterface.addLog(user._id, 'GET DONORS CERTIFICATE
ENABLED', { resultCount })`. The count is the useful part: it makes growth in the enabled set
visible in the logs without storing the list.

**`routes.ts` is generated and *not* committed.** `src/tsoaRoutes/` is gitignored
([badhan-backend/.gitignore:25](../../badhan-backend/.gitignore#L25)) and `npm run build` regenerates
it (`tsoa:routes && tsoa:spec && tsc`), so nothing about it belongs in the diff. What it does mean is
that a running dev container is serving the routes generated when it last built: after editing the
controller, run

```
docker compose exec backend npm run tsoa:routes
```

or the new endpoint 404s locally while looking perfectly correct in the source. Editing the
generated file by hand is always wrong.

One ordering fact, checked rather than assumed: every `@Get` in this controller is a literal segment
(`me`, `new`, `designation`, `checkDuplicate`, `phone`, `all`), with no `{param}` route to shadow a
new literal one. So `certificateEnabled` is safe declared last. That would not hold in a controller
with a `@Get('{donorId}')`.

---

## Phase P3 — reaching the page

Three small edits, none of which is optional and all of which are easy to forget:

| File | Change |
| --- | --- |
| [api/index.ts](../../badhan-frontend/src/api/index.ts) | `handleGETDonorsCertificateEnabled`, in the shape of `handleGETDonorsNew` at line 487, and **added to the export list at the bottom** — the module exports by explicit name, so a function that is not listed there is invisible. |
| [router/index.ts](../../badhan-frontend/src/router/index.ts) | A route at `/certificateEnabledDonors`, `requiresAuth: true`, `designation: 3`, mirroring the `NewDonors` entry. |
| [AppBar.vue](../../badhan-frontend/src/components/AppShell/AppBar.vue) | A fifth entry in the `Super Admin` `subLinks` array (lines 209-241), `designation: 3`, with its own `id`. |

The route guard and the menu `designation` are **two separate checks** and both are required. The
menu entry only controls what is drawn in the drawer; the route meta is what stops a hall admin who
types the URL. `handleSuperAdminCheck` on the endpoint is the third and the only one that actually
protects the data — the first two are user interface, not security.

---

## Phase P4 — the page

`badhan-frontend/src/views/CertificateEnabledDonors.vue`, modelled on
[Statistics/DonorsAll.vue](../../badhan-frontend/src/views/Statistics/DonorsAll.vue), which is
already a super-admin donor table and solves most of this.

| Column | Source |
| --- | --- |
| Name | `item.name` |
| Hall | `item.hall` through the `getHallName` filter |
| Student ID | `item.studentId` |
| Blood Group | `item.bloodGroup` through `getBloodGroupString` |
| Designation | `item.designation` through `getDesignationString` |
| Archived | the existing archived chip, rendered only when `item.archiveFlag` |

Behaviour, all of it inherited from `DonorsAll` unless noted:

* **Fetch on mount**, not behind a button. `NewDonors` has a button because it needs two dates
  first; this page has no parameters, so a button would be a click that asks nothing.
* **A visible count.** "42 donors" above the table. The number is the thing a super admin is
  actually checking, and it is what makes an unexpected jump noticeable.
* **An explicit empty state** — `data-cy` attributed, in the manner of
  `statisticsAllDonorsEmptyId`. Nobody enabled is a legitimate state, especially on a fresh
  environment, and an empty table with no message reads as a page that failed to load.
* **Row click opens the profile.** Follow `DonorsAll.goToDonorProfile`
  ([line 78](../../badhan-frontend/src/views/Statistics/DonorsAll.vue#L78)), which uses
  `createNewPopUpWindow` to `#/home/details?id=…`, rather than the child-route approach `NewDonors`
  takes. The list survives the visit that way, which is what an audit sweep wants — and there is no
  child route to register.
* **Sorted by hall, then name.** `DonorsAll` sorts by activity count; that column carries no meaning
  here. Grouping by hall is what makes the list checkable against the person who would know.

`data-cy` attributes on the table, the rows and the empty state, in the naming style already used —
Phase P5 depends on them.

---

## Phase P5 — tests

**Backend** — `badhan-backend-test/tests/donors/certificateEnabled/`:

* `success.test.js` — create donors with the flag both on and off; assert the response contains
  exactly the enabled ones. The negative half is the real assertion: a handler that forgot its
  `$match` still passes a test that only checks the enabled donors are present.
* `permission.test.js` — donor, volunteer and hall admin each get 403; super admin gets 200. The
  hall admin case is the one that matters, because a hall admin *can* set this flag and it would be
  a defensible-sounding mistake to let them read the list.
* `archived.test.js` — an archived donor with the flag on **is** returned, and carries
  `archiveFlag: true` in the response. This asserts both halves of the archive decision, including
  the projection bug from P1.1, which is otherwise invisible until someone looks at the rendered
  page.

**Frontend** — `badhan-frontend-test/cypress/e2e/statistics/` or a new `super-admin/` directory,
following `donors/newly-created.cy.ts`:

* Signed in as super admin, the menu entry exists, the page loads, and a donor whose flag was just
  enabled appears in the table.
* Signed in as a volunteer, the menu entry is absent and visiting the URL directly does not render
  the page.

Both suites are bind-mounted since `b78a34f0`, so edited specs run without an image rebuild — but a
new npm dependency, should either need one, still requires `npm ci` inside the container.

---

## Phase P6 — documentation

Required by [CLAUDE.md](../../CLAUDE.md): a new screen is new app behaviour and ships documented in
the same change.

* **[docs/manual/16-super-admin-tools.md](../manual/16-super-admin-tools.md)** — a new section. Note
  line 10 reads *"These three pages"* and the menu already holds four entries; it becomes five with
  this one, so fix the count rather than adding a section under a sentence that contradicts it.
  The section should say what the page is for in the terms above: the flag can be set by any
  volunteer or hall admin who can edit that donor, this is the only place the whole set is visible,
  and an unexpected name on it is worth asking about.
* **[docs/manual/07-the-donor-profile.md:43](../manual/07-the-donor-profile.md#L43)** — the
  **Enable certificate** row should point at the new page, so a reader who ticks the box knows
  where the consequence shows up.
* **[docs/manual/04-roles-and-permissions.md](../manual/04-roles-and-permissions.md)** — if it
  enumerates the super admin pages, it gains this one.

---

## Risks and things that will bite

1. **The projection.** `archiveFlag` absent from the `$project` means every row looks live and the
   archived marker never renders — no error, no empty page, just a quietly wrong list. `findAllDonors`
   carries a comment about this exact trap; the archived backend test is what catches it.
2. **`routes.ts` is generated, gitignored, and stale in a running container.** Forgetting
   `npm run tsoa:routes` leaves a controller method that no URL reaches, and the frontend gets a 404
   that looks like a routing typo in code that is plainly correct.
3. **Three separate access checks** — menu `designation`, route meta, and `handleSuperAdminCheck` —
   and only the third protects anything. It is easy to add the first two, see the page disappear for
   a volunteer, and conclude the feature is guarded.
4. **This page tells a super admin who can produce a certificate. It does not tell them who has.**
   Nothing records that a certificate was rendered or printed; the flag is permission, not history.
   The manual section must not imply otherwise, or the page will be read as an issuance log.
5. **Revocation is out of scope by decision, and someone will ask for it.** When they do, the
   question to settle first is not the button — it is what turning the flag off means for a
   certificate already printed, signed and carrying a QR code that will keep being scanned.
