#!/bin/bash
# MIT License
#
# Copyright 2023-present, Shopify Inc.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCK_FILE="${REPO_ROOT}/protocol/source-lock.json"

usage() {
  cat <<'EOF'
Usage:
  ucp_snapshot.sh check [--ref <upstream-ref>]
  ucp_snapshot.sh update --ref <upstream-ref> [--dry-run]

Commands:
  check   Compare vendored UCP files with upstream. Does not modify files.
  update  Download vendored UCP files and record the resolved upstream commit.

Options:
  --ref <upstream-ref>  Upstream branch, tag, or commit to use.
                        For check, defaults to the lock-file commit. For update,
                        this option is required.
  --dry-run             For update, show what would change without writing.
  -h, --help            Show this help message.
EOF
}

print_indented_file() {
  local file="$1"
  while IFS= read -r line; do
    echo "  ${line}" >&2
  done < "$file"
}

uri_encode() {
  jq -rn --arg value "$1" '$value | @uri'
}

require_tools() {
  local missing_tools=()

  for tool in "$@"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      missing_tools+=("$tool")
    fi
  done

  if [[ ${#missing_tools[@]} -gt 0 ]]; then
    echo "Missing required tools: ${missing_tools[*]}" >&2
    exit 2
  fi
}

load_lock_file() {
  if [[ ! -f "$LOCK_FILE" ]]; then
    echo "Missing lock file: $LOCK_FILE" >&2
    exit 2
  fi

  if ! jq -e '
    (.protocolVersion | type == "string") and
    (.upstreamRepository | type == "string") and
    (.upstreamCommit | type == "string") and
    (.files | type == "array") and
    all(.files[]; (.local | type == "string") and (.upstream | type == "string"))
  ' "$LOCK_FILE" >/dev/null; then
    echo "Invalid lock file shape: $LOCK_FILE" >&2
    exit 2
  fi

  UPSTREAM_REPO="$(jq -r '.upstreamRepository' "$LOCK_FILE")"
}

default_ref() {
  jq -r '.upstreamCommit' "$LOCK_FILE"
}

resolve_ref() {
  local ref="$1"
  local encoded_ref
  local output_file="${TMP_DIR}/resolved-ref.json"
  local error_file="${TMP_DIR}/resolved-ref.err"

  encoded_ref="$(uri_encode "$ref")"

  if ! gh api "repos/${UPSTREAM_REPO}/commits/${encoded_ref}" > "$output_file" 2> "$error_file"; then
    echo "Unable to resolve ${UPSTREAM_REPO}@${ref} to a commit." >&2
    if [[ -s "$error_file" ]]; then
      print_indented_file "$error_file"
    fi
    exit 2
  fi

  jq -r '.sha' "$output_file"
}

fetch_upstream_files() {
  local fetch_failed=0
  local checked=0
  local encoded_ref

  encoded_ref="$(uri_encode "$REF")"

  : > "$FETCH_MANIFEST"

  while IFS=$'\t' read -r local_path upstream_path; do
    checked=$((checked + 1))

    local upstream_file="${TMP_DIR}/upstream-${checked}"
    local upstream_error="${TMP_DIR}/upstream-${checked}.err"
    local endpoint="repos/${UPSTREAM_REPO}/contents/${upstream_path}?ref=${encoded_ref}"

    if ! gh api -H "Accept: application/vnd.github.raw" "$endpoint" > "$upstream_file" 2> "$upstream_error"; then
      echo "Missing or unreadable upstream file: ${upstream_path} at ${REF}" >&2
      if [[ -s "$upstream_error" ]]; then
        print_indented_file "$upstream_error"
      fi
      fetch_failed=1
      continue
    fi

    printf '%s\t%s\t%s\n' "$local_path" "$upstream_path" "$upstream_file" >> "$FETCH_MANIFEST"
  done < <(jq -r '.files[] | [.local, .upstream] | @tsv' "$LOCK_FILE")

  if [[ "$checked" -eq 0 ]]; then
    echo "No files listed in $LOCK_FILE" >&2
    exit 2
  fi

  FILE_COUNT="$checked"
  return "$fetch_failed"
}

compare_fetched_files() {
  local drift=0
  local tool_error=0

  while IFS=$'\t' read -r local_path upstream_path upstream_file; do
    local local_file="${REPO_ROOT}/${local_path}"

    if [[ ! -f "$local_file" ]]; then
      echo "Missing local file: ${local_path}" >&2
      drift=1
      continue
    fi

    local diff_rc=0
    diff -u -L "$local_path" -L "${upstream_path}@${REF}" "$local_file" "$upstream_file" || diff_rc=$?
    case "$diff_rc" in
      0)
        ;;
      1)
        drift=1
        ;;
      *)
        echo "diff error comparing ${local_path} with ${upstream_path}@${REF}" >&2
        tool_error=1
        ;;
    esac
  done < "$FETCH_MANIFEST"

  if [[ "$tool_error" -ne 0 ]]; then
    echo "UCP snapshot comparison failed due to tooling errors." >&2
    return 2
  fi

  return "$drift"
}

