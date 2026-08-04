package com.shopify.checkoutkit.androiddemo.cart.data

import com.shopify.checkoutkit.androiddemo.common.ID
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class CartRepositoryTest {

    @Test
    fun `demo buyer identity supplies the delivery address`() {
        val input = cartInput(demoBuyerIdentityEnabled = true, customerAccessToken = null)

        assertThat(input.delivery.getOrThrow()).isEqualTo(DemoBuyerIdentity.delivery)
        assertThat(input.buyerIdentity.getOrThrow()).isEqualTo(DemoBuyerIdentity.value)
    }

    @Test
    fun `a guest supplies no delivery address`() {
        val input = cartInput(demoBuyerIdentityEnabled = false, customerAccessToken = null)

        assertThat(input.delivery.getOrNull()).isNull()
    }

    // A country on the buyer identity picks the market, and the market decides the currency,
    // the address form and the labels the E2E fixture types. The Swift and React Native
    // samples send no buyer identity for a guest, so this one must not either.
    @Test
    fun `a guest supplies no buyer identity`() {
        val input = cartInput(demoBuyerIdentityEnabled = false, customerAccessToken = null)

        assertThat(input.buyerIdentity.getOrNull()).isNull()
    }

    @Test
    fun `a signed in customer supplies no delivery address`() {
        val input = cartInput(demoBuyerIdentityEnabled = true, customerAccessToken = "token")

        assertThat(input.delivery.getOrNull()).isNull()
    }

    private fun cartInput(demoBuyerIdentityEnabled: Boolean, customerAccessToken: String?) =
        CartRepository.cartInput(
            variantId = ID("gid://shopify/ProductVariant/1"),
            quantity = 1,
            demoBuyerIdentityEnabled = demoBuyerIdentityEnabled,
            customerAccessToken = customerAccessToken,
        )
}
