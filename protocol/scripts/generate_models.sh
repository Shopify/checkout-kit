#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SPEC_DIR="${REPO_ROOT}/protocol/schemas/shopping"
SERVICES_DIR="${REPO_ROOT}/protocol/services/shopping"

LANG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --lang) LANG="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

if [[ -z "$LANG" ]]; then
  echo "Usage: $0 --lang <kotlin|swift|typescript>"
  exit 1
fi

TEMP_SCHEMAS=()
cleanup() { rm -f "${TEMP_SCHEMAS[@]}"; }
trap cleanup EXIT

# quicktype generates non-deterministic color-based names (e.g. PurplePayment, FluffyPayment)
# when inline objects collide with existing type names. Injecting "title" fields into the
# extracted result schemas gives quicktype deterministic naming hints.
#
# We also rewrite $ref paths from "../../schemas/shopping/" to "" so that refs resolve
# correctly when the temp file is placed alongside the main schemas in SPEC_DIR. The
# openrpc doc's `components` section is copied into the temp file so internal
# `#/components/schemas/X` refs in the extracted result schema resolve locally.
extract_result_schema() {
  local method_name="$1"
  local output_file="$2"
  local root_title="$3"
  local checkout_title="$4"
  local payment_title="$5"
  jq --arg method "$method_name" \
    --arg root_title "$root_title" \
    --arg checkout_title "$checkout_title" \
    --arg payment_title "$payment_title" \
    '
      . as $root
      | .methods[] | select(.name == $method) | .result.schema
      | .title = $root_title
      | .properties.checkout.title = $checkout_title
      | .properties.checkout.properties.payment.title = $payment_title
      | walk(if type == "object" and has("$ref") then
          .["$ref"] |= gsub("../../schemas/shopping/"; "")
        else . end)
      | .properties.checkout.properties.payment.properties.instruments =
          {"$ref": "payment.json#/properties/instruments"}
      | . + { components: $root.components }
    ' \
    "${SERVICES_DIR}/embedded.openrpc.json" > "$output_file"
  TEMP_SCHEMAS+=("$output_file")
}

extract_result_schema "ec.payment.instruments_change_request" \
  "${SPEC_DIR}/instruments_change_result.json" \
  "InstrumentsChangeResult" "InstrumentsChangeCheckout" "InstrumentsChangePayment"

extract_result_schema "ec.payment.credential_request" \
  "${SPEC_DIR}/credential_result.json" \
  "CredentialResult" "CredentialCheckout" "CredentialPayment"

