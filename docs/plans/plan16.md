# Plan 16 — the certificate template, redrawn to match the supplied artwork, with parents' names,
# an enable/disable flag, and server-side rendering

---

## Phase P1 — decide what "replace the certificate SVG" means

**Depends on:** — · **Deployable alone:** no, this phase is analysis only · **Reversible:** n/a
**Status:** Implementation complete — analysis recorded below, re-verified against the current
repo (four `temp/` exports present; `FONT_FAMILY` at
[certificateLayout.ts:107](../../badhan-frontend/src/views/Certificate/certificateLayout.ts#L107);
SVG's six `font-family` classes confirmed unchanged).

`temp/` holds four exports of one Illustrator document — `Badhan New Certificate.ai`, `.eps`,
`.pdf`, `.svg` — none committed, per the user's note. The task is to make the live certificate match
the **PDF** (the supplied "expected output"), replace the current SVG-based template with whichever
of the four formats is the right build-time source, and add father's/mother's name as fields the new
artwork requires. This phase records what each file actually is and why the SVG is the only one
usable as a *source*, even though it cannot be used *as-is*.

### P1.1 What the current template is

The certificate is not a static asset today. [CertificateArtwork.vue](../../badhan-frontend/src/views/Certificate/CertificateArtwork.vue)
is a Vue component that draws the whole certificate as live SVG — background, border, logo, and
text — parameterised by [certificateLayout.ts](../../badhan-frontend/src/views/Certificate/certificateLayout.ts)
(every position in millimetres, viewBox `0 0 297 210`, one user-unit per millimetre). The same
`<svg>` element that the browser renders is hydrated by the donor's name and student ID, then handed
to [certificatePdf.ts](../../badhan-frontend/src/views/Certificate/certificatePdf.ts), which uses
`svg2pdf.js` to convert it to a vector PDF — the QR code stays vector data all the way to paper,
deliberately, because a rasterised QR is the classic way a printed code stops scanning.
`FONT_FAMILY = 'Helvetica, Arial, sans-serif'` is chosen, and documented as chosen
([certificateLayout.ts:103-107](../../badhan-frontend/src/views/Certificate/certificateLayout.ts#L103-L107)),
specifically because jsPDF ships Helvetica as a **standard font** requiring no embedding — the whole
design was built to avoid exactly the font problem this plan now has to solve for the new artwork.
"Replacing the certificate SVG" therefore means replacing this component and its layout module, not
swapping in a static file. **This whole client-side pipeline is itself replaced by**
[Phase P3](#phase-p3--certificate-rendering-moves-to-the-backend) — described here because it is the
starting point the rest of this phase reasons from.

### P1.2 What the four supplied files are

| File | Size | What it is | Usable as the build-time source? |
| --- | --- | --- | --- |
| `Badhan New Certificate.ai` | 6.4 MB | Illustrator native format | No — proprietary, not parseable by any tool in this stack |
| `Badhan New Certificate.eps` | 13.6 MB | PostScript export | No — same problem as `.ai`, no web/Node tooling reads it |
| `Badhan New Certificate.pdf` | 5.6 MB | Print-ready export, fonts subset-embedded | No — this is the **target to match**, not a template; nothing in this stack builds a live, data-driven `<svg>` from a PDF |
| `Badhan New Certificate.svg` | 4.4 MB | Illustrator SVG export | **The source to build from** — the only format that is both parseable (structured, real coordinates/paths/text) and inspectable with plain text tools |

**Decision — the SVG is used as a layout and content reference, ported by hand into a new
renderer, not embedded or loaded at runtime.** Confirmed by inspection
([§P1.3](#p13-why-the-raw-svg-cannot-be-used-directly)): loading the raw file as-is would reproduce
the exact "font style doesn't match the PDF" bug this plan exists to fix, and — before the move to
server-side rendering — would have shipped an 839-element, 4.4 MB file to every visitor of a public,
no-auth route.

### P1.3 Why the raw SVG cannot be used directly

Two independent problems, both confirmed by reading the file:

**1. The font mismatch the user reported is explained, not just observed.** The SVG's `<style>`
block declares six `font-family` classes — `FuturaBT-HeavyItalic`, `SourceSerifPro-Bold`,
`GreatVibes-Regular`, `PalatinoLinotype-Roman`, `Kalpurush`, `MyriadPro-Regular` — as CSS class
selectors on `<text>`/`<tspan>` elements. None of the six is embedded in the SVG: there is no
`@font-face`, no `<defs>` font data, nothing. The browser (or `svg2pdf.js`) can only render these
correctly if that exact font happens to be installed on the machine viewing it — which is true on
the designer's workstation running Illustrator and false everywhere else, including every donor's
phone and every volunteer's browser. That gap **is** the reported mismatch.

The PDF, by contrast, has each of those same six families **subset-embedded** — confirmed with
`BaseFont` entries showing Illustrator's subsetting tag prefix (e.g. `BaseFont/SAXQRO+GreatVibes-Regular`,
`BaseFont/YRXVXC+Kalpurush`) and nine `FontFile` streams. The PDF is why it renders identically
everywhere; the SVG is why it doesn't. Fixing the mismatch means giving the new template's fonts the
same treatment the PDF already has — embedded, not merely referenced — see
[§P3.4](#p34-fonts-embedded-not-linked).

**2. The artwork is not something a hand-maintained renderer should hold path-by-path.** The
decorative background — border, marbled texture, ornamental corners — is 834 `<path>` elements
inside clipped, nested `<g>` groups, a typical Illustrator "expand appearance" export. Porting that
by hand would make it unreviewable. **Decision, confirmed with the user:** the static decorative
background is rasterised once, at build time, into a single image. Only the fields that vary per
donor — names, student ID, department/hall line, and the QR — are drawn live, so the QR keeps
printing as vector data.

**Superseded by [P2](#phase-p2--donor-schema-fathername-mothername-and-the-certificate-toggle)/[P3](#phase-p3--certificate-rendering-moves-to-the-backend):
the rasterised background is no longer shipped to the browser at all.** The paragraph above still
describes *why* rasterising is right; where the resulting image lives changed after this plan was
first written — see [§P3.1](#p31-why-server-side-not-a-frontend-asset).

### P1.4 What the SVG's text content actually says (the template to match)

Extracted directly from the SVG's `<text>`/`<tspan>` elements (`temp/Badhan New Certificate.svg`,
confirmed against `pdftotext -layout` on the PDF, which reads identically):

> BADHAN — A Voluntary Blood Donors' Organization — Estd.-1997, Reg. No.: DHA- 06152
>
> **Certificate of Acknowledgement**
>
> We are feeling honoured to state that **`____________`** *(name)*, son/daughter of **`Mr. ____________`**
> *(father)* and **`Mrs. ____________`** *(mother)*, student of the department/faculty of
> **`____________`** *(department)* of Bangladesh University of Engineering and Technology,
> residing/attached at/to **`____________`** *(hall)*, is a voluntary blood donor. We highly
> appreciate his/her contribution to humanity and hope that he/she will continue this effort as long
> as possible.
>
> We wish him/her success in every sphere of life.
>
> `__________` / Directorate of Students' Welfare, BUET · `__________` / President/General
> Secretary, BADHAN, `____________` Unit · `__________` / President/General Secretary, BADHAN, BUET
> Zone

The sample values baked into the supplied artwork — `Rahim Karim` (name), `Mr. Rahim` / `Mrs. Karim`
(parents, so the placeholder is coincidentally reusing the child's own name), `MME` (department),
`Sher-E-Bangla` (hall) — are Illustrator placeholder content, not live data, and are not carried into
the renderer.

**New, versus today's certificate:** father's name and mother's name (each rendered with its
honorific, "Mr." / "Mrs.", literal text baked into the layout, not stored per-donor), and the
department/faculty line. **Decision needed before P2/P3 can be sized precisely** —
[§P1.5](#p15-open-question-department-and-hall-text).

**Decision, confirmed with the user: the gender-dependent wording ("his/her", "son/daughter of")
stays generic, printed as-is for every donor.** The schema has no gender/sex field today, and none is
added by this plan — the placeholder slash-text from the supplied artwork is kept literally rather
than resolved per donor, which keeps this plan's scope to the two name fields plus the toggle instead
of adding a fourth schema field with its own validators/forms/CSV/migration/docs footprint.

### P1.5 Open question: department and hall text

The new wording asks for two things the Donor schema does not currently carry as free text:

- *"student of the department/faculty of `____`"* — the schema has no department field at all
  (`studentId`'s middle two digits encode a department **code**, validated against
  `DEPARTMENT_CODES_FOR_VALIDATION`, but nothing maps that code back to a printable department
  name today).
- *"residing/attached at/to `____`"* — the schema's `hall` is a **numeric enum** (`[0,1,2,3,4,5,6,8]`,
  named in [constants.ts:16](../../badhan-frontend/src/mixins/constants.ts#L16) as `Ahsanullah`,
  `Chatri`, `Nazrul`, `Rashid`, `Sher-e-Bangla`, `Suhrawardy`, `Titumir`, `Attached`), which already
  has a display-name mapping the frontend uses elsewhere.

Unlike father's/mother's name, **neither of these needs a new required donor field** — `hall` already
resolves to a printable name via the existing frontend constant, and this plan's scope (per the task)
is limited to adding the two name fields plus the enable flag. Department is filled from the existing
hall name only; resolving `studentId`'s department code to a full department name is out of scope and
left as a gap in the printed sentence (rendered as the department **code**, e.g. "MME", taken
directly from `studentId` chars 3-4, which is at least accurate and matches the supplied sample's
format).

**Decision, confirmed with the user: print the raw code, no code→full-name mapping added.** Keeps
this plan scoped to the two name fields plus the toggle, rather than also building and maintaining a
department-code lookup table.

---

## Phase P2 — Donor schema: `fatherName`, `motherName`, and the certificate toggle

**Depends on:** [P1](#phase-p1--decide-what-replace-the-certificate-svg-means) · **Deployable alone:**
yes, independently of P3-P6 · **Reversible:** yes, by a follow-up migration
**Status:** Implementation complete — backend model/validators/controller, frontend forms/CSV/API
types, and test fixtures (including `GuestController`'s hand-built fake-data endpoints) all updated;
`docker compose exec backend npx tsc --noEmit`, `docker compose exec frontend npm run build`, and the
full `docker compose run backend-test` suite (217/217) all pass. `docs/manual/` updates are deferred
to [P5](#phase-p5--documentation), which lands with [P3](#phase-p3--certificate-rendering-moves-to-the-backend)
per this repo's CLAUDE.md rule that behaviour and manual changes ship together.

**Four gaps found and closed while verifying [P3](#phase-p3--certificate-rendering-moves-to-the-backend).**
The backend suite was green because it is written against the API; the Cypress suite was not run, and
16 of its 37 specs were failing. Two of the four were live bugs in the app, not test debt:

1. **The batch archive sweep was broken.** [Home.vue](../../badhan-frontend/src/views/Home.vue)
   builds its `PATCH /donors/v2` body field by field and never learned the new fields, so every sweep
   stopped at the first donor with *"Stopped after 0 of N donors"*. It type-checks nowhere — the file
   is plain JS, so `PATCHDonorsPayloadInterface` never applied to it, which is how this reached the
   branch at all. `fatherName`, `motherName` and `isCertificateEnabled` added.
2. **The single-donor creation form could not be submitted.**
   [SingleDonorCreation.vue](../../badhan-frontend/src/views/SingleDonorCreation.vue) builds the
   blank draft it hands to `NewPersonCard`, and did not put the two new keys on it. `NewPersonCard`
   warns about a draft missing an expected key — [§P2.3](#p23-frontend-form-fields) correctly added
   both to `keysExpected` — and any warning disables the **Create** button. So the form rendered its
   new fields, validated them, and refused to submit. This affected the reset path *and* the
   feedback-queue prefill path, i.e. every way of reaching the form.
3. Cypress's three shared donor-creation helpers (`members.ts`, `feedback.ts` ×2) and the
   `patchDonorViaApi` helper did not send the new fields.
4. `donorCsvGenerator.ts`'s `CANONICAL_HEADERS` had drifted from the app's
   ([donorCsv.ts](../../badhan-frontend/src/utils/donorCsv.ts)), so every generated upload was
   missing two columns.

After these, `docker compose run --rm frontend-test` is green: 120 tests, 37 specs.

Three new fields: `fatherName` and `motherName` (added to mirror the existing `comment` field
exactly — same shape, same default convention, same layering between Mongoose and the request
validator), and `isCertificateEnabled` (a new boolean gate, [§P2.6](#p26-iscertificateenabled)).
**Decision, confirmed with the user:** `fatherName`/`motherName` default to **`'(Unknown)'`**,
matching `comment`/`address`/`roomNumber` (not `'(Unspecified)'`, floated in the original ask —
checked against the actual schema and corrected).

### P2.1 What changes, and where — mirroring `comment` field-for-field

| Layer | `comment`, today | `fatherName` / `motherName`, added |
| --- | --- | --- |
| `IDonor` interface | [Donor.ts:31](../../badhan-backend/src/db/models/Donor.ts#L31) `comment: string;` | same shape, two new lines |
| Mongoose schema | [Donor.ts:202-209](../../badhan-backend/src/db/models/Donor.ts#L202-L209) — `trim`, `default: '(Unknown)'`, `required: true`, `minlength: 2`, `maxlength: 500` | same block shape, twice, `default: '(Unknown)'`, but **`minlength: 3`/`maxlength: 100`** — see [§P2.1a](#p21a-decision-name-length-not-comment-length) |
| Swagger doc block | lines ~89-92 | two new property blocks, same shape |
| Request validator | [validateBody.ts:75-78](../../badhan-backend/src/validations/validateRequest/validateBody.ts#L75-L78) `validateBODYComment` — `.exists().not().isEmpty()`, length 2-500 | `validateBODYFatherName`, `validateBODYMotherName`, same chain shape but length 3-100, matching `validateBODYName`'s bounds instead |
| POST /donors required list | [validations/donors.ts:7-23](../../badhan-backend/src/validations/donors.ts#L7-L23) `validatePOSTDonors` includes `validateBODYComment` | add both new chains — **required on create**, per the task |
| PATCH /donors/v2 | `comment` is **absent** from `validatePATCHDonors` ([donors.ts:25-37](../../badhan-backend/src/validations/donors.ts#L25-L37)) — comment has its own dedicated PATCH route instead | `fatherName`/`motherName` are ordinary profile fields, not comment-like append-only notes — add to the **general** PATCH body and validator instead of creating dedicated routes (see [§P2.2](#p22-decision-general-patch-not-a-dedicated-route)) |
| `DonorsController.ts` POST body type | line 129 `comment: string;` | two new lines in the same inline type ([DonorsController.ts:121-133](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L121-L133)) |
| `DonorsController.ts` PATCH body type | [line 619-631](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L619-L631) | two new lines |
| `donorInterface.insertDonor` | positional `comment` param, no defaulting (Mongoose does it) | two new positional params, same treatment |
| CSV import | [donorCsv.ts](../../badhan-frontend/src/utils/donorCsv.ts) `CANONICAL_HEADERS` (lines 11-15) includes `comment`; parsing at lines 133-136 defaults blank → `'(Unknown)'` | add `fatherName`, `motherName` to `CANONICAL_HEADERS` and the same blank-defaulting block |
| Demo CSV | `DEMO_CSV` constant, lines 318-323, built from `CANONICAL_HEADERS` | header row picks the new columns up automatically; the 3 sample data rows need literal values added |
| `NewPersonCard.vue` (create form) | plain text field, no vuelidate rule, defaults to `'(Unknown)'` client-side if blank before submit (line 413) | two new text fields, same no-vuelidate-but-defaulted pattern — see [§P2.3](#p23-frontend-form-fields) |
| `PersonDetails.vue` (edit form) | comment is edited via its **own** dedicated save button/PATCH ([lines 173-185](../../badhan-backend/../badhan-frontend/src/components/PersonDetails.vue), [saveCommentClicked, ~973-982](../../badhan-frontend/src/components/PersonDetails.vue)) — address/roomNumber instead bundle into the general PATCH | fatherName/motherName bundle into the **general** PATCH alongside name/address/roomNumber, not a dedicated per-field route — see [§P2.2](#p22-decision-general-patch-not-a-dedicated-route) |

### P2.1a Decision — name length, not comment length

**Decision, confirmed with the user:** `fatherName`/`motherName` are bounded `minlength: 3`,
`maxlength: 100` — the same bounds as the existing `name` field
([Donor.ts:199-200](../../badhan-backend/src/db/models/Donor.ts#L199-L200)) — not `comment`'s `2-500`.
These fields hold a person's name, the same kind of value as the donor's own `name`, so they're sized
like one; `comment`'s wider 2-500 range exists for free-text notes, which this isn't. Every other part
of the `comment` mirroring in [§P2.1](#p21-what-changes-and-where--mirroring-comment-field-for-field)
(default convention, layering between Mongoose and the request validator, required-on-create) still
holds — only the length bounds diverge.

### P2.2 Decision — general PATCH, not a dedicated route

`comment` has its own PATCH route (`PATCH /donors/comment`) because comment is conceptually a running
note, edited independently of the rest of the profile, with its own `commentTime` stamp. Father's and
mother's name are ordinary profile facts, the same shape as `name`, `address`, or `roomNumber`, which
travel together through the general `PATCH /donors/v2`. There is no equivalent of `commentTime` to
stamp, and no product reason to let one be edited without the other. **They join the general PATCH
body**, not a new dedicated endpoint — this keeps the field count on that route additive (two new
required strings) rather than inventing a fourth small route to maintain.

### P2.3 Frontend form fields

Two new text inputs in [NewPersonCard.vue](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue)
(create) and [PersonDetails.vue](../../badhan-frontend/src/components/PersonDetails.vue) (edit),
placed next to **Name** since they are the same kind of fact about the same person. **Decision,
confirmed with the user: Father's Name before Mother's Name**, in both forms and in the underlying
field order (`fatherName` before `motherName` throughout the schema/validators/CSV) — matching the
certificate template's own order ("son/daughter of Mr. `____` and Mrs. `____`"). **Decision —
required client-side**, unlike `comment`: the task states these are "a required field for the API",
and `comment`'s no-vuelidate-rule pattern exists because comment is optional-with-a-fallback at the
UI layer even though Mongoose marks it required. Father's/mother's name should behave like `name`
itself — a `required` vuelidate rule, not a silent default-on-submit — so a volunteer is prompted to
type something rather than every new donor silently getting `'(Unknown)'` by default. The manual
default only fires for the two bulk paths that cannot prompt anyone: CSV upload
([§P2.1](#p21-what-changes-and-where--mirroring-comment-field-for-field)) and any pre-existing donor
touched by the backfill migration ([§P4](#phase-p4--backfill-existing-donors)).

`keysExpected` in [NewPersonCard.vue:342](../../badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue#L342)
gains both new keys — this array is what the duplicate-donor comparison reads, and an unlisted key
there currently produces a console warning, not a hard failure, but should still be complete.

**Decision, confirmed with the user:** **Enable certificate** ([§P2.6](#p26-iscertificateenabled))
lives on `PersonDetails.vue` (edit form) only, not on `NewPersonCard.vue` (create form) — the task
frames it as something turned on *for* a donor, which reads as a later, deliberate edit-time action,
not a creation-time default; every new donor already gets `isCertificateEnabled: false` from the
schema default with nothing to expose at creation time.

### P2.4 Backend tests to update

Every one of these is a closed-field JSON schema (`additionalProperties: false`) and will fail-closed
the moment the API starts returning the new fields — which is the intended trip-wire, not a bug to
route around:

| File | Schema(s) | What to add |
| --- | --- | --- |
| `badhan-backend-test/tests/donors/schemas.js` | `donorsNewSchema`, `searchSchema`, `duplicateDonorSchema`, `donorsSchema`, `postDonorSchema`, `allDonorSchema` (verify each directly — some property lists were not individually confirmed in this pass) | `fatherName`, `motherName`, `isCertificateEnabled` as required properties, alongside `comment`/`availableToAll` in each |
| `badhan-backend/src/db/test/factories/donorFactory.ts` | test donor factory, line 15 has `comment: faker.getComment()` | add `fatherName`/`motherName` fixture values (same faker-style helper or literal test strings) and `isCertificateEnabled` (a literal boolean) |
| `badhan-backend-test/tests/donors/infos.js` | 3 literal donor payload fixtures (lines 10, 23, 36) already set `comment:` | add `fatherName`/`motherName`/`isCertificateEnabled` alongside |

### P2.5 The certificate API's shape moves to Phase P3

Earlier drafts of this plan widened `CertificatesController`'s existing JSON endpoint
(`GET /certificates/{donorId}` → `{name, studentId}`) to also return `fatherName`/`motherName`, on
the theory that the frontend would keep building the PDF client-side. **That is superseded**: the
certificate is now generated entirely on the backend and returned as a finished PDF
([§P3](#phase-p3--certificate-rendering-moves-to-the-backend)), so there is no longer a JSON
certificate payload that reaches the browser at all — the donor fields needed for the certificate
never leave the server. The security-boundary discussion that used to live here (this endpoint is
public/unauthenticated, and only two fields — now more — were ever meant to cross it) still applies,
in sharper form, to the new PDF endpoint — see [§P3.2](#p32-what-crosses-the-boundary-now).

### P2.6 `isCertificateEnabled`

A new boolean, gating whether a donor's certificate exists at all from the outside — "the certificate
can only be verified if the field is enabled," per the task. Modelled on `availableToAll`
([Donor.ts](../../badhan-backend/src/db/models/Donor.ts)), the closest existing pattern for a plain
admin-flippable toggle (as opposed to `archiveFlag`, which carries its own migration/validator
machinery, or `designation`, which has dedicated elevated-permission routes):

```ts
isCertificateEnabled: {
  type: Boolean,
  required: true,
  default: false
}
```

**Decision — defaults to `false`.** A certificate is something a volunteer actively turns on for a
donor, not something that exists for everyone unless switched off — matching how the task describes
it ("show the certificate for donors for whom it was enabled"). This also means the backfill migration
([§P4](#phase-p4--backfill-existing-donors)) sets every pre-existing donor to `false`: no certificate
that was reachable today becomes unreachable, because none was gated before this field existed, but
no certificate becomes reachable that a volunteer hasn't explicitly enabled going forward either — the
only exception is data-consistency accuracy, not a behaviour promise.

**Decision, confirmed with the user: backfill existing donors to `false`, same as the schema
default.** Accepted trade-off: every pre-existing donor's certificate becomes unreachable
(distinct "not enabled" message, [§P3.3](#p33-the-new-endpoint)) until a volunteer notices and
enables it by hand — the safer default, since it means no certificate is reachable anywhere without
an explicit, post-launch decision to turn it on.

- `IDonor` interface: `isCertificateEnabled: boolean;`, alongside `availableToAll`/`archiveFlag`.
- Request validator: `validateBODYIsCertificateEnabled`, boolean chain matching the existing
  `validateBODYAvailableToAll`/`validateBODYArchiveFlag` shape in
  [validateBody.ts](../../badhan-backend/src/validations/validateRequest/validateBody.ts).
- **Decision, confirmed with the user — patchable through the general route, same permission level as
  every other profile field.** Investigation confirmed `PATCH /donors/v2`
  ([DonorsController.ts](../../badhan-backend/src/tsoaControllers/DonorsController.ts),
  `validatePATCHDonors` in [validations/donors.ts:25-37](../../badhan-backend/src/validations/donors.ts#L25-L37))
  carries no role gate beyond ordinary edit permission — same-hall unless `SUPER_ADMIN`, and the
  editor's designation must be ≥ the target's (or self). `isCertificateEnabled` joins that same body
  and validator, with no additional check. **Considered and rejected:** gating this field to hall-admin
  or above, the way `designation` changes are — rejected because it would be the one field on the
  general PATCH route with a bespoke permission rule, adding a maintenance edge for a toggle that is
  no more consequential than `availableToAll`, which already carries the same blast radius (deciding
  whether a donor is reachable/visible beyond their own hall).
- Not required on `POST /donors` — a brand-new donor is created with `isCertificateEnabled: false` by
  the schema default, same as `archiveFlag`; nothing in the task asks for it to be settable at
  creation time, only that it is *patchable* afterward.
- **Not part of `validatePOSTDonorsCSV`/CSV upload** — same reasoning: enabling a certificate is a
  deliberate, later action, not a bulk-import field. CSV-imported donors get the schema default
  (`false`) like any other new donor.

---

## Phase P3 — certificate rendering moves to the backend

**Depends on:** [P1](#phase-p1--decide-what-replace-the-certificate-svg-means),
[P2](#phase-p2--donor-schema-fathername-mothername-and-the-certificate-toggle) · **Deployable alone:**
no — needs `fatherName`/`motherName`/`isCertificateEnabled` to exist first · **Reversible:** yes,
independently of P2
**Status:** Implementation complete. Backend renders the PDF with `pdfkit` and returns it from
`GET /certificates/{donorId}`; the frontend template is deleted and the page embeds the fetched PDF;
the background PNG is baked from the supplied SVG by a Dockerised prep step. Verified: backend
`tsc --noEmit` and `tslint` clean, frontend `npm run build` clean, `backend-test` 218/218,
certificate Cypress specs 10/10, and no certificate asset appears anywhere in `badhan-frontend/dist`.
Six things diverged from what this phase assumed when it was written, each recorded at the section
it belongs to: [§P3.4](#p34-fonts-embedded-not-linked) (fonts), [§P3.5](#p35-the-render-pipeline-pdfkit)
(no student ID on the new artwork; department name rather than raw code),
[§P3.6](#p36-the-rasterised-background--server-side-and-private) (two further SVG export defects),
[§P3.7](#p37-the-old-frontend-template-is-deleted-not-kept-as-a-fallback) (`jspdf`/`svg2pdf.js` stay),
and [§P3.10](#p310-what-this-phase-found-that-the-plan-did-not-predict).

**Major change from how this plan started.** The certificate was going to stay a browser-built
artifact — a live `<svg>` the frontend hydrates and converts to a vector PDF with `svg2pdf.js`. That
whole pipeline, and everything P1/P3 said about a rasterised-background PNG shipped in the frontend
bundle, is now replaced: **the backend renders the finished PDF and returns it; nothing about the
template — the background image, the fonts, the layout constants — ships to the browser at all.**
This phase supersedes [§P1.1](#p11-what-the-current-template-is) in practice and replaces the original
version of this section in full.

### P3.1 Why server-side, not a frontend asset

Two requirements from the task, together, rule out keeping any part of the template client-side:

1. **"The static template png and any other certificate related assets should not be made public."**
   Any asset shipped in the frontend bundle — a JS chunk, a CSS file, an image, a base64 data URI
   embedded in either — is public by construction: it is served to anyone who loads the page, with no
   auth, because the bundle itself has no auth. There is no way to ship a "private" asset to a
   browser-rendered public page. The only way to keep the background image (and the layout/fonts that
   go with it) non-public is to never send it to the browser — i.e. render entirely server-side and
   send only the finished, flattened PDF bytes.
2. **The endpoint now must itself decide reachability** ([§P2.6](#p26-iscertificateenabled)) — "the
   certificate can only be verified if the field is enabled." That check has to happen somewhere that
   can refuse to produce output at all, which is naturally the server, not a client that has already
   been handed the template and the donor's data before it could check anything.

### P3.2 What crosses the boundary now

The existing `CertificatesController` comment
([CertificatesController.ts:9-12](../../badhan-backend/src/tsoaControllers/CertificatesController.ts#L9-L12))
already frames this route's real protection as "there is nothing worth stealing in the payload," not
access control — the donor id in a certificate URL is not a secret, so anyone can ask for anyone's
certificate by design (an employer or university verifying a paper certificate has no Badhan account).
That framing holds, sharpened: what crosses the boundary is no longer a JSON object a script could
read structured fields from, but **rendered pixels/vector paths inside a PDF** — the same "nothing
worth stealing" list applies (never blood group, phone, email, hall, room, donation history), now
enforced by what the renderer is given to draw rather than by what a response object spreads.

### P3.3 The new endpoint

`GET /certificates/{donorId}` (same path, same controller) changes its return shape from JSON to a
PDF binary:

- **Unauthenticated**, as today — the task confirms this explicitly ("this will be unauthenticated").
- Looks up the donor exactly as today; a malformed or unknown id still gets the same indistinguishable
  404 ([CertificatesController.ts:45-48](../../badhan-backend/src/tsoaControllers/CertificatesController.ts#L45-L48)).
- **New check: `isCertificateEnabled`.** If `false`, the endpoint refuses — **decision, confirmed with
  the user:** a distinct response from "not found" (*"Certificate not available for this donor"* or
  equivalent), not the same 404. This is a deliberate departure from the controller's existing
  "answer every failure the same way" posture for unknown/malformed ids
  ([CertificatesController.ts:43-44](../../badhan-backend/src/tsoaControllers/CertificatesController.ts#L43-L44)):
  that posture exists to stop someone walking the id space from learning which ids are well-formed,
  which does not apply here, since the id has already resolved to a real donor — the only thing being
  disclosed is "this real donor has not had their certificate turned on," which is the whole point of
  a distinguishable message per the task.
- On success: renders the PDF ([§P3.5](#p35-the-render-pipeline-pdfkit)) and returns it with
  `Content-Type: application/pdf`. No JSON envelope, no `{status, statusCode, message}` wrapper for
  the success path — those still apply to the two failure cases (not-found, not-enabled), which stay
  JSON errors the frontend can distinguish and message appropriately.
- **tsoa has no existing binary-response pattern in this codebase** (confirmed — every controller
  today returns JSON; `@Res()`/`Buffer`/`Content-Disposition` do not appear anywhere in
  `src/tsoaControllers`). This route needs tsoa's `@Res()` custom-response escape hatch (a typed
  `TsoaResponse<200, Buffer, {'Content-Type': 'application/pdf'}>` injected and called directly,
  bypassing the normal return-an-object flow) — the first controller in this codebase to do so, worth
  flagging in review since it is a new pattern, not an established one to copy from elsewhere in this
  repo.
- **Rate limiting: decision, confirmed with the user — reuse `commonLimiter`** (12 req/min per IP,
  [rateLimiter.ts:33-37](../../badhan-backend/src/middlewares/rateLimiter.ts#L33-L37)), the same shared
  limiter already applied to other lightweight JSON routes. No dedicated `certificateLimiter` is added —
  this keeps the endpoint's middleware identical to its current setup rather than introducing a new
  bespoke budget for this plan to size and maintain.

### P3.4 Fonts: embedded, not linked

The mismatch diagnosis from [§P1.3](#p13-why-the-raw-svg-cannot-be-used-directly) still holds — the
supplied SVG references six unembedded font families, which is why it doesn't render like the PDF.
The fix is unchanged in spirit, simpler in practice now that rendering happens once, server-side, in
a controlled environment rather than in every visitor's browser:

- `pdfkit` embeds any TTF/OTF handed to it via `.font('path/to/file.ttf')` or a buffer — this is
  exactly the "real font file, not a name the OS might have" requirement the PDF's own
  subset-embedding already satisfies, and pdfkit does it natively with no DOM/browser step.
- `GreatVibes-Regular` (the script face used for the heading/name text in the supplied artwork) is
  freely licensed — bundle the actual TTF in the backend image (`badhan-backend/src/assets` or
  similar), not a CDN reference. `PalatinoLinotype-Roman` and `MyriadPro-Regular` are commercial
  Adobe/Linotype faces with no free redistribution — **decision, confirmed with the user: substitute
  PT Serif for Palatino and PT Sans for MyriadPro**, both SIL Open Font License faces, metrically close
  to their commercial counterparts and bundled the same way as `GreatVibes-Regular` (actual TTF in the
  backend image, not a CDN reference) — rather than bundling a font Badhan has no license to ship.
  `FuturaBT-HeavyItalic`/`SourceSerifPro-Bold` (the "BADHAN" wordmark and registration line) and
  `Kalpurush` (the fixed decorative Bangla slogan in the corners, confirmed static —
  [temp SVG lines 38644-38645](../../temp/Badhan%20New%20Certificate.svg)) are all part of the
  rasterised background image ([§P3.6](#p36-the-rasterised-background--server-side-and-private)),
  drawn once at asset-preparation time, not by pdfkit per request — so pdfkit itself never needs those
  four faces at all, only whichever face renders the live donor-specific text.

**What was actually built, and why it is better than the substitution plan above.** Every live value
on the certificate is in `GreatVibes-Regular` and nothing else, so pdfkit needs exactly **one** font
file: [badhan-backend/src/assets/fonts/GreatVibes-Regular.ttf](../../badhan-backend/src/assets/fonts/GreatVibes-Regular.ttf),
bundled with its OFL licence. No substitution is needed at render time at all.

The substitutions this section proposed for the *background* — PT Serif for Palatino, PT Sans for
MyriadPro — were **not** needed either, and were not used. The supplied PDF has all six families
subset-embedded ([§P1.3](#p13-why-the-raw-svg-cannot-be-used-directly) established this as the
diagnosis; it turns out to also be the cure), so
[install-fonts.py](../../badhan-backend/scripts/certificate-assets/install-fonts.py) recovers the
artwork's own Futura and Palatino from the PDF with `mutool extract` and aliases them to the names
the SVG asks for. The background is therefore drawn in the designer's real type rather than in a
lookalike. Nothing commercial is committed or redistributed: the subsets are extracted at prep time
inside the container, used to bake one PNG, and discarded with the container. The freely licensed
half — Playfair Display, Great Vibes, Kalpurush — is baked into the prep image from its own sources.
Two of the six families named in the SVG turned out not to be used by the artwork's final text at
all: `MyriadPro-Regular` only ever set the "QR Code" placeholder label, and the body is Playfair
Display rather than the Palatino the class names suggest.
- No browser, no `@font-face`, no CSS — the entire "does the viewer's device happen to have this font
  installed" problem disappears, because nothing is rendered on the viewer's device anymore.

### P3.5 The render pipeline — pdfkit

**Decision, confirmed with the user:** `pdfkit`, not a headless browser. The backend has zero
PDF/rendering dependencies today and no graphics system packages in its Docker image (confirmed by
investigation — no cairo/pango/chromium, `dependencies`/`devDependencies` contain none of
pdfkit/jspdf/puppeteer/pdf-lib/sharp/canvas). `pdfkit` is pure JavaScript, needs no native or system
dependencies, and so needs no Docker image change — versus a headless-browser approach
(puppeteer/playwright), which would add ~300 MB+ and a Chromium sandbox surface to render one A4 page.
The trade is template-authoring convenience (an SVG+CSS template rendered by a real browser engine
would need very little rewriting) for a much smaller, simpler, faster-to-cold-start production
dependency — accepted, since the template is being redrawn from scratch either way
([§P1.3](#p13-why-the-raw-svg-cannot-be-used-directly) already established the raw SVG can't be used
unmodified regardless of renderer).

Per-request, the endpoint:

1. Loads the pre-rendered background image ([§P3.6](#p36-the-rasterised-background--server-side-and-private))
   from the backend's own filesystem/bundle (never sent anywhere) and places it full-bleed with
   `doc.image(...)`.
2. Draws the dynamic text — name, "Mr. `<fatherName>`", "Mrs. `<motherName>`", student ID,
   department/hall line — with `doc.font(...).text(...)` at the millimetre-equivalent coordinates
   ported from the supplied SVG/PDF (pdfkit works in points; the existing "one user unit is one
   millimetre" convention from [certificateLayout.ts](../../badhan-frontend/src/views/Certificate/certificateLayout.ts)
   is kept as a **backend** module now, values converted mm → pt at the top rather than at every call
   site).
3. Generates the QR with the existing `qrcode` npm package — already a dependency in
   `badhan-frontend/package.json` and directly usable server-side (it is an isomorphic Node library;
   the browser `create()` call used today is the same API this plan reuses on the backend, no new
   package needed) — and draws it as vector paths via `doc.path(...).fill()`, the same "never
   rasterise the QR" requirement the current frontend code already enforces
   ([CertificateArtwork.vue:160-180](../../badhan-frontend/src/views/Certificate/CertificateArtwork.vue#L160-L180)),
   ported to pdfkit's path API instead of an SVG `<path>` string.
4. The QR encodes the certificate's own public verification URL
   (`<frontend base>/certificate?id=<donorId>`), matching today's self-referential design
   ([Certificate.vue:138-141](../../badhan-frontend/src/views/Certificate.vue#L138-L141)) — built from
   the backend's known frontend base URL config, not from any request header, since a server has no
   `window.location.href` to read.
5. Streams the finished PDF buffer back as the response body.

The name-fitting problem the current frontend already solves — shrink through font-size stops, then
wrap to two lines, never clip — moves to the backend too: pdfkit exposes `doc.widthOfString(...)` for
the same measure-then-decide loop `CertificateArtwork.vue`'s `fitName`/`splitIntoTwoLines`
([CertificateArtwork.vue:213-261](../../badhan-frontend/src/views/Certificate/CertificateArtwork.vue#L213-L261))
already implements — the algorithm ports directly, only the measurement API changes.

**As built, three details of this list changed:**

1. **There is no student ID on the new certificate.** The supplied artwork has no blank for one —
   confirmed against both the SVG's text and `pdftotext` on the PDF, and consistent with
   [§P1.4](#p14-what-the-svgs-text-content-actually-says-the-template-to-match), which transcribes
   the whole document and contains no student ID. The list above inherited it from the old
   template. It is not drawn, and the verification workflow now compares **names** rather than name
   plus student ID; the manual is updated to match. The student ID is still *used* — it is where
   the department comes from.
2. **The department prints as a name, not a raw code.** [§P1.5](#p15-open-question-department-and-hall-text)
   settled on the raw code specifically to avoid "building and maintaining a department-code lookup
   table". No table needed building: `departments` already exists in
   [badhan-backend/src/constants/index.ts](../../badhan-backend/src/constants/index.ts), is already
   maintained, and is already what every studentId validator is derived from. `1605011` therefore
   prints as `MME`-style text — exactly what the designer's own sample shows — rather than `05`. The
   parenthesised code the drop-downs carry (`"CSE (05)"`) is trimmed off for print, and a studentId
   whose department code has no name (code `00`, which the validator accepts) still falls back to
   the digits.
3. **Fitting shrinks, and never wraps.** The old template had a two-line fallback because it had the
   room for one. This artwork does not: each blank is a single ruled line with the next line of the
   sentence 25 pt below it, so a wrapped name would print on top of the sentence. Since width scales
   linearly with font size, the exact fitting size is one division rather than a loop of stops
   ([certificateRenderer.ts](../../badhan-backend/src/services/certificate/certificateRenderer.ts)),
   floored at 9 pt. Confirmed against a 52-character name: it fits, on one line, uncut.

### P3.6 The rasterised background — server-side and private

Same rasterisation decision as before ([§P1.3](#p13-why-the-raw-svg-cannot-be-used-directly)), moved
off the public frontend bundle entirely.

**Decision, confirmed with the user: derived programmatically from the SVG, not exported by hand in
Illustrator.** `temp/Badhan New Certificate.svg` is edited to strip the **dynamic** field placeholder
text and the placeholder QR (both identified in [§P1.4](#p14-what-the-svgs-text-content-actually-says-the-template-to-match)),
then rasterised at ≥300 DPI for an A4 sheet (3508 × 2480 px) to PNG with a scriptable, Dockerised
CLI tool — `resvg` or `rsvg-convert` — run as a one-off build/prep step, not a per-request dependency
(the render pipeline in [§P3.5](#p35-the-render-pipeline-pdfkit) only ever reads the finished PNG from
disk). This keeps the whole pipeline reproducible and re-runnable from the committed SVG without
depending on Illustrator or a human export step — the same reproducibility [§P1.3](#p13-why-the-raw-svg-cannot-be-used-directly)
already wanted for the hand-ported layout, now extended to the background image too. The six
unembedded font families named in [§P1.3](#p13-why-the-raw-svg-cannot-be-used-directly) still need to
resolve correctly for this rasterisation step, since the background bakes in the four decorative/fixed
faces ([§P3.4](#p34-fonts-embedded-not-linked)) — the same TTFs bundled for pdfkit
([§P3.4](#p34-fonts-embedded-not-linked)) are installed in whichever container runs the SVG→PNG
conversion, so the rasteriser sees real font files rather than falling back to a substitute.

- The file lives under `badhan-backend/src/assets/` (or equivalent), loaded by the render pipeline at
  request time from local disk/bundle — **never imported into `badhan-frontend`, never referenced by
  any frontend-served bundle, never returned by any JSON endpoint.** This is the concrete fix for "the
  static template png and any other certificate related assets should not be made public": it simply
  never reaches a route the browser can fetch independently of a rendered PDF.
- No size-budget concern in the sense the original version of this section raised (a bundle shipped to
  every visitor) — it is read once per request from local disk, so a full 300 DPI PNG is fine. Still
  worth compressing sensibly so the Docker image and cold-start read stay small, but this is an ops
  concern, not a public payload-size concern anymore.
- `certificateLogo.ts`'s existing pattern (a header comment documenting the exact export command used)
  is still the right convention to copy for reproducibility — here, a checked-in prep script (e.g.
  `badhan-backend/scripts/render-certificate-background.*`) invoking the SVG→PNG CLI with the exact
  flags used, rather than a comment describing a manual Illustrator export, since there no longer is
  one.

**As built:** [badhan-backend/scripts/certificate-assets/](../../badhan-backend/scripts/certificate-assets/)
holds a Dockerfile, two Python steps and a driver, wired up as a `certificate-assets` service behind
a new `assets` profile in [docker-compose.yml](../../docker-compose.yml):

```
docker compose --profile assets run --rm certificate-assets \
  badhan-backend/scripts/certificate-assets/render-background.sh
```

`rsvg-convert` at 3508 x 2480 (300 DPI A4), then `optipng`, producing a 2.1 MB
[certificate-background.png](../../badhan-backend/src/assets/certificate-background.png).

Stripping the placeholders is stated as two rules rather than as a list of coordinates — every
`<text>` in GreatVibes is a filled-in value, plus the QR label and its box — so a re-export that
moves the sample text still strips correctly, and the script exits non-zero rather than baking a
stranger's name into the background if the count ever changes.

**Two further export defects turned up, beyond the missing fonts
[§P1.3](#p13-why-the-raw-svg-cannot-be-used-directly) found**, both fixed in
[prepare-background-svg.py](../../badhan-backend/scripts/certificate-assets/prepare-background-svg.py)
and both confirmed against the PDF:

1. **Four text classes carry a font-size and no font-family at all** — the heading, the organisation
   line, the whole body paragraph and the signature block. They were not merely referencing an
   unavailable font; they were referencing *nothing*, falling back to whatever the viewer defaulted
   to. This is the larger half of the reported mismatch: it is why the body rendered upright in a
   generic serif instead of Playfair Display italic, and why the words collided.
2. **The Bangla corner slogans exported as unshaped garbage** — `এককর রক অননর জজবন` where the
   document reads `একের রক্ত অন্যের জীবন`. Every vowel sign and conjunct was dropped on the way out,
   so the correct text is not recoverable from the SVG and is restored from the PDF, which renders
   it correctly. Keyed on the broken string, so a fixed re-export falls through untouched.

### P3.7 The old frontend template is deleted, not kept as a fallback

`badhan-frontend/src/views/Certificate/CertificateArtwork.vue`, `certificateLayout.ts`,
`certificateLogo.ts`, and `certificatePdf.ts` are all removed — their logic (name-fitting, QR
generation, layout constants) is ported into the backend per [§P3.5](#p35-the-render-pipeline-pdfkit),
not duplicated. Keeping both would mean two certificate renderers to keep visually in sync, which is
the exact drift this plan's font/geometry work is trying to eliminate. ~~`jspdf` and `svg2pdf.js`
become unused frontend dependencies once this lands — remove them from
`badhan-frontend/package.json`~~

**Corrected: `jspdf`, `svg2pdf.js` and `qrcode` all stay.** The four certificate files are deleted
as described, but the claim that nothing else calls those libraries was wrong. The feedback and
registration QR sheets still build their PDFs in the browser exactly as the certificate used to —
[feedbackQrPdf.ts](../../badhan-frontend/src/views/FeedbackQr/feedbackQrPdf.ts) imports both, and
`qrcode` is used by [RegistrationQr.vue](../../badhan-frontend/src/views/RegistrationQr.vue) and
[FeedbackQrPanel.vue](../../badhan-frontend/src/views/Feedback/FeedbackQrPanel.vue). Removing them
would have broken three working features. Nothing was removed from `badhan-frontend/package.json`.

### P3.8 The frontend's new role: inline preview plus download

[Certificate.vue](../../badhan-frontend/src/views/Certificate.vue) no longer fetches JSON and hydrates
an `<svg>` — it becomes a thin page that requests the new binary endpoint once, then both embeds the
result inline ([§P3.9](#p39-what-does-the-page-show-before-download)) and offers a **Download PDF**
button from the same fetched `Blob`/object URL, replacing `downloadCertificatePdf` in the now-deleted
`certificatePdf.ts` ([§P3.7](#p37-the-old-frontend-template-is-deleted-not-kept-as-a-fallback)). The
not-found and not-enabled states ([§P3.3](#p33-the-new-endpoint)) become two distinct messages on this page, rather
than the current single `notFoundFlag`.

### P3.9 What does the page show before download?

Today's page renders the full certificate inline in the browser (the same SVG that becomes the PDF),
so a visitor can *see* the certificate before choosing to download it — that inline view is exactly
what a QR-scanning verifier relies on
([docs/manual/07-the-donor-profile.md:125-129](../manual/07-the-donor-profile.md#L125-L129), "the
same certificate opens on their screen... if the name and student ID on the paper match the name and
student ID on the screen, the paper is genuine"). With rendering moved server-side and no template
shipped to the browser, there is no more free inline preview.

**Decision, confirmed with the user: embed the PDF inline.** The page requests the endpoint, gets the
PDF back, and displays it in an `<iframe>`/`<embed>` (via a `Blob` object URL, alongside the
**Download PDF** button from [§P3.8](#p38-the-frontends-new-role-download-button-only)) so a visitor
still sees the certificate on-screen without downloading — the closer match to today's verification
workflow and the manual's existing description of it. [§P5](#phase-p5--documentation)'s docs pass
should describe this inline view, not just the download button.

**As built:** one fetch feeds both, so pressing Download never asks the server a second time and the
saved file is byte-for-byte what is on screen. The frame keeps the page's own 297:210 aspect ratio,
so the whole sheet is visible at once on a phone rather than its top corner. The object URL is
revoked when the page is left or the id changes.

### P3.10 What this phase found that the plan did not predict

Four things that were not visible until the code ran, each fixed here rather than left for a later
phase to trip over:

1. **`Content-Disposition` was invisible to the page.** A browser hides every response header from
   cross-origin JavaScript bar a short safelist, and the frontend is a different origin from the API
   in every environment. The page could read the PDF but not the filename the backend chose for it,
   and silently saved certificates under the donor's database id. Fixed by naming the header in the
   CORS config ([app.ts](../../badhan-backend/src/app.ts)) — a one-line change with a comment, since
   nothing else in the app has ever needed a non-safelisted response header.
2. **tsoa's binary path is not the one [§P3.3](#p33-the-new-endpoint) predicted.** A returned
   `Buffer` is handed to `res.json()`, which turns a PDF into a JSON array of byte values; only a
   real stream is piped. And using `@Res()` for the *success* path — which is what §P3.3 specified —
   races: piping starts on the next tick, so tsoa still sees an unsent response and writes JSON into
   the middle of the PDF. What works is the reverse: return a `Readable` for success, and answer the
   two failures through `@Res()`, whose `res.json()` completes synchronously. Written up in the
   controller, since it is the only route in the codebase that does this.
3. **The guest mirror had to be rebuilt, not just re-typed.** `GET /guest/certificates/{donorId}`
   returned faked JSON; guest mode would have shown a broken page. It now renders through the real
   pipeline with faker data — the certificate page being the one page a stub cannot fake, since the
   document *is* the content.
4. **`VUE_APP_FRONTEND_BASE` in [env.development](../../badhan-backend/env.development) was
   malformed** — `https://http://badhan-buet-test-46eca.web.app/`. Harmless while nothing read it;
   this phase is the first consumer, and it is what the printed QR code encodes, so a certificate
   generated on the development site would have carried an unopenable address. Corrected.

**One piece of coverage was lost, deliberately.** The old Cypress suite rasterised the in-page SVG
and decoded the QR with `jsQR`, which is the only check that would catch a module grid that is
transposed, inverted or off by a row. The code now lives inside a server-rendered PDF, and neither
Cypress nor the backend suite can rasterise one, so `decodeCertificateQr` is deleted (the feedback
sheets keep theirs, since those are still in-page SVG). The rendered code was verified by hand with
`zbarimg` against a 300 DPI raster of a real certificate, decoding to the expected
`<frontend base>/certificate?id=<donorId>`; re-do that check by hand whenever the renderer's QR
geometry changes.

---

## Phase P4 — backfill existing donors

**Depends on:** [P2](#phase-p2--donor-schema-fathername-mothername-and-the-certificate-toggle) ·
**Deployable alone:** yes · **Reversible:** yes — the backfilled value is a knowable constant,
trivially reset
**Status:** Development complete; **production still to run.** No code changed, as this phase
predicted — the existing sweep picked the three new fields up on a re-run.

- Dry-run on development reported exactly what this phase expected: `Donor.fatherName`,
  `Donor.motherName` and `Donor.isCertificateEnabled`, all classified `static-default`, 4578
  documents each, and no gap on `designation` (the earlier run closed it). The one other gap,
  `Logs.details` (2582/39880, `no-default`), is pre-existing and is what the migration's own header
  describes as deliberately not written.
- The real run set `'(Unknown)'`, `'(Unknown)'` and `false` on 4578 donors. A second dry-run
  afterwards reports **0 paths to backfill**, leaving only the pre-existing `Logs.details` review
  line — so the backfill is complete and idempotent, exactly as documented.
- Step 2 (the `donors.designation` collection validator) did not apply: `collMod` is not permitted
  for the application's database user on `Badhan-Test`. This is the known, accepted state the
  migration's own comment describes — a privilege question, not a data one — and it is unchanged by
  this plan.
- **Production has not been run.** The dry-run against production was blocked by the sandbox's
  permission classifier rather than attempted and failed, so nothing is known yet about production's
  gap counts. Run the dry-run first and confirm the same three paths appear, then the real run:

```
docker compose run --rm -e NODE_ENV=production -e DRY_RUN=1 backend \
  npx ts-node --transpile-only scripts/migrations/index.ts 20260809_materialize-required-defaults
docker compose run --rm -e NODE_ENV=production backend \
  npx ts-node --transpile-only scripts/migrations/index.ts 20260809_materialize-required-defaults
```

Every donor created before this schema change has none of the three new fields — the same shape as
the `designation` gap the existing
[20260809_materialize-required-defaults.ts](../../badhan-backend/scripts/migrations/files/20260809_materialize-required-defaults.ts)
migration was written to close generically, for **any** required path with a static schema default.
That migration already sweeps every model's every required path each time it runs; it needs **no
code change** to pick up the three new fields — it just needs to be **re-run** after P2 lands, so it
backfills `'(Unknown)'` onto `fatherName`/`motherName` and `false` onto `isCertificateEnabled` for
every existing donor missing them, the same default values the schema itself now declares.

- Run `docker compose run --rm -e NODE_ENV=development -e DRY_RUN=1 backend npx ts-node --transpile-only scripts/migrations/index.ts 20260809_materialize-required-defaults`
  first, and confirm the dry-run report shows exactly `Donor.fatherName`, `Donor.motherName`, and
  `Donor.isCertificateEnabled` (plus nothing already-fixed like `designation`) among the paths with
  gaps, classified `static-default`.
- Re-run without `DRY_RUN` on development, then production, per the migration's own usage comment.
- **Decision — do not write a second migration file.** The existing one is explicitly documented as
  covering this exact shape ("Fixing one field per migration means writing this file again next year,
  so this one sweeps every required path of every registered model") — writing a dedicated migration
  for these three fields would duplicate work the sweep already does and would invite the same
  one-field-per-migration sprawl its own header comment argues against.
- This migration's step 2 (the `donors.designation` collection validator) is unaffected — `DONOR_VALIDATOR`
  only locks `designation` ([Donor.ts:290-302](../../badhan-backend/src/db/models/Donor.ts#L290-L302)),
  deliberately scoped there, and this plan does not extend it to the three new fields.

---

## Phase P5 — documentation

**Depends on:** [P2](#phase-p2--donor-schema-fathername-mothername-and-the-certificate-toggle),
[P3](#phase-p3--certificate-rendering-moves-to-the-backend) · **Deployable alone:** no, lands with the
feature per [CLAUDE.md](../../CLAUDE.md)'s rule that behaviour and manual changes ship together ·
**Reversible:** yes
**Status:** Implementation complete. Chapter 7's certificate section landed with
[P3](#phase-p3--certificate-rendering-moves-to-the-backend); the rest is done here. Three
corrections to what the table below assumed, plus three chapters it did not list:

- **The CSV columns are not "required, text not blank".** The table below specifies them
  "matching `name`'s row, not `comment`'s". The implementation does the opposite, deliberately and
  correctly: [donorCsv.ts](../../badhan-frontend/src/utils/donorCsv.ts) groups them with the
  free-text fields, so the *column* must exist but the *cell* may be empty and becomes
  `'(Unknown)'`. That is exactly what [§P2.3](#p23-frontend-form-fields) designed — the default
  fires only on the bulk paths that cannot prompt anyone. Documented as it behaves, with a note
  explaining why the form is stricter than a file.
- **There is no "Edit" button on the profile.** The fields are editable in place for whoever has
  permission, and there is a **Save** button; the certificate section was corrected to say so.
- **The demo CSV rows needed nothing.** [P2](#phase-p2--donor-schema-fathername-mothername-and-the-certificate-toggle)
  already added `Demo Father One`/`Demo Mother One` and the rest; verified all 15 columns line up
  against `CANONICAL_HEADERS`.

Also updated, because each carried a statement this plan made false:

| File | Change |
| --- | --- |
| [07-the-donor-profile.md](../manual/07-the-donor-profile.md) | **Person Details** field table gains Father's/Mother's Name and **Enable certificate**; the Settings table's Certificate row notes it only opens once enabled |
| [17-rules-the-app-enforces.md](../manual/17-rules-the-app-enforces.md) | "Names cannot be blank" now names all three, and states the CSV exception |
| [19-glossary.md](../manual/19-glossary.md) | the **Certificate** entry said "nothing but the name and the student ID" — a description of the old artwork, and the student ID is not on the new one at all |
| [20-donor-feedback.md](../manual/20-donor-feedback.md) | a registration submission carries no parents' names, so the prefilled creation form arrives with two blank required boxes — worth saying, since nothing on the card supplies them |

| File | Change |
| --- | --- |
| [docs/manual/11-adding-new-donors.md](../manual/11-adding-new-donors.md) | Part 1 form table (lines 27-39): add **Father's Name** / **Mother's Name** rows, both **Required**. Part 2 CSV column table (lines 78-93): add `fatherName` / `motherName` rows, both **required**, "text, not blank" — matching `name`'s row, not `comment`'s. `isCertificateEnabled` is deliberately **not** added to either table — it is not settable at creation ([§P2.6](#p26-iscertificateenabled)) |
| [docs/manual/07-the-donor-profile.md](../manual/07-the-donor-profile.md) | "The certificate" section (lines 116-148): rewrite for three changes at once — (1) the certificate now shows father's and mother's name alongside name/student ID/QR; (2) it is now built and served by the backend as a ready PDF rather than assembled in the browser, worth a sentence since a reviewer testing "does the certificate render without X installed" needs to know there's no client-side template anymore; (3) **new** — a certificate only exists to the outside world once someone enables it for that donor (**Enable certificate**, wherever [§P2.3](#p23-frontend-form-fields) lands it in the UI); document what a donor's page/QR shows before it is enabled ([§P3.3](#p33-the-new-endpoint)'s distinct "not enabled" message), since today's manual only describes the not-found case |
| Demo CSV sample data | the 3 example rows [donorCsv.ts:318-323](../../badhan-frontend/src/utils/donorCsv.ts#L318-L323) need literal father/mother sample names — the manual's "Download demo CSV" instruction (line 73) is only correct if the downloaded file actually has the new required columns filled in |

---

## Phase P6 — verification

**Depends on:** all of the above
**Status:** Implementation complete, with **one item outstanding that is not this plan's to close**:
the production migration run from [P4](#phase-p4--backfill-existing-donors). Everything else below
was run and is green.

| Check | Result |
| --- | --- |
| `npx tsc --noEmit`, `npm run lint` (backend) | clean |
| `npm run build` (frontend) | clean |
| `docker compose run --rm backend-test` | **222/222** |
| `docker compose run --rm frontend-test` | **120/120**, 37 specs |
| No certificate asset in `badhan-frontend/dist` | confirmed — see below |
| Rendered PDF vs `temp/Badhan New Certificate.pdf` | matches — see below |
| Development backfill leaves zero gaps | confirmed in [P4](#phase-p4--backfill-existing-donors) |
| Production backfill | **not run** — blocked, see [P4](#phase-p4--backfill-existing-donors) |

**Four checks this phase asked for had no test yet; they do now.** The backend suite grew from 218
to 222:

- `POST /donors` refuses a body omitting `fatherName`, and one omitting `motherName`
  ([requiredFields.test.js](../../badhan-backend-test/tests/donors/donorsPostPatchDelete/requiredFields.test.js)).
- A donor created without anyone sending `isCertificateEnabled` reads back `false` — read back
  through the API rather than trusted from the schema, since a default mongoose applies on hydration
  but never writes is precisely the gap [P4](#phase-p4--backfill-existing-donors) exists to close and
  would look identical from the creation response.
- **An ordinary volunteer** can enable a certificate through the general PATCH, and it takes effect
  immediately — the decision in [§P2.6](#p26-iscertificateenabled) that this field carries no
  permission rule of its own.
- The route is rate limited. Exhausting the limiter is not the check (12/min in production, 1200/min
  locally, so it would take 1200 renders); `commonLimiter` announces itself in `X-RateLimit-*` on
  every response, and those headers vanish the moment the middleware does.

**The asset check, precisely.** No `.ttf`/`.otf`, no `certificate-background`, and no reference to
`GreatVibes`/`FuturaBT`/`PlayfairDisplay` anywhere under `badhan-frontend/dist`. The one remaining
`svg2pdf` reference in the bundle belongs to the feedback/registration QR sheets, which still build
their PDFs in the browser and are untouched by this plan
([§P3.7](#p37-the-old-frontend-template-is-deleted-not-kept-as-a-fallback)).

**The visual check.** A certificate fetched from the running backend, rasterised at 110 DPI beside
the supplied PDF at the same scale: border, marbling, watermark, logo, wordmark, both organisation
lines, the heading, every word and rule of the body, the signature block and both Bangla slogans all
land identically. The three differences are the intended ones — real donor values in place of the
designer's samples, a real QR where the placeholder frame was, and no 3 mm bleed
([§P3.1](#p31-why-server-side-not-a-frontend-asset), trim size only).

**One defect this phase found and fixed.** Guest mode's faked parents' names came from
`faker.name.findName()`, which sometimes attaches an honorific — and the certificate prints "Mr."
and "Mrs." itself as part of the sentence, so the demo could read "Mrs. Mr. Antonio Langworth".
Stripped in `GuestController`. Guest-only and cosmetic, but it is on the one page guest mode cannot
fake.

- `docker compose exec backend npx tsc --noEmit` and `docker compose exec frontend npm run build` —
  both clean.
- `docker compose run --rm backend-test` — full suite, including the widened donor schemas from
  [§P2.4](#p24-backend-tests-to-update) and new tests for the PDF-returning certificate endpoint
  (content-type, byte signature `%PDF-`, the not-enabled vs not-found distinction, and the rate
  limiter from [§P3.3](#p33-the-new-endpoint)).
- `docker compose run --rm frontend-test` — Cypress, including
  [certificate-artwork.cy.ts](../../badhan-frontend-test/cypress/e2e/certificates/certificate-artwork.cy.ts)
  and [certificate-pdf.cy.ts](../../badhan-frontend-test/cypress/e2e/certificates/certificate-pdf.cy.ts),
  rewritten for the new architecture: there is no more in-page `<svg>` to assert against
  (`certificateArtwork`/`certificateName`/`certificateQr` `data-cy` hooks in
  [CertificateArtwork.vue](../../badhan-frontend/src/views/Certificate/CertificateArtwork.vue) are gone
  along with the component), so these suites now assert on the downloaded PDF's bytes/metadata and on
  the frontend's not-found/not-enabled UI states instead.
- Manual: confirm no certificate-related asset (background image, font file, layout constants) appears
  anywhere in `badhan-frontend/dist` after a production build — the concrete acceptance test for "the
  static template png and any other certificate related assets should not be made public"; download a
  certificate PDF and confirm it visually matches `temp/Badhan New Certificate.pdf`; confirm a donor
  with `isCertificateEnabled: false` gets the distinct not-enabled message, not a 404, and that
  toggling it via `PATCH /donors/v2` as an ordinary volunteer immediately changes the endpoint's
  behaviour.
- Confirm the migration backfill from [P4](#phase-p4--backfill-existing-donors) leaves zero donors
  missing any of the three fields, and that `POST /donors` now refuses a request omitting
  `fatherName`/`motherName` (`validatePOSTDonors` gains both chains,
  [§P2.1](#p21-what-changes-and-where--mirroring-comment-field-for-field)) while still defaulting
  `isCertificateEnabled` to `false` without it being supplied.
