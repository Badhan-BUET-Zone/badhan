# Plan 17 — the signature block appears only for a signed-in viewer, from a second baked background

Plan 16 shipped one background PNG and one rendered certificate: whoever opens
`/certificate?id=…` gets the same document whether they are a Badhan volunteer who pressed the
button on a donor's profile or a stranger who scanned a printed QR code in an office.

Those two readers want different documents. The volunteer is producing a certificate that will be
printed and physically signed — the three ruled signature lines at the foot of the page are the
whole point. The stranger is verifying a certificate that is already in their hand, already signed.
Showing them a fresh copy with three empty signature lines is worse than useless: it puts an
unsigned-looking version of the same document on screen next to the signed paper, which is exactly
the comparison a verifier should never have to make.

So the signature block becomes conditional. It is baked into the background image, not drawn, which
is why this is not a one-line change: there has to be a second background.

**Decisions taken before this plan was written** (asked and answered, not re-litigated below):

* **Any valid token counts as signed in.** Not "the donor themselves", not "a user with permission
  to view this donor". A volunteer printing a certificate for someone they are helping is the
  normal case, and the two documents differ by a signature block and nothing else — no donor data
  is added by being signed in, so there is nothing for a narrower rule to protect.
* **The public background drops the whole signature block** — all three ruled lines and all three
  captions. Not the lines alone, which would leave captions floating under nothing.
* **Guest mode shows the signature version.** Guest mode demonstrates the signed-in app; a demo
  that shows a document no signed-in user ever sees is a broken demo.

---

## Phase P1 — the second background

### P1.1 What the signature block actually is in the artwork

Read out of `temp/Badhan New Certificate.svg` rather than assumed. The block is **exactly three
`<text>` elements**, and each one carries its ruled line and its caption in the *same* element:

```
'__________________Directorate of Students’ Welfare, BUET'
'__________________President/General Secretary, BADHAN, BUET Zone'
'__________________President/General Secretary, BADHAN _______________ '
```

One detail matters for the implementation. **`st21` sits on the `<tspan>`s, not on the `<text>` tag**
— the three `<text>` tags carry only a `transform`, and every class attribute is on a child:

```xml
<text transform="matrix(1 0 0 1 69.8472 491.248)"><tspan x="0" y="0" class="st21">__…__</tspan>…
```

This is not a problem, because the script's existing `classes_of()` matches the first `class="…"`
found anywhere in the element string, child tspans included — which is already how the `st12` value
fields are detected. So `'st21' in classes_of(element)` catches all three, and the removal is the
same one-line addition to `drop_text` that `st12` already gets. Verified: `st21` occurs nowhere in
the file outside those three elements except its own `.st21{…}` CSS declaration.

As a cross-check for whoever implements this, all three share a baseline — `matrix(1 0 0 1 …
491.248)`. If a re-export ever puts `st21` on a fourth element, the count assertion below fires
rather than a signature line silently surviving.

The third element is the one the renderer writes into: its trailing `_______________` is the
`UNIT` blank from `certificateLayout.ts`, and the word `Unit` after it is a tspan. Dropping the
element therefore drops the blank too, which is what P3 has to account for.

### P1.2 `prepare-background-svg.py` gains a mode

Add a `--without-signature-block` flag. When set, the script removes the three `st21` texts in
addition to everything it already removes, and asserts it removed exactly three — failing loudly on
any other count, in the same spirit as the existing `EXPECTED_VALUE_FIELDS` check. A background
that silently shipped with two of three signature lines would be a defect nobody notices until it
is printed.

`st21` stays in `MISSING_FONT_FAMILIES`. That table patches a *CSS class declaration*, which
survives in the file whether or not any element still uses it, so the existing
`len(declared) != len(MISSING_FONT_FAMILIES)` assertion keeps passing unchanged. Do not "tidy" it
away for the public variant — the two runs must differ in exactly one respect.

### P1.3 `render-background.sh` bakes both

One invocation, two outputs, from the one artwork export — so the two PNGs can never drift to
different versions of the drawing:

| Output | Contains |
| --- | --- |
| `src/assets/certificate-background.png` | Unchanged. The signature block, as today. |
| `src/assets/certificate-background-public.png` | Everything else; no signature block. |

Both get the same `rsvg-convert` geometry (3508 x 2480, `--background-color white`) and the same
`optipng` pass. The script's header comment — already corrected once to say the PNG is published to
the secrets repo rather than committed — now names both files.

