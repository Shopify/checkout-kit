// Custom Elements Manifest analyzer config.
// Produces `dist/custom-elements.json`, which IDEs (VS Code, JetBrains) and
// Storybook consume to provide HTML attribute autocompletion and docs.
//
// Docs: https://custom-elements-manifest.open-wc.org/analyzer/getting-started/
export default {
  globs: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts'],
  outdir: 'dist',
  packagejson: true,
};
