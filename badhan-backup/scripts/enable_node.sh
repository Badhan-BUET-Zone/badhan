#!/bin/bash

# install_node.sh — Install Node.js 22 locally in /nodejs and set up the environment

set -e

NODE_VERSION="22.0.0"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
INSTALL_DIR="${SCRIPT_DIR}/nodejs"
CACHE_DIR="${INSTALL_DIR}/cache"
BIN_DIR="${INSTALL_DIR}/bin"
TARBALL=""
PLATFORM=""
ARCH=""

# Detect platform
case "$(uname -s)" in
  Linux*)   PLATFORM="linux" ;;
  Darwin*)  PLATFORM="darwin" ;;
  CYGWIN*|MINGW32*|MSYS*|MINGW*) PLATFORM="win" ;;
  *)        echo "❌ Unsupported platform: $(uname -s)"; exit 1 ;;
esac

# Detect architecture
case "$(uname -m)" in
  x86_64)  ARCH="x64" ;;
  arm64)   ARCH="arm64" ;;
  *)       echo "❌ Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

# Tarball name
if [ "$PLATFORM" = "win" ]; then
  TARBALL="node-v${NODE_VERSION}-win-${ARCH}.zip"
else
  TARBALL="node-v${NODE_VERSION}-${PLATFORM}-${ARCH}.tar.gz"
fi

DOWNLOAD_URL="https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}"

# Prepare directories
mkdir -p "${INSTALL_DIR}" "${CACHE_DIR}"

# Windows: update BIN_DIR since binaries are not under `bin/`
if [ "$PLATFORM" = "win" ]; then
  BIN_DIR="${INSTALL_DIR}"
fi

# Install Node.js if not already installed
if [ ! -x "${BIN_DIR}/node" ] && [ ! -x "${BIN_DIR}/node.exe" ]; then
  echo "⬇️  Downloading Node.js v${NODE_VERSION}..."
  
  if command -v curl &> /dev/null; then
    curl -L "${DOWNLOAD_URL}" -o "${CACHE_DIR}/${TARBALL}"
  elif command -v wget &> /dev/null; then
    wget "${DOWNLOAD_URL}" -O "${CACHE_DIR}/${TARBALL}"
  else
    echo "❌ Neither curl nor wget is available. Please install one of them."
    exit 1
  fi

  echo "📦 Installing Node.js v${NODE_VERSION}..."

  if [ "$PLATFORM" = "win" ]; then
    unzip -q "${CACHE_DIR}/${TARBALL}" -d "${CACHE_DIR}/unzipped"
    mv "${CACHE_DIR}/unzipped/node-v${NODE_VERSION}-win-${ARCH}"/* "${INSTALL_DIR}/"
    rm -rf "${CACHE_DIR}/unzipped"
  else
    tar -xzf "${CACHE_DIR}/${TARBALL}" -C "${INSTALL_DIR}" --strip-components=1
  fi

  echo "✅ Node.js v${NODE_VERSION} installed successfully to ${INSTALL_DIR}"
fi

# Add to PATH for current session
if [[ ":$PATH:" != *":${BIN_DIR}:"* ]]; then
  export PATH="${BIN_DIR}:$PATH"
fi

# Verify installation
if [ -x "${BIN_DIR}/node" ] || [ -x "${BIN_DIR}/node.exe" ]; then
  echo "✅ Node.js version: $("${BIN_DIR}/node" --version)"
  echo "✅ npm version: $("${BIN_DIR}/npm" --version)"
else
  echo "❌ Node.js installation failed"
  exit 1
fi
