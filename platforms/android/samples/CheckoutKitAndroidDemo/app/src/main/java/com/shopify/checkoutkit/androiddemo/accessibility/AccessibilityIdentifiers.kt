package com.shopify.checkoutkit.androiddemo.accessibility

object AccessibilityIdentifiers {
    const val APP_READY = "checkout-kit-sample-ready"
    const val PRELOAD_STATE_PREFIX = "preload-state-"
    const val PRELOAD_CACHE_HIT_PREFIX = "preload-cache-hit-"

    object Cart {
        const val CHECKOUT_READY = "cart-checkout-ready"
        const val CHECKOUT_BUTTON = "checkout-button"
        const val EMPTY_MESSAGE = "cart-empty-message"
    }

    object Tabs {
        const val CART = "cart-tab"
        const val SETTINGS = "settings-tab"
    }

    object Settings {
        const val CHECKOUT_PRELOADING_TOGGLE = "checkout-preloading-toggle"
    }
}
