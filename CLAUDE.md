# Project instructions

## Documentation

Any new or changed app behaviour — a screen, a button, a permission, a rule — must be
documented in the user manual at [docs/manual/](docs/manual/) in the same change.

## Running commands

**Never run `npm`, `node`, or `npx` on the host.** Every such command must run
**inside the relevant Docker container** via `docker compose`. The host does not have the
project's `node_modules` (they live in the container volumes), so host runs will fail or
behave inconsistently.

Service names (see [docker-compose.yml](docker-compose.yml)): `backend`, `frontend`,
`internal`, `mongo`, `backend-test`, `frontend-test`, and — under the `deploy` profile,
driven by the scripts below rather than by hand — `backend-deploy`, `frontend-deploy`,
`android`.

Run commands with `docker compose exec <service> <cmd>` when the stack is up, or
`docker compose run --rm <service> <cmd>` for a one-off when it isn't. Examples:

- Backend typecheck / build: `docker compose exec backend npx tsc --noEmit`,
  `docker compose exec backend npm run build`
- Backend tsoa: `docker compose exec backend npm run tsoa:routes`
- Frontend: `docker compose exec frontend npm run build`
- Backend tests: `docker compose run --rm backend-test <cmd>` (uses the `test` profile)
- Frontend/Cypress tests: `docker compose run --rm frontend-test <cmd>`

Start the stack first if needed: `docker compose up -d`.

### Exceptions

These four scripts are host-only tooling — they run outside Docker and are the **only**
places where `npm`/`node`/`npx` on the host is allowed:

- [deploy.js](deploy.js)
- [badhan-android/upload-googleplay.js](badhan-android/upload-googleplay.js)
- [badhan-frontend/upload-firebase.js](badhan-frontend/upload-firebase.js)
- [badhan-backend/upload-gcloud.js](badhan-backend/upload-gcloud.js)

They are exceptions because they **orchestrate**: they read the git branch, clone the
secrets repo, and shell out to `docker compose`, which a container has no socket to do.
`./deploy.js` is itself a Node script and requires the other three in-process.
They share two host-side modules, which are libraries rather than entry points:
[deploy-container.js](deploy-container.js) (runs a CLI inside its deploy container) and
[environments.js](environments.js) (the single branch → environment → deploy-target map;
add a new environment or retarget one there, never in an upload script).
Every tool they drive — `gcloud`, `firebase`, `bubblewrap`, `fastlane`, and every build —
runs in a container, via [deploy-container.js](deploy-container.js). Do not add a host
CLI dependency to them; add it to the `deploy` stage of the relevant app's
Dockerfile ([badhan-backend](badhan-backend/Dockerfile),
[badhan-frontend](badhan-frontend/Dockerfile)) or to
[badhan-android/Dockerfile](badhan-android/Dockerfile)
for the Android toolchain, instead.
