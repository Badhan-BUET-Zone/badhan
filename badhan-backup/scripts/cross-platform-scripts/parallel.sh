#!/usr/bin/env bash
# run_parallel.sh — run ANY number of long‑running commands side‑by‑side
# Works in: Linux, macOS, Windows Git Bash (MINGW)
#
# Usage:
#   ./run_parallel.sh "npm run dev" "python api.py" "mongod --config mongod.conf"
#   ./run_parallel.sh cmd1 cmd2 cmd3 ...
#
# Notes:
#  • Each command's stdout/stderr is line-buffered and prefixed: [01], [02], …
#  • Ctrl+C cleanly stops all children.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  run_parallel.sh "cmd1" "cmd2" ...

Runs all commands in parallel and prefixes their output.
EOF
}

(( $# )) || { usage >&2; exit 1; }

# ------------- Helpers -------------
pids=()
cleanup() {
  # propagate signal to children
  for p in "${pids[@]:-}"; do
    kill "$p" 2>/dev/null || true
  done
  # wait to avoid zombies
  wait || true
}
trap 'cleanup; exit 130' INT TERM
trap 'cleanup' EXIT

pad() { printf "%02d" "$1"; }

# ------------- Launch commands -------------
i=0
for cmd in "$@"; do
  i=$((i+1))
  tag="$(pad "$i")"

  # Run each command in its own subshell, pipe through a prefixer, background it
  {
    # Use eval to allow shell features in the command string
    eval "$cmd" 2>&1 | while IFS= read -r line || [[ -n "$line" ]]; do
      printf '[%s] %s\n' "$tag" "$line"
    done
  } &
  pids+=("$!")
done

# ------------- Wait & propagate exit codes -------------
exit_code=0
for p in "${pids[@]}"; do
  if ! wait "$p"; then
    exit_code=1
  fi
done

exit "$exit_code"