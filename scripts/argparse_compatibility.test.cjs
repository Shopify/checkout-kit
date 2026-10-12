const assert = require("node:assert/strict");
const {execFileSync} = require("node:child_process");
const {createRequire} = require("node:module");
const path = require("node:path");
const {test} = require("node:test");

// Resolve the same Rushstack instance used by each workspace's API Extractor.
const workspaceRequire = createRequire(path.resolve("package.json"));
const consumer = workspaceRequire("./package.json").name === "@shopify/checkout-kit"
  ? "vite-plugin-dts"
  : "./modules/@shopify/checkout-kit-react-native/package.json";
const consumerRequire = createRequire(workspaceRequire.resolve(consumer));
const extractorRequire = createRequire(consumerRequire.resolve("@microsoft/api-extractor"));
const {CommandLineAction, CommandLineParser} = extractorRequire("@rushstack/ts-command-line");

function fixture() {
  class RunAction extends CommandLineAction {
    async onExecuteAsync() {}
  }
  const parser = new CommandLineParser({
    toolFilename: "compatibility-check",
    toolDescription: "Synthetic CLI compatibility check",
  });
  const action = new RunAction({actionName: "run", summary: "Run", documentation: "Run a check"});
  const enabled = action.defineFlagParameter({parameterLongName: "--enabled", description: "Enable"});
  const label = action.defineStringParameter({parameterLongName: "--label", argumentName: "LABEL", description: "Label"});
  const count = action.defineIntegerParameter({parameterLongName: "--count", argumentName: "COUNT", description: "Count"});
  const tags = action.defineStringListParameter({parameterLongName: "--tag", argumentName: "TAG", description: "Tag"});
  parser.addAction(action);
  return {parser, action, enabled, label, count, tags};
}

test("Rushstack parses flags, values and repeated options with argparse 2", async () => {
  const {parser, action, enabled, label, count, tags} = fixture();
  await parser.executeWithoutErrorHandlingAsync([
    "run", "--enabled", "--label", "synthetic", "--count", "3", "--tag", "a", "--tag", "b",
  ]);
  assert.equal(parser.selectedAction, action);
  assert.equal(enabled.value, true);
  assert.equal(label.value, "synthetic");
  assert.equal(count.value, 3);
  assert.deepEqual(tags.values, ["a", "b"]);
  assert.match(action.renderHelpText(), /--enabled/);
  assert.match(action.renderUsageText(), /--label LABEL/);
});

test("Rushstack preserves defaults for omitted optional arguments", async () => {
  const {parser, enabled, label, count, tags} = fixture();
  await parser.executeWithoutErrorHandlingAsync(["run"]);
  assert.equal(enabled.value, false);
  assert.equal(label.value, undefined);
  assert.equal(count.value, undefined);
  assert.deepEqual(tags.values, []);
});

test("Rushstack rejects invalid arguments through its parser exit handler", async () => {
  const {parser} = fixture();
  await assert.rejects(parser.executeWithoutErrorHandlingAsync(["run", "--count", "invalid"]), (error) => {
    assert.equal(error.exitCode, 2);
    assert.match(error.message, /invalid 'int' value/);
    return true;
  });
});

if (workspaceRequire("./package.json").name !== "@shopify/checkout-kit") {
  const nycRequire = createRequire(workspaceRequire.resolve("@istanbuljs/load-nyc-config"));
  const yamlPackage = nycRequire.resolve("js-yaml/package.json");
  const yamlCLI = path.join(path.dirname(yamlPackage), "bin/js-yaml.js");

  test("js-yaml 3 CLI retains its version flag with argparse 2", () => {
    const output = execFileSync(process.execPath, [yamlCLI, "--version"], {encoding: "utf8"});
    assert.equal(output.trim(), nycRequire("js-yaml/package.json").version);
  });

  test("js-yaml 3 CLI still converts YAML from stdin", () => {
    const output = execFileSync(process.execPath, [yamlCLI, "--compact"], {
      input: "name: synthetic\nenabled: true\n",
      encoding: "utf8",
    });
    assert.deepEqual(JSON.parse(output), {name: "synthetic", enabled: true});
  });
}
