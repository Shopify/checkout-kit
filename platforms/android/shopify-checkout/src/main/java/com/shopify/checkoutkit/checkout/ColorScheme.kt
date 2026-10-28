package com.shopify.checkoutkit.checkout

import android.content.Context
import androidx.annotation.ColorInt
import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.core.content.ContextCompat.getColor
import kotlinx.serialization.Serializable

/**
 * The color scheme to be used when presenting checkout.
 *
 * This determines the color of both web elements (displayed in the WebView) as well as native elements
 * such as the header background color and header title color.
 */
@Serializable
public sealed class ColorScheme(public val id: String) {
    /**
     * Always show checkout in an idiomatic light color scheme.
     */
    @Serializable
    public data class Light(public val colors: Colors = defaultLightColors) : ColorScheme("light")

    /**
     * Always show checkout in an idiomatic dark color scheme.
     */
    @Serializable
    public data class Dark(public val colors: Colors = defaultDarkColors) : ColorScheme("dark")

    /**
     * Automatically toggle between idiomatic light and dark color schemes based on device preference.
     * @property lightColors The color scheme to use when the device is in light mode.
     * @property darkColors The color scheme to use when the device is in dark mode.
     */
    @Serializable
    public data class Automatic(
        public val lightColors: Colors = defaultLightColors,
        public val darkColors: Colors = defaultDarkColors
    ) : ColorScheme("automatic")

    internal fun headerBackgroundColor(isDark: Boolean) = when (this) {
        is Automatic -> if (isDark) this.darkColors.headerBackgroundColor else this.lightColors.headerBackgroundColor
        is Dark -> this.colors.headerBackgroundColor
        is Light -> this.colors.headerBackgroundColor
    }

    internal fun webViewBackgroundColor(isDark: Boolean) = when (this) {
        is Automatic -> if (isDark) this.darkColors.webViewBackgroundColor else this.lightColors.webViewBackgroundColor
        is Dark -> this.colors.webViewBackgroundColor
        is Light -> this.colors.webViewBackgroundColor
    }

    internal fun headerTitleColor(isDark: Boolean) = when (this) {
        is Automatic -> if (isDark) this.darkColors.headerTitleColor else this.lightColors.headerTitleColor
        is Dark -> this.colors.headerTitleColor
        is Light -> this.colors.headerTitleColor
    }

    internal fun headerBorderColor(isDark: Boolean): Color {
        val (color, defaultColor) = when (this) {
            is Automatic -> if (isDark) {
                this.darkColors.headerBorderColor to R.color.checkout_dark_header_border
            } else {
                this.lightColors.headerBorderColor to R.color.checkout_light_header_border
            }
            is Dark -> this.colors.headerBorderColor to R.color.checkout_dark_header_border
            is Light -> this.colors.headerBorderColor to R.color.checkout_light_header_border
        }
        return color ?: Color.ResourceId(defaultColor)
    }

    internal fun progressIndicatorColor(isDark: Boolean) = when (this) {
        is Automatic -> if (isDark) this.darkColors.progressIndicatorColor else this.lightColors.progressIndicatorColor
        is Dark -> this.colors.progressIndicatorColor
        is Light -> this.colors.progressIndicatorColor
    }

    internal fun dragHandleColor(isDark: Boolean): Color {
        val colors = when (this) {
            is Automatic -> if (isDark) this.darkColors else this.lightColors
            is Dark -> this.colors
            is Light -> this.colors
        }
        return colors.dragHandleColor ?: colors.headerTitleColor
    }

    internal fun closeIcon(isDark: Boolean) = when (this) {
        is Automatic -> if (isDark) this.darkColors.closeIcon else this.lightColors.closeIcon
        is Dark -> this.colors.closeIcon
        is Light -> this.colors.closeIcon
    }

    internal fun closeIconTintColor(isDark: Boolean) = when (this) {
        is Automatic -> if (isDark) this.darkColors.closeIconTintColor else this.lightColors.closeIconTintColor
        is Dark -> this.colors.closeIconTintColor
        is Light -> this.colors.closeIconTintColor
    }

    /**
     * Creates a customized copy of a ColorScheme, facilitating modification of individual color properties
     *
     * @param block A lambda that configures colors
     * @return A new ColorScheme instance with the customized colors
     */
    public fun customize(block: ColorsBuilder.() -> Unit): ColorScheme {
        return when (this) {
            is Light -> {
                val builder = ColorsBuilder(colors)
                builder.block()
                copy(colors = builder.build())
            }

            is Dark -> {
                val builder = ColorsBuilder(colors)
                builder.block()
                copy(colors = builder.build())
            }

            is Automatic -> {
                val lightBuilder = ColorsBuilder(lightColors)
                val darkBuilder = ColorsBuilder(darkColors)
                lightBuilder.block()
                darkBuilder.block()
                copy(
                    lightColors = lightBuilder.build(),
                    darkColors = darkBuilder.build()
                )
            }
        }
    }

    /**
     * Creates a customized copy of a ColorScheme with separate light and dark customizations.
     *
     * [Light] applies only [light], [Dark] applies only [dark], and [Automatic] applies [light] to its light
     * colors and [dark] to its dark colors.
     *
     * @param light A lambda that configures the light mode colors
     * @param dark A lambda that configures the dark mode colors
     * @return A new ColorScheme instance with the customized colors
     */
    public fun customize(
        light: ColorsBuilder.() -> Unit,
        dark: ColorsBuilder.() -> Unit
    ): ColorScheme {
        return when (this) {
            is Light -> {
                val builder = ColorsBuilder(colors)
                builder.light()
                copy(colors = builder.build())
            }

            is Dark -> {
                val builder = ColorsBuilder(colors)
                builder.dark()
                copy(colors = builder.build())
            }

            is Automatic -> {
                val lightBuilder = ColorsBuilder(lightColors)
                val darkBuilder = ColorsBuilder(darkColors)
                lightBuilder.light()
                darkBuilder.dark()
                copy(
                    lightColors = lightBuilder.build(),
                    darkColors = darkBuilder.build()
                )
            }
        }
    }
}

