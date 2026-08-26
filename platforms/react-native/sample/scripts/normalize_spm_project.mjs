import {readFileSync, writeFileSync} from 'node:fs';

const projectPath = process.argv[2];
const project = readFileSync(projectPath, 'utf8');
const normalized = project.replace(
  /HERMES_CLI_PATH = "[^"]*\/hermes-compiler\/hermesc\/osx-bin\/hermesc";/g,
  'HERMES_CLI_PATH = "$(SRCROOT)/../../node_modules/hermes-compiler/hermesc/osx-bin/hermesc";',
);

if (normalized !== project) {
  writeFileSync(projectPath, normalized);
}
