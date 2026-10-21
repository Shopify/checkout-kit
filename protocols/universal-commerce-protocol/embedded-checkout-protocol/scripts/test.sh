#!/bin/bash
# Runs the protocol package tests for every language, or a single one.
# Usage: dev protocol test [kotlin|swift|typescript] [-- <extra args>]
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

cd "$REPO_ROOT"
# Prints the iOS simulator to test on: $CURRENT_SIMULATOR_UUID if set, else an
# iPhone on the newest runtime the selected Xcode's SDK supports, preferring a
# booted one. Older runtimes change Foundation behavior, so never pick one by name.
ios_simulator_id() {
  if [ -n "${CURRENT_SIMULATOR_UUID:-}" ]; then
    echo "$CURRENT_SIMULATOR_UUID"
    return
  fi
  local sdk_version
  sdk_version="$(xcrun --sdk iphonesimulator --show-sdk-version)"
  xcrun simctl list devices available --json | ruby -rjson -e '
    sdk = Gem::Version.new(ARGV.fetch(0))
    candidates = JSON.parse($stdin.read).fetch("devices").flat_map do |runtime, devices|
      match = runtime.match(/SimRuntime\.iOS-(\d+)-(\d+)\z/) or next []
      version = Gem::Version.new("#{match[1]}.#{match[2]}")
      next [] if version > sdk
      devices.select { |device| device["name"].include?("iPhone") }.map { |device| [device, version] }
    end
    device, _ = candidates.max_by { |device, version| [version, device["state"] == "Booted" ? 1 : 0] }
    puts device["udid"] if device
  ' "$sdk_version"
}
run_swift() {
  cd "$REPO_ROOT/protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/swift"
  local simulator_id
  simulator_id="$(ios_simulator_id)"
  if [ -z "$simulator_id" ]; then
    echo "No available iPhone simulator for the iOS $(xcrun --sdk iphonesimulator --show-sdk-version) SDK. Run 'dev up'." >&2
    exit 1
  fi
  echo "Running tests for Swift..."
  # An iOS simulator destination, not macOS: macOS test runs launch the selected
  # Xcode's usr/bin/xctest, which locked-down machines can block.
  xcodebuild test \
    -scheme EmbeddedCheckoutProtocol \
    -destination "platform=iOS Simulator,id=$simulator_id" \
    -disableAutomaticPackageResolution \
    -quiet
}
run_kotlin() {
  echo "Running tests for Kotlin..."
  protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/kotlin/gradlew -p protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/kotlin :embedded-checkout-protocol:test
}
run_typescript() {
  cd "$REPO_ROOT/protocols/universal-commerce-protocol/embedded-checkout-protocol"
  echo "Running tests for TypeScript..."
  pnpm test "$@"
}
target="${1:-all}"
[ $# -gt 0 ] && shift
case "$target" in
  swift) run_swift ;;
  kotlin) run_kotlin ;;
  typescript|ts) run_typescript "$@" ;;
  all) run_kotlin; run_swift; run_typescript ;;
  *) echo "Usage: dev protocol test [kotlin|swift|typescript] [-- <extra args>]"; exit 1 ;;
esac
