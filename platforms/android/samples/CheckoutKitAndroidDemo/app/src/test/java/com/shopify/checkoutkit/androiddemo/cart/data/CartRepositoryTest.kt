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
