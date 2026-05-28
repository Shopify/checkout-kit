#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCHEMA_WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/checkout-kit-schemas.XXXXXX")"
SCHEMA_ROOT="${SCHEMA_WORK_DIR}/schemas"
SPEC_DIR="${SCHEMA_ROOT}/shopping"
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

cleanup() {
  rm -rf "${SCHEMA_WORK_DIR}"
}
trap cleanup EXIT

cp -R "${REPO_ROOT}/protocol/schemas" "${SCHEMA_ROOT}"

# Build checkout models from the base checkout schema plus checkout extension
# fields that checkout-web emits in the primary checkout snapshot/change
# notifications. The imported public schemas stay unchanged; this temp schema
# only gives quicktype the full checkout shape we expose through the SDKs.
jq '
  .properties.fulfillment = {
    "title": "CheckoutFulfillment",
    "allOf": [
      { "$ref": "fulfillment.json#/$defs/fulfillment" }
    ],
    "description": "Fulfillment details.",
    "ucp_request": {
      "create": "optional",
      "update": "optional",
      "complete": "omit"
    }
  } |
  .properties.discounts = {
    "$ref": "discount.json#/$defs/discounts_object",
    "ucp_request": {
      "create": "optional",
      "update": "optional",
      "complete": "omit"
    }
  } |
  .properties.payment.title = "Payment"
' \
  "${SPEC_DIR}/checkout.json" > "${SCHEMA_WORK_DIR}/checkout.json"
mv "${SCHEMA_WORK_DIR}/checkout.json" "${SPEC_DIR}/checkout.json"

jq '.properties.fulfillment.title = "Fulfillment"' \
  "${SPEC_DIR}/order.json" > "${SCHEMA_WORK_DIR}/order.json"
mv "${SCHEMA_WORK_DIR}/order.json" "${SPEC_DIR}/order.json"

# The public schemas are imported inputs, so keep naming hints local to codegen.
# quicktype otherwise collapses order_line_item.quantity to a generic Quantity.
jq '.properties.quantity.title = "LineItemQuantity"' \
  "${SPEC_DIR}/types/order_line_item.json" > "${SCHEMA_WORK_DIR}/order_line_item.json"
mv "${SCHEMA_WORK_DIR}/order_line_item.json" "${SPEC_DIR}/types/order_line_item.json"

# Preserve the existing shared line-item total model name after checkout
# fulfillment adds another reference from fulfillment option totals.
jq '.title = "LineItemTotal"' \
  "${SPEC_DIR}/types/total.json" > "${SCHEMA_WORK_DIR}/total.json"
mv "${SCHEMA_WORK_DIR}/total.json" "${SPEC_DIR}/types/total.json"

jq '.items.title = "CheckoutTotal"' \
  "${SPEC_DIR}/types/totals.json" > "${SCHEMA_WORK_DIR}/totals.json"
mv "${SCHEMA_WORK_DIR}/totals.json" "${SPEC_DIR}/types/totals.json"

jq '.properties.color_scheme.items.title = "EmbeddedColorScheme"' \
  "${SCHEMA_ROOT}/transports/embedded_config.json" > "${SCHEMA_WORK_DIR}/embedded_config.json"
mv "${SCHEMA_WORK_DIR}/embedded_config.json" "${SCHEMA_ROOT}/transports/embedded_config.json"

# Message discriminators are defined across the message variant schemas. Give each
# variant the same local title so quicktype emits a single MessageType symbol.
for message_schema in message_error message_warning message_info; do
  jq '.properties.type.title = "MessageType"' \
    "${SPEC_DIR}/types/${message_schema}.json" > "${SCHEMA_WORK_DIR}/${message_schema}.json"
  mv "${SCHEMA_WORK_DIR}/${message_schema}.json" "${SPEC_DIR}/types/${message_schema}.json"
done

# Extension schemas bring in repeated generic property names like `type` and
# `method`; add local titles so generated model symbols stay domain-specific.
jq '
  ."$defs".discounts_object.title = "CheckoutDiscounts" |
  ."$defs".applied_discount.title = "AppliedDiscount" |
  ."$defs".applied_discount.properties.method.title = "DiscountMethod" |
  ."$defs".allocation.title = "DiscountAllocation"
' \
  "${SPEC_DIR}/discount.json" > "${SCHEMA_WORK_DIR}/discount.json"
mv "${SCHEMA_WORK_DIR}/discount.json" "${SPEC_DIR}/discount.json"

