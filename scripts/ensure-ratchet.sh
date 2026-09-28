#!/usr/bin/env bash
# scripts/ensure-ratchet.sh
# Ensures sethvargo/ratchet is installed and returns its executable path.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

RATCHET_VERSION="${RATCHET_VERSION:-0.12.0}"
TARGET_DIR="${REPO_ROOT}/.bin"
TARGET_BIN="${TARGET_DIR}/ratchet"

# 1. Check if ratchet is already on system PATH and executable
if command -v ratchet >/dev/null 2>&1; then
  if ratchet --help >/dev/null 2>&1; then
    echo "$(command -v ratchet)"
    exit 0
  fi
fi

# 2. Check if ratchet is already installed in .bin
if [ -x "${TARGET_BIN}" ]; then
  if "${TARGET_BIN}" --help >/dev/null 2>&1; then
    echo "${TARGET_BIN}"
    exit 0
  fi
fi

# 3. Check if ratchet is in node_modules/.bin
if [ -x "${REPO_ROOT}/node_modules/.bin/ratchet" ]; then
  if "${REPO_ROOT}/node_modules/.bin/ratchet" --help >/dev/null 2>&1; then
    echo "${REPO_ROOT}/node_modules/.bin/ratchet"
    exit 0
  fi
fi

# 4. Install ratchet binary
mkdir -p "${TARGET_DIR}"

# Detect OS
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "${OS}" in
  linux*)  OS="linux" ;;
  darwin*) OS="darwin" ;;
  msys*|cygwin*|mingw*) OS="windows" ;;
  *)
    echo "Warning: Unrecognized OS '${OS}', attempting fallback to linux" >&2
    OS="linux"
    ;;
esac

# Detect Architecture
ARCH="$(uname -m)"
case "${ARCH}" in
  x86_64|amd64) ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)
    echo "Warning: Unrecognized architecture '${ARCH}', attempting amd64" >&2
    ARCH="amd64"
    ;;
esac

ARCHIVE_EXT="tar.gz"
if [ "${OS}" = "windows" ]; then
  ARCHIVE_EXT="zip"
fi

ARCHIVE_NAME="ratchet_${RATCHET_VERSION}_${OS}_${ARCH}.${ARCHIVE_EXT}"
DOWNLOAD_URL="https://github.com/sethvargo/ratchet/releases/download/v${RATCHET_VERSION}/${ARCHIVE_NAME}"

echo "Installing ratchet v${RATCHET_VERSION} (${OS}/${ARCH}) into ${TARGET_DIR}..." >&2

INSTALLED=0
TMP_DOWNLOAD_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t 'ratchet-dl')"
cleanup() {
  rm -rf "${TMP_DOWNLOAD_DIR}"
}
trap cleanup EXIT

# Attempt download via curl or wget
if command -v curl >/dev/null 2>&1; then
  if curl -sSL -f "${DOWNLOAD_URL}" -o "${TMP_DOWNLOAD_DIR}/${ARCHIVE_NAME}"; then
    if [ "${ARCHIVE_EXT}" = "zip" ]; then
      unzip -q -o "${TMP_DOWNLOAD_DIR}/${ARCHIVE_NAME}" -d "${TARGET_DIR}"
    else
      tar -xzf "${TMP_DOWNLOAD_DIR}/${ARCHIVE_NAME}" -C "${TARGET_DIR}" ratchet
    fi
    chmod +x "${TARGET_BIN}"
    INSTALLED=1
  fi
elif command -v wget >/dev/null 2>&1; then
  if wget -q "${DOWNLOAD_URL}" -O "${TMP_DOWNLOAD_DIR}/${ARCHIVE_NAME}"; then
    if [ "${ARCHIVE_EXT}" = "zip" ]; then
      unzip -q -o "${TMP_DOWNLOAD_DIR}/${ARCHIVE_NAME}" -d "${TARGET_DIR}"
    else
      tar -xzf "${TMP_DOWNLOAD_DIR}/${ARCHIVE_NAME}" -C "${TARGET_DIR}" ratchet
    fi
    chmod +x "${TARGET_BIN}"
    INSTALLED=1
  fi
fi

# Fallback to 'go install' if binary download failed and go is present
if [ "${INSTALLED}" -eq 0 ] && command -v go >/dev/null 2>&1; then
  echo "Attempting installation via 'go install github.com/sethvargo/ratchet@v${RATCHET_VERSION}'..." >&2
  if GOBIN="${TARGET_DIR}" go install "github.com/sethvargo/ratchet@v${RATCHET_VERSION}"; then
    chmod +x "${TARGET_BIN}"
    INSTALLED=1
  fi
fi

# Verify installation
if [ -x "${TARGET_BIN}" ] && "${TARGET_BIN}" --help >/dev/null 2>&1; then
  # Optionally mirror to node_modules/.bin if it exists
  if [ -d "${REPO_ROOT}/node_modules/.bin" ]; then
    ln -sf "${TARGET_BIN}" "${REPO_ROOT}/node_modules/.bin/ratchet" 2>/dev/null || true
  fi
  echo "✓ Ratchet successfully installed to ${TARGET_BIN}" >&2
  echo "${TARGET_BIN}"
  exit 0
fi

echo "Error: Failed to install sethvargo/ratchet." >&2
echo "Please install ratchet manually (e.g. 'brew install ratchet' or 'go install github.com/sethvargo/ratchet@latest')." >&2
exit 1
