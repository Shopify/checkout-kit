package com.shopify.checkoutkit

import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class ColorSchemeTest {

    @Test
    fun `dark color scheme has defaults matching idiomatic dark checkout`() {
        val dark = ColorScheme.Dark()

        assertThat(dark.colors.headerBackground).isEqualTo(Color.ResourceId(R.color.checkoutDarkBg))
        assertThat(dark.colors.headerFont).isEqualTo(Color.ResourceId(R.color.checkoutDarkFont))
        assertThat(dark.colors.webViewBackground).isEqualTo(Color.ResourceId(R.color.checkoutDarkBg))
        assertThat(dark.colors.progressIndicator).isEqualTo(Color.ResourceId(R.color.checkoutDarkProgressIndicator))
        assertThat(dark.colors.headerBorderColor).isEqualTo(Color.ResourceId(R.color.checkoutDarkHeaderBorder))
        assertThat(dark.colors.closeIcon).isNull()
        assertThat(dark.colors.closeIconTint).isNull()
        assertThat(dark.colors.dragHandleColor).isNull()
        assertThat(dark.dragHandleColor(isDark = true)).isEqualTo(Color.ResourceId(R.color.checkoutDarkFont))
    }

    @Test
    fun `light color scheme has defaults matching idiomatic light checkout`() {
        val light = ColorScheme.Light()

        assertThat(light.colors.headerBackground).isEqualTo(Color.ResourceId(R.color.checkoutLightBg))
        assertThat(light.colors.headerFont).isEqualTo(Color.ResourceId(R.color.checkoutLightFont))
        assertThat(light.colors.webViewBackground).isEqualTo(Color.ResourceId(R.color.checkoutLightBg))
        assertThat(light.colors.progressIndicator).isEqualTo(Color.ResourceId(R.color.checkoutLightProgressIndicator))
        assertThat(light.colors.headerBorderColor).isEqualTo(Color.ResourceId(R.color.checkoutLightHeaderBorder))
        assertThat(light.colors.closeIcon).isNull()
        assertThat(light.colors.closeIconTint).isNull()
        assertThat(light.colors.dragHandleColor).isNull()
        assertThat(light.dragHandleColor(isDark = false)).isEqualTo(Color.ResourceId(R.color.checkoutLightFont))
    }

    @Test
    fun `automatic color scheme has defaults matching both idiomatic light and dark checkout`() {
        val automatic = ColorScheme.Automatic()

        assertThat(automatic.darkColors.headerBackground).isEqualTo(Color.ResourceId(R.color.checkoutDarkBg))
        assertThat(automatic.darkColors.headerFont).isEqualTo(Color.ResourceId(R.color.checkoutDarkFont))
        assertThat(automatic.darkColors.webViewBackground).isEqualTo(Color.ResourceId(R.color.checkoutDarkBg))
        assertThat(
            automatic.darkColors.progressIndicator
        ).isEqualTo(Color.ResourceId(R.color.checkoutDarkProgressIndicator))
        assertThat(automatic.darkColors.headerBorderColor).isEqualTo(Color.ResourceId(R.color.checkoutDarkHeaderBorder))
        assertThat(automatic.darkColors.closeIcon).isNull()
        assertThat(automatic.darkColors.closeIconTint).isNull()
        assertThat(automatic.darkColors.dragHandleColor).isNull()
        assertThat(automatic.dragHandleColor(isDark = true)).isEqualTo(Color.ResourceId(R.color.checkoutDarkFont))

        assertThat(automatic.lightColors.headerBackground).isEqualTo(Color.ResourceId(R.color.checkoutLightBg))
        assertThat(automatic.lightColors.headerFont).isEqualTo(Color.ResourceId(R.color.checkoutLightFont))
        assertThat(automatic.lightColors.webViewBackground).isEqualTo(Color.ResourceId(R.color.checkoutLightBg))
        assertThat(
            automatic.lightColors.progressIndicator
        ).isEqualTo(Color.ResourceId(R.color.checkoutLightProgressIndicator))
        assertThat(
            automatic.lightColors.headerBorderColor
        ).isEqualTo(Color.ResourceId(R.color.checkoutLightHeaderBorder))
        assertThat(automatic.lightColors.closeIcon).isNull()
        assertThat(automatic.lightColors.closeIconTint).isNull()
        assertThat(automatic.lightColors.dragHandleColor).isNull()
        assertThat(automatic.dragHandleColor(isDark = false)).isEqualTo(Color.ResourceId(R.color.checkoutLightFont))
    }

    @Test
    fun `color schemes has a helper function for retrieving header background color`() {
        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackground = Color.ResourceId(1),
                headerFont = Color.ResourceId(2),
                webViewBackground = Color.ResourceId(3),
                progressIndicator = Color.ResourceId(4),
            ),
            darkColors = Colors(
                headerBackground = Color.ResourceId(5),
                headerFont = Color.ResourceId(6),
                webViewBackground = Color.ResourceId(7),
                progressIndicator = Color.ResourceId(8),
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
    fun `color schemes has a helper function for retrieving header font color`() {
        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackground = Color.ResourceId(1),
                headerFont = Color.ResourceId(2),
                webViewBackground = Color.ResourceId(3),
                progressIndicator = Color.ResourceId(4),
            ),
            darkColors = Colors(
                headerBackground = Color.ResourceId(5),
                headerFont = Color.ResourceId(6),
                webViewBackground = Color.ResourceId(7),
                progressIndicator = Color.ResourceId(8),
            )
        )

        assertThat(
            automatic.headerFontColor(isDark = false)
        ).isEqualTo(Color.ResourceId(2))

        assertThat(
            automatic.headerFontColor(isDark = true)
        ).isEqualTo(Color.ResourceId(6))
    }

    @Test
    fun `header border color uses configured colors and scheme-specific defaults`() {
        val lightBorder = Color.ResourceId(9)
        val darkBorder = Color.ResourceId(10)
        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackground = Color.ResourceId(1),
                headerFont = Color.ResourceId(2),
                webViewBackground = Color.ResourceId(3),
                progressIndicator = Color.ResourceId(4),
                headerBorderColor = lightBorder,
            ),
            darkColors = Colors(
                headerBackground = Color.ResourceId(5),
                headerFont = Color.ResourceId(6),
                webViewBackground = Color.ResourceId(7),
                progressIndicator = Color.ResourceId(8),
                headerBorderColor = darkBorder,
            ),
        )
        val customLightWithoutBorder = ColorScheme.Light(
            colors = Colors(
                headerBackground = Color.ResourceId(1),
                headerFont = Color.ResourceId(2),
                webViewBackground = Color.ResourceId(3),
                progressIndicator = Color.ResourceId(4),
            )
        )

        assertThat(automatic.headerBorderColor(isDark = false)).isEqualTo(lightBorder)
        assertThat(automatic.headerBorderColor(isDark = true)).isEqualTo(darkBorder)
        assertThat(customLightWithoutBorder.headerBorderColor(isDark = true))
            .isEqualTo(Color.ResourceId(R.color.checkoutLightHeaderBorder))
    }

    @Test
    fun `color schemes has a helper function for retrieving WebView background color`() {
        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackground = Color.ResourceId(1),
                headerFont = Color.ResourceId(2),
                webViewBackground = Color.ResourceId(3),
                progressIndicator = Color.ResourceId(4),
            ),
            darkColors = Colors(
                headerBackground = Color.ResourceId(5),
                headerFont = Color.ResourceId(6),
                webViewBackground = Color.ResourceId(7),
                progressIndicator = Color.ResourceId(8),
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
                headerBackground = Color.ResourceId(1),
                headerFont = Color.ResourceId(2),
                webViewBackground = Color.ResourceId(3),
                progressIndicator = Color.ResourceId(4),
            ),
            darkColors = Colors(
                headerBackground = Color.ResourceId(5),
                headerFont = Color.ResourceId(6),
                webViewBackground = Color.ResourceId(8),
                progressIndicator = Color.ResourceId(9),
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
                headerBackground = Color.ResourceId(R.color.checkoutLightBg),
                headerFont = Color.ResourceId(R.color.checkoutLightFont),
                webViewBackground = Color.ResourceId(R.color.checkoutLightBg),
                progressIndicator = Color.ResourceId(R.color.checkoutLightProgressIndicator),
                closeIcon = customIcon
            )
        )

        assertThat(light.colors.closeIcon).isEqualTo(customIcon)
    }

    @Test
    fun `closeIconTint can be overridden with custom color`() {
        val customTint = Color.ResourceId(456)
        val dark = ColorScheme.Dark(
            colors = Colors(
                headerBackground = Color.ResourceId(R.color.checkoutDarkBg),
                headerFont = Color.ResourceId(R.color.checkoutDarkFont),
                webViewBackground = Color.ResourceId(R.color.checkoutDarkBg),
                progressIndicator = Color.ResourceId(R.color.checkoutDarkProgressIndicator),
                closeIconTint = customTint
            )
        )

        assertThat(dark.colors.closeIconTint).isEqualTo(customTint)
    }

    @Test
    fun `closeIcon helper function returns correct icon for light mode`() {
        val lightIcon = DrawableResource(123)
        val darkIcon = DrawableResource(456)

        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackground = Color.ResourceId(1),
                headerFont = Color.ResourceId(2),
                webViewBackground = Color.ResourceId(3),
                progressIndicator = Color.ResourceId(4),
                closeIcon = lightIcon
            ),
            darkColors = Colors(
                headerBackground = Color.ResourceId(5),
                headerFont = Color.ResourceId(6),
                webViewBackground = Color.ResourceId(7),
                progressIndicator = Color.ResourceId(8),
                closeIcon = darkIcon
            )
        )

        assertThat(automatic.closeIcon(isDark = false)).isEqualTo(lightIcon)
        assertThat(automatic.closeIcon(isDark = true)).isEqualTo(darkIcon)
    }

    @Test
    fun `closeIconTint helper function returns correct tint for dark mode`() {
        val lightTint = Color.ResourceId(123)
        val darkTint = Color.ResourceId(456)

        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackground = Color.ResourceId(1),
                headerFont = Color.ResourceId(2),
                webViewBackground = Color.ResourceId(3),
                progressIndicator = Color.ResourceId(4),
                closeIconTint = lightTint
            ),
            darkColors = Colors(
                headerBackground = Color.ResourceId(5),
                headerFont = Color.ResourceId(6),
                webViewBackground = Color.ResourceId(7),
                progressIndicator = Color.ResourceId(8),
                closeIconTint = darkTint
            )
        )

        assertThat(automatic.closeIconTint(isDark = false)).isEqualTo(lightTint)
        assertThat(automatic.closeIconTint(isDark = true)).isEqualTo(darkTint)
    }

    @Test
    fun `dragHandleColor helper function returns correct color for automatic scheme`() {
        val lightHandle = Color.ResourceId(123)
        val darkHandle = Color.ResourceId(456)

        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackground = Color.ResourceId(1),
                headerFont = Color.ResourceId(2),
                webViewBackground = Color.ResourceId(3),
                progressIndicator = Color.ResourceId(4),
                dragHandleColor = lightHandle
            ),
            darkColors = Colors(
                headerBackground = Color.ResourceId(5),
                headerFont = Color.ResourceId(6),
                webViewBackground = Color.ResourceId(7),
                progressIndicator = Color.ResourceId(8),
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
    fun `closeIconTint helper function returns null when no custom tint is set`() {
        val light = ColorScheme.Light()
        val dark = ColorScheme.Dark()
        val automatic = ColorScheme.Automatic()

        assertThat(light.closeIconTint(isDark = false)).isNull()
        assertThat(dark.closeIconTint(isDark = true)).isNull()
        assertThat(automatic.closeIconTint(isDark = false)).isNull()
        assertThat(automatic.closeIconTint(isDark = true)).isNull()
    }

    @Test
    fun `dragHandleColor helper function falls back to header font when no color is set`() {
        val light = ColorScheme.Light(
            colors = Colors(
                headerBackground = Color.ResourceId(1),
                headerFont = Color.ResourceId(2),
                webViewBackground = Color.ResourceId(3),
                progressIndicator = Color.ResourceId(4),
            )
        )
        val dark = ColorScheme.Dark(
            colors = Colors(
                headerBackground = Color.ResourceId(5),
                headerFont = Color.ResourceId(6),
                webViewBackground = Color.ResourceId(7),
                progressIndicator = Color.ResourceId(8),
            )
        )
        val automatic = ColorScheme.Automatic(
            lightColors = Colors(
                headerBackground = Color.ResourceId(13),
                headerFont = Color.ResourceId(14),
                webViewBackground = Color.ResourceId(15),
                progressIndicator = Color.ResourceId(16),
            ),
            darkColors = Colors(
                headerBackground = Color.ResourceId(17),
                headerFont = Color.ResourceId(18),
                webViewBackground = Color.ResourceId(19),
                progressIndicator = Color.ResourceId(20),
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
            closeIconTint = customTint
        }

        assertThat(customizedScheme).isInstanceOf(ColorScheme.Light::class.java)
        val lightScheme = customizedScheme as ColorScheme.Light
        assertThat(lightScheme.colors.closeIconTint).isEqualTo(customTint)

        // Other properties should remain unchanged
        assertThat(lightScheme.colors.headerBackground).isEqualTo(originalScheme.colors.headerBackground)
        assertThat(lightScheme.colors.headerFont).isEqualTo(originalScheme.colors.headerFont)
    }

    @Test
    fun `customize with Java-friendly builder methods`() {
        val originalScheme = ColorScheme.Dark()
        val customIcon = DrawableResource(123)
        val customTint = Color.SRGB(0xFF0000)
        val customBorder = Color.SRGB(0xFF00FF)

        val customizedScheme = originalScheme.customize {
            withCloseIcon(customIcon)
                .withCloseIconTint(customTint)
                .withHeaderBorderColor(customBorder)
        }

        assertThat(customizedScheme).isInstanceOf(ColorScheme.Dark::class.java)
        val darkScheme = customizedScheme as ColorScheme.Dark
        assertThat(darkScheme.colors.closeIcon).isEqualTo(customIcon)
        assertThat(darkScheme.colors.closeIconTint).isEqualTo(customTint)
        assertThat(darkScheme.colors.headerBorderColor).isEqualTo(customBorder)
    }

    @Test
    fun `customize with automatic scheme applies to both light and dark`() {
        val originalScheme = ColorScheme.Automatic()
        val customTint = Color.ResourceId(789)

        val customizedScheme = originalScheme.customize {
            closeIconTint = customTint
        }

        assertThat(customizedScheme).isInstanceOf(ColorScheme.Automatic::class.java)
        val autoScheme = customizedScheme as ColorScheme.Automatic
        assertThat(autoScheme.lightColors.closeIconTint).isEqualTo(customTint)
        assertThat(autoScheme.darkColors.closeIconTint).isEqualTo(customTint)
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
                closeIconTint = lightTint
                dragHandleColor = lightHandle
            },
            dark = {
                closeIconTint = darkTint
                dragHandleColor = darkHandle
            }
        )

        assertThat(customizedScheme).isInstanceOf(ColorScheme.Automatic::class.java)
        val autoScheme = customizedScheme as ColorScheme.Automatic
        assertThat(autoScheme.lightColors.closeIconTint).isEqualTo(lightTint)
        assertThat(autoScheme.darkColors.closeIconTint).isEqualTo(darkTint)
        assertThat(autoScheme.lightColors.dragHandleColor).isEqualTo(lightHandle)
        assertThat(autoScheme.darkColors.dragHandleColor).isEqualTo(darkHandle)
    }

    @Test
    fun `customize derives the drag handle color from a customized header font`() {
        val customFont = Color.ResourceId(99)

        val light = ColorScheme.Light().customize { headerFont = customFont }
        val dark = ColorScheme.Dark().customize { headerFont = customFont }
        val automatic = ColorScheme.Automatic().customize { headerFont = customFont }

        assertThat(light.dragHandleColor(isDark = false)).isEqualTo(customFont)
        assertThat(dark.dragHandleColor(isDark = true)).isEqualTo(customFont)
        assertThat(automatic.dragHandleColor(isDark = false)).isEqualTo(customFont)
        assertThat(automatic.dragHandleColor(isDark = true)).isEqualTo(customFont)
    }

    @Test
    fun `customize keeps an explicit drag handle color over a customized header font`() {
        val customFont = Color.ResourceId(99)
        val customHandle = Color.ResourceId(100)

        val light = ColorScheme.Light().customize {
            withHeaderFont(customFont).withDragHandleColor(customHandle)
        }

        assertThat(light.dragHandleColor(isDark = false)).isEqualTo(customHandle)
    }
}
