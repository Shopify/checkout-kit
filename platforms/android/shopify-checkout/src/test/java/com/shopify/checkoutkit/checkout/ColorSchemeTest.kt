package com.shopify.checkoutkit.checkout

import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class ColorSchemeTest {

    @Test
    fun `dark color scheme has defaults matching idiomatic dark checkout`() {
        val dark = ColorScheme.Dark()

        assertThat(dark.colors.headerBackgroundColor).isEqualTo(Color.ResourceId(R.color.checkout_dark_bg))
        assertThat(dark.colors.headerTitleColor).isEqualTo(Color.ResourceId(R.color.checkout_dark_font))
        assertThat(dark.colors.webViewBackgroundColor).isEqualTo(Color.ResourceId(R.color.checkout_dark_bg))
        assertThat(dark.colors.progressIndicatorColor).isEqualTo(
            Color.ResourceId(R.color.checkout_dark_progress_indicator)
        )
        assertThat(dark.colors.headerBorderColor).isEqualTo(Color.ResourceId(R.color.checkout_dark_header_border))
        assertThat(dark.colors.closeIcon).isNull()
        assertThat(dark.colors.closeIconTintColor).isNull()
        assertThat(dark.colors.dragHandleColor).isNull()
        assertThat(dark.dragHandleColor(isDark = true)).isEqualTo(Color.ResourceId(R.color.checkout_dark_font))
    }

    @Test
    fun `light color scheme has defaults matching idiomatic light checkout`() {
        val light = ColorScheme.Light()

        assertThat(light.colors.headerBackgroundColor).isEqualTo(Color.ResourceId(R.color.checkout_light_bg))
        assertThat(light.colors.headerTitleColor).isEqualTo(
            Color.ResourceId(R.color.checkout_light_font)
        )
        assertThat(light.colors.webViewBackgroundColor).isEqualTo(Color.ResourceId(R.color.checkout_light_bg))
        assertThat(
            light.colors.progressIndicatorColor
        ).isEqualTo(
            Color.ResourceId(
                R.color.checkout_light_progress_indicator
            )
        )
        assertThat(light.colors.headerBorderColor).isEqualTo(Color.ResourceId(R.color.checkout_light_header_border))
        assertThat(light.colors.closeIcon).isNull()
        assertThat(light.colors.closeIconTintColor).isNull()
        assertThat(light.colors.dragHandleColor).isNull()
        assertThat(light.dragHandleColor(isDark = false)).isEqualTo(Color.ResourceId(R.color.checkout_light_font))
    }

    @Test
    fun `automatic color scheme has defaults matching both idiomatic light and dark checkout`() {
        val automatic = ColorScheme.Automatic()

        assertThat(automatic.darkColors.headerBackgroundColor).isEqualTo(Color.ResourceId(R.color.checkout_dark_bg))
        assertThat(automatic.darkColors.headerTitleColor).isEqualTo(Color.ResourceId(R.color.checkout_dark_font))
        assertThat(automatic.darkColors.webViewBackgroundColor).isEqualTo(Color.ResourceId(R.color.checkout_dark_bg))
        assertThat(
            automatic.darkColors.progressIndicatorColor
        ).isEqualTo(
            Color.ResourceId(
                R.color.checkout_dark_progress_indicator
            )
        )
        assertThat(
            automatic.darkColors.headerBorderColor
        ).isEqualTo(Color.ResourceId(R.color.checkout_dark_header_border))
        assertThat(automatic.darkColors.closeIcon).isNull()
        assertThat(automatic.darkColors.closeIconTintColor).isNull()
        assertThat(automatic.darkColors.dragHandleColor).isNull()
        assertThat(automatic.dragHandleColor(isDark = true)).isEqualTo(Color.ResourceId(R.color.checkout_dark_font))

        assertThat(automatic.lightColors.headerBackgroundColor).isEqualTo(Color.ResourceId(R.color.checkout_light_bg))
        assertThat(automatic.lightColors.headerTitleColor).isEqualTo(Color.ResourceId(R.color.checkout_light_font))
        assertThat(automatic.lightColors.webViewBackgroundColor).isEqualTo(Color.ResourceId(R.color.checkout_light_bg))
        assertThat(
            automatic.lightColors.progressIndicatorColor
        ).isEqualTo(Color.ResourceId(R.color.checkout_light_progress_indicator))
        assertThat(
            automatic.lightColors.headerBorderColor
        ).isEqualTo(Color.ResourceId(R.color.checkout_light_header_border))
        assertThat(automatic.lightColors.closeIcon).isNull()
        assertThat(automatic.lightColors.closeIconTintColor).isNull()
        assertThat(automatic.lightColors.dragHandleColor).isNull()
        assertThat(automatic.dragHandleColor(isDark = false)).isEqualTo(Color.ResourceId(R.color.checkout_light_font))
    }

    @Test
    fun `color schemes has a helper function for retrieving header background color`() {
        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackgroundColor = Color.ResourceId(1),
                headerTitleColor = Color.ResourceId(2),
                webViewBackgroundColor = Color.ResourceId(3),
                progressIndicatorColor = Color.ResourceId(4),
            ),
            darkColors = Colors(
                headerBackgroundColor = Color.ResourceId(5),
                headerTitleColor = Color.ResourceId(6),
                webViewBackgroundColor = Color.ResourceId(7),
                progressIndicatorColor = Color.ResourceId(8),
            )
        )

        assertThat(
            automatic.headerBackgroundColor(isDark = false)
        ).isEqualTo(Color.ResourceId(1))

        assertThat(
            automatic.headerBackgroundColor(isDark = true)
        ).isEqualTo(Color.ResourceId(5))
    }

    @Test
    fun `color schemes has a helper function for retrieving header title color`() {
        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackgroundColor = Color.ResourceId(1),
                headerTitleColor = Color.ResourceId(2),
                webViewBackgroundColor = Color.ResourceId(3),
                progressIndicatorColor = Color.ResourceId(4),
            ),
            darkColors = Colors(
                headerBackgroundColor = Color.ResourceId(5),
                headerTitleColor = Color.ResourceId(6),
                webViewBackgroundColor = Color.ResourceId(7),
                progressIndicatorColor = Color.ResourceId(8),
            )
        )

        assertThat(
            automatic.headerTitleColor(isDark = false)
        ).isEqualTo(Color.ResourceId(2))

        assertThat(
            automatic.headerTitleColor(isDark = true)
        ).isEqualTo(Color.ResourceId(6))
    }

    @Test
    fun `header border color uses configured colors and scheme-specific defaults`() {
        val lightBorder = Color.ResourceId(9)
        val darkBorder = Color.ResourceId(10)
        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackgroundColor = Color.ResourceId(1),
                headerTitleColor = Color.ResourceId(2),
                webViewBackgroundColor = Color.ResourceId(3),
                progressIndicatorColor = Color.ResourceId(4),
                headerBorderColor = lightBorder,
            ),
            darkColors = Colors(
                headerBackgroundColor = Color.ResourceId(5),
                headerTitleColor = Color.ResourceId(6),
                webViewBackgroundColor = Color.ResourceId(7),
                progressIndicatorColor = Color.ResourceId(8),
                headerBorderColor = darkBorder,
            ),
        )
        val customLightWithoutBorder = ColorScheme.Light(
            colors = Colors(
                headerBackgroundColor = Color.ResourceId(1),
                headerTitleColor = Color.ResourceId(2),
                webViewBackgroundColor = Color.ResourceId(3),
                progressIndicatorColor = Color.ResourceId(4),
            )
        )

        assertThat(automatic.headerBorderColor(isDark = false)).isEqualTo(lightBorder)
        assertThat(automatic.headerBorderColor(isDark = true)).isEqualTo(darkBorder)
        assertThat(customLightWithoutBorder.headerBorderColor(isDark = true))
            .isEqualTo(Color.ResourceId(R.color.checkout_light_header_border))
    }

    @Test
    fun `color schemes has a helper function for retrieving WebView background color`() {
        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackgroundColor = Color.ResourceId(1),
                headerTitleColor = Color.ResourceId(2),
                webViewBackgroundColor = Color.ResourceId(3),
                progressIndicatorColor = Color.ResourceId(4),
            ),
            darkColors = Colors(
                headerBackgroundColor = Color.ResourceId(5),
                headerTitleColor = Color.ResourceId(6),
                webViewBackgroundColor = Color.ResourceId(7),
                progressIndicatorColor = Color.ResourceId(8),
            )
        )

        assertThat(
            automatic.webViewBackgroundColor(isDark = false)
        ).isEqualTo(Color.ResourceId(3))

        assertThat(
            automatic.webViewBackgroundColor(isDark = true)
        ).isEqualTo(Color.ResourceId(7))
    }

    @Test
    fun `color scheme can be serialized`() {
        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackgroundColor = Color.ResourceId(1),
                headerTitleColor = Color.ResourceId(2),
                webViewBackgroundColor = Color.ResourceId(3),
                progressIndicatorColor = Color.ResourceId(4),
            ),
            darkColors = Colors(
                headerBackgroundColor = Color.ResourceId(5),
                headerTitleColor = Color.ResourceId(6),
                webViewBackgroundColor = Color.ResourceId(8),
                progressIndicatorColor = Color.ResourceId(9),
            )
        )

        val serialized = Json.encodeToString(ColorScheme.serializer(), automatic)

        assertThat(
            Json.decodeFromString(ColorScheme.serializer(), serialized)
        )
            .usingRecursiveComparison()
            .isEqualTo(automatic)
    }

    @Test
    fun `closeIcon can be overridden with custom drawable`() {
        val customIcon = DrawableResource(123)
        val light = ColorScheme.Light(
            colors = Colors(
                headerBackgroundColor = Color.ResourceId(R.color.checkout_light_bg),
                headerTitleColor = Color.ResourceId(R.color.checkout_light_font),
                webViewBackgroundColor = Color.ResourceId(R.color.checkout_light_bg),
                progressIndicatorColor = Color.ResourceId(R.color.checkout_light_progress_indicator),
                closeIcon = customIcon
            )
        )

        assertThat(light.colors.closeIcon).isEqualTo(customIcon)
    }

    @Test
    fun `closeIconTintColor can be overridden with custom color`() {
        val customTint = Color.ResourceId(456)
        val dark = ColorScheme.Dark(
            colors = Colors(
                headerBackgroundColor = Color.ResourceId(R.color.checkout_dark_bg),
                headerTitleColor = Color.ResourceId(R.color.checkout_dark_font),
                webViewBackgroundColor = Color.ResourceId(R.color.checkout_dark_bg),
                progressIndicatorColor = Color.ResourceId(R.color.checkout_dark_progress_indicator),
                closeIconTintColor = customTint
            )
        )

        assertThat(dark.colors.closeIconTintColor).isEqualTo(customTint)
    }

    @Test
    fun `closeIcon helper function returns correct icon for light mode`() {
        val lightIcon = DrawableResource(123)
        val darkIcon = DrawableResource(456)

        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackgroundColor = Color.ResourceId(1),
                headerTitleColor = Color.ResourceId(2),
                webViewBackgroundColor = Color.ResourceId(3),
                progressIndicatorColor = Color.ResourceId(4),
                closeIcon = lightIcon
            ),
            darkColors = Colors(
                headerBackgroundColor = Color.ResourceId(5),
                headerTitleColor = Color.ResourceId(6),
                webViewBackgroundColor = Color.ResourceId(7),
                progressIndicatorColor = Color.ResourceId(8),
                closeIcon = darkIcon
            )
        )

        assertThat(automatic.closeIcon(isDark = false)).isEqualTo(lightIcon)
        assertThat(automatic.closeIcon(isDark = true)).isEqualTo(darkIcon)
    }

    @Test
    fun `closeIconTintColor helper function returns correct tint for dark mode`() {
        val lightTint = Color.ResourceId(123)
        val darkTint = Color.ResourceId(456)

        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackgroundColor = Color.ResourceId(1),
                headerTitleColor = Color.ResourceId(2),
                webViewBackgroundColor = Color.ResourceId(3),
                progressIndicatorColor = Color.ResourceId(4),
                closeIconTintColor = lightTint
            ),
            darkColors = Colors(
                headerBackgroundColor = Color.ResourceId(5),
                headerTitleColor = Color.ResourceId(6),
                webViewBackgroundColor = Color.ResourceId(7),
                progressIndicatorColor = Color.ResourceId(8),
                closeIconTintColor = darkTint
            )
        )

        assertThat(automatic.closeIconTintColor(isDark = false)).isEqualTo(lightTint)
        assertThat(automatic.closeIconTintColor(isDark = true)).isEqualTo(darkTint)
    }

    @Test
    fun `dragHandleColor helper function returns correct color for automatic scheme`() {
        val lightHandle = Color.ResourceId(123)
        val darkHandle = Color.ResourceId(456)

        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackgroundColor = Color.ResourceId(1),
                headerTitleColor = Color.ResourceId(2),
                webViewBackgroundColor = Color.ResourceId(3),
                progressIndicatorColor = Color.ResourceId(4),
                dragHandleColor = lightHandle
            ),
            darkColors = Colors(
                headerBackgroundColor = Color.ResourceId(5),
                headerTitleColor = Color.ResourceId(6),
                webViewBackgroundColor = Color.ResourceId(7),
                progressIndicatorColor = Color.ResourceId(8),
                dragHandleColor = darkHandle
            )
        )

        assertThat(automatic.dragHandleColor(isDark = false)).isEqualTo(lightHandle)
        assertThat(automatic.dragHandleColor(isDark = true)).isEqualTo(darkHandle)
    }

    @Test
    fun `closeIcon helper function returns null when no custom icon is set`() {
        val light = ColorScheme.Light()
        val dark = ColorScheme.Dark()
        val automatic = ColorScheme.Automatic()

        assertThat(light.closeIcon(isDark = false)).isNull()
        assertThat(dark.closeIcon(isDark = true)).isNull()
        assertThat(automatic.closeIcon(isDark = false)).isNull()
        assertThat(automatic.closeIcon(isDark = true)).isNull()
    }

    @Test
    fun `closeIconTintColor helper function returns null when no custom tint is set`() {
        val light = ColorScheme.Light()
        val dark = ColorScheme.Dark()
        val automatic = ColorScheme.Automatic()

        assertThat(light.closeIconTintColor(isDark = false)).isNull()
        assertThat(dark.closeIconTintColor(isDark = true)).isNull()
        assertThat(automatic.closeIconTintColor(isDark = false)).isNull()
        assertThat(automatic.closeIconTintColor(isDark = true)).isNull()
    }

    @Test
    fun `dragHandleColor helper function falls back to header title color when no color is set`() {
        val light = ColorScheme.Light(
            colors = Colors(
                headerBackgroundColor = Color.ResourceId(1),
                headerTitleColor = Color.ResourceId(2),
                webViewBackgroundColor = Color.ResourceId(3),
                progressIndicatorColor = Color.ResourceId(4),
            )
        )
        val dark = ColorScheme.Dark(
            colors = Colors(
                headerBackgroundColor = Color.ResourceId(5),
                headerTitleColor = Color.ResourceId(6),
                webViewBackgroundColor = Color.ResourceId(7),
                progressIndicatorColor = Color.ResourceId(8),
            )
        )
        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackgroundColor = Color.ResourceId(13),
                headerTitleColor = Color.ResourceId(14),
                webViewBackgroundColor = Color.ResourceId(15),
                progressIndicatorColor = Color.ResourceId(16),
            ),
            darkColors = Colors(
                headerBackgroundColor = Color.ResourceId(17),
                headerTitleColor = Color.ResourceId(18),
                webViewBackgroundColor = Color.ResourceId(19),
                progressIndicatorColor = Color.ResourceId(20),
            )
        )

        assertThat(light.dragHandleColor(isDark = false)).isEqualTo(Color.ResourceId(2))
        assertThat(dark.dragHandleColor(isDark = true)).isEqualTo(Color.ResourceId(6))
        assertThat(automatic.dragHandleColor(isDark = false)).isEqualTo(Color.ResourceId(14))
        assertThat(automatic.dragHandleColor(isDark = true)).isEqualTo(Color.ResourceId(18))
    }

    @Test
    fun `customize allows easy modification of single properties`() {
        val originalScheme = ColorScheme.Light()
        val customTint = Color.ResourceId(456)

        val customizedScheme = originalScheme.customize {
            closeIconTintColor = customTint
        }

        assertThat(customizedScheme).isInstanceOf(ColorScheme.Light::class.java)
        val lightScheme = customizedScheme as ColorScheme.Light
        assertThat(lightScheme.colors.closeIconTintColor).isEqualTo(customTint)

        // Other properties should remain unchanged
        assertThat(lightScheme.colors.headerBackgroundColor).isEqualTo(originalScheme.colors.headerBackgroundColor)
        assertThat(lightScheme.colors.headerTitleColor).isEqualTo(originalScheme.colors.headerTitleColor)
    }

    @Test
    fun `customize with Java-friendly builder methods`() {
        val originalScheme = ColorScheme.Dark()
        val customIcon = DrawableResource(123)
        val customTint = Color.SRGB(0xFF0000)
        val customBorder = Color.SRGB(0xFF00FF)

        val customizedScheme = originalScheme.customize {
            withCloseIcon(customIcon)
                .withCloseIconTintColor(customTint)
                .withHeaderBorderColor(customBorder)
        }

        assertThat(customizedScheme).isInstanceOf(ColorScheme.Dark::class.java)
        val darkScheme = customizedScheme as ColorScheme.Dark
        assertThat(darkScheme.colors.closeIcon).isEqualTo(customIcon)
        assertThat(darkScheme.colors.closeIconTintColor).isEqualTo(customTint)
        assertThat(darkScheme.colors.headerBorderColor).isEqualTo(customBorder)
    }

    @Test
    fun `customize with automatic scheme applies to both light and dark`() {
        val originalScheme = ColorScheme.Automatic()
        val customTint = Color.ResourceId(789)

        val customizedScheme = originalScheme.customize {
            closeIconTintColor = customTint
        }

        assertThat(customizedScheme).isInstanceOf(ColorScheme.Automatic::class.java)
        val autoScheme = customizedScheme as ColorScheme.Automatic
        assertThat(autoScheme.lightColors.closeIconTintColor).isEqualTo(customTint)
        assertThat(autoScheme.darkColors.closeIconTintColor).isEqualTo(customTint)
    }

    @Test
    fun `customize with separate light and dark blocks for automatic scheme`() {
        val originalScheme = ColorScheme.Automatic()
        val lightTint = Color.ResourceId(111)
        val darkTint = Color.ResourceId(222)
        val lightHandle = Color.ResourceId(333)
        val darkHandle = Color.ResourceId(444)

        val customizedScheme = originalScheme.customize(
            light = {
                closeIconTintColor = lightTint
                dragHandleColor = lightHandle
            },
            dark = {
                closeIconTintColor = darkTint
                dragHandleColor = darkHandle
            }
        )

        assertThat(customizedScheme).isInstanceOf(ColorScheme.Automatic::class.java)
        val autoScheme = customizedScheme as ColorScheme.Automatic
        assertThat(autoScheme.lightColors.closeIconTintColor).isEqualTo(lightTint)
        assertThat(autoScheme.darkColors.closeIconTintColor).isEqualTo(darkTint)
        assertThat(autoScheme.lightColors.dragHandleColor).isEqualTo(lightHandle)
        assertThat(autoScheme.darkColors.dragHandleColor).isEqualTo(darkHandle)
    }

    @Test
    fun `customize with separate light and dark blocks applies only the dark block to a dark scheme`() {
        val lightTint = Color.ResourceId(111)
        val darkTint = Color.ResourceId(222)

        val customizedScheme = ColorScheme.Dark().customize(
            light = { closeIconTintColor = lightTint },
            dark = { closeIconTintColor = darkTint }
        )

        assertThat(customizedScheme).isInstanceOf(ColorScheme.Dark::class.java)
        assertThat((customizedScheme as ColorScheme.Dark).colors.closeIconTintColor).isEqualTo(darkTint)
    }

    @Test
    fun `customize with separate light and dark blocks applies only the light block to a light scheme`() {
        val lightTint = Color.ResourceId(111)
        val darkTint = Color.ResourceId(222)

        val customizedScheme = ColorScheme.Light().customize(
            light = { closeIconTintColor = lightTint },
            dark = { closeIconTintColor = darkTint }
        )

        assertThat(customizedScheme).isInstanceOf(ColorScheme.Light::class.java)
        assertThat((customizedScheme as ColorScheme.Light).colors.closeIconTintColor).isEqualTo(lightTint)
    }

    @Test
    fun `customize derives the drag handle color from a customized header title color`() {
        val customHeaderTitleColor = Color.ResourceId(99)

        val light = ColorScheme.Light().customize { headerTitleColor = customHeaderTitleColor }
        val dark = ColorScheme.Dark().customize { headerTitleColor = customHeaderTitleColor }
        val automatic = ColorScheme.Automatic().customize { headerTitleColor = customHeaderTitleColor }

        assertThat(light.dragHandleColor(isDark = false)).isEqualTo(customHeaderTitleColor)
        assertThat(dark.dragHandleColor(isDark = true)).isEqualTo(customHeaderTitleColor)
        assertThat(automatic.dragHandleColor(isDark = false)).isEqualTo(customHeaderTitleColor)
        assertThat(automatic.dragHandleColor(isDark = true)).isEqualTo(customHeaderTitleColor)
    }

    @Test
    fun `customize keeps an explicit drag handle color over a customized header title color`() {
        val customHeaderTitleColor = Color.ResourceId(99)
        val customHandle = Color.ResourceId(100)

        val light = ColorScheme.Light().customize {
            withHeaderTitleColor(customHeaderTitleColor).withDragHandleColor(customHandle)
        }

        assertThat(light.dragHandleColor(isDark = false)).isEqualTo(customHandle)
    }
}
