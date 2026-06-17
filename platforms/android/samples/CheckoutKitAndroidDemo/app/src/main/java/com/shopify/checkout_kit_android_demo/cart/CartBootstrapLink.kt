package com.shopify.checkout_kit_android_demo.cart

import android.net.Uri
import com.shopify.checkout_kit_android_demo.common.ID

data class CartBootstrapLink(
    val variantId: ID?,
    val productIndex: Int?,
    val quantity: Int,
) {
    companion object {
        private const val SCHEME = "checkout-kit-android"
        private const val HOST = "cart"

        fun parse(uri: Uri): CartBootstrapLink? {
            if (uri.scheme != SCHEME) return null

            if (uri.host != HOST) {
                throw CartBootstrapException("Unsupported cart bootstrap path")
            }

            val variantId = uri.getQueryParameter("variantId")?.trim()
            val productIndexParam = uri.getQueryParameter("productIndex")?.trim()
            val quantityParam = uri.getQueryParameter("quantity")?.trim() ?: "1"
            val quantity = quantityParam.toIntOrNull()

            if (quantity == null || quantity < 1) {
                throw CartBootstrapException("quantity must be a positive integer")
            }

            if (!variantId.isNullOrEmpty() && !productIndexParam.isNullOrEmpty()) {
                throw CartBootstrapException("Use variantId or productIndex, not both")
            }

            if (!variantId.isNullOrEmpty()) {
                return CartBootstrapLink(variantId = ID(variantId), productIndex = null, quantity = quantity)
            }

            if (productIndexParam.isNullOrEmpty()) {
                throw CartBootstrapException("Missing variantId or productIndex")
            }

            val productIndex = productIndexParam.toIntOrNull()
            if (productIndex == null || productIndex < 0) {
                throw CartBootstrapException("productIndex must be a non-negative integer")
            }

            return CartBootstrapLink(variantId = null, productIndex = productIndex, quantity = quantity)
        }
    }
}

class CartBootstrapException(message: String) : IllegalArgumentException(message)
