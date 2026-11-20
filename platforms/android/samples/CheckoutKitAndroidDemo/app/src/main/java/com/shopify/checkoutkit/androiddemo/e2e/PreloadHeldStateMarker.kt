package com.shopify.checkoutkit.androiddemo.e2e

import com.shopify.checkoutkit.androiddemo.accessibility.AccessibilityIdentifiers
import com.shopify.checkoutkit.checkout.PreloadState

/**
 * Maps the preload state when the SDK held it for a presented checkout, and the state now, to an
 * identifier.
 *
 * A presented checkout reports its preload's idle state when it is dismissed. The first value
 * reads the handle when the SDK held that state; the second reads it after.
 */
object PreloadHeldStateMarker {
    /** Before the SDK holds a state. */
    const val NONE = "none"

    /** The diagnostic arrived after dismissal, so it cannot show the state during checkout. */
    const val LATE = "late"

    fun testId(whenHeld: String, now: PreloadState): String =
        "${AccessibilityIdentifiers.PRELOAD_WHEN_HELD_PREFIX}$whenHeld-now-${value(now)}"

    fun value(state: PreloadState): String = if (state is PreloadState.Ready) "ready" else "not-ready"
}
