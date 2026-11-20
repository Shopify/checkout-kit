// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./check-api.mjs", import.meta.url));
const declaration = `export declare class Checkout {
  static register(): void;
  get src(): string;
  set src(value: string | undefined);
  open(): void;
}
export type State = "open" | "closed";
`;

describe("approved public API", () => {
  const fixtures: string[] = [];
  afterEach(async () => {
    await Promise.all(fixtures.splice(0).map((path) => rm(path, { recursive: true, force: true })));
  });

  async function fixture() {
    const root = await mkdtemp(join(tmpdir(), "web-api-test-"));
    fixtures.push(root);
    await mkdir(join(root, "dist"));
    await mkdir(join(root, "api"));
    const exports = { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } };
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ name: "@example/checkout", exports }),
    );
    await writeFile(join(root, "api/exports.json"), `${JSON.stringify(exports, null, 2)}\n`);
    await writeFile(join(root, "api/index.d.ts"), declaration);
    await writeFile(join(root, "dist/index.d.ts"), declaration);
    return root;
  }

  function check(root: string) {
    return spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  }

  it("accepts identical declarations without rewriting the approved files", async () => {
    const root = await fixture();
    expect(check(root).status).toBe(0);
    expect(await readFile(join(root, "api/index.d.ts"), "utf8")).toBe(declaration);
    expect(await readdir(join(root, "api"))).toEqual(["exports.json", "index.d.ts"]);
  });

  it.each([
    ["type-only export", `${declaration}export interface NewOptions { enabled: boolean; }\n`],
    [
      "instance member",
      declaration.replace("  open(): void;", "  open(): void;\n  reset(): void;"),
    ],
    [
      "static member",
      declaration.replace("static register(): void", "static register(name: string): void"),
    ],
    ["setter input", declaration.replace("value: string | undefined", "value: string")],
    ["return type", declaration.replace("open(): void", "open(): Promise<void>")],
    ["removed member", declaration.replace("  open(): void;\n", "")],
  ])("rejects a changed %s and leaves the baseline untouched", async (_name, proposed) => {
    const root = await fixture();
    await writeFile(join(root, "dist/index.d.ts"), proposed);
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--- approved/index.d.ts");
    expect(result.stderr).toContain("+++ proposed/index.d.ts");
    expect(await readFile(join(root, "build/api/index.d.ts"), "utf8")).toBe(proposed);
    expect(await readFile(join(root, "api/index.d.ts"), "utf8")).toBe(declaration);
    const report = JSON.parse(await readFile(join(root, "build/api-report.json"), "utf8"));
    expect(report.changes).toEqual([
      expect.objectContaining({ path: "index.d.ts", status: "changed" }),
    ]);
  });

  it("checks the full declaration set, including re-exported files and removed entries", async () => {
    const root = await fixture();
    await mkdir(join(root, "dist/chunks"));
    await writeFile(join(root, "dist/chunks/types.d.ts"), "export interface Extra {}\n");
    await writeFile(join(root, "api/removed.d.ts"), "export declare function old(): void;\n");
    expect(check(root).status).toBe(1);
    const report = JSON.parse(await readFile(join(root, "build/api-report.json"), "utf8"));
    expect(
      report.changes.map(({ path, status }: { path: string; status: string }) => ({
        path,
        status,
      })),
    ).toEqual([
      { path: "chunks/types.d.ts", status: "added" },
      { path: "removed.d.ts", status: "removed" },
    ]);
  });

  it("rejects a new import path even when its declaration already exists", async () => {
    const root = await fixture();
    const path = join(root, "package.json");
    const manifest = JSON.parse(await readFile(path, "utf8"));
    manifest.exports["./extra"] = manifest.exports["."];
    await writeFile(path, JSON.stringify(manifest));
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('+  "./extra":');
  });

  it("ignores line endings and bundler markers while preserving documentation", async () => {
    const root = await fixture();
    await writeFile(
      join(root, "dist/index.d.ts"),
      `//#region src/index.d.ts\n${declaration}//#endregion\n//# sourceMappingURL=index.d.ts.map\n`.replace(
        /\n/g,
        "\r\n",
      ),
    );
    expect(check(root).status).toBe(0);
    await writeFile(join(root, "dist/index.d.ts"), `/** New documentation. */\n${declaration}`);
    expect(check(root).status).toBe(1);
  });

  it("replaces a stale failure report after the implementation is corrected", async () => {
    const root = await fixture();
    await writeFile(join(root, "dist/extra.d.ts"), "export type Extra = string;\n");
    expect(check(root).status).toBe(1);
    await rm(join(root, "dist/extra.d.ts"));
    expect(check(root).status).toBe(0);
    expect(await readdir(join(root, "build/api"))).toEqual(["exports.json", "index.d.ts"]);
    const report = JSON.parse(await readFile(join(root, "build/api-report.json"), "utf8"));
    expect(report.changes).toEqual([]);
  });

  it("does not strip marker-like text from literal types", async () => {
    const root = await fixture();
    await writeFile(join(root, "api/index.d.ts"), "export type Label = `\n//#region old\n`;\n");
    await writeFile(join(root, "dist/index.d.ts"), "export type Label = `\n//#region new\n`;\n");
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("+//#region new");
  });

  it("fails without build output and removes stale reports", async () => {
    const root = await fixture();
    execFileSync(process.execPath, [script], { cwd: root });
    await rm(join(root, "dist"), { recursive: true });
    expect(check(root).status).toBe(1);
    await expect(readFile(join(root, "build/api-report.json"))).rejects.toThrow("ENOENT");
  });

  it("cannot accept a baseline through a command-line update flag", async () => {
    const root = await fixture();
    const result = spawnSync(process.execPath, [script, "--update"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(await readFile(join(root, "api/index.d.ts"), "utf8")).toBe(declaration);
  });

  it("ties CI reports to the PR head and base rather than the merge commit", async () => {
    const root = await fixture();
    const event = join(root, "event.json");
    await writeFile(
      event,
      JSON.stringify({
        pull_request: { number: 42, head: { sha: "pr-head" }, base: { sha: "pr-base" } },
      }),
    );
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_EVENT_PATH: event,
        GITHUB_SHA: "merge-commit",
        GITHUB_RUN_ID: "100",
        GITHUB_RUN_ATTEMPT: "2",
      },
    });
    expect(result.status).toBe(0);
    const report = JSON.parse(await readFile(join(root, "build/api-report.json"), "utf8"));
    expect(report).toMatchObject({
      version: 1,
      pr: 42,
      headSha: "pr-head",
      baseSha: "pr-base",
      runId: 100,
      runAttempt: 2,
      changes: [],
    });
  });
});
