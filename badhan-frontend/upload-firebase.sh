#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# upload-firebase.sh
# ---------------------------------------------------------------------------
# Build & deploy Vue app to the correct Firebase Hosting project.
#
#   • **main**        → `npm run build`         → Firebase project **badhan‑buet**
#   • **test-branch** → `npm run build:testing` → Firebase project **badhan‑buet‑test**
#
# 🔧 **Setup / First‑Time Use**
# ---------------------------------------------------------------------------
# No global installs required. This script will:
#   1. Ensure `firebase-tools` is installed locally as a *dev dependency*
#      (runs `npm install --save-dev firebase-tools` automatically if missing).
#   2. Detect the current Git branch and pick the correct build command &
#      Firebase project.
#   3. Build the Vue app.
#   4. Deploy `dist/` to the chosen Firebase Hosting site via `npx firebase`.
# ---------------------------------------------------------------------------
set -euo pipefail

# ──────────────────────────────────────────────────────────────
# 0. Ensure firebase-tools is available locally (auto‑install if needed)
# ──────────────────────────────────────────────────────────────
if ! npx --no-install firebase --version >/dev/null 2>&1; then
  echo "ℹ️  firebase-tools not found in node_modules. Installing as dev dependency…"
  npm install --save-dev firebase-tools
fi

# ──────────────────────────────────────────────────────────────
# 1. Detect current Git branch
# ──────────────────────────────────────────────────────────────
current_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
if [[ -z "$current_branch" ]]; then
  echo "❌  Unable to determine the current Git branch. Aborting." >&2
  exit 1
fi

echo "🔍  Current branch: $current_branch"

# ──────────────────────────────────────────────────────────────
# 2. Map branch → build command & Firebase project
# ──────────────────────────────────────────────────────────────
case "$current_branch" in
  main)
    build_cmd="npm run build"
    firebase_project="badhan-buet"
    ;;
  test-branch)
    build_cmd="npm run build:development"
    firebase_project="badhan-buet-test"
    ;;
  *)
    echo "⚠️  Branch '$current_branch' is not mapped to a Firebase project. Skipping deployment." >&2
    exit 0
    ;;
esac

echo "🔨  Running build command: $build_cmd"
$build_cmd

# ──────────────────────────────────────────────────────────────
# 3. Deploy using local firebase-tools via npx
# ──────────────────────────────────────────────────────────────

echo "🚀  Deploying to Firebase project '$firebase_project'…"

config_file="firebase.$firebase_project.json"

npx --no-install firebase deploy \
  --only hosting \
  --project "$firebase_project" \
  --config "$config_file"

echo "✅  Deployment complete."
