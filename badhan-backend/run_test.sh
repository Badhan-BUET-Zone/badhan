#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# run_test.sh – Start the backend server, wait for it to be ready, run tests,
#               and shut the server down automatically on exit or interrupt.
#
# Usage: ./run_test.sh [PORT]
#        PORT (optional) – port the server listens on; defaults to 3000
# ---------------------------------------------------------------------------

set -euo pipefail   # -e: exit on error, -u: treat unset vars as errors, -o pipefail: fail on first pipe error

# ----- configurable parameters ---------------------------------------------
SERVER_PORT="${1:-3000}"     # Port to check for server readiness (env or first CLI arg, default 3000)
TEST_DIR="../badhan-test"    # Directory containing the frontend / test project
SERVER_CMD="npm run serve"   # Command to start the backend
TEST_CMD="npm run test"      # Command to run the tests
# ---------------------------------------------------------------------------

# cleanup(): kill the server when the script exits (normal or interrupted)
cleanup() {
    # If SERVER_PID is set and the process is still alive, terminate it
    if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "Stopping server (PID $SERVER_PID)…"
        kill "$SERVER_PID"
        # wait to reap the child process; ignore exit status if already exited
        wait "$SERVER_PID" 2>/dev/null || true
    fi
}
# Register cleanup() for normal exit, CTRL-C, or `kill`
trap cleanup EXIT INT TERM

# ----- start backend --------------------------------------------------------
echo "Starting backend server…"
$SERVER_CMD &          # Run server in the background
SERVER_PID=$!          # Record its PID for later cleanup

# ----- wait for server to become reachable ----------------------------------
echo -n "Waiting for port $SERVER_PORT to open"
while ! (echo >"/dev/tcp/127.0.0.1/$SERVER_PORT") 2>/dev/null; do
    echo -n "."        # progress dots
    sleep 1
done
echo -e "\nServer is up – running tests."

# ----- run tests ------------------------------------------------------------
(
    cd "$TEST_DIR"     # Change into test project directory
    $TEST_CMD          # Execute test suite (inherits script’s error handling)
)

echo "Tests finished."
# Server process is terminated automatically by the trap/cleanup handler
