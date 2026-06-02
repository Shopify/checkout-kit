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

import {requireQuicktype} from "./codegen_tools.mjs";

function usage() {
  console.error(`Usage: check_codegen_tools.sh [--quiet]

Verifies that protocol codegen tools are installed from the repo-local pnpm
dependencies and match the exact versions in protocol/package.json.`);
}

function parseArgs(argv) {
  let quiet = false;

  for (let index = 0; index < argv.length;) {
    const arg = argv[index];
    switch (arg) {
      case "--quiet":
        quiet = true;
        index += 1;
        break;
      case "-h":
      case "--help":
        usage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        usage();
        process.exit(2);
    }
  }

  return {quiet};
}

async function main() {
  const {quiet} = parseArgs(process.argv.slice(2));

  await requireQuicktype();

  if (!quiet) {
    console.log("Protocol codegen tools are installed and match protocol/package.json.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