for fulfillment_schema in fulfillment_available_method fulfillment_method; do
  jq '.properties.type.title = "FulfillmentMethodType"' \
    "${SPEC_DIR}/types/${fulfillment_schema}.json" > "${SCHEMA_WORK_DIR}/${fulfillment_schema}.json"
  mv "${SCHEMA_WORK_DIR}/${fulfillment_schema}.json" "${SPEC_DIR}/types/${fulfillment_schema}.json"
done

jq '.title = "CheckoutFulfillment"' \
  "${SPEC_DIR}/types/fulfillment.json" > "${SCHEMA_WORK_DIR}/fulfillment.json"
mv "${SCHEMA_WORK_DIR}/fulfillment.json" "${SPEC_DIR}/types/fulfillment.json"

# We also rewrite $ref paths from "../../schemas/shopping/" to "" so that refs resolve
# correctly when the temp file is placed alongside the main schemas in SPEC_DIR. The
# openrpc doc's `components` section is copied into the temp file so internal
# `#/components/schemas/X` refs in the extracted result schema resolve locally.
extract_result_schema() {
  local method_name="$1"
  local output_file="$2"
  local root_title="$3"
  local checkout_title="$4"
  local payment_schema="$5"
  jq --arg method "$method_name" \
    --arg root_title "$root_title" \
    --arg checkout_title "$checkout_title" \
    --argjson payment_schema "$payment_schema" \
    '
      . as $root
      | .methods[] | select(.name == $method) | .result.schema
      | .title = $root_title
      | walk(if type == "object" and has("$ref") then
          .["$ref"] |= gsub("../../schemas/shopping/"; "")
        else . end)
      | (.oneOf[] | select(.properties.checkout? != null).properties.checkout) |= (
          .title = $checkout_title
          | .properties.payment = $payment_schema
        )
      | . + { components: $root.components }
    ' \
    "${SERVICES_DIR}/embedded.openrpc.json" > "$output_file"
}

extract_result_schema "ec.payment.instruments_change_request" \
  "${SPEC_DIR}/instruments_change_result.json" \
  "InstrumentsChangeResult" \
  "InstrumentsChangeCheckout" \
  '{
    "title": "InstrumentsChangePayment",
    "description": "Payment instruments with selected instrument ID.",
    "allOf": [
      { "$ref": "checkout.json#/properties/payment" },
      {
        "type": "object",
        "properties": {
          "selected_instrument_id": {
            "type": "string",
            "description": "ID of the selected payment instrument."
          }
        }
      }
    ]
  }'

extract_result_schema "ec.payment.credential_request" \
  "${SPEC_DIR}/credential_result.json" \
  "CredentialResult" \
  "CredentialCheckout" \
  '{ "$ref": "checkout.json#/properties/payment" }'

normalize_quicktype_fallbacks() {
  # These two names resist schema title hints because they arise from inline
  # object collisions inside result schema oneOf branches. Add new entries here
  # if quicktype emits color-name fallbacks after a schema change.
  perl -0pi -e 's/\bPurpleStatus\b/StatusEnum/g; s/\bPurpleService\b/InstrumentsChangeService/g' "$1"
}

assert_no_quicktype_fallbacks() {
  local output="$1"
  local matches
  matches="$(perl -ne 'while (/\b(?:Purple|Fluffy|Tentacled|Sticky|Indigo|Magenta)\w+/g) { print "$&\n" }' "${output}" | sort -u)"

  if [[ -n "${matches}" ]]; then
    echo "ERROR: Unexpected quicktype color-name fallback detected in ${output}" >&2
    printf '%s\n' "${matches}" >&2
    exit 1
  fi
}

