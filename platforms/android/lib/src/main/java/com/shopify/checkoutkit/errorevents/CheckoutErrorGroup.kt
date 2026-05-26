package com.shopify.checkoutkit.errorevents

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

@Serializable(with = CheckoutErrorGroupSerializer::class)
internal enum class CheckoutErrorGroup(val value: String) {
    /** An authentication error */
    AUTHENTICATION("authentication"),

    /** A shop configuration error */
    CONFIGURATION("configuration"),

    /** A terminal checkout error which cannot be handled */
    UNRECOVERABLE("unrecoverable"),

    /** A checkout-related error, such as failure to receive a receipt or progress through checkout */
    CHECKOUT("checkout"),

    /** The checkout session has expired and is no longer available */
    EXPIRED("expired"),

    /** The error sent by checkout is unsupported */
    UNSUPPORTED("unsupported")
}

internal object CheckoutErrorGroupSerializer : KSerializer<CheckoutErrorGroup> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("ErrorGroup", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: CheckoutErrorGroup) {
        encoder.encodeString(value.value)
    }

    override fun deserialize(decoder: Decoder): CheckoutErrorGroup {
        val value = decoder.decodeString()
        return CheckoutErrorGroup.entries.firstOrNull { it.value == value }
            ?: CheckoutErrorGroup.UNSUPPORTED
    }
}