### P1.4 Both PNGs are secrets

`certificate-background.png` was untracked and moved to the private secrets repo in the change
immediately preceding this plan. The public variant is the same licensed artwork with three text
elements removed, so it is the same kind of asset and gets the same treatment: gitignored, stored
at the root of `Badhan-BUET-Zone/secrets`, fetched at deploy time.

`upload-gcloud.js` already fetches a list of `{source, dest}` entries. `CERTIFICATE_BACKGROUND`
becomes `CERTIFICATE_BACKGROUNDS` — an array of two — and both the preflight and the deploy iterate
it. The preflight message already names every absent file, so a missing public background is
reported the same way a missing env file is.

**Blocking prerequisite:** both PNGs must exist in the secrets repo before the first deploy that
carries this feature. The preflight will refuse otherwise, which is the intended failure — the
renderer throws on a missing background, and a certificate route that 500s is worse than one that
never deployed.

---

## Phase P2 — optional authentication on a deliberately public route

### P2.1 Why `@Security` cannot be used

`CertificatesController.getCertificate` has no `@Security` decorator today, on purpose. Adding
`@Security('ApiKeyAuth')` would not give an optional check — `expressAuthentication` in
`tsoaAuth.ts` **throws a 401 when the header is absent**, so the route would stop answering the
verifier scanning a QR code, which is its primary caller. The same is true of the existing
`handleAuthentication` middleware: every failure path is a `res.status(...).send(...)`.

What this route needs is a check that has no failure path at all — one that answers "signed in" or
"not signed in" and never an error.

### P2.2 `optionalAuthenticate`

A new middleware in `src/middlewares/authenticate.ts`, sitting beside `handleAuthentication` and
sharing its machinery rather than duplicating it:

1. Read `x-auth`. Absent → `next()`, nothing set.
2. `jwt.verify` against `dotenv.JWT_SECRET`. Throws → `next()`, nothing set.
3. `tokenCache.get(token)` → hit sets `res.locals.middlewareResponse` and `next()`.
4. Miss → `tokenInterface.findTokenDataByToken`, then `donorInterface.findDonorById`, populating the
   cache on success exactly as `handleAuthentication` does. Any miss or error → `next()`, nothing set.

Every branch calls `next()`. A revoked token, an expired token, a token for a deleted donor and a
malformed header all mean the same thing here — not signed in — and none of them is an error worth
telling the caller about, because the caller gets a certificate either way.

It goes in the existing `@Middlewares([...])` array alongside `rateLimiter.commonLimiter`. The
controller reads the result through tsoa's `@Request()`.

### P2.3 What must not change

The route's guarantee from Plan 16 is that the response can carry a name, two parents' names, a
department and a hall, and nothing else — enforced by what the renderer is handed to draw. This
phase adds a boolean to that input and nothing more. A signed-in viewer must not get a document
with any additional donor field on it; if that is ever wanted, it is a different plan with a
different threat model.

The 404/403 behaviour is untouched: a bad id is still indistinguishable from an absent one, and
`isCertificateEnabled` is still checked before anything renders, both regardless of session.

---

## Phase P3 — the renderer takes a variant

`renderCertificatePdf(donor)` becomes `renderCertificatePdf(donor, { withSignatureBlock })`.

Two things follow from the flag, and they must move together:

```
withSignatureBlock === true   → certificate-background.png        + drawValue(…, UNIT)
withSignatureBlock === false  → certificate-background-public.png + no UNIT
```

The `UNIT` blank exists only in the signed background. Drawing the hall name at
`baseline: 548.8046` on the public background would print a hall name onto empty paper near the
bottom edge, with no rule under it and no sentence around it. The pairing is not an optimisation —
it is the correctness condition, and it is worth a comment in the renderer saying so, because the
two lines are otherwise separated by the four `drawValue` calls that are unconditional.

`certificateResponse` in `CertificatesController.ts` grows the same parameter and passes it
through. Everything else — page size, font registration, the QR code, the filename, the `inline`
disposition — is identical between the two variants. In particular **the QR still points at the
same verification URL**: a printed signed certificate and the public view of it are the same
document, and the code has to keep resolving.

---

## Phase P4 — guest mode

