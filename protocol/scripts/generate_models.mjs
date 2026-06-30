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

import crypto from "node:crypto";
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
import {MODEL_EXTRACTIONS} from "./method_catalog.mjs";

const SCHEMA_SOURCE_DIR = path.join(PROTOCOL_DIR, "schemas");
const SERVICES_DIR = path.join(PROTOCOL_DIR, "services", "shopping");
const SWIFT_JSON_HELPER_MARKER = "// MARK: - Encode/decode helpers";
const SWIFT_JSON_HELPER_REPLACEMENT = `// MARK: - Encode/decode helpers
// quicktype's JSONAny/JSONNull helper suffix is intentionally replaced here.
// See ../JSONAny.swift for the maintained Swift implementation.
`;
// quicktype 23.2.6's Swift helper suffix for:
// --lang swift --swift-5-support --access-level public --sendable
// Guarding the whole suffix keeps this normalization fail-fast if quicktype fixes
// or changes the helper block instead of silently clobbering future output.
const QUICKTYPE_23_2_6_SWIFT_JSON_HELPER_SHA256 = "02b7721a424fdb5a586a773116130f0b273551f9bfd5d9111a1c700581ec5e7e";

function usage() {
  console.error("Usage: generate_models.sh --lang <kotlin|swift|typescript> [--output <path>]");
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
      return lang;
    case "ts":
      return "typescript";
    default:
      throw new Error(`Unsupported language: ${lang}. Use kotlin, swift, or typescript.`);
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
  for (const messageSchema of ["message_error", "message_warning", "message_info"]) {
    const schemaPath = path.join(schemaDir, "common", "types", `${messageSchema}.json`);
    const schema = await readJson(schemaPath);
    schema.properties.type.title = "MessageType";
    await writeJson(schemaPath, schema);
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

  // The error response branch narrows status to the single const "error"; title
  // it so the generated single-case enum stays domain-specific.
  const ucp = await readJson(path.join(schemaDir, "ucp.json"));
  for (const branch of ucp.$defs.error.allOf ?? []) {
    if (branch.properties?.status !== undefined) {
      branch.properties.status.title = "ErrorStatus";
    }
  }
  // The success-branch service binding and the response-branch one resolve to the
  // same service node, so quicktype disambiguates the success copy with a
  // color-name fallback. Title the success branch's service so it gets a stable
  // domain name and the response branches keep theirs.
  ucp.$defs.success.allOf.push({
    properties: {
      services: {
        additionalProperties: {
          items: {$ref: "service.json#/$defs/base", title: "EmbeddedService"},
        },
      },
    },
  });
  await writeJson(path.join(schemaDir, "ucp.json"), ucp);

  return specDir;
}

// Finds a method by name in the OpenRPC document, resolving `$ref` method
// entries (some methods live in shared schema files, e.g. fulfillment.json)
// against the service directory so they match by their resolved `name`.
async function findOpenRpcMethod(service, methodName) {
  for (const entry of service.methods ?? []) {
    if (entry.name === methodName) {
      return entry;
    }
    if (typeof entry.$ref === "string") {
      const [relativePath, pointer = ""] = entry.$ref.split("#");
      const doc = await readJson(path.resolve(SERVICES_DIR, relativePath));
      const resolved = pointer
        .split("/")
        .filter(Boolean)
        .reduce(
          (node, segment) =>
            node?.[segment.replaceAll("~1", "/").replaceAll("~0", "~")],
          doc,
        );
      if (resolved?.name === methodName) {
        return resolved;
      }
    }
  }
  return undefined;
}

async function extractResultSchema(specDir, methodName, outputFile, rootTitle, checkoutTitle, paymentSchema) {
  const service = await readJson(path.join(SERVICES_DIR, "embedded.openrpc.json"));
  const method = await findOpenRpcMethod(service, methodName);
  if (method === undefined) {
    throw new Error(`Missing OpenRPC method ${methodName}`);
  }

  const schema = structuredClone(method.result.schema);
  schema.title = rootTitle;
  rewriteRefs(schema);

  for (const variant of schema.oneOf ?? []) {
    if (variant?.properties?.checkout !== undefined) {
      if (checkoutTitle !== undefined) {
        variant.properties.checkout.title = checkoutTitle;
      }
      if (paymentSchema !== undefined) {
        variant.properties.checkout.properties.payment = structuredClone(paymentSchema);
      }
    }
  }

  schema.components = service.components;

  await writeJson(path.join(specDir, outputFile), schema);
}

// Synthesizes an object schema from an OpenRPC method's `params` array so request
// payload types are generated from the spec alongside their result types. Each
// named param becomes a property; params marked `required` populate the schema's
// `required` list.
async function extractParamsSchema(specDir, methodName, outputFile, rootTitle) {
  const service = await readJson(path.join(SERVICES_DIR, "embedded.openrpc.json"));
  const method = await findOpenRpcMethod(service, methodName);
  if (method === undefined) {
    throw new Error(`Missing OpenRPC method ${methodName}`);
  }

  const properties = {};
  const required = [];
  for (const param of method.params ?? []) {
    properties[param.name] = structuredClone(param.schema);
    if (param.required === true) {
      required.push(param.name);
    }
  }

  const schema = {
    title: rootTitle,
    type: "object",
    properties,
  };
  if (required.length > 0) {
    schema.required = required;
  }
  rewriteRefs(schema);

  schema.components = service.components;

  await writeJson(path.join(specDir, outputFile), schema);
}

async function runQuicktype(args) {
  await run(QUICKTYPE_BIN, args);
}

async function replaceInFile(file, transform) {
  const source = await fs.readFile(file, "utf8");
  await fs.writeFile(file, transform(source));
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
    const result = transform(source);
    assertNoQuicktypeFallbacks(result, output);
    return result;
  });
}

