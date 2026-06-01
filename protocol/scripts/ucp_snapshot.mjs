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
import {constants as fsConstants} from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const LOCK_FILE = path.join(REPO_ROOT, "protocol", "source-lock.json");

const USAGE = `Usage:
  ucp_snapshot.sh check [--ref <upstream-ref>]
  ucp_snapshot.sh update --ref <upstream-ref> [--dry-run]

Commands:
  check   Compare vendored UCP files with upstream. Does not modify files.
  update  Download vendored UCP files and record the resolved upstream commit.

Options:
  --ref <upstream-ref>  Upstream branch, tag, or commit to use.
                        For check, defaults to the lock-file commit. For update,
                        this option is required.
  --dry-run             For update, show what would change without writing.
  -h, --help            Show this help message.
`;

class UsageError extends Error {}

class ExitError extends Error {
  constructor(code, message = "") {
    super(message);
    this.code = code;
  }
}

function usage(stream = process.stdout) {
  stream.write(USAGE);
}

function parseArgs(argv) {
  if (argv.length === 0) {
    throw new UsageError("");
  }

  if (argv[0] === "-h" || argv[0] === "--help") {
    return {help: true};
  }

  const mode = argv[0];
  let ref = "";
  let dryRun = false;

  for (let index = 1; index < argv.length;) {
    const arg = argv[index];
    switch (arg) {
      case "--ref":
        if (index + 1 >= argv.length || argv[index + 1] === "") {
          throw new UsageError("Missing value for --ref");
        }
        ref = argv[index + 1];
        index += 2;
        break;
      case "--dry-run":
        dryRun = true;
        index += 1;
        break;
      case "-h":
      case "--help":
        return {help: true};
      default:
        throw new UsageError(`Unknown argument: ${arg}`);
    }
  }

  return {mode, ref, dryRun};
}

async function executableExists(name) {
  const paths = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const searchPath of paths) {
    try {
      await fs.access(path.join(searchPath, name), fsConstants.X_OK);
      return true;
    } catch {
      // Try the next PATH entry.
    }
  }
  return false;
}

async function requireTools(...tools) {
  const missing = [];
  for (const tool of tools) {
    if (!(await executableExists(tool))) {
      missing.push(tool);
    }
  }

  if (missing.length > 0) {
    throw new ExitError(2, `Missing required tools: ${missing.join(" ")}`);
  }
}

function run(command, args) {
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
      resolve({
        code,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      });
    });
  });
}

