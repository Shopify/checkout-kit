package com.shopify.checkoutkit.androiddemo.cart.data

import com.apollographql.apollo.api.Optional
import com.shopify.checkoutkit.androiddemo.common.ID
import com.shopify.checkoutkit.androiddemo.common.client.StorefrontApiClient
import com.shopify.checkoutkit.androiddemo.graphql.type.CartBuyerIdentityInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartLineInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartLineUpdateInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CountryCode
import timber.log.Timber

class CartRepository(
    private val storefrontApiClient: StorefrontApiClient,
) {

    suspend fun createCart(
        variantId: ID,
        quantity: Int,
        demoBuyerIdentityEnabled: Boolean,
        customerAccessToken: String?,
    ): CartState.Cart {
        val input = CartInput(
            lines = Optional.present(
                listOf(
                    CartLineInput(
                        merchandiseId = variantId.id,
                        quantity = Optional.present(quantity),
                    )
                )
            ),
            buyerIdentity = Optional.present(buyerIdentity(demoBuyerIdentityEnabled, customerAccessToken)),
        )

        val data = storefrontApiClient.createCart(input)
        val cartCreate = data.cartCreate
        val cart = cartCreate?.cart

        if (cart == null) {
            val errors = cartCreate?.userErrors?.joinToString { "${it.field} - ${it.message}" }
            throw RuntimeException("Failed to create cart, $errors")
        }

        Timber.i("Cart created with checkout URL")
        return cart.cartFragment.toLocal()
    }

    suspend fun addCartLine(cartId: ID, variantId: ID, quantity: Int): CartState.Cart {
        val line = CartLineInput(
            merchandiseId = variantId.id,
            quantity = Optional.present(quantity),
        )

        val data = storefrontApiClient.cartLinesAdd(cartId = cartId.id, lines = listOf(line))
        val cart = data.cartLinesAdd?.cart
            ?: throw RuntimeException("Failed to add cart line")

        return cart.cartFragment.toLocal()
    }

    suspend fun modifyCartLine(cartId: ID, lineItemId: ID, quantity: Int?): CartState.Cart {
        if (quantity != null) {
            val line = CartLineUpdateInput(
                id = lineItemId.id,
                quantity = Optional.present(quantity),
            )
            val data = storefrontApiClient.cartLinesUpdate(cartId = cartId.id, lines = listOf(line))
            val cart = data.cartLinesUpdate?.cart
                ?: throw RuntimeException("Failed to modify cart")
            return cart.cartFragment.toLocal()
        } else {
            val data = storefrontApiClient.cartLinesRemove(cartId = cartId.id, lineIds = listOf(lineItemId.id))
            val cart = data.cartLinesRemove?.cart
                ?: throw RuntimeException("Failed to modify cart")
            return cart.cartFragment.toLocal()
        }
    }

    private fun buyerIdentity(demoBuyerIdentityEnabled: Boolean, customerAccessToken: String?): CartBuyerIdentityInput {
        if (customerAccessToken != null) {
            Timber.i("Setting a customer access token in buyer identity")
            return CartBuyerIdentityInput(customerAccessToken = Optional.present(customerAccessToken))
        }

        return if (demoBuyerIdentityEnabled) {
            Timber.i("Using demo buyer identity data to prefill checkout")
            DemoBuyerIdentity.value
        } else {
            CartBuyerIdentityInput(countryCode = Optional.present(CountryCode.CA))
        }
    }
}
