#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ruby "$SCRIPT_DIR/tophat/configure_quick_launch" "$@"
