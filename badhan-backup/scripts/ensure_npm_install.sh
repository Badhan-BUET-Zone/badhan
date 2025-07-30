#!/usr/bin/env bash
# ensure_npm_install.sh — idempotent “npm install”
# Usage:  ./ensure_npm_install.sh /path/to/project
# Stores one stamp‑file per project inside   <script_dir>/.npm_install_stamps/

set -euo pipefail

die() { echo "❌  $*" >&2; exit 1; }

# ---- 0.  Paths ----
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
stamp_root="$script_dir/.npm_install_stamps"
mkdir -p "$stamp_root"

# ---- 1.  Locate project ----
proj_dir="${1:-.}"
[[ -d "$proj_dir" ]]        || die "Directory not found: $proj_dir"
cd "$proj_dir"
[[ -f package.json ]]       || die "package.json not found in $PWD"

# ---- 2.  Per‑project stamp location (hash of absolute path) ----
proj_abs="$(pwd -P)"
hash_cmd() { command -v sha1sum >/dev/null && sha1sum || shasum -a 1; }
stamp_hash="$(printf '%s' "$proj_abs" | hash_cmd | awk '{print $1}')"
stamp="$stamp_root/$stamp_hash.stamp"

# ---- 3.  Decide if we need to (re)install ----
lockfile='package-lock.json'  # or npm-shrinkwrap.json
need_install=false
[[ ! -d node_modules          ]] && need_install=true
[[ ! -f "$stamp"              ]] && need_install=true
[[ package.json -nt "$stamp"  ]] && need_install=true
[[ -f $lockfile && $lockfile -nt $stamp ]] && need_install=true

# ---- 4.  Act ----
if $need_install; then
  echo "➡️  Running \`npm install\` in $PWD ..."
  if npm install; then
    date +%s > "$stamp"
    echo "✅  Dependencies installed. (stamp: $stamp)"
  else
    echo "❌  npm install failed."
    exit 1
  fi
else
  echo "✔️  Already up‑to‑date – skipping npm install."
fi