`GuestController.getCertificate` calls `certificateResponse` with an explicit
`withSignatureBlock: true`. A guest carries no real token, so the default would otherwise hand the
demo the public version — the one page in the app whose whole purpose is to show the real rendered
document would then show a document no signed-in user sees.

Worth a comment at the call site: the `true` is a demo decision, not an authentication result.

---

## Phase P5 — the frontend needs no change (verify, don't assume)

Three facts, each checked against the code rather than hoped for:

* `handleGETCertificate` goes through `badhanAxios`, whose request interceptor sends
  `'x-auth': store.getters.getToken`. A signed-out visitor sends no header; a signed-in one sends
  a valid token. The signal already arrives.
* The profile button does `window.open(base + '/#/certificate?id=' + id, '_blank')` — a *fresh page
  load*, not a route change. That would sign the new tab out if the token lived only in Vuex
  memory. It does not: `store.ts:59` commits `loadTokenFromLocalStorage` at store construction, so
  the new tab rehydrates. This is the single most likely place for the feature to silently fail,
  and it is the thing to re-check first if a signed-in user reports a missing signature block.
* Guest mode rewrites the base URL to `/guest`, which P4 handles server-side.

So no frontend code change is planned. Two deliberate non-changes:

* **The page does not announce which version it is showing.** A verifier does not need to be told
  they are not signed in, and a volunteer can see the signature lines.
* **The single-fetch/object-URL design stays.** If someone signs out in another tab, an already
  open certificate page keeps showing the version it fetched. Re-fetching on a session change
  would be machinery in service of a case that does not occur.

---

## Phase P6 — tests

**Backend** (`badhan-backend-test/tests/certificates/`):

* `getCertificate.test.js` gains a signed-in case alongside the existing anonymous one. Both assert
  `application/pdf`, the `%PDF-` magic, and the existing "hundreds of kilobytes, not a few hundred
  bytes" size floor that catches an empty page.
* The two must be asserted to **differ** — the same donor, signed in and signed out, must not
  produce byte-identical output. Without that, a variant that silently fell back to the one
  background would pass every other assertion in the file.
* A token that verifies but has been revoked must render the public version, not a 401. This is the
  behaviour `optionalAuthenticate` exists for and the easiest one to regress.
* `guest.test.js` keeps passing unchanged, and gains the assertion that guest output matches the
  signed variant.

**Frontend** (`badhan-frontend-test/cypress/e2e/certificates/`):

* `public-certificate-page.cy.ts` — signed out, still renders.
* `profile-certificate-button.cy.ts` — signed in, still renders.
* `certificate-pdf.cy.ts:72` asserts that no background image or font URL is ever requested by the
  browser. Its regex `/certificate-background|greatvibes|\.ttf|\.otf/` already matches the new
  filename by prefix — confirm that, do not assume it, because the whole privacy argument for
  server-side rendering rests on this one check.

---

## Phase P7 — documentation

* `docs/manual/07-the-donor-profile.md` — user-visible behaviour, so the manual must say it: a
  certificate opened from a donor's profile while signed in includes the signature lines for
  printing; the same certificate opened by someone scanning the printed QR code does not.
* `docs/manual/19-glossary.md` — if it defines "certificate", the definition now has two forms.
* `badhan-backend/README.md` — the secrets table gains `certificate-background-public.png`, and the
  fresh-clone instructions copy both PNGs.
* `badhan-backend/scripts/certificate-assets/render-background.sh` — header names both outputs.
* `certificateLayout.ts` — the `UNIT` comment currently explains that the blank and `HALL` carry the
  same value. It should also say the blank exists only in the signed background.

---

## Risks and things that will bite

1. ~~**Re-baking needs the artwork.**~~ Resolved during implementation: the artwork was moved into
   `certificate-artwork/` of the private secrets repo, and `render-background.sh` now fetches it
   per run (a local `temp/` copy still wins, so a designer iterating on an export needs no token).
   The bake was verified from a clean checkout with no `temp/` at all, and reproduces the deployed
   background byte-for-byte.
2. **Two files must reach the secrets repo before deploy**, and the deploy payload grows by roughly
   1.8 MB.
3. **The pairing in P3 is the bug to look for.** Background and `UNIT` are two lines that must agree;
   nothing in the type system makes them.
4. **`optionalAuthenticate` must never reject.** A single `res.status(...).send(...)` on a failure
   path turns the public verification page — the one reached from printed paper already in
   circulation — into a 401. Every branch ends in `next()`.
