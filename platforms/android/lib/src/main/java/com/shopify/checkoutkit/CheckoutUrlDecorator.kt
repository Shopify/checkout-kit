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
                colorScheme = configuration.colorScheme.id,
            ),
        )

        val uri = decorated.toUri()
        if (uri.isOpaque) return decorated

        return uri
            .replacingQueryParameter(CK_BRANDING_PARAM, configuration.colorScheme.brandingId)
            .toString()
    }

    private const val CK_BRANDING_PARAM = "ck_branding"
}

private val ColorScheme.brandingId: String
    get() = when (this) {
        is ColorScheme.Web -> "shop"
        is ColorScheme.Automatic,
        is ColorScheme.Dark,
        is ColorScheme.Light -> "app"
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
