#!/usr/bin/env bash
# wait-for-port.sh — wait until localhost:<port> is listening (Git Bash / macOS / Linux)
# Usage:  ./wait-for-port.sh 8080
# Env vars:
#   WAIT_INTERVAL   polling interval in seconds (default: 0.3)

set -euo pipefail

die(){ echo "❌ $*" >&2; exit 1; }

# -------- Parse & validate args ----------
PORT="${1:-}"
[[ -n "$PORT" ]] || die "Port required.\nUsage: $0 <port>"
[[ "$PORT" =~ ^[0-9]+$ ]] || die "Port must be a number"
(( PORT > 0 && PORT < 65536 )) || die "Port must be between 1 and 65535"

INTERVAL="${WAIT_INTERVAL:-0.3}"

echo "⏳ Waiting for localhost:$PORT to start listening..."

# -------- Checker using Bash's /dev/tcp (works in Git Bash/macOS/Linux) ----------
is_listening() {
  # Try to open a TCP connection; success => port is accepting connections
  ( : > "/dev/tcp/127.0.0.1/$PORT" ) 2>/dev/null
}

# -------- Poll loop ----------
while ! is_listening; do
  sleep "$INTERVAL"
done

echo "✅ Port $PORT is listening on localhost."