case "$LANG" in
  kotlin)
    OUTPUT="${REPO_ROOT}/platforms/android/lib/src/main/java/com/shopify/checkoutkit/Models.kt"
    quicktype \
      --lang kotlin \
      --src-lang schema \
      --framework kotlinx \
      --src "${SPEC_DIR}/checkout.json" \
      --src "${SPEC_DIR}/order.json" \
      --src "${SPEC_DIR}/types/error_response.json" \
      --src "${SPEC_DIR}/instruments_change_result.json" \
      --src "${SPEC_DIR}/credential_result.json" \
      --package "com.shopify.checkoutkit" \
      -o "${OUTPUT}"

    # Remove quicktype's usage preamble so generated Android sources start at
    # the package declaration, matching the rest of the library source layout.
    perl -0pi -e 's/\A.*?(?=^package )//ms' "${OUTPUT}"

    # Post-process for -Xexplicit-api=strict: every top-level and member declaration that
    # is part of the public API surface needs an explicit 'public' modifier.
    #
    # quicktype Kotlin does not support --access-level, so we add 'public'
    # after generation.
    # Patterns: top-level classes/aliases, 4-space-indented constructor properties,
    # inner classes inside sealed classes, and inline constructor params in enum/sealed.
    perl -0pi -e '
      s/^data class /public data class /mg;
      s/^sealed class /public sealed class /mg;
      s/^enum class /public enum class /mg;
      s/^typealias /public typealias /mg;
      s/^    class /    public class /mg;
      s/^    val /    public val /mg;
      s/\(val value: /\(public val value: /g;
    ' "${OUTPUT}"

    # Normalize remaining exact quicktype fallback names.
    normalize_quicktype_fallbacks "${OUTPUT}"
    assert_no_quicktype_fallbacks "${OUTPUT}"

    # quicktype renders Extends as a sealed class, but the wire shape is either
    # a string or an array of strings. Use the hand-written serializer in
    # ExtendsSerializer.kt without depending on quicktype's sealed-class body.
    perl -0pi -e 's/@Serializable(\s+public sealed class Extends\b)/@Serializable(with = ExtendsSerializer::class)$1/' "${OUTPUT}"

    if ! grep -q '@Serializable(with = ExtendsSerializer::class)' "${OUTPUT}"; then
      echo "ERROR: ExtendsSerializer injection failed; quicktype Extends output may have changed" >&2
      exit 1
    fi


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
      --src "${SPEC_DIR}/order.json" \
      --src "${SPEC_DIR}/types/error_response.json" \
      --src "${SPEC_DIR}/instruments_change_result.json" \
      --src "${SPEC_DIR}/credential_result.json" \
      -o "${OUTPUT}"

    # Normalize remaining exact quicktype fallback names.
    normalize_quicktype_fallbacks "${OUTPUT}"
    assert_no_quicktype_fallbacks "${OUTPUT}"

    echo "Generated ${OUTPUT}"
    ;;

  typescript|ts)
    OUTPUT="${REPO_ROOT}/protocol/languages/typescript/src/generated/Models.ts"
    mkdir -p "$(dirname "${OUTPUT}")"
    quicktype \
      --lang ts \
      --src-lang schema \
      --prefer-unions \
      --nice-property-names \
      --acronym-style camel \
      --no-date-times \
      --src "${SPEC_DIR}/checkout.json" \
      --src "${SPEC_DIR}/order.json" \
      --src "${SPEC_DIR}/types/error_response.json" \
      --src "${SPEC_DIR}/instruments_change_result.json" \
      --src "${SPEC_DIR}/credential_result.json" \
      -o "${OUTPUT}"

    # Keep all schema-derived aliases available to package consumers, and apply
    # the cross-platform generated model renames used by Swift and Kotlin.
    perl -0pi -e 's/^type /export type /mg' "${OUTPUT}"
    normalize_quicktype_fallbacks "${OUTPUT}"
    assert_no_quicktype_fallbacks "${OUTPUT}"

    node "${REPO_ROOT}/protocol/scripts/generate_typescript_notifications.mjs"

    # API Extractor consumers require dependency entry points to resolve to
    # declaration files. Runtime converter output is not valid declaration syntax,
    # so emit declarations from the TypeScript package entry point.
    DECLARATION_OUTPUT="${REPO_ROOT}/protocol/languages/typescript/src/index.d.ts"
    TSC_BIN="${REPO_ROOT}/platforms/react-native/node_modules/typescript/bin/tsc"
    INDEX_OUTPUT="${REPO_ROOT}/protocol/languages/typescript/src/index.ts"
    node "${TSC_BIN}" \
      --declaration \
      --emitDeclarationOnly \
      --noEmit false \
      --rootDir "${REPO_ROOT}/protocol/languages/typescript/src" \
      --declarationDir "${REPO_ROOT}/protocol/languages/typescript/src" \
      --pretty false \
      "${INDEX_OUTPUT}"

    echo "Generated ${OUTPUT}, TypeScript protocol notifications, and ${DECLARATION_OUTPUT}"
    ;;

  *)
    echo "Unsupported language: $LANG. Use kotlin, swift, or typescript."
    exit 1
    ;;
esac
