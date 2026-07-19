# Plan: Replace `start` script with Docker Compose

## Goal

Replace the Node-based `start` orchestrator with a `docker-compose.yml` that runs the
dev stack (MongoDB, backend, internal server, frontend), provides an on-demand `test`
profile, and keeps deployment as a fully manual local script. No CI/CD automation.

**Constraints:**
- Compose must not pass environment variables (`environment:` / `env_file:`
  injection). All configuration is loaded from env files that live inside each
  project and are read by the app itself (dotenv or framework equivalent).
- Docker is the **only** supported local dev environment after the migration.
  Env files are therefore edited in place to use compose service hostnames
  (e.g. `mongo`, `backend`) — no separate `.env.docker` variants, and bare-metal
  `npm run serve:local` is no longer expected to work.

## Current state (what `start` does today)

| Concern | Current mechanism |
|---|---|
| Node version check | Manual check for Node >= 22 |
| Port cleanup | `killPorts([27017, 3000, 8080, 4000])` |
| Dependency install | `ensureNpmInstall` in 5 sub-projects |
| MongoDB | `badhan-backend/scripts/start_db.mjs` downloads/caches mongod 7.0.14 into `badhan-backend/mongodb_local`, runs on 27017 |
| Backend (port 3000) | `npx nodemon` → `serve:local` (lint + tsoa + tsc build + run), waits for port 27017 |
| Internal server (port 4000) | nodemon watching `dist/`, runs `internal-server`, waits for port 3000 |
| Frontend (port 8080) | `npm run serve:local` (vue-cli dev server), waits for port 3000 |
| `--clean` | Deletes node_modules/dist/mongo data, then runs `reset_db:local` + `populate_db:local` |
| `--test` | Runs `badhan-backend-test` (Jest/API) and `badhan-frontend-test` (Cypress) suites |
| `--deploy` | After tests pass: `upload-gcloud.js` (backend) + `upload-firebase.js` (frontend) |

### Facts discovered during investigation

- `badhan-backend/.env.local` has `MONGODB_URI="mongodb://127.0.0.1:27017/Badhan-Test"` — will be edited in place to `mongodb://mongo:27017/Badhan-Test` since Docker becomes the only local dev environment.
- The backend loads `.env.${NODE_ENV}` via `src/dotenv/index.ts` and **exits if the file is missing** — so `.env.local` must be present in the container (COPY or bind mount). Under the no-injection constraint the file is the single source of truth.
- Backend port comes from `PORT` (default 3000), internal server from `INTERNAL_PORT` (default 4000) — code defaults, no env needed.
- `badhan-backend-test/tests/runtime/axios.js` supports an `API_BASE_URL` value from `process.env` and falls back to `host.docker.internal:3000` when it detects Docker. Under the no-injection rule it needs a `dotenv.config()` call at startup so `API_BASE_URL` can come from a file.
- `badhan-frontend-test/cypress.config.ts` **hardcodes** `baseUrl: 'http://localhost:8080'` and `apiBase = 'http://localhost:4000'` — both must become file-driven (dotenv loaded inside `cypress.config.ts`).
- The internal server (port 4000) already exposes `POST /reset-local-db` and `POST /populate-local-db` (used by Cypress before each spec) — this replaces the `reset_db:local` / `populate_db:local` npm scripts that `start` references but that **no longer exist** in `badhan-backend/package.json`.
- `badhan-backend` has `postinstall: npm run build`, so `npm ci` in the image also builds.
- `badhan-frontend` runs vue-cli `--mode local`, which loads the frontend's own `.env.local`-style files natively; browser-side API URLs stay `localhost` since the browser runs on the host.

## Target layout

```
badhan/
├── docker-compose.yml          # new — dev stack + test profile
├── deploy                      # new — manual deploy script (tests gate deployment)
├── badhan-backend/Dockerfile   # new
├── badhan-frontend/Dockerfile  # new
├── badhan-backend-test/Dockerfile   # new
├── badhan-frontend-test/Dockerfile  # new (Cypress base image)
└── start                       # deleted at the end (Phase 5)
```

## Phase 1 — Dev stack in Compose

