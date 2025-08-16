#!/usr/bin/env bash
set -euo pipefail                   # exit on error, unset var, or failed pipe

current_branch=$(git rev-parse --abbrev-ref HEAD)

# ── helpers ──────────────────────────────────────────────────────────────
require_file() {                    # Abort if a required file is missing
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "🛑  Deploy halted: required file \"$file\" not found."
    exit 1
  fi
}

update_last_deployed() {            # Record timestamp in last_deployed.txt
  printf '%s\n' "$(date '+%-d %B %Y at %I:%M:%S %p')" > last_deployed.txt
}

# ── branch-specific logic ────────────────────────────────────────────────
case "$current_branch" in
  main)
    require_file ".env.production"
    update_last_deployed
    gcloud app deploy --project badhan-buet ./app_prod.yaml --quiet
    ;;
  *)
    require_file ".env.development"
    update_last_deployed
    gcloud app deploy --project badhan-buet-test ./app_dev.yaml --quiet
    ;;
esac
