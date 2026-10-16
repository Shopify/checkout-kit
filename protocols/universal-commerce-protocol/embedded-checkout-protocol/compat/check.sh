#!/bin/bash
# Checks that an additive protocol change keeps existing consumer code working:
#
# 1. Builds and runs the Kotlin, Java, Swift and TypeScript consumers against the current models.
# 2. Applies compat/additive-change.json to the schemas and regenerates the models.
# 3. Runs the Kotlin and Java consumer classes compiled in step 1 against the new models
#    (binary compatibility).
# 4. Rebuilds and reruns every consumer against the new models (source compatibility).
# 5. Fails if the Kotlin API check reports a removed public declaration.
#
# Schemas, generated files and the outbound manifest are restored afterwards.
# Set GRADLE_ARGS (for example "--offline") to pass extra arguments to Gradle.
# Runs with macOS's Bash 3.2, so empty arrays are expanded with ${array[@]+"${array[@]}"}.
set -euo pipefail

COMPAT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTOCOL_DIR="$(cd "$COMPAT_DIR/.." && pwd)"
GRADLEW="$PROTOCOL_DIR/languages/kotlin/gradlew"
TSC="$PROTOCOL_DIR/node_modules/.bin/tsc"
read -r -a GRADLE_EXTRA <<< "${GRADLE_ARGS:-}"

# Declarations are normally emitted with React Native's TypeScript; fall back to the protocol
# tooling's when React Native's dependencies aren't installed (they're restored afterwards anyway).
if [[ ! -x "$PROTOCOL_DIR/../../../platforms/react-native/node_modules/typescript/bin/tsc" ]]; then
    export PROTOCOL_TSC="$PROTOCOL_DIR/node_modules/typescript/bin/tsc"
fi

KOTLIN_API=languages/kotlin/embedded-checkout-protocol/api/embedded-checkout-protocol.api
GENERATED=(
    schemas
    "$KOTLIN_API"
    languages/kotlin/embedded-checkout-protocol/src/main/java/com/shopify/ucp/embedded/checkout/Models.kt
    languages/kotlin/embedded-checkout-protocol/src/main/java/com/shopify/ucp/embedded/checkout/EmbeddedCheckoutProtocol.kt
    languages/swift/Sources/UniversalCommerceProtocol/EmbeddedCheckoutProtocol/Generated
    languages/typescript/src/generated
    languages/typescript/src/index.d.ts
)

WORK="$(mktemp -d)"
tar -C "$PROTOCOL_DIR" -cf "$WORK/generated.tar" "${GENERATED[@]}"
restore() {
    tar -C "$PROTOCOL_DIR" -xf "$WORK/generated.tar"
    rm -rf "$WORK"
}
trap restore EXIT

step() { printf '\n==> %s\n' "$1"; }

gradle() { "$GRADLEW" -q ${GRADLE_EXTRA[@]+"${GRADLE_EXTRA[@]}"} "$@"; }
run_kotlin() { gradle -p "$COMPAT_DIR/kotlin-consumer" runConsumer "$@"; }
run_swift() { swift run --package-path "$COMPAT_DIR/swift-consumer" -q; }
run_typescript() { "$TSC" -p "$COMPAT_DIR/typescript-consumer/tsconfig.json" && echo "TypeScript consumer OK"; }

step "Consumers against the current models"
run_kotlin
mkdir -p "$WORK/classes"
cp -R "$COMPAT_DIR/kotlin-consumer/build/classes/kotlin/main" "$WORK/classes/kotlin"
cp -R "$COMPAT_DIR/kotlin-consumer/build/classes/java/main" "$WORK/classes/java"
run_swift
run_typescript

step "Applying the additive change and regenerating models"
node "$COMPAT_DIR/apply_change.mjs" "$PROTOCOL_DIR/schemas"
for language in kotlin swift typescript; do
    if ! "$PROTOCOL_DIR/scripts/generate_models.sh" --lang "$language" > "$WORK/generate-$language.log" 2>&1; then
        cat "$WORK/generate-$language.log" >&2
        exit 1
    fi
done

step "Previously compiled Kotlin and Java consumers against the new models (binary)"
run_kotlin -PconsumerClasses="$WORK/classes/kotlin:$WORK/classes/java" -PadditiveChange=true

step "Consumers rebuilt against the new models (source)"
run_kotlin -PadditiveChange=true
run_swift
run_typescript

step "Kotlin API: no removed declarations"
# Dump the API of the new models (any build failure stops the script), then compare it with the
# committed baseline. An additive change may add declarations; it must not remove any.
gradle -p "$PROTOCOL_DIR/languages/kotlin" :embedded-checkout-protocol:apiDump
tar -C "$WORK" -xf "$WORK/generated.tar" "$KOTLIN_API"
api_diff="$(diff "$WORK/$KOTLIN_API" "$PROTOCOL_DIR/$KOTLIN_API" || true)"
removed="$(grep -E '^<[[:space:]]+public' <<< "$api_diff" || true)"
if [[ -n "$removed" ]]; then
    echo "The additive change removed public Kotlin declarations:" >&2
    echo "$removed" >&2
    exit 1
fi
added="$(grep -c -E '^>[[:space:]]+public' <<< "$api_diff" || true)"
if [[ "$added" -eq 0 ]]; then
    echo "The additive change added no public Kotlin declarations; the check isn't exercising anything." >&2
    exit 1
fi
echo "Additions only: $added new public declarations"

step "Compatible"
