package com.shopify.reactnative.checkoutkit

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap
import com.shopify.checkoutkit.checkout.CheckoutAppearance
import com.shopify.checkoutkit.checkout.Color
import com.shopify.checkoutkit.checkout.ColorScheme
import com.shopify.checkoutkit.checkout.ColorsBuilder

/**
 * Maps the JavaScript `appearance` configuration to a native [CheckoutAppearance].
 *
 * Every valid appearance is built from the native defaults plus the given colors, so colors from an earlier
 * appearance never carry over. A missing or invalid appearance keeps the current one.
 */
internal object CheckoutAppearanceConfiguration {
    private const val APP_APPEARANCE_TYPE = "app"
    private const val STOREFRONT_APPEARANCE_TYPE = "storefront"

    @JvmStatic
    fun update(appearance: CheckoutAppearance, configuration: ReadableMap): CheckoutAppearance {
        val appearanceConfiguration = mapFor(configuration, "appearance") ?: return appearance
        val colors = mapFor(mapFor(appearanceConfiguration, "colors"), "android")

        return when (stringFor(appearanceConfiguration, "type")) {
            STOREFRONT_APPEARANCE_TYPE -> CheckoutAppearance.Storefront().customize { applyColors(colors, this) }
            APP_APPEARANCE_TYPE -> {
                val colorScheme = if (appearanceConfiguration.hasKey("colorScheme")) {
                    stringFor(appearanceConfiguration, "colorScheme") ?: return appearance
                } else {
                    ColorScheme.Automatic().id
                }
                colorSchemeFor(colorScheme, colors)?.let { CheckoutAppearance.App(it) } ?: appearance
            }
            else -> appearance
        }
    }

    @JvmStatic
    fun appearanceResultFor(appearance: CheckoutAppearance): WritableMap {
        val result = Arguments.createMap()
        when (appearance) {
            is CheckoutAppearance.App -> {
                result.putString("type", APP_APPEARANCE_TYPE)
                result.putString("colorScheme", appearance.colorScheme.id)
            }
            is CheckoutAppearance.Storefront -> result.putString("type", STOREFRONT_APPEARANCE_TYPE)
        }
        return result
    }

    private fun colorSchemeFor(colorScheme: String, colors: ReadableMap?): ColorScheme? = when (colorScheme) {
        ColorScheme.Light().id -> ColorScheme.Light().customize { applyColors(colors, this) }
        ColorScheme.Dark().id -> ColorScheme.Dark().customize { applyColors(colors, this) }
        ColorScheme.Automatic().id -> ColorScheme.Automatic().customize(
            light = {
                applyColors(colors, this)
                applyColors(mapFor(colors, "light"), this)
            },
            dark = {
                applyColors(colors, this)
                applyColors(mapFor(colors, "dark"), this)
            },
        )
        else -> null
    }

    /**
     * Applies the valid colors in [configuration]. The builder starts from the native defaults, so clearing an
     * optional color restores its default.
     */
    private fun applyColors(configuration: ReadableMap?, colors: ColorsBuilder) {
        parseColor(stringFor(configuration, "webViewBackgroundColor"))?.let { colors.webViewBackground = it }
        parseColor(stringFor(configuration, "headerBackgroundColor"))?.let { colors.headerBackground = it }
        parseColor(stringFor(configuration, "headerTitleColor"))?.let { colors.headerFont = it }
        parseColor(stringFor(configuration, "progressIndicatorColor"))?.let { colors.progressIndicator = it }
        applyOptionalColor(configuration, "closeIconTintColor") { colors.closeIconTint = it }
        applyOptionalColor(configuration, "headerBorderColor") { colors.headerBorderColor = it }
        applyOptionalColor(configuration, "dragHandleColor") { colors.dragHandleColor = it }
    }

    private fun applyOptionalColor(configuration: ReadableMap?, key: String, setColor: (Color?) -> Unit) {
        if (configuration == null || !configuration.hasKey(key)) return
        if (configuration.isNull(key)) {
            setColor(null)
        } else {
            parseColor(stringFor(configuration, key))?.let(setColor)
        }
    }

    private fun mapFor(configuration: ReadableMap?, key: String): ReadableMap? {
        if (configuration == null || !configuration.hasKey(key) || configuration.getType(key) != ReadableType.Map) {
            return null
        }
        return configuration.getMap(key)
    }

    private fun stringFor(configuration: ReadableMap?, key: String): String? {
        if (configuration == null || !configuration.hasKey(key) || configuration.getType(key) != ReadableType.String) {
            return null
        }
        return configuration.getString(key)
    }

    /** Parses `RRGGBB` (opaque) or `AARRGGBB` hex, with an optional leading `#`. */
    private fun parseColor(value: String?): Color? {
        val hex = value?.trim()?.removePrefix("#") ?: return null
        if (hex.length != 6 && hex.length != 8) return null
        if (!hex.all { it in '0'..'9' || it in 'a'..'f' || it in 'A'..'F' }) return null
        val parsed = hex.toLong(16)
        val argb = if (hex.length == 6) parsed or 0xFF000000 else parsed
        return Color.SRGB(argb.toInt())
    }
}
