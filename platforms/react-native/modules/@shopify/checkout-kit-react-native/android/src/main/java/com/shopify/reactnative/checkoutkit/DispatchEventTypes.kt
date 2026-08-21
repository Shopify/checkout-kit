package com.shopify.reactnative.checkoutkit

/**
 * Canonical list of SDK lifecycle event types emitted by the per-[ShopifyCheckoutKitModule.present]
 * dispatcher.
 *
 * Mirrors `SDK_LIFECYCLE_EVENT_TYPES` in the JS package and `DispatchEventType` on iOS. Exposed to
 * JS via `getTypedExportedConstants()` so the JS layer can verify the two sides agree at
 * construction time.
 */
object DispatchEventTypes {
    const val CLOSE: String = "close"
    const val FAIL: String = "fail"
    const val GEOLOCATION_REQUEST: String = "geolocationRequest"

    @JvmField
    val ALL: List<String> = listOf(CLOSE, FAIL, GEOLOCATION_REQUEST)
}
