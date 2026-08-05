package com.shopify.checkout_kit_android_demo.cart.data

import androidx.compose.runtime.Stable
import com.shopify.checkout_kit_android_demo.common.ID

sealed class CartState {
    data object Empty : CartState()

    @Stable
    data class Cart(
        val cartID: ID,
        val cartLines: List<CartLine>,
        val cartTotals: CartTotals,
        val checkoutUrl: String,
    ) : CartState()
}

data class CartLine(
    val id: ID,
    val title: String,
    val vendor: String,
    val quantity: Int,
    val variantDescription: String,
    val image: CartLineImage?,
    val pricePerQuantity: Double,
    val currencyPerQuantity: String,
    val totalPrice: Double,
    val totalCurrency: String,
)

data class CartLineImage(
    val url: String,
    val altText: String?,
)

data class CartTotals(
    val totalQuantity: Int,
    val totalAmount: CartAmount,
    val totalAmountEstimated: Boolean,
)

data class CartAmount(
    val currency: String,
    val price: Double,
)

val CartState.totalQuantity
    get() = when (this) {
        is CartState.Empty -> 0
        is CartState.Cart -> cartTotals.totalQuantity
    }
