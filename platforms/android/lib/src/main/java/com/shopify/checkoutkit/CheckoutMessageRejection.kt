package com.shopify.checkoutkit

/** Details about an incoming checkout message rejected by the transport admission policy. */
internal data class CheckoutMessageRejection(
    /** Origin the message was received from, for example `https://example.com`. */
    val origin: String,
    /** Stable reason the message was rejected. */
    val reason: Reason,
) {
    enum class Reason {
        /** The message was sent from a child frame rather than the checkout document. */
        CHILD_FRAME,

        /** The message origin used explicit port zero. */
        UNSUPPORTED_PORT,

        /** The message origin was not included in the effective allowlist. */
        ORIGIN_NOT_ALLOWED,
    }
}

internal val CheckoutMessageRejection.Reason.logDescription: String
    get() = when (this) {
        CheckoutMessageRejection.Reason.CHILD_FRAME -> "message was sent from a child frame"
        CheckoutMessageRejection.Reason.UNSUPPORTED_PORT -> "origin uses unsupported port 0"
        CheckoutMessageRejection.Reason.ORIGIN_NOT_ALLOWED -> "origin is not in the allowlist"
    }
