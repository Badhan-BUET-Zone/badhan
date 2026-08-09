#!/usr/bin/env bash
#
# Manual deploy script — run by hand only.
#
# Replaces `./start --test --deploy`. Runs both test suites as one-off
# containers under the `test` compose profile (compose starts their
# dependencies automatically), and only deploys if BOTH suites pass. Unlike
# the old flow, the test gate cannot be skipped.
#
# Nothing here needs gcloud or firebase on the host: both run in the `deploy`
# container and read their credentials from .deploy-auth/ (gitignored), which
# is a plain host directory and therefore survives `docker compose down -v`.
# Log in once with `./deploy --login`.
#
# Usage: ./deploy [--login | --relogin | --help]
set -euo pipefail

cd "$(dirname "$0")"

# The deploy container writes into the bind-mounted repo. On Linux (and WSL2)
# container root would leave root-owned files behind, so pass the host uid
# through; on macOS Docker Desktop already maps writes to the invoking user and
# the compose default of 0:0 is correct. Mirrors childEnv() in
# deploy-container.js, which does the same for the upload scripts.
if [ "$(uname -s)" = "Linux" ]; then
  export DEPLOY_UID="$(id -u)" DEPLOY_GID="$(id -g)"
fi

usage() {
  cat <<'EOF'
Usage: ./deploy [option]

  (no option)   Run both test suites, then deploy backend + frontend.
  --login       Log the deploy container in to Google Cloud and Firebase.
  --relogin     Force a fresh login for both, replacing existing credentials.
  --help        Show this message.

Credentials are stored in .deploy-auth/ at the repo root (gitignored) and
survive `docker compose down -v`. Neither CLI has to be installed on the host.
EOF
}

# Both flows are browserless: the container prints a URL you open on the host,
# and you paste the resulting code back. No -T here — `docker compose run`
# allocates the TTY these prompts need, and -T is reserved for the checks that
# parse stdout.
login() {
  local gcloud_flags="$1" firebase_flags="$2"

  # Created host-side so it is owned by the developer, not by the container uid.
  mkdir -p .deploy-auth

  echo "🔑  Logging in to Google Cloud (paste the URL into any browser)…"
  docker compose --profile deploy run --rm deploy gcloud auth login --no-launch-browser $gcloud_flags

  echo "🔑  Logging in to Firebase…"
  docker compose --profile deploy run --rm deploy firebase login --no-localhost $firebase_flags

  echo "✅  Logged in. Verifying…"
  # The same preflight the deploy runs, so --login cannot report success on
  # credentials that would fail ten seconds later — including access to the
  # project this branch actually deploys to.
  node badhan-backend/upload-gcloud.js --check
  node badhan-frontend/upload-firebase.js --check
}

case "${1:-}" in
  --help|-h)
    usage
    exit 0
    ;;
  --login)
    login "" ""
    exit 0
    ;;
  --relogin)
    # `firebase login` answers "Already logged in" and will not refresh an
    # expired token; --reauth is the only thing that clears that state.
    login "--force" "--reauth"
    exit 0
    ;;
  "")
    ;;
  *)
    echo "Unknown option: $1" >&2
    usage >&2
    exit 1
    ;;
esac

echo "🔎  Checking deployment requirements before running tests…"
node badhan-backend/upload-gcloud.js --check
node badhan-frontend/upload-firebase.js --check
echo "✅  Requirements satisfied."

echo "🧪  Running backend test suite (Jest)…"
docker compose --profile test run --rm backend-test

echo "🧪  Running frontend test suite (Cypress)…"
docker compose --profile test run --rm frontend-test

echo "✅  All tests passed. Deploying…"

echo "☁️   Deploying backend to Google Cloud…"
node badhan-backend/upload-gcloud.js

echo "🩺  Verifying the deployed backend is live…"
node badhan-backend/upload-gcloud.js --live-check

echo "🔥  Deploying frontend to Firebase…"
node badhan-frontend/upload-firebase.js

echo "🚀  Deploy complete."
