# Rushstack CLI compatibility

The web and React Native workspaces override argparse 1 with argparse 2 to remove `sprintf-js`, which has no patched release for GHSA-hp3w-g68c-fv3c. Argparse 2 provides legacy API aliases, but Rushstack also needs to omit undefined action options and wrap the writable `format_usage` method instead of its read-only legacy alias.

Both workspaces apply the same `@rushstack/ts-command-line` patch and run `scripts/argparse_compatibility.test.cjs` before their unit tests. Remove the patch and override together when upstream supports a dependency chain without vulnerable `sprintf-js`.

React Native also patches the js-yaml 3 CLI to pass its version explicitly to argparse's version action; argparse 2's legacy constructor option loses that value. The shared compatibility suite covers its version flag and stdin conversion.
