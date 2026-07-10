package com.shopify.checkoutkit

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
)

public data class Preloading(
    public val enabled: Boolean = true,
)

public enum class LogLevel {
    DEBUG, WARN, ERROR
}

public sealed class Platform(
    public val identifier: String,
    public val version: String? = null,
) {
    public class ReactNative @JvmOverloads constructor(
        version: String? = null
    ) : Platform("ReactNative", version)
}
