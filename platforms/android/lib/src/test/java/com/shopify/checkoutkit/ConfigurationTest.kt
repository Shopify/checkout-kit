package com.shopify.checkoutkit

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
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
            it.sheet = initialConfiguration.sheet
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
    fun `sheet dismissal defaults to enabled`() {
        assertThat(ShopifyCheckoutKit.getConfiguration().sheet.dismissal.dragToDismissEnabled).isTrue()
        assertThat(ShopifyCheckoutKit.getConfiguration().sheet.dismissal.tapAwayToDismissEnabled).isTrue()
    }

    @Test
    fun `can disable preloading via configure function`() {
        ShopifyCheckoutKit.configure {
            it.preloading = Preloading(enabled = false)
        }

        assertThat(ShopifyCheckoutKit.getConfiguration().preloading.enabled).isFalse()
    }

    @Test
    fun `can set sheet via configure function`() {
        val sheet = CheckoutSheetOptions(
            cornerRadiusDp = 12f,
            titleAlignment = CheckoutSheetTitleAlignment.START,
            toolbarElevationDp = 4f,
            closeIconTint = Color.SRGB(0xFF0000),
            dismissal = CheckoutSheetDismissal(
                dragToDismissEnabled = false,
                tapAwayToDismissEnabled = false,
            ),
            dragHandle = CheckoutSheetDragHandle(visible = true),
            snapPoints = listOf(CheckoutSheetSnapPoint.Expanded(topMarginDp = 12f)),
        )

        ShopifyCheckoutKit.configure {
            it.sheet = sheet
        }

        assertThat(ShopifyCheckoutKit.getConfiguration().sheet).isEqualTo(sheet)
    }

    @Test
    fun `sheet rejects invalid dimension values`() {
        val invalidStyles = listOf(
            "cornerRadiusDp" to { CheckoutSheetOptions(cornerRadiusDp = -1f) },
            "cornerRadiusDp" to { CheckoutSheetOptions(cornerRadiusDp = Float.NaN) },
            "toolbarElevationDp" to { CheckoutSheetOptions(toolbarElevationDp = Float.POSITIVE_INFINITY) },
            "topMarginDp" to { CheckoutSheetSnapPoint.Expanded(topMarginDp = -1f) },
            "topMarginDp" to { CheckoutSheetSnapPoint.Expanded(topMarginDp = Float.NaN) },
        )

        invalidStyles.forEach { (propertyName, createStyle) ->
            assertThatThrownBy { createStyle() }
                .isInstanceOf(IllegalArgumentException::class.java)
                .hasMessage("$propertyName must be a finite, non-negative value.")
        }
    }

    @Test
    fun `sheet rejects unsupported snap point counts`() {
        listOf(
            emptyList(),
            listOf(
                CheckoutSheetSnapPoint.MaterialExpanded,
                CheckoutSheetSnapPoint.Expanded(topMarginDp = 12f),
            ),
        ).forEach { snapPoints ->
            assertThatThrownBy { CheckoutSheetOptions(snapPoints = snapPoints) }
                .isInstanceOf(IllegalArgumentException::class.java)
                .hasMessage("snapPoints currently supports exactly one item.")
        }
    }

    @Test
    fun `can disable sheet tap away dismissal via configure function`() {
        ShopifyCheckoutKit.configure {
            it.sheet = CheckoutSheetOptions(
                dismissal = CheckoutSheetDismissal(tapAwayToDismissEnabled = false)
            )
        }

        assertThat(ShopifyCheckoutKit.getConfiguration().sheet.dismissal.tapAwayToDismissEnabled).isFalse()
    }
}
