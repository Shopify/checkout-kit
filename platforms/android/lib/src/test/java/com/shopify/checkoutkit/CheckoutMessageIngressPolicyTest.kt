package com.shopify.checkoutkit

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class CheckoutMessageIngressPolicyTest {
    @Test
    fun `open by default accepts any main frame origin`() {
        val decision = policy().evaluate(message(origin = "https://evil.example.com"))

        assertThat(decision).isEqualTo(CheckoutMessageIngressPolicy.Decision.Accepted)
    }

    @Test
    fun `child frame is rejected before origin evaluation`() {
        val decision = policy().evaluate(
            message(origin = "https://trusted.example.com", isMainFrame = false),
        )

        assertThat(decision).isEqualTo(
            rejected("https://trusted.example.com", CheckoutMessageRejection.Reason.CHILD_FRAME),
        )
    }

    @Test
    fun `explicit port zero is rejected when origin validation is enabled`() {
        val decision = policy(configuredOrigins = setOf("https://trusted.example.com")).evaluate(
            message(origin = "https://trusted.example.com:0"),
        )

        assertThat(decision).isEqualTo(
            rejected("https://trusted.example.com:0", CheckoutMessageRejection.Reason.UNSUPPORTED_PORT),
        )
    }

    @Test
    fun `origin outside allowlist is rejected`() {
        val decision = policy(configuredOrigins = setOf("https://trusted.example.com")).evaluate(
            message(origin = "https://evil.example.com"),
        )

        assertThat(decision).isEqualTo(
            rejected("https://evil.example.com", CheckoutMessageRejection.Reason.ORIGIN_NOT_ALLOWED),
        )
    }

    private fun policy(
        configuredOrigins: Set<String> = emptySet(),
    ) = CheckoutMessageIngressPolicy(
        configuredOrigins = configuredOrigins,
        checkoutOrigin = "https://checkout.shopify.com",
    )

    private fun message(
        origin: String,
        isMainFrame: Boolean = true,
    ) = IncomingCheckoutMessage(
        body = "{}",
        origin = origin,
        isMainFrame = isMainFrame,
    )

    private fun rejected(
        origin: String,
        reason: CheckoutMessageRejection.Reason,
    ) = CheckoutMessageIngressPolicy.Decision.Rejected(
        CheckoutMessageRejection(origin = origin, reason = reason),
    )
}
