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

    @Test
    fun `repeated origins still check the frame of each message`() {
        val origin = "https://checkout.example.com"
        val policy = CheckoutMessageIngressPolicy(setOf(origin), origin)
        val messages = listOf(message(origin), message(origin, isMainFrame = false), message(origin))

        assertThat(messages.map(policy::evaluate)).containsExactly(
            CheckoutMessageIngressPolicy.Decision.Accepted,
            CheckoutMessageIngressPolicy.Decision.Rejected(
                CheckoutMessageRejection(origin, CheckoutMessageRejection.Reason.CHILD_FRAME),
            ),
            CheckoutMessageIngressPolicy.Decision.Accepted,
        )
    }

    private fun message(origin: String, isMainFrame: Boolean = true): IncomingCheckoutMessage =
        IncomingCheckoutMessage(origin = origin, isMainFrame = isMainFrame)
}
