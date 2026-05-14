# @shopify/checkout-kit

A web component for embedding Shopify checkout in any website.

[![npm latest](https://img.shields.io/npm/v/@shopify/checkout-kit/latest.svg?label=npm)](https://www.npmjs.com/package/@shopify/checkout-kit)

## Install

```bash
npm i @shopify/checkout-kit
```

## Layout

```
platforms/web/
├── src/                    # source — add web component code here
│   └── index.ts            # public API
├── package.json            # the published @shopify/checkout-kit
├── vite.config.ts          # build (lib mode + dts) + vitest config
├── tsconfig.json
├── custom-elements-manifest.config.mjs
└── .oxlintrc.json
```

## Development

```bash
cd platforms/web
pnpm install

pnpm build              # vite + custom-elements-manifest
pnpm dev                # vite build --watch
pnpm test               # vitest with coverage
pnpm test:watch
pnpm lint               # typecheck + oxlint + oxfmt --check
pnpm format             # oxfmt (writes in place)
pnpm verify             # publint

pnpm sample             # serve the playground at http://localhost:5173
pnpm sample:build       # build the playground (sample/dist/)
```

## Tooling

| Concern         | Tool                                         |
| --------------- | -------------------------------------------- |
| Bundler         | Vite (lib mode) + `vite-plugin-dts`          |
| Tests           | Vitest + happy-dom                           |
| Lint            | oxlint                                       |
| Format          | oxfmt                                        |
| Element docs    | `@custom-elements-manifest/analyzer` → `dist/custom-elements.json` |
| Publish hygiene | `publint`                                    |

## License

[MIT](./LICENSE)
