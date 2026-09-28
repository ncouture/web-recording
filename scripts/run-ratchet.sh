#!/usr/bin/env bash
# scripts/run-ratchet.sh
# Runs sethvargo/ratchet for pinning, linting, or git pre-commit hook enforcement.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "${REPO_ROOT}"

# Setup GitHub token for API quota when resolving SHAs
if [ -z "${GITHUB_TOKEN:-}" ]; then
  if [ -n "${GH_TOKEN:-}" ]; then
    export GITHUB_TOKEN="${GH_TOKEN}"
  elif command -v gh >/dev/null 2>&1; then
    TOKEN="$(gh auth token 2>/dev/null || true)"
    if [ -n "${TOKEN}" ]; then
      export GITHUB_TOKEN="${TOKEN}"
    fi
  fi
fi

# Ensure ratchet binary is installed
RATCHET_BIN="$("${REPO_ROOT}/scripts/ensure-ratchet.sh")"

to_relative_path() {
  local target="$1"
  # Strip leading REPO_ROOT/
  target="${target#"${REPO_ROOT}/"}"
  # Strip leading ./
  target="${target#"./"}"
  echo "${target}"
}

get_default_workflow_files() {
  if [ -d ".github/workflows" ]; then
    find .github/workflows -maxdepth 1 -type f \( -name "*.yml" -o -name "*.yaml" \) | sort
  fi
}

COMMAND="${1:-lint}"
shift || true

case "${COMMAND}" in
  lint)
    FILES=()
    if [ "$#" -gt 0 ]; then
      for arg in "$@"; do
        rel="$(to_relative_path "$arg")"
        if [ -f "$rel" ]; then
          FILES+=("$rel")
        fi
      done
    else
      while IFS= read -r f; do
        [ -n "$f" ] && FILES+=("$f")
      done < <(get_default_workflow_files)
    fi

    if [ "${#FILES[@]}" -eq 0 ]; then
      echo "No workflow files found to lint."
      exit 0
    fi

    echo "Running ratchet lint on: ${FILES[*]}..."
    "${RATCHET_BIN}" lint "${FILES[@]}"
    echo "✓ All GitHub Actions workflows are pinned to commit SHAs."
    ;;

  pin)
    FILES=()
    if [ "$#" -gt 0 ]; then
      for arg in "$@"; do
        rel="$(to_relative_path "$arg")"
        if [ -f "$rel" ]; then
          FILES+=("$rel")
        fi
      done
    else
      while IFS= read -r f; do
        [ -n "$f" ] && FILES+=("$f")
      done < <(get_default_workflow_files)
    fi

    if [ "${#FILES[@]}" -eq 0 ]; then
      echo "No workflow files found to pin."
      exit 0
    fi

    for f in "${FILES[@]}"; do
      echo "Pinning GitHub Actions in ${f}..."
      "${RATCHET_BIN}" pin "${f}"
    done
    echo "✓ Finished pinning workflow files."
    ;;

  update)
    FILES=()
    if [ "$#" -gt 0 ]; then
      for arg in "$@"; do
        rel="$(to_relative_path "$arg")"
        if [ -f "$rel" ]; then
          FILES+=("$rel")
        fi
      done
    else
      while IFS= read -r f; do
        [ -n "$f" ] && FILES+=("$f")
      done < <(get_default_workflow_files)
    fi

    for f in "${FILES[@]}"; do
      echo "Updating GitHub Actions pins in ${f}..."
      "${RATCHET_BIN}" update "${f}"
    done
    ;;

  upgrade)
    FILES=()
    if [ "$#" -gt 0 ]; then
      for arg in "$@"; do
        rel="$(to_relative_path "$arg")"
        if [ -f "$rel" ]; then
          FILES+=("$rel")
        fi
      done
    else
      while IFS= read -r f; do
        [ -n "$f" ] && FILES+=("$f")
      done < <(get_default_workflow_files)
    fi

    for f in "${FILES[@]}"; do
      echo "Upgrading GitHub Actions pins in ${f}..."
      "${RATCHET_BIN}" upgrade "${f}"
    done
    ;;

  hook)
    echo "==> [pre-commit] Checking GitHub Actions workflows with Ratchet..."

    # Check for staged workflow files
    STAGED_WORKFLOWS=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '^\.github/workflows/.*\.(yml|yaml)$' || true)

    if [ -n "${STAGED_WORKFLOWS}" ]; then
      echo "Staged workflow files detected:"
      echo "${STAGED_WORKFLOWS}"

      for wf in ${STAGED_WORKFLOWS}; do
        if [ -f "${wf}" ]; then
          "${RATCHET_BIN}" pin "${wf}"
          # If file was modified by pin, re-stage it
          if ! git diff --quiet "${wf}" 2>/dev/null; then
            git add "${wf}"
            echo "✓ Auto-pinned unpinned action references in ${wf} and staged changes."
          fi
        fi
      done
    fi

    # Verify all workflow files in the repository are pinned
    ALL_WORKFLOWS=()
    while IFS= read -r f; do
      [ -n "$f" ] && ALL_WORKFLOWS+=("$f")
    done < <(get_default_workflow_files)

    if [ "${#ALL_WORKFLOWS[@]}" -gt 0 ]; then
      if ! "${RATCHET_BIN}" lint "${ALL_WORKFLOWS[@]}"; then
        echo "❌ [pre-commit] Error: Found unpinned GitHub Actions in workflows." >&2
        echo "Run './scripts/run-ratchet.sh pin' or 'npm run ratchet:pin' to resolve." >&2
        exit 1
      fi
    fi

    echo "✓ [pre-commit] All GitHub Actions workflows are verified and pinned to commit SHAs."
    ;;

  *)
    echo "Usage: $0 {lint|pin|update|upgrade|hook} [files...]"
    exit 1
    ;;
esac
