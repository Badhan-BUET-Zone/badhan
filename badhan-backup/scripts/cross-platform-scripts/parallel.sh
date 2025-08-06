#!/usr/bin/env bash
# parallel.sh — run any number of commands in parallel, prefixing their output
# Works on Linux, macOS, Windows Git-Bash / MSYS – **no setsid required**
set -euo pipefail


(( $# )) || { echo "Usage: $0 \"cmd1\" \"cmd2\" …" >&2; exit 1; }

pad () { printf "%02d" "$1"; }

# ─── Track PIDs of the *command* shells we start ────────────────
cmd_pids=()

# ─── Prefix helper — runs in a subshell, keeps the caller's tag ─
prefix() {
  local tag=$1
  while IFS= read -r line || [[ -n $line ]]; do
    printf '[%s] %s\n' "$tag" "$line"
  done
}

# ─── Launch each command -------------------------------------------------------
idx=0
for cmd in "$@"; do
  idx=$((idx+1)); tag=$(pad "$idx")

  #   bash -c "$cmd"   → gives us a PID we can kill later
  #   > >(prefix "$tag")  → process substitution prefixes the output
  bash -c "$cmd" 2>&1 > >(prefix "$tag") &
  cmd_pids+=( "$!" )
done

# ─── Clean-up: kill command PID plus any children it spawned ──────────────────
kill_tree() {
  local pid=$1

  # 1️⃣  Ask politely
  command -v pkill >/dev/null 2>&1 && pkill -INT -P "$pid" 2>/dev/null || true
  kill  -INT "$pid" 2>/dev/null || true

  # 2️⃣  Wait a beat, then force-kill anything that’s still around
  sleep 1
  command -v pkill >/dev/null 2>&1 && pkill -TERM -P "$pid" 2>/dev/null || true
  kill  -TERM "$pid" 2>/dev/null || true
}

cleanup() {
  echo -e "\n⏹️  Stopping all tasks…"
  for pid in "${cmd_pids[@]:-}"; do
    kill_tree "$pid"
  done
  wait 2>/dev/null || true
}
trap 'cleanup; exit 130' INT TERM
trap cleanup EXIT

# ─── Wait for all, propagate the first non-zero exit code ─────────────────────
exit_code=0
for pid in "${cmd_pids[@]}"; do
  wait "$pid" || exit_code=$?
done
echo "\n\n\n"
exit "$exit_code"
