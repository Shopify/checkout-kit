package com.shopify.checkoutkit

import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test

class ConfigurationTest {

    private lateinit var initialConfiguration: Configuration

    @Before
    fun setUp() {
        initialConfiguration = ShopifyCheckoutKit.getConfiguration()
    }

    @After
    fun tearDown() {
        ShopifyCheckoutKit.configure {
            it.colorScheme = initialConfiguration.colorScheme
            it.preloading = initialConfiguration.preloading
            it.platform = initialConfiguration.platform
            it.logLevel = initialConfiguration.logLevel
        }
    }

    @Test
    fun `can set colorScheme via configure function - light`() {
        ShopifyCheckoutKit.configure {
            it.colorScheme = ColorScheme.Light()
        }

        assertThat(ShopifyCheckoutKit.getConfiguration().colorScheme).isEqualTo(ColorScheme.Light())
    }

    @Test
    fun `can set colorScheme via configure function - dark`() {
        ShopifyCheckoutKit.configure {
            it.colorScheme = ColorScheme.Dark()
        }

        assertThat(ShopifyCheckoutKit.getConfiguration().colorScheme).isEqualTo(ColorScheme.Dark())
    }

    @Test
    fun `can set colorScheme via configure function - web`() {
        ShopifyCheckoutKit.configure {
            it.colorScheme = ColorScheme.Web()
        }

        assertThat(ShopifyCheckoutKit.getConfiguration().colorScheme).isEqualTo(ColorScheme.Web())
    }

    @Test
    fun `can set colorScheme via configure function - automatic`() {
        ShopifyCheckoutKit.configure {
            it.colorScheme = ColorScheme.Automatic()
        }

        assertThat(ShopifyCheckoutKit.getConfiguration().colorScheme).isEqualTo(ColorScheme.Automatic())
    }

    @Test
    fun `preloading defaults to enabled`() {
        assertThat(ShopifyCheckoutKit.getConfiguration().preloading.enabled).isTrue()
    }

    @Test
    fun `can disable preloading via configure function`() {
        ShopifyCheckoutKit.configure {
            it.preloading = Preloading(enabled = false)
        }

        assertThat(ShopifyCheckoutKit.getConfiguration().preloading.enabled).isFalse()
    }
}
