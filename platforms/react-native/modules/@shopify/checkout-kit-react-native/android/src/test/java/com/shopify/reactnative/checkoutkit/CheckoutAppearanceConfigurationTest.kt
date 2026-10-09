package com.shopify.reactnative.checkoutkit

import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.Color
import com.shopify.checkoutkit.ColorScheme
import com.shopify.checkoutkit.Colors
import com.shopify.checkoutkit.LogLevel
import com.shopify.checkoutkit.Preloading
import com.shopify.checkoutkit.ShopifyCheckoutKit
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class CheckoutAppearanceConfigurationTest {
    private lateinit var module: ShopifyCheckoutKitModule
    private lateinit var originalAppearance: CheckoutAppearance
    private lateinit var originalPreloading: Preloading
    private lateinit var originalLogLevel: LogLevel
    private var originalTitle: String? = null

    @Before
    fun setUp() {
        ShopifyCheckoutKit.configure {
            originalAppearance = it.appearance
            originalPreloading = it.preloading
            originalLogLevel = it.logLevel
            originalTitle = it.title
            it.appearance = CheckoutAppearance.Storefront()
            it.preloading = Preloading(true)
            it.logLevel = LogLevel.WARN
        }
        module = makeModule()
    }

    @After
    fun tearDown() {
        ShopifyCheckoutKit.configure {
            it.appearance = originalAppearance
            it.preloading = originalPreloading
            it.logLevel = originalLogLevel
            it.title = originalTitle
        }
    }

    @Test
    fun testEveryAppearanceMapsToTheNativeAppearance() {
        val appearances = listOf(
            makeAppearance("app", "light") to CheckoutAppearance.App(ColorScheme.Light()),
            makeAppearance("app", "dark") to CheckoutAppearance.App(ColorScheme.Dark()),
            makeAppearance("app", "automatic") to CheckoutAppearance.App(ColorScheme.Automatic()),
            makeAppearance("storefront") to CheckoutAppearance.Storefront()
        )

        appearances.forEach { (configuration, appearance) ->
            module.setConfig(JavaOnlyMap.of("appearance", configuration))

            assertThat(ShopifyCheckoutKitModule.checkoutConfig.appearance).isEqualTo(appearance)
        }
    }

    @Test
    fun testAppAppearanceWithoutColorSchemeIsAutomatic() {
        module.setConfig(JavaOnlyMap.of("appearance", makeAppearance("app")))

        assertThat(
            ShopifyCheckoutKitModule.checkoutConfig.appearance
        ).isEqualTo(CheckoutAppearance.App(ColorScheme.Automatic()))
    }

    @Test
    fun testModuleInitializationPreservesHostAppearance() {
        val appearance = CheckoutAppearance.App(
            ColorScheme.Dark().customize {
                progressIndicator = Color.SRGB(0xFFFF0000.toInt())
                closeIconTint = Color.SRGB(0xFF0000FF.toInt())
            }
        )
        ShopifyCheckoutKit.configure { it.appearance = appearance }

        module = makeModule()

        assertThat(ShopifyCheckoutKitModule.checkoutConfig.appearance).isEqualTo(appearance)
    }

    @Test
    fun testExplicitSchemesApplySharedColorFields() {
        listOf("light", "dark").forEach { scheme ->
            module.setConfig(makeConfiguration(scheme, makeColorsConfiguration()))

            assertThat(colors().webViewBackground).isEqualTo(Color.SRGB(0xFF112233.toInt()))
            assertThat(colors().headerBackground).isEqualTo(Color.SRGB(0xFF445566.toInt()))
            assertThat(colors().headerFont).isEqualTo(Color.SRGB(0xFF778899.toInt()))
            assertThat(colors().progressIndicator).isEqualTo(Color.SRGB(0xFFAABBCC.toInt()))
            assertThat(colors().closeIconTint).isEqualTo(Color.SRGB(0xFFDDEEFF.toInt()))
            assertThat(colors().headerBorderColor).isEqualTo(Color.SRGB(0xFF123456.toInt()))
        }
    }

    @Test
    fun testStorefrontAppliesSharedColorFields() {
        module.setConfig(makeConfiguration("storefront", makeColorsConfiguration()))

        val expected = CheckoutAppearance.Storefront().customize {
            webViewBackground = Color.SRGB(0xFF112233.toInt())
            headerBackground = Color.SRGB(0xFF445566.toInt())
            headerFont = Color.SRGB(0xFF778899.toInt())
            progressIndicator = Color.SRGB(0xFFAABBCC.toInt())
            closeIconTint = Color.SRGB(0xFFDDEEFF.toInt())
            headerBorderColor = Color.SRGB(0xFF123456.toInt())
        }
        assertThat(ShopifyCheckoutKitModule.checkoutConfig.appearance).isEqualTo(expected)
    }

    @Test
    fun testAutomaticAppliesIndependentPalettes() {
        module.setConfig(
            makeConfiguration(
                "automatic",
                JavaOnlyMap.of(
                    "light",
                    JavaOnlyMap.of("webViewBackground", "#FFFFFF", "progressIndicator", "#FF0000"),
                    "dark",
                    JavaOnlyMap.of("webViewBackground", "#000000", "progressIndicator", "#0000FF")
                )
            )
        )

        assertThat(colors(false).webViewBackground).isEqualTo(Color.SRGB(0xFFFFFFFF.toInt()))
        assertThat(colors(false).progressIndicator).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
        assertThat(colors(true).webViewBackground).isEqualTo(Color.SRGB(0xFF000000.toInt()))
        assertThat(colors(true).progressIndicator).isEqualTo(Color.SRGB(0xFF0000FF.toInt()))
    }

    @Test
    fun testAutomaticPreservesDefaultsForAnOmittedPalette() {
        module.setConfig(
            makeConfiguration(
                "automatic",
                JavaOnlyMap.of(
                    "light",
                    JavaOnlyMap.of("webViewBackground", "#FF0000")
                )
            )
        )

        assertThat(colors(false).webViewBackground).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
        assertThat(colors(false).progressIndicator).isEqualTo(ColorScheme.Light().colors.progressIndicator)
        assertThat(colors(true)).isEqualTo(ColorScheme.Dark().colors)
    }

    @Test
    fun testAutomaticAppliesSharedOverridesToBothPalettes() {
        module.setConfig(makeConfiguration("automatic", JavaOnlyMap.of("progressIndicator", "#FF0000")))

        listOf(false, true).forEach { isDark ->
            val defaults = if (isDark) ColorScheme.Dark().colors else ColorScheme.Light().colors
            assertThat(colors(isDark).progressIndicator).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
            assertThat(colors(isDark).webViewBackground).isEqualTo(defaults.webViewBackground)
        }
    }

    @Test
    fun testAutomaticPaletteOverridesTakePrecedenceOverSharedOverrides() {
        module.setConfig(
            makeConfiguration(
                "automatic",
                JavaOnlyMap.of(
                    "progressIndicator",
                    "#FF0000",
                    "light",
                    JavaOnlyMap.of("progressIndicator", "#00FF00")
                )
            )
        )

        assertThat(colors(false).progressIndicator).isEqualTo(Color.SRGB(0xFF00FF00.toInt()))
        assertThat(colors(true).progressIndicator).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
    }

    @Test
    fun testNullOptionalColorsDoNotDiscardValidOverrides() {
        module.setConfig(
            makeConfiguration(
                "light",
                JavaOnlyMap.of(
                    "webViewBackground",
                    "#0000FF",
                    "closeIconTint",
                    null,
                    "headerBorderColor",
                    null
                )
            )
        )

        assertThat(colors().webViewBackground).isEqualTo(Color.SRGB(0xFF0000FF.toInt()))
        assertThat(colors().closeIconTint).isNull()
        assertThat(colors().headerBorderColor).isEqualTo(ColorScheme.Light().colors.headerBorderColor)
    }

    @Test
    fun testAutomaticPaletteCanResetSharedOptionalOverrides() {
        module.setConfig(
            makeConfiguration(
                "automatic",
                JavaOnlyMap.of(
                    "closeIconTint",
                    "#FF0000",
                    "headerBorderColor",
                    "#FF0000",
                    "light",
                    JavaOnlyMap.of("closeIconTint", null, "headerBorderColor", null)
                )
            )
        )

        assertThat(colors(false).closeIconTint).isNull()
        assertThat(colors(false).headerBorderColor).isEqualTo(ColorScheme.Light().colors.headerBorderColor)
        assertThat(colors(true).closeIconTint).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
        assertThat(colors(true).headerBorderColor).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
    }

    @Test
    fun testUnrelatedConfigurationUpdatesPreserveAppearance() {
        module.setConfig(makeConfiguration("dark", makeColorsConfiguration()))
        val appearance = ShopifyCheckoutKitModule.checkoutConfig.appearance

        module.setConfig(JavaOnlyMap.of("logLevel", "debug", "preloading", false, "title", "Custom Checkout"))

        assertThat(ShopifyCheckoutKitModule.checkoutConfig.appearance).isEqualTo(appearance)
        assertThat(ShopifyCheckoutKitModule.checkoutConfig.logLevel).isEqualTo(LogLevel.DEBUG)
        assertThat(ShopifyCheckoutKitModule.checkoutConfig.preloading.enabled).isFalse()
        assertThat(ShopifyCheckoutKitModule.checkoutConfig.title).isEqualTo("Custom Checkout")
    }

    @Test
    fun testEmptyConfigurationPreservesAppearance() {
        module.setConfig(makeConfiguration("dark", makeColorsConfiguration()))
        val appearance = ShopifyCheckoutKitModule.checkoutConfig.appearance

        module.setConfig(JavaOnlyMap())

        assertThat(ShopifyCheckoutKitModule.checkoutConfig.appearance).isEqualTo(appearance)
    }

    @Test
    fun testReplacingTheSchemeRestoresNativeDefaults() {
        ShopifyCheckoutKit.configure {
            it.appearance = CheckoutAppearance.Storefront().customize {
                webViewBackground = Color.SRGB(0xFF800080.toInt())
            }
        }
        module = makeModule()
        module.setConfig(makeConfiguration("dark", makeColorsConfiguration()))

        module.setConfig(JavaOnlyMap.of("appearance", makeAppearance("app", "automatic")))

        assertThat(
            ShopifyCheckoutKitModule.checkoutConfig.appearance
        ).isEqualTo(CheckoutAppearance.App(ColorScheme.Automatic()))
    }

    @Test
    fun testEmptyColorsRestoreDefaults() {
        module.setConfig(makeConfiguration("dark", makeColorsConfiguration()))

        module.setConfig(JavaOnlyMap.of("appearance", makeAppearance("app", "dark", JavaOnlyMap())))

        assertThat(
            ShopifyCheckoutKitModule.checkoutConfig.appearance
        ).isEqualTo(CheckoutAppearance.App(ColorScheme.Dark()))
    }

    @Test
    fun testNullColorsRestoreDefaults() {
        module.setConfig(makeConfiguration("dark", makeColorsConfiguration()))

        module.setConfig(JavaOnlyMap.of("appearance", JavaOnlyMap.of("type", "app", "colorScheme", "dark", "colors", null)))

        assertThat(
            ShopifyCheckoutKitModule.checkoutConfig.appearance
        ).isEqualTo(CheckoutAppearance.App(ColorScheme.Dark()))
    }

    @Test
    fun testColorsForTheOtherPlatformRestoreDefaults() {
        module.setConfig(makeConfiguration("dark", makeColorsConfiguration()))

        module.setConfig(
            JavaOnlyMap.of(
                "appearance",
                makeAppearance("app", "dark", JavaOnlyMap.of("ios", JavaOnlyMap.of("progressIndicator", "#FF0000")))
            )
        )

        assertThat(
            ShopifyCheckoutKitModule.checkoutConfig.appearance
        ).isEqualTo(CheckoutAppearance.App(ColorScheme.Dark()))
    }

    @Test
    fun testOmittedColorsRestoreDefaults() {
        module.setConfig(makeConfiguration("storefront", makeColorsConfiguration()))

        module.setConfig(JavaOnlyMap.of("appearance", makeAppearance("storefront")))

        assertThat(ShopifyCheckoutKitModule.checkoutConfig.appearance).isEqualTo(CheckoutAppearance.Storefront())
    }

    @Test
    fun testInvalidAppearancesPreserveTheCurrentAppearance() {
        module.setConfig(makeConfiguration("dark", makeColorsConfiguration()))
        val appearance = ShopifyCheckoutKitModule.checkoutConfig.appearance

        listOf<Any?>(null, "dark", 42).forEach { invalidAppearance ->
            module.setConfig(JavaOnlyMap.of("appearance", invalidAppearance))

            assertThat(ShopifyCheckoutKitModule.checkoutConfig.appearance).isEqualTo(appearance)
        }
    }

    @Test
    fun testInvalidAppearanceTypesPreserveTheCurrentAppearance() {
        module.setConfig(makeConfiguration("dark", makeColorsConfiguration()))
        val appearance = ShopifyCheckoutKitModule.checkoutConfig.appearance

        listOf<Any?>("sepia", "light", null, 42).forEach { type ->
            module.setConfig(JavaOnlyMap.of("appearance", JavaOnlyMap.of("type", type, "colorScheme", "light")))

            assertThat(ShopifyCheckoutKitModule.checkoutConfig.appearance).isEqualTo(appearance)
        }
    }

    @Test
    fun testMissingAppearanceTypePreservesTheCurrentAppearance() {
        module.setConfig(makeConfiguration("dark", makeColorsConfiguration()))
        val appearance = ShopifyCheckoutKitModule.checkoutConfig.appearance

        module.setConfig(JavaOnlyMap.of("appearance", JavaOnlyMap.of("colorScheme", "light")))

        assertThat(ShopifyCheckoutKitModule.checkoutConfig.appearance).isEqualTo(appearance)
    }

    @Test
    fun testUnknownAndNullSchemesPreserveTheCurrentAppearance() {
        module.setConfig(makeConfiguration("dark", makeColorsConfiguration()))
        val appearance = ShopifyCheckoutKitModule.checkoutConfig.appearance

        listOf<Any?>("storefront", "sepia", null, 42).forEach { scheme ->
            module.setConfig(
                JavaOnlyMap.of(
                    "appearance",
                    JavaOnlyMap.of(
                        "type", "app",
                        "colorScheme", scheme,
                        "colors", JavaOnlyMap.of("android", makeColorsConfiguration())
                    )
                )
            )

            assertThat(ShopifyCheckoutKitModule.checkoutConfig.appearance).isEqualTo(appearance)
        }
    }

    @Test
    fun testInvalidColorsDoNotDiscardValidOverrides() {
        listOf("", "red", "#12345", "#123456789", "##112233", "#GG0000", 42, null).forEach { invalidColor ->
            module.setConfig(
                makeConfiguration(
                    "light",
                    JavaOnlyMap.of(
                        "webViewBackground",
                        "#AABBCC",
                        "progressIndicator",
                        invalidColor,
                        "headerFont",
                        42
                    )
                )
            )

            assertThat(colors().webViewBackground).isEqualTo(Color.SRGB(0xFFAABBCC.toInt()))
            assertThat(colors().progressIndicator).isEqualTo(ColorScheme.Light().colors.progressIndicator)
            assertThat(colors().headerFont).isEqualTo(ColorScheme.Light().colors.headerFont)
        }
    }

    @Test
    fun testHexColorsSupportOpacityAndSurroundingWhitespace() {
        module.setConfig(
            makeConfiguration(
                "light",
                JavaOnlyMap.of(
                    "webViewBackground",
                    "  #80112233  ",
                    "progressIndicator",
                    "aabbcc"
                )
            )
        )

        assertThat(colors().webViewBackground).isEqualTo(Color.SRGB(0x80112233.toInt()))
        assertThat(colors().progressIndicator).isEqualTo(Color.SRGB(0xFFAABBCC.toInt()))
    }

    @Test
    fun testAndroidSupportsDragHandleColors() {
        module.setConfig(makeConfiguration("light", JavaOnlyMap.of("dragHandleColor", "#FF0000")))

        assertThat(colors().dragHandleColor).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
    }

    @Test
    fun testNullDragHandleColorResetsToTheNativeDefault() {
        module.setConfig(makeConfiguration("light", JavaOnlyMap.of("dragHandleColor", null)))

        assertThat(colors().dragHandleColor).isEqualTo(ColorScheme.Light().colors.dragHandleColor)
    }

    @Test
    fun testStorefrontSupportsDragHandleColors() {
        module.setConfig(makeConfiguration("storefront", JavaOnlyMap.of("dragHandleColor", "#FF0000")))

        assertThat(
            ShopifyCheckoutKitModule.checkoutConfig.appearance
        ).isEqualTo(CheckoutAppearance.Storefront().customize { dragHandleColor = Color.SRGB(0xFFFF0000.toInt()) })
    }

    private fun makeModule() = ShopifyCheckoutKitModule(BridgeReactContext(RuntimeEnvironment.getApplication()))

    private fun makeConfiguration(scheme: String, colors: JavaOnlyMap): JavaOnlyMap {
        val appearance = if (scheme == "storefront") {
            makeAppearance("storefront", colors = JavaOnlyMap.of("android", colors))
        } else {
            makeAppearance("app", scheme, JavaOnlyMap.of("android", colors))
        }
        return JavaOnlyMap.of("appearance", appearance)
    }

    private fun makeAppearance(type: String, colorScheme: String? = null, colors: JavaOnlyMap? = null) =
        JavaOnlyMap().apply {
            putString("type", type)
            colorScheme?.let { putString("colorScheme", it) }
            if (colors != null) putMap("colors", colors)
        }

    private fun makeColorsConfiguration() = JavaOnlyMap.of(
        "webViewBackground", "#112233",
        "headerBackground", "#445566",
        "headerFont", "#778899",
        "progressIndicator", "#AABBCC",
        "closeIconTint", "#DDEEFF",
        "headerBorderColor", "#123456"
    )

    private fun colors(isDark: Boolean = false): Colors = when (val appearance = ShopifyCheckoutKitModule.checkoutConfig.appearance) {
        is CheckoutAppearance.Storefront -> error("Expected an app appearance")
        is CheckoutAppearance.App -> when (val scheme = appearance.colorScheme) {
            is ColorScheme.Light -> scheme.colors
            is ColorScheme.Dark -> scheme.colors
            is ColorScheme.Automatic -> if (isDark) scheme.darkColors else scheme.lightColors
        }
    }
}
