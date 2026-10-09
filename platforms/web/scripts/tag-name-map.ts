// API Extractor (vite-plugin-dts `rollupTypes`) drops `declare global` blocks
// from the rolled-up declarations, so custom elements lose their
// `HTMLElementTagNameMap` entries and TypeScript consumers get a plain
// `HTMLElement` from `document.createElement("shopify-checkout")`.
// See https://github.com/microsoft/rushstack/issues/1709.
//
// The build collects every component's tag-name entries from the per-file
// declarations, then appends one augmentation to the rolled-up entry.
import ts from "typescript";

function parse(declarations: string): ts.SourceFile {
  return ts.createSourceFile("declarations.d.ts", declarations, ts.ScriptTarget.Latest, true);
}

/**
 * Returns `tag → class` entries from `declare global { interface HTMLElementTagNameMap }` blocks.
 */
export function collectTagNames(declarations: string): Map<string, string> {
  const tags = new Map<string, string>();
  for (const statement of parse(declarations).statements) {
    if (
      !ts.isModuleDeclaration(statement) ||
      statement.name.text !== "global" ||
      !statement.body ||
      !ts.isModuleBlock(statement.body)
    ) {
      continue;
    }
    for (const declaration of statement.body.statements) {
      if (
        !ts.isInterfaceDeclaration(declaration) ||
        declaration.name.text !== "HTMLElementTagNameMap"
      ) {
        continue;
      }
      for (const member of declaration.members) {
        if (
          !ts.isPropertySignature(member) ||
          !ts.isStringLiteral(member.name) ||
          !member.type ||
          !ts.isTypeReferenceNode(member.type) ||
          !ts.isIdentifier(member.type.typeName) ||
          member.type.typeArguments
        ) {
          throw new Error(
            `Unsupported HTMLElementTagNameMap entry: ${member.getText()}. Use "tag-name": ClassName.`,
          );
        }
        tags.set(member.name.text, member.type.typeName.text);
      }
    }
  }
  return tags;
}

function exportedNames(declarations: string): Set<string> {
  const names = new Set<string>();
  for (const statement of parse(declarations).statements) {
    if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) names.add(element.name.text);
      }
    } else if (
      (ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement)) &&
      statement.name &&
      ts.getModifiers(statement)?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword)
    ) {
      names.add(statement.name.text);
    }
  }
  return names;
}

/**
 * Appends one `HTMLElementTagNameMap` augmentation for `tags` to the rolled-up declarations.
 * Every mapped class must be exported from them, so the augmentation never names a missing type.
 */
export function appendTagNameMap(rolledUp: string, tags: ReadonlyMap<string, string>): string {
  if (tags.size === 0) return rolledUp;
  if (collectTagNames(rolledUp).size > 0) {
    throw new Error("The rolled-up declarations already augment HTMLElementTagNameMap.");
  }
  const exported = exportedNames(rolledUp);
  const missing = [...tags.values()].filter((name) => !exported.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Custom element classes must be exported from the package entry: ${missing.join(", ")}`,
    );
  }
  const sorted = [...tags];
  sorted.sort(([a], [b]) => a.localeCompare(b));
  const entries = sorted.map(([tag, name]) => `    ${JSON.stringify(tag)}: ${name};`);
  return [
    rolledUp.trimEnd(),
    "",
    "declare global {",
    "  interface HTMLElementTagNameMap {",
    ...entries,
    "  }",
    "}",
    "",
  ].join("\n");
}

/** Records tag-name entries from each declaration file; merging conflicting entries fails. */
export function createTagNameCollector() {
  const tags = new Map<string, string>();
  return {
    tags: tags as ReadonlyMap<string, string>,
    add(filePath: string, declarations: string) {
      for (const [tag, name] of collectTagNames(declarations)) {
        const existing = tags.get(tag);
        if (existing !== undefined && existing !== name) {
          throw new Error(`<${tag}> maps to both ${existing} and ${name} (${filePath}).`);
        }
        tags.set(tag, name);
      }
    },
  };
}
