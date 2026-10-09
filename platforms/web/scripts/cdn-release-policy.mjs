import { appendFileSync, readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const major = version.split(".")[0];
if (!/^(0|[1-9][0-9]*)$/.test(major)) {
  throw new Error(`Package version '${version}' does not have a numeric SemVer major.`);
}
const isPrerelease = version.split("+")[0].includes("-");
// npm channel overrides must not promote prereleases to the evergreen CDN URL.
const stable =
  !isPrerelease && process.env.PRERELEASE !== "true" && process.env.DIST_TAG === "latest";
const channel = stable ? "stable" : "unstable";
const prefix = stable ? `v${major}` : `v${major}/unstable`;

appendFileSync(process.env.GITHUB_OUTPUT, `channel=${channel}\nprefix=${prefix}\n`);
process.stdout.write(
  `::notice::Version '${version}' selects the ${channel} CDN URL: /checkout-kit/${prefix}/web-components.js\n`,
);
