#!/usr/bin/env bash
# install_podman_local.sh ─ rootless / portable Podman installer
#   • Works on Linux, macOS, Windows-Git-Bash (remote client only)
#   • Needs no sudo / admin
#   • Installs into  <script-dir>/podman-bin  and adds it to PATH
#   • Set PODMAN_VERSION=... to override the default tag

set -euo pipefail

# ── where is this script? ───────────────────────────────────────────
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
BIN_DIR="$SCRIPT_DIR/podman-bin"
mkdir -p "$BIN_DIR"

export PATH="$BIN_DIR:$PATH"          # make the fresh binary usable *now*

VERSION="${PODMAN_VERSION:-5.1.0}"
OS=$(uname -s)
ARCH=$(uname -m)

echo "Installing Podman ${VERSION} to ${BIN_DIR}"

fetch() {
  local url=$1 out=$2
  echo "→ Downloading $url"
  curl -L --silent --fail --show-error -o "$out" "$url"
}

extract_tar() {
  tar -C "$BIN_DIR" --strip-components=1 -xf "$1"
  rm "$1"
}

case "$OS" in
  Linux)
    FILE="podman-${VERSION}-$(echo "$ARCH" | sed 's/x86_64/amd64/;s/aarch64/arm64/')-static.tar.gz"
    URL="https://github.com/containers/podman/releases/download/v${VERSION}/${FILE}"
    TMP="/tmp/${FILE}"
    fetch "$URL" "$TMP"
    extract_tar "$TMP"
    ;;

  Darwin)
    FILE="podman-${VERSION}-darwin-$(echo "$ARCH" | sed 's/x86_64/amd64/;s/arm64/arm64/')-tar.gz"
    URL="https://github.com/containers/podman/releases/download/v${VERSION}/${FILE}"
    TMP="/tmp/${FILE}"
    fetch "$URL" "$TMP"
    extract_tar "$TMP"
    ;;

  MINGW*|MSYS*|CYGWIN*)
    FILE="podman-remote-release-windows_amd64.zip"
    URL="https://github.com/containers/podman/releases/download/v${VERSION}/${FILE}"
    TMP="/tmp/${FILE}"
    fetch "$URL" "$TMP"
    unzip -q "$TMP" -d "$BIN_DIR"
    rm "$TMP"
    ;;

  *)
    echo "✖ Unsupported OS: $OS"; exit 1 ;;
esac

chmod +x "$BIN_DIR"/podman* 2>/dev/null || true

echo -e "\n✔ Podman placed in ${BIN_DIR}"
echo   "ℹ PATH updated for this script.  To use Podman later, run it from this directory"
echo   "  or add 'export PATH=\"${BIN_DIR}:\$PATH\"' to your shell RC."