function printIndented(buffer) {
  const text = buffer.toString("utf8").replace(/\n$/, "");
  if (text === "") {
    return;
  }

  for (const line of text.split("\n")) {
    console.error(`  ${line}`);
  }
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function validateLockFile(lock) {
  const valid = lock !== null &&
    typeof lock === "object" &&
    typeof lock.protocolVersion === "string" &&
    typeof lock.upstreamRepository === "string" &&
    typeof lock.upstreamCommit === "string" &&
    Array.isArray(lock.files) &&
    lock.files.every((file) => file !== null &&
      typeof file === "object" &&
      typeof file.local === "string" &&
      typeof file.upstream === "string");

  if (!valid) {
    throw new ExitError(2, `Invalid lock file shape: ${LOCK_FILE}`);
  }
}

async function loadLockFile() {
  try {
    const lock = await readJson(LOCK_FILE);
    validateLockFile(lock);
    return lock;
  } catch (error) {
    if (error instanceof ExitError) {
      throw error;
    }
    if (error.code === "ENOENT") {
      throw new ExitError(2, `Missing lock file: ${LOCK_FILE}`);
    }
    throw new ExitError(2, `Unable to read lock file: ${LOCK_FILE}`);
  }
}

function encodeRef(ref) {
  return encodeURIComponent(ref);
}

async function resolveRef(lock, ref) {
  const encodedRef = encodeRef(ref);
  const result = await run("gh", ["api", `repos/${lock.upstreamRepository}/commits/${encodedRef}`]);

  if (result.code !== 0) {
    console.error(`Unable to resolve ${lock.upstreamRepository}@${ref} to a commit.`);
    printIndented(result.stderr);
    throw new ExitError(2);
  }

  try {
    const response = JSON.parse(result.stdout.toString("utf8"));
    if (typeof response.sha !== "string" || response.sha === "") {
      throw new Error("Missing sha");
    }
    return response.sha;
  } catch {
    throw new ExitError(2, `Unable to parse resolved commit for ${lock.upstreamRepository}@${ref}.`);
  }
}

async function fetchUpstreamFiles(lock, ref, tempDir) {
  const encodedRef = encodeRef(ref);
  const files = [];
  let fetchFailed = false;
  let checked = 0;

  for (const file of lock.files) {
    checked += 1;
    const upstreamFile = path.join(tempDir, `upstream-${checked}`);
    const endpoint = `repos/${lock.upstreamRepository}/contents/${file.upstream}?ref=${encodedRef}`;
    const result = await run("gh", ["api", "-H", "Accept: application/vnd.github.raw", endpoint]);

    if (result.code !== 0) {
      console.error(`Missing or unreadable upstream file: ${file.upstream} at ${ref}`);
      printIndented(result.stderr);
      fetchFailed = true;
      continue;
    }

    await fs.writeFile(upstreamFile, result.stdout);
    files.push({
      localPath: file.local,
      upstreamPath: file.upstream,
      upstreamFile,
    });
  }

  if (checked === 0) {
    throw new ExitError(2, `No files listed in ${LOCK_FILE}`);
  }

  return {files, fileCount: checked, fetchFailed};
}

async function isFile(file) {
  try {
    return (await fs.stat(file)).isFile();
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function compareFetchedFiles(files, ref) {
  let drift = false;
  let toolError = false;

  for (const file of files) {
    const localFile = path.join(REPO_ROOT, file.localPath);

    if (!(await isFile(localFile))) {
      console.error(`Missing local file: ${file.localPath}`);
      drift = true;
      continue;
    }

    const result = await run("diff", [
      "-u",
      "-L",
      file.localPath,
      "-L",
      `${file.upstreamPath}@${ref}`,
      localFile,
      file.upstreamFile,
    ]);

    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);

    if (result.code === 0) {
      continue;
    }

    if (result.code === 1) {
      drift = true;
      continue;
    }

    console.error(`diff error comparing ${file.localPath} with ${file.upstreamPath}@${ref}`);
    toolError = true;
  }

  if (toolError) {
    console.error("UCP snapshot comparison failed due to tooling errors.");
    throw new ExitError(2);
  }

  return drift;
}

function checkLockCommitChange(lock, resolvedCommit) {
  const currentCommit = lock.upstreamCommit;
  if (currentCommit === resolvedCommit) {
    return false;
  }

  console.log("Would update protocol/source-lock.json upstreamCommit:");
  console.log(`  from: ${currentCommit || "null"}`);
  console.log(`  to:   ${resolvedCommit}`);
  return true;
}

async function updateLockCommit(lock, resolvedCommit) {
  lock.upstreamCommit = resolvedCommit;
  await writeJson(LOCK_FILE, lock);
}

async function filesEqual(localFile, upstreamFile) {
  try {
    const [local, upstream] = await Promise.all([
      fs.readFile(localFile),
      fs.readFile(upstreamFile),
    ]);
    return Buffer.compare(local, upstream) === 0;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function withTempDir(callback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "checkout-kit-ucp-snapshot-"));
  try {
    return await callback(tempDir);
  } finally {
    await fs.rm(tempDir, {recursive: true, force: true});
  }
}

async function runCheck(options) {
  await requireTools("gh", "diff");
  const lock = await loadLockFile();
  const ref = options.ref || lock.upstreamCommit;

  return withTempDir(async (tempDir) => {
    console.log(`Comparing vendored UCP snapshot with ${lock.upstreamRepository}@${ref}`);

    const fetched = await fetchUpstreamFiles(lock, ref, tempDir);
    let drift = fetched.fetchFailed;
    if (await compareFetchedFiles(fetched.files, ref)) {
      drift = true;
    }

    if (drift) {
      console.error(`UCP snapshot drift detected against ${lock.upstreamRepository}@${ref} (${fetched.fileCount} files checked).`);
      return 1;
    }

    console.log(`UCP snapshot matches ${lock.upstreamRepository}@${ref} (${fetched.fileCount} files).`);
    return 0;
  });
}

async function runUpdate(options) {
  await requireTools("gh", "diff");
  const lock = await loadLockFile();

  if (options.ref === "") {
    console.error("Update requires --ref <upstream-ref>.");
    usage(process.stderr);
    return 2;
  }

  return withTempDir(async (tempDir) => {
    const resolvedCommit = await resolveRef(lock, options.ref);

    console.log(`Downloading vendored UCP snapshot from ${lock.upstreamRepository}@${options.ref}`);
    console.log(`Resolved upstream commit: ${resolvedCommit}`);

    const fetched = await fetchUpstreamFiles(lock, options.ref, tempDir);
    if (fetched.fetchFailed) {
      console.error("UCP snapshot update aborted; no local files were changed.");
      return 1;
    }

    if (options.dryRun) {
      let drift = false;
      if (await compareFetchedFiles(fetched.files, options.ref)) {
        drift = true;
      }
      if (checkLockCommitChange(lock, resolvedCommit)) {
        drift = true;
      }

      if (drift) {
        console.error(`UCP snapshot would change for ${lock.upstreamRepository}@${resolvedCommit} (${fetched.fileCount} files checked).`);
        return 1;
      }

      console.log(`UCP snapshot already matches ${lock.upstreamRepository}@${resolvedCommit} (${fetched.fileCount} files).`);
      return 0;
    }

    let updatedFiles = 0;
    for (const file of fetched.files) {
      const localFile = path.join(REPO_ROOT, file.localPath);
      await fs.mkdir(path.dirname(localFile), {recursive: true});

      if (!(await filesEqual(localFile, file.upstreamFile))) {
        await fs.copyFile(file.upstreamFile, localFile);
        console.log(`Updated ${file.localPath}`);
        updatedFiles += 1;
      }
    }

    if (lock.upstreamCommit !== resolvedCommit) {
      await updateLockCommit(lock, resolvedCommit);
      console.log("Updated protocol/source-lock.json upstreamCommit");
    }

    console.log(`UCP snapshot update complete (${updatedFiles} files changed, ${fetched.fileCount} files checked).`);
    return 0;
  });
}

async function runCli(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    usage();
    return 0;
  }

  switch (options.mode) {
    case "check":
      if (options.dryRun) {
        throw new ExitError(2, "--dry-run is only supported for update.");
      }
      return runCheck(options);
    case "update":
      return runUpdate(options);
    default:
      throw new UsageError(`Unknown command: ${options.mode}`);
  }
}

runCli(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    if (error instanceof UsageError) {
      if (error.message !== "") {
        console.error(error.message);
      }
      usage(process.stderr);
      process.exitCode = 2;
      return;
    }

    if (error instanceof ExitError) {
      if (error.message !== "") {
        console.error(error.message);
      }
      process.exitCode = error.code;
      return;
    }

    console.error(error.message);
    process.exitCode = 2;
  });
