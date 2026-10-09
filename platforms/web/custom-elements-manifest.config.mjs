// Custom Elements Manifest analyzer config.
// Produces `dist/custom-elements.json`, which IDEs (VS Code, JetBrains) and
// Storybook consume to provide HTML attribute autocompletion and docs.
//
// Docs: https://custom-elements-manifest.open-wc.org/analyzer/getting-started/

// Each component's `register.ts` defines its element through the class's static
// `register()` rather than a literal `customElements.define()` call, which the
// analyzer can't follow. Re-create the definition export from the component's
// `@tagname`, so tools still map the tag to its class.
function componentDefinitions() {
  return {
    name: 'checkout-kit:component-definitions',
    packageLinkPhase({customElementsManifest}) {
      const {modules} = customElementsManifest;
      for (const module of modules) {
        const component = module.path.match(/^src\/components\/([^/]+)\/register\.ts$/)?.[1];
        if (!component) continue;
        const path = `src/components/${component}/${component}.ts`;
        const element = modules
          .find((candidate) => candidate.path === path)
          ?.declarations?.find((declaration) => declaration.customElement && declaration.tagName);
        if (!element) {
          throw new Error(`${module.path}: expected a custom element class with @tagname in ${path}`);
        }
        module.exports = [
          ...(module.exports ?? []).filter(({kind}) => kind !== 'custom-element-definition'),
          {
            kind: 'custom-element-definition',
            name: element.tagName,
            declaration: {name: element.name, module: `/${path.replace(/\.ts$/, '')}`},
          },
        ];
      }
      // TypeScript `this` parameters are type annotations, not arguments.
      for (const module of modules) {
        for (const declaration of module.declarations ?? []) {
          for (const member of declaration.members ?? []) {
            if (member.parameters) {
              member.parameters = member.parameters.filter(({name}) => name !== 'this');
            }
          }
        }
      }
    },
  };
}

export default {
  globs: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts'],
  outdir: 'dist',
  packagejson: true,
  plugins: [componentDefinitions()],
};
