# Internal packages

Internal packages are private workspace packages assembled into the Web umbrella.
Their package names describe their role; privacy is declared by `private: true`
in each manifest and does not appear in import paths.

| Location    | Package                           | Responsibility                                                         |
| ----------- | --------------------------------- | ---------------------------------------------------------------------- |
| `core`      | `@shopify/checkout-kit-core`      | Foundational modules exposed through explicit, module-scoped subpaths. |
| `telemetry` | `@shopify/checkout-kit-telemetry` | Telemetry client and transport, with its own test project.             |

[Core](core/README.md) owns one manifest. Its checkout module lives in
`core/checkout` and exposes `@shopify/checkout-kit-core/checkout` subpaths.
Components and internal packages import one another through declared package
exports. Dependency-cruiser rejects relative imports across packages or core
modules, runtime cycles, and dependencies from internals into components or the
public umbrella.

Workspace discovery supports `internal/*`. Platform source checks discover
`internal/**/src`; telemetry retains its existing formatting and test ownership.
Use workspace links and package exports instead of TypeScript path aliases.

When adding a package, update this inventory and declare its dependencies in its
manifest. Keep lifecycle and protocol state belonging to a component there.
