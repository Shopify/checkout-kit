package com.shopify.checkoutkit

/**
 * Configuration for Shopify Checkout Kit.
 *
 * Allows specifying the colorScheme that should be used for checkout.
 */
public data class Configuration internal constructor(
    var colorScheme: ColorScheme = ColorScheme.Automatic(),
    var platform: Platform? = null,
    var logLevel: LogLevel = LogLevel.WARN,
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
