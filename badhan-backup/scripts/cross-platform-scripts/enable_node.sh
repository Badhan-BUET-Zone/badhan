#!/bin/bash

# This script installs Node.js 22 locally in a scripts directory and sets up the environment

set -e

NODE_VERSION="22.0.0"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
INSTALL_DIR="${SCRIPT_DIR}/scripts/nodejs"
BIN_DIR="${INSTALL_DIR}/bin"
CACHE_DIR="${INSTALL_DIR}/cache"
TARBALL=""
PLATFORM=""
ARCH=""

# Determine platform and architecture
case "$(uname -s)" in
  Linux*)   PLATFORM="linux";;
  Darwin*)  PLATFORM="darwin";;
  CYGWIN*|MINGW32*|MSYS*|MINGW*) PLATFORM="win";;
  *)        echo "Unsupported platform"; exit 1;;
esac

case "$(uname -m)" in
  x86_64)  ARCH="x64";;
  arm64)   ARCH="arm64";;
  *)       echo "Unsupported architecture"; exit 1;;
esac

# Windows has a different tarball name
if [ "$PLATFORM" = "win" ]; then
  TARBALL="node-v${NODE_VERSION}-win-${ARCH}.zip"
else
  TARBALL="node-v${NODE_VERSION}-${PLATFORM}-${ARCH}.tar.gz"
fi

DOWNLOAD_URL="https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}"

# Create directories if they don't exist
mkdir -p "${INSTALL_DIR}" "${CACHE_DIR}"

# Download and install Node.js if not already installed
if [ ! -f "${BIN_DIR}/node" ] && [ ! -f "${BIN_DIR}/node.exe" ]; then
  echo "Downloading Node.js v${NODE_VERSION}..."
  
  if command -v curl &> /dev/null; then
    curl -L "${DOWNLOAD_URL}" -o "${CACHE_DIR}/${TARBALL}"
  elif command -v wget &> /dev/null; then
    wget "${DOWNLOAD_URL}" -O "${CACHE_DIR}/${TARBALL}"
  else
    echo "Neither curl nor wget found. Please install one of them."
    exit 1
  fi

  echo "Installing Node.js v${NODE_VERSION}..."
  
  if [ "$PLATFORM" = "win" ]; then
    unzip -q "${CACHE_DIR}/${TARBALL}" -d "${INSTALL_DIR}"
    mv "${INSTALL_DIR}/node-v${NODE_VERSION}-win-${ARCH}"/* "${INSTALL_DIR}/"
    rm -rf "${INSTALL_DIR}/node-v${NODE_VERSION}-win-${ARCH}"
  else
    tar -xzf "${CACHE_DIR}/${TARBALL}" -C "${INSTALL_DIR}" --strip-components=1
  fi

  echo "Node.js v${NODE_VERSION} installed successfully to ${INSTALL_DIR}"
else
  echo "Node.js is already installed in ${INSTALL_DIR}"
fi

# Add the bin directory to PATH if not already there
if [[ ":$PATH:" != *":${BIN_DIR}:"* ]]; then
  export PATH="${BIN_DIR}:$PATH"
  echo "Added Node.js to PATH for this session"
fi

# Verify installation
if [ -f "${BIN_DIR}/node" ] || [ -f "${BIN_DIR}/node.exe" ]; then
  echo "Node.js environment ready:"
  echo "Node.js version: $("${BIN_DIR}/node" --version)"
  echo "npm version: $(npm --version)"
else
  echo "Node.js installation failed"
  exit 1
fi