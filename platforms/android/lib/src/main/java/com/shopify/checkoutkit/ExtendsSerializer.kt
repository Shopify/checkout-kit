/*
 * MIT License
 *
 * Copyright 2023-present, Shopify Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
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
