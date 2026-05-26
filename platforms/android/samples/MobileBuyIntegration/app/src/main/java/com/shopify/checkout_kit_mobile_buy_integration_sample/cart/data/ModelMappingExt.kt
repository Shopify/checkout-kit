package com.shopify.checkout_kit_mobile_buy_integration_sample.cart.data

import com.shopify.checkout_kit_mobile_buy_integration_sample.common.ID
import com.shopify.checkout_kit_mobile_buy_integration_sample.graphql.fragment.CartFragment

internal fun CartFragment.toLocal(): CartState.Cart {
    return CartState.Cart(
        cartID = ID(id),
        cartLines = lines.nodes.mapNotNull { node -> node.toLocal() },
        cartTotals = CartTotals(
            totalAmount = CartAmount(
                currency = cost.totalAmount.currencyCode.rawValue,
                price = cost.totalAmount.amount.toString().toDouble(),
            ),
            totalAmountEstimated = cost.totalAmountEstimated,
            totalQuantity = totalQuantity,
        ),
        checkoutUrl = checkoutUrl.toString(),
    )
}

internal fun CartFragment.Node.toLocal(): CartLine? {
    return merchandise.onProductVariant?.let { variant ->
        CartLine(
            id = ID(id),
            image = variant.product.featuredImage?.let { image ->
                CartLineImage(
                    url = image.url.toString(),
                    altText = image.altText,
                )
            },
            title = variant.product.title,
            vendor = variant.product.vendor,
            quantity = quantity,
            pricePerQuantity = cost.amountPerQuantity.amount.toString().toDouble(),
            currencyPerQuantity = cost.amountPerQuantity.currencyCode.rawValue,
            totalPrice = cost.totalAmount.amount.toString().toDouble(),
            totalCurrency = cost.totalAmount.currencyCode.rawValue,
            variantDescription = variant.selectedOptions.toDescription(),
        )
    }
}

fun List<CartFragment.SelectedOption>.toDescription(): String {
    val optionsWithoutTitle = this.filter { option -> option.name != "Title" }
    return optionsWithoutTitle.joinToString(separator = " / ") { option -> option.value }
}
