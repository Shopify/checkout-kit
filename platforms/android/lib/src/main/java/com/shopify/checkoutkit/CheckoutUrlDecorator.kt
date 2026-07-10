package com.shopify.checkoutkit

import android.net.Uri
import androidx.core.net.toUri
import com.shopify.ucp.embedded.checkout.EmbeddedCheckoutProtocol

internal object CheckoutUrlDecorator {
    fun decorate(
        checkoutUrl: String,
        configuration: Configuration = ShopifyCheckoutKit.getConfiguration(),
    ): String {
        val decorated = EmbeddedCheckoutProtocol.url(
            checkoutUrl,
            options = EmbeddedCheckoutProtocol.Options(
                delegations = CheckoutProtocol.defaultDelegations,
                colorScheme = configuration.appearance.colorSchemeId,
            ),
        )

        val uri = decorated.toUri()
        if (uri.isOpaque) return decorated

        return uri
            .replacingQueryParameter(CK_BRANDING_PARAM, configuration.appearance.brandingId)
            .toString()
    }

    private const val CK_BRANDING_PARAM = "ck_branding"
}

private val CheckoutAppearance.colorSchemeId: String
    get() = when (this) {
        is CheckoutAppearance.App -> colorScheme.id
        is CheckoutAppearance.Storefront -> ColorScheme.Automatic().id
    }

private val CheckoutAppearance.brandingId: String
    get() = when (this) {
        is CheckoutAppearance.App -> "app"
        is CheckoutAppearance.Storefront -> "shop"
    }

private fun Uri.replacingQueryParameter(name: String, value: String): Uri {
    val builder = buildUpon().clearQuery()
    queryParameterNames
        .filterNot { it == name }
        .forEach { existingName ->
            getQueryParameters(existingName).forEach { existingValue ->
                builder.appendQueryParameter(existingName, existingValue)
            }
        }
    return builder.appendQueryParameter(name, value).build()
}
