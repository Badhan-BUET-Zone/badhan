#!/usr/bin/env bash
# parallel.sh — cross-platform “PM2-lite” in ~110 lines
# Works on Linux, macOS, and Windows Git-Bash / MSYS2
#
#   ./parallel.sh "npm run dev" "python api.py" "bash start_db"
#
# Each command’s stdout/stderr is line-buffered and prefixed: [01] …

set -euo pipefail

(( $# )) || { echo "Usage: $0 \"cmd1\" \"cmd2\" …" >&2; exit 1; }

pad() { printf "%02d" "$1"; }

# ─── Data we track ────────────────────────────────────────────────
pgids=()          # process-group IDs to kill at shutdown
prefix_pids=()    # PIDs of the little prefixer loops
fifos=()          # temp named pipes (one per command)

# ─── Clean-up handler ─────────────────────────────────────────────
cleanup() {
  # 1) Stop the commands (kill their entire process groups)
  for pg in "${pgids[@]}"; do
    kill -TERM "-$pg" 2>/dev/null || true     # “-pgid” = whole group
  done

  # 2) Stop the prefixer loops that read the FIFOs
  for p in "${prefix_pids[@]}"; do
    kill -TERM "$p" 2>/dev/null || true
  done

  # 3) Give children a moment, then remove FIFOs
  sleep 0.1
  rm -f "${fifos[@]}" 2>/dev/null || true
  wait || true
}

trap 'cleanup; exit 130' INT TERM   # Ctrl-C or `kill $script`
trap cleanup EXIT                   # script ends normally

# ─── Launch every command ─────────────────────────────────────────
i=0
for cmd in "$@"; do
  i=$((i+1)); tag=$(pad "$i")

  fifo=$(mktemp -u)     # unique name, then…
  mkfifo "$fifo"        # … create the named pipe
  fifos+=("$fifo")

  # ---- prefixer loop ----
  {
    # shellcheck disable=SC2016
    while IFS= read -r line <"$fifo" || [[ -n $line ]]; do
      printf '[%s] %s\n' "$tag" "$line"
    done
  } &
  prefix_pids+=("$!")

  # ---- the real command ----
  # stdout & stderr go into the FIFO; run in background
  bash -c "$cmd" >"$fifo" 2>&1 &
  cmd_pid=$!

  # Find its *process-group* (pgid).  ps exists on Linux / macOS / Git-Bash.
  pgid=$(ps -o pgid= "$cmd_pid" 2>/dev/null | tr -d ' ')
  pgid=${pgid:-$cmd_pid}        # fallback: assume pgid == pid
  pgids+=("$pgid")
done

wait     # wait for every backgrounded command
