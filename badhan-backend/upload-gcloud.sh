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

run_tests() {                       # Wrapper so we can log & reuse later
  echo "🧪  Running test suite…"
  ./run_test.sh            # exits non-zero on failure → whole script aborts
  echo "✅  All tests passed."
}

# ── branch-specific logic ────────────────────────────────────────────────
case "$current_branch" in
  main)
    require_file ".env.production"
    # run_tests                 # <── NEW: ensure tests succeed first
    update_last_deployed
    gcloud app deploy --project badhan-buet ./app_prod.yaml --quiet
    ;;

  test-branch)
    require_file ".env.development"
    # run_tests               # uncomment if you also want tests here
    update_last_deployed
    gcloud app deploy --project badhan-buet-test ./app_dev.yaml --quiet
    ;;

  *)
    echo "🛑  Deploy halted: branch \"$current_branch\" is not allowed."
    exit 1
    ;;
esac
