import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const runtimeDependencyFields = ["dependencies", "optionalDependencies", "peerDependencies"];
const workspacePackagePrefix = "@shopify/checkout-kit-";

function packageFilesIn(directory) {
  const path = new URL(`../${directory}/`, import.meta.url);
  if (!existsSync(path)) return [];

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const packageFile = join(path.pathname, entry.name, "package.json");
    return existsSync(packageFile) ? [packageFile] : [];
  });
}

const packageFiles = [
  new URL("../package.json", import.meta.url).pathname,
  ...packageFilesIn("components"),
  ...packageFilesIn("internal"),
];

const violations = [];
for (const packageFile of packageFiles) {
  const packageJson = JSON.parse(readFileSync(packageFile, "utf8"));
  for (const field of runtimeDependencyFields) {
    for (const [name, version] of Object.entries(packageJson[field] ?? {})) {
      if (name.startsWith(workspacePackagePrefix) && version === "workspace:*") continue;
      violations.push(`${packageJson.name}: ${field}.${name}@${version}`);
    }
  }
}

if (violations.length > 0) {
  throw new Error(
    [
      "The shipped Web SDK has no third-party runtime dependencies.",
      "Runtime dependencies must be Checkout Kit workspace packages so the NPM and CDN artifacts have one owned dependency graph.",
      "If this needs to change, add an explicit product-level dependency policy and integration coverage before allowing it.",
      "",
      ...violations.map((violation) => `- ${violation}`),
    ].join("\n"),
  );
}
