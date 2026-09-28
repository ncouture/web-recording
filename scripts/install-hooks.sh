#!/usr/bin/env bash
# scripts/install-hooks.sh
# Installs git pre-commit hooks and ensures ratchet is ready.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "${REPO_ROOT}"

echo "Configuring git pre-commit hooks and ratchet..."

# 1. Ensure ratchet is installed
"${REPO_ROOT}/scripts/ensure-ratchet.sh"

# 2. Install pre-commit hook into .git/hooks if .git directory exists
if [ -d "${REPO_ROOT}/.git" ]; then
  mkdir -p "${REPO_ROOT}/.git/hooks"
  cp "${REPO_ROOT}/scripts/git-hooks/pre-commit" "${REPO_ROOT}/.git/hooks/pre-commit"
  chmod +x "${REPO_ROOT}/.git/hooks/pre-commit"
  echo "✓ Installed native git pre-commit hook into .git/hooks/pre-commit"

  # Check if python pre-commit is available
  if command -v pre-commit >/dev/null 2>&1 && [ -f "${REPO_ROOT}/.pre-commit-config.yaml" ]; then
    echo "✓ Python pre-commit framework detected and integrated"
  fi
fi

echo "✓ Git pre-commit hooks integration complete."
