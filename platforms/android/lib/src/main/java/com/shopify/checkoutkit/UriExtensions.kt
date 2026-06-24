package com.shopify.checkoutkit

import android.net.Uri
import androidx.core.net.toUri
import com.shopify.ucp.embedded.checkout.EmbeddedCheckoutProtocol

internal fun Uri?.isWebLink(): Boolean = setOf(Scheme.HTTP, Scheme.HTTPS).contains(this?.scheme)
internal fun Uri?.isMailtoLink(): Boolean = this?.scheme == Scheme.MAILTO
internal fun Uri?.isTelLink(): Boolean = this?.scheme == Scheme.TEL
internal fun Uri?.isAboutScheme(): Boolean = this?.scheme == Scheme.ABOUT
internal fun Uri?.isContactLink(): Boolean = this.isMailtoLink() || this.isTelLink()
internal fun Uri?.isDeepLink(): Boolean = this != null && !this.isWebLink() && !this.isContactLink() && !this.isAboutScheme()
internal fun Uri?.isConfirmationPage(): Boolean =
    this?.pathSegments?.any { CONFIRMATION_PATH_REGEX.matches(it) } == true
internal fun Uri?.redactedForLogging(): String? = when {
    this == null -> null
    isOpaque || queryParameterNames.isEmpty() -> toString()
    else -> {
        val builder = buildUpon().clearQuery()
        queryParameterNames.forEach { name ->
            builder.appendQueryParameter(name, REDACTED_QUERY_VALUE)
        }
        builder.build().toString()
    }
}

internal fun String.redactedUrlForLogging(): String = toUri().redactedForLogging().orEmpty()

/**
 * Applies Checkout Kit's curated Embedded Checkout Protocol query parameters.
 */
internal fun String.appendEcpParams(): String =
    EmbeddedCheckoutProtocol.url(this, delegations = listOf(CheckoutProtocol.windowOpen.delegation))

private val CONFIRMATION_PATH_REGEX = Regex(pattern = "^(thank[-_]+you)$", option = RegexOption.IGNORE_CASE)

private const val REDACTED_QUERY_VALUE = "[REDACTED]"

internal object Scheme {
    const val HTTP = "http"
    const val HTTPS = "https"
    const val TEL = "tel"
    const val MAILTO = "mailto"
    const val ABOUT = "about"
}
