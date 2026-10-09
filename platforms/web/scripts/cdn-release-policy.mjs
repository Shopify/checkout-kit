import { appendFileSync, readFileSync } from "node:fs";

import semver from "semver";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const parsed = semver.parse(version);
if (parsed === null) {
  throw new Error(`Package version '${version}' is not valid SemVer.`);
}
const isPrerelease = parsed.prerelease.length > 0;
// npm channel overrides must not promote prereleases to the evergreen CDN URL.
const stable =
  !isPrerelease && process.env.PRERELEASE !== "true" && process.env.DIST_TAG === "latest";
const channel = stable ? "stable" : "unstable";
const prefix = stable ? `v${parsed.major}` : `v${parsed.major}/unstable`;

appendFileSync(process.env.GITHUB_OUTPUT, `channel=${channel}\nprefix=${prefix}\n`);
process.stdout.write(
  `::notice::Version '${version}' selects the ${channel} CDN URL: /checkout-kit/${prefix}/web-components.js\n`,
);
