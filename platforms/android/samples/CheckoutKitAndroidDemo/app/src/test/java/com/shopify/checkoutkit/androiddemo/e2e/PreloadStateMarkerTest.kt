package com.shopify.checkoutkit.androiddemo.e2e

import com.shopify.checkoutkit.PreloadState
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class PreloadStateMarkerTest {
    @Test
    fun `lifecycle marker texts match the maestro flow assertions`() {
        assertThat(PreloadStateMarker.text(PreloadState.Idle)).isEqualTo("idle")
        assertThat(PreloadStateMarker.text(PreloadState.Loading)).isEqualTo("loading")
        assertThat(PreloadStateMarker.text(PreloadState.Ready)).isEqualTo("ready")
        assertThat(PreloadStateMarker.text(PreloadState.Expired)).isEqualTo("expired")
    }

    @Test
    fun `http failure marker text includes the status code`() {
        assertThat(markerFor(PreloadState.FailureReason.HttpError(statusCode = 403)))
            .isEqualTo("failed-http-403")
        assertThat(markerFor(PreloadState.FailureReason.HttpError(statusCode = 500)))
            .isEqualTo("failed-http-500")
    }

    @Test
    fun `non-http failure marker texts`() {
        assertThat(markerFor(PreloadState.FailureReason.NavigationFailed)).isEqualTo("failed-navigation")
        assertThat(markerFor(PreloadState.FailureReason.WebContentProcessTerminated))
            .isEqualTo("failed-web-process")
        assertThat(markerFor(PreloadState.FailureReason.ProtocolError)).isEqualTo("failed-protocol")
    }

    @Test
    fun `dynamic test ids match the maestro flow assertions`() {
        assertThat(PreloadStateMarker.testId(PreloadState.Idle)).isEqualTo("preload-state-idle")
        assertThat(PreloadStateMarker.testId(PreloadState.Ready)).isEqualTo("preload-state-ready")
        assertThat(
            PreloadStateMarker.testId(PreloadState.Failed(PreloadState.FailureReason.HttpError(statusCode = 403)))
        ).isEqualTo("preload-state-failed-http-403")
    }

    private fun markerFor(reason: PreloadState.FailureReason): String =
        PreloadStateMarker.text(PreloadState.Failed(reason))
}
