package com.shopify.checkoutkit.androiddemo

import com.shopify.checkoutkit.Checkout
import com.shopify.checkoutkit.CheckoutCompleteEvent
import com.shopify.checkoutkit.CheckoutErrorCode
import com.shopify.checkoutkit.CheckoutException
import com.shopify.checkoutkit.CheckoutFailureEvent
import com.shopify.checkoutkit.CheckoutStartEvent
import com.shopify.checkoutkit.CheckoutUpdateEvent
import com.shopify.ucp.embedded.checkout.CheckoutStatus
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

/** Compiled in a consumer module so Kotlin internal visibility cannot make these fixtures pass. */
class CheckoutEventFixturesTest {
    @Test
    fun consumersCanConstructSnapshotsAndEveryEventPayload() {
        val checkout = Checkout.Builder()
            .id("checkout-fixture")
            .currency("USD")
            .status(CheckoutStatus.Incomplete)
            .lineItems(emptyList())
            .links(emptyList())
            .totals(emptyList())
            .build()
        val updated = checkout.toBuilder().currency("CAD").build()
        val completed = checkout.toBuilder().status(CheckoutStatus.Completed).build()
        val error = CheckoutException(CheckoutErrorCode.NETWORK_ERROR, "Synthetic network failure")

        assertThat(CheckoutStartEvent(checkout).checkout).isSameAs(checkout)
        assertThat(CheckoutUpdateEvent(updated).checkout.currency).isEqualTo("CAD")
        assertThat(CheckoutCompleteEvent(completed).checkout.status).isEqualTo(CheckoutStatus.Completed)
        assertThat(CheckoutFailureEvent(error).error).isSameAs(error)
        assertThat(checkout.currency).isEqualTo("USD")
        assertThat(checkout.status).isEqualTo(CheckoutStatus.Incomplete)
    }
}
