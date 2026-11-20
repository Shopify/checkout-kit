package com.shopify.checkoutkit.androiddemo.e2e

import com.shopify.checkoutkit.checkout.PreloadState
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class PreloadHeldStateMarkerTest {
    @Test
    fun `marker before the sdk holds a state`() {
        assertThat(PreloadHeldStateMarker.testId(PreloadHeldStateMarker.NONE, PreloadState.Ready))
            .isEqualTo("preload-when-held-none-now-ready")
    }

    @Test
    fun `marker matches the maestro flow assertion`() {
        assertThat(
            PreloadHeldStateMarker.testId(
                whenHeld = PreloadHeldStateMarker.value(PreloadState.Ready),
                now = PreloadState.Idle(PreloadState.IdleReason.Invalidated),
            )
        ).isEqualTo("preload-when-held-ready-now-not-ready")
    }
}
