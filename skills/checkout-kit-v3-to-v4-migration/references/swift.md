# Swift

## Rename

```swift
// LEGACY v3 Checkout Sheet Kit
// import ShopifyCheckoutSheetKit

// v4 Checkout Kit
import ShopifyCheckoutKit
```

```swift
// Package.swift
// LEGACY v3 package product
// .product(name: "ShopifyCheckoutSheetKit", package: "checkout-sheet-kit-swift")

// v4 Checkout Kit
.product(name: "ShopifyCheckoutKit", package: "checkout-kit")
```

## Then check

- `platforms/swift/README.md` for current Swift package setup and presentation API.
- `../checkout-kit-lifecycle-events/SKILL.md` before changing completion, cancel, fail, external-link, or Checkout Protocol handling.
- `../checkout-kit-present-preload-invalidate/SKILL.md` before changing preload or invalidate behavior.
