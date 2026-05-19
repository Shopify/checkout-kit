# Checkout Kit, end-to-end tests

Cross-platform e2e flows driven by [Maestro](https://maestro.mobile.dev).

## Layout

Tests are grouped by the sample app they exercise. Each sample app lives under
[`platforms/<name>/`](../platforms/) and has a matching folder here.

```
e2e/
├── config.yaml                Shared Maestro config (all platforms)
├── swift/                     Targets the Swift sample (iOS only)
├── android/                   Targets the Android sample (Android only)
└── react-native/              Targets the RN sample (cross-platform)
    ├── ios/
    └── android/
```

The Swift sample is iOS-only and the Android sample is Android-only by
construction, so they don't need an inner platform split. The React Native
sample ships to both platforms; its flows are split because some assertions
are platform-specific (iOS accessibility-label patterns vs Android resource
strings).

Folders are created when their first flow lands. Don't pre-create empty
directories.

## Sample-app appIds

Use these in the `appId:` header of every flow. Don't invent new bundle ids.

| Folder                    | appId                                            |
| ------------------------- | ------------------------------------------------ |
| `swift/`                  | `com.shopify.example.MobileBuyIntegration`       |
| `android/`                | `com.shopify.checkout_kit_mobile_buy_integration_sample` |
| `react-native/ios/`       | `com.shopify.example.CheckoutKitReactNative`     |
| `react-native/android/`   | `com.shopify.checkoutkitreactnative`             |

## Running

Each platform's runner script lives next to its sample app. Build and launch
the sample on a simulator/emulator first, then run the script in a second
terminal.

| Platform           | From                            | Command            |
| ------------------ | ------------------------------- | ------------------ |
| React Native, iOS  | `platforms/react-native/`       | `pnpm e2e:ios`     |
| Swift, iOS         | `platforms/swift/`              | `./Scripts/e2e_maestro_ios` |
| Android (native)   | TBD                             | TBD                |
| RN, Android        | `platforms/react-native/`       | `pnpm e2e:android` |

Maestro itself is a system CLI, not an npm dependency. Install once with:

```
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

## Adding a flow

1. Drop a new `<name>.yaml` under the right folder.
2. Set `appId:` from the table above.
3. Keep timeouts in the existing tiers: animation settles ~3s, local in-page
   interactions and optional probes ~5s, sample-app checkout transitions ~15s,
   and cold starts, checkout first-paint, and final submit ~60s.
4. If the flow needs an npm script wrapper, add an `e2e:<platform>` script to
   the matching `package.json` next to existing scripts. The script should
   point at the folder, not an individual file, so the whole folder runs.

## Required sample-app accessibility

Maestro flows rely on testIDs / accessibility labels in the sample apps. When
adding a flow, prefer querying by `id:` (stable, controlled by us) over
`text:` (fragile, depends on storefront copy). If a tappable element doesn't
have an id, add one to the sample first, in a separate commit.
