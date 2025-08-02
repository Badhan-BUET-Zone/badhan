#!/usr/bin/env bash
# kill_ports_nosudo.sh — kill whatever you own on the ports you pass in
#   macOS / Linux: lsof (no sudo needed)
#   Windows Git-Bash: netstat + taskkill
# Usage examples:
#   bash kill_ports_nosudo.sh        # uses default 27017 3000 8080
#   bash kill_ports_nosudo.sh 5432   # just PostgreSQL
#   bash kill_ports_nosudo.sh 8000 8080 3000

set -euo pipefail

# ── ports to clean ───────────────────────────────────────────────
PORTS=("$@")
[[ ${#PORTS[@]} -eq 0 ]] && PORTS=(27017 3000 8080)

is_windows() { [[ $(uname -s) =~ ^(MINGW|MSYS|CYGWIN) ]]; }

kill_pid_unix() {
  local pid=$1 port=$2
  if kill -9 "$pid" 2>/dev/null; then
    printf "✔︎ Killed PID %s on port %s\n" "$pid" "$port"
  fi
}

kill_pid_windows() {
  local pid=$1 port=$2
  if taskkill //PID "$pid" //F //T &>/dev/null; then
    printf "✔︎ Task-killed PID %s on port %s\n" "$pid" "$port"
  fi
}

for port in "${PORTS[@]}"; do
  echo "🔍 Looking for processes on port $port …"
  killed_any=false

  # ---------- Preferred on Unix: lsof ----------
  if ! is_windows && command -v lsof >/dev/null 2>&1; then
    while read -r pid; do
      [[ -n $pid ]] && { kill_pid_unix "$pid" "$port"; killed_any=true; }
    done < <(lsof -ti tcp:"$port")
  fi

  # ---------- Fallback: netstat ----------
  if command -v netstat >/dev/null 2>&1; then
    if is_windows; then
      while read -r pid; do
        [[ -n $pid ]] && { kill_pid_windows "$pid" "$port"; killed_any=true; }
      done < <(netstat -ano | awk -v p=":$port" '$0 ~ p && /LISTEN|LISTENING/ {print $NF}' | sort -u)
    else
      while read -r pid; do
        [[ -n $pid ]] && { kill_pid_unix "$pid" "$port"; killed_any=true; }
      done < <(netstat -nlp 2>/dev/null | awk -v p=":$port" '$0 ~ p {split($7,a,"/"); print a[1]}' | sort -u)
    fi
  fi

  $killed_any || echo "ℹ︎ No process was listening on port $port"
done
