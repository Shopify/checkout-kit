package com.shopify.checkoutkit.androiddemo.cart.data

import com.apollographql.apollo.api.Optional
import com.shopify.checkoutkit.androiddemo.common.ID
import com.shopify.checkoutkit.androiddemo.common.client.StorefrontApiClient
import com.shopify.checkoutkit.androiddemo.graphql.type.CartBuyerIdentityInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartDeliveryInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartLineInput
import com.shopify.checkoutkit.androiddemo.graphql.type.CartLineUpdateInput
import timber.log.Timber

class CartRepository(
    private val storefrontApiClient: StorefrontApiClient,
) {

    suspend fun createCart(
        variantId: ID,
        quantity: Int,
        sellingPlanId: String?,
        demoBuyerIdentityEnabled: Boolean,
        customerAccessToken: String?,
    ): CartState.Cart {
        val input = cartInput(variantId, quantity, sellingPlanId, demoBuyerIdentityEnabled, customerAccessToken)

        val data = storefrontApiClient.createCart(input)
        val cartCreate = data.cartCreate
        val cart = cartCreate?.cart

        if (cart == null) {
            val errors = cartCreate?.userErrors?.joinToString { "${it.field} - ${it.message}" }
            throw CartOperationException("Failed to create cart, $errors")
        }

        Timber.i("Cart created with checkout URL")
        return cart.cartFragment.toLocal()
    }

    suspend fun addCartLine(
        cartId: ID,
        variantId: ID,
        quantity: Int,
        sellingPlanId: String?,
    ): CartState.Cart {
        val line = cartLineInput(variantId, quantity, sellingPlanId)

        val data = storefrontApiClient.cartLinesAdd(cartId = cartId.id, lines = listOf(line))
        val cart = data.cartLinesAdd?.cart
            ?: throw CartOperationException("Failed to add cart line")

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
                ?: throw CartOperationException("Failed to modify cart")
            return cart.cartFragment.toLocal()
        } else {
            val data = storefrontApiClient.cartLinesRemove(cartId = cartId.id, lineIds = listOf(lineItemId.id))
            val cart = data.cartLinesRemove?.cart
                ?: throw CartOperationException("Failed to modify cart")
            return cart.cartFragment.toLocal()
        }
    }

    companion object {
        internal fun cartInput(
            variantId: ID,
            quantity: Int,
            sellingPlanId: String?,
            demoBuyerIdentityEnabled: Boolean,
            customerAccessToken: String?,
        ) = CartInput(
            lines = Optional.present(
                listOf(
                    cartLineInput(variantId, quantity, sellingPlanId)
                )
            ),
            buyerIdentity = buyerIdentity(demoBuyerIdentityEnabled, customerAccessToken),
            delivery = delivery(demoBuyerIdentityEnabled, customerAccessToken),
        )

        private fun cartLineInput(variantId: ID, quantity: Int, sellingPlanId: String?): CartLineInput =
            CartLineInput(
                merchandiseId = variantId.id,
                quantity = Optional.present(quantity),
                sellingPlanId = if (sellingPlanId == null) Optional.Absent else Optional.present(sellingPlanId),
            )

        // A guest carries nothing, so the cart takes the market of the shop. A country here
        // would pick the market instead, and the market decides the currency, the address
        // form and its labels. The Swift and React Native samples send nothing either.
        private fun buyerIdentity(
            demoBuyerIdentityEnabled: Boolean,
            customerAccessToken: String?,
        ): Optional<CartBuyerIdentityInput> {
            if (customerAccessToken != null) {
                Timber.i("Setting a customer access token in buyer identity")
                return Optional.present(
                    CartBuyerIdentityInput(customerAccessToken = Optional.present(customerAccessToken))
                )
            }

            if (!demoBuyerIdentityEnabled) {
                return Optional.Absent
            }

            Timber.i("Using demo buyer identity data to prefill checkout")

            return Optional.present(DemoBuyerIdentity.value)
        }

        // A signed in customer picks from the addresses the account already holds, so only the
        // demo identity carries one of its own.
        private fun delivery(
            demoBuyerIdentityEnabled: Boolean,
            customerAccessToken: String?,
        ): Optional<CartDeliveryInput> {
            if (customerAccessToken != null || !demoBuyerIdentityEnabled) {
                return Optional.Absent
            }

            return Optional.present(DemoBuyerIdentity.delivery)
        }
    }
}
