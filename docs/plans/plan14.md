# Plan 14 — vendor the Credits data and avatars, retire the Realtime Database

The Credits page is the only screen in the app whose content does not come from our own backend.
It fetches a contributor list from a Firebase Realtime Database at
`https://badhan-buet-default-rtdb.firebaseio.com/data.json`, and each of the sixteen records carries an
absolute `imageUrl` pointing into a Firebase Storage bucket, which the browser then fetches one
avatar at a time. Two cloud services, seventeen network round-trips, for a page that changes a few
times a year.

Nothing about that data is dynamic in any meaningful sense. It is a hand-maintained list of names,
dates, roles and links — the same category of content as the user manual, which lives in this
repository as Markdown. Moving it in-tree makes the Credits page render from the bundle with zero
network calls, removes the last dependency on a Firebase product the app otherwise does not use, and
puts contributor edits through code review like every other change.

It also fixes a payload problem nobody has been looking at. The sixteen avatars total **4.94 MB**,
served at resolutions up to 1536×1536, to fill a **100 px** `v-avatar`
([PersonCredit.vue:8](../../badhan-frontend/src/views/Credits/components/PersonCredit.vue#L8)). One
contributor's PNG is 2.13 MB on its own. Vendoring is the natural moment to resize them; done at
200 px the whole set should land near 150 KB, and it inherits the `img/**` immutable cache header
that [firebase.badhan-buet.json](../../badhan-frontend/firebase.badhan-buet.json) already sets.

---

## At a glance

| | Today | After plan 14 |
| --- | --- | --- |
| Where contributor data lives | Firebase Realtime Database | `src/data/contributors.json`, in git |
| Where avatars live | Firebase Storage bucket | `src/assets/contributors/`, in git |
| Network calls to render Credits | 1 JSON + 16 images | **none** — all from the bundle |
| Avatar bytes over the wire | 4.94 MB, uncached-by-origin | ~150 KB, hashed and `immutable` |
| Editing the contributor list | some out-of-band console, unreviewed | a pull request |
| `firebaseAxios` in the frontend | present, 3 endpoints, 2 interceptors | **deleted — `grep -ri firebase badhan-frontend/src` returns nothing** |
| `firebaseAPI.ts` in the backend | present, 0 callers | **deleted** |
| Firebase products the app depends on | Hosting, Realtime Database, Storage | **Hosting only** (plus the internal backup tool, untouched) |
| Credentials needed to do the migration | — | **none** — see [§0.3](#03-the-migration-needs-no-credentials) |

| Phase | Title | Depends on | Deployable alone |
| --- | --- | --- | --- |
| [P1](#phase-p1--vendor-the-data-and-the-images) | Download, resize, commit the data and avatars | — | yes (additive; nothing reads them yet) |
| [P2](#phase-p2--render-credits-from-the-bundle) | `Credits.vue` reads the local module | P1 | yes |
| [P3](#phase-p3--delete-the-realtime-database-client) | Remove **every trace** of `firebaseAxios` and Firebase API calling; `firebaseAPI.ts`; stale snapshots | P2 | yes |
| [P4](#phase-p4--docs-and-the-maintainer-path) | Manual entry, contributor-editing runbook | P2 | — |

P2 is the only phase a user can see. P1 is inert until P2 lands; P3 is pure deletion of code that
P2 stopped calling. Each is independently revertable.

---

## §0 What the investigation found

### 0.1 Only one of the three Realtime Database endpoints has data

The frontend defines three RTDB calls in
[api/index.ts:697-717](../../badhan-frontend/src/api/index.ts#L697-L717). Fetched live:

| Endpoint | Response | Callers |
| --- | --- | --- |
| `/data.json` | 7,903 bytes, 16 contributor records | [Credits.vue:84](../../badhan-frontend/src/views/Credits.vue#L84) |
| `/contributors.json` | `null` | none — exported, never imported |
| `/frontendSettings.json` | `null` | none — exported, never imported |

The backend has a fourth, `handleGETFirebaseGooglePlayVersion` in
[firebaseAPI.ts](../../badhan-backend/src/microservices/firebaseAPI.ts), which also hits
`/frontendSettings.json`. `grep` finds no importer of that module anywhere in `badhan-backend/src`.
It is dead code pointing at a null node.

So the migration has exactly one real endpoint to replace. The other three are deletions.

### 0.2 The checked-in snapshots are stale and disagree with production

Two files in the frontend claim to mirror the database and neither matches it:

- [realtimedb.json](../../badhan-frontend/realtimedb.json) — a `contributors` / `frontendSettings`
  shape that the live database no longer has at all. Lists 10 people; pins
  `"version": "4.7.5"` and a `backendTestBaseURL` on Heroku.
- [badhan-buet-default-rtdb-export.json](../../badhan-frontend/badhan-buet-default-rtdb-export.json)
  — the current `data` shape, but an older export.

Both are unreferenced by any code. They are the fossil record of previous attempts to keep this data
near the app, and P3 removes them once a single canonical file exists.

### 0.3 The migration needs no credentials

Both the RTDB node and every Storage object are publicly readable — plain unauthenticated `GET`s
return `200`. The download step is `curl`, not `firebase`. The service account at
`badhan-backend/config/badhan-buet-1d20b088a755.json` (gitignored, used by the internal backup tool
in [internalRoutes/index.ts](../../badhan-backend/src/internalRoutes/index.ts)) is **not** needed
here and should not be wired into this work. Neither should the `deploy` container's `firebase`
login. Keeping the migration credential-free means anyone can re-run or verify it.

### 0.4 The images are enormous and uniformly square

Measured from the live bucket:

| File | Bytes | Pixels |
| --- | --- | --- |
| `fuad.png` | 2,128,690 | 850×1063 |
| `1659897711.png` | 903,558 | 1536×1536 |
| `1660030146.png` | 545,355 | 1440×1440 |
| `1660032466.png` | 474,746 | 1440×1429 |
| `akon.jpg` | 302,242 | 960×960 |
| …11 more | — | 446×454 to 960×958 |
| **total** | **5,180,871 (4.94 MB)** | |

Every one is square or near-square and every one renders inside a 100 px avatar. 200×200 covers
2× displays with room to spare. The two naming conventions in the bucket — `badhan-admin-api/<id>.png`
for people added through the retired admin console, `profilepics/<name>.jpg` for people added by
hand — are an artifact of that history and should not survive into the repository.

### 0.5 One record already points at a shared placeholder

`Nobel Dey` uses `profilepics/avatar.jpg`, a generic silhouette, not a photograph. The frontend
already ships a local placeholder, [`src/assets/account.png`](../../badhan-frontend/src/assets/account.png),
used as `lazy-src` on the very same component. That record should reference the existing local
placeholder rather than getting a byte-identical duplicate committed under a person's name.

**Since resolved:** a real photograph was supplied after the migration, so the record now carries
`nobel-dey.webp` like everyone else and no record is left on the placeholder. The database still
points him at the silhouette, which is what `KEEP_LOCAL_PHOTO` in the script exists to override —
see [§1.2](#12-the-migration-script). The null-image path in the data and the `account.png` fallback
in the component both stay, because the next person added without a photo will need them.

### 0.6 The write path is already gone

The only thing that ever wrote to this database is
[archive/badhan-admin-frontend](../../archive/badhan-admin-frontend/src/api/index.ts), which is in
`archive/` and not deployed. In practice the contributor list is already edited by hand in the
Firebase console. Replacing that with a pull request is a strict improvement in reviewability, and
costs nothing that is currently being used.

---

## Phase P1 — vendor the data and the images

**Goal:** the data and the resized avatars are in the repository and committed. Nothing reads them
yet, so this phase is safe to land on its own.

### 1.1 The shape of the vendored data

Write `badhan-frontend/src/data/contributors.json` as an **array**, not the id-keyed object the RTDB
returns. The id keys are RTDB primary keys; in a file, array order *is* the order, which is the one
piece of editorial control the current setup lacks entirely (today the Credits page renders in
whatever order `Object.entries` yields, i.e. numeric-ish key order, i.e. by date of addition).

Keep the field names — `name`, `type`, `contribution`, `links` — so
[Credits.vue](../../badhan-frontend/src/views/Credits.vue)'s grouping logic changes as little as
possible. Drop `id`, which exists only to key the RTDB node. Replace `imageUrl` with `image`,
holding a repo-relative asset filename rather than an absolute URL — the field changes meaning, so
it should change name.

Drop `calender` (sic) too. It held a per-person date range — `January 2020 - Present` — which is a
field nobody can keep true: it goes stale the moment someone stops contributing, and the only way to
notice is for a reader to already know. It also gave the page a subtitle line whose main effect was
to sort people by how recently they were active, which is the same thing the
`Active` / `Legacy` split did and the same reason both are gone
([§1.1](#11-the-shape-of-the-vendored-data)). Credit does not expire.

```json
[
  {
    "name": "Mir Mahathir Mohammad",
    "type": "Lead",
    "image": "mir-mahathir-mohammad.webp",
    "contribution": ["UX Design", "Web Frontend Development", "…"],
    "links": [{ "icon": "github", "color": "grey", "link": "https://github.com/mirmahathir1" }]
  }
]
```

The three `type` values are load-bearing — `Lead`, `Developers`, `Contributors of Badhan` — because
P2 groups on them. A typo silently drops a person from the page, which is the strongest argument in
[§1.5](#15-guard-the-data-shape) for a shape check.

The database has a different, older split: `Active Developers` / `Legacy Developers` /
`Contributors of Badhan`. That distinction sorted developers by whether they were still around,
which meant a person's group changed as they moved on and the page read as a ranking of who
currently mattered. One `Developers` group, with the project lead called out separately, says the
same thing without the demotion. The script maps the old values to the new ones on the way through
(`TYPE_MAP` and `LEAD`), so re-running it reproduces what is committed rather than resurrecting the
old grouping — the section-title change in `Credits.vue` and the data must move together or people
silently vanish.

### 1.2 The migration script

Add `badhan-frontend/tools/vendor-contributors.js`: fetch `/data.json`, download each `imageUrl`,
resize to 200×200, write WebP into `src/assets/contributors/`, emit `contributors.json` with the
slugged filenames. Run it **once**, commit the output, and keep the script in-tree as documentation
of provenance and as the resizer for future additions
([§4.2](#42-the-runbook-for-adding-a-contributor)).

Per [CLAUDE.md](../../CLAUDE.md) it runs in a container, never on the host:

```
docker compose run --rm --no-deps frontend node tools/vendor-contributors.js
```

Resizing needs an image library the frontend does not currently have. Recommended: add `sharp` as a
frontend `devDependency`. It is the standard choice, it is used only by this script, and it never
enters the bundle. The alternative — a throwaway `npm i --no-save sharp` inside the run — avoids
touching `package.json` but makes the script un-runnable offline and unpinned, which is the wrong
trade for a tool that will be re-run every time someone joins.

Filenames should be slugs of the person's name (`mir-mahathir-mohammad.webp`), not timestamps. WebP
at quality ~80 for 200×200 photographs is comfortably under 15 KB each.

Three special cases. A record on the shared silhouette gets `"image": null` and no downloaded file
([§0.5](#05-one-record-already-points-at-a-shared-placeholder)). A record listed in
`KEEP_LOCAL_PHOTO` keeps the file already committed instead of downloading — that is how a photo
supplied *after* the migration survives a re-run, rather than being silently replaced by whatever
the database still holds. And any record whose download 404s should fail the script loudly rather
than emit a broken reference.

### 1.3 Verify the result

Check the vendored set against the live one before trusting it: every database record in and an
image out for each, plus any git-only records carried through, every
`type` one of the three known values, exactly one `Lead`, every `image` resolving to a file that
exists, total `src/assets/contributors/` under 250 KB. A short assertion block at the end of the
script is worth more than a manual diff, because it also runs on every future re-run.

### 1.4 Where the files go

`src/assets/`, not `public/`. Assets under `src/` go through webpack, which content-hashes them into
`img/` — and `img/**` is exactly the path
[firebase.badhan-buet.json](../../badhan-frontend/firebase.badhan-buet.json) marks
`public, max-age=31536000, immutable`. Anything in `public/` is copied verbatim and falls under the
catch-all `no-cache` rule instead, which would mean re-downloading every avatar on every visit —
worse than today for cacheability, even at 150 KB.

In practice the build splits them: 6 avatars are emitted as files under `img/`, and the 9 that fall
under Vue CLI's 8 KB inline threshold are base64'd into the Credits route chunk. That is fine and
needed no configuration — the Credits route is lazily loaded, so the chunk downloads only when
someone opens the page, and `js/**` carries the same `immutable` header as `img/**`. Both halves are
content-hashed; neither is ever re-fetched.

### 1.5 Guard the data shape

`contributors.json` is now hand-edited by people who may never run the app. Nothing about a JSON
file catches a `"type": "Active Developer"` (singular) that silently vanishes from the page.

The plan called for a unit test here. **Implemented differently:** the frontend has no unit test
suite — `jest.config.js` exists but there is not a single spec file, and the actual frontend tests
are Cypress e2e in the separate `badhan-frontend-test` project. A lone jest spec that nothing runs
is not a guard. The invariants from [§1.3](#13-verify-the-result) instead live in `verify()` inside
the vendoring script, which runs on every regeneration and exits non-zero. That covers the migration
and the add-a-contributor path; a hand-edit that never runs the script is still unguarded, and
remains the honest gap here.

---

## Phase P2 — render Credits from the bundle

**Goal:** the Credits page renders with no network activity. This is the only user-visible phase.

### 2.1 `Credits.vue`

Replace the `handleGETContributors()` call at
[Credits.vue:84](../../badhan-frontend/src/views/Credits.vue#L84) with a static import. The `async
mounted` hook, the `contributorsLoader` flag, the `LoadingMessage` branch and the
`response.status !== HTTP_STATUS.OK` guard all go with it — there is no request to be pending or to
fail. The grouping `reduce` stays, reading the imported array instead of `Object.entries(response.data)`.

The three `console.log`s at the end of that hook are debug leftovers; remove them in the same edit.

Grouping can move from `mounted` into `computed`, since the source is now a constant. That is the
idiomatic Vue shape and removes the empty-then-populated flash entirely.

### 2.2 `PersonCredit.vue`

[Line 8](../../badhan-frontend/src/views/Credits/components/PersonCredit.vue#L8) binds
`:src="person.imageUrl"` to an absolute URL. It now needs to resolve a filename to a webpack asset,
which requires a `require()`/`new URL(...)` at the component level rather than a raw string — a
bundler cannot follow a fully dynamic path, so the resolution must use a fixed directory prefix with
only the filename interpolated.

`person.image === null` must fall back to `@/assets/account.png`, the same file already used as
`lazy-src`. With images now inline in the bundle, the `v-skeleton-loader` placeholder template is
dead weight and can go; `lazy-src` can stay as the null-case source.

### 2.3 What to check after this phase

Open the Credits page with the network panel filtered to XHR and images: zero requests. All three
groups render, in `contributors.json` order, with the same people as production today, every one
with a photograph. No console errors about unresolved modules — the failure mode of a bad
`require` path is a build-time error in most cases but a runtime one in a few, so this needs an
actual page load, not just a green `npm run build`.

---

## Phase P3 — delete the Realtime Database client

**Goal: every trace of `firebaseAxios` and of Firebase API calling is removed from the frontend.**
Not deprecated, not left unexported, not commented out — deleted, such that
`grep -ri firebase badhan-frontend/src` returns nothing. The same applies to the backend's dead RTDB
client. This phase is pure subtraction: P2 already stopped calling any of it, so nothing here can
change behaviour.

### 3.1 Frontend — remove `firebaseAxios` and every Firebase call

From [api/index.ts](../../badhan-frontend/src/api/index.ts), delete:

| What | Lines |
| --- | --- |
| the `firebaseAxios` instance | [39-41](../../badhan-frontend/src/api/index.ts#L39-L41) |
| its request interceptor | [114-127](../../badhan-frontend/src/api/index.ts#L114-L127) |
| its response interceptor | [129-140](../../badhan-frontend/src/api/index.ts#L129-L140) |
| `handleGETCredits`, `handleGETContributors`, `handleGETFrontendSettings` | [697-717](../../badhan-frontend/src/api/index.ts#L697-L717) |
| the four export entries | 722, 750, 778, 779 |

That is every line in the frontend that mentions Firebase outside of Hosting config. After the
deletions the file has exactly one axios instance — `badhanAxios`, pointing at our own backend — and
one pair of interceptors, which is the shape it should have had once the Credits page stopped being
the exception.

Two things must change with them, or the traces survive in prose:

- The module comment at the top of the file — *"Current active backends are- an express app and
  firebase realtime database"* — becomes false. Rewrite it, do not leave it.
- The `/// ///////////////////////FIREBASE API CALLS ////////////////////////` banner above the
  deleted functions goes too; an empty section header is a trace.

`firebaseAxios` is exported ([line 722](../../badhan-frontend/src/api/index.ts#L722)), so confirm no
importer picks it up before deleting. It is exported but, as of this investigation, imported nowhere —
[Credits.vue](../../badhan-frontend/src/views/Credits.vue) was the only consumer of anything in that
group, and P2 removes it. `badhan-backend-test/tests/runtime/axios.js` mentions firebase and should
be checked, though it is a separate test harness and most likely unrelated.

### 3.1.1 The verification, and what stays

The phase is done when these return nothing:

```
grep -rn "firebaseAxios"           badhan-frontend badhan-backend/src
grep -rn "firebaseio.com"          badhan-frontend/src badhan-backend/src
grep -rn "firebasestorage"         badhan-frontend/src badhan-backend/src
grep -rl "firebaseio\|firebasestorage" badhan-frontend/dist/js   # nothing in the built bundle
```

The plan originally set the bar at `grep -ri firebase badhan-frontend/src` returning nothing.
**That bar was wrong**, and the implementation could not meet it, for one legitimate reason:
[BackupRestore.vue](../../badhan-frontend/src/views/BackupRestore.vue) renders the backend's
`FIREBASE_CREDENTIALS_MISSING` error and the setup instructions that go with it. That is the
super-admin backup tool — a live feature built on `firebase-admin` Storage, a different Firebase
product, out of scope here. The greps above are the accurate version of the same check.

Four categories of Firebase reference **legitimately remain**, and a search that flags them is
reading too broadly:

| Stays | Where | Why |
| --- | --- | --- |
| Hosting config and deploy | `firebase.badhan-buet*.json`, `upload-firebase.js`, `badhan-deploy/` | the app is still hosted on Firebase Hosting; unrelated product |
| `firebase-admin` Storage | [internalRoutes/index.ts](../../badhan-backend/src/internalRoutes/index.ts) | the backup/restore tool, a live internal feature |
| Its error UI | [BackupRestore.vue](../../badhan-frontend/src/views/BackupRestore.vue) | the frontend half of that same feature |
| `archive/badhan-admin-frontend` | `archive/` | not built, not deployed; archived by definition |

The distinction that matters: **Firebase Hosting and the backup tool stay, the Firebase Realtime
Database and Storage *clients* go.** No code the Credits page touches reaches a Firebase service.

### 3.2 Backend

Delete [firebaseAPI.ts](../../badhan-backend/src/microservices/firebaseAPI.ts) entirely. It has no
importers ([§0.1](#01-only-one-of-the-three-realtime-database-endpoints-has-data)) and its endpoint
returns `null`. If a Google Play version check is wanted later it belongs against the Play API, not
against a dead RTDB node.

This does **not** touch `firebase-admin` or the Storage usage in
[internalRoutes/index.ts](../../badhan-backend/src/internalRoutes/index.ts) — that is the backup and
restore tool, a different product and a live feature.

### 3.3 Stale snapshots

Delete [realtimedb.json](../../badhan-frontend/realtimedb.json) and
[badhan-buet-default-rtdb-export.json](../../badhan-frontend/badhan-buet-default-rtdb-export.json)
([§0.2](#02-the-checked-in-snapshots-are-stale-and-disagree-with-production)). `contributors.json`
is the single source of truth from here; leaving two disagreeing snapshots beside it recreates the
exact confusion this plan removes.

### 3.4 Leave the cloud resources alone

Do not delete the RTDB node or the Storage objects in this plan. They cost nothing, they are the
rollback path for P2, and any Android build or bookmarked deployment still in the wild may be
reading them. Retiring the cloud-side resources is a follow-up, appropriate once a release built
from P2 has been in production long enough to be confident.

---

## Phase P4 — docs and the maintainer path

### 4.1 User manual

Per [CLAUDE.md](../../CLAUDE.md), behaviour changes are documented in the same change. The Credits
page is currently one table row in
[05-the-screen-and-the-menu.md:43](../../docs/manual/05-the-screen-and-the-menu.md#L43) and a
sentence in [18-when-something-goes-wrong.md:171](../../docs/manual/18-when-something-goes-wrong.md#L171).

The user-visible change is small but real: the page no longer needs a network connection and no
longer shows a loading state. Both existing mentions stay accurate; the honest edit is a line noting
Credits works offline, in whichever of the two files reads more naturally. Resist inventing a new
manual chapter for a page with no interactions.

### 4.2 The runbook for adding a contributor

This is the part that genuinely did not exist before and matters most for whoever maintains this
next. Document, next to the script:

1. Drop the photo in as a file (square, any size).
2. Run `docker compose run --rm --no-deps frontend node tools/vendor-contributors.js <photo> <name>`
   to produce the 200 px WebP.
3. Add the record to `contributors.json`, with a `type` from the three allowed values.
4. Open a pull request.

Whether the script's second mode is worth building, versus documenting the resize as a one-liner, is
a judgement call for whoever implements P1 — but the four steps need writing down either way,
because the alternative is the current situation, where the process lives in one person's memory of
a Firebase console.

---

## Rollback

Per phase, in reverse order:

- **P3** — `git revert`. The deleted calls come back; nothing depends on them either way.
- **P2** — `git revert` restores the RTDB fetch. This is why [§3.4](#34-leave-the-cloud-resources-alone)
  keeps the cloud data alive: as long as the node and bucket are intact, the revert is complete and
  needs no data restoration.
- **P1** — nothing to roll back; the files are inert until P2.

The migration is one-way only in the sense that new contributors added after P2 exist solely in git.
If P2 were reverted months later, those people would need re-adding to the RTDB by hand — an
argument for retiring the cloud resources deliberately in a follow-up rather than letting the two
sources drift silently.

---

## What was implemented

All four phases landed together.

| | Before | After |
| --- | --- | --- |
| Avatar bytes | 5,180,871 (4.94 MB) | **134,486 (131 KB)**, 17 × 200px WebP |
| Largest single avatar | 2,128,690 B, 850×1063 | 13,124 B, 200×200 |
| Network calls to render Credits | 1 JSON + 16 images | **0** |
| `firebaseAxios` | instance + 2 interceptors + 3 calls + 4 exports | **gone** |
| `firebaseAPI.ts` | 15 lines, 0 callers | **deleted** |
| Stale RTDB snapshots | 2 files, both disagreeing with production | **deleted** |

Verified:

- **Content fidelity.** The 16 vendored records were diffed field-by-field against the live database
  (`name`, `contribution`, `links`) in the same order: zero mismatches. `type` and `calender` are the
  two deliberate departures — see [§1.1](#11-the-shape-of-the-vendored-data); groups come out
  1 Lead / 8 Developers / 7 Contributors, every record with a photograph, and none carrying a date
  range. One person has since been added straight to the file (Nashit Hasan), bringing it to 17.
- **Bundling.** `npm run build` resolves all 15 avatars through the `require` context plus
  `account.png`; the built Credits chunk contains the data and 9 inlined avatars, and
  `grep -rl "firebaseio\|firebasestorage" dist/js` finds nothing.
- **Compile.** `vue-cli-service lint` clean on every touched file; dev server compiles with
  "No issues found".

Two follow-on changes to the page itself, outside the plan's original scope but enabled by it:
the grid went from two columns to three (`md="4"`, `dense` rows) with the surrounding padding
tightened, and `v-img` gained `eager`. The avatars stayed at 100px throughout. `eager` matters
because Vuetify lazy-loads images behind an intersection observer by default — sensible for remote
images, pointless once the file is in the bundle, and visible as a grey disc on anything scrolled
past quickly. Verified by driving the real app: signed in through Cypress, navigated to Credits, and
screenshotted at 1280px.

Not done, deliberately: the Realtime Database node and the Storage objects are still live
([§3.4](#34-leave-the-cloud-resources-alone)), and `firebase-tools` remains a frontend
`devDependency` even though plan 13 moved it into the deploy image globally — a separate leftover,
not this plan's business.

---

## Open questions

1. ~~**Order.**~~ Resolved as recommended: order preserved exactly, which is what made the
   field-by-field diff against the live database meaningful. Reordering within a group is now a
   one-line move in the JSON, whenever anyone wants it.
2. ~~**`sharp` as a devDependency.**~~ Resolved as recommended: `sharp@^0.34.5`, devDependency,
   never bundled.
3. ~~**Shape guard.**~~ Resolved *against* the recommendation — see
   [§1.5](#15-guard-the-data-shape); there is no unit test suite to put it in, so it lives in the
   script.
4. ~~**`calender` → `calendar`.**~~ Moot: the field was dropped rather than renamed
   ([§1.1](#11-the-shape-of-the-vendored-data)), which takes the misspelling with it.
