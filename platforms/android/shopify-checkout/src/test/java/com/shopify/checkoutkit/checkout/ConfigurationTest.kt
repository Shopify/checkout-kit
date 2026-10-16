package com.shopify.checkoutkit.checkout

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
            it.appearance = initialConfiguration.appearance
            it.sheet = initialConfiguration.sheet
            it.preloading = initialConfiguration.preloading
            it.telemetry = initialConfiguration.telemetry
            it.platform = initialConfiguration.platform
            it.logLevel = initialConfiguration.logLevel
        }
    }

    @Test
    fun `equality includes all settings`() {
        val configuration = Configuration()
        val sameConfiguration = configuration.snapshot()
        val configurationsWithOneDifferentSetting = listOf(
            configuration.snapshot().also { it.appearance = CheckoutAppearance.App() },
            configuration.snapshot().also { it.sheet = CheckoutSheetOptions(cornerRadiusDp = 0f) },
            configuration.snapshot().also { it.platform = Platform.ReactNative() },
            configuration.snapshot().also { it.logLevel = LogLevel.DEBUG },
            configuration.snapshot().also { it.preloading = Preloading(false) },
            configuration.snapshot().also { it.title = "Example checkout" },
            configuration.snapshot().also { it.allowedMessageOrigins = setOf("https://example.com") },
            configuration.snapshot().also { it.telemetry = Telemetry(false) },
        )

        assertThat(configuration).isEqualTo(sameConfiguration)
        assertThat(configuration.hashCode()).isEqualTo(sameConfiguration.hashCode())
        configurationsWithOneDifferentSetting.forEach {
            assertThat(it).isNotEqualTo(configuration)
        }
    }

    @Test
    fun `sheet options equality handles special float values consistently with hash code`() {
        val invalidWidth = CheckoutSheetOptions(maxWidthDp = Float.NaN)
        val equivalentInvalidWidth = CheckoutSheetOptions(maxWidthDp = Float.NaN)
        val positiveZeroWidth = CheckoutSheetOptions(maxWidthDp = 0f)
        val negativeZeroWidth = CheckoutSheetOptions(maxWidthDp = -0f)
        val invalidSnapPoint = CheckoutSheetSnapPoint.Expanded(Float.NaN)
        val equivalentInvalidSnapPoint = CheckoutSheetSnapPoint.Expanded(Float.NaN)

        assertThat(invalidWidth).isEqualTo(invalidWidth)
        assertThat(invalidWidth).isEqualTo(equivalentInvalidWidth)
        assertThat(invalidWidth.hashCode()).isEqualTo(equivalentInvalidWidth.hashCode())
        assertThat(positiveZeroWidth).isNotEqualTo(negativeZeroWidth)
        assertThat(invalidSnapPoint).isEqualTo(equivalentInvalidSnapPoint)
        assertThat(invalidSnapPoint.hashCode()).isEqualTo(equivalentInvalidSnapPoint.hashCode())
    }

    @Test
    fun `expanded snap point equality handles signed zero consistently with hash code`() {
        val positiveZeroMargin = CheckoutSheetSnapPoint.Expanded { topMarginDp = 0f }
        val negativeZeroMargin = CheckoutSheetSnapPoint.Expanded { topMarginDp = -0f }
        val equivalentNegativeZeroMargin = CheckoutSheetSnapPoint.Expanded { topMarginDp = -0f }

        assertThat(negativeZeroMargin).isEqualTo(equivalentNegativeZeroMargin)
        assertThat(negativeZeroMargin.hashCode()).isEqualTo(equivalentNegativeZeroMargin.hashCode())
        assertThat(positiveZeroMargin).isNotEqualTo(negativeZeroMargin)
        assertThat(positiveZeroMargin.hashCode()).isNotEqualTo(negativeZeroMargin.hashCode())
    }

    @Test
    fun `to string serializes all settings`() {
        val colors = Colors(
            webViewBackground = Color.SRGB(1),
            headerBackground = Color.SRGB(2),
            headerFont = Color.SRGB(3),
            progressIndicator = Color.SRGB(4),
            closeIcon = DrawableResource(5),
            closeIconTint = Color.SRGB(6),
            dragHandleColor = Color.SRGB(7),
            headerBorderColor = Color.SRGB(8),
        )
        val configuration = Configuration().also {
            it.appearance = CheckoutAppearance.App(ColorScheme.Light(colors))
            it.sheet = CheckoutSheetOptions(
                cornerRadiusDp = 9f,
                titleAlignment = CheckoutSheetTitleAlignment.START,
                toolbarElevationDp = 10f,
                closeIcon = DrawableResource(11),
                closeIconTint = Color.SRGB(12),
                scrimColor = Color.SRGB(13),
                dismissal = CheckoutSheetDismissal(false, false),
                dragHandle = CheckoutSheetDragHandle(true),
                snapPoints = listOf(CheckoutSheetSnapPoint.Expanded(14f)),
                maxWidthDp = 15f,
            )
            it.platform = Platform.ReactNative("16.0")
            it.logLevel = LogLevel.DEBUG
            it.preloading = Preloading(false)
            it.title = "Example checkout"
            it.allowedMessageOrigins = linkedSetOf("https://example.com")
            it.telemetry = Telemetry(false)
        }

        assertThat(configuration.toString()).isEqualTo(
            "Configuration(appearance=App(colorScheme=Light(colors=Colors(" +
                "webViewBackground=SRGB(sRGB=1), headerBackground=SRGB(sRGB=2), " +
                "headerFont=SRGB(sRGB=3), progressIndicator=SRGB(sRGB=4), " +
                "closeIcon=DrawableResource(id=5), closeIconTint=SRGB(sRGB=6), " +
                "dragHandleColor=SRGB(sRGB=7), headerBorderColor=SRGB(sRGB=8)))), " +
                "sheet=CheckoutSheetOptions(cornerRadiusDp=9.0, titleAlignment=START, " +
                "toolbarElevationDp=10.0, closeIcon=DrawableResource(id=11), " +
                "closeIconTint=SRGB(sRGB=12), scrimColor=SRGB(sRGB=13), " +
                "dismissal=CheckoutSheetDismissal(dragToDismissEnabled=false, " +
                "tapAwayToDismissEnabled=false), dragHandle=CheckoutSheetDragHandle(visible=true), " +
                "snapPoints=[Expanded(topMarginDp=14.0)], maxWidthDp=15.0), " +
                "platform=ReactNative(version=16.0), logLevel=DEBUG, " +
                "preloading=Preloading(enabled=false), title=Example checkout, " +
                "allowedMessageOrigins=[https://example.com], telemetry=Telemetry(enabled=false))",
        )
    }

    @Test
    fun `get configuration returns a snapshot`() {
        val snapshot = ShopifyCheckoutKit.getConfiguration()

        snapshot.logLevel = LogLevel.DEBUG

        assertThat(ShopifyCheckoutKit.getConfiguration().logLevel).isNotEqualTo(LogLevel.DEBUG)
    }

    @Test
    fun `can set appearance via configure function - app light`() {
        ShopifyCheckoutKit.configure {
            it.appearance = CheckoutAppearance.App(ColorScheme.Light())
        }

        assertThat(
            ShopifyCheckoutKit.getConfiguration().appearance
        ).isEqualTo(
            CheckoutAppearance.App(ColorScheme.Light())
        )
    }

    @Test
    fun `can set appearance via configure function - app dark`() {
        ShopifyCheckoutKit.configure {
            it.appearance = CheckoutAppearance.App(ColorScheme.Dark())
        }

        assertThat(
            ShopifyCheckoutKit.getConfiguration().appearance
        ).isEqualTo(
            CheckoutAppearance.App(ColorScheme.Dark())
        )
    }

    @Test
    fun `can set appearance via configure function - storefront`() {
        ShopifyCheckoutKit.configure {
            it.appearance = CheckoutAppearance.Storefront()
        }

        assertThat(ShopifyCheckoutKit.getConfiguration().appearance).isEqualTo(
            CheckoutAppearance.Storefront()
        )
    }

    @Test
    fun `can set appearance via configure function - app automatic`() {
        ShopifyCheckoutKit.configure {
            it.appearance = CheckoutAppearance.App(ColorScheme.Automatic())
        }

        assertThat(
            ShopifyCheckoutKit.getConfiguration().appearance
        ).isEqualTo(
            CheckoutAppearance.App(ColorScheme.Automatic())
        )
    }

    @Test
    fun `preloading defaults to enabled`() {
        assertThat(ShopifyCheckoutKit.getConfiguration().preloading.enabled).isTrue()
    }

    @Test
    fun `telemetry defaults to enabled`() {
        assertThat(ShopifyCheckoutKit.getConfiguration().telemetry.enabled).isTrue()
    }

    @Test
    fun `appearance defaults to storefront`() {
        assertThat(ShopifyCheckoutKit.getConfiguration().appearance).isEqualTo(CheckoutAppearance.Storefront())
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
    fun `can disable telemetry via configure function`() {
        ShopifyCheckoutKit.configure {
            it.telemetry = Telemetry(enabled = false)
        }

        assertThat(ShopifyCheckoutKit.getConfiguration().telemetry.enabled).isFalse()
    }

    @Test
    fun `can set sheet via configure function`() {
        val sheet = CheckoutSheetOptions(
            cornerRadiusDp = 12f,
            titleAlignment = CheckoutSheetTitleAlignment.START,
            toolbarElevationDp = 4f,
            maxWidthDp = 480f,
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
            "cornerRadiusDp" to { CheckoutSheetOptions { cornerRadiusDp = -1f } },
            "cornerRadiusDp" to { CheckoutSheetOptions { cornerRadiusDp = Float.NaN } },
            "toolbarElevationDp" to { CheckoutSheetOptions { toolbarElevationDp = Float.POSITIVE_INFINITY } },
            "topMarginDp" to { CheckoutSheetSnapPoint.Expanded { topMarginDp = -1f } },
            "topMarginDp" to { CheckoutSheetSnapPoint.Expanded { topMarginDp = Float.NaN } },
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
                CheckoutSheetSnapPoint.Expanded { topMarginDp = 12f },
            ),
        ).forEach { snapPoints ->
            assertThatThrownBy { CheckoutSheetOptions { this.snapPoints = snapPoints } }
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