check_lock_commit_change() {
  local resolved_commit="$1"
  local current_commit

  current_commit="$(jq -r '.upstreamCommit' "$LOCK_FILE")"
  if [[ "$current_commit" != "$resolved_commit" ]]; then
    echo "Would update protocol/source-lock.json upstreamCommit:"
    echo "  from: ${current_commit:-null}"
    echo "  to:   ${resolved_commit}"
    return 1
  fi

  return 0
}

update_lock_commit() {
  local resolved_commit="$1"
  local lock_tmp="${TMP_DIR}/source-lock.json"

  jq --arg sha "$resolved_commit" '.upstreamCommit = $sha' "$LOCK_FILE" > "$lock_tmp"
  mv "$lock_tmp" "$LOCK_FILE"
}

run_check() {
  require_tools gh jq diff mktemp
  load_lock_file

  if [[ -z "$REF" ]]; then
    REF="$(default_ref)"
  fi

  TMP_DIR="$(mktemp -d)"
  FETCH_MANIFEST="${TMP_DIR}/files.tsv"
  trap 'rm -rf "$TMP_DIR"' EXIT

  echo "Comparing vendored UCP snapshot with ${UPSTREAM_REPO}@${REF}"

  local drift=0
  if ! fetch_upstream_files; then
    drift=1
  fi

  local compare_rc=0
  compare_fetched_files || compare_rc=$?
  case "$compare_rc" in
    0)
      ;;
    1)
      drift=1
      ;;
    *)
      exit 2
      ;;
  esac

  if [[ "$drift" -eq 0 ]]; then
    echo "UCP snapshot matches ${UPSTREAM_REPO}@${REF} (${FILE_COUNT} files)."
  else
    echo "UCP snapshot drift detected against ${UPSTREAM_REPO}@${REF} (${FILE_COUNT} files checked)." >&2
  fi

  exit "$drift"
}

run_update() {
  require_tools gh jq diff mktemp cmp cp mkdir mv
  load_lock_file

  if [[ -z "$REF" ]]; then
    echo "Update requires --ref <upstream-ref>." >&2
    usage >&2
    exit 2
  fi

  TMP_DIR="$(mktemp -d)"
  FETCH_MANIFEST="${TMP_DIR}/files.tsv"
  trap 'rm -rf "$TMP_DIR"' EXIT

  local resolved_commit
  resolved_commit="$(resolve_ref "$REF")"

  echo "Downloading vendored UCP snapshot from ${UPSTREAM_REPO}@${REF}"
  echo "Resolved upstream commit: ${resolved_commit}"

  if ! fetch_upstream_files; then
    echo "UCP snapshot update aborted; no local files were changed." >&2
    exit 1
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    local drift=0
    local compare_rc=0
    compare_fetched_files || compare_rc=$?
    case "$compare_rc" in
      0)
        ;;
      1)
        drift=1
        ;;
      *)
        exit 2
        ;;
    esac
    if ! check_lock_commit_change "$resolved_commit"; then
      drift=1
    fi

    if [[ "$drift" -eq 0 ]]; then
      echo "UCP snapshot already matches ${UPSTREAM_REPO}@${resolved_commit} (${FILE_COUNT} files)."
    else
      echo "UCP snapshot would change for ${UPSTREAM_REPO}@${resolved_commit} (${FILE_COUNT} files checked)." >&2
    fi

    exit "$drift"
  fi

  local updated_files=0
  while IFS=$'\t' read -r local_path _upstream_path upstream_file; do
    local local_file="${REPO_ROOT}/${local_path}"
    mkdir -p "$(dirname "$local_file")"

    if [[ ! -f "$local_file" ]] || ! cmp -s "$local_file" "$upstream_file"; then
      cp "$upstream_file" "$local_file"
      echo "Updated ${local_path}"
      updated_files=$((updated_files + 1))
    fi
  done < "$FETCH_MANIFEST"

  local current_commit
  current_commit="$(jq -r '.upstreamCommit' "$LOCK_FILE")"

  if [[ "$current_commit" != "$resolved_commit" ]]; then
    update_lock_commit "$resolved_commit"
    echo "Updated protocol/source-lock.json upstreamCommit"
  fi

  echo "UCP snapshot update complete (${updated_files} files changed, ${FILE_COUNT} files checked)."
}

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 2
fi

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  usage
  exit 0
fi

MODE="$1"
shift

REF=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref)
      if [[ $# -lt 2 || -z "$2" ]]; then
        echo "Missing value for --ref" >&2
        usage >&2
        exit 2
      fi
      REF="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$MODE" in
  check)
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "--dry-run is only supported for update." >&2
      exit 2
    fi
    run_check
    ;;
  update)
    run_update
    ;;
  *)
    echo "Unknown command: $MODE" >&2
    usage >&2
    exit 2
    ;;
esac
