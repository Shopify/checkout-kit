package com.shopify.checkoutkit.androiddemo.e2e

import com.shopify.checkoutkit.PreloadState

/**
 * Maps [PreloadState] to the dynamic test ID the cart screen exposes for the
 * Maestro preload flows, e.g. `preload-state-ready`.
 *
 * The ID is invisible automation metadata, never rendered UI — the same seam
 * style as [E2ETestIds.APP_READY]. The Swift sample exposes identical IDs, so
 * shared flow files work on both platforms. Do not change a value without
 * updating the flows and the Swift mapping.
 */
object PreloadStateMarker {
    fun testId(state: PreloadState): String = "${E2ETestIds.PRELOAD_STATE_PREFIX}${text(state)}"

    fun text(state: PreloadState): String = when (state) {
        is PreloadState.Idle -> "idle"
        is PreloadState.Loading -> "loading"
        is PreloadState.Ready -> "ready"
        is PreloadState.Expired -> "expired"
        is PreloadState.Failed -> failedText(state.reason)
    }

    private fun failedText(reason: PreloadState.FailureReason): String = when (reason) {
        is PreloadState.FailureReason.HttpError -> "failed-http-${reason.statusCode}"
        is PreloadState.FailureReason.NavigationFailed -> "failed-navigation"
        is PreloadState.FailureReason.WebContentProcessTerminated -> "failed-web-process"
        is PreloadState.FailureReason.ProtocolError -> "failed-protocol"
    }
}
