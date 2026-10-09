package com.shopify.reactnative.checkoutkit

import com.shopify.checkoutkit.LogLevel
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ShopifyCheckoutKitModuleTest {
    @Test
    fun `logLevelFor accepts every level the native SDK supports`() {
        LogLevel.entries.forEach { logLevel ->
            val name = logLevel.name.lowercase()

            assertThat(ShopifyCheckoutKitModule.logLevelFor(name)).isEqualTo(logLevel)
        }
    }

    @Test
    fun `logLevelStringFor reports every level the native SDK supports`() {
        LogLevel.entries.forEach { logLevel ->
            val name = ShopifyCheckoutKitModule.logLevelStringFor(logLevel)

            assertThat(name).isEqualTo(logLevel.name.lowercase())
        }
    }

    @Test
    fun `logLevelFor accepts a mixed case name`() {
        assertThat(ShopifyCheckoutKitModule.logLevelFor("Warn")).isEqualTo(LogLevel.WARN)
    }

    @Test
    fun `logLevelFor returns null for an unknown name`() {
        assertThat(ShopifyCheckoutKitModule.logLevelFor("trace")).isNull()
    }

    @Test
    fun `logLevelFor returns null for a missing name`() {
        assertThat(ShopifyCheckoutKitModule.logLevelFor(null)).isNull()
    }
}
