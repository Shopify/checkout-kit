package com.shopify.checkoutkit

import java.net.URI

/** Transport metadata captured before an incoming message enters protocol dispatch. */
internal data class IncomingCheckoutMessage(
    val origin: String,
    val isMainFrame: Boolean,
)

/**
 * Applies the SDK's admission rules to incoming checkout messages.
 *
 * A message may be valid checkout protocol while still being rejected because its transport
 * metadata is not admitted. Keeping this decision outside the protocol client ensures the client
 * only receives messages that the native WebView boundary has already trusted.
 */
internal class CheckoutMessageIngressPolicy(
    private val configuredOrigins: Set<String>,
    private val checkoutOrigin: String?,
) {
    internal sealed interface Decision {
        data object Accepted : Decision
        data class Rejected(val rejection: CheckoutMessageRejection) : Decision
    }

    internal fun evaluate(message: IncomingCheckoutMessage): Decision {
        if (!message.isMainFrame) {
            return rejected(message, CheckoutMessageRejection.Reason.CHILD_FRAME)
        }

        val patterns = OriginAllowlist.effectivePatterns(
            checkoutOrigin = checkoutOrigin,
            configured = configuredOrigins,
        )

        return when {
            patterns == null -> Decision.Accepted
            // AndroidX supplies an authenticated source origin, but explicit port zero is not a
            // useful web origin. Reject it only when validation is enabled to preserve the open default.
            runCatching { URI(message.origin).port == 0 }.getOrDefault(false) ->
                rejected(message, CheckoutMessageRejection.Reason.UNSUPPORTED_PORT)
            !OriginAllowlist.isAllowed(message.origin, patterns) ->
                rejected(message, CheckoutMessageRejection.Reason.ORIGIN_NOT_ALLOWED)
            else -> Decision.Accepted
        }
    }

    private fun rejected(
        message: IncomingCheckoutMessage,
        reason: CheckoutMessageRejection.Reason,
    ): Decision.Rejected = Decision.Rejected(
        CheckoutMessageRejection(origin = message.origin, reason = reason),
    )
}
