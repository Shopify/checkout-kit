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
        "actions", "attribution", "buyer", "context", "continue_url", "currency", "discounts", "expires_at", "fulfillment",
        "id", "line_items", "links", "messages", "order", "payment", "policies", "signals", "status", "totals", "ucp",
    )

    override fun deserialize(decoder: Decoder): Checkout {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Checkout can only be deserialized from JSON")
        val fields = input.decodeJsonElement() as? JsonObject
            ?: throw SerializationException("Checkout must be a JSON object")
        val json = input.json
        return Checkout.Builder()
            .actions(fields.optional("actions", json))
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
            .policies(fields.optional("policies", json))
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
        fields.putOptional("actions", value.actions, json)
        fields.putOptional("attribution", value.attribution, json)
        fields.putOptional("buyer", value.buyer, json)
        fields.putOptional("context", value.context, json)
        fields.putOptional("continue_url", value.continueURL, json)
        fields["currency"] = json.encodeToJsonElement(value.currency)
        fields.putOptional("discounts", value.discounts, json)
        fields.putOptional("expires_at", value.expiresAt, json)
        fields.putOptional("fulfillment", value.fulfillment, json)
        fields["id"] = json.encodeToJsonElement(value.id)
        fields["line_items"] = json.encodeToJsonElement(value.lineItems)
        fields["links"] = json.encodeToJsonElement(value.links)
        fields.putOptional("messages", value.messages, json)
        fields.putOptional("order", value.order, json)
        fields.putOptional("payment", value.payment, json)
        fields.putOptional("policies", value.policies, json)
        fields.putOptional("signals", value.signals, json)
        fields["status"] = json.encodeToJsonElement(value.status)
        fields["totals"] = json.encodeToJsonElement(value.totals)
        value.additionalProperties.filterKeys { it !in reservedKeys }.forEach { (key, element) -> fields[key] = element }
        output.encodeJsonElement(JsonObject(fields))
    }

    private inline fun <reified T> MutableMap<String, JsonElement>.putOptional(key: String, value: T?, json: Json) {
        if (value != null) this[key] = json.encodeToJsonElement(value)
    }

    private inline fun <reified T> JsonObject.required(key: String, json: Json): T =
        json.decodeFromJsonElement(get(key) ?: throw SerializationException("Missing $key for Checkout"))

    private inline fun <reified T> JsonObject.optional(key: String, json: Json): T? =
        get(key)?.let { json.decodeFromJsonElement<T?>(it) }
}
