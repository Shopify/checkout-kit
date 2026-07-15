package com.shopify.checkoutkit

import android.content.Context

/**
 * Configuration for Shopify Checkout Kit.
 *
 * Allows specifying the colors, sheet presentation, and runtime behavior that should be used for checkout.
 *
 * @property allowedMessageOrigins Extra origins allowed to post incoming checkout-protocol messages.
 * Native checkout is open by default: leaving this empty trusts every origin. Once populated, the
 * effective allowlist is these origins plus the cart URL origin and `shop.app` (including its
 * subdomains). Entries may be exact origins (`https://example.com`), wildcard subdomains
 * (`https://*.example.com`), or `"*"` to explicitly trust every origin.
 * @property onMessageRejected Invoked when an incoming message is dropped by origin validation. When
 * null, drops are logged at debug level. Treat the payload as untrusted — it was dropped precisely
 * because its origin was not in the allowlist.
 */
@ConsistentCopyVisibility
public data class Configuration internal constructor(
    var appearance: CheckoutAppearance = CheckoutAppearance.Storefront(),
    var sheet: CheckoutSheetOptions = CheckoutSheetOptions(),
    var platform: Platform? = null,
    var logLevel: LogLevel = LogLevel.WARN,
    var preloading: Preloading = Preloading(),
    var title: String? = null,
    var allowedMessageOrigins: Set<String> = emptySet(),
    var onMessageRejected: ((RejectedMessage) -> Unit)? = null,
)

/**
 * Details of an incoming message dropped by origin validation.
 *
 * @property origin Origin the dropped message was posted from.
 * @property message Raw message payload. Treat as untrusted.
 * @property reason Human-readable reason the message was dropped.
 */
public data class RejectedMessage(
    val origin: String,
    val message: String,
    val reason: String,
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
