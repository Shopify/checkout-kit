enum AccessibilityIdentifiers {
    static let appReady = "checkout-kit-sample-ready"
    static let preloadStatePrefix = "preload-state-"
    static let preloadCacheHitPrefix = "preload-cache-hit-"

    enum Cart {
        static let checkoutReady = "cart-checkout-ready"
        static let checkoutButton = "checkout-button"
        static let emptyMessage = "cart-empty-message"
    }

    enum Tabs {
        static let cart = "cart-tab"
        static let settings = "settings-tab"
    }

    enum Settings {
        static let checkoutPreloadingToggle = "checkout-preloading-toggle"
    }
}
