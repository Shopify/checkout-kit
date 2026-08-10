package com.shopify.checkoutkit.androiddemo.e2e

import com.shopify.checkoutkit.PreloadState
import com.shopify.checkoutkit.androiddemo.accessibility.AccessibilityIdentifiers

/** Maps whether [PreloadState] is ready to a preload identifier. */
object PreloadStateMarker {
    fun testId(state: PreloadState): String {
        val value = if (state is PreloadState.Ready) "ready" else "not-ready"
        return "${AccessibilityIdentifiers.PRELOAD_STATE_PREFIX}$value"
    }
}
