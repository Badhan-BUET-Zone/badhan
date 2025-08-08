#!/usr/bin/env bash
# install_node.sh — Install Node.js 22 locally in <script_dir>/nodejs and set up the environment

set -euo pipefail

NODE_VERSION="22.0.0"

# ── 0. Locate this script ────────────────────────────────────────────────
# Resolve to an absolute, canonical path (works on Linux, macOS, Git-Bash)
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"

# Everything below is now based on SCRIPT_DIR, not on $PWD
INSTALL_DIR="${SCRIPT_DIR}/nodejs"
CACHE_DIR="${INSTALL_DIR}/cache"
BIN_DIR="${INSTALL_DIR}/bin"

# ── 1. Detect platform / arch ────────────────────────────────────────────
case "$(uname -s)" in
  Linux*)   PLATFORM="linux"  ;;
  Darwin*)  PLATFORM="darwin" ;;
  CYGWIN*|MINGW32*|MSYS*|MINGW*) PLATFORM="win" ;;
  *)        echo "❌ Unsupported platform: $(uname -s)"; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64) ARCH="x64"  ;;
  arm64)  ARCH="arm64";;
  *)      echo "❌ Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

# On Windows, Node’s executables sit at the top level
[[ $PLATFORM == "win" ]] && BIN_DIR="${INSTALL_DIR}"

TARBALL="node-v${NODE_VERSION}-${PLATFORM}-${ARCH}$([[ $PLATFORM == "win" ]] && echo '.zip' || echo '.tar.gz')"
DOWNLOAD_URL="https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}"

# ── 2. Prepare directories ───────────────────────────────────────────────
mkdir -p "${CACHE_DIR}" "${BIN_DIR}"

# ── 3. Download + unpack if needed ───────────────────────────────────────
if [[ ! -x "${BIN_DIR}/node" && ! -x "${BIN_DIR}/node.exe" ]]; then
  echo "⬇️  Downloading Node.js v${NODE_VERSION} to cache…"
  DL_TOOL=""
  command -v curl >/dev/null 2>&1 && DL_TOOL="curl -L --fail -o"
  command -v wget >/dev/null 2>&1 && DL_TOOL=${DL_TOOL:-"wget -O"}
  [[ -z $DL_TOOL ]] && { echo "❌ Install curl or wget first."; exit 1; }

  $DL_TOOL "${CACHE_DIR}/${TARBALL}" "${DOWNLOAD_URL}"

  echo "📦 Extracting to ${INSTALL_DIR}…"
  if [[ $PLATFORM == "win" ]]; then
    unzip -q "${CACHE_DIR}/${TARBALL}" -d "${CACHE_DIR}/unzipped"
    mv "${CACHE_DIR}/unzipped/node-v${NODE_VERSION}-win-${ARCH}"/* "${INSTALL_DIR}/"
    rm -rf "${CACHE_DIR}/unzipped"
  else
    tar -xzf "${CACHE_DIR}/${TARBALL}" -C "${INSTALL_DIR}" --strip-components=1
  fi
  echo "✅ Node.js installed at ${INSTALL_DIR}"
fi

# ── 4. Add to PATH for this shell session ────────────────────────────────
case ":$PATH:" in
  *":${BIN_DIR}:"*) : ;;  # already present
  *) export PATH="${BIN_DIR}:$PATH" ;;
esac

# ── 5. Verify ────────────────────────────────────────────────────────────
if [[ -x "${BIN_DIR}/node" || -x "${BIN_DIR}/node.exe" ]]; then
  echo "🔹 node version: $("${BIN_DIR}/node" --version)"
  echo "🔹 npm  version: $("${BIN_DIR}/npm"  --version)"
else
  echo "❌ Node.js installation failed"
  exit 1
fi
