package com.shopify.checkout_kit_android_demo.e2e

import android.net.Uri

internal data class CartBootstrapRequest(
    val productIndex: Int,
    val quantity: Int,
)

internal object CartBootstrap {
    private const val SCHEME = "com.shopify.checkoutkit.androiddemo"
    private const val HOST = "cart"

    fun request(uri: Uri): CartBootstrapRequest? {
        if (uri.scheme?.lowercase() != SCHEME) return null

        require(uri.host?.lowercase() == HOST && (uri.path.isNullOrEmpty() || uri.path == "/")) {
            "Unsupported cart bootstrap route"
        }
        require(uri.isHierarchical) { "Invalid cart bootstrap URL" }

        return CartBootstrapRequest(
            productIndex = positiveInteger(uri, "productIndex", allowingZero = true),
            quantity = positiveInteger(uri, "quantity", allowingZero = false),
        )
    }

    private fun positiveInteger(uri: Uri, name: String, allowingZero: Boolean): Int {
        val value = uri.getQueryParameters(name).singleOrNull()?.toIntOrNull()
        require(value != null && if (allowingZero) value >= 0 else value > 0) {
            "Invalid cart bootstrap parameter: $name"
        }
        return value
    }
}
