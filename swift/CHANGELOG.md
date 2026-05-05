# Changelog

## Unreleased

### Breaking changes — rename "Checkout Sheet Kit" → "Checkout Kit"

The package, module, podspec, and types have been renamed from `ShopifyCheckoutSheetKit` to `ShopifyCheckoutKit`. Consumers must update their imports, `Package.swift` / `Podfile` references, and the `Localizable.xcstrings` key noted below.

- Swift package / library / module: `ShopifyCheckoutSheetKit` → `ShopifyCheckoutKit`
- CocoaPods: `pod "ShopifyCheckoutSheetKit"` → `pod "ShopifyCheckoutKit"`
- Module import: `import ShopifyCheckoutSheetKit` → `import ShopifyCheckoutKit`
- Repository moved: `github.com/Shopify/checkout-sheet-kit-swift` → `github.com/Shopify/checkout-kit`
- Localization key: `shopify_checkout_sheet_title` → `shopify_checkout_kit_title`. Apps that supply a custom translation for this key must rename the key in their `Localizable.xcstrings` / `Localizable.strings`, otherwise the kit will fall back to its bundled "Checkout" value.
- OSLog subsystem: `com.shopify.checkoutsheetkit` → `com.shopify.checkoutkit`. External log filters / pipelines that subscribe to the old subsystem must be updated.