case "$LANG" in
  kotlin)
    OUTPUT="${REPO_ROOT}/platforms/android/lib/src/main/java/com/shopify/checkoutkit/Models.kt"
    quicktype \
      --lang kotlin \
      --src-lang schema \
      --framework kotlinx \
      --src "${SPEC_DIR}/checkout.json" \
      --src "${SPEC_DIR}/types/"*.json \
      --src "${SPEC_DIR}/payment.json" \
      --src "${SPEC_DIR}/order.json" \
      --src "${SPEC_DIR}/instruments_change_result.json" \
      --src "${SPEC_DIR}/credential_result.json" \
      --package "com.shopify.checkoutkit" \
      -o "${OUTPUT}"

    # Post-process for -Xexplicit-api=strict: every top-level and member declaration that
    # is part of the public API surface needs an explicit 'public' modifier.
    #
    # quicktype Kotlin does not support --access-level, so we add 'public' via sed.
    # Patterns: top-level classes/aliases, 4-space-indented constructor properties,
    # inner classes inside sealed classes, and inline constructor params in enum/sealed.
    sed -i '' \
      -e 's/^data class /public data class /' \
      -e 's/^sealed class /public sealed class /' \
      -e 's/^enum class /public enum class /' \
      -e 's/^typealias /public typealias /' \
      -e 's/^    class /    public class /' \
      -e 's/^    val /    public val /' \
      -e 's/(val value: /(public val value: /' \
      "${OUTPUT}"

    # Rename types that conflict with platform or Kotlin stdlib names.
    # quicktype emits 'data class Binding (' (with space before paren).
    # Apply the same renames in Swift and React Native generators for consistency.
    # ColorScheme is renamed to avoid collision with the hand-written sealed class
    # in ColorScheme.kt used by the dialog-based checkout presentation API.
    sed -i '' \
      -e 's/public data class Binding (/public data class TokenBinding (/' \
      -e 's/: Binding$/: TokenBinding/' \
      -e 's/Binding\.serializer()/TokenBinding.serializer()/' \
      -e 's/public enum class ColorScheme(/public enum class EmbeddedColorScheme(/' \
      -e 's/List<ColorScheme>/List<EmbeddedColorScheme>/g' \
      -e 's/ColorScheme\.serializer()/EmbeddedColorScheme.serializer()/g' \
      "${OUTPUT}"

    # quicktype emits `typealias Totals = JsonArray<TotalElement>`, but
    # kotlinx.serialization.json.JsonArray is not generic. Rewrite to a plain List.
    sed -i '' \
      -e 's/typealias Totals = JsonArray<TotalElement>/typealias Totals = List<TotalElement>/' \
      "${OUTPUT}"


    echo "Generated ${OUTPUT}"
    ;;

  swift)
    OUTPUT="${REPO_ROOT}/protocol/languages/swift/Sources/ShopifyCheckoutProtocol/Generated/Models.swift"
    quicktype \
      --lang swift \
      --swift-5-support \
      --access-level public \
      --sendable \
      --src-lang schema \
      --src "${SPEC_DIR}/checkout.json" \
      --src "${SPEC_DIR}/types/"*.json \
      --src "${SPEC_DIR}/payment.json" \
      --src "${SPEC_DIR}/order.json" \
      --src "${SPEC_DIR}/instruments_change_result.json" \
      --src "${SPEC_DIR}/credential_result.json" \
      -o "${OUTPUT}"

    # Rename types that conflict with platform or Swift stdlib names.
    # Apply the same renames as in the Kotlin generator for consistency.
    # Use BSD word-boundary anchors so all identifier sites match — quicktype
    # emits `struct Binding:` (no whitespace before `:`), which previous
    # space-anchored patterns missed.
    sed -i '' -E \
      -e 's/[[:<:]]Binding[[:>:]]/TokenBinding/g' \
      -e 's/[[:<:]]ColorScheme[[:>:]]/EmbeddedColorScheme/g' \
      "${OUTPUT}"


    echo "Generated ${OUTPUT}"
    ;;

  typescript|ts)
    OUTPUT="${REPO_ROOT}/protocol/languages/typescript/src/generated/Models.ts"
    mkdir -p "$(dirname "${OUTPUT}")"
    quicktype \
      --lang ts \
      --src-lang schema \
      --just-types \
      --prefer-unions \
      --nice-property-names \
      --acronym-style camel \
      --no-date-times \
      --src "${SPEC_DIR}/checkout.json" \
      --src "${SPEC_DIR}/types/"*.json \
      --src "${SPEC_DIR}/payment.json" \
      --src "${SPEC_DIR}/order.json" \
      --src "${SPEC_DIR}/instruments_change_result.json" \
      --src "${SPEC_DIR}/credential_result.json" \
      -o "${OUTPUT}"

    # Keep all schema-derived aliases available to package consumers, and apply
    # the cross-platform generated model renames used by Swift and Kotlin.
    sed -i '' -E \
      -e 's/^type /export type /' \
      -e 's/[[:<:]]Binding[[:>:]]/TokenBinding/g' \
      -e 's/[[:<:]]ColorScheme[[:>:]]/EmbeddedColorScheme/g' \
      "${OUTPUT}"


    echo "Generated ${OUTPUT}"
    ;;

  *)
    echo "Unsupported language: $LANG. Use kotlin, swift, or typescript."
    exit 1
    ;;
esac
