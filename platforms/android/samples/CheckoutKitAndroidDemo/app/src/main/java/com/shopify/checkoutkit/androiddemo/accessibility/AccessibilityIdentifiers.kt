package com.shopify.checkoutkit.androiddemo.accessibility

object AccessibilityIdentifiers {
    const val APP_READY = "checkout-kit-sample-ready"
    const val PRELOAD_STATE_PREFIX = "preload-state-"
    const val PRELOAD_CACHE_HIT_PREFIX = "preload-cache-hit-"
    const val PRELOAD_WHEN_HELD_PREFIX = "preload-when-held-"

    object Cart {
        const val CHECKOUT_READY = "cart-checkout-ready"
        const val CHECKOUT_BUTTON = "checkout-button"
        const val EMPTY_MESSAGE = "cart-empty-message"
    }

    object Tabs {
        const val CART = "cart-tab"
    }
}