### 1.1 `mongo` service
- Image `mongo:7.0.14` — **Decision: pin exact versions on every Docker image** (mongo, node, cypress/included) across this plan, matching the exact version `start_db.mjs` downloads today. Guarantees every developer builds against the identical Mongo release; bump deliberately when needed rather than drifting silently.
- Named volume `mongo-data:/data/db` (replaces `badhan-backend/mongodb_local`).
- Publish `27017:27017` so host tools (Compass, mongosh) still work.
- Healthcheck: `mongosh --eval "db.adminCommand('ping')"` — replaces `wait_for_port 27017`.
- All of `start_db.mjs` (download, cache, lockfile, port checks) becomes obsolete.

### 1.2 `backend` service (port 3000)
- `badhan-backend/Dockerfile`: `node:22.23.1-bookworm-slim` base (verified against nodejs.org's release archive as the latest Node 22 LTS patch as of 2026-07-11), `npm ci` (postinstall builds), default cmd `npx nodemon`.
- Bind-mount the whole `./badhan-backend` directory to `/app` for hot reload (any file changed on the host — src, nodemon.json, tsconfig.json, tsoa.json, package.json, etc. — is reflected immediately, no need to enumerate individual files); **anonymous volume** for `/app/node_modules` so the host dir doesn't shadow the image's (a more specific volume mount at a subpath takes precedence over the parent bind mount); **named volume `backend-dist`** for `/app/dist`, shared with the `internal` service (see 1.3), for the same reason.
- Config: edit `badhan-backend/.env.local` in place — `MONGODB_URI=mongodb://mongo:27017/Badhan-Test`. The file reaches the container via the whole-directory bind mount above (also baked into the image at build time via `COPY . .`, so it's present even before the bind mount attaches); no compose `environment:` block anywhere.
- `depends_on: mongo: condition: service_healthy`.
- Publish `3000:3000` to the host — matches current behavior (backend reachable at `localhost:3000`) and lets host tools (curl, Postman, the frontend dev server if ever run outside Compose) hit it directly.
- Healthcheck on `http://localhost:3000` — replaces `wait_for_port 3000` for the two dependents.
- `nodemon.json` sets `"legacyWatch": true` unconditionally, so it polls the filesystem instead of relying on inotify events. This is host-OS-independent by construction: whether a bind mount forwards native file-change events depends on the Docker Desktop backend in use (varies by OS and version — e.g. VirtioFS vs. osxfs/gRPC-FUSE on macOS, differs again on Windows/WSL2 and native Linux), so a fix that assumes a particular backend would silently break hot reload for developers on a different one. Polling avoids depending on that behavior at all, at the cost of a small constant CPU overhead and slightly slower reload — an acceptable, predictable trade for correctness on every OS.
- **Bug found and fixed during implementation:** the Dockerfile installs `procps` (`apt-get install -y procps`). Without it, nodemon's restart mechanism is silently broken in this image — it enumerates the process tree it needs to kill via the `pstree.remy` package, which normally shells out to `ps`; the `node:*-bookworm-slim` base doesn't include `ps`, so `pstree.remy` falls back to a hand-rolled `/proc` walker that has its own bug (it sorts `ls /proc` output lexicographically as strings, not numerically, so a grandchild process — `npm run serve:local` → `cross-env` → `node ./dist/bin/www` is 3 levels deep — can sort before its parent and get silently skipped in the single-pass tree walk). The practical effect: every hot-reload restart left the old `node ./dist/bin/www` orphaned and still holding port 3000, so the new instance crashed with `EADDRINUSE` while the stale process kept serving old code forever, undetectable from the outside since the port still answered. Verified via `docker compose exec` + manual `/proc` inspection and by testing `pstree.remy` directly inside the container before/after installing `procps`. This would have silently defeated hot reload for every developer using this setup.

### 1.3 `internal` service (port 4000)
- Same image as `backend`, command: nodemon watching `dist` → `npm run internal-server`, with `--legacyWatch` on this invocation too (or a second `nodemon.json` variant) — same polling rationale, since this watch also crosses a Docker-managed volume boundary rather than the host's native filesystem.
- **Decision: shared named volume for `dist`**, mounted into both `backend` and `internal`. The backend is the sole builder; the internal server's nodemon restarts when the build output changes — same contract as the current `start` script. (Independent builds were rejected: concurrent tsoa codegen races on the bind-mounted `src/tsoaRoutes`, version skew between the two servers against the same DB, and doubled build cost per save.)
- Publish `4000:4000` to the host — matches current behavior (`localhost:4000` for the reset/populate/backup endpoints) and lets you `curl` the seed endpoints from the host without going through another container.
- `depends_on: backend: condition: service_healthy`.

### 1.4 `frontend` service (port 8080)
- `badhan-frontend/Dockerfile`: `node:22.23.1-bookworm-slim`, same pinned tag as the backend, `npm ci`, cmd `npm run serve:local`.
- Vue dev server must listen on `0.0.0.0` (add `--host 0.0.0.0` or `devServer.host` in `vue.config.js`).
- Bind-mount the whole `./badhan-frontend` directory to `/app` + anonymous `node_modules` volume, same pattern as backend.
- Set `devServer.watchOptions.poll` (e.g. `1000`) in `vue.config.js`, for the same host-OS-independence reason as the backend's `legacyWatch`. **Correction (verified against webpack's own docs during implementation):** `CHOKIDAR_USEPOLLING` is not webpack's documented mechanism — webpack explicitly recommends `watchOptions.poll` for exactly this Docker/VirtualBox/WSL/NFS scenario, so that's what's implemented, not the env var from the original draft of this plan.
- The frontend calls the backend at a URL from its `--mode local` env — since the browser runs on the host, `localhost:3000` still works; no service-name change needed for browser-side calls.
- Publish `8080:8080` to the host — matches current behavior (`localhost:8080` in the browser); this one is required, not just convenient, since the browser itself runs on the host.
- `depends_on: backend: condition: service_healthy`.

### 1.5 What Compose replaces for free
- Port cleanup → `docker compose down`.
- Node 22 check → pinned base image.
- `ensureNpmInstall` → image build layer caching.
- `wait_for_port` → healthchecks + `depends_on` conditions.
- Parallel process runner (`runProcessesInParallel`) → Compose itself.

## Phase 2 — `--clean` equivalent

- Full clean: `docker compose down -v` (drops mongo data volume) + `docker compose build --no-cache` when deps must be reinstalled.
- DB seed: no npm scripts needed — the internal server already exposes the endpoints.
  With the stack up: `curl -X POST http://localhost:4000/reset-local-db && curl -X POST http://localhost:4000/populate-local-db`.
  **Decision: document these two commands in the README, no `./seed` script.**

## Phase 3 — Test profile (manual, no automation)

### 3.1 `backend-test` service — `profiles: ["test"]`
- `badhan-backend-test/Dockerfile`: `node:22.23.1-bookworm-slim`, same pinned tag as the backend, `npm ci`, cmd runs the Jest suite.
- Config via file, not injection: add a `.env` file in `badhan-backend-test` with:
  - `API_BASE_URL=http://backend:3000` (read by `tests/runtime/axios.js`)
  - `BACKUP_RESET_URL=http://internal:4000/reset-local-db`
  - `BACKUP_POPULATE_URL=http://internal:4000/populate-local-db`
  and a `dotenv.config()` call at the top of `tests/runtime/axios.js` (it already reads `process.env.API_BASE_URL`; dotenv just sources it from the file). Add `dotenv` as a dev dependency.
- `depends_on`: backend **and** internal healthy — DB reset/seed hooks below call `internal` directly, so both must be up before the suite starts.
- Run manually: `docker compose --profile test run --rm backend-test` — exit code is the suite result.

### 3.2 `frontend-test` service — `profiles: ["test"]`
- Base image `cypress/included:15.1.0` (matches the project's pinned `cypress@^15.1.0`) so browsers are preinstalled.
- **Decision: containerize Cypress, no platform pin.** `cypress/included` has published multi-arch manifests (linux/amd64 and linux/arm64) for a long time, well before Cypress 15 — so `docker compose` pulls the image matching whatever host architecture it runs on automatically. Do **not** set `platform: linux/amd64` on this service: doing so would force emulation on Apple Silicon hosts even though a native arm64 image exists, which is strictly worse than leaving it unpinned. This mirrors the nodemon/chokidar polling decision — solve for correctness across every host OS/arch by not depending on which one is running, rather than hardcoding an assumption.
- **Code change required** in `cypress.config.ts`: call `dotenv.config()` at the top, then use `process.env.CYPRESS_BASE_URL || 'http://localhost:8080'` for `baseUrl` and `process.env.API_BASE_URL || 'http://localhost:4000'` for `apiBase`. Values come from a `.env` file in `badhan-frontend-test` (`CYPRESS_BASE_URL=http://frontend:8080`, `API_BASE_URL=http://internal:4000`) — no compose env injection.
- `depends_on`: frontend + internal healthy.
- Run manually: `docker compose --profile test run --rm frontend-test`.

### 3.3 Test data
- Both suites already auto-seed via existing hooks — no new automation needed, just pointing the existing URLs at the `internal` service instead of `localhost:4000`:
  - Cypress: `before:spec` hook in `cypress.config.ts` calls `/reset-local-db` + `/populate-local-db` on `internal` before every spec.
  - Jest (`backend-test`): `tests/global-setup.js` resets before the suite, `tests/setup-after-env.js` resets before **every individual test** (`beforeEach`), and `tests/global-teardown.js` resets + populates after the suite — all three already read `BACKUP_RESET_URL` / `BACKUP_POPULATE_URL` env vars with a `localhost:4000` default, so no code change, only the `.env` file in 3.1.
- Because Jest resets the DB before every test, run order/isolation is already handled; no additional seeding step is needed around `docker compose --profile test run --rm backend-test`.

## Phase 4 — Manual `./deploy` script

A small shell (or Node) script at the repo root, run by hand only:

1. `docker compose --profile test run --rm backend-test` — abort on non-zero exit.
2. `docker compose --profile test run --rm frontend-test` — abort on non-zero exit.
3. `node badhan-backend/upload-gcloud.js` — unchanged, uses local gcloud auth.
4. `node badhan-frontend/upload-firebase.js` — unchanged, uses local firebase auth.

Deployment stays on the host (not containerized) so existing `gcloud`/`firebase` CLI
auth keeps working. The only behavioral change from `./start --test --deploy`: the
test gate can no longer be skipped.

## Phase 5 — Cleanup

- Delete `start`, `badhan-backup/scripts/parallel.mjs`, `port_cleanup.mjs`,
  `wait_for_port.mjs`, `ensure_npm_install.mjs`, `clean_all_dependencies.mjs`,
  and `badhan-backend/scripts/start_db.mjs` once the compose flow is verified.
- Add `mongodb_local/` removal note (stale cached mongod + data on disk).
- Update `README.md` with the new commands.

## Command cheat sheet (end state)

| Old | New |
|---|---|
| `node start` | `docker compose up` |
| `node start --clean` | `docker compose down -v && docker compose up --build` (+ seed one-off) |
| `node start --test` | `docker compose --profile test run --rm backend-test && docker compose --profile test run --rm frontend-test` |
| `node start --test --deploy` | `./deploy` |

## Source code changes (complete list)

1. `badhan-backend/.env.local` — `MONGODB_URI` host changes from `127.0.0.1` to `mongo`.
2. `badhan-frontend/vue.config.js` — add `host: '0.0.0.0'` and `allowedHosts: 'all'` to `devServer`.
3. `badhan-frontend-test/cypress.config.ts` — dotenv + env-file-driven `baseUrl` and `apiBase` (see 3.2).
4. `badhan-frontend-test` — new `.env` file; add `dotenv` dependency.
5. `badhan-backend-test/tests/runtime/axios.js` — add `dotenv.config()` at top (see 3.1).
6. `badhan-backend-test` — new `.env` file; add `dotenv` dependency.

No changes needed to backend source: ports default correctly in code, `.env.local` is
already the config mechanism, and watch-mode polling is nodemon/chokidar configuration
(`nodemon.json`, `.env.local`) rather than application code.

## Open questions / risks

None currently — all images are pinned to exact, verified versions: `mongo:7.0.14`,
`node:22.23.1-bookworm-slim` (latest Node 22 LTS patch, confirmed against
nodejs.org's release archive on 2026-07-11) across `backend`/`internal`/`frontend`/
`backend-test`, and `cypress/included:15.1.0` for `frontend-test`. All other prior
unknowns (dist watch across the named volume, file-watch polling overhead, Cypress
image resolution, `backend-test` seeding, host port publishing, `./seed` vs. README)
are resolved by decisions above.
