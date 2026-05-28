package com.shopify.checkoutkit

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerializationException
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonPrimitive

internal object ExtendsSerializer : KSerializer<Extends> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.checkoutkit.Extends")

    override fun deserialize(decoder: Decoder): Extends {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Extends can only be deserialized from JSON")
        return when (val element = input.decodeJsonElement()) {
            is JsonPrimitive -> Extends.StringValue(element.content)
            is JsonArray -> Extends.StringArrayValue(
                element.map {
                    (it as? JsonPrimitive)?.content
                        ?: throw SerializationException("Extends array element not a primitive: $it")
                }
            )
            else -> throw SerializationException("Unexpected Extends shape: $element")
        }
    }

    override fun serialize(encoder: Encoder, value: Extends) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Extends can only be serialized to JSON")
        val element: JsonElement = when (value) {
            is Extends.StringValue -> JsonPrimitive(value.value)
            is Extends.StringArrayValue -> JsonArray(value.value.map { JsonPrimitive(it) })
        }
        output.encodeJsonElement(element)
    }
}
