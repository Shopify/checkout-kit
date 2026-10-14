package com.shopify.checkoutkit

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class CheckoutMessageIngressPolicyTest {
    @Test
    fun `open default accepts any main frame origin`() {
        val policy = CheckoutMessageIngressPolicy(emptySet(), "https://checkout.example.com")

        assertThat(policy.evaluate(message("https://untrusted.example.com")))
            .isEqualTo(CheckoutMessageIngressPolicy.Decision.Accepted)
    }

    @Test
    fun `child frame is rejected`() {
        val policy = CheckoutMessageIngressPolicy(emptySet(), "https://checkout.example.com")

        assertThat(policy.evaluate(message("https://checkout.example.com", isMainFrame = false)))
            .isEqualTo(
                CheckoutMessageIngressPolicy.Decision.Rejected(
                    CheckoutMessageRejection(
                        "https://checkout.example.com",
                        CheckoutMessageRejection.Reason.CHILD_FRAME,
                    ),
                ),
            )
    }

    @Test
    fun `explicit port zero is rejected when validation is enabled`() {
        val policy = CheckoutMessageIngressPolicy(
            setOf("https://trusted.example.com"),
            "https://checkout.example.com",
        )

        assertThat(policy.evaluate(message("https://trusted.example.com:0")))
            .isEqualTo(
                CheckoutMessageIngressPolicy.Decision.Rejected(
                    CheckoutMessageRejection(
                        "https://trusted.example.com:0",
                        CheckoutMessageRejection.Reason.UNSUPPORTED_PORT,
                    ),
                ),
            )
    }

    @Test
    fun `origin outside allowlist is rejected`() {
        val policy = CheckoutMessageIngressPolicy(
            setOf("https://trusted.example.com"),
            "https://checkout.example.com",
        )

        assertThat(policy.evaluate(message("https://untrusted.example.com")))
            .isEqualTo(
                CheckoutMessageIngressPolicy.Decision.Rejected(
                    CheckoutMessageRejection(
                        "https://untrusted.example.com",
                        CheckoutMessageRejection.Reason.ORIGIN_NOT_ALLOWED,
                    ),
                ),
            )
    }

    private fun message(origin: String, isMainFrame: Boolean = true): IncomingCheckoutMessage =
        IncomingCheckoutMessage(origin = origin, isMainFrame = isMainFrame)
}
