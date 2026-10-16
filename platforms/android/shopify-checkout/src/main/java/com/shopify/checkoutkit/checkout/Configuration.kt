package com.shopify.checkoutkit.checkout

import android.content.Context

/**
 * Configuration for Shopify Checkout Kit.
 *
 * Allows specifying the colors, sheet presentation, and runtime behavior that should be used for checkout.
 *
 * @property allowedMessageOrigins Extra origins allowed to post incoming checkout-protocol messages.
 * Native checkout is open by default: leaving this empty trusts every origin. Once populated, the
 * effective allowlist is these origins plus the cart URL origin and Shopify-owned `shop.app` and
 * `shop.com` domains (including their subdomains). Entries may be exact origins
 * (`https://example.com`), scheme-qualified wildcard
 * subdomains (`https://&#42;.example.com`), or `"*"` to explicitly trust every origin.
 * Messages dropped by origin validation are logged as warnings.
 */
public class Configuration internal constructor() {
    public var appearance: CheckoutAppearance = CheckoutAppearance.Storefront()
    public var sheet: CheckoutSheetOptions = CheckoutSheetOptions()
    public var platform: Platform? = null
    public var logLevel: LogLevel = LogLevel.WARN
    public var preloading: Preloading = Preloading()
    public var title: String? = null
    public var allowedMessageOrigins: Set<String> = emptySet()
    public var telemetry: Telemetry = Telemetry()

    internal fun snapshot(): Configuration = Configuration().also {
        it.appearance = appearance
        it.sheet = sheet
        it.platform = platform
        it.logLevel = logLevel
        it.preloading = preloading
        it.title = title
        it.allowedMessageOrigins = allowedMessageOrigins
        it.telemetry = telemetry
    }

    override fun equals(other: Any?): Boolean =
        other is Configuration &&
            appearance == other.appearance &&
            sheet == other.sheet &&
            platform == other.platform &&
            logLevel == other.logLevel &&
            preloading == other.preloading &&
            title == other.title &&
            allowedMessageOrigins == other.allowedMessageOrigins &&
            telemetry == other.telemetry

    override fun hashCode(): Int {
        var result = appearance.hashCode()
        result = 31 * result + sheet.hashCode()
        result = 31 * result + (platform?.hashCode() ?: 0)
        result = 31 * result + logLevel.hashCode()
        result = 31 * result + preloading.hashCode()
        result = 31 * result + (title?.hashCode() ?: 0)
        result = 31 * result + allowedMessageOrigins.hashCode()
        result = 31 * result + telemetry.hashCode()
        return result
    }

    override fun toString(): String =
        "Configuration(appearance=$appearance, sheet=$sheet, platform=$platform, " +
            "logLevel=$logLevel, preloading=$preloading, title=$title, " +
            "allowedMessageOrigins=$allowedMessageOrigins, telemetry=$telemetry)"
}

/**
 * Resolves the checkout sheet header title, preferring a runtime-configured title over the localized default.
 */
internal fun Configuration.resolveCheckoutTitle(context: Context): String =
    title ?: context.getString(R.string.checkout_web_view_title)

public class Preloading internal constructor(
    public val enabled: Boolean = true,
) {
    override fun equals(other: Any?): Boolean = other is Preloading && enabled == other.enabled

    override fun hashCode(): Int = enabled.hashCode()

    override fun toString(): String = "Preloading(enabled=$enabled)"

    public class Builder {
        public var enabled: Boolean = true

        public fun build(): Preloading = Preloading(enabled)
    }

    public companion object {
        @JvmStatic
        public fun builder(): Builder = Builder()

        public operator fun invoke(configure: Builder.() -> Unit = {}): Preloading =
            Builder().apply(configure).build()
    }
}

/** Controls anonymous diagnostic metrics sent by Checkout Kit. */
public class Telemetry internal constructor(
    /** Set to false to prevent Checkout Kit from recording or sending diagnostic metrics. */
    public val enabled: Boolean = true,
) {
    override fun equals(other: Any?): Boolean = other is Telemetry && enabled == other.enabled

    override fun hashCode(): Int = enabled.hashCode()

    override fun toString(): String = "Telemetry(enabled=$enabled)"

    public class Builder {
        /** Set to false to prevent Checkout Kit from recording or sending diagnostic metrics. */
        public var enabled: Boolean = true

        public fun build(): Telemetry = Telemetry(enabled)
    }

    public companion object {
        @JvmStatic
        public fun builder(): Builder = Builder()

        public operator fun invoke(configure: Builder.() -> Unit = {}): Telemetry =
            Builder().apply(configure).build()
    }
}

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

    override fun toString(): String = "$identifier(version=$version)"
}
