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
Usage: check_ucp_snapshot.sh [--ref <upstream-ref>]

Compares the vendored UCP snapshot files in protocol/source-lock.json with
Universal-Commerce-Protocol/ucp. The check does not modify local files.

Options:
  --ref <upstream-ref>  Upstream branch, tag, or commit to compare against.
                        Defaults to upstreamCommit from the lock file.
  -h, --help            Show this help message.
EOF
}

REF=""
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

missing_tools=()
for tool in gh jq diff mktemp; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    missing_tools+=("$tool")
  fi
done

if [[ ${#missing_tools[@]} -gt 0 ]]; then
  echo "Missing required tools: ${missing_tools[*]}" >&2
  exit 2
fi

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

if [[ -z "$REF" ]]; then
  REF="$(jq -r '.upstreamCommit // "main"' "$LOCK_FILE")"
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

drift=0
tool_error=0
checked=0

echo "Comparing vendored UCP snapshot with ${UPSTREAM_REPO}@${REF}"

while IFS=$'\t' read -r local_path upstream_path; do
  checked=$((checked + 1))
  local_file="${REPO_ROOT}/${local_path}"
  upstream_file="${TMP_DIR}/upstream-${checked}"
  upstream_error="${TMP_DIR}/upstream-${checked}.err"

  if [[ ! -f "$local_file" ]]; then
    echo "Missing local file: ${local_path}" >&2
    drift=1
    continue
  fi

  endpoint="repos/${UPSTREAM_REPO}/contents/${upstream_path}?ref=${REF}"
  if ! gh api -H "Accept: application/vnd.github.raw" "$endpoint" >"$upstream_file" 2>"$upstream_error"; then
    echo "Missing or unreadable upstream file: ${upstream_path} at ${REF}" >&2
    if [[ -s "$upstream_error" ]]; then
      while IFS= read -r error_line; do
        echo "  ${error_line}" >&2
      done < "$upstream_error"
    fi
    drift=1
    continue
  fi

  diff_rc=0
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
done < <(jq -r '.files[] | [.local, .upstream] | @tsv' "$LOCK_FILE")

if [[ "$checked" -eq 0 ]]; then
  echo "No files listed in $LOCK_FILE" >&2
  exit 2
fi

if [[ "$tool_error" -ne 0 ]]; then
  echo "UCP snapshot comparison failed due to tooling errors." >&2
  exit 2
fi

if [[ "$drift" -eq 0 ]]; then
  echo "UCP snapshot matches ${UPSTREAM_REPO}@${REF} (${checked} files)."
else
  echo "UCP snapshot drift detected against ${UPSTREAM_REPO}@${REF} (${checked} files checked)." >&2
fi

exit "$drift"
