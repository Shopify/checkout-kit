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
import {constants as fsConstants} from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROTOCOL_DIR = path.resolve(SCRIPT_DIR, "..");
export const REPO_ROOT = path.resolve(PROTOCOL_DIR, "..");
export const PACKAGE_JSON = path.join(PROTOCOL_DIR, "package.json");
export const QUICKTYPE_BIN = path.join(PROTOCOL_DIR, "node_modules", ".bin", "quicktype");

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? REPO_ROOT,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({stdout, stderr});
      } else {
        const error = new Error(`${command} ${args.join(" ")} exited with ${code}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function fileIsExecutable(file) {
  try {
    await fs.access(file, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function requireQuicktype() {
  if (!(await fileIsExecutable(QUICKTYPE_BIN))) {
    throw new Error(`quicktype is required at ${QUICKTYPE_BIN}. Run dev up or (cd protocol && pnpm install).`);
  }

  const packageJson = await readJson(PACKAGE_JSON);
  const expected = packageJson.devDependencies?.quicktype ?? "";
  if (expected === "") {
    throw new Error(`Missing quicktype version in ${PACKAGE_JSON}`);
  }

  if (!/^[0-9]+[.][0-9]+[.][0-9]+(-[0-9A-Za-z.-]+)?$/.test(expected)) {
    throw new Error(`quicktype must use an exact version in ${PACKAGE_JSON}; found ${expected}.`);
  }

  const {stdout} = await run(QUICKTYPE_BIN, ["--version"], {capture: true});
  const actual = stdout.match(/^quicktype version (\S+)/m)?.[1] ?? "";
  if (actual === "") {
    throw new Error(`Unable to determine quicktype version from ${QUICKTYPE_BIN}`);
  }

  if (actual !== expected) {
    throw new Error(`Unsupported quicktype version: ${actual}. Expected ${expected} from ${PACKAGE_JSON}.`);
  }
}
