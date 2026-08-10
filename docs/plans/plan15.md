# Plan 15 — one environment vocabulary: `production`, `development`, `local`

---

## Phase P1 — the branch rename

> **Landed.** Commit `7e00d956` on `production`, merged to `development` as `1b6fc889`. The remote has
> exactly two branches, `production` is the default, and `main` / `test-branch` are gone. The sequence
> below is the record of what was run — [§P1.3](#p13-the-rename-sequence-as-executed) notes the four
> places execution diverged from the plan as written.

**Depends on:** — · **Deployable alone:** yes (no app code runs) · **Reversible:** no — this is the
only phase with an irreversible external step (the GitHub default branch).

The ecosystem already runs in three places. It just did not agree on what to call them. This plan
fixes the vocabulary in one pass: **exactly three environment names, spelled the same way everywhere,
derived from one place** — and it starts here, by renaming the git branches so that **the branch name
*is* the environment name**. The full survey of the nine names in use is
[§P2.1](#p21-what-was-found), and the model that replaces them is [§P2.2](#p22-exactly-three-names).

| | Today (pre-plan) | After plan 15 |
| --- | --- | --- |
| Git branches | `main`, `test-branch` | `production`, `development` |
| README image links | 15 × `raw.githubusercontent.com/…/badhan/main/…` | `…/badhan/production/…` |

### P1.1 What was found

**Renaming `main` breaks 15 image links in the README.** Every screenshot and logo in
[README.md](../../README.md) is an absolute
`https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/…` URL — 15 of them.
`raw.githubusercontent.com` does **not** follow GitHub's branch-rename redirects; the moment `main`
stops existing, all 15 return 404 and the README renders as broken-image icons on GitHub, on npm-style
mirrors, and in the organisation profile. This is why the rename is ordered the way it is
([§P1.3](#p13-the-rename-sequence-as-executed)).

[docs/blog/branch-and-commit-convention.md:3-7](../blog/branch-and-commit-convention.md#L3-L7) also
names `master` and `test-branch` as the protected branches, for repos that were merged into this
monorepo.

### P1.2 What changed

| File | Change |
| --- | --- |
| [README.md](../../README.md) | 15 raw-content URLs `…/badhan/main/…` → `…/badhan/production/…`; line 205's "(`badhan-buet` on `main`, `badhan-buet-test` otherwise)" → the explicit two-branch statement |
| [docs/blog/branch-and-commit-convention.md](../blog/branch-and-commit-convention.md) | `master` / `test-branch` → `production` / `development` |
| [docs/plans/implemented/plan12.md](implemented/plan12.md) | leave alone — implemented plans are a historical record |
| GitHub | rename branches, move the default branch, move branch protection rules |
| local clones | `git branch -m`, `git fetch --prune`, `git remote set-head origin -a` |

Deploy-script branch literals were **not** touched here — they moved wholesale in
[P2](#phase-p2--one-map-environmentsjs). Between P1 and P2 the deploy from `production` would take the
development path, so **P1 and P2 land together or P1 does not get pushed**. They are separate phases
only because their review surfaces are unrelated.

### P1.3 The rename sequence, as executed

`raw.githubusercontent.com` 404s the instant `main` disappears ([§P1.1](#p11-what-was-found)), so the
new name was created *before* the old one was removed, with the URL rewrite landing in between.
Everything was run through `git` and `gh` rather than the GitHub UI, so the sequence is a transcript
rather than a description of clicks.

Preconditions, checked first: `gh auth status` authenticated as `mirmahathir1`, and
`gh api repos/Badhan-BUET-Zone/badhan --jq .permissions.admin` → `true`. Also checked, because both
change what the sequence has to do: `gh pr list --state open` → **none**, so nothing needed
retargeting; and `main` was **4 commits behind** `test-branch`, so `production` was cut from `main`'s
commit and the newer work stayed on `development`.

1. `git switch main && git pull --ff-only`
2. `git switch -c production` → `git push -u origin production`. Both names now resolved; nothing
   removed.
3. Committed P1 + P2 on `production` (`7e00d956`) and pushed.
4. `gh api -X PATCH repos/Badhan-BUET-Zone/badhan -f default_branch=production`, then the protection
   rules: read from `…/branches/main/protection`, **reshaped**, and `PUT` to
   `…/branches/production/protection`.
5. Verified: default branch `production`, and all 15 raw-content image URLs returned `200` from the
   `production` path.
6. Created `development` and brought the map onto it — **not in the plan as written**, see below.
7. Confirmed `main ⊂ production` and `test-branch ⊂ development` with `git merge-base --is-ancestor`,
   then **stopped for explicit go-ahead** before any deletion.
8. Stripped protection from `main`, then `git push origin --delete main` and
   `git push origin --delete test-branch`.
9. `git fetch --prune && git remote set-head origin -a`; deleted the stale local `main`.

Four divergences from the plan as written, each of which the next rename should expect:

- **`main` could not be deleted while protected.** Its rule set had `allow_deletions: false`, so
  `gh api -X DELETE …/branches/main/protection` had to run first. The plan's step 6 assumed the
  delete would just work.
- **The protection payload is not round-trippable.** `GET …/protection` returns `restrictions` and
  `bypass_pull_request_allowances` as arrays of *objects*; `PUT` requires arrays of login/slug
  *strings*, and `required_status_checks: null` must be sent explicitly. The read payload has to be
  reshaped, not replayed. What transferred: one required approving review, `mirmahathir1` as the
  bypass user, no force pushes, no deletions, `block_creations`, admins not enforced.
- **`development` was created before `main` was deleted, not after** (plan steps 6 → 7 ran in the
  reverse order). Both deletions then happened together at the end, so the repository never had a
  moment with only one of the two new branches.
- **`production` was merged into `development`** (`1b6fc889`), which the plan never says to do.
  Without it, `development` would still hold the old `if (branch === "main")` scripts and none of the
  renamed configs — it would have kept deploying correctly *by accident*, via the fallthrough this
  plan exists to delete. **Any future phase that lands on `production` first must be merged down the
  same way.**

There is no CI in this repo (`.github/` does not exist), so nothing else keyed on the branch name.

### P1.4 Verification — results

```
git ls-remote --heads origin        # development, production — and nothing else ✓
grep -c "badhan/main" README.md                       # 0 ✓
grep -c "badhan/production/docs/images" README.md     # 15 ✓
curl -o /dev/null -w '%{http_code}' \
  https://raw.githubusercontent.com/…/badhan/production/docs/images/logo.png   # 200 ✓
gh api repos/Badhan-BUET-Zone/badhan --jq .default_branch                      # production ✓
grep -rn '"main"\|test-branch' deploy.js environments.js \
  badhan-backend/upload-gcloud.js badhan-frontend/upload-firebase.js           # empty ✓
```

All 15 image URLs were checked individually, not just the logo; every one returned `200`.

The deleted branches' tips, should either ever need restoring: `main` was `5be9de16`, `test-branch`
was `e3a8bddc`. Both are reachable from `production` and `development` respectively, so neither is
lost — `git push origin 5be9de16:refs/heads/main` would bring the name back.

### P1.5 Decisions and risks

**Decision — P1's GitHub steps were executed via `gh`, not clicked in the UI.** Reproducible and
reviewable, and it is why the divergences above are recorded as commands rather than remembered as
clicks. Two preconditions were checked up front (`gh` authenticated, admin on the repo), everything
before the deletions was additive, and both deletions waited on an explicit go-ahead. **Done.**

Risks, all retired:

| Risk | Outcome |
| --- | --- |
| README images 404 during the rename | **Did not occur.** `production` was created and the URL rewrite pushed before `main` was deleted; all 15 URLs were individually confirmed `200` from the `production` path first |
| P1 without P2 deploys `production` to the test project | **Did not occur.** The two shipped as one commit, and `production` never existed on the remote carrying the old branch literals |
| Open PRs lose their base branch | **Not applicable.** `gh pr list --state open` returned none before the rename began |
| `gh` lacks admin rights, so P1 stops half-done | **Did not occur.** Both preconditions passed up front. A related one the plan missed did bite: `main`'s protection had `allow_deletions: false`, so the rule had to be deleted before the branch could be — see [§P1.3](#p13-the-rename-sequence-as-executed) |

One risk this plan never listed, worth carrying forward into every remaining phase: **a phase landing
on `production` without being merged down leaves `development` on the old code.** It nearly happened
here — see the fourth divergence above.

---

## Phase P2 — one map (`environments.js`)

> **Landed**, in the same commit as P1. [environments.js](../../environments.js) exists and is
> required by all three of `deploy.js`, `upload-gcloud.js` and `upload-firebase.js`. The refusal path
> was exercised on a throwaway branch through each of the three entry points, and both preflights
> were confirmed still green on `production` and on `development`.

**Depends on:** [P1](#phase-p1--the-branch-rename) · **Deployable alone:** yes

| | Today (pre-plan) | After plan 15 |
| --- | --- | --- |
| Environment names in use | `main`, `test-branch`, `production`, `development`, `local`, `test`, `testing`, `dev`, `prod` | `production`, `development`, `local` — nothing else |
| Branch → deploy target | inferred: `main` → prod, **anything else** → dev | explicit map; an unlisted branch **refuses to deploy** |
| Where that map lives | duplicated in `upload-gcloud.js` and `upload-firebase.js` | once, in `environments.js` at the repo root |
| App Engine configs | `app_prod.yaml`, `app_dev.yaml` | `app.production.yaml`, `app.development.yaml` |
| Firebase configs | `firebase.badhan-buet.json`, `firebase.badhan-buet-test.json` | `firebase.production.json`, `firebase.development.json` |
| Development cache headers | blanket `no-cache` only | the same `no-cache` + three `immutable` rules production has |

### P2.1 What was found

None of what follows was *broken*, because one person held the mapping in their head. All of it was a
trap for the next person, and two of the findings across this plan were already live defects
([§P5.1](#p51-what-was-found) and the branch fallthrough below).

These findings describe the state **before** P1 and P2 landed and are left as written; the file names
they cite (`app_prod.yaml`, `app_dev.yaml`, `firebase.badhan-*.json`) therefore no longer exist. That
is the record of what was found, not a to-do.

**There are three environments and nine names for them.** Grepped across the repo, these all refer to
one of three things:

| Real environment | Spelled, today, as |
| --- | --- |
| production | `main` (branch), `production`, `prod` (`app_prod.yaml`, `serve:prod`, `start:prod`), `Production` ([mongoose.ts:12-14](../../badhan-backend/src/db/mongoose.ts#L12-L14)), `badhan-buet` (project id used as a config filename) |
| development | `test-branch` (branch), `development`, `dev` (`app_dev.yaml`, `serve:dev`), `test` / `Test` (UI button "Restore to Test", mongoose flavour, `badhan-buet-test`), `testing` ([environment.ts:44-46](../../badhan-frontend/src/mixins/environment.ts#L44-L46), matched by nothing) |
| local | `local`, and — in the frontend — `development`, because [.env.local](../../badhan-frontend/.env.local) sets `VUE_APP_ENVIRONMENT=development` |

The last row is the sharpest one: a developer running the stack locally sees `development` on the
About page and in the environment watermark, which is the same thing the deployed test site says.
The two are not distinguishable from inside the app.

**Any branch that is not `main` silently deploys to the test project.** Both deploy scripts resolved
their target the same way — an `if` on one literal, and a fallthrough:

- [upload-gcloud.js:31-46](../../badhan-backend/upload-gcloud.js#L31-L46) — `if (currentBranch === "main") { … } return { env.development, app_dev.yaml, badhan-buet-test }`
- [upload-firebase.js:48-54](../../badhan-frontend/upload-firebase.js#L48-L54) — same shape

So `./deploy.js` from `mahathir/#72/platelet-count`, from a detached-ish feature branch, or from a
branch created five minutes ago, ran both test suites and then **deployed that branch to the shared
test environment** without a word about it. Nothing in the preflight mentioned the branch unless the
credential check happened to fail. That is the behaviour to remove, not to rename: with two named
deployment branches, a third branch has no target and should be a preflight error.

The mapping was also duplicated. The two copies agreed; nothing enforced that they kept agreeing, and
the frontend's copy was keyed on a build command while the backend's was keyed on a yaml file, so they
could not simply be diffed by eye.

**Config files are named after cloud projects, not environments.**
`firebase.badhan-buet.json` / `firebase.badhan-buet-test.json` and `app_prod.yaml` / `app_dev.yaml`
each encode the environment in a different scheme, and the Firebase pair additionally encodes a
*project id* — which appears again inside the file as `"site"`, again in `upload-firebase.js`, and
again (as `badhan-buet-test-46eca`, a fourth spelling of "development") as the hosting site. The file
name and the deploy target had to be kept in sync by hand:
[upload-firebase.js:104](../../badhan-frontend/upload-firebase.js#L104) built the name by string
interpolation from the project id.

### P2.2 Exactly three names

`production`, `development`, `local`. Written in full, lower case, everywhere: branch names, npm
scripts, file names, env vars, query parameters, UI labels, docs. No `prod`, no `dev`, no `test`, no
`testing`, no `staging`, no project ids standing in for environment names.

**Decision — the no-abbreviations rule covers user-visible display strings too, with no exception
carved out.** The PWA label is therefore `Badhan (development)`, not `Badhan (dev)` — even though it
is the one place the full word costs something: `short_name` is what a launcher prints under the icon,
and Android truncates around 12 characters, so the home-screen caption will read something like
*Badhan (deve…*. Accepted deliberately. A truncated-but-obviously-not-production label still does the
job the label exists for, and the alternative — a single sanctioned abbreviation for display strings —
is exactly how the nine-name situation in [§P2.1](#p21-what-was-found) started. Implemented in
[§P5.3](#p53-per-environment-pwa-identity).

| | `production` | `development` | `local` |
| --- | --- | --- | --- |
| Git branch | `production` | `development` | — (any branch, never deployed) |
| Backend `NODE_ENV` | `production` | `development` | `local` |
| Backend env file | `env.production` | `env.development` | `env.local` |
| App Engine config | `app.production.yaml` | `app.development.yaml` | — |
| GCP project | `badhan-buet` | `badhan-buet-test` | — (mongo container) |
| Backend base URL | `https://badhan-buet.uc.r.appspot.com` | `https://badhan-buet-test.uc.r.appspot.com` | `http://localhost:3000` |
| Frontend mode / env file | `production` / `.env.production` | `development` / `.env.development` | `local` / `.env.local` |
| Frontend build script | `build:production` | `build:development` | `build:local` |
| `VUE_APP_ENVIRONMENT` | `production` | `development` | `local` |
| Firebase config | `firebase.production.json` | `firebase.development.json` | — |
| Firebase project / site | `badhan-buet` / `badhan-buet` | `badhan-buet-test` / `badhan-buet-test-46eca` | — |
| Frontend URL | `https://badhan-buet.web.app` | `https://badhan-buet-test-46eca.web.app` | `http://localhost:8080` |
| Service worker | registers | registers | **never** |
| PWA name | `Badhan` | `Badhan (development)` | — |
| Android TWA | this one, only | — | — |
| Watermark | hidden | shown | shown |

`local` is not a deploy target. That is the only structural asymmetry, and it is the reason the model
is "two deployment environments plus a local one" rather than three peers.

### P2.3 One source of truth, two consumers

The host-side deploy orchestration (`deploy.js` and the three upload scripts) is the only code that
needs the *branch → environment* edge. The apps only need to know their own environment, which they
already learn from `NODE_ENV` / `VUE_APP_ENVIRONMENT`. So:

- **`environments.js`** at the repo root — standard library only, CommonJS, like its three siblings
  (see the exceptions list in [CLAUDE.md](../../CLAUDE.md)) — owns the branch map and the per-target
  constants, and is `require`d by the upload scripts.
- **The apps** keep reading their own env var, but each gains a validating parser so an unknown value
  fails loudly at boot instead of being cast.

No build step ships `environments.js` into either app; duplicating the three literal names into
`ENVIRONMENT_TYPES` (backend) and the frontend mixin is acceptable and is guarded by
[§P8.3](#p83-the-grep-gate).

### P2.4 The new module

`environments.js` at the repo root exports the whole table from
[§P2.2](#p22-exactly-three-names) — one object per environment, plus the branch lookup:

```js
const ENVIRONMENTS = {
  production: {
    name: "production",
    branch: "production",
    gcpProject: "badhan-buet",
    appEngineConfig: "app.production.yaml",
    backendEnvFile: "env.production",
    backendBaseUrl: "https://badhan-buet.uc.r.appspot.com",
    firebaseProject: "badhan-buet",
    firebaseConfig: "firebase.production.json",
    frontendBaseUrl: "https://badhan-buet.web.app",
    frontendBuildScript: "build:production",
  },
  development: { /* … the development column … */ },
};

// Throws — with the list of deployable branches — rather than defaulting.
function environmentForBranch(branch) { … }
```

`local` is deliberately absent from this module: it has no deploy target, and adding it would invite
a caller to try.

One guard the sketch above does not show: the lookup rejects a branch whose name happens to be an
`Object.prototype` key. `ENVIRONMENTS["constructor"]` is truthy, so `environmentForBranch` also
requires `environment.branch === branch` before returning. Verified against `constructor`,
`toString` and `__proto__`, all refused.

### P2.5 Callers

- [upload-gcloud.js](../../badhan-backend/upload-gcloud.js): `getDeployTarget`'s branch `if` is gone;
  it is now a one-line wrapper over `environmentForBranch`, kept exported so the module's public shape
  did not change. Its three consumers (`checkRequirements`, `deployToGoogleCloud`, `liveCheck`)
  destructure the canonical field names off the returned object
  (`backendEnvFile`, `appEngineConfig`, `gcpProject`, `backendBaseUrl`).
- [upload-firebase.js](../../badhan-frontend/upload-firebase.js): same, and `configFile` now comes off
  `firebaseConfig` instead of being interpolated from the project id — the line that used to tie a
  hosting config's *file name* to a cloud project id. Its `getDeployTarget` was the **only** caller of
  the bare `build` script in the repo, and now names `build:production` — see
  [§P4.7](#p47-frontend-npm-scripts).
- Both `checkRequirements` functions wrap the lookup in a `try`/`catch` that pushes the message and
  returns early: nothing below can be checked without a target, and an unlisted branch should read as
  an unmet requirement rather than a stack trace.
- [deploy.js](../../deploy.js): prints the resolved environment before the preflight — one line,
  `🌍  Branch "production" → environment production (badhan-buet).` A deploy should say where it is
  going before it spends six minutes on tests. It resolves the branch itself and exits there, so an
  unlisted branch is reported **once**, ahead of any Docker call, rather than as the same bullet
  twice — the two upload scripts each report it too, and their copies are the guard for a direct
  `--check` invocation.
- [upload-googleplay.js](../../badhan-android/upload-googleplay.js): consumes only
  `ENVIRONMENTS.production.frontendBaseUrl`, in [P7](#phase-p7--android-is-production-only-and-says-so).

### P2.6 An unlisted branch refuses to deploy

`environmentForBranch` throws for anything that is not `production` or `development`. Both
`checkRequirements` functions catch it and push a message, so it surfaces through the existing
preflight report rather than as a stack trace:

```
❌  Deployment requirements not met:
   • branch "mahathir/#72/platelet-count" has no deploy target.
     Deployable branches: production, development.
```

Verified on a throwaway branch through all three entry points — `deploy.js` (which aborts at the
announce step, before Docker and before the test suites), `upload-gcloud.js --check` and
`upload-firebase.js --check` — each exiting non-zero with that message.

This is a **behaviour change**, and the one most likely to surprise: feature branches that used to
deploy to the development site now cannot. **Realised, intended.** That is the point — the development
site is the `development` branch's, and testing a feature branch means merging it there. Say so in the
commit message: this repo has no changelog and no release-note file, and
[§P8.4](#p84-the-commit-message-is-the-only-release-note) records that the commit message is
deliberately the whole record for a behaviour change like this one.

**Decision — no escape hatch:** no `--environment=development` override flag, no "are you sure?"
confirmation. Either would preserve the feature-branch-preview workflow, and both were considered and
rejected — an override is a second way to answer the question this plan exists to give one answer to,
and a prompt makes an unattended deploy hang. Two branches, two targets, no third path.

### P2.7 File renames

| From | To |
| --- | --- |
| `badhan-backend/app_prod.yaml` | [app.production.yaml](../../badhan-backend/app.production.yaml) |
| `badhan-backend/app_dev.yaml` | [app.development.yaml](../../badhan-backend/app.development.yaml) |
| `badhan-frontend/firebase.badhan-buet.json` | [firebase.production.json](../../badhan-frontend/firebase.production.json) |
| `badhan-frontend/firebase.badhan-buet-test.json` | [firebase.development.json](../../badhan-frontend/firebase.development.json) |

Done with `git mv`, and git recorded all four as 100% renames, so history follows. The `"site"` values
inside the Firebase configs are Firebase's own identifiers and were left exactly as they are.

**The yaml `entrypoint:` lines were deliberately left saying `npm run start:prod` / `start:dev`** —
they change with [P3](#phase-p3--the-backend-speaks-three-words)'s script rename, and moving either
half alone boots an App Engine container whose entrypoint does not exist.

The development Firebase config also picked up the same `/js/**`, `/css/**`, `/img/**` `immutable`
rules production has — the caching half of the defect in [§P5.1](#p51-what-was-found) — so the
environment that is supposed to rehearse production now rehearses its caching too. **This landed with
the config rename rather than in [P5](#phase-p5--make-the-development-site-a-pwa), where it was
listed**, because the two configs were being rewritten anyway. The last-match-wins ordering plan 14's
follow-up established is preserved: blanket `no-cache` first, the three `immutable` rules after it.
Verified by diffing the two configs with `site` blanked — they are now **identical**.

---

## Phase P3 — the backend speaks three words

> **Landed.** `local` is in the union, `NODE_ENV` is mandatory, the four scripts and both App Engine
> entrypoints moved together, and the `Test`/`Production` flavour log is gone. Verified in the
> container: `tsc --noEmit` and `npm run lint` clean; the dev stack boots saying *Connecting to the
> local database…*; an unset `NODE_ENV` and `NODE_ENV=prodcution` each exit 1 with the message
> [§P3.2](#p32-local-joins-the-union) specifies; `npm run migrate:list` with `NODE_ENV` unset still
> resolves `env.local` through `_bootstrap`; the backend suite is 217/217.
> One divergence, in [§P3.5](#p35-docs-in-this-phase).

**Depends on:** [P2](#phase-p2--one-map-environmentsjs) · **Deployable alone:** yes ·
**Reversible:** yes, independently.

The next branch cut from `production` inherits the map; the next one that lands on `production` must
be merged down to `development`, for the reason in the fourth divergence of
[§P1.3](#p13-the-rename-sequence-as-executed).

| | Today (pre-plan) | After plan 15 |
| --- | --- | --- |
| Backend `NODE_ENV=local` | works, but is cast through a type that excludes it | a first-class member of the union, validated at boot |
| Backend with `NODE_ENV` unset | silently loads `env.development` — the **shared** database | refuses to start, naming the three valid values |
| Backend npm scripts | `start:dev`, `start:prod`, `serve:dev`, `serve:prod`, `serve:local` | `start:development`, `start:production`, `serve:*` matching |

### P3.1 What was found

**The backend's environment type does not contain the environment the backend runs in.**
[dotenv/index.ts:6-17](../../badhan-backend/src/dotenv/index.ts#L6-L17) defines exactly two literals,
`'development' | 'production'`. But the dev container's entrypoint is `npx nodemon` →
[nodemon.json](../../badhan-backend/nodemon.json) → `serve:local` → `cross-env NODE_ENV=local`, and
the internal server is `NODE_ENV=local` too
([package.json:16-19](../../badhan-backend/package.json#L16-L19)). The value survives only because
line 45 casts it: `(process.env.NODE_ENV ?? …) as EnvironmentLiteral`. The union is a lie for the
single most common way the backend is run.

Consequences that follow from the same cast: an `NODE_ENV` typo (`prodcution`) does not fail — it
resolves `env.prodcution`, finds no such file, and exits with a *file not found* message that does
not say the real cause; and `isEnvironmentProduction()` is the only helper, so "is this local?"
cannot be asked at all.

### P3.2 `local` joins the union

[dotenv/index.ts](../../badhan-backend/src/dotenv/index.ts):

```ts
const ENVIRONMENT_TYPES = {
  PRODUCTION:  'production',
  DEVELOPMENT: 'development',
  LOCAL:       'local',
} as const;
type EnvironmentLiteral = typeof ENVIRONMENT_TYPES[keyof typeof ENVIRONMENT_TYPES];
```

**Decision — `NODE_ENV` becomes mandatory.** Not defaulted to `development`, not defaulted to `local`
— unset is a startup error naming the three valid values. Both the `?? ENVIRONMENT_TYPES.DEVELOPMENT`
defaults ([:21](../../badhan-backend/src/dotenv/index.ts#L21),
[:45](../../badhan-backend/src/dotenv/index.ts#L45)) and the cast on
[:45](../../badhan-backend/src/dotenv/index.ts#L45) are replaced by one check that runs **before** the
`env.<x>` file lookup:

- unset → `🛑  NODE_ENV is not set. It must be one of: production, development, local.` and exit
- set to anything else → `🛑  NODE_ENV="prodcution" is not one of: production, development, local.`
  and exit

Nothing is ever implicit, and a typo reports its actual cause instead of surfacing three lines later as
a missing-file error. It also closes the quiet hazard in today's default: an unset `NODE_ENV` currently
loads `env.development` and connects to the **shared development database**, which is never what
someone hand-running a command on their own machine means.

Checked before choosing this — nothing in the tree relies on the default:

| Entry point | Sets `NODE_ENV` | How |
| --- | --- | --- |
| dev container | yes | [nodemon.json](../../badhan-backend/nodemon.json) → `serve:local` → `cross-env NODE_ENV=local` |
| internal server | yes | `internal-server` script, `cross-env NODE_ENV=local` |
| App Engine, both environments | yes | `entrypoint: npm run start:<environment>` ([§P3.3](#p33-scripts-and-entrypoints)) |
| every migration | yes | [`_bootstrap.ts:11-13`](../../badhan-backend/scripts/migrations/_bootstrap.ts#L11-L13) defaults it to `local`, and [`migrations/index.ts:9`](../../badhan-backend/scripts/migrations/index.ts#L9) imports `./_bootstrap` as its **first** import |
| every task and report | yes | same — `import '../migrations/_bootstrap'` is the first import in [prune-active-donors.ts:26](../../badhan-backend/scripts/tasks/prune-active-donors.ts#L26), [archive-dormant-donors.ts](../../badhan-backend/scripts/tasks/archive-dormant-donors.ts) and [stale-donors.ts:32](../../badhan-backend/scripts/reports/stale-donors.ts#L32) |
| `node dist/bin/www.js` by hand | **no** | this is the one that now fails, and the one we want to fail |

`_bootstrap`'s own `NODE_ENV = 'local'` default **stays**, deliberately: it runs before `src/dotenv` is
imported, so `npm run migrate` with no flags keeps working and keeps meaning *my machine*. That is now
the single remaining implicit default in the backend, it defaults to the harmless environment, and it
should carry a comment saying both of those things.

Add `isEnvironmentDevelopment()` and `isEnvironmentLocal()` beside the existing
`isEnvironmentProduction()`, and export `NODE_ENV` as the typed literal it now is.

### P3.3 Scripts and entrypoints

[package.json](../../badhan-backend/package.json):

| From | To |
| --- | --- |
| `start:dev` | `start:development` |
| `start:prod` | `start:production` |
| `serve:dev` | `serve:development` |
| `serve:prod` | `serve:production` |
| `serve:local` | unchanged |
| `migrate_db:local` | unchanged |
| `internal-server` | unchanged (`NODE_ENV=local`, correct) |

Also fix the two `__comment_*` keys, which currently describe the GCP scripts as covering
"development and production" while omitting local. A third one was fixed alongside them:
`__comment_on_db_purge_scripts` called `migrate_db:local` a *development* script, which is a
wrong environment name rather than a missing one.

Then: `app.production.yaml` → `entrypoint: npm run start:production`, `app.development.yaml` →
`entrypoint: npm run start:development`. **These two lines are what App Engine actually executes** —
if the script rename lands without them, the next deploy boots a container whose entrypoint does not
exist. They were deliberately left alone in [§P2.7](#p27-file-renames) for the mirror-image reason:
renaming the configs without the scripts would have broken the same boot. Grep gate for it in
[§P8.3](#p83-the-grep-gate).

[nodemon.json](../../badhan-backend/nodemon.json) already execs `serve:local` — unchanged.

### P3.4 The `Test` / `Production` flavour log

[mongoose.ts:12-14](../../badhan-backend/src/db/mongoose.ts#L12-L14) infers a "flavour" by looking for
the substring `Test` in the Mongo URI, and prints `Test` or `Production` — a fourth vocabulary, and
one that reports `Production` for a local database. Replace it with the environment name we now have
typed on `dotenv.NODE_ENV`.

### P3.5 Docs in this phase

The `NODE_ENV` values appear in the runbook comments of every migration and task script
([template.ts](../../badhan-backend/scripts/migrations/template.ts),
[prune-active-donors.ts:20-32](../../badhan-backend/scripts/tasks/prune-active-donors.ts#L20-L32),
[archive-dormant-donors.ts:24-27](../../badhan-backend/scripts/tasks/archive-dormant-donors.ts#L24-L27),
[stale-donors.ts:25-29](../../badhan-backend/scripts/reports/stale-donors.ts#L25-L29),
[_bootstrap.ts:11-18](../../badhan-backend/scripts/migrations/_bootstrap.ts#L11-L18)). They already
use the full words and stay correct; re-read them for the `local` default in `_bootstrap.ts`, which is
right and should now say so.

**Divergence — `_bootstrap.ts` keeps the string literal `'local'`, not the shared constant.** The
sentence above originally asked for the constant, and that turns out to be the one place it cannot be
used: `import { ENVIRONMENT_TYPES } from '../../src/dotenv'` is hoisted, so it would *run* `src/dotenv`
— and its now-fatal `NODE_ENV` check — before the assignment that sets `NODE_ENV`, breaking exactly the
`npm run migrate` case the default exists to protect. The literal stays, and the comment above it now
says both why the default exists and why the constant is not imported there.

Report filenames embed `process.env.NODE_ENV` (`stale-donors.<env>.json`) — they keep working and
gain a `local` variant for free.

### P3.6 Risks

| Risk | Mitigation |
| --- | --- |
| App Engine boots a missing entrypoint | grep gate in [§P8.3](#p83-the-grep-gate); the deploy's own `liveCheck` catches it within 120 s and exits non-zero |
| A hand-run `node dist/bin/www.js` now exits instead of starting | intended; the error names the three valid values. Every scripted entry point already sets `NODE_ENV`, and `_bootstrap` still defaults the migration/task/report scripts to `local` |

---

## Phase P4 — the frontend speaks three words

> **Landed.** A local stack now reports `local`: the served bundle bakes
> `VUE_APP_ENVIRONMENT: "local"`, so the About page and the watermark finally distinguish a
> developer's own machine from the shared test site. `VUE_APP_ADMIN_CONSOLE_URL` and
> `isEnvironmentTesting()` are gone from the tree, `isEnvironmentLocal()` is in, and both §P8.3 greps
> for this phase return nothing. `npm run lint` clean; `build:production`, `build:development` and
> `build:local` all build; production's `dist/manifest.json` is unchanged (`theme_color` still
> `#ee0000` — that moves in [P5](#phase-p5--make-the-development-site-a-pwa)); the Cypress suite runs
> against the restarted local stack. Four divergences, in
> [§P4.3](#p43-the-mixin) and [§P4.6](#p46-remove-vue_app_admin_console_url-entirely).

**Depends on:** [P2](#phase-p2--one-map-environmentsjs) · **Deployable alone:** yes ·
**Reversible:** yes, independently.

One consequence of the unification is a goal in its own right and is called out as such:
**`VUE_APP_ADMIN_CONSOLE_URL` and everything reachable from it is removed**
([§P4.6](#p46-remove-vue_app_admin_console_url-entirely)) — three env files, a mixin field, a getter,
and an interface method, all maintaining a URL to an app that now lives in
[archive/badhan-admin-frontend/](../../archive/badhan-admin-frontend/) and that nothing in the running
frontend has ever called.

| | Today (pre-plan) | After plan 15 |
| --- | --- | --- |
| Frontend `local` build | reports `VUE_APP_ENVIRONMENT=development` | reports `local` |
| `isEnvironmentTesting()` | matches `'testing'`, which nothing sets — dead | **deleted** |
| Frontend npm scripts | `build` (means production, implicitly), `build:development`, `serve:local` | `build:production`, `build:development`, `build:local`; bare `build` kept as an alias |
| `VUE_APP_ADMIN_CONSOLE_URL` | set in all three env files, **zero callers**, points at an archived app | **removed entirely** — env files, mixin field, getter, interface |

### P4.1 What was found

**`VUE_APP_ADMIN_CONSOLE_URL` is dead, wrong in two of three files, and points at an archived app.**
`getAdminFrontendBaseURL()` ([environment.ts:62-64](../../badhan-frontend/src/mixins/environment.ts#L62-L64))
has **zero callers** in `badhan-frontend/src` — confirmed by
`grep -rn "getAdminFrontendBaseURL\|ADMIN_CONSOLE" badhan-frontend/src`, which returns only the five
lines that define it. It is also absent from [mixins/index.ts](../../badhan-frontend/src/mixins/index.ts),
so it is not even exposed to templates as a `$`-method.

Meanwhile the variable it reads is set to `http://localhost:3000` in both `.env.development` and
`.env.local` — which is the *backend*, not any admin console — and to `https://badhan-admin.web.app/`
in production. That production URL is the admin console whose source now sits in
[archive/badhan-admin-frontend/](../../archive/badhan-admin-frontend/): a retired React app, with its
own retired Heroku API (`badhan-admin-api.herokuapp.com`), whose backup/restore screen was replaced by
[BackupRestore.vue](../../badhan-frontend/src/views/BackupRestore.vue) and the internal server on port
4000.

So: three env files maintaining a value nothing reads, two of them pointing at the wrong service and
the third at a decommissioned one.

**The frontend has a `local` build mode that reports itself as `development`** — the third row of the
survey in [§P2.1](#p21-what-was-found), and the reason a developer cannot tell their own stack from
the shared test site from inside the app.

### P4.2 `.env` files

| File | Change |
| --- | --- |
| [.env.local](../../badhan-frontend/.env.local) | `VUE_APP_ENVIRONMENT=local` (was `development`); drop `VUE_APP_ADMIN_CONSOLE_URL` |
| [.env.development](../../badhan-frontend/.env.development) | drop `VUE_APP_ADMIN_CONSOLE_URL`; fix `VUE_APP_FRONTEND_BASE`'s trailing slash so it matches the other two (see [PersonDetails.vue:893](../../badhan-frontend/src/components/PersonDetails.vue#L893), which strips it at runtime because of exactly this) |
| [.env.production](../../badhan-frontend/.env.production) | drop `VUE_APP_ADMIN_CONSOLE_URL` |

`NODE_ENV` stays as each file sets it — `.env.local` deliberately builds in development mode
(unminified, with devtools) while calling itself the `local` *environment*. After this phase
`NODE_ENV` and `VUE_APP_ENVIRONMENT` are no longer redundant: the first is the webpack build flavour,
the second is which deployment this is. Say so in a comment at the top of each file, because the
difference is exactly the thing that made `local` invisible.

The trailing-slash strip in `PersonDetails.vue` **stays** as defensive code — the env file is fixed at
the source, and the runtime guard costs nothing and protects the next hand-edit.

### P4.3 The mixin

[environment.ts](../../badhan-frontend/src/mixins/environment.ts):

- Delete `isEnvironmentTesting()` — dead ([§P5.1](#p51-what-was-found)).
- Add `isEnvironmentLocal()`.
- Remove everything admin-console — the full list is
  [§P4.6](#p46-remove-vue_app_admin_console_url-entirely).
- Replace the `undefined` warning loop with a hard check on `VUE_APP_ENVIRONMENT`: if it is not one of
  the three, log it loudly. A frontend cannot `process.exit`, but a bundle built with a misspelled
  environment should not look healthy.

**Divergence — [registerServiceWorker.ts:16](../../badhan-frontend/src/registerServiceWorker.ts#L16)
had to change in P4, not only in [P5](#phase-p5--make-the-development-site-a-pwa).** It is the sole
caller of `isEnvironmentTesting()`, so deleting the helper here without touching that line would not
compile. P4 drops the dead half of the condition and leaves
`if (environmentService.isEnvironmentProduction())` — behaviour identical to today, because the second
half never matched anything ([§P5.1](#p51-what-was-found)). P5 still owns the actual behaviour change,
and its one-line edit is now `isEnvironmentProduction()` → `!isEnvironmentLocal()`.

**Divergence — the `undefined` warning loop stays, and the hard check is added beside it.** Replacing
the loop outright would have dropped the only "is it defined?" check on
`VUE_APP_BADHAN_API_BASE_URL`, `VUE_APP_FRONTEND_BASE` and `NODE_ENV`, which this phase has no reason
to weaken. What the plan asked for is what landed for the variable it names: `VUE_APP_ENVIRONMENT` is
no longer merely warned about when undefined — it is checked against the three names, and a
misspelling says so.
- Keep the `window.Cypress` override in `getAPIBaseURL()` untouched — it is orthogonal, and correctly
  commented ([:50-58](../../badhan-frontend/src/mixins/environment.ts#L50-L58)).

### P4.4 What the user sees

- [EnvironmentWatermark.vue:12](../../badhan-frontend/src/components/AppShell/EnvironmentWatermark.vue#L12) —
  `!== 'production'` still behaves correctly for all three, but route it through
  `environmentService.isEnvironmentProduction()` rather than reading `process.env` directly, so there
  is one place that knows the string. It will now render `local` on a local stack, which is the
  visible payoff of this phase.
- [SignInCover.vue:39](../../badhan-frontend/src/views/SignInCover.vue#L39) —
  `$getEnvironmentName()==="production"?"production":$getEnvironmentName()` returns its input in both
  branches. Replace with `$getEnvironmentName()`.
- [About.vue:17](../../badhan-frontend/src/views/About.vue#L17) — unchanged; it will start showing
  `local` where it used to show `development`. The manual's "Build" row
  ([02-getting-the-app.md:63](../manual/02-getting-the-app.md#L63)) needs the third value named.

[index.html](../../badhan-frontend/public/index.html) carries no environment marker at all — the
`data-build-timestamp-utc` attribute is the only build-identifying thing on the page. Left that way
deliberately: the watermark and the PWA label ([§P5.3](#p53-per-environment-pwa-identity)) already
answer "which environment is this?" for both a human and an installed icon, and a third marker would
be a fourth place to keep in sync.

### P4.5 Cypress

[cypress.config.ts](../../badhan-frontend-test/cypress.config.ts) reads `APP_API_BASE_URL`,
`CYPRESS_BASE_URL`, `API_BASE_URL` — all host/URL knobs, no environment names. Nothing to rename. The
suite runs against the `local` environment; note that in the file header so nobody adds a
`VUE_APP_ENVIRONMENT=testing` to make an assertion pass.

### P4.6 Remove `VUE_APP_ADMIN_CONSOLE_URL` entirely

Not "stop setting it" — **remove the variable and every line that exists because of it**. Five
definition sites, three env files, nothing else in the live tree
([§P4.1](#p41-what-was-found)):

| Where | Delete |
| --- | --- |
| [.env.production](../../badhan-frontend/.env.production) | the `VUE_APP_ADMIN_CONSOLE_URL=https://badhan-admin.web.app/` line |
| [.env.development](../../badhan-frontend/.env.development) | the `VUE_APP_ADMIN_CONSOLE_URL=http://localhost:3000` line |
| [.env.local](../../badhan-frontend/.env.local) | the `VUE_APP_ADMIN_CONSOLE_URL=http://localhost:3000` line |
| [environment.ts:7](../../badhan-frontend/src/mixins/environment.ts#L7) | the `readonly VUE_APP_ADMIN_CONSOLE_URL: string` field on `EnvironmentInterface` |
| [environment.ts:18](../../badhan-frontend/src/mixins/environment.ts#L18) | the `VUE_APP_ADMIN_CONSOLE_URL: process.env.…` entry in `environmentObject` |
| [environment.ts:35](../../badhan-frontend/src/mixins/environment.ts#L35) | the `getAdminFrontendBaseURL: () => string` member of `EnvironmentServiceInterface` |
| [environment.ts:62-64](../../badhan-frontend/src/mixins/environment.ts#L62-L64) | the `getAdminFrontendBaseURL` implementation |

Deliberately **not** touched:

- `"Admin Console"` in [contributors.json:27](../../badhan-frontend/src/data/contributors.json#L27) —
  a contributor's role, a historical credit, unrelated to the variable. It is the only trace of the
  string anywhere else in the live tree.
- [archive/badhan-admin-frontend/](../../archive/badhan-admin-frontend/) — the archive is the record of
  what the console was. Removing the *live* pointer is the point; deleting the archive would destroy
  the only explanation of why the pointer existed.

There is no route, no link, and no redirect to remove: the old `#/adminconsole` entry point documented
in [archive/badhan-admin-frontend/README.md:19](../../archive/badhan-admin-frontend/README.md#L19)
does not exist in the router. There is nothing to migrate and no caller to update, so this is pure
deletion with no behavioural surface. Verify with the grep in [§P8.3](#p83-the-grep-gate): after this
phase, `grep -rni "admin_console\|adminconsole\|getAdminFrontendBaseURL\|badhan-admin" badhan-frontend/src`
returns nothing at all.

**Divergence — there was a sixth site, and it was a live link.**
[BackupRestore.vue:31](../../badhan-frontend/src/views/BackupRestore.vue#L31) pointed its "setup docs"
link, shown when the backup server cannot be reached, at
`github.com/Badhan-BUET-Zone/badhan-admin-frontend` — the archived console's repo, which does not
document the internal server the message is about. The seven-row table above did not list it, and the
§P8.3 gate would have failed on it. It now points at this repo's README §Run the Code, which is where
`docker compose up` and port 4000 are actually documented.

**Also fixed while here — two comments that named environments wrongly.**
[PersonDetails.vue](../../badhan-frontend/src/components/PersonDetails.vue)'s trailing-slash rationale
said `VUE_APP_FRONTEND_BASE` "carries one in the development environment and not in production", which
[§P4.2](#p42-env-files) has just made false; the strip stays as defensive code, and the comment now
says so. [qrUrl.ts](../../badhan-frontend/src/views/FeedbackQr/qrUrl.ts) warned about "a dev or staging
host" — two spellings that are not among the three, one of them naming an environment that has never
existed here.

If the admin console is ever rebuilt, it comes back as a route or a link in the app, with its base URL
resolved the same way every other URL in [§P2.2](#p22-exactly-three-names) is — not as a fourth env
var that three files carry and no code reads. Do not fix its per-environment values; remove it.

### P4.7 Frontend npm scripts

The frontend has the same gap the backend has, in the opposite direction: two of its three
environments are named in [package.json](../../badhan-frontend/package.json) and production is the
unnamed default. `build` is `vue-cli-service build` with no `--mode`, which Vue CLI resolves to
`production` — so the environment that matters most is the one no script mentions.

| From | To |
| --- | --- |
| `build` (implicitly production) | `build:production` — `vue-cli-service build --mode production` |
| `build:development` | unchanged |
| — | `build:local` — `vue-cli-service build --mode local` |
| `serve:local` | unchanged |
| `serve:production` | unchanged, but comment it: it is *not* a deploy: it builds and serves `dist` over `http-server` on this machine. The only script in either app whose name is an environment but whose meaning is a local convenience |
| `serve` | unchanged (Vue CLI's own dev-server default) |

**Decision — bare `build` stays, as a one-line alias for `build:production`.** Deleting it was
considered — it would make every build name its environment, matching the mandatory-`NODE_ENV`
decision in [§P3.2](#p32-local-joins-the-union) — and rejected: `npm run build` is what a Vue CLI
project is expected to answer to, and it is what any tool, README snippet or muscle-memory command
outside this repo will reach for. An alias costs one line and cannot drift, because it is defined *as*
`npm run build:production` rather than as a second copy of the command. That is also why the risk of
`npm run build` diverging from `build:production` **cannot** materialise.

The repo has exactly one caller of bare `build` today — `upload-firebase.js`'s production branch,
[§P2.5](#p25-callers) — and it moves to the explicit name. `build:local` has no caller yet; it exists
so the third environment is buildable by name rather than only servable, and so
[§P5.4](#p54-acceptance--the-development-site-is-a-pwa) can produce a `local` bundle to confirm the
service worker stays unregistered there.

**`build:production` and `build:local` landed early, with [P2](#phase-p2--one-map-environmentsjs)**:
`environments.js` names `build:production` as production's build script, and the script did not exist
yet. Bare `build` is already an alias, and `build:production` was verified to produce a
byte-identical `dist/manifest.json` (`index.html` differs only by its injected build timestamp). What
remained for P4 was the two comments — `serve:production` and the bare-`build` alias — and both are now
`__comment_*` keys in [package.json](../../badhan-frontend/package.json), matching how the backend
annotates its own scripts.

---

## Phase P5 — make the development site a PWA

**Depends on:** [P4](#phase-p4--the-frontend-speaks-three-words) · **Deployable alone:** yes ·
**Reversible:** yes, independently · **Status:** not started. This is the only phase a user can
perceive.

Today only production is a Progressive Web App. Development ships a manifest and icons, so a browser
will offer to install it, but the installed result has **no service worker** — no offline cache, no
precached shell, no update-and-reload, no background revalidation. Every one of those behaviours
therefore has exactly one testing environment: production, after release.

**The goal of this phase is that the development site is a PWA in the same sense production is** —
same registration, same worker, same update flow, same cache headers underneath it — differing only in
name, data, and the watermark. After P5, "install the dev app on your phone and check the update path"
is a thing a reviewer can actually be asked to do. "Same app, different data" is the point of having a
development environment; right now the two differ in the one layer that is hardest to debug after
release.

| | Today (pre-plan) | After plan 15 |
| --- | --- | --- |
| Is the development site a PWA? | **no** — installable manifest, but no service worker, no offline cache, no update flow | **yes — a full PWA, the same one production is** |
| Service worker | registers in `production` only | registers in `production` **and** `development`; never in `local` |
| Installed PWA identity | `Badhan` in every environment | `Badhan` in production, `Badhan (development)` in development |

### P5.1 What was found

**The service worker never runs outside production — a live PWA defect.**
[registerServiceWorker.ts:16](../../badhan-frontend/src/registerServiceWorker.ts#L16):

```ts
if (environmentService.isEnvironmentProduction() || environmentService.isEnvironmentTesting()) {
```

`isEnvironmentTesting()` compares `VUE_APP_ENVIRONMENT` against `'testing'`. No `.env` file in the
repo sets that value — [.env.development](../../badhan-frontend/.env.development) and
[.env.local](../../badhan-frontend/.env.local) both say `development`,
[.env.production](../../badhan-frontend/.env.production) says `production`. The second half of that
condition is dead, and has been since the value was renamed.

The result is that **the deployed development site is not a PWA**: no service worker, no offline
cache, no install prompt, no update-and-reload flow — none of which can be tested before it ships to
production. The one screen that exercises the update path
([registerServiceWorker.ts:29-45](../../badhan-frontend/src/registerServiceWorker.ts#L29-L45), which
force-reloads the page when a new worker activates) is only ever exercised by real users.

This interacts with the cache-header work recorded in plan 14's follow-up: the development Firebase
config (then `firebase.badhan-buet-test.json`, now
[firebase.development.json](../../badhan-frontend/firebase.development.json)) had only the blanket
`no-cache` rule, while production (then `firebase.badhan-buet.json`, now
[firebase.production.json](../../badhan-frontend/firebase.production.json)) added the three
`immutable` rules for `/js/**`, `/css/**`, `/img/**`. So the two environments differed in *both* the
service worker and the caching headers — the two things that most need a rehearsal before production.
**The caching half of this is fixed**: [§P2.7](#p27-file-renames) landed the three `immutable` rules
on development, and the two configs now differ only in `site`. The service-worker half is
[§P5.2](#p52-register-the-service-worker-everywhere-except-local).

**The PWA manifest is identical in every environment.**
[vue.config.js:3-10](../../badhan-frontend/vue.config.js#L3-L10) hardcodes `name: "Badhan"`,
`short_name: "Badhan"`, `themeColor: "#ee0000"` for every build. Install the development site and
the production site on the same device and you get two icons with the same label and the same colour;
the only way to tell them apart is to open one. (Distinct origins mean they do not *collide* — but
they are indistinguishable, which is what matters to whoever is testing.)

`themeColor` is also `#ee0000` in the web manifest and `#B71C1C` in
[twa-manifest.json:7](../../badhan-android/twa-manifest.json#L7), so the browser splash and the
Android splash are different reds.

### P5.2 Register the service worker everywhere except `local`

[registerServiceWorker.ts:16](../../badhan-frontend/src/registerServiceWorker.ts#L16):

```ts
if (!environmentService.isEnvironmentLocal()) {
```

One character of logic, and the development site becomes a PWA. Concretely, it gains:

| Capability | Comes from | Testable on development after P5 |
| --- | --- | --- |
| Precached app shell, offline load | Workbox's generated `service-worker.js` (`@vue/cli-plugin-pwa` already emits it on every build — it was only never registered) | yes |
| Installability with a *working* offline story | manifest + a registered worker with a fetch handler | yes |
| "New content is available" → `skipWaiting` → auto-reload | [registerServiceWorker.ts:29-45](../../badhan-frontend/src/registerServiceWorker.ts#L29-L45) | **yes — this is the one that has never been rehearsed** |
| Offline/online lifecycle logging | [:46-48](../../badhan-frontend/src/registerServiceWorker.ts#L46-L48) | yes |
| Cache-header interaction (immutable hashed assets vs `no-cache` index) | the development Firebase config, aligned in [§P2.7](#p27-file-renames) | yes |

The worker file itself needs no new work: `@vue/cli-plugin-pwa` has been generating it into `dist/` for
every environment all along. Nothing has been asking the browser to install it.

Local keeps none of it, which is right: a service worker over a webpack dev server serves stale
bundles and is the single most confusing thing a new contributor can hit.

**This changes behaviour on the deployed development site.** Anyone with that site open gets a worker
installed on their next visit and, from then on, the force-reload-on-update path. Because
`skipWaiting` + `window.location.reload()` fires on activation
([:40-45](../../badhan-frontend/src/registerServiceWorker.ts#L40-L45)), the first post-deploy load
after this ships will reload itself once. Expected, harmless, and named in P5's commit message
([§P8.4](#p84-the-commit-message-is-the-only-release-note)) — it is the one thing about this phase a
bystander could otherwise read as a bug.

Pair it with the development cache headers from [§P2.7](#p27-file-renames) — a service worker in
front of a blanket `no-cache` origin is not the configuration production runs, and rehearsing the
wrong configuration is barely better than not rehearsing.

### P5.3 Per-environment PWA identity

[vue.config.js](../../badhan-frontend/vue.config.js) is plain CommonJS evaluated at build time, so it
can read `process.env.VUE_APP_ENVIRONMENT` directly:

```js
const isProduction = process.env.VUE_APP_ENVIRONMENT === 'production'
// …
const appName = isProduction ? 'Badhan' : 'Badhan (development)'
// …
pwa: {
  name: appName,
  themeColor: '#B71C1C',
  manifestOptions: {
    name: appName,
    short_name: appName,
  },
}
```

`short_name` carries the full word too, per [§P2.2](#p22-exactly-three-names) — no sanctioned
abbreviation, and a launcher caption truncated to *Badhan (deve…* is still unmistakably not
production. Do not "fix" it later by shortening `short_name` alone; that reintroduces `dev` as a
spelling.

The branch is `isProduction`, not a three-way switch, so a `local` build also emits
`Badhan (development)` in its manifest. That is why [§P2.2](#p22-exactly-three-names) records the local
PWA name as `—` rather than as a value: `local` never registers a worker
([§P5.2](#p52-register-the-service-worker-everywhere-except-local)), so its manifest is never the
identity of anything installed. A third label would be a string nobody can ever see.

Production's manifest values must come out **byte-identical to today**, with exactly one intended
exception: an installed PWA's name and theme colour are user-visible, and changing them re-labels the
icon on every phone that has it.

**Decision — that one exception is `themeColor`, moving from `#ee0000` to `#B71C1C`**: the web manifest
adopts the TWA's darker red, not the reverse, so the browser chrome, the PWA splash and the Android
splash finally agree. Decided this direction because it ships with an ordinary frontend deploy:
aligning the other way would mean a bubblewrap rebuild, a version-code bump and a Play review before
anyone saw it, with web and Android disagreeing throughout.
[twa-manifest.json](../../badhan-android/twa-manifest.json) is therefore **not** edited by this plan —
it is already correct, and [P7](#phase-p7--android-is-production-only-and-says-so) asserts it stays
that way.

Verify by diffing `dist/manifest.json` before and after a production build: `theme_color` is the only
line allowed to move.

### P5.4 Acceptance — "the development site is a PWA"

Build-time, from the repo root:

```
docker compose run --rm --no-deps frontend sh -c "npm run build:production  && cat dist/manifest.json"
docker compose run --rm --no-deps frontend sh -c "npm run build:development && cat dist/manifest.json"
```

Production's manifest must be byte-identical to a pre-change build except for `theme_color`; the
development one must differ only in `name` / `short_name`. Both must list the same icon set. Capture
the pre-change baseline with `npm run build` on the current tree *before*
[§P4.7](#p47-frontend-npm-scripts) renames it — the two commands must produce the same bytes across the
rename, which is the check that `build:production` really is what `build` was.

Then deploy development and walk the checklist in a browser — **all six must pass**, and the same six
must still pass on production:

1. DevTools → Application → **Service Workers**: one worker, status *activated and is running*.
2. Application → **Manifest**: `Badhan (development)`, icons resolve, no manifest errors.
3. Application → **Cache Storage**: a Workbox precache populated with the hashed JS/CSS.
4. Network → **Offline**, reload: the app shell renders instead of the browser's offline page.
5. Install it (desktop omnibox or Android "Add to home screen"); it launches standalone, labelled
   `Badhan (development)` — truncated under the icon on Android, in full in the app switcher and the
   install prompt — and distinguishable from an installed production `Badhan` on the same device.
6. Deploy again, then reload the installed app: the console logs *"New content is available"* and the
   page reloads itself once, landing on the new build. **This is the path that has never had a
   rehearsal environment** — it is the reason this phase exists.

On a local stack (`docker compose up`, `http://localhost:8080`): Application → Service Workers is
empty, and stays empty across reloads. Confirm the same for a *built* local bundle —
`npm run build:local` ([§P4.7](#p47-frontend-npm-scripts)) then serve `dist` — since that is the one
local configuration close enough to a deploy to accidentally register one.

### P5.5 Manual

[02-getting-the-app.md](../manual/02-getting-the-app.md) documents installing the app and the About
page's "Build" row. It needs: the third value (`local`), and the fact that a test copy now installs
as **Badhan (development)** — which may appear truncated under the home-screen icon, and is precisely
the signal the manual's existing warning ("If it says
anything else, you are on a test copy and the information in it may not be real") wants.

### P5.6 Risks

| Risk | Mitigation |
| --- | --- |
| Development site self-reloads once after P5 | expected; named in P5's commit message ([§P8.4](#p84-the-commit-message-is-the-only-release-note)) |
| A stale development worker survives a bad deploy and keeps serving the old shell — now possible on development because it was always possible on production | the same escape hatch production has: DevTools → Application → Service Workers → *Unregister*, then hard reload. Item 6 of [§P5.4](#p54-acceptance--the-development-site-is-a-pwa) exists to catch it before production |
| Production PWA gets re-labelled | diff `dist/manifest.json` against a pre-change production build; the production strings must be identical |
| Installed dev PWA caption is truncated to *Badhan (deve…* | accepted; the label still reads as not-production, and the full string shows in the install prompt and app switcher |

---

## Phase P6 — backup/restore uses the same three words

**Depends on:** [P3](#phase-p3--the-backend-speaks-three-words),
[P4](#phase-p4--the-frontend-speaks-three-words) · **Deployable alone:** yes (internal tool) ·
**Reversible:** yes, independently · **Status:** not started.

| | Today (pre-plan) | After plan 15 |
| --- | --- | --- |
| Backup/restore on the wire | `?production=true`, `?development=true`, or nothing | `?environment=production\|development\|local`, **required** |

### P6.1 What was found

**Backup/restore names the environments a third way.**

- Wire: `POST /restore/:date?production=true`, `?development=true`, or neither (⇒ local) —
  [internalRoutes/index.ts:229-235](../../badhan-backend/src/internalRoutes/index.ts#L229-L235),
  [:356](../../badhan-backend/src/internalRoutes/index.ts#L356)
- Frontend calls: [BackupRestore.vue:271](../../badhan-frontend/src/views/BackupRestore.vue#L271),
  [:287](../../badhan-frontend/src/views/BackupRestore.vue#L287),
  [:304](../../badhan-frontend/src/views/BackupRestore.vue#L304)
- Buttons: "Restore to Local" / "Restore to Test" / "Restore to Production" — and the row-level
  variant says "Restore Test" while the latest-backup one says "Restore to Test"
- Toast: "restored backup to test environment"
- Manual: [16-super-admin-tools.md:48-59](../manual/16-super-admin-tools.md#L48-L59) says "Restore to
  Local or Test"

"Test" here means the `development` environment. A boolean-per-environment wire format also has an
undefined state (`?production=true&development=true`), currently resolved by the order of two `if`s.

### P6.2 One parameter

`POST /restore/:date?environment=production|development|local`, validated with the same
`express-validator` chain style already in
[internalRoutes/index.ts](../../badhan-backend/src/internalRoutes/index.ts) — `.exists()` then
`.isIn([...])`, rejecting both a missing value and an unknown one with the existing
`BadRequestError400`, whose message names the three valid values. That removes the undefined
`?production=true&development=true` state *and* the implicit "no flag means local".

**Decision — the parameter is required; it does not default to `local`.** Defaulting was the obvious
translation of today's behaviour and is rejected for the same reason `NODE_ENV` becomes mandatory in
[§P3.2](#p32-local-joins-the-union): a destructive operation should not infer its target. Restore
overwrites a database, the request is one URL away from naming production, and "I forgot the
parameter" and "I meant local" are indistinguishable to the server. The two rules also have to agree,
because they are the same rule — a plan that makes an unset `NODE_ENV` fatal while letting a restore
silently pick an environment would be teaching two lessons. It costs one explicit parameter in the
local-restore handler and nothing else.

Nothing has to migrate: [BackupRestore.vue](../../badhan-frontend/src/views/BackupRestore.vue) is the
only client, it has a distinct handler per target ([§P6.1](#p61-what-was-found)), and each will send
the parameter explicitly. The cost falls entirely on a hand-rolled `curl` against the internal server —
which is exactly the caller that should be made to say where it is pointing.

`restoreController` ([:229-235](../../badhan-backend/src/internalRoutes/index.ts#L229-L235)) takes one
`environment` argument and selects from a `{ production, development, local }` URI record built from
the three `readMongoUriFromEnvFile` calls at
[:33-35](../../badhan-backend/src/internalRoutes/index.ts#L33-L35) — which already read
`env.production` / `env.development` / `env.local` and so already match the target names.

The internal server is not mounted publicly and is only ever called by the local frontend, so a
straight cut with no compatibility shim is fine — but P6 must ship the backend and frontend halves in
the same change.

### P6.3 Labels

[BackupRestore.vue](../../badhan-frontend/src/views/BackupRestore.vue): "Restore to Test" and the
row-level "Restore Test" both become **"Restore to Development"**; `restoreToTestFlagsArray` →
`restoreToDevelopmentFlagsArray`; `handleRestoreToTest` → `handleRestoreToDevelopment`; the toast
"restored backup to test environment" → "…to development environment". "Restore to Local" and "Restore
to Production" are already right as labels — but the local handler
([:271](../../badhan-frontend/src/views/BackupRestore.vue#L271)) currently relies on sending *no* flag,
so it is the one call site that changes behaviourally: it must now send `?environment=local`
explicitly ([§P6.2](#p62-one-parameter)).

### P6.4 Manual

[16-super-admin-tools.md](../manual/16-super-admin-tools.md) — the restore table
([:48](../manual/16-super-admin-tools.md#L48)) and the warning that says "Restore to Local or Test
first" ([:59](../manual/16-super-admin-tools.md#L59)). Same change in
[README.md:292](../../README.md#L292), which says "restore any backup to the local, test or production
environment".

### P6.5 Risks

| Risk | Mitigation |
| --- | --- |
| A `curl` against the internal restore route now 400s | intended; the error names the three values. The only real client sends the parameter on every call |

---

## Phase P7 — Android is production-only, and says so

**Depends on:** [P2](#phase-p2--one-map-environmentsjs) · **Deployable alone:** yes ·
**Reversible:** yes, independently · **Status:** not started.

| | Today (pre-plan) | After plan 15 |
| --- | --- | --- |
| Android / TWA | production host hardcoded, unverified | production-only **by design**, asserted against the production frontend base |

### P7.1 What was found

**Android is production-only, and nothing says so.**
[twa-manifest.json](../../badhan-android/twa-manifest.json) hardcodes `badhan-buet.web.app` in five
places (`host`, `iconUrl`, `maskableIconUrl`, `webManifestUrl`, `fullScopeUrl`), and
[upload-googleplay.js](../../badhan-android/upload-googleplay.js) never reads the branch — it builds
the same production shell from any branch, on any day. Its header comment mentions this in passing
("the TWA is only a shell around https://badhan-buet.web.app"), but no check enforces it.

That is a defensible design — a second Play listing needs a second `packageId`, a second signing key,
a second store entry, and a separate review queue — but it must become an *explicit, asserted*
decision rather than an accident of a hardcoded string. If someone points the production frontend at
a new domain, nothing today tells them the Android app still points at the old one.

Related, and worth noting while we are in this file: `signingKey.path` is a stale Windows path
(`C:\Users\mahat\…`), already worked around in
[upload-googleplay.js:161-163](../../badhan-android/upload-googleplay.js#L161-L163).

### P7.2 The assertion

No Android build variants, no second Play listing, no `development` TWA. The reasoning belongs in the
repo rather than in someone's memory: a second listing needs its own `packageId`, its own signing key,
its own store entry and its own review queue, to shell a site that a browser can already open. The
cost is real and the benefit is a second icon.

What P7 adds is the assertion that the decision stays true:

- `upload-googleplay.js` gains a preflight check that every `badhan-buet.web.app` occurrence in
  [twa-manifest.json](../../badhan-android/twa-manifest.json) (`host`, `iconUrl`, `maskableIconUrl`,
  `webManifestUrl`, `fullScopeUrl`) matches `ENVIRONMENTS.production.frontendBaseUrl` from
  [`environments.js`](#p24-the-new-module). If production's URL ever moves, the Play upload fails with
  a message naming the file and the field — instead of shipping an app pointed at a dead host.
- The header comment gets one added line: *Android has no development environment. This always builds
  the production shell, from any branch.*
- A note in the Android README, and in the manual's
  [02-getting-the-app.md](../manual/02-getting-the-app.md): the Play Store app is always the
  production app; a test copy is reachable only through the browser.

The unrelated `signingKey.path` Windows staleness ([§P7.1](#p71-what-was-found)) is already worked
around and is left alone — fixing it here would mix an unrelated change into a vocabulary plan.

---

## Phase P8 — docs

**Depends on:** all phases · **Deployable alone:** — · **Status:** not started.

### P8.1 One reference table

Add the [§P2.2](#p22-exactly-three-names) table to [README.md](../../README.md), directly above the
deploy section, and replace the parenthetical at [:205](../../README.md#L205) with a pointer to it.
That table is the artefact this whole plan exists to produce: one place that answers "which URL, which
database, which project, which branch" for all three environments.

### P8.2 Manual

Every manual change is folded into the phase that causes it — [§P5.5](#p55-manual) for the app identity
and the About row, [§P6.4](#p64-manual) for the restore labels,
[P7](#phase-p7--android-is-production-only-and-says-so) for the Play Store note — per the rule in
[CLAUDE.md](../../CLAUDE.md). P8 is the final read-through that catches what the phases missed:
[04-roles-and-permissions.md](../manual/04-roles-and-permissions.md) and
[16-super-admin-tools.md](../manual/16-super-admin-tools.md) are the two most likely to name an
environment in passing.

### P8.3 The grep gate

**Decision — a manual checklist, run by hand, living here.** Extracting it into a
`check-environments.sh` that `deploy.js`'s preflight calls was considered and rejected: this is a
one-time sweep confirming a rename finished, not an invariant worth paying for on every deploy. The
grep for `"main"` alone would flag a legitimate future use of that word, and a preflight check that
someone eventually has to suppress is worse than no check. If this vocabulary needs enforcing again, it
means it drifted, and a fresh sweep is the honest response.

Run once P1–P7 have all landed, before [P9](#phase-p9--push-any-changed-secrets-last). Every line
below should return nothing:

```
# no old branch names
grep -rn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive \
  --exclude-dir=implemented -E "test-branch|\"main\"|'main'" .

# no abbreviations or fourth names
grep -rn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive \
  -E "app_(dev|prod)\.yaml|serve:(dev|prod)\b|start:(dev|prod)\b|'testing'|firebase\.badhan-" .

# the admin console is gone from the live tree  (P4.6)
grep -rni "admin_console\|adminconsole\|getAdminFrontendBaseURL\|badhan-admin" \
  badhan-frontend/src badhan-frontend/.env.* badhan-backend/src

# no abbreviated PWA label survived  (P5.3 / P2.2)
grep -rn --exclude-dir=node_modules --exclude-dir=dist "Badhan (dev)" badhan-frontend

# App Engine entrypoints match the scripts that exist  (P3.3 — the one that bites silently)
grep -h entrypoint badhan-backend/app.*.yaml
grep -E '"start:(production|development)"' badhan-backend/package.json

# every frontend build names its environment, and bare `build` is an alias  (P4.7)
grep -E '"build(:production|:development|:local)?"' badhan-frontend/package.json
grep -rn "run build\"" badhan-frontend/upload-firebase.js     # empty — it calls build:production

# restore names its target; no boolean flags left  (P6.2)
grep -rn "production=true\|development=true" badhan-backend/src badhan-frontend/src

# README images survived the rename
grep -c "badhan/production/docs/images" README.md      # 15
grep -c "badhan/main" README.md                        # 0
```

`docs/plans/implemented/` is excluded throughout: implemented plans record what was true when they
were written and are not rewritten.

### P8.4 The commit message is the only release note

**Decided.** This repo has no changelog, no `.github/`, and no release-notes file, and this plan does
not create one. The two changes a bystander could read as a bug — feature branches refusing to deploy
([§P2.6](#p26-an-unlisted-branch-refuses-to-deploy)) and the development site reloading itself once
after P5 ([§P5.2](#p52-register-the-service-worker-everywhere-except-local)) — are described in the
commit message of the phase that causes them. A `docs/blog/` entry was considered and rejected: that
directory holds conventions that stay true, not events, and a one-off announcement would rot there.

---

## Phase P9 — push any changed secrets, last

**Depends on:** all phases · **Deployable alone:** — · **Status:** not started.

The secret env files are the one part of the ecosystem this repo cannot see: `env.production`,
`env.development` and `env.local` are gitignored
([badhan-backend/.gitignore](../../badhan-backend/.gitignore)) and are fetched from the secrets repo
for the duration of a deploy, then deleted
([upload-gcloud.js:111-130](../../badhan-backend/upload-gcloud.js#L111-L130)). A refactor that renamed
a key in those files without pushing the new version would pass every check here and then fail at
boot, in production, after both test suites had gone green — because
[dotenv/index.ts](../../badhan-backend/src/dotenv/index.ts) exits on any missing key.

So P9 runs **after** the refactor, and its first job is to establish whether it has any work at all.

### P9.1 What was found

**The secrets repos disagree — noted, and deliberately out of scope.** Three scripts clone a secrets
repo, and they do not agree on which one or which branch:

| Script | Repo | Branch |
| --- | --- | --- |
| [upload-gcloud.js:15-17](../../badhan-backend/upload-gcloud.js#L15-L17) | `mirmahathir1/secrets` | `master` |
| [upload-googleplay.js:29-31](../../badhan-android/upload-googleplay.js#L29-L31) | `Badhan-BUET-Zone/secrets` | `main` |
| [fetch-backup-secrets.js:19-22](../../badhan-backend/scripts/fetch-backup-secrets.js#L19-L22) | `Badhan-BUET-Zone/secrets` | `main` |

**Decision — leave all of it alone.** Those are other repositories; consolidating them is a separate
job with its own access and ownership questions, and mixing it into a vocabulary refactor would mean a
plan that cannot be reverted without touching credentials. The three constants keep their current
values, in their current files — `master` included. This is recorded so the divergence is on the record
rather than rediscovered.

What the secrets repos *do* get from this plan is the rest of this phase, which runs **after** the
refactor and answers one narrow question: did any key that lives in a secret env file change, and if
so, does the secrets repo hold the new version before the next deploy fetches it?

### P9.2 What is and isn't a secret

| File | Tracked in git? | Changed by this plan |
| --- | --- | --- |
| `badhan-frontend/.env.production` / `.env.development` / `.env.local` | **yes** — all three are committed | yes, in [§P4.2](#p42-env-files) and [§P4.6](#p46-remove-vue_app_admin_console_url-entirely); ordinary code review, no secrets repo involved |
| `badhan-backend/env.production` / `env.development` / `env.local` | no — gitignored, live in the secrets repo | **see [§P9.3](#p93-the-key-audit)** |
| `badhan-backend/config/*` (Firebase service account, backup config) | no — gitignored, secrets repo | no |
| `badhan-android/signature.jks`, `key_password.txt`, Play key | no — gitignored, secrets repo | no |

The frontend's env files being *committed* is the reason P4 can delete `VUE_APP_ADMIN_CONSOLE_URL`
outright with no coordination: those three files are code, not secrets.

### P9.3 The key audit

The backend reads exactly five keys — `NODE_ENV`, `JWT_SECRET`, `VUE_APP_FRONTEND_BASE`,
`RATE_LIMITER_ENABLE`, `MONGODB_URI`
([dotenv/index.ts:35-50](../../badhan-backend/src/dotenv/index.ts#L35-L50)) — plus the three
`MONGODB_URI`s the internal server reads straight out of the files by name
([internalRoutes/index.ts:33-35](../../badhan-backend/src/internalRoutes/index.ts#L33-L35)).

**As this plan is written, none of them changes.** `NODE_ENV` comes from the npm script, not the file;
the other four keep their names and values; and the *file names* `env.production` / `env.development`
/ `env.local` are already the three canonical words, so nothing in the secrets repo needs renaming
either. P9 is therefore an audit that confirms zero work:

```
docker compose exec backend node -e "console.log(Object.keys(require('dotenv').parse(require('fs').readFileSync('env.local'))))"
```

— compare against the five names above, for each environment, and record the result in the P9 commit
message. If the list matches, the phase is done.

### P9.4 The key rename that is *not* taken

One key is misnamed: **`VUE_APP_FRONTEND_BASE` in a backend env file.** It is a backend variable
holding the frontend's base URL, wearing a Vue CLI build-system prefix that means nothing on the
server. Renaming it to `FRONTEND_BASE_URL` is squarely within this plan's spirit — but it is the only
change that would touch the secrets repo, and it carries a deploy-ordering hazard the rest of the plan
does not:

- push the renamed key to the secrets repo first, then deploy → the *currently deployed* backend is
  unaffected (it already read its env at boot), and the next deploy gets the new key. Safe.
- deploy first, then push → the new backend fetches an env file without `FRONTEND_BASE_URL`, the
  missing-key check exits, and App Engine serves the previous version while the deploy reports
  success. The `liveCheck` in [upload-gcloud.js](../../badhan-backend/upload-gcloud.js) would catch it
  only if traffic had already moved.

**Decision — skipped.** The vocabulary this plan is unifying is *environment names*, and
`VUE_APP_FRONTEND_BASE` is a misnamed variable, not a misnamed environment — it names the right thing
with the wrong prefix, and no reader of it has ever been confused about *which environment* they are
in. Taking it would make P9 the one phase whose correctness depends on a repo this one cannot see, for
a cosmetic gain. It is noted for a later pass and is not part of plan 15. Skipping it also keeps this
plan revertable without touching credentials.

The safe sequence, recorded for whoever does take it: (1) add `FRONTEND_BASE_URL` **alongside** the old
key in all three secret env files and push; (2) change the backend to read the new name; (3) deploy;
(4) remove the old key from the secrets repo. Three steps, one of them in a repo outside this one —
which is why it was never a candidate for folding into P3.

Because this is skipped, **P9 changes nothing anywhere**: the audit in [§P9.3](#p93-the-key-audit)
confirms the five key names still match, and the phase ends there.

### P9.5 If a future phase does change a secret key

The rule this phase establishes, for whoever refactors next: **the secrets repo is pushed before the
first deploy that expects the change, never after.** A key added to the code but not to the secrets
repo is invisible to every gate in [§P8.3](#p83-the-grep-gate) and to both test suites, because the
tests run against a local stack whose `env.local` sits on the developer's own disk.

### P9.6 Risks

| Risk | Mitigation |
| --- | --- |
| Someone's local `env.*` files go stale (backend env files are gitignored) | file *names* and keys do not change ([§P9.3](#p93-the-key-audit)) — nothing to re-fetch |
