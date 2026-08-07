# Plan 10 — Donor certificate URL, split into standalone phases

This document restates [plan10.md](plan10.md) as **six self-contained phases**, in English, aimed at
whoever implements it. Each phase repeats the decisions, files, rules and tests it depends on rather
than pointing sideways at another phase, so it can be read, built, reviewed and deployed on its own.
Nothing from `plan10.md` is dropped — §1–§12 and the risk table §14 are all carried through, and
[Appendix B](#appendix-b--traceability) maps each original section to the phase that implements it.

> **Open questions have been decided.** Where `plan10.md` left a choice open, or where the phasing
> exposed one, the answer is recorded here as a **D**-numbered decision in
> [Phase 0](#the-seven-decisions-that-everything-else-follows-from) and applied throughout. The
> decisions taken: vector PDF via `jsPDF` + `svg2pdf.js` (D5); the QR encodes `window.location.href`
> (D6); **no donation count, ever** (D7); malformed ids answer 404 (phase 1.1); the public read
> reuses the existing `commonLimiter` (phase 1.2); guest mode gets a mirrored endpoint (phase 1.3);
> the manual lands inside chapter 07 rather than a new chapter (phase 5.2); the app bar behaviour is
> left alone (phase 2.3); the certificate is **written entirely in English with Latin-only fonts**
> (D8), which withdraws `plan10.md` §8's dual-script requirement; the logo is the existing PNG,
> downscaled (phase 3.1.1); there is **no date and no signature** on the artwork (phase 3.1) and
> **no readable URL** beside the QR (phase 3.2); and the profile button does not ship until the
> scan gate has passed (phase 5).

| Phase | Title | Depends on | Deployable alone |
| --- | --- | --- | --- |
| [1](#phase-1--the-public-backend-endpoint) | Public backend endpoint + rate limit + guest mirror | — | yes (invisible) |
| [2](#phase-2--the-bare-certificate-page) | Bare certificate page, no design, no QR | 1 | yes |
| [3](#phase-3--the-real-design-and-the-qr-code) | SVG design, fonts, QR code | 2 | yes |
| [4](#phase-4--pdf-download-print-and-the-scan-gate) | PDF download + print + **physical scan gate** | 3 | yes |
| [5](#phase-5--the-profile-button-and-the-manual) | Certificate button on the donor profile + manual section | **4** | yes |
| [6](#phase-6--full-suite-build-and-rollout) | Full suite, production build, rollout checklist | all | — |

Phases 1 and 2 are the ones that carry risk of being wrong in a way that is expensive later
(the URL shape). Phases 3 and 4 are craft. Phase 5 is the only thing an existing user sees.

**Phases 1–4 ship dark.** They are individually deployable, but until phase 5 lands there is no
button and no link anywhere in the app, so nobody can reach the certificate page without hand-typing
a URL. That is deliberate: **phase 5 does not ship until phase 4's scan gate has passed.** The first
volunteer to click Certificate gets the finished, printable, verified-on-paper feature — not a
plain-text placeholder that improves over a few releases while the manual describes a moving target.

---

## Phase 0 — Shared context (read once; every phase repeats what it needs)

### What is being built

Every donor already has a MongoDB `_id`. That id, dropped into a fixed frontend URL, **is** the
donor's certificate address:

```
https://badhan-buet.web.app/#/certificate?id=5e901d56effc590017712345
```

Opening it — with no login — renders a printable certificate showing the donor's **name** and
**student ID**, and a **QR code that encodes that same URL**. A volunteer downloads it as an A4
landscape PDF, prints it, and hands it over. Anyone who later scans the QR on the paper lands on
the same page and can compare paper against screen.

### The eight decisions that everything else follows from

**D1 — the donor `_id` is the certificate identifier.** No new field, no new collection, no
generated token, no expiry. A donor's certificate exists the moment the donor exists, and the link
never changes. (§2, §11)

**D2 — the page is public, therefore the payload is minimal.** Because ids are guessable-ish and
not secret, assume anyone can open anyone's certificate. That is intended — a verifier has no
Badhan account. The mitigation is not access control, it is **payload starvation**: the endpoint
returns `name` and `studentId` and nothing else. Never blood group, phone, email, hall, room,
address, comment, call records, donation dates or counts. (§2, §3)

**D3 — the domain is assumed permanent.** `badhan-buet.web.app` is baked into every printed QR
code. If the domain ever changes, every printed certificate's QR dies and cannot be recalled. This
is accepted, knowingly, and is the single largest risk in the plan. (§1, §14)

**D4 — data is fetched live, never baked into the link.** The page reads name and student ID from
the database on every open. Fixing a typo in the app fixes what the scan shows; it does **not** fix
already-printed paper, which is why "check the name before printing" is a documented instruction
rather than a technical guarantee. (§5)

**D5 — QR generation and PDF generation happen in the browser, and the PDF is vector.** No
third-party QR or PDF service: sending a donor's name and student ID to an external host to render a
picture would leak exactly the data D2 works to keep small. The PDF is built with **`jsPDF` +
`svg2pdf.js`**, so text and QR stay vector — a rasterised QR is the classic way a printed code stops
scanning. (§11, §9)

**D6 — the QR encodes `window.location.href`.** The QR and the link are then the same object by
construction and cannot drift apart, which is what §2 asks for. The cost is accepted and must be
managed by discipline: **a PDF downloaded from a dev, preview or staging host encodes that host's
URL and produces permanently dead paper.** Only ever print from production. See
[Appendix A](#appendix-a--risks-carried-forward-14).

**D7 — there is no donation count on the certificate.** "You have donated 5 times" was considered
and dropped outright — not deferred. It is extra disclosure on a fully public page, and it would
widen the endpoint's payload past the two fields D2 depends on. No reserved band, no placeholder,
no hook. Reviving it later is a redesign, and that is the intended cost. (§3)

**D8 — the certificate is written entirely in English, and the fonts are Latin-only.** Every fixed
word on the artwork — the thank-you line, the zone name, any label or heading — is English.
`plan10.md` §3 quotes the thank-you message in Bangla; that reflected the language the plan document
itself was written in, not a decision about the paper.

This reaches the **donor's name** as well. §8 of `plan10.md` asked for a font covering both scripts
so that Bangla names would render; that requirement is **withdrawn**. No Bangla font is bundled, and
**no guard checks the name's script**. The consequence is accepted knowingly: a donor whose name is
stored in Bangla will have it render as empty boxes, including on printed paper. The remedy is a
data one — write the name in English on the donor's profile before printing — and it is the
volunteer's job, not the app's. (§3, §8)

### Where the code goes

| Area | Path |
| --- | --- |
| Backend controller | `badhan-backend/src/tsoaControllers/CertificatesController.ts` (new) |
| Backend rate limiter | [badhan-backend/src/middlewares/rateLimiter.ts](../../badhan-backend/src/middlewares/rateLimiter.ts) — reused, not extended |
| Backend donor reads | [badhan-backend/src/db/interfaces/donorInterface.ts](../../badhan-backend/src/db/interfaces/donorInterface.ts) (`findDonorByQuery`) |
| Guest mirror | [badhan-backend/src/tsoaControllers/GuestController.ts](../../badhan-backend/src/tsoaControllers/GuestController.ts) |
| Backend tests | `badhan-backend-test/tests/certificates/` (new) |
| Frontend route | [badhan-frontend/src/router/index.ts](../../badhan-frontend/src/router/index.ts) |
| Frontend page | `badhan-frontend/src/views/Certificate.vue` (new) + `views/Certificate/` |
| Frontend API call | [badhan-frontend/src/api/index.ts](../../badhan-frontend/src/api/index.ts) |
| Profile button | [badhan-frontend/src/components/PersonDetails.vue](../../badhan-frontend/src/components/PersonDetails.vue) |
| E2E tests | `badhan-frontend-test/cypress/e2e/certificates/` (new) |
| Manual | [docs/manual/07-the-donor-profile.md](../manual/07-the-donor-profile.md) — a new section, not a new chapter |

### Running commands

Nothing runs on the host. Everything runs in the container, per
[CLAUDE.md](../../CLAUDE.md):

```
docker compose up -d
docker compose exec backend npx tsc --noEmit
docker compose exec backend npm run tsoa:routes      # after any controller change
docker compose exec frontend npm run build
docker compose run --rm backend-test <cmd>
docker compose run --rm frontend-test <cmd>
```

---

## Phase 1 — The public backend endpoint

**Goal:** `GET /certificates/{donorId}` answers, without a token, with the donor's name and student
ID and nothing else. Nothing is visible in the UI at the end of this phase; the foundation is
standing and testable with `curl`.

### 1.1 The route

New file `badhan-backend/src/tsoaControllers/CertificatesController.ts`, following the shape of
[PublicContactsController.ts](../../badhan-backend/src/tsoaControllers/PublicContactsController.ts),
whose `GET` is already an unauthenticated route (`@Middlewares([rateLimiter.commonLimiter])` and no
`authenticator.handleAuthentication`) — that is the precedent to copy.

```
@Route('certificates')
@Tags('Certificates')
export class CertificatesController extends Controller {
  @Get('{donorId}')
  @Middlewares([rateLimiter.commonLimiter])
  public async getCertificate(@Path() donorId: string): Promise<{
    status: string, statusCode: number, message: string,
    certificate?: { name: string, studentId: string }
  }>
}
```

Rules the handler must hold to:

- **No authentication middleware at all.** Not optional-auth, not "auth if header present" — none.
  A verifier's browser sends no `x-auth` header and must still get 200.
- **The response body contains exactly `name` and `studentId`** under `certificate`. Build the
  object field by field. Do **not** spread the Mongoose document, do not `toObject()` it, do not
  return `donor` — that is how phone numbers and blood groups escape.
- **A malformed id is a 404, not a 400.** `mongoose.Types.ObjectId.isValid(donorId)` false → the
  same "not found" response as a valid-but-absent id. One indistinguishable answer, one message:
  `Certificate not found`. (§7)
- **A deleted donor is a 404** with that same message; the frontend renders "This certificate was
  not found." (§7)
- **An archived donor is a 200, exactly like any other donor.** Do not filter on `archiveFlag`.
  A graduate is precisely who needs the certificate most. (§7)
- **No log entry.** [logInterface.addLog](../../badhan-backend/src/db/interfaces/logInterface.ts)
  takes a user id, and there is no user here. Public reads are not logged.

Read the donor with the existing
`donorInterface.findDonorByQuery({ _id: donorId })`, or `findDonorById` after casting; both already
return `{data?, message, status}`.

### 1.2 Rate limiting

**No new limiter.** Reuse the existing
[`rateLimiter.commonLimiter`](../../badhan-backend/src/middlewares/rateLimiter.ts) — 12 requests per
minute per IP — which is already what the other unauthenticated public read
(`GET /publicContacts`) uses. Nothing to add, nothing to export, one fewer number to justify, and
the two public GETs stay consistent with each other.

12/minute/IP is ample for a human verifier (one page open plus a refresh or two) and hostile to a
script walking the id space. `commonLimiter` already carries the `rateLimiterEnabled` multiplier, so
it stays loose in dev automatically.

Two honest limitations to record rather than pretend away (§14):

- `express-rate-limit` is **in-memory and per instance**. Behind a multi-instance deployment the
  effective ceiling is `20 × instances`. Accepted: the leak ceiling is name + student ID, which is
  broadly public inside BUET anyway.
- MongoDB `_id`s are not sequential, so enumeration is not a walk — it is a search of a 96-bit
  space. The limiter is defence in depth, not the primary control. The primary control is D2.

### 1.3 Guest mode mirror

[GuestController.ts](../../badhan-backend/src/tsoaControllers/GuestController.ts) mirrors every real
route with faker data so the guest login never hits real records. Add the matching one:

```
@Get('certificates/{donorId}')
@Hidden()
public async getCertificate(@Path() donorId: string)   // returns faker.getName() / faker.getStudentId()
```

Without this, a guest-mode volunteer who reaches the certificate page gets a confusing 404, because
guest ids are fake and the real endpoint will not find them.

### 1.4 Regenerate and typecheck

```
docker compose exec backend npm run tsoa:routes
docker compose exec backend npx tsc --noEmit
```

`src/tsoaRoutes/` is **gitignored** ([badhan-backend/.gitignore:20](../../badhan-backend/.gitignore)),
so the regenerated routes are not committed and will not appear in `git status`. Regenerating is
still required for the running container to serve the new route — it is a build step, not a
deliverable.

The test image has **no volume mount** (see [docker-compose.yml](../../docker-compose.yml)), so new
or edited test files are invisible until the image is rebuilt:

```
docker compose build backend-test
```

### 1.5 Tests (`badhan-backend-test/tests/certificates/`)

Follow the existing suites under `badhan-backend-test/tests/` for setup/teardown helpers.

1. **No token → 200.** Request with no `x-auth` header at all; expect 200 and a `certificate`
   object.
2. **Payload is exactly two fields.** Assert `Object.keys(body.certificate).sort()` deep-equals
   `['name','studentId']`. This is the regression test that matters most — it fails loudly the day
   someone "helpfully" adds blood group.
3. **Unknown but well-formed id → 404** with the not-found message.
4. **Malformed id (`"abc"`, `"123"`, empty) → 404**, same message, never a 500 and never a stack
   trace.
5. **Archived donor → 200** with correct name and student ID.
6. ~~**Rate limit → 429**~~ — **not written, deliberately.** `RATE_LIMITER_ENABLE` is off in the test
   environment, which multiplies every limiter by 100, so tripping it would take 1200 sequential
   requests, and the harness offers no per-test way to flip the flag. The existing
   [archiveFlag.test.js](../../badhan-backend-test/tests/donors/patchDonorsV2/archiveFlag.test.js)
   makes 60 calls specifically to prove the limiter is *not* reached. Since `commonLimiter` is
   reused rather than newly written, and is already exercised by `GET /publicContacts`, there is
   nothing untested here beyond that it is attached — which the controller source shows directly.

**Phase 1 is done when** all six pass and `curl` against the container returns the two-field body
with no credentials.

---

## Phase 2 — The bare certificate page

**Goal:** `/#/certificate?id=<donorId>` shows the donor's name and
student ID as plain text. No design, no QR, no PDF. This phase exists to prove the anonymous path
works end to end before any effort goes into looks.

### 2.1 The route

Add to [router/index.ts](../../badhan-frontend/src/router/index.ts):

```
{
  name: 'Certificate',
  path: '/certificate',
  component: () => import('../views/Certificate.vue'),
  meta: {
    requiresAuth: false,
    title: 'Certificate',
    designation: 0,
    reRouteIfAuthorized: false
  }
}
```

Notes that matter:

- **Query parameter, not path parameter** — `?id=...`, matching §2 verbatim. The URL is printed on
  paper; it is frozen the moment §2 was written.
- **The router is in hash mode** (`new VueRouter({ routes })` with no `mode`), so everything after
  `#` never reaches Firebase Hosting. No hosting rewrite is needed, and the URL in §2 with `/#/` is
  correct as written.
- `requiresAuth: false` + `reRouteIfAuthorized: false` is the same combination
  [PublicContacts](../../badhan-frontend/src/views/PublicContacts.vue) uses, so the existing
  `beforeEach` guard lets it through for both signed-out and signed-in visitors. (The guard calls
  `next()` and then falls through to its own `if`/`else` for public routes — a pre-existing quirk
  that produces a duplicate-`next` warning. Do not fix it inside this change; just be aware the
  route works the same way `/contacts`, `/about` and `/credits` already do.)
- **Placement:** anywhere before the `/*` NotFound catch-all.

### 2.2 The API call

The page must fetch **without** the app's usual assumptions. [api/index.ts](../../badhan-frontend/src/api/index.ts)'s
`badhanAxios` attaches `x-auth` from the store and, in guest mode, has `/guest` glued onto its base
URL. For an anonymous verifier neither applies, and `store.getters.getToken` is empty.

Use `badhanAxios` so guest mode and the interceptors keep working for signed-in volunteers — the
`x-auth` header is simply absent for anonymous visitors, which the endpoint ignores. Add:

```
getCertificate: async (donorId) => badhanAxios.get(`/certificates/${donorId}`)
```

The guest mirror from phase 1.3 is what makes this safe under `/guest`.

Verify while implementing that the store/interceptor path does not force a redirect to `/` when
there is no token — the guard already exempts `requiresAuth: false`, but the axios error
interceptor is worth reading before assuming.

### 2.3 The page

`badhan-frontend/src/views/Certificate.vue`, with four states:

| State | Shown |
| --- | --- |
| Loading | a spinner, no layout jump |
| Loaded | name and student ID, plain text |
| Not found (404) | "This certificate was not found." — polite, no technical detail, no id echoed back |
| Missing/absent `id` query | the same not-found message |
| Network error | "Could not load this certificate. Please check your connection and try again." + retry |

Also in this phase:

- Set `document.title` to something meaningful for the browser tab.
- **The app bar does not render for anonymous visitors** — [App.vue](../../badhan-frontend/src/App.vue)
  gates `<app-bar>` on `$store.getters['getToken']`, so a verifier sees a bare page for free. A
  signed-in volunteer *will* see the app bar; that is acceptable, because the PDF (phase 4) is built
  from the certificate artwork alone and never from a screenshot of the page.

### 2.4 Tests

- **Cypress** (`badhan-frontend-test/cypress/e2e/certificates/`): with no session, visit the URL for
  a seeded donor and assert the name and student ID are on screen; visit a garbage id and assert the
  not-found message; visit with no `id` at all and assert the same.
- The signed-out visit is the whole point of this phase — make sure the test does not silently
  inherit a login from a support command.

**Phase 2 is done when** a private/incognito window opens the URL and reads back the right name.

---

## Phase 3 — The real design and the QR code

**Goal:** the page renders the actual certificate: a fixed SVG with the donor's name, student ID and
a scannable QR code dropped into three reserved slots. (§3, §8)

### 3.1 The artwork

A single SVG component, `badhan-frontend/src/views/Certificate/CertificateArtwork.vue`, with a fixed
`viewBox` in A4-landscape proportion (297 × 210 units = millimetres, which makes phase 4's PDF
mapping 1:1 and removes a whole class of scaling bug). Everything is static — border, Badhan logo,
"Badhan, BUET Zone", the thank-you line — except three slots:

1. **Name** — large, centred.
2. **Student ID** — below the name.
3. **QR code** — encoding the page's own absolute URL.

**The certificate is written entirely in English** (D8). §3 of `plan10.md` gives the thank-you line
in Bangla; that was the plan document's own language, not a requirement on the artwork. Every fixed
word on the certificate — the thank-you message, the "Badhan, BUET Zone" line, any label next to the
student ID, any heading — is English. An English rendering of §3's message, e.g.:

*"With sincere gratitude for your contribution, from Badhan, BUET Zone."*

Agree the exact wording with whoever owns the copy before the artwork is finalised; it is printed on
paper and is not cheap to change afterwards.

Per **D7** there is **no donation count and no space reserved for one** — design the layout as if
the question had never been raised. Name, student ID, thank-you line, logo, QR. Nothing else.

**And nothing else means nothing else — no date, no signature.** `plan10.md` §3's list is the
complete contents, and it stays that way:

- **No printed-on date.** The page is re-printable, so a date would describe *this copy*, not the
  certificate. Two prints of the same certificate would carry different dates, and a verifier
  comparing paper to screen could read that difference as forgery.
- **No signature line, seal or issuing officer.** The QR is the authenticity mechanism (§4). A
  signature line alongside it would imply a second, weaker one that nobody checks.

### 3.1.1 The logo

The only logo in the repo is
[badhanlogo.png](../../badhan-frontend/src/assets/images/badhanlogo.png) — 230 KB raster, no vector
version exists. Use it rather than blocking the artwork on new design work:

- **Downscale to roughly its printed size at 300 DPI.** As built: `sips -Z 300`, giving a 300×298
  PNG of 61 KB for a logo that prints 25 mm wide. (240 px was 43 KB and 360 px was 84 KB; no PNG
  optimiser — `pngquant`, `optipng`, ImageMagick — was available, and `cwebp` is no use because
  jsPDF cannot embed WebP.)
- Embed as a `data:` URI in the SVG, so it travels into the PDF with everything else. It lives in
  [certificateLogo.ts](../../badhan-frontend/src/views/Certificate/certificateLogo.ts), with the
  regeneration command in its header comment.
- Keep the encoded asset out of the sign-in bundle, behind the certificate route's dynamic import.
  Verified after building: the logo and artwork land in the lazy route chunk, not `app.js`.
- **Raster is acceptable here and only here.** A slightly soft logo is invisible to a reader; a
  slightly soft QR stops scanning. The QR stays vector (D5) regardless of what the logo does.

If a proper SVG logo ever appears, swapping it in is a one-line change to the artwork.

Scale the artwork with `width: 100%; height: auto` so it fits a phone screen whole, with no
horizontal scroll and no pinch-to-read. A verifier on a phone must see the entire certificate at
once. (§8)

### 3.2 The QR code

- Add the `qrcode` package to `badhan-frontend/package.json`
  (`docker compose exec frontend npm install qrcode`), and **import it dynamically** inside the
  certificate view so it does not land in the sign-in bundle.
- Encode **`window.location.href`** — the page's own absolute URL — not a hand-assembled string
  (D6). The QR and the link are then the same object by construction and cannot drift, which is
  exactly what §2 asks for, and it means the QR is testable end to end on whatever host you are
  developing against.
- **The consequence, stated plainly:** on a dev, preview or staging host, `href` is *that* host, so
  a PDF downloaded there encodes a URL that will be dead the moment the environment is torn down —
  and the paper cannot be recalled. This is a process control, not a code control:
  - **Print only from production** (`badhan-buet.web.app`). Say so in the manual (phase 5.2) and in
    the risk table.
  - Anyone demoing the download on staging must treat the output as a throwaway.
- Error correction level **M** (or **Q** if the design puts the QR near a busy border), quiet zone
  of at least 4 modules, pure black on pure white.
- **Minimum 25 mm printed** (§8), i.e. ≥ 25 units in the 297-unit viewBox. Nothing — no watermark,
  no logo, no border flourish, no background tint — may overlap it.
- **The URL is not printed as readable text.** No full URL under the QR, no "verify at
  badhan-buet.web.app" line, nothing. The address is ~60 characters ending in 24 hex digits; a
  reader will not retype it correctly, so printing it buys nothing and costs layout. A short
  caption such as *"Scan to verify"* is fine — that is an instruction, not an address.

### 3.3 Fonts

**Latin-only, per D8.** No Bangla font is bundled and no script check is performed. `plan10.md` §8's
dual-script requirement is withdrawn.

**As built: `Helvetica, Arial, sans-serif`, with no font file embedded at all.** This is a
deliberate simplification of what this section originally called for, and it is the better trade:

- Helvetica is one of jsPDF's **standard 14** fonts, so phase 4 gets a matching face for free — no
  `addFileToVFS`, no base64 TTF, and no risk of the PDF silently falling back to a different face.
- Nothing is downloaded, licensed, subset or shipped, so the route chunk stays small.
- D8 already removed the only reason a custom font was needed: with English-only copy and
  Latin-only names, there is no glyph here a standard face cannot draw.

The cost is that the certificate is set in a common face rather than a distinctive one. If a
distinctive face is ever wanted the upgrade is contained: add the TTF, embed it via `@font-face`
with a `data:` URI (not a system reference — it has to travel into the PDF), register the same file
with jsPDF, and change `FONT_FAMILY` in
[certificateLayout.ts](../../badhan-frontend/src/views/Certificate/certificateLayout.ts).

**Known and accepted:** a name stored in Bangla renders as empty boxes, on screen and on paper.
There is no warning and no fallback (D8). The fix is to write the name in English on the profile
before printing — documented in the manual (phase 5.2), not enforced in code.

### 3.4 Long names

Bangladeshi names run long. Required behaviour (§8):

- Measure the rendered name; step the font size down through defined stops until it fits the
  reserved width.
- Below the smallest stop, wrap to a **second line** (and re-centre the block vertically so the
  layout does not lurch).
- Never overflow the border. Never truncate with an ellipsis — a clipped name defeats verification,
  which is a name-to-name comparison.

### 3.5 Tests

Cypress, against seeded donors:

- A short name → one line, and the artwork's `viewBox` is `0 0 297 210`.
- A very long name (40+ characters) → shrinks, wraps to two lines, every character survives, and no
  line exceeds the reserved width.
- The QR exists, its `getBBox()` is at least 25 mm square, and it encodes **this** certificate's
  address — asserted against a `data-qr-url` attribute the artwork renders alongside the path.
  Comparing module geometry between two donors was tried first and is the wrong test: it can only
  say two codes differ, never that either points anywhere useful.
- Navigating from one certificate to another (a query-only change) re-renders both the name and the
  QR. Vue reuses the component instance across a query change, so without an explicit watcher the
  page keeps the previous donor — and a certificate showing one person's name over another
  person's QR is exactly the unverifiable paper this feature exists to prevent.

Two cases from the original list are **not** tested, for reasons found while building:

- **No missing-student-ID case.** `studentId` is required and pinned to exactly 7 digits by both
  [validateBody.ts](../../badhan-backend/src/validations/validateRequest/validateBody.ts) and the
  Donor schema, so a donor without one cannot be created. The artwork keeps a `v-if` guard anyway;
  it is defensive, not reachable.
- **No Bangla case** — per D8 such a name renders as boxes by design.

**Visual checks are done by hand, not by a committed spec.** A screenshot spec was written and then
removed: in headless Electron the *second* `cy.screenshot()` in a spec file comes out blank, whatever
the test boundaries, which produces artifacts that look exactly like a rendering bug. To look at the
artwork, write a throwaway spec with **one** capture, wait for `[data-cy="certificateArtwork"]`, then
`cy.wait(1500)` — the page fades in over 0.3s, and capturing on `exist` records it at opacity 0.

**Phase 3 is done when** the page looks like a certificate and a phone camera pointed *at the
screen* opens the same URL.

---

## Phase 4 — PDF download, print, and the scan gate

**Goal:** a **Download PDF** button produces an A4 landscape PDF containing only the certificate,
and a printed copy of that PDF scans successfully from paper. (§9)

### 4.1 The button

Below the certificate: **Download PDF**. It is chrome, not content — it must not appear in the PDF
or on paper (§3).

### 4.2 Building the PDF

**Decided (D5): `jsPDF` + `svg2pdf.js`.** Text and QR stay vector, so the code is crisp at any print
DPI — which is the whole ballgame, since a rasterised QR is the classic way printed codes stop
scanning. Rejected: `html2canvas` + `jsPDF` (rasterises the QR); the browser print dialog (good
fidelity, but it cannot set a filename and §9 requires `Badhan-Certificate-1605011.pdf`).

What this costs, and must be handled rather than discovered late:

- **No font registration was needed.** Phase 3.3 settled on `Helvetica, Arial, sans-serif`, and
  Helvetica is one of jsPDF's standard 14, so `svg2pdf.js` resolves it without `addFileToVFS` or
  `addFont`. Confirmed by inspecting the output: the PDF carries the standard font list and embeds
  no font file. Had a custom face been chosen, this step would have been mandatory — svg2pdf.js does
  not inherit the browser's font stack, and the PDF would have silently fallen back.
- **Versions:** `jspdf@4` with `svg2pdf.js@2.7`, whose peer range is `^4 || ^3 || ^2`.
- **One source of truth for layout.** Put positions and sizes (in millimetres) in a shared constants
  module consumed by both the SVG component and the PDF builder. Two hand-maintained layouts drift,
  and they drift onto paper.
- The 297 × 210 millimetre `viewBox` from phase 3.1 makes the SVG→PDF mapping 1:1; keep it that way.

Requirements:

- Page: **A4, landscape, 297 × 210 mm**, no margins beyond the artwork's own.
- Contents: the certificate only — no Download button, no browser header/footer, no page numbers.
- Filename: `Badhan-Certificate-<studentId>.pdf`; sanitise the student ID for filesystem-safe
  characters, and fall back to the donor id when the student ID is empty.
- `jspdf`/`svg2pdf.js` are **dynamically imported** on button click, not at page load. A verifier who
  only scans should never download a PDF library. Confirmed after building: they form their own
  `certificate-pdf` chunk (494 KiB, 156 KiB gzipped) that is fetched only when the button is
  pressed — not in `app.js`, and not even in the certificate route's own chunk.

### 4.3 The scan gate — not optional

This is the acceptance test for the phase, and it is physical (§9). **Run it against production, or
against a build served from the production origin** — per D6 the QR carries whatever host produced
it, so a staging print tests nothing that will be true of real paper:

1. Download the PDF on a desktop browser.
2. **Print it on real paper.**
3. Scan the QR **from the paper**, with a real phone camera, at ordinary reading distance and
   ordinary room light.
4. Confirm the certificate opens and the name on screen matches the name on paper.

Repeat the download on **Android and iOS** browsers — mobile download behaviour differs enough to
be its own bug source (§9). If the paper scan fails, the phase is not finished, regardless of how
good it looks on a monitor.

Record what was tested: printer, paper size, phone models, OS versions.

> **STATUS: NOT DONE. Phase 4 is therefore not complete, and phase 5 must not ship.**
> Every step above needs a printer, real paper and a phone camera, none of which are available to
> the automated work. The code is written and everything checkable in software checks out (4.4), but
> the one acceptance test this section calls mandatory has not been run by anyone. **A human has to
> do steps 1–4, plus the Android and iOS downloads, before the Certificate button reaches
> volunteers.** Do not read the passing test suite as a substitute: it says nothing about ink,
> contrast, printer resolution, or how big the code is in someone's hand.

### 4.4 Tests

Automated, all passing:

- Clicking the button downloads a file named `Badhan-Certificate-<studentId>.pdf`, which begins with
  a `%PDF-` header and is not an empty shell.
- The download button is **not** inside the artwork SVG, so it cannot be converted into the PDF.
- **The QR is rasterised and decoded with `jsQR`, and the decoded string is asserted to be this
  certificate's own URL.** This is the only check that exercises the hand-built module geometry:
  the element's existence, its 25 mm bounding box and its `data-qr-url` attribute would all still
  pass if the modules were transposed, inverted or off by a row — and a code that is subtly wrong
  prints, gets handed to a donor, and never scans. `jsqr` is a devDependency of the test project
  only; nothing ships with it.

Verified by inspecting a generated PDF directly:

- `MediaBox` is `0 0 841.89 595.28` pt — exactly 297 × 210 mm, A4 landscape, one page.
- The only raster content is the logo (a 300 × 298 RGB image plus its alpha mask). Text and QR are
  vector, which is the point of the whole approach.
- No embedded font file; the standard-14 Helvetica is used.
- Rendered to an image and looked at: frame, logo, zone name, heading, name, student ID, message,
  QR and caption all present; no download button.

**Not covered by any of the above** — and all of it still required (4.3): printing on paper,
scanning from paper, and downloading on Android and iOS.

---

## Phase 5 — The profile button and the manual

**Goal:** the one thing existing users actually see. (§6, §10)

**Gate: do not ship this phase until phase 4's physical scan gate has passed.** Phases 1–4 are
invisible without it, so there is no pressure to release early and no benefit to doing so.

### 5.1 The button

In [PersonDetails.vue](../../badhan-frontend/src/components/PersonDetails.vue), in the settings
section next to the existing **Password Recovery Link** button (around
[PersonDetails.vue:215](../../badhan-frontend/src/components/PersonDetails.vue#L215)), add:

```
<v-btn key="certificate" small class="ma-1" color="primary" rounded
       id="certificateButtonId" data-cy="certificateButton"
       @click="openCertificate">
  <v-icon left>mdi-certificate</v-icon>
  Certificate
</v-btn>
```

- **Opens in a new tab** (§10): resolve the route to an href and `window.open(..., '_blank')`, so the
  volunteer does not lose the profile they were working in.
- **Visible to anyone who can open the donor profile** (§6), which required removing a gate.
  The Settings card the button lives in used to carry
  `v-if="$store.getters['getDesignation'] >= designation || $isMe(id)"`, which hid the whole card —
  and so the Certificate button — from a volunteer looking at a hall admin or super admin.

  **That card-level gate is now gone.** It was redundant: every action inside carries its own,
  stricter guard, and for a viewer junior to the donor they are looking at, all of them fail
  independently.

  | Action in the card | Its own guard | Viewer junior to target |
  | --- | --- | --- |
  | Promote To Volunteer | target must be `DONOR` | hidden |
  | Demote To Donor | target must be `VOLUNTEER` | hidden |
  | Delete this person | target must be `<= VOLUNTEER` | hidden |
  | Password Recovery Link | viewer is super admin, or same hall and senior | hidden |
  | Recovery link textbox | only after that button is clicked | hidden |
  | Promote to Hall Admin / Super Admin, Demote to Volunteer | viewer must be super admin | hidden |
  | New / Confirm Password | `$isMe(id)` | hidden |
  | **Certificate** | none | **shown** |

  So removing the gate exposes exactly one control, and no donor data at all — the card holds
  actions, not facts, and every field about the donor already renders in cards with no such gate.
  These were always UI guards only; the backend enforces its own permissions on each action.

  A Cypress test pins this: a volunteer opening a same-hall hall admin's profile sees Certificate
  and none of the guarded controls. It is what fails if someone later adds an ungated control to
  that card.
- Give it a stable `id` and `data-cy`, matching the conventions already used throughout that file.
- Nothing else in the app changes: no sidebar entry, no menu item, no existing page moves (§10).

### 5.2 The manual

Per [CLAUDE.md](../../CLAUDE.md), behaviour changes ship with documentation in the same change.

**No new chapter.** The certificate is documented as a new section inside
[07-the-donor-profile.md](../manual/07-the-donor-profile.md), where the profile's other buttons —
including Password Recovery Link, the button it sits next to — are already described. A reader
looking for what a button does finds it where the button lives, and the manual stays at 19 chapters.

The section, written for non-technical readers in the voice of the existing chapters, covers:

- What a certificate is and what it is for.
- How to open it: donor profile → **Certificate** → new tab.
- How to download and print the PDF.
- **Check the name and student ID before printing** — once printed, the paper is a snapshot; if the
  name is corrected in the app afterwards, paper and screen no longer match and verification fails
  (§5, §14).
- **The certificate is in English, and so must the name be.** If the donor's name is written in
  Bangla on their profile, it will come out as empty boxes on the certificate — on screen and on
  paper. Write the name in English on the profile first, then open the certificate (D8). Say this
  plainly; the app does not warn about it.
- How verification works for the person holding the paper: scan the QR, compare name and student ID.
- That the page needs **no login**, and that anyone with the link can open it — which is why the
  certificate deliberately shows only name and student ID (§2, §3).
- That **archived donors keep working**, and that **deleting a donor permanently breaks** every
  certificate already printed for them (§7).

Then wire it in:

- Add "certificate" and "QR code" to [19-glossary.md](../manual/19-glossary.md).
- Update chapter 07's own summary/contents line in the
  [manual README index](../manual/README.md) if it enumerates what the chapter covers.
- Mention the certificate consequence wherever donor deletion is described
  ([16-super-admin-tools.md](../manual/16-super-admin-tools.md) or
  [17-rules-the-app-enforces.md](../manual/17-rules-the-app-enforces.md), whichever covers it).

### 5.3 Tests

Cypress: signed in, open a donor profile, open Settings, click **Certificate**, and assert the
address it opens. `window.open` is **stubbed rather than followed** — Cypress cannot drive a second
tab, and what matters is the address handed to it: the frozen `?id=` shape carrying that donor's own
id, opened with `_blank`.

---

## Phase 6 — Full suite, build, and rollout

1. `docker compose exec backend npx tsc --noEmit`
2. `docker compose exec backend npm run tsoa:routes` — a build step; `src/tsoaRoutes/` is gitignored
   and produces no diff.
3. `docker compose run --rm backend-test <suite cmd>` — full backend suite, not just the new tests.
4. `docker compose exec frontend npm run build` — and **check the bundle size**: `qrcode`, `jspdf`,
   `svg2pdf.js`, the embedded font and the base64 logo must all sit behind dynamic imports on the
   certificate route.
   If the sign-in bundle grew noticeably, an import escaped.
5. `docker compose run --rm frontend-test <suite cmd>` — full Cypress suite.
6. Re-run the **physical scan gate** (phase 4.3) against a build produced from the final merged
   code, not from a dev server.

### Results

Steps 1–5, all green:

| Check | Result |
| --- | --- |
| `tsc --noEmit` | clean |
| `tsoa:routes` | regenerates without error; no diff (gitignored) |
| Backend suite | **158 / 158** |
| Frontend build | clean; `eslint` clean |
| Cypress suite | **64 / 64** |

Bundle check, done by grepping the built chunks rather than eyeballing sizes:

- `app.js` is **124.8 KiB**, essentially unchanged from before this work (124.2 KiB).
- `app.js` and `chunk-vendors.js` contain **no** occurrence of the artwork, the base64 logo or
  jsPDF.
- The certificate route chunk (89 KiB, mostly the logo) loads only when the page is opened;
  `certificate-qr` (24 KiB) with it; `certificate-pdf` (494 KiB — jsPDF + svg2pdf.js) only when the
  Download button is pressed.

**Step 6 has NOT been run** — see phase 4.3. It needs a printer and a phone.

### Rollout notes

- **`index.html` must stay uncached.** Printed QR codes point at `badhan-buet.web.app/#/certificate`
  forever; a stale cached `index.html` breaks the route for the people it was printed for.
  **Verified:** [firebase.badhan-buet.json](../../badhan-frontend/firebase.badhan-buet.json) sets
  `no-cache` on `/**` and `immutable` on `/js/**`, `/css/**`, `/img/**`. Firebase Hosting applies the
  *last* matching rule, so hashed assets get the long cache and `index.html` — matched only by the
  first rule — stays uncached. Correct as it stands; do not reorder those blocks.
- **The production frontend base is `https://badhan-buet.web.app`**
  ([.env.production](../../badhan-frontend/.env.production)), matching D3. This value matters twice
  over: it is the address the profile button opens, and therefore the address the page encodes into
  the QR (D6). The development environment's value carries a trailing slash where production's does
  not, so `openCertificate` strips trailing slashes before appending the route.
- **Do not change the domain.** D3. Anyone proposing a domain move afterwards is proposing to
  invalidate every certificate already in a donor's hands.
- **Deleting donors now has a new consequence** (§7): it permanently breaks their printed
  certificate. This belongs in the deletion conversation from now on, and is written into the manual
  in phase 5.
- **`./deploy` runs both suites and refuses to deploy if either fails**, so the automated gate is
  already enforced by the deploy path. The print-and-scan gate is not, and cannot be — it is the
  one thing standing between this code and volunteers, and it lives entirely with a human.

### The one remaining gate, in full

Everything above is done. Before the Certificate button reaches volunteers, somebody has to:

1. Deploy to production (or serve a production build from the production origin — per D6 the QR
   encodes whatever host produced it, so a staging print proves nothing).
2. Open a donor's certificate and press **Download PDF** on a desktop browser.
3. **Print it.**
4. Scan the QR **from the paper** with a real phone camera, at ordinary reading distance in
   ordinary light.
5. Confirm the certificate opens and the name and student ID on screen match the paper.
6. Repeat the download on **Android and iOS** — mobile download behaviour differs.

Record the printer, paper size, phone models and OS versions. If the paper scan fails, the QR
geometry is not the suspect — it is decoded by an automated test — so look at printed size,
contrast and paper quality first.

---

## Appendix A — Risks carried forward (§14)

| Risk | Standing decision |
| --- | --- |
| Domain change | Accepted knowingly. Every printed QR dies. See D3, and the rollout note above. |
| Anyone can open any certificate | Intentional. Mitigated by payload starvation (D2), enforced by the two-field test in phase 1.5. |
| Id enumeration to scrape the database | `commonLimiter`, 12/min/IP (phase 1.2), plus the fact that the whole payload is name + student ID. In-memory, per-instance limiting is a known weakness. |
| **Printing from a non-production host** | D6: the QR carries `window.location.href`, so a PDF downloaded on staging or a dev server encodes a URL that dies with that environment. Process control only — print from `badhan-buet.web.app`, and run the scan gate (phase 4.3) against production. |
| Name corrected after printing | Paper and screen stop matching; verification fails. Mitigated only by the "check before printing" instruction in the manual (phase 5.2). |
| Wrong name in the database | Certificate is wrong too. The certificate is a mirror, not a source of truth. |
| **Bangla name renders as empty boxes** | Accepted (D8). Latin-only fonts, no script check, no warning. Fails silently onto permanent paper. Mitigated only by the manual's instruction to write the name in English before printing (phase 5.2). Revisit if it turns out to affect more donors than expected. |
| Donor deleted | Certificate 404s permanently. Documented in the manual; nothing technical to do. |
| Donation count | **Dropped, not deferred** (D7). No band reserved, no placeholder. Reviving it would be a redesign plus a widening of the public payload — that friction is deliberate. |

## Appendix B — Traceability

| plan10.md section | Phase |
| --- | --- |
| §1 Domain assumption | 0 (D3), 6 rollout notes |
| §2 URL shape | 0 (D1, D2, D6), 1, 2, 3.2 |
| §3 Certificate contents / exclusions / donation count / thank-you wording | 0 (D2, D7, D8), 1.1, 3.1 |
| §4 How verification works | 3.2, 4.3, 5.2 |
| §5 Live data, not baked in | 0 (D4), 1.1, 5.2 |
| §6 Who can generate one | 5.1 |
| §7 Archived and deleted donors | 1.1, 2.3, 5.2 |
| §8 Look, QR size, long names, mobile (**dual-script requirement withdrawn — D8**) | 3.1–3.4, 0 (D8) |
| §9 PDF download and printing | 4.1–4.4 |
| §10 What users see in the app | 5.1 |
| §11 What has to be built | 1 (item 1), 2 (item 2), 3 (items 3–4), 4 (item 4), 5 (item 5) |
| §12 Order of work | This document's phase order (1:1) |
| §14 Risks | Appendix A |
