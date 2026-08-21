package com.shopify.checkoutkit.androiddemo.e2e

import com.shopify.checkoutkit.PreloadState
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class PreloadStateMarkerTest {
    @Test
    fun `ready marker matches the maestro flow assertion`() {
        assertThat(PreloadStateMarker.testId(PreloadState.Ready)).isEqualTo("preload-state-ready")
    }

    @Test
    fun `non-ready state uses the fallback marker`() {
        assertThat(PreloadStateMarker.testId(PreloadState.Idle)).isEqualTo("preload-state-not-ready")
    }
}
