package com.shopify.checkoutkit.checkout

/** Version metadata for the Checkout Kit library. */
public object ShopifyCheckoutKit {
    /** The current version of Checkout Kit. */
    public const val VERSION: String = BuildConfig.SDK_VERSION
}

/**
 * A handle to a presented checkout. Use [dismiss] to dismiss the checkout programmatically.
 */
public fun interface CheckoutHandle {
    /**
     * Dismisses the presented checkout.
     */
    public fun dismiss()
}