function commonSchemaSources(specDir) {
  return [
    "--src",
    path.join(specDir, "checkout.json"),
    "--src",
    path.join(specDir, "order.json"),
    "--src",
    path.join(specDir, "..", "common", "types", "error_response.json"),
    "--src",
    path.join(specDir, "instruments_change_result.json"),
    "--src",
    path.join(specDir, "credential_result.json"),
    "--src",
    path.join(specDir, "address_change_result.json"),
    "--src",
    path.join(specDir, "ready_request.json"),
    "--src",
    path.join(specDir, "ready_result.json"),
    "--src",
    path.join(specDir, "auth_request.json"),
    "--src",
    path.join(specDir, "auth_result.json"),
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
    "com.shopify.ucp.embedded.checkout",
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

  await normalizeGeneratedFile(output, (source) => {
    // quicktype's --sendable option marks generated models as Sendable, but quicktype 23.2.6
    // still emits dynamic JSON helper types that are not fully Swift 6 concurrency-safe.
    // Drop only the exact helper suffix quicktype 23.2.6 emits. Maintained helper
    // implementations live in UniversalCommerceProtocol/EmbeddedCheckoutProtocol/JSONAny.swift so Swift tooling can
    // lint, format, and type-check them normally.
    const helperStart = source.indexOf(SWIFT_JSON_HELPER_MARKER);
    if (helperStart === -1) {
      throw new Error("Swift JSON helper normalization failed; quicktype output may have changed");
    }

    const generatedHelper = source.slice(helperStart);
    const generatedHelperHash = crypto.createHash("sha256").update(generatedHelper).digest("hex");
    if (generatedHelperHash !== QUICKTYPE_23_2_6_SWIFT_JSON_HELPER_SHA256) {
      throw new Error(`Swift JSON helper normalization failed; quicktype helper output changed (sha256: ${generatedHelperHash})`);
    }

    return `${source.slice(0, helperStart)}${SWIFT_JSON_HELPER_REPLACEMENT}`;
  });

  await run("node", [path.join(PROTOCOL_DIR, "scripts", "generate_swift_catalog.mjs")]);
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

async function main() {
  const {lang, output} = parseArgs(process.argv.slice(2));
  await requireQuicktype();

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "checkout-kit-protocol-codegen-"));
  try {
    const specDir = await prepareCodegenSchemas(tempDir);

    for (const extraction of MODEL_EXTRACTIONS) {
      if (extraction.kind === "params") {
        await extractParamsSchema(specDir, extraction.method, extraction.outputFile, extraction.rootTitle);
      } else {
        await extractResultSchema(
          specDir,
          extraction.method,
          extraction.outputFile,
          extraction.rootTitle,
          extraction.checkoutTitle,
          extraction.paymentSchema,
        );
      }
    }

    switch (lang) {
      case "kotlin": {
        const target = output || path.join(
          REPO_ROOT,
          "protocol",
          "languages",
          "kotlin",
          "embedded-checkout-protocol",
          "src",
          "main",
          "java",
          "com",
          "shopify",
          "ucp",
          "embedded",
          "checkout",
          "Models.kt",
        );
        await generateKotlin(specDir, target);
        await run("node", [path.join(PROTOCOL_DIR, "scripts", "generate_kotlin_catalog.mjs")]);
        console.log(`Generated ${target}`);
        break;
      }
      case "swift": {
        const target = output || path.join(PROTOCOL_DIR, "languages", "swift", "Sources", "UniversalCommerceProtocol", "EmbeddedCheckoutProtocol", "Generated", "Models.swift");
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
      default:
        throw new Error(`Unsupported language: ${lang}. Use kotlin, swift, or typescript.`);
    }
  } finally {
    await fs.rm(tempDir, {recursive: true, force: true});
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
