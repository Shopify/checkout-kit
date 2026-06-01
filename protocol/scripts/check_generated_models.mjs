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

import {spawn} from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  PROTOCOL_DIR,
  REPO_ROOT,
  SCRIPT_DIR,
} from "./codegen_tools.mjs";

const GENERATE_SCRIPT = path.join(SCRIPT_DIR, "generate_models.sh");
const DEFAULT_LANGS = ["kotlin", "swift", "typescript"];

function usage() {
  console.error(`Usage: check_generated_models.sh [--lang <kotlin|swift|typescript|ts>]

Regenerates protocol models into a temporary directory and diffs them against
the checked-in generated files. Does not write repo-tracked files.`);
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
      throw new Error(`Unsupported language: ${lang}`);
  }
}

function parseArgs(argv) {
  let langs = DEFAULT_LANGS;

  for (let index = 0; index < argv.length;) {
    const arg = argv[index];
    switch (arg) {
      case "--lang":
        if (index + 1 >= argv.length) {
          throw new Error("Missing value for --lang");
        }
        langs = [normalizeLang(argv[index + 1])];
        index += 2;
        break;
      case "-h":
      case "--help":
        usage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return {langs};
}

function expectedOutput(lang) {
  switch (lang) {
    case "kotlin":
      return path.join(REPO_ROOT, "platforms", "android", "lib", "src", "main", "java", "com", "shopify", "checkoutkit", "Models.kt");
    case "swift":
      return path.join(PROTOCOL_DIR, "languages", "swift", "Sources", "ShopifyCheckoutProtocol", "Generated", "Models.swift");
    case "typescript":
      return path.join(PROTOCOL_DIR, "languages", "typescript", "src", "generated", "Models.ts");
    default:
      throw new Error(`Unsupported language: ${lang}`);
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const result = {
        code,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };

      if (code === 0 || options.allowFailure) {
        resolve(result);
      } else {
        const error = new Error(`${command} ${args.join(" ")} exited with ${code}`);
        error.result = result;
        reject(error);
      }
    });
  });
}

function printCaptured({stdout, stderr}) {
  process.stderr.write(stdout);
  process.stderr.write(stderr);
}

async function checkGeneratedModels(lang, tempDir) {
  const expected = expectedOutput(lang);
  const generated = path.join(tempDir, lang, path.basename(expected));

  await fs.mkdir(path.dirname(generated), {recursive: true});

  console.log(`Checking generated ${lang} models...`);
  const generation = await run(GENERATE_SCRIPT, ["--lang", lang, "--output", generated], {allowFailure: true});
  if (generation.code !== 0) {
    printCaptured(generation);
    console.error(`Failed to generate ${lang} models`);
    return {drift: false, toolError: true};
  }

  const diff = await run("diff", ["-u", expected, generated], {allowFailure: true});
  switch (diff.code) {
    case 0:
      return {drift: false, toolError: false};
    case 1:
      process.stdout.write(diff.stdout);
      process.stderr.write(diff.stderr);
      return {drift: true, toolError: false};
    default:
      console.error(`diff error comparing ${expected} with regenerated ${lang} models`);
      process.stderr.write(diff.stderr);
      return {drift: false, toolError: true};
  }
}

async function main() {
  const {langs} = parseArgs(process.argv.slice(2));
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "checkout-kit-generated-models-"));
  let drift = false;
  let toolError = false;

  try {
    for (const lang of langs) {
      const result = await checkGeneratedModels(lang, tempDir);
      drift = drift || result.drift;
      toolError = toolError || result.toolError;
    }
  } finally {
    await fs.rm(tempDir, {recursive: true, force: true});
  }

  if (toolError) {
    console.error("Generated protocol model comparison failed due to tooling errors.");
    process.exit(2);
  }

  if (drift) {
    console.error("Generated protocol models are out of date. Run dev codegen <lang> for each drifted language.");
    process.exit(1);
  }

  console.log("Generated protocol models are up to date.");
}

main().catch((error) => {
  console.error(error.message);
  usage();
  process.exit(2);
});
