import fs from "node:fs/promises";
import path from "node:path";

const EXPECTED_CONSTRAINT_MODEL_NAMES = [
  "ConstraintExpression",
  "ConstraintProperty",
];
const ACCIDENTAL_CONSTRAINT_MODEL_NAMES = ["ConstraintsElement", "PropertyValue"];

export function assertSemanticConstraintModelNames(source, output) {
  const present = (name) => new RegExp(`\\b${name}\\b`).test(source);
  const missing = EXPECTED_CONSTRAINT_MODEL_NAMES.filter((name) => !present(name));
  const accidental = ACCIDENTAL_CONSTRAINT_MODEL_NAMES.filter(present);

  if (missing.length === 0 && accidental.length === 0) {
    return;
  }

  const details = [];
  if (missing.length > 0) {
    details.push(`missing semantic names: ${missing.join(", ")}`);
  }
  if (accidental.length > 0) {
    details.push(`accidental quicktype names returned: ${accidental.join(", ")}`);
  }
  throw new Error(`Constraint model naming invariant failed in ${output} (${details.join("; ")})`);
}

async function listDeclarationFiles(directory) {
  const entries = await fs.readdir(directory, {withFileTypes: true});
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listDeclarationFiles(entryPath);
      }
      return entry.isFile() && entry.name.endsWith(".d.ts") ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

export async function removeUnreferencedInternalDeclaration({
  declarationDir,
  internalDeclaration,
  symbol,
}) {
  const internalPath = path.resolve(internalDeclaration);
  const declarationFiles = await listDeclarationFiles(declarationDir);

  if (!declarationFiles.some((file) => path.resolve(file) === internalPath)) {
    throw new Error(
      `Expected TypeScript to emit internal declaration ${internalPath}; no file was removed`,
    );
  }

  const referencePattern = new RegExp(`\\b${symbol}\\b`);
  const referencingFiles = [];
  for (const declarationFile of declarationFiles) {
    if (path.resolve(declarationFile) === internalPath) {
      continue;
    }
    const source = await fs.readFile(declarationFile, "utf8");
    if (referencePattern.test(source)) {
      referencingFiles.push(path.relative(declarationDir, declarationFile));
    }
  }

  if (referencingFiles.length > 0) {
    throw new Error(
      `Refusing to remove ${path.basename(internalPath)} because public declarations reference ${symbol}:\n` +
      `${referencingFiles.sort().join("\n")}\n` +
      "The internal declaration was retained for diagnosis; remove the public reference before regenerating.",
    );
  }

  await fs.rm(internalPath);
}
