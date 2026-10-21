package com.shopify.reactnative.checkoutkit

import com.facebook.react.bridge.JavaOnlyMap
import com.shopify.checkoutkit.checkout.CheckoutAppearance
import com.shopify.checkoutkit.checkout.Color
import com.shopify.checkoutkit.checkout.ColorScheme
import com.shopify.checkoutkit.checkout.Colors
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CheckoutAppearanceConfigurationTest {
    private val customAppearance = CheckoutAppearance.App(
        ColorScheme.Dark().customize {
            webViewBackground = Color.SRGB(0xFF800080.toInt())
            progressIndicator = Color.SRGB(0xFFFF0000.toInt())
            closeIconTint = Color.SRGB(0xFF0000FF.toInt())
            dragHandleColor = Color.SRGB(0xFF00FF00.toInt())
        }
    )

    @Test
    fun `every appearance maps to the native default appearance`() {
        val appearances = listOf(
            makeAppearance("app", "light") to CheckoutAppearance.App(ColorScheme.Light()),
            makeAppearance("app", "dark") to CheckoutAppearance.App(ColorScheme.Dark()),
            makeAppearance("app", "automatic") to CheckoutAppearance.App(ColorScheme.Automatic()),
            makeAppearance("storefront") to CheckoutAppearance.Storefront(),
        )

        appearances.forEach { (configuration, expected) ->
            assertThat(update(JavaOnlyMap.of("appearance", configuration))).isEqualTo(expected)
        }
    }

    @Test
    fun `app appearance without a color scheme is automatic`() {
        assertThat(
            update(JavaOnlyMap.of("appearance", makeAppearance("app")))
        ).isEqualTo(CheckoutAppearance.App(ColorScheme.Automatic()))
    }

    @Test
    fun `explicit schemes apply every color field`() {
        listOf("light", "dark").forEach { scheme ->
            val colors = colorsOf(update(makeConfiguration(scheme, makeColorsConfiguration())))

            assertThat(colors.webViewBackground).isEqualTo(Color.SRGB(0xFF112233.toInt()))
            assertThat(colors.headerBackground).isEqualTo(Color.SRGB(0xFF445566.toInt()))
            assertThat(colors.headerFont).isEqualTo(Color.SRGB(0xFF778899.toInt()))
            assertThat(colors.progressIndicator).isEqualTo(Color.SRGB(0xFFAABBCC.toInt()))
            assertThat(colors.closeIconTint).isEqualTo(Color.SRGB(0xFFDDEEFF.toInt()))
            assertThat(colors.headerBorderColor).isEqualTo(Color.SRGB(0xFF123456.toInt()))
            assertThat(colors.dragHandleColor).isEqualTo(Color.SRGB(0xFF654321.toInt()))
        }
    }

    @Test
    fun `storefront applies every color field`() {
        val expected = CheckoutAppearance.Storefront().customize {
            webViewBackground = Color.SRGB(0xFF112233.toInt())
            headerBackground = Color.SRGB(0xFF445566.toInt())
            headerFont = Color.SRGB(0xFF778899.toInt())
            progressIndicator = Color.SRGB(0xFFAABBCC.toInt())
            closeIconTint = Color.SRGB(0xFFDDEEFF.toInt())
            headerBorderColor = Color.SRGB(0xFF123456.toInt())
            dragHandleColor = Color.SRGB(0xFF654321.toInt())
        }

        assertThat(update(makeConfiguration("storefront", makeColorsConfiguration()))).isEqualTo(expected)
    }

    @Test
    fun `automatic applies independent palettes`() {
        val appearance = update(
            makeConfiguration(
                "automatic",
                JavaOnlyMap.of(
                    "light", JavaOnlyMap.of("webViewBackgroundColor", "#FFFFFF", "progressIndicatorColor", "#FF0000"),
                    "dark", JavaOnlyMap.of("webViewBackgroundColor", "#000000", "progressIndicatorColor", "#0000FF"),
                )
            )
        )

        assertThat(colorsOf(appearance, isDark = false).webViewBackground).isEqualTo(Color.SRGB(0xFFFFFFFF.toInt()))
        assertThat(colorsOf(appearance, isDark = false).progressIndicator).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
        assertThat(colorsOf(appearance, isDark = true).webViewBackground).isEqualTo(Color.SRGB(0xFF000000.toInt()))
        assertThat(colorsOf(appearance, isDark = true).progressIndicator).isEqualTo(Color.SRGB(0xFF0000FF.toInt()))
    }

    @Test
    fun `automatic keeps the defaults for an omitted palette`() {
        val appearance = update(
            makeConfiguration("automatic", JavaOnlyMap.of("light", JavaOnlyMap.of("webViewBackgroundColor", "#FF0000")))
        )

        assertThat(colorsOf(appearance, isDark = false)).isEqualTo(
            ColorScheme.Light().colors.copy(webViewBackground = Color.SRGB(0xFFFF0000.toInt()))
        )
        assertThat(colorsOf(appearance, isDark = true)).isEqualTo(ColorScheme.Dark().colors)
    }

    @Test
    fun `automatic applies shared colors to both palettes`() {
        val appearance = update(makeConfiguration("automatic", JavaOnlyMap.of("progressIndicatorColor", "#FF0000")))

        assertThat(colorsOf(appearance, isDark = false)).isEqualTo(
            ColorScheme.Light().colors.copy(progressIndicator = Color.SRGB(0xFFFF0000.toInt()))
        )
        assertThat(colorsOf(appearance, isDark = true)).isEqualTo(
            ColorScheme.Dark().colors.copy(progressIndicator = Color.SRGB(0xFFFF0000.toInt()))
        )
    }

    @Test
    fun `automatic palette colors take precedence over shared colors`() {
        val appearance = update(
            makeConfiguration(
                "automatic",
                JavaOnlyMap.of(
                    "progressIndicatorColor", "#FF0000",
                    "light", JavaOnlyMap.of("progressIndicatorColor", "#00FF00"),
                )
            )
        )

        assertThat(colorsOf(appearance, isDark = false).progressIndicator).isEqualTo(Color.SRGB(0xFF00FF00.toInt()))
        assertThat(colorsOf(appearance, isDark = true).progressIndicator).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
    }

    @Test
    fun `null optional colors keep the defaults without discarding valid colors`() {
        val colors = colorsOf(update(
            makeConfiguration(
                "light",
                JavaOnlyMap.of(
                    "webViewBackgroundColor", "#0000FF",
                    "closeIconTintColor", null,
                    "headerBorderColor", null,
                    "dragHandleColor", null,
                )
            )
        ))

        assertThat(colors).isEqualTo(
            ColorScheme.Light().colors.copy(webViewBackground = Color.SRGB(0xFF0000FF.toInt()))
        )
    }

    @Test
    fun `automatic palette null optional colors reset the shared colors for that mode`() {
        val appearance = update(
            makeConfiguration(
                "automatic",
                JavaOnlyMap.of(
                    "closeIconTintColor", "#FF0000",
                    "headerBorderColor", "#FF0000",
                    "dragHandleColor", "#FF0000",
                    "light", JavaOnlyMap.of("closeIconTintColor", null, "headerBorderColor", null, "dragHandleColor", null),
                )
            )
        )

        assertThat(colorsOf(appearance, isDark = false)).isEqualTo(ColorScheme.Light().colors)
        assertThat(colorsOf(appearance, isDark = true).closeIconTint).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
        assertThat(colorsOf(appearance, isDark = true).headerBorderColor).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
        assertThat(colorsOf(appearance, isDark = true).dragHandleColor).isEqualTo(Color.SRGB(0xFFFF0000.toInt()))
    }

    @Test
    fun `configuration without an appearance keeps the current appearance`() {
        listOf(
            JavaOnlyMap(),
            JavaOnlyMap.of("logLevel", "debug", "preloading", false, "title", "Custom Checkout"),
        ).forEach { configuration ->
            assertThat(update(configuration)).isSameAs(customAppearance)
        }
    }

    @Test
    fun `a different appearance without colors replaces earlier colors with the native defaults`() {
        val current = update(makeConfiguration("dark", makeColorsConfiguration()))

        assertThat(
            update(JavaOnlyMap.of("appearance", makeAppearance("app", "light")), current)
        ).isEqualTo(CheckoutAppearance.App(ColorScheme.Light()))
        assertThat(
            update(JavaOnlyMap.of("appearance", makeAppearance("storefront")), current)
        ).isEqualTo(CheckoutAppearance.Storefront())
    }

    @Test
    fun `the same appearance without colors replaces earlier colors with the native defaults`() {
        listOf(
            "light" to CheckoutAppearance.App(ColorScheme.Light()),
            "dark" to CheckoutAppearance.App(ColorScheme.Dark()),
            "automatic" to CheckoutAppearance.App(ColorScheme.Automatic()),
            "storefront" to CheckoutAppearance.Storefront(),
        ).forEach { (scheme, expected) ->
            val current = update(makeConfiguration(scheme, makeColorsConfiguration()))
            assertThat(current).isNotEqualTo(expected)

            val appearance = if (scheme == "storefront") makeAppearance(scheme) else makeAppearance("app", scheme)

            assertThat(update(JavaOnlyMap.of("appearance", appearance), current)).isEqualTo(expected)
        }
    }

    @Test
    fun `storefront after custom automatic palettes uses the native storefront defaults`() {
        val current = update(
            makeConfiguration(
                "automatic",
                JavaOnlyMap.of(
                    "progressIndicatorColor", "#FF0000",
                    "light", makeColorsConfiguration(),
                    "dark", makeColorsConfiguration(),
                )
            )
        )

        assertThat(
            update(JavaOnlyMap.of("appearance", makeAppearance("storefront")), current)
        ).isEqualTo(CheckoutAppearance.Storefront())
    }

    @Test
    fun `missing or unusable colors use the native defaults`() {
        listOf<Any?>(
            JavaOnlyMap(),
            null,
            "#FF0000",
            JavaOnlyMap.of("ios", JavaOnlyMap.of("progressIndicatorColor", "#FF0000")),
            JavaOnlyMap.of("android", null),
            JavaOnlyMap.of("android", "#FF0000"),
        ).forEach { colors ->
            val appearance = JavaOnlyMap.of("type", "app", "colorScheme", "dark", "colors", colors)

            assertThat(
                update(JavaOnlyMap.of("appearance", appearance))
            ).isEqualTo(CheckoutAppearance.App(ColorScheme.Dark()))
        }
    }

    @Test
    fun `invalid appearances keep the current appearance`() {
        listOf<Any?>(null, "dark", 42, true).forEach { invalidAppearance ->
            assertThat(update(JavaOnlyMap.of("appearance", invalidAppearance))).isSameAs(customAppearance)
        }
    }

    @Test
    fun `invalid or missing appearance types keep the current appearance`() {
        listOf<Any?>("sepia", "light", "App", null, 42).forEach { type ->
            val appearance = JavaOnlyMap.of("type", type, "colorScheme", "light")

            assertThat(update(JavaOnlyMap.of("appearance", appearance))).isSameAs(customAppearance)
        }

        assertThat(
            update(JavaOnlyMap.of("appearance", JavaOnlyMap.of("colorScheme", "light")))
        ).isSameAs(customAppearance)
    }

    @Test
    fun `unknown or null color schemes keep the current appearance`() {
        listOf<Any?>("storefront", "sepia", "Light", null, 42).forEach { scheme ->
            val appearance = JavaOnlyMap.of(
                "type", "app",
                "colorScheme", scheme,
                "colors", JavaOnlyMap.of("android", makeColorsConfiguration()),
            )

            assertThat(update(JavaOnlyMap.of("appearance", appearance))).isSameAs(customAppearance)
        }
    }

    @Test
    fun `invalid colors keep the defaults without discarding valid colors`() {
        listOf<Any?>("", "red", "#12345", "#1234567", "#123456789", "##112233", "0x112233", "#GG0000", 42, null)
            .forEach { invalidColor ->
                val colors = colorsOf(update(
                    makeConfiguration(
                        "light",
                        JavaOnlyMap.of(
                            "webViewBackgroundColor", "#AABBCC",
                            "progressIndicatorColor", invalidColor,
                            "headerTitleColor", 42,
                            "closeIconTintColor", invalidColor,
                        )
                    )
                ))

                assertThat(colors).isEqualTo(
                    ColorScheme.Light().colors.copy(webViewBackground = Color.SRGB(0xFFAABBCC.toInt()))
                )
            }
    }

    @Test
    fun `hex colors support opacity, a missing hash, and surrounding whitespace`() {
        val colors = colorsOf(update(
            makeConfiguration(
                "light",
                JavaOnlyMap.of(
                    "webViewBackgroundColor", "  #80112233  ",
                    "progressIndicatorColor", "aabbcc",
                    "headerTitleColor", "00FFFFFF",
                )
            )
        ))

        assertThat(colors.webViewBackground).isEqualTo(Color.SRGB(0x80112233.toInt()))
        assertThat(colors.progressIndicator).isEqualTo(Color.SRGB(0xFFAABBCC.toInt()))
        assertThat(colors.headerFont).isEqualTo(Color.SRGB(0x00FFFFFF))
    }

    @Test
    fun `palette sub-maps only apply to automatic`() {
        val colors = colorsOf(
            update(makeConfiguration("light", JavaOnlyMap.of("light", JavaOnlyMap.of("webViewBackgroundColor", "#FF0000"))))
        )

        assertThat(colors).isEqualTo(ColorScheme.Light().colors)
    }

    private fun update(
        configuration: JavaOnlyMap,
        current: CheckoutAppearance = customAppearance,
    ): CheckoutAppearance = CheckoutAppearanceConfiguration.update(current, configuration)

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
        "webViewBackgroundColor", "#112233",
        "headerBackgroundColor", "#445566",
        "headerTitleColor", "#778899",
        "progressIndicatorColor", "#AABBCC",
        "closeIconTintColor", "#DDEEFF",
        "headerBorderColor", "#123456",
        "dragHandleColor", "#654321",
    )

    private fun colorsOf(appearance: CheckoutAppearance, isDark: Boolean = false): Colors = when (appearance) {
        is CheckoutAppearance.Storefront -> error("Expected an app appearance")
        is CheckoutAppearance.App -> when (val scheme = appearance.colorScheme) {
            is ColorScheme.Light -> scheme.colors
            is ColorScheme.Dark -> scheme.colors
            is ColorScheme.Automatic -> if (isDark) scheme.darkColors else scheme.lightColors
        }
    }
}
