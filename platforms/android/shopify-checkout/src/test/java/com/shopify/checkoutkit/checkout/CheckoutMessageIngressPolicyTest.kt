package com.shopify.checkoutkit.checkout
import com.shopify.checkoutkit.internal.protocol.CheckoutMessageIngressPolicy
import com.shopify.checkoutkit.internal.protocol.CheckoutMessageRejection
import com.shopify.checkoutkit.internal.protocol.IncomingCheckoutMessage
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
    fun `open default and wildcard accept port zero without applying enabled validation rules`() {
        for (origins in listOf(emptySet(), setOf("*"))) {
            val policy = CheckoutMessageIngressPolicy(origins, "https://checkout.example.com")

            assertThat(policy.evaluate(message("https://untrusted.example.com:0")))
                .describedAs("Configured origins: %s", origins)
                .isEqualTo(CheckoutMessageIngressPolicy.Decision.Accepted)
        }
    }

    @Test
    fun `malformed origins are rejected without throwing when validation is enabled`() {
        val policy = CheckoutMessageIngressPolicy(
            setOf("https://trusted.example.com"),
            "https://checkout.example.com",
        )

        for (origin in listOf("not a url", "https://[invalid", "https://trusted.example.com:%")) {
            assertThat(policy.evaluate(message(origin)))
                .describedAs("Malformed origin: %s", origin)
                .isEqualTo(
                    CheckoutMessageIngressPolicy.Decision.Rejected(
                        CheckoutMessageRejection(origin, CheckoutMessageRejection.Reason.ORIGIN_NOT_ALLOWED),
                    ),
                )
        }
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
