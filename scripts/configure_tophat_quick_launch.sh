#!/bin/bash

set -euo pipefail

TOPHATCTL=/Applications/Tophat.app/Contents/MacOS/tophatctl

if [ ! -x "$TOPHATCTL" ]; then
  echo "Tophat is not installed at $TOPHATCTL. Run 'dev up' to install it." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$SCRIPT_DIR/tophat/targets.json"

RETIRED_IDS=(checkout-kit-ios checkout-kit-android)
for retired_id in "${RETIRED_IDS[@]}"; do
  "$TOPHATCTL" apps remove "$retired_id" >/dev/null 2>&1 || true
done

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

jq -c '
  .app_slug as $app_slug
  | .default_branch as $branch
  | .targets[]
  | {
      id: ("checkout-kit-" + .id),
      name: ("Checkout Kit (" + .label + ")"),
      recipes: [
        .recipes[]
        | {
            artifactProviderID: "bitrise-branch",
            platformHint: .platform,
            launchArguments: [],
            artifactProviderParameters: {
              app_slug: $app_slug,
              branch: $branch,
              workflow: .workflow,
              artifact_name: .artifact_name
            }
          }
          + (if .destination == "any" then {} else {destinationHint: .destination} end)
      ]
    }
' "$MANIFEST" | while IFS= read -r target_entry; do
  entry_id="$(printf '%s' "$target_entry" | jq -r '.id')"
  entry_file="$TMP_DIR/$entry_id.json"
  printf '%s' "$target_entry" > "$entry_file"
  "$TOPHATCTL" apps add "$entry_file"
done

cat <<'REMINDER'

==> Tophat Quick Launch items configured for Checkout Kit.
    Installs need a Bitrise Personal Access Token:
      1. Create a PAT at https://app.bitrise.io/me/account/security
      2. Add it to Tophat -> Settings -> Extensions -> Bitrise
REMINDER