/**
 * Specifies the colors for native elements within a ColorScheme.
 *
 * A Colors instance can be passed into a ColorScheme to override its defaults. Storefront appearance
 * colors can be overridden through [CheckoutAppearance.Storefront.customize]. Colors that can be overridden are:
 * - The WebView background color,
 * - The native header background color and header title color,
 * - The header border shown when checkout content scrolls beneath it,
 * - The progress/loading indicator,
 * - The optional drag handle, which follows the header title color when it is not set.
 *
 * @see ColorScheme
 * @see CheckoutAppearance.Storefront
 */
@Serializable
public data class Colors(
    val webViewBackgroundColor: Color,
    val headerBackgroundColor: Color,
    val headerTitleColor: Color,
    val progressIndicatorColor: Color,
    val closeIcon: DrawableResource? = null,
    val closeIconTintColor: Color? = null,
    val dragHandleColor: Color? = null,
    val headerBorderColor: Color? = null,
)

/**
 * Builder class for customizing Colors objects in an ergonomic way.
 */
public class ColorsBuilder internal constructor(private val baseColors: Colors) {
    public var webViewBackgroundColor: Color? = null
    public var headerBackgroundColor: Color? = null
    public var headerTitleColor: Color? = null
    public var progressIndicatorColor: Color? = null
    public var closeIcon: DrawableResource? = null
    public var closeIconTintColor: Color? = null
    public var dragHandleColor: Color? = null
    public var headerBorderColor: Color? = null

    public fun withWebViewBackgroundColor(color: Color): ColorsBuilder {
        webViewBackgroundColor = color
        return this
    }

    public fun withHeaderBackgroundColor(color: Color): ColorsBuilder {
        headerBackgroundColor = color
        return this
    }

    public fun withHeaderTitleColor(color: Color): ColorsBuilder {
        headerTitleColor = color
        return this
    }

    public fun withProgressIndicatorColor(color: Color): ColorsBuilder {
        progressIndicatorColor = color
        return this
    }

    public fun withDragHandleColor(color: Color): ColorsBuilder {
        dragHandleColor = color
        return this
    }

    public fun withHeaderBorderColor(color: Color): ColorsBuilder {
        headerBorderColor = color
        return this
    }

    public fun withCloseIcon(icon: DrawableResource): ColorsBuilder {
        closeIcon = icon
        return this
    }

    public fun withCloseIconTintColor(color: Color): ColorsBuilder {
        closeIconTintColor = color
        return this
    }

    internal fun build(): Colors {
        return baseColors.copy(
            webViewBackgroundColor = webViewBackgroundColor ?: baseColors.webViewBackgroundColor,
            headerBackgroundColor = headerBackgroundColor ?: baseColors.headerBackgroundColor,
            headerTitleColor = headerTitleColor ?: baseColors.headerTitleColor,
            progressIndicatorColor = progressIndicatorColor ?: baseColors.progressIndicatorColor,
            closeIcon = closeIcon ?: baseColors.closeIcon,
            closeIconTintColor = closeIconTintColor ?: baseColors.closeIconTintColor,
            dragHandleColor = dragHandleColor ?: baseColors.dragHandleColor,
            headerBorderColor = headerBorderColor ?: baseColors.headerBorderColor,
        )
    }
}

/**
 * Represents a color which can be either a resource id or an sRGB value.
 */
@Serializable
public sealed class Color {
    /**
     * Represents a color in sRGB color space.
     * @property sRGB The sRGB value of the color.
     */
    @Serializable
    public data class SRGB(public val sRGB: Int) : Color()

    /**
     * Represents a color as a resource id (e.g. {@code android.R.color.black}).
     * @property id The resource id of the color.
     */
    @Serializable
    public data class ResourceId(
        @param:ColorRes
        @get:ColorRes
        public val id: Int
    ) : Color()

    /**
     * Returns the color value.
     * @param context The context to use when retrieving the color.
     * @return The color value.
     */
    @ColorInt
    public fun getValue(context: Context): Int = when (this) {
        is ResourceId -> getColor(context, this.id)
        is SRGB -> this.sRGB
    }
}

/**
 * Represents a drawable resource.
 */
@Serializable
public data class DrawableResource(
    @param:DrawableRes
    @get:DrawableRes
    public val id: Int
)

private val defaultLightColors = Colors(
    webViewBackgroundColor = Color.ResourceId(R.color.checkout_light_bg),
    headerBackgroundColor = Color.ResourceId(R.color.checkout_light_bg),
    headerTitleColor = Color.ResourceId(R.color.checkout_light_font),
    progressIndicatorColor = Color.ResourceId(R.color.checkout_light_progress_indicator),
    headerBorderColor = Color.ResourceId(R.color.checkout_light_header_border),
)

private val defaultDarkColors = Colors(
    webViewBackgroundColor = Color.ResourceId(R.color.checkout_dark_bg),
    headerBackgroundColor = Color.ResourceId(R.color.checkout_dark_bg),
    headerTitleColor = Color.ResourceId(R.color.checkout_dark_font),
    progressIndicatorColor = Color.ResourceId(R.color.checkout_dark_progress_indicator),
    headerBorderColor = Color.ResourceId(R.color.checkout_dark_header_border),
)
