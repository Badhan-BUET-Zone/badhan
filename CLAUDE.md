# Project instructions

## Running commands

**Never run `npm`, `node`, or `npx` on the host.** Every such command must run
**inside the relevant Docker container** via `docker compose`. The host does not have the
project's `node_modules` (they live in the container volumes), so host runs will fail or
behave inconsistently.

Service names (see [docker-compose.yml](docker-compose.yml)): `backend`, `frontend`,
`internal`, `mongo`, `backend-test`, `frontend-test`.

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

These three scripts are host-only tooling — they run outside Docker and are the **only**
places where `npm`/`node`/`npx` on the host is allowed:

- [badhan-frontend/bubblewrap/upload-googleplay.js](badhan-frontend/bubblewrap/upload-googleplay.js)
- [badhan-frontend/upload-firebase.js](badhan-frontend/upload-firebase.js)
- [badhan-backend/upload-gcloud.js](badhan-backend/upload-gcloud.js)
