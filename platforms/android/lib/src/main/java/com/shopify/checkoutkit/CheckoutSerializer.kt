package com.shopify.checkoutkit

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerializationException
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement

internal object CheckoutSerializer : KSerializer<Checkout> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("com.shopify.checkoutkit.Checkout")

    internal val reservedKeys: Set<String> = setOf(
        "attribution", "buyer", "context", "continue_url", "currency", "discounts", "expires_at", "fulfillment",
        "id", "line_items", "links", "messages", "order", "payment", "signals", "status", "totals", "ucp",
    )

    override fun deserialize(decoder: Decoder): Checkout {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Checkout can only be deserialized from JSON")
        val fields = input.decodeJsonElement() as? JsonObject
            ?: throw SerializationException("Checkout must be a JSON object")
        val json = input.json
        return Checkout.Builder()
            .attribution(fields.optional("attribution", json))
            .buyer(fields.optional("buyer", json))
            .context(fields.optional("context", json))
            .continueURL(fields.optional("continue_url", json))
            .currency(fields.required("currency", json))
            .discounts(fields.optional("discounts", json))
            .expiresAt(fields.optional("expires_at", json))
            .fulfillment(fields.optional("fulfillment", json))
            .id(fields.required("id", json))
            .lineItems(fields.required("line_items", json))
            .links(fields.required("links", json))
            .messages(fields.optional("messages", json))
            .order(fields.optional("order", json))
            .payment(fields.optional("payment", json))
            .signals(fields.optional("signals", json))
            .status(fields.required("status", json))
            .totals(fields.required("totals", json))
            .additionalProperties(fields.filterKeys { it !in reservedKeys })
            .build()
    }

    override fun serialize(encoder: Encoder, value: Checkout) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Checkout can only be serialized to JSON")
        val json = output.json
        val fields = linkedMapOf<String, JsonElement>()
        value.attribution?.let { fields["attribution"] = json.encodeToJsonElement(it) }
        value.buyer?.let { fields["buyer"] = json.encodeToJsonElement(it) }
        value.context?.let { fields["context"] = json.encodeToJsonElement(it) }
        value.continueURL?.let { fields["continue_url"] = json.encodeToJsonElement(it) }
        fields["currency"] = json.encodeToJsonElement(value.currency)
        value.discounts?.let { fields["discounts"] = json.encodeToJsonElement(it) }
        value.expiresAt?.let { fields["expires_at"] = json.encodeToJsonElement(it) }
        value.fulfillment?.let { fields["fulfillment"] = json.encodeToJsonElement(it) }
        fields["id"] = json.encodeToJsonElement(value.id)
        fields["line_items"] = json.encodeToJsonElement(value.lineItems)
        fields["links"] = json.encodeToJsonElement(value.links)
        value.messages?.let { fields["messages"] = json.encodeToJsonElement(it) }
        value.order?.let { fields["order"] = json.encodeToJsonElement(it) }
        value.payment?.let { fields["payment"] = json.encodeToJsonElement(it) }
        value.signals?.let { fields["signals"] = json.encodeToJsonElement(it) }
        fields["status"] = json.encodeToJsonElement(value.status)
        fields["totals"] = json.encodeToJsonElement(value.totals)
        value.additionalProperties.filterKeys { it !in reservedKeys }.forEach { (key, element) -> fields[key] = element }
        output.encodeJsonElement(JsonObject(fields))
    }

    private inline fun <reified T> JsonObject.required(key: String, json: Json): T =
        json.decodeFromJsonElement(get(key) ?: throw SerializationException("Missing $key for Checkout"))

    private inline fun <reified T> JsonObject.optional(key: String, json: Json): T? =
        get(key)?.let { json.decodeFromJsonElement<T?>(it) }
}
