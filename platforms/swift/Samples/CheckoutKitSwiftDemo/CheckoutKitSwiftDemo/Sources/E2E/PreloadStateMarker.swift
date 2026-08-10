import ShopifyCheckoutKit

/// Maps whether ``PreloadState`` is ready to a preload identifier.
enum PreloadStateMarker {
    static func testId(for state: PreloadState) -> String {
        let value = if case .ready = state { "ready" } else { "not-ready" }
        return "\(AccessibilityIdentifiers.preloadStatePrefix)\(value)"
    }
}
