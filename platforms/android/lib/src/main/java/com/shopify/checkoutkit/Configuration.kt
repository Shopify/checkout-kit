package com.shopify.checkoutkit

import android.content.Context

/**
 * Configuration for Shopify Checkout Kit.
 *
 * Allows specifying the colors, sheet presentation, and runtime behavior that should be used for checkout.
 */
@ConsistentCopyVisibility
public data class Configuration internal constructor(
    var appearance: CheckoutAppearance = CheckoutAppearance.Storefront(),
    var sheet: CheckoutSheetOptions = CheckoutSheetOptions(),
    var platform: Platform? = null,
    var logLevel: LogLevel = LogLevel.WARN,
    var preloading: Preloading = Preloading(),
    var title: String? = null,
)

/**
 * Resolves the checkout sheet header title, preferring a runtime-configured title over the localized default.
 */
internal fun Configuration.resolveCheckoutTitle(context: Context): String =
    title ?: context.getString(R.string.checkout_web_view_title)

public data class Preloading(
    public val enabled: Boolean = true,
)

public enum class LogLevel {
    DEBUG, WARN, ERROR, NONE
}

public sealed class Platform(
    public val identifier: String,
    public val version: String? = null,
) {
    public class ReactNative @JvmOverloads constructor(
        version: String? = null
    ) : Platform("ReactNative", version)
}
