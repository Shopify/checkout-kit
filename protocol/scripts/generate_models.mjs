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

function ensureObjectPath(root, pathSegments) {
  let target = root;
  for (const segment of pathSegments) {
    if (target[segment] === undefined) {
      target[segment] = {};
    }
    target = target[segment];
  }
  return target;
}

async function prepareCodegenSchemas(tempDir) {
  const schemaDir = path.join(tempDir, "schemas");
  await fs.cp(SCHEMA_SOURCE_DIR, schemaDir, {recursive: true});
  return path.join(schemaDir, "shopping");
}

async function extractResultSchema(specDir, methodName, outputFile, rootTitle, checkoutTitle, paymentTitle) {
  const service = await readJson(path.join(SERVICES_DIR, "embedded.openrpc.json"));
  const method = service.methods.find((candidate) => candidate.name === methodName);
  if (method === undefined) {
    throw new Error(`Missing OpenRPC method ${methodName}`);
  }

  const schema = structuredClone(method.result.schema);
  schema.title = rootTitle;
  ensureObjectPath(schema, ["properties", "checkout"]).title = checkoutTitle;
  ensureObjectPath(schema, ["properties", "checkout", "properties", "payment"]).title = paymentTitle;
  rewriteRefs(schema);
  ensureObjectPath(schema, ["properties", "checkout", "properties", "payment", "properties"]).instruments = {
    $ref: "payment.json#/properties/instruments",
  };
  schema.components = service.components;

  await writeJson(path.join(specDir, outputFile), schema);
}

async function typeSchemas(specDir) {
  const typesDir = path.join(specDir, "types");
  const names = (await fs.readdir(typesDir))
    .filter((name) => name.endsWith(".json"))
    .sort();
  return names.map((name) => path.join(typesDir, name));
}

async function runQuicktype(args) {
  await run(QUICKTYPE_BIN, args);
}

async function replaceInFile(file, transform) {
  const source = await fs.readFile(file, "utf8");
  await fs.writeFile(file, transform(source));
}

function replaceRequired(source, regex, replacement, description) {
  const matches = Array.from(source.matchAll(regex.global ? regex : new RegExp(regex.source, `${regex.flags}g`))).length;
  if (matches === 0) {
    throw new Error(`${description}: expected at least one match.`);
  }

  return source.replace(regex.global ? regex : new RegExp(regex.source, `${regex.flags}g`), replacement);
}

function replaceExactlyOnce(source, search, replacement, description) {
  const matches = source.split(search).length - 1;
  if (matches !== 1) {
    throw new Error(`${description}: expected exactly one match, found ${matches}.`);
  }

  return source.replace(search, replacement);
}

function replaceIfPresent(source, regex, replacement) {
  return source.replace(regex.global ? regex : new RegExp(regex.source, `${regex.flags}g`), replacement);
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
    "--src",
    path.join(specDir, "checkout.json"),
    ...((await typeSchemas(specDir)).flatMap((file) => ["--src", file])),
    "--src",
    path.join(specDir, "payment.json"),
    "--src",
    path.join(specDir, "order.json"),
    "--src",
    path.join(specDir, "instruments_change_result.json"),
    "--src",
    path.join(specDir, "credential_result.json"),
    "--package",
    "com.shopify.checkoutkit",
    "-o",
    output,
  ]);

  await replaceInFile(output, (source) => {
    let result = source
      .replace(/^data class /gm, "public data class ")
      .replace(/^sealed class /gm, "public sealed class ")
      .replace(/^enum class /gm, "public enum class ")
      .replace(/^typealias /gm, "public typealias ")
      .replace(/^    class /gm, "    public class ")
      .replace(/^    val /gm, "    public val ")
      .replace(/\(val value: /g, "(public val value: ");

    result = replaceExactlyOnce(result, "public data class Binding (", "public data class TokenBinding (", "Kotlin TokenBinding class declaration");
    result = replaceIfPresent(result, /: Binding$/gm, ": TokenBinding");
    result = replaceRequired(result, /Binding\.serializer\(\)/g, "TokenBinding.serializer()", "Kotlin TokenBinding serializer references");
    result = replaceExactlyOnce(result, "public enum class ColorScheme(", "public enum class EmbeddedColorScheme(", "Kotlin EmbeddedColorScheme declaration");
    result = replaceRequired(result, /List<ColorScheme>/g, "List<EmbeddedColorScheme>", "Kotlin EmbeddedColorScheme list references");
    result = replaceIfPresent(result, /ColorScheme\.serializer\(\)/g, "EmbeddedColorScheme.serializer()");
    result = replaceExactlyOnce(result, "typealias Totals = JsonArray<TotalElement>", "typealias Totals = List<TotalElement>", "Kotlin Totals collection type");

    return result;
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
    "--src",
    path.join(specDir, "checkout.json"),
    ...((await typeSchemas(specDir)).flatMap((file) => ["--src", file])),
    "--src",
    path.join(specDir, "payment.json"),
    "--src",
    path.join(specDir, "order.json"),
    "--src",
    path.join(specDir, "instruments_change_result.json"),
    "--src",
    path.join(specDir, "credential_result.json"),
    "-o",
    output,
  ]);

  await replaceInFile(output, (source) => source
    .replace(/\bBinding\b/g, "TokenBinding")
    .replace(/\bColorScheme\b/g, "EmbeddedColorScheme"));
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
    "--src",
    path.join(specDir, "checkout.json"),
    ...((await typeSchemas(specDir)).flatMap((file) => ["--src", file])),
    "--src",
    path.join(specDir, "payment.json"),
    "--src",
    path.join(specDir, "order.json"),
    "--src",
    path.join(specDir, "instruments_change_result.json"),
    "--src",
    path.join(specDir, "credential_result.json"),
    "-o",
    output,
  ]);

  await replaceInFile(output, (source) => source
    .replace(/^type /gm, "export type ")
    .replace(/\bBinding\b/g, "TokenBinding")
    .replace(/\bColorScheme\b/g, "EmbeddedColorScheme"));

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

    await extractResultSchema(
      specDir,
      "ec.payment.instruments_change_request",
      "instruments_change_result.json",
      "InstrumentsChangeResult",
      "InstrumentsChangeCheckout",
      "InstrumentsChangePayment",
    );
    await extractResultSchema(
      specDir,
      "ec.payment.credential_request",
      "credential_result.json",
      "CredentialResult",
      "CredentialCheckout",
      "CredentialPayment",
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
