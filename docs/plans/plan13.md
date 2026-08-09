# Plan 13 — deploy from a container, with credentials that survive `down -v`

Deployment is the last thing in this repository that still runs on the host. [deploy:9-11](../../deploy#L9-L11)
says why in as many words: *"Deployment itself stays on the host (not containerized) so the existing
gcloud / firebase CLI auth on your machine keeps working."* That comment is a workaround, not a
design — the CLIs were kept out of the containers because a container's `$HOME` dies with the
container, and re-authenticating after every `docker compose down -v` was worse than the
inconsistency.

Both CLIs store their credentials in ordinary directories, and both let you relocate those
directories with an environment variable. Pointing them at a gitignored folder inside the
bind-mounted repo makes container-side auth outlive any container, volume, or image rebuild — at
which point the host no longer needs `gcloud` or `firebase` installed at all. The same reasoning
retires the last host toolchain, the Android/Play one ([P5](#phase-p5--google-play-in-a-container)),
which needs no persisted credentials at all.

Login happens **inside the container** over the browserless copy-paste flows
(`gcloud auth login --no-launch-browser`, `firebase login --no-localhost`). No service-account keys,
no `GOOGLE_APPLICATION_CREDENTIALS`, no long-lived key material on disk beyond the refresh tokens
the CLIs already store today.

---

## At a glance

| | Today | After plan 13 |
| --- | --- | --- |
| `gcloud` / `firebase` installed on the host | **required** | not required |
| JDK 17, Android SDK, `bubblewrap`, `fastlane` on the host | **required** for a Play release | not required |
| Where the deploy CLIs run | host | `deploy` container (gcloud/firebase), `android` container (bubblewrap/fastlane) |
| Where credentials live | `~/.config/gcloud`, `~/.config/configstore` on the host | `.deploy-auth/` in the repo, gitignored, bind-mounted |
| Surviving `docker compose down -v` | n/a (host) | **yes** — the credentials are host files |
| How you log in | `gcloud auth login`, `firebase login` (browser opens) | `./deploy --login` (paste a URL into any browser, paste the code back) |
| Deploy blocked when not logged in | yes, preflight already checks | **yes, and it checks access to the *target project*, not just token refresh** |
| Supported host OS | macOS (the `darwin` branch in `upload-googleplay.js` is load-bearing) | **macOS and Linux** (Windows via WSL2, which is Linux) — see [§0.6](#06-the-plan-must-work-on-macos-and-linux) |
| Where the orchestration runs | host (`deploy`, `upload-*.js`, `upload-googleplay.js`) | **unchanged** — host |
| Where the frontend build runs | `frontend` container | **unchanged** |
| Secrets-repo clone, git branch detection | host | **unchanged** — host |

| Phase | Title | Depends on | Deployable alone |
| --- | --- | --- | --- |
| [P1](#phase-p1--the-deploy-image-and-the-credential-mounts) | `badhan-deploy` image, compose service, credential mounts | — | yes (additive; nothing uses it yet) |
| [P2](#phase-p2--login-inside-the-container) | `./deploy --login`, the browserless flows | P1 | yes |
| [P3](#phase-p3--route-every-cli-call-through-the-container) | Both upload scripts shell into the container | P1, P2 | yes |
| [P4](#phase-p4--prove-were-logged-in-to-the-right-project) | Preflight checks target-project access | P3 | yes |
| [P5](#phase-p5--google-play-in-a-container) | `badhan-android` image, `upload-googleplay.js` shells into it | P3 (the wrapper only) | yes |
| [P6](#phase-p6--docs-and-rollout) | README, CLAUDE.md, rollout, rollback | all | — |

P5 is independent of P2/P4: the Play path has no interactive login and no persistent credentials
([§5.2](#52-why-the-android-container-needs-no-credential-mount)). It needs P3 only because it reuses
`deploy-container.js`. It can land before or after P4.

**P2 must land before P3.** P3 removes the host CLIs from the deploy path; if there is no working way
to authenticate the container first, the next deploy has no credentials at all.

---

## §0 What the investigation found

### 0.1 Both CLIs keep credentials in plain directories under `$HOME`

| CLI | Path (Linux / container) | Contents | Env override |
| --- | --- | --- | --- |
| gcloud | `~/.config/gcloud` | `credentials.db`, `access_tokens.db` (SQLite), `configurations/`, `application_default_credentials.json` | `CLOUDSDK_CONFIG` |
| firebase-tools | `~/.config/configstore/firebase-tools.json` | JSON: refresh token, active user | `XDG_CONFIG_HOME` |

The default targets are `$HOME/.config/…`, but the plan uses the env overrides in the last column
instead of mounting over `$HOME` — see [§0.6(a)](#06-the-plan-must-work-on-macos-and-linux)
for why that difference matters.

firebase-tools also writes `~/.cache/firebase/` — that is a tooling/emulator cache, not credentials.
`firebase deploy --only hosting` does not populate it, so it is deliberately **not** mounted.

### 0.2 The orchestration does not need to move

[upload-gcloud.js](../../badhan-backend/upload-gcloud.js) and
[upload-firebase.js](../../badhan-frontend/upload-firebase.js) require nothing but Node's standard
library — no `node_modules`, no repo dependencies. What they actually do is:

- read the git branch and pick a deploy target ([upload-gcloud.js:31-46](../../badhan-backend/upload-gcloud.js#L31-L46), [upload-firebase.js:46-51](../../badhan-frontend/upload-firebase.js#L46-L51))
- clone the secrets repo for the env file ([upload-gcloud.js:92-108](../../badhan-backend/upload-gcloud.js#L92-L108))
- shell out to `docker compose` for the frontend build ([upload-firebase.js:40-42](../../badhan-frontend/upload-firebase.js#L40-L42))
- shell out to `gcloud` / `firebase`
- poll the deployed backend over HTTPS ([upload-gcloud.js:250-271](../../badhan-backend/upload-gcloud.js#L250-L271))

Only the fourth item needs a CLI. The third is decisive: **the scripts must stay on the host**,
because a container has no Docker socket and could not run `docker compose run --rm --no-deps
frontend`. So this plan moves the *CLI invocations*, not the scripts. The three host-only exceptions
in [CLAUDE.md](../../CLAUDE.md) stay exceptions — they just stop being the only place the deploy CLIs
exist.

### 0.3 A bind-mounted repo gives the container the identical file tree

`gcloud app deploy` uploads the working directory minus [.gcloudignore](../../badhan-backend/.gcloudignore);
`firebase deploy --only hosting` uploads `dist` per [firebase.badhan-buet.json](../../badhan-frontend/firebase.badhan-buet.json).
Both directories are already bind-mounted host directories in the existing compose services, so a
`deploy` container mounting the same host paths sees byte-for-byte what the host sees today. The
upload payload does not change.

Two host directories look surprising and are not: `badhan-backend/node_modules` and
`badhan-backend/dist` exist on the host as **empty mountpoints** that Docker created for the
`- /app/node_modules` and `backend-dist:/app/dist` mounts in [docker-compose.yml:25-28](../../docker-compose.yml#L25-L28).
`node_modules/` is excluded by `.gcloudignore`; `dist` is uploaded (stale or empty) and then
overwritten server-side by the `gcp-build` script in `badhan-backend/package.json`. That is the
status quo — this plan does not change it.

### 0.4 Credentials must not live under `badhan-backend/`

The obvious place for the gcloud config — `badhan-backend/.gcloud-auth/` — is a trap. `gcloud app
deploy` runs with `badhan-backend` as its working directory and uploads everything not matched by
`.gcloudignore`, which today matches no such folder. Putting the refresh token there would upload it
to App Engine on the very next deploy.

**Credentials therefore live at the repo root, in `.deploy-auth/`,** outside both upload roots, where
neither uploader can reach them. One gitignore entry, no ignore-file coupling, no way for a later
edit to `.gcloudignore` to expose them.

**Decided: in the repo, not in `$HOME`.** The alternative — a host directory outside the tree
(`~/.badhan-deploy-auth`, bind-mounted) — would survive `git clean -xdf` and be shared by every clone
on the machine. It is rejected because it reintroduces a second bind mount and a `${HOME}`-relative
source path in `docker-compose.yml`, undoing the single-mount simplification of
[§0.6(a)](#06-the-plan-must-work-on-macos-and-linux), in exchange for two failure modes that are
cheap here: `git clean -xdf` and a fresh clone both cost one `./deploy --login`. No
`BADHAN_DEPLOY_AUTH` override either — one documented, tested path.

### 0.5 Risk: gcloud's credential store is SQLite on a bind mount

`credentials.db` and `access_tokens.db` are SQLite. SQLite over Docker Desktop's older macOS file
sharing (osxfs / gRPC-FUSE) has a history of `database is locked` and `disk I/O error` from broken
`fcntl` locking. VirtioFS — the default in current Docker Desktop — does not have this problem, and
there is only ever one writer here. On native Linux the mount is a plain bind and the question does
not arise, and WSL2 keeps the repo on the Linux filesystem, so the risk is macOS-only.

This is the single assumption the plan rests on, so [P1](#phase-p1--the-deploy-image-and-the-credential-mounts)
verifies it explicitly before anything is built on top. If it fails: switch Docker Desktop to
VirtioFS (Settings → General → file sharing implementation). If it still fails, the fallback is a
named volume for the gcloud config dir plus a `./deploy --save-auth` that `docker cp`s it out to
`.deploy-auth/` — worse ergonomics, same durability. Do not adopt the fallback speculatively.

### 0.6 The plan must work on macOS and Linux

**Decided: macOS and Linux are the supported hosts. Windows is supported through WSL2 only**, which
is a Linux host as far as everything below is concerned — the repo lives on the Linux filesystem, the
uid is a real Linux uid, and `./deploy` runs under a real bash. Native Windows entry points (Git
Bash, mintty, `MSYS_NO_PATHCONV`, `winpty`, a repo-root `.gitattributes` for CRLF) are **out of
scope**: they add path-mangling and line-ending workarounds to three scripts to support a shell
nobody here uses, and WSL2 is the documented answer instead. If a Git Bash user appears later, the
change is additive and isolated to `deploy-container.js` plus `.gitattributes`.

That leaves two consequences, each of which changes a concrete thing below.

**(a) Credential paths move off `$HOME` and onto the env overrides.** Docker Desktop on macOS maps
bind-mount writes to the invoking host user, so a container running as root leaves files the
developer owns. Native Linux does not: container root writes root-owned files into `.deploy-auth/`,
and the next `mkdir`/`rm` from the host fails. The fix is to let the service run as an arbitrary
uid — which is only possible if nothing depends on `$HOME` being `/root`.

Both CLIs already support this, via the env overrides recorded in [§0.1](#01-both-clis-keep-credentials-in-plain-directories-under-home):

| | Instead of mounting | Set |
| --- | --- | --- |
| gcloud | `/root/.config/gcloud` | `CLOUDSDK_CONFIG=/repo/.deploy-auth/gcloud` |
| firebase-tools | `/root/.config/configstore` | `XDG_CONFIG_HOME=/repo/.deploy-auth/xdg` → `…/xdg/configstore/firebase-tools.json` |

So there are **no credential bind mounts at all**. `.:/repo` is the only mount, `.deploy-auth/` is
just a directory inside it, and everything in [§0.4](#04-credentials-must-not-live-under-badhan-backend)
still holds — it sits outside both upload roots. This is strictly simpler than the two-mount design,
and it is what makes `user:` viable.

Anything that still writes to `$HOME` (npm's cache, gradle, bubblewrap's config) gets a
world-writable one baked into the image, so an unknown uid can use it:

```dockerfile
ENV HOME=/home/deploy
RUN mkdir -p /home/deploy && chmod 0777 /home/deploy
```

**(b) The uid is passed in, defaulting to root.** Compose services get
`user: "${DEPLOY_UID:-0}:${DEPLOY_GID:-0}"`. `./deploy` exports the two on Linux only:

```sh
if [ "$(uname -s)" = "Linux" ]; then export DEPLOY_UID="$(id -u)" DEPLOY_GID="$(id -g)"; fi
```

On macOS the default of `0:0` is correct — Docker Desktop already does the mapping, and a non-root
uid there buys nothing while risking permission failures inside the image. Under WSL2 the `Linux`
branch fires, which is what we want: the repo is on the Linux filesystem and the ownership problem is
the native-Linux one.

Interactive `docker compose run` (the [P2](#phase-p2--login-inside-the-container) login flows) needs
a real TTY. It has one on macOS, on Linux, and in WSL2 under Windows Terminal.

---

## Phase P1 — the deploy image and the credential mounts

### 1.1 `badhan-deploy/Dockerfile`

New sibling directory, matching the existing `badhan-backend` / `badhan-frontend` /
`badhan-backend-test` / `badhan-frontend-test` convention.

```dockerfile
FROM node:22.23.1-bookworm-slim

# The Google Cloud CLI ships via Google's apt repo. python3 comes in as a
# dependency of google-cloud-cli; do not install it separately.
#
# Pinned for the same reason as FIREBASE_TOOLS_VERSION below: an unpinned
# apt install makes every rebuild a silent gcloud upgrade. Set this to the
# version `gcloud version` reports on the host today; find the exact apt
# version string with `apt-cache madison google-cloud-cli` inside the image.
ARG GCLOUD_VERSION=529.0.0-0
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl ca-certificates gnupg; \
    curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
      | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg; \
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] \
https://packages.cloud.google.com/apt cloud-sdk main" \
      > /etc/apt/sources.list.d/google-cloud-sdk.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends "google-cloud-cli=${GCLOUD_VERSION}"; \
    apt-get purge -y --auto-remove gnupg; \
    rm -rf /var/lib/apt/lists/*; \
    gcloud version

# firebase-tools is global, exactly as it is on the host today — see the comment
# at upload-firebase.js:68-72 for why it is not a repo dependency.
ARG FIREBASE_TOOLS_VERSION=15.24.0
RUN npm install -g firebase-tools@${FIREBASE_TOOLS_VERSION} && firebase --version

# Usage-reporting prompts block a non-interactive `run --rm -T`.
RUN gcloud config set disable_usage_reporting true --installation

# §0.6(a): a world-writable HOME so the service can run as the host uid on Linux.
ENV HOME=/home/deploy
RUN mkdir -p /home/deploy && chmod 0777 /home/deploy

WORKDIR /repo
```

`FIREBASE_TOOLS_VERSION=15.24.0` and `GCLOUD_VERSION` are what `firebase --version` and
`gcloud version` report on the host today, so the first containerized deploy is not also a CLI
upgrade. Bump each as a separate, deliberate change — and note the asymmetry: an npm version stays
installable forever, while Google's apt repo eventually prunes old `google-cloud-cli` packages. A pin
that has aged out fails the build loudly with `Version '…' for 'google-cloud-cli' was not found`,
which is the right failure — it forces a deliberate bump rather than an unnoticed one. Both pins
being P2-verified ([§2.1](#21-the-two-flows)) means "the login flag works on this exact version" is a
statement about a version that cannot drift underneath it.

`google-cloud-cli` core is sufficient for `gcloud app deploy` against a `nodejs22` standard runtime —
the build runs server-side via `gcp-build`, no local app-engine component is involved. If gcloud
prompts to install a component during the P1 smoke test, add that component to the `apt-get install`
line rather than letting it self-install at deploy time into a layer that does not persist.

### 1.2 The compose service

Appended to [docker-compose.yml](../../docker-compose.yml):

```yaml
  deploy:
    profiles: ["deploy"]
    build:
      context: ./badhan-deploy
    user: "${DEPLOY_UID:-0}:${DEPLOY_GID:-0}"
    environment:
      CLOUDSDK_CONFIG: /repo/.deploy-auth/gcloud
      XDG_CONFIG_HOME: /repo/.deploy-auth/xdg
    volumes:
      - .:/repo
    working_dir: /repo
```

Notes on each choice:

- **`profiles: ["deploy"]`** keeps a ~1 GB image out of `docker compose up -d`. It is built on first
  use, the same way `backend-test` / `frontend-test` are.
- **`.:/repo`** — the whole repo, not the two app directories, because the wrapper picks the working
  directory per command (`-w /repo/badhan-backend`, `-w /repo/badhan-frontend`). Per
  [§0.6(a)](#06-the-plan-must-work-on-macos-and-linux) it is also the *only* mount: the
  credential directories are reached through `CLOUDSDK_CONFIG` / `XDG_CONFIG_HOME`, not through
  `$HOME`.
- **`user:`** defaults to root and is overridden only on Linux ([§0.6(b)](#06-the-plan-must-work-on-macos-and-linux)).
- **No `node_modules` volume.** This container never runs the app's code. Mounting one would make the
  host's empty `node_modules` mountpoint into something else and change what `gcloud app deploy`
  uploads.
- **No `depends_on`.** Deploying does not need mongo or the backend running.

### 1.3 Gitignore

Repo-root [.gitignore](../../.gitignore) gains:

```
# Deploy CLI credentials — written by the `deploy` container (CLOUDSDK_CONFIG /
# XDG_CONFIG_HOME) so gcloud / firebase auth survives `docker compose down -v`.
# Refresh tokens: never commit.
.deploy-auth/
```

The CLIs create their own subdirectories under it, but the parent must exist and be writable by the
container uid first: `mkdir -p .deploy-auth`. [P2](#phase-p2--login-inside-the-container) does this
for you.

### 1.4 Verification (do this before writing any of P2–P4)

```sh
mkdir -p .deploy-auth
docker compose --profile deploy build deploy
docker compose --profile deploy run --rm -T deploy gcloud version
docker compose --profile deploy run --rm -T deploy firebase --version

# §0.5: prove SQLite writes survive on the bind mount.
docker compose --profile deploy run --rm -T deploy \
  gcloud config set core/project badhan-buet-test
ls -la .deploy-auth/gcloud                     # created host-side, owned by you (§0.6a)
docker compose --profile deploy run --rm -T deploy gcloud config get-value core/project
docker compose down -v
docker compose --profile deploy run --rm -T deploy gcloud config get-value core/project
```

The last command must still print `badhan-buet-test`. That single line is the whole premise of the
plan; if it does not hold, stop and take the §0.5 fallback.

---

## Phase P2 — login inside the container

### 2.1 The two flows

Neither container has a browser, and neither flow needs one *in* the container — both print a URL you
open on the host and hand back a code.

```sh
# gcloud: prints an accounts.google.com URL, you paste back a verification code.
docker compose --profile deploy run --rm deploy gcloud auth login --no-launch-browser

# firebase: prints a URL, you paste back the authorization code.
docker compose --profile deploy run --rm deploy firebase login --no-localhost
```

`docker compose run` allocates a TTY by default, which these need. Do **not** pass `-T` here — that
is reserved for the machine-readable checks in P3.

**Verify the gcloud flag on the pinned SDK version during P2, not at the next deploy.** Recent gcloud
also has `--no-browser`, which is a *different*, non-interchangeable flow: it requires a second
machine that has gcloud installed and a browser, and it prints a `gcloud auth login
--remote-bootstrap=...` command to run there. If `--no-launch-browser` is rejected or its
out-of-band code path is refused by Google's OAuth endpoint on the pinned version, `--no-browser` is
the documented fallback — and it works here, because the host still has gcloud during the migration.
Record whichever flag actually worked in the `./deploy --login` implementation and in the README.

Firebase's `--no-localhost` has no such ambiguity.

### 2.2 `./deploy --login`

[deploy](../../deploy) grows a mode. It is a bash script with `set -euo pipefail` and a
`cd "$(dirname "$0")"`, so the addition is small: parse `$1`, and on `--login` run the block below
and exit before the preflight.

```sh
mkdir -p .deploy-auth

echo "🔑  Logging in to Google Cloud (paste the URL into any browser)…"
docker compose --profile deploy run --rm deploy gcloud auth login --no-launch-browser

echo "🔑  Logging in to Firebase…"
docker compose --profile deploy run --rm deploy firebase login --no-localhost

echo "✅  Logged in. Verifying…"
node badhan-backend/upload-gcloud.js --check
node badhan-frontend/upload-firebase.js --check
```

Ending with the two `--check` calls means `--login` cannot report success on credentials that would
fail the deploy ten seconds later. After P4 those checks also confirm project access.

Also add `--relogin`, which runs `gcloud auth login --no-launch-browser --force` and
`firebase login --reauth --no-localhost`. This is not cosmetic: [upload-firebase.js:126](../../badhan-frontend/upload-firebase.js#L126)
already documents that plain `firebase login` answers *"Already logged in"* and will not refresh an
expired token — the exact failure this flag exists to clear.

`./deploy --help` should list all three modes.

---

## Phase P3 — route every CLI call through the container

### 3.1 The shared wrapper

New file at the repo root, `deploy-container.js`, required by all three upload scripts
(`require("../deploy-container")`, `require("../../../deploy-container")` from the bubblewrap
directory). Standard library only — these scripts have no dependencies and must keep none.

```js
"use strict";
const { execSync } = require("child_process");

const REPO_ROOT = __dirname;

// §0.6(b): the uid mapping is Linux-only (WSL2 reports "linux", which is what we
// want). On macOS the compose default of 0:0 stands.
function childEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  if (process.platform === "linux") {
    env.DEPLOY_UID = String(process.getuid());
    env.DEPLOY_GID = String(process.getgid());
  }
  return env;
}

// Build the docker-compose invocation for a CLI command inside a deploy
// container. `workdir` is a path INSIDE the container (/repo/...), because the
// repo root is bind-mounted at /repo.
//
// `interactive` controls the TTY. Compose allocates one by default, which the
// login flows need for their paste-back prompts; every check that parses stdout
// passes -T instead, because a TTY corrupts captured output with control codes.
//
// `passEnv` lists variable NAMES to forward with a bare `-e NAME`, which makes
// compose inherit the value from this process. Never `-e NAME=value`: that puts
// secrets (the keystore password, P5) in the host process table.
function cliCommand(cmd, { service = "deploy", workdir = "/repo", interactive = false, passEnv = [] } = {}) {
  const flags = [interactive ? "" : "-T", ...passEnv.map((n) => `-e ${n}`), `-w ${workdir}`];
  return `docker compose --profile deploy run --rm ${flags.filter(Boolean).join(" ")} ${service} ${cmd}`;
}

// Always invoked from REPO_ROOT: that is where docker-compose.yml lives.
function runCli(cmd, opts = {}) {
  return execSync(cliCommand(cmd, opts), { stdio: "inherit", cwd: REPO_ROOT, env: childEnv(opts.env) });
}

// Capture stdout, swallow stderr. Returns "" on failure rather than throwing,
// so preflight checks stay expression-shaped.
function captureCli(cmd, opts = {}) { /* execSync with stdio ["ignore","pipe","ignore"] */ }

function dockerAvailable() { /* moved verbatim from upload-firebase.js:56-66 */ }

module.exports = { cliCommand, runCli, captureCli, dockerAvailable, REPO_ROOT };
```

`service` exists for [P5](#phase-p5--google-play-in-a-container); P3 never passes it. Both services
sit in the `deploy` profile, so the `--profile deploy` prefix is shared.

### 3.2 Call sites in `upload-gcloud.js`

| Line | Today | After |
| --- | --- | --- |
| [48-55](../../badhan-backend/upload-gcloud.js#L48-L55) `commandExists("gcloud")` | `command -v gcloud` on the host | delete; replaced by `dockerAvailable()` + a `gcloud version` probe in the container |
| [62-72](../../badhan-backend/upload-gcloud.js#L62-L72) `gcloudHasValidCredentials()` | host `gcloud auth print-access-token` | `captureCli("gcloud auth print-access-token")` — logic and comment unchanged, the comment is still exactly right |
| [141-149](../../badhan-backend/upload-gcloud.js#L141-L149) preflight errors | *"gcloud CLI not found on PATH. Install it: …"* / *"Run `gcloud auth login`."* | *"Docker is not available (the deploy CLIs run in the `deploy` container)."* / *"Run `./deploy --relogin`."* |
| [199](../../badhan-backend/upload-gcloud.js#L199) `gcloud app deploy` | `run(..., baseDir)` | `runCli("gcloud app deploy --project ... ./${yaml} --quiet", { workdir: "/repo/badhan-backend" })` |

`checkRequirements` gains the `dockerAvailable()` guard the frontend script already has
([upload-firebase.js:107-112](../../badhan-frontend/upload-firebase.js#L107-L112)) — Docker is now a
backend deploy requirement too, and it should be caught in the preflight rather than three minutes in.

Everything else in the file is untouched: branch detection, the secrets clone, `last_deployed.txt`,
and `liveCheck` are host concerns and stay host concerns.

### 3.3 Call sites in `upload-firebase.js`

| Line | Today | After |
| --- | --- | --- |
| [56-66](../../badhan-frontend/upload-firebase.js#L56-L66) `dockerAvailable` | local | import from `deploy-container.js` |
| [68-80](../../badhan-frontend/upload-firebase.js#L68-L80) `firebaseAvailable()` | host `firebase --version` | `captureCli("firebase --version")`; rewrite the comment — the reason firebase-tools is global is now "it is global *in the deploy image*", and the node_modules-masking rationale no longer applies |
| [82](../../badhan-frontend/upload-firebase.js#L82) `FIREBASE_INSTALL_HINT` | *"npm install -g firebase-tools"* | *"rebuild the deploy image: `docker compose --profile deploy build deploy`"* |
| [120-127](../../badhan-frontend/upload-firebase.js#L120-L127) `firebase projects:list` | host | `captureCli("firebase projects:list")`; error text points at `./deploy --relogin` |
| [160-163](../../badhan-frontend/upload-firebase.js#L160-L163) `firebase deploy` | `run(..., baseDir)` | `runCli("firebase deploy --only hosting --project ... --config ...", { workdir: "/repo/badhan-frontend" })` |

The build at [upload-firebase.js:40-42](../../badhan-frontend/upload-firebase.js#L40-L42) and
[155](../../badhan-frontend/upload-firebase.js#L155) is **unchanged** — it already runs in the
`frontend` container, and its long comment stays accurate.

### 3.4 Verification

```sh
node badhan-backend/upload-gcloud.js --check     # passes on a logged-in .deploy-auth
node badhan-frontend/upload-firebase.js --check

mv .deploy-auth .deploy-auth.bak                 # simulate a machine with no credentials
node badhan-backend/upload-gcloud.js --check     # must FAIL, naming ./deploy --login
node badhan-frontend/upload-firebase.js --check  # must FAIL, naming ./deploy --login
mv .deploy-auth.bak .deploy-auth
```

Then, on a real deploy to the test projects (any branch other than `main` targets `badhan-buet-test`
/ `badhan-buet-test`): run the full `./deploy` end to end and confirm the App Engine version and the
Firebase hosting release both land, and that `--live-check` passes.

---

## Phase P4 — prove we're logged in to the right project

The current checks prove a token can be refreshed. They do not prove the authenticated account can
deploy to the branch's target project — a valid login to the wrong Google account passes both today,
and fails at the last step of a deploy that has already run both test suites.

- **Backend**: after `gcloud auth print-access-token` succeeds, run
  `gcloud app describe --project <project>` (read-only; `<project>` from `getDeployTarget`). Failure
  means the account is valid but cannot see the target App Engine app.
- **Frontend**: `firebase projects:list` is already an API call — capture its output instead of
  discarding it and assert the target project id appears in it.

Both errors should name the account in play (`gcloud auth list --format=value(account)`,
`firebase login:list`) so "logged in as the wrong person" reads as itself rather than as a
permissions mystery.

**Both checks hard-fail — decided.** A failure exits non-zero, names the active account and the
expected project, and points at `./deploy --relogin`; there is no warn-and-continue mode and no
`--skip-project-check` escape hatch. The known false-positive is narrow and worth accepting: an
account holding only `roles/appengine.deployer` can deploy but lacks `appengine.applications.get`,
so `gcloud app describe` would block it. That is not how this project's deploy accounts are set up —
they are owners — and a warning that the deploy then ignores gives back exactly the three-minutes-in
failure P4 exists to prevent. If a narrow-role account ever does appear, the fix is to grant it
`roles/appengine.appViewer` (or swap the probe for `gcloud app versions list --limit=1`), not to
soften the check.

This closes the requirement that a deploy verify *both* CLIs are properly logged in before it starts:
the two `--check` calls at [deploy:18-21](../../deploy#L18-L21) already run before the test suites, so
P4 needs no change to `./deploy` itself.

---

## Phase P5 — Google Play in a container

[upload-googleplay.js](../../badhan-frontend/bubblewrap/upload-googleplay.js) is the last host
toolchain: a JDK 17, an Android SDK, `@bubblewrap/cli`, and a Ruby gem. It is also the toolchain most
likely to be missing on a second machine, and the one whose host paths are hardest to reproduce —
`~/.bubblewrap/config.json` today points at `/opt/homebrew/opt/openjdk@17/...` and
`~/Library/Android/sdk`, both macOS-specific. Containerizing it is what makes
[§0.6](#06-the-plan-must-work-on-macos-and-linux) true rather than aspirational — without P5, a Linux
host can run `./deploy` but still cannot cut a Play release, and the README would have to say so.
**Decided: P5 stays in plan 13**, landing on its own cycle per [§6.2](#62-rollout) step 5.

### 5.1 `badhan-android/Dockerfile`

A **separate image**, not another layer on `badhan-deploy`: JDK + Android SDK + Ruby is ~3–4 GB
against the deploy image's ~1 GB, Play releases are rare and independent of `./deploy`, and nothing
in a Play release touches gcloud or firebase.

```dockerfile
# Bubblewrap requires JDK 17 specifically; this is the JDK, and Node comes on top.
FROM eclipse-temurin:17-jdk-jammy

ENV ANDROID_HOME=/opt/android-sdk \
    HOME=/home/deploy \
    GRADLE_USER_HOME=/home/deploy/.gradle
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl unzip git ca-certificates ruby-full build-essential \
    && rm -rf /var/lib/apt/lists/*

# Node 22 for @bubblewrap/cli, from nodesource — the temurin base has no node.
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Android SDK. The versions track app/build.gradle: compileSdkVersion 36,
# targetSdkVersion 36 — bump these together or the build fails. Drift is caught
# by the preflight check in 5.3, not by this comment.
# Two build-tools on purpose: BUILD_TOOLS matches the compile SDK, and
# AGP_BUILD_TOOLS is the default AGP 8.9.x picks when build.gradle names no
# buildToolsVersion (it does not). Without the second, gradle downloads it
# mid-build.
ARG ANDROID_API=36
ARG BUILD_TOOLS=36.0.0
ARG AGP_BUILD_TOOLS=35.0.0
ARG AGP_VERSION=8.9.1
RUN mkdir -p $ANDROID_HOME/cmdline-tools \
    && curl -fsSL -o /tmp/cmdline-tools.zip \
       https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
    && unzip -q /tmp/cmdline-tools.zip -d $ANDROID_HOME/cmdline-tools \
    && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
    && rm /tmp/cmdline-tools.zip \
    && yes | sdkmanager --licenses > /dev/null \
    && sdkmanager "platform-tools" "platforms;android-${ANDROID_API}" "build-tools;${BUILD_TOOLS}"

# Pinned to the host versions in use today, for the same reason as
# FIREBASE_TOOLS_VERSION: the first containerized run must not also be an upgrade.
ARG BUBBLEWRAP_VERSION=1.24.1
ARG FASTLANE_VERSION=2.237.0
RUN npm install -g @bubblewrap/cli@${BUBBLEWRAP_VERSION} \
    && gem install fastlane -N -v ${FASTLANE_VERSION}

# Bubblewrap reads os.homedir()/.bubblewrap/config.json and otherwise drops into
# an interactive wizard that offers to download a JDK — which hangs a non-
# interactive run. Baking it is what lets upload-googleplay.js delete its
# bubblewrapSdkErrors() check entirely (see 5.3).
RUN mkdir -p /home/deploy/.bubblewrap "$GRADLE_USER_HOME" \
    && printf '{"jdkPath":"%s","androidSdkPath":"%s"}' "$JAVA_HOME" "$ANDROID_HOME" \
       > /home/deploy/.bubblewrap/config.json \
    && chmod -R 0777 /home/deploy

WORKDIR /repo
```

The `jdkPath` here is `$JAVA_HOME` directly, with no `Contents/Home` suffix — that suffix is the
macOS `.jdk` bundle layout, and it is the only reason `upload-googleplay.js` has a
`process.platform === "darwin"` branch. In the container there is no such branch to have.

### 5.2 Why the android container needs no credential mount

Every secret the Play path uses is already fetched per-run, not stored:

- `signature.jks`, `key_password.txt`, and the Play service-account JSON are cloned from the secrets
  repo into `badhan-frontend/bubblewrap/` at build time and deleted in the `finally`
  ([upload-googleplay.js `fetchSecrets`/`buildAndUpload`](../../badhan-frontend/bubblewrap/upload-googleplay.js)).
- That directory is inside the `.:/repo` bind mount, so the container sees the files for exactly as
  long as the host script keeps them there.
- `fastlane supply --json_key` is service-account auth. There is no interactive login, no refresh
  token, and therefore nothing to persist across `down -v`.

So P5 needs no `--login`, no `.deploy-auth/` entry, and no P2/P4 equivalent. The one thing worth
caching is gradle's download of the Android Gradle Plugin 8.9.1 and Gradle 8.11.1 — a cache, not a
credential, so a named volume is right:

```yaml
  android:
    profiles: ["deploy"]
    build:
      context: ./badhan-android
    user: "${DEPLOY_UID:-0}:${DEPLOY_GID:-0}"
    volumes:
      - .:/repo
      - android-gradle:/home/deploy/.gradle
    working_dir: /repo/badhan-frontend/bubblewrap
```

with `android-gradle:` added to the top-level `volumes:`. Losing it to `down -v` costs one slow
build, nothing more.

`$GRADLE_USER_HOME` must exist in the image *before* the `chmod -R 0777` (hence the `mkdir -p` in
5.1): Docker seeds a new named volume from the image's directory at that path, so an absent or
root-only-writable `/home/deploy/.gradle` produces a root-owned volume that the Linux `user:` uid
cannot write — a first gradle run that fails with a permission error nothing in the plan explains.

### 5.3 Call sites in `upload-googleplay.js`

| Today | After |
| --- | --- |
| `commandExists("fastlane")` / `commandExists("bubblewrap")` | delete both; one `dockerAvailable()` guard plus `captureCli("bubblewrap --version", { service: "android" })` |
| `bubblewrapSdkErrors()` — reads host `~/.bubblewrap/config.json`, `existsSync` on `jdkPath`/`androidSdkPath`, `darwin` branch | **delete the whole function.** The image guarantees both paths (5.1). Its failure mode was "the developer never ran `bubblewrap doctor`", which cannot happen now |
| `FASTLANE`/`BUBBLEWRAP` install hints (`brew install fastlane`, `npm install -g @bubblewrap/cli`) | *"rebuild the android image: `docker compose --profile deploy build android`"* |
| `build()` → `run("bubblewrap build …", baseDir, { BUBBLEWRAP_KEYSTORE_PASSWORD, BUBBLEWRAP_KEY_PASSWORD })` | `runCli("bubblewrap build …", { service: "android", workdir: "/repo/badhan-frontend/bubblewrap", passEnv: ["BUBBLEWRAP_KEYSTORE_PASSWORD", "BUBBLEWRAP_KEY_PASSWORD"], env: { … } })` — bare `-e NAME` so the password never enters the host command line (3.1) |
| `upload()` → `run("fastlane supply …", baseDir)` | `runCli("fastlane supply …", { service: "android", workdir: "/repo/badhan-frontend/bubblewrap" })`, with `--json_key`/`--aab` rewritten to `/repo/...` container paths |

**New check, replacing the deleted `bubblewrapSdkErrors()`: SDK-version drift.** `bubblewrapSdkErrors`
guarded against a mis-set-up host; the containerized equivalent guards against the image and
`app/build.gradle` disagreeing (§7.5). Add to `checkRequirements`, host-side and offline:

- read `compileSdkVersion` / `buildToolsVersion` out of
  `badhan-frontend/bubblewrap/app/build.gradle` with a regex — no gradle, no container;
- read the image's values from a single `printenv` in the android container, which reports
  `ANDROID_API` / `BUILD_TOOLS` / `AGP_VERSION` because they are re-exported as `ENV` after the
  sdkmanager step — so the image states what it actually installed rather than what a comment claims;
- compare the AGP classpath too (`com.android.tools.build:gradle:<v>` in `build.gradle`), since AGP
  is what picks the default build-tools when `app/build.gradle` names no `buildToolsVersion` — which
  it does not;
- hard-fail when they differ, naming both values and pointing at the two `ARG`s in
  `badhan-android/Dockerfile`.

The failure this prevents is a bubblewrap regeneration bumping the gradle file to API 37 and the
next Play release dying inside gradle with an unrelated-looking message, minutes in.

Path handling is the one place to be careful: `resolve(baseDir, KEYSTORE_FILE)` produces a **host**
absolute path that means nothing inside the container. Every path handed to a containerized command
becomes `/repo/badhan-frontend/bubblewrap/<file>`. Add a single helper next to the others in
`deploy-container.js` — `toContainerPath(hostPath)` = `hostPath.replace(REPO_ROOT, "/repo")` — and
route the four path arguments through it. No separator normalization: the supported hosts
([§0.6](#06-the-plan-must-work-on-macos-and-linux)) all use `/`.

Unchanged and still host-side: the secrets clone and cleanup, `git ls-remote`, `readManifest`,
`existsSync` checks on the produced `.apk`/`.aab`, the track/status/rollout argument parsing, and the
draft-by-default policy.

### 5.4 Verification

```sh
docker compose --profile deploy build android
node badhan-frontend/bubblewrap/upload-googleplay.js --check
node badhan-frontend/bubblewrap/upload-googleplay.js --build-only   # produces .apk + .aab
```

`--check` must now also fail on a deliberately mismatched `ARG ANDROID_API`: build the image with
`--build-arg ANDROID_API=35`, confirm `--check` refuses and names both versions, then rebuild
without it. A drift check that has never been seen to fail is not a check.

The `.aab` must be byte-comparable in structure to the committed
`app-release-bundle.aab` — same package id, same version code, and **signed by the same keystore**;
verify with `apksigner verify --print-certs` (present in the image's build-tools) and compare the
certificate fingerprint against the current Play listing. A bundle signed by a different key is
rejected by Play, and that is the one failure worth catching before an upload rather than after.

Then a real `--track=internal` upload as a draft (the default), confirmed in the Play Console, and
deleted from there. No rollout.

---

## Phase P6 — docs and rollout

### 6.1 Documentation

- [README.md:177-184](../../README.md#L177-L184) — the paragraph that says *"Deployment runs on the
  host, not in a container, so your local `gcloud` and `firebase` CLI authentication is used"* becomes
  wrong the moment P3 lands. Replace with the container model, the `.deploy-auth/` location, and
  `./deploy --login` / `--relogin` as the first-time setup step.
- [deploy:9-11](../../deploy#L9-L11) — same correction in the script header comment.
- [CLAUDE.md](../../CLAUDE.md) — the three host-only exceptions stay exceptions (they are still
  `node` on the host), but the entry should say they now only *orchestrate*: every `gcloud`,
  `firebase`, `bubblewrap`, `fastlane`, and build command they issue runs in a container.
- [badhan-backend/README.md](../../badhan-backend/README.md) — check for and update any
  `gcloud auth login` instructions.
- [badhan-frontend/bubblewrap/README.md](../../badhan-frontend/bubblewrap/README.md) — currently the
  only place documenting the JDK 17 / Android SDK / `bubblewrap doctor` / `brew install fastlane`
  setup. After P5 none of that is a host requirement; replace it with
  `docker compose --profile deploy build android`.
- **A new "supported host platforms" section** (README): **macOS and Linux, with Windows supported
  through WSL2 only** ([§0.6](#06-the-plan-must-work-on-macos-and-linux)). Say the WSL2 part
  explicitly, including that the repo must be cloned inside the WSL2 filesystem rather than under
  `/mnt/c` — that is the one thing a Windows developer can get wrong and then hit both the SQLite
  locking risk of [§0.5](#05-risk-gclouds-credential-store-is-sqlite-on-a-bind-mount) and terrible
  bind-mount performance. Native Git Bash / mintty is explicitly unsupported. The only host
  prerequisites become Docker, git, and bash.
- **`docs/manual/` needs no change.** The repo rule is that new or changed *app* behaviour — a screen,
  a button, a permission, a rule — is documented there. This plan changes no app behaviour; it is
  developer tooling only. Stated explicitly so the omission reads as a decision.

### 6.2 Rollout

1. Land P1 and P2 together. They are additive: nothing calls the container yet, and the host CLIs
   still work.
2. Log in inside the container (`./deploy --login`) **while the host CLIs still work**, so a failure
   in the gcloud flag (§2.1) is an inconvenience rather than an outage.
3. Land P3 + P4. Deploy to the test projects from a non-`main` branch first.
4. Only after a clean test deploy, deploy `main`.
5. Land P5 separately, on its own cycle. A Play release is not part of `./deploy` and should not
   share a deploy's blast radius; its draft-by-default upload makes a bad build recoverable in the
   Play Console.
6. Leave the host CLIs and the host Android toolchain installed for one cycle each. Uninstalling them
   is not part of this plan.
7. **Verify on Linux before calling §0.6 done.** The uid mapping is the one thing that cannot be
   tested from macOS, and it fails loudly rather than subtly. A
   `docker compose --profile deploy run --rm deploy gcloud version`, one `--check`, and an
   `ls -la .deploy-auth/` showing host-owned files on a Linux host is enough — WSL2 counts as that
   Linux host, so no separate Windows pass is needed.

### 6.3 Rollback

Every phase is revertible independently, and the escape hatch does not depend on the repo state: the
host CLIs, `~/.config/gcloud`, and `~/.bubblewrap/config.json` are untouched throughout, so
`git revert` of P3 or P5 restores host deploys immediately. **Decided: that is the only escape
hatch** — no `BADHAN_HOST_CLI=1` env fallback that keeps a host-CLI branch alive inside
`deploy-container.js`. A temporary dual codepath is one nobody deletes, and it would quietly become
the path that still works while the container path rots; a revert is a commit and a re-run, which is
the right price for something that should happen approximately never. `.deploy-auth/` can be deleted at any
time — the only cost is redoing `./deploy --login`.

---

## §7 Open questions to resolve during implementation

1. **The gcloud login flag** (§2.1). `--no-launch-browser` vs `--no-browser` on the pinned SDK
   version. Settle it in P2 by running it, and write the answer into `./deploy --login`.
2. ~~**SQLite over the bind mount**~~ (§0.5) — **settled: it works.** Verified on macOS /
   Docker Desktop / VirtioFS during P1: gcloud config writes persist across container recreation as
   host-owned files, and a direct `sqlite3` probe inside `.deploy-auth/` (rollback journal and WAL,
   200+ inserts) completes cleanly. The §0.5 named-volume fallback is not needed and was not adopted.
3. ~~**Image size vs. `google/cloud-sdk:slim` as the base**~~ — **decided: `node:22.23.1-bookworm-slim`
   plus a version-pinned apt install of gcloud.** Keeping the Node base preserves the digest pin every
   other image in the repo uses; inverting it (cloud-sdk base + Node) saves nothing meaningful and
   unpins Node. The one real argument for inverting — that the apt install floats — is answered by
   `ARG GCLOUD_VERSION` in [§1.1](#11-badhan-deploydockerfile). Revisit only if the apt install proves
   brittle.
4. ~~**Whether `./deploy` should offer to log in inline**~~ — **decided: no.** The preflight prints
   `run ./deploy --relogin` and exits non-zero. `./deploy` stays a single unattended run.
5. ~~**The Android SDK component versions are a second place `compileSdkVersion` lives**~~ (§5.1) —
   **decided: keep the hardcoded `ARG`s, and add a preflight that fails loudly on drift**
   ([§5.3](#53-call-sites-in-upload-googleplayjs)). Deriving them at image-build time was rejected:
   `docker build` has no access to the repo's gradle file without a wrapper passing `--build-arg`,
   which is more machinery than the failure justifies. A host-side regex comparison in
   `checkRequirements` gets the same drift caught, before the container starts, with a message that
   says what to edit.
6. **Whether the `deploy` and `android` images should share a base layer.** They overlap only in
   node + git + ca-certificates, ~200 MB, against a large increase in coupling between two images
   with unrelated upgrade cadences. Kept separate; revisit only if a third deploy image appears.
7. ~~**Native Windows (Git Bash) support**~~ — **decided: out of scope**, WSL2 only
   ([§0.6](#06-the-plan-must-work-on-macos-and-linux)).
8. ~~**Whether P4 should hard-fail or warn**~~ — **decided: hard-fail, no override flag**
   ([P4](#phase-p4--prove-were-logged-in-to-the-right-project)).
9. ~~**Whether P5 belongs in this plan**~~ — **decided: yes**, landing on its own cycle
   ([§6.2](#62-rollout) step 5).
10. ~~**Where the credentials live**~~ — **decided: `.deploy-auth/` inside the repo**, not a
    `$HOME`-relative host directory ([§0.4](#04-credentials-must-not-live-under-badhan-backend)).
11. ~~**A runtime escape hatch back to the host CLIs during the P3 cutover**~~ — **decided: no.**
    No `BADHAN_HOST_CLI=1`, no dual codepath in `deploy-container.js`; `git revert` is the rollback
    ([§6.3](#63-rollback)).
