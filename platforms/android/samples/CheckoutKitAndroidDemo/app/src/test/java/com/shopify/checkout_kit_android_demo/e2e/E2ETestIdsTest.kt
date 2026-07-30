package com.shopify.checkout_kit_android_demo.e2e

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class E2ETestIdsTest {
    @Test
    fun `app ready marker matches the maestro flows`() {
        assertThat(E2ETestIds.APP_READY).isEqualTo("checkout-kit-sample-ready")
    }
}
