import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {afterEach, describe, expect, test} from "vitest";

import {
  assertSemanticConstraintModelNames,
  removeUnreferencedInternalDeclaration,
} from "./codegen_guards.mjs";

const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((directory) =>
      fs.rm(directory, {recursive: true, force: true}),
    ),
  );
});

async function makeDeclarationDir() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "checkout-kit-codegen-guard-"));
  tempDirs.push(directory);
  const generatedDir = path.join(directory, "generated");
  await fs.mkdir(generatedDir);
  const internalDeclaration = path.join(generatedDir, "ProtocolRenameMap.d.ts");
  await fs.writeFile(internalDeclaration, "export declare const renameMap: unknown;\n");
  return {directory, internalDeclaration};
}

describe("constraint model name guard", () => {
  test("accepts the semantic recursive constraint names", () => {
    expect(() =>
      assertSemanticConstraintModelNames(
        "export interface ConstraintExpression { properties?: Record<string, ConstraintProperty> }",
        "Models.ts",
      ),
    ).not.toThrow();
  });

  test("rejects missing or accidental quicktype names", () => {
    expect(() =>
      assertSemanticConstraintModelNames(
        "export interface ConstraintsElement { properties?: Record<string, PropertyValue> }",
        "Models.ts",
      ),
    ).toThrow(
      /missing semantic names: ConstraintExpression, ConstraintProperty.*accidental quicktype names returned: ConstraintsElement, PropertyValue/,
    );
  });
});

describe("internal TypeScript declaration guard", () => {
  test("removes an unreferenced internal declaration", async () => {
    const {directory, internalDeclaration} = await makeDeclarationDir();
    await fs.writeFile(
      path.join(directory, "index.d.ts"),
      "export interface PublicModel {}\n",
    );

    await removeUnreferencedInternalDeclaration({
      declarationDir: directory,
      internalDeclaration,
      symbol: "ProtocolRenameMap",
    });

    await expect(fs.access(internalDeclaration)).rejects.toThrow();
  });

  test("fails loudly and retains a referenced internal declaration", async () => {
    const {directory, internalDeclaration} = await makeDeclarationDir();
    await fs.writeFile(
      path.join(directory, "index.d.ts"),
      'export type PublicModel = import("./generated/ProtocolRenameMap").RenameEntry;\n',
    );

    await expect(
      removeUnreferencedInternalDeclaration({
        declarationDir: directory,
        internalDeclaration,
        symbol: "ProtocolRenameMap",
      }),
    ).rejects.toThrow(
      /Refusing to remove ProtocolRenameMap\.d\.ts.*index\.d\.ts.*retained for diagnosis/s,
    );
    await expect(fs.readFile(internalDeclaration, "utf8")).resolves.toContain(
      "renameMap",
    );
  });
});
