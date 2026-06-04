#!/usr/bin/env node
/*
 * MIT License
 *
 * Copyright 2023-present, Shopify Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  PROTOCOL_DIR,
  QUICKTYPE_BIN,
  REPO_ROOT,
  readJson,
  requireQuicktype,
  run,
} from "./codegen_tools.mjs";

const SCHEMA_SOURCE_DIR = path.join(PROTOCOL_DIR, "schemas");
const SERVICES_DIR = path.join(PROTOCOL_DIR, "services", "shopping");

function usage() {
  console.error("Usage: generate_models.sh --lang <kotlin|swift|typescript|typescript-ucp> [--output <path>]");
}

function parseArgs(argv) {
  let lang = "";
  let output = "";

  for (let index = 0; index < argv.length;) {
    const arg = argv[index];
    switch (arg) {
      case "--lang":
        if (index + 1 >= argv.length) {
          throw new Error("Missing value for --lang");
        }
        lang = normalizeLang(argv[index + 1]);
        index += 2;
        break;
      case "--output":
        if (index + 1 >= argv.length) {
          throw new Error("Missing value for --output");
        }
        output = argv[index + 1];
        index += 2;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (lang === "") {
    usage();
    process.exit(1);
  }

  return {lang, output};
}

function normalizeLang(lang) {
  switch (lang) {
    case "kotlin":
    case "swift":
    case "typescript":
    case "typescript-ucp":
      return lang;
    case "ts":
      return "typescript";
    default:
      throw new Error(`Unsupported language: ${lang}. Use kotlin, swift, typescript, or typescript-ucp.`);
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function rewriteRefs(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      rewriteRefs(item);
    }
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  if (typeof value.$ref === "string") {
    value.$ref = value.$ref.replaceAll("../../schemas/shopping/", "");
  }

  for (const item of Object.values(value)) {
    rewriteRefs(item);
  }
}

async function prepareCodegenSchemas(tempDir) {
  const schemaDir = path.join(tempDir, "schemas");
  await fs.cp(SCHEMA_SOURCE_DIR, schemaDir, {recursive: true});

  const specDir = path.join(schemaDir, "shopping");

  // Build checkout models from the base checkout schema plus checkout extension
  // fields that checkout-web emits in the primary checkout snapshot/change
  // notifications. The imported public schemas stay unchanged; this temp schema
  // only gives quicktype the full checkout shape we expose through the SDKs.
  const checkout = await readJson(path.join(specDir, "checkout.json"));
  checkout.properties.fulfillment = {
    title: "CheckoutFulfillment",
    allOf: [
      {$ref: "fulfillment.json#/$defs/fulfillment"},
    ],
    description: "Fulfillment details.",
    ucp_request: {
      create: "optional",
      update: "optional",
      complete: "omit",
    },
  };
  checkout.properties.discounts = {
    $ref: "discount.json#/$defs/discounts_object",
    ucp_request: {
      create: "optional",
      update: "optional",
      complete: "omit",
    },
  };
  checkout.properties.payment.title = "Payment";
  await writeJson(path.join(specDir, "checkout.json"), checkout);

  const order = await readJson(path.join(specDir, "order.json"));
  order.properties.fulfillment.title = "Fulfillment";
  await writeJson(path.join(specDir, "order.json"), order);

  // The public schemas are imported inputs, so keep naming hints local to codegen.
  // quicktype otherwise collapses order_line_item.quantity to a generic Quantity.
  const orderLineItem = await readJson(path.join(specDir, "types", "order_line_item.json"));
  orderLineItem.properties.quantity.title = "LineItemQuantity";
  await writeJson(path.join(specDir, "types", "order_line_item.json"), orderLineItem);

  // Preserve the existing shared line-item total model name after checkout
  // fulfillment adds another reference from fulfillment option totals.
  const total = await readJson(path.join(specDir, "types", "total.json"));
  total.title = "LineItemTotal";
  await writeJson(path.join(specDir, "types", "total.json"), total);

  const totals = await readJson(path.join(specDir, "types", "totals.json"));
  totals.items.title = "CheckoutTotal";
  await writeJson(path.join(specDir, "types", "totals.json"), totals);

  const embeddedConfig = await readJson(path.join(schemaDir, "transports", "embedded_config.json"));
  embeddedConfig.properties.color_scheme.items.title = "EmbeddedColorScheme";
  await writeJson(path.join(schemaDir, "transports", "embedded_config.json"), embeddedConfig);

  // Message discriminators are defined across the message variant schemas. Give
  // each variant the same local title so quicktype emits a single MessageType symbol.
  // PR #202 moved these files from `shopping/types/` into `common/types/`.
  const commonTypesDir = path.join(schemaDir, "common", "types");
  for (const messageSchema of ["message_error", "message_warning", "message_info"]) {
    const schema = await readJson(path.join(commonTypesDir, `${messageSchema}.json`));
    schema.properties.type.title = "MessageType";
    await writeJson(path.join(commonTypesDir, `${messageSchema}.json`), schema);
  }

  // Extension schemas bring in repeated generic property names like `type` and
  // `method`; add local titles so generated model symbols stay domain-specific.
  const discount = await readJson(path.join(specDir, "discount.json"));
  discount.$defs.discounts_object.title = "CheckoutDiscounts";
  discount.$defs.applied_discount.title = "AppliedDiscount";
  discount.$defs.applied_discount.properties.method.title = "DiscountMethod";
  discount.$defs.allocation.title = "DiscountAllocation";
  await writeJson(path.join(specDir, "discount.json"), discount);

  for (const fulfillmentSchema of ["fulfillment_available_method", "fulfillment_method"]) {
    const schema = await readJson(path.join(specDir, "types", `${fulfillmentSchema}.json`));
    schema.properties.type.title = "FulfillmentMethodType";
    await writeJson(path.join(specDir, "types", `${fulfillmentSchema}.json`), schema);
  }

  const fulfillment = await readJson(path.join(specDir, "types", "fulfillment.json"));
  fulfillment.title = "CheckoutFulfillment";
  await writeJson(path.join(specDir, "types", "fulfillment.json"), fulfillment);

  return specDir;
}

async function extractResultSchema(specDir, methodName, outputFile, rootTitle, checkoutTitle, paymentSchema) {
  const service = await readJson(path.join(SERVICES_DIR, "embedded.openrpc.json"));
  const method = service.methods.find((candidate) => candidate.name === methodName);
  if (method === undefined) {
    throw new Error(`Missing OpenRPC method ${methodName}`);
  }

  const schema = structuredClone(method.result.schema);
  schema.title = rootTitle;
  rewriteRefs(schema);

  for (const variant of schema.oneOf ?? []) {
    if (variant?.properties?.checkout !== undefined) {
      variant.properties.checkout.title = checkoutTitle;
      variant.properties.checkout.properties.payment = structuredClone(paymentSchema);
    }
  }

  schema.components = service.components;

  await writeJson(path.join(specDir, outputFile), schema);
}

// Synthesize a JSON Schema object from an OpenRPC method's `params` array so
// quicktype can emit a named type for the params payload. Used by the web
// target to give `EcReadyParams` a stable name without duplicating the OpenRPC
// definition by hand.
async function extractParamsSchema(specDir, methodName, outputFile, rootTitle) {
  const service = await readJson(path.join(SERVICES_DIR, "embedded.openrpc.json"));
  const method = service.methods.find((candidate) => candidate.name === methodName);
  if (method === undefined) {
    throw new Error(`Missing OpenRPC method ${methodName}`);
  }

  const properties = {};
  const required = [];
  for (const param of method.params ?? []) {
    if (typeof param?.name !== "string" || param.schema === undefined) {
      continue;
    }
    properties[param.name] = structuredClone(param.schema);
    if (param.required === true) {
      required.push(param.name);
    }
  }

  const schema = {
    title: rootTitle,
    description: method.summary ?? method.description ?? `Params for ${methodName}.`,
    type: "object",
    properties,
    additionalProperties: true,
  };
  if (required.length > 0) {
    schema.required = required;
  }
  rewriteRefs(schema);
  schema.components = service.components;

  await writeJson(path.join(specDir, outputFile), schema);
}

// `typescript-ucp` target reuses every disambiguation prepared by
// `prepareCodegenSchemas` (which targets the shopping checkout/order surface)
// and adds local titles on the UCP transport schemas plus a handful of shopping
// types so the generated symbol names match the public surface of
// `@shopify/checkout-kit-protocol/web`. These overrides are scoped to the
// typescript-ucp target so existing kotlin/swift/typescript outputs are unchanged.
async function prepareTypescriptUcpTitles(schemaDir) {
  const ucp = await readJson(path.join(schemaDir, "ucp.json"));
  ucp.$defs.response_checkout_schema.title = "UcpMetadata";
  ucp.$defs.error.title = "UcpErrorMetadata";
  ucp.$defs.success.title = "UcpSuccessMetadata";
  await writeJson(path.join(schemaDir, "ucp.json"), ucp);

  const service = await readJson(path.join(schemaDir, "service.json"));
  service.$defs.response_schema.title = "UcpService";
  await writeJson(path.join(schemaDir, "service.json"), service);

  const capability = await readJson(path.join(schemaDir, "capability.json"));
  capability.$defs.response_schema.title = "UcpCapability";
  await writeJson(path.join(schemaDir, "capability.json"), capability);

  const paymentHandler = await readJson(path.join(schemaDir, "payment_handler.json"));
  paymentHandler.$defs.response_schema.title = "UcpPaymentHandler";
  await writeJson(path.join(schemaDir, "payment_handler.json"), paymentHandler);

  // Align generated symbol names with the previously hand-written wire payload
  // types exposed by the web component's public API (`Checkout`, `Buyer`,
  // `CheckoutLineItem`, `CheckoutMessage`, `Total`, `OrderConfirmation`,
  // `UcpErrorResponse`). The kotlin/swift/typescript targets keep their existing
  // names because these overrides only run for `--lang web`.
  const specDir = path.join(schemaDir, "shopping");
  const commonTypesDir = path.join(schemaDir, "common", "types");

  const lineItem = await readJson(path.join(specDir, "types", "line_item.json"));
  lineItem.title = "CheckoutLineItem";
  await writeJson(path.join(specDir, "types", "line_item.json"), lineItem);

  // `prepareCodegenSchemas` retitled these to `LineItemTotal`/`CheckoutTotal`.
  // For web, both line-item totals and checkout totals collapse to a single
  // `Total` type matching the previously hand-written shape. Replace the
  // wrapping `allOf` in totals.json so the items become a plain ref to total.json
  // — without this, quicktype keeps them as structurally distinct types (the
  // checkout totals wrapper adds a `lines` field) and emits a fallback name.
  const total = await readJson(path.join(specDir, "types", "total.json"));
  total.title = "Total";
  await writeJson(path.join(specDir, "types", "total.json"), total);

  const totals = await readJson(path.join(specDir, "types", "totals.json"));
  totals.items = {$ref: "total.json"};
  await writeJson(path.join(specDir, "types", "totals.json"), totals);

  const errorResponse = await readJson(path.join(commonTypesDir, "error_response.json"));
  errorResponse.title = "UcpErrorResponse";
  await writeJson(path.join(commonTypesDir, "error_response.json"), errorResponse);

  const message = await readJson(path.join(commonTypesDir, "message.json"));
  message.title = "CheckoutMessage";
  await writeJson(path.join(commonTypesDir, "message.json"), message);

  const messageError = await readJson(path.join(commonTypesDir, "message_error.json"));
  messageError.title = "CheckoutMessageError";
  await writeJson(path.join(commonTypesDir, "message_error.json"), messageError);
}

async function runQuicktype(args) {
  await run(QUICKTYPE_BIN, args);
}

async function replaceInFile(file, transform) {
  const source = await fs.readFile(file, "utf8");
  await fs.writeFile(file, transform(source));
}

function normalizeQuicktypeFallbacks(source) {
  return source
    .replace(/\bPurpleStatus\b/g, "StatusEnum")
    .replace(/\bPurpleService\b/g, "InstrumentsChangeService");
}

function assertNoQuicktypeFallbacks(source, output) {
  const matches = Array.from(
    source.matchAll(/\b(?:Purple|Fluffy|Tentacled|Sticky|Indigo|Magenta)\w+/g),
    (match) => match[0],
  );
  const unique = [...new Set(matches)].sort();

  if (unique.length > 0) {
    throw new Error(`Unexpected quicktype color-name fallback detected in ${output}:\n${unique.join("\n")}`);
  }
}

async function normalizeGeneratedFile(output, transform = (source) => source) {
  await replaceInFile(output, (source) => {
    const result = normalizeQuicktypeFallbacks(transform(source));
    assertNoQuicktypeFallbacks(result, output);
    return result;
  });
}

function commonSchemaSources(specDir) {
  // `error_response.json` lives under `common/types/` after PR #202; the rest
  // are still under `shopping/`.
  const schemaDir = path.join(specDir, "..");
  return [
    "--src",
    path.join(specDir, "checkout.json"),
    "--src",
    path.join(specDir, "order.json"),
    "--src",
    path.join(schemaDir, "common", "types", "error_response.json"),
    "--src",
    path.join(specDir, "instruments_change_result.json"),
    "--src",
    path.join(specDir, "credential_result.json"),
  ];
}

async function generateKotlin(specDir, output) {
  await fs.mkdir(path.dirname(output), {recursive: true});
  await runQuicktype([
    "--lang",
    "kotlin",
    "--src-lang",
    "schema",
    "--framework",
    "kotlinx",
    ...commonSchemaSources(specDir),
    "--package",
    "com.shopify.checkoutkit",
    "-o",
    output,
  ]);

  await normalizeGeneratedFile(output, (source) => {
    const result = source
      .replace(/^.*?(?=^package )/ms, "")
      .replace(/^data class /gm, "public data class ")
      .replace(/^sealed class /gm, "public sealed class ")
      .replace(/^enum class /gm, "public enum class ")
      .replace(/^typealias /gm, "public typealias ")
      .replace(/^    class /gm, "    public class ")
      .replace(/^    val /gm, "    public val ")
      .replace(/\(val value: /g, "(public val value: ");

    const withSerializer = result.replace(
      /@Serializable(\s+public sealed class Extends\b)/,
      "@Serializable(with = ExtendsSerializer::class)$1",
    );

    if (withSerializer === result) {
      throw new Error("ExtendsSerializer injection failed; quicktype Extends output may have changed");
    }

    return withSerializer;
  });
}

async function generateSwift(specDir, output) {
  await fs.mkdir(path.dirname(output), {recursive: true});
  await runQuicktype([
    "--lang",
    "swift",
    "--swift-5-support",
    "--access-level",
    "public",
    "--sendable",
    "--src-lang",
    "schema",
    ...commonSchemaSources(specDir),
    "-o",
    output,
  ]);

  await normalizeGeneratedFile(output);
}

async function generateTypescript(specDir, output) {
  await fs.mkdir(path.dirname(output), {recursive: true});
  await runQuicktype([
    "--lang",
    "ts",
    "--src-lang",
    "schema",
    "--prefer-unions",
    "--nice-property-names",
    "--acronym-style",
    "camel",
    "--no-date-times",
    ...commonSchemaSources(specDir),
    "-o",
    output,
  ]);

  await normalizeGeneratedFile(output, (source) => source.replace(/^type /gm, "export type "));

  await run("node", [path.join(PROTOCOL_DIR, "scripts", "generate_typescript_notifications.mjs")]);

  const declarationOutput = path.join(PROTOCOL_DIR, "languages", "typescript", "src", "index.d.ts");
  const tscBin = path.join(REPO_ROOT, "platforms", "react-native", "node_modules", "typescript", "bin", "tsc");
  const indexOutput = path.join(PROTOCOL_DIR, "languages", "typescript", "src", "index.ts");

  await run("node", [
    tscBin,
    "--declaration",
    "--emitDeclarationOnly",
    "--noEmit",
    "false",
    "--rootDir",
    path.join(PROTOCOL_DIR, "languages", "typescript", "src"),
    "--declarationDir",
    path.join(PROTOCOL_DIR, "languages", "typescript", "src"),
    "--pretty",
    "false",
    indexOutput,
  ]);

  return declarationOutput;
}

function typescriptUcpSchemaSources(specDir, schemaDir) {
  return [
    ...commonSchemaSources(specDir),
    "--src",
    path.join(schemaDir, "ucp.json"),
    "--src",
    path.join(schemaDir, "service.json"),
    "--src",
    path.join(schemaDir, "capability.json"),
    "--src",
    path.join(schemaDir, "payment_handler.json"),
    "--src",
    path.join(specDir, "ec_ready_params.json"),
  ];
}

async function generateTypescriptUcp(specDir, schemaDir, output) {
  await fs.mkdir(path.dirname(output), {recursive: true});
  // Drop `--nice-property-names` and `--acronym-style camel`: the web component
  // reads raw postMessage JSON without key conversion, so the generated types
  // must keep schema property names in their snake_case wire form. `--just-types`
  // keeps the file declaration-only, matching the public surface previously
  // held by the hand-written `ucp-embed-types.ts`.
  await runQuicktype([
    "--lang",
    "ts",
    "--src-lang",
    "schema",
    "--just-types",
    "--prefer-unions",
    "--no-date-times",
    ...typescriptUcpSchemaSources(specDir, schemaDir),
    "-o",
    output,
  ]);

  await normalizeGeneratedFile(output, (source) => source.replace(/^type /gm, "export type "));

  const declarationOutput = path.join(PROTOCOL_DIR, "languages", "typescript", "src", "web.d.ts");
  const tscBin = path.join(REPO_ROOT, "platforms", "react-native", "node_modules", "typescript", "bin", "tsc");
  const webEntry = path.join(PROTOCOL_DIR, "languages", "typescript", "src", "web.ts");

  await run("node", [
    tscBin,
    "--declaration",
    "--emitDeclarationOnly",
    "--noEmit",
    "false",
    "--rootDir",
    path.join(PROTOCOL_DIR, "languages", "typescript", "src"),
    "--declarationDir",
    path.join(PROTOCOL_DIR, "languages", "typescript", "src"),
    "--pretty",
    "false",
    webEntry,
  ]);

  return declarationOutput;
}

async function main() {
  const {lang, output} = parseArgs(process.argv.slice(2));
  await requireQuicktype();

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "checkout-kit-protocol-codegen-"));
  try {
    const specDir = await prepareCodegenSchemas(tempDir);

    await extractResultSchema(
      specDir,
      "ec.payment.instruments_change_request",
      "instruments_change_result.json",
      "InstrumentsChangeResult",
      "InstrumentsChangeCheckout",
      {
        title: "InstrumentsChangePayment",
        description: "Payment instruments with selected instrument ID.",
        allOf: [
          {$ref: "checkout.json#/properties/payment"},
          {
            type: "object",
            properties: {
              selected_instrument_id: {
                type: "string",
                description: "ID of the selected payment instrument.",
              },
            },
          },
        ],
      },
    );
    await extractResultSchema(
      specDir,
      "ec.payment.credential_request",
      "credential_result.json",
      "CredentialResult",
      "CredentialCheckout",
      {$ref: "checkout.json#/properties/payment"},
    );

    switch (lang) {
      case "kotlin": {
        const target = output || path.join(REPO_ROOT, "platforms", "android", "lib", "src", "main", "java", "com", "shopify", "checkoutkit", "Models.kt");
        await generateKotlin(specDir, target);
        console.log(`Generated ${target}`);
        break;
      }
      case "swift": {
        const target = output || path.join(PROTOCOL_DIR, "languages", "swift", "Sources", "ShopifyCheckoutProtocol", "Generated", "Models.swift");
        await generateSwift(specDir, target);
        console.log(`Generated ${target}`);
        break;
      }
      case "typescript": {
        const target = output || path.join(PROTOCOL_DIR, "languages", "typescript", "src", "generated", "Models.ts");
        const declarationOutput = await generateTypescript(specDir, target);
        console.log(`Generated ${target}, TypeScript protocol notifications, and ${declarationOutput}`);
        break;
      }
      case "typescript-ucp": {
        const schemaDir = path.join(tempDir, "schemas");
        await extractParamsSchema(specDir, "ec.ready", "ec_ready_params.json", "EcReadyParams");
        await prepareTypescriptUcpTitles(schemaDir);
        const target = output || path.join(PROTOCOL_DIR, "languages", "typescript", "src", "generated", "WebModels.ts");
        const declarationOutput = await generateTypescriptUcp(specDir, schemaDir, target);
        console.log(`Generated ${target} and ${declarationOutput}`);
        break;
      }
      default:
        throw new Error(`Unsupported language: ${lang}. Use kotlin, swift, typescript, or typescript-ucp.`);
    }
  } finally {
    await fs.rm(tempDir, {recursive: true, force: true});
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
