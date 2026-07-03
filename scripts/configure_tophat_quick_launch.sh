#!/bin/bash

set -euo pipefail

TOPHATCTL=/Applications/Tophat.app/Contents/MacOS/tophatctl

if [ ! -x "$TOPHATCTL" ]; then
  echo "Tophat is not installed at $TOPHATCTL. Run 'dev up' to install it." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

"$TOPHATCTL" apps add "$SCRIPT_DIR/tophat/tophat_checkout_kit_ios.json"
"$TOPHATCTL" apps add "$SCRIPT_DIR/tophat/tophat_checkout_kit_android.json"

cat <<'REMINDER'

==> Tophat Quick Launch items configured for Checkout Kit.
    Installs need a Bitrise Personal Access Token:
      1. Create a PAT at https://app.bitrise.io/me/account/security
      2. Add it to Tophat -> Settings -> Extensions -> Bitrise
REMINDER
