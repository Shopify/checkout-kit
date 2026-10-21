# Core composition

`@shopify/checkout-kit-core` is one private workspace package. Its
[manifest](package.json) lists its dependencies and explicit exports, grouped by
module. Each module owns its source and tests in a separate directory; there is
no root barrel combining modules.

| Module   | Source          | Import boundary                                                 | Dependencies                               |
| -------- | --------------- | --------------------------------------------------------------- | ------------------------------------------ |
| Checkout | `checkout/src/` | `@shopify/checkout-kit-core/checkout` and its declared subpaths | Protocol and telemetry workspace packages. |

Checkout owns browser capabilities, presentation, common checkout models, error
mapping and helpers. Components own their protocol handling, lifecycle events,
state, and aggregation.

Add future modules beside `checkout`, give each an explicit export group, and
record its dependencies in this inventory and the core manifest. Imports between
modules must use declared core subpaths; relative imports stay within a module.
Dependency-cruiser enforces these boundaries so modules can become separate
packages without untangling source imports.

## Moving a module out of core

To promote checkout to an independent package at `internal/checkout`:

1. Move the entire `checkout` directory up one level.
2. Add its own private manifest with a role-based package name. Transfer the
   checkout export group and its dependencies from the core manifest, retaining
   dependencies still used by other core modules.
3. Update consumers to the new package and its declared subpaths. If consumers
   need a transition, retain the core subpaths as explicit re-exports.
4. Refresh workspace links and the lockfile with `pnpm install`, then update this
   inventory and the [internal package inventory](../README.md).

Workspace discovery, source checks and package boundary rules already support
`internal/checkout`. Extraction does not require changes inside checkout or
introduce an independent release.

Protocol implementations can pass their fixed method allowlist to `createTelemetry`
and `telemetryProtocolMethod`. Each client copies its allowlist; other method
labels remain `unknown`. Never derive the allowlist from received messages.
