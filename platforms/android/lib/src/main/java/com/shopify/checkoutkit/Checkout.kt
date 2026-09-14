package com.shopify.checkoutkit

import com.shopify.ucp.embedded.checkout.Buyer
import com.shopify.ucp.embedded.checkout.CheckoutDiscounts
import com.shopify.ucp.embedded.checkout.CheckoutFulfillment
import com.shopify.ucp.embedded.checkout.CheckoutStatus
import com.shopify.ucp.embedded.checkout.CheckoutTotal
import com.shopify.ucp.embedded.checkout.Context
import com.shopify.ucp.embedded.checkout.LineItem
import com.shopify.ucp.embedded.checkout.Link
import com.shopify.ucp.embedded.checkout.Message
import com.shopify.ucp.embedded.checkout.OrderConfirmation
import com.shopify.ucp.embedded.checkout.Payment
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import com.shopify.ucp.embedded.checkout.Checkout as ProtocolCheckout

/**
 * A complete checkout snapshot delivered by Checkout Kit lifecycle events.
 *
 * Domain fields retain the generated model types and optional values. Protocol metadata is
 * excluded, while unrecognized checkout extensions remain available in [additionalProperties].
 * Extensions are encoded alongside the named fields when this snapshot is serialized to JSON.
 */
@Serializable(with = CheckoutSerializer::class)
@Suppress("LongParameterList")
public data class Checkout(
    public val attribution: Map<String, String>? = null,
    public val buyer: Buyer? = null,
    public val context: Context? = null,
    public val continueURL: String? = null,
    public val currency: String,
    public val discounts: CheckoutDiscounts? = null,
    public val expiresAt: String? = null,
    public val fulfillment: CheckoutFulfillment? = null,
    public val id: String,
    public val lineItems: List<LineItem>,
    public val links: List<Link>,
    public val messages: List<Message>? = null,
    public val order: OrderConfirmation? = null,
    public val payment: Payment? = null,
    public val signals: JsonObject? = null,
    public val status: CheckoutStatus,
    public val totals: List<CheckoutTotal>,
    public val additionalProperties: Map<String, JsonElement> = emptyMap(),
) {
    public companion object {
        internal fun fromProtocol(checkout: ProtocolCheckout): Checkout = Checkout(
            attribution = checkout.attribution,
            buyer = checkout.buyer,
            context = checkout.context,
            continueURL = checkout.continueURL,
            currency = checkout.currency,
            discounts = checkout.discounts,
            expiresAt = checkout.expiresAt,
            fulfillment = checkout.fulfillment,
            id = checkout.id,
            lineItems = checkout.lineItems,
            links = checkout.links,
            messages = checkout.messages,
            order = checkout.order,
            payment = checkout.payment,
            signals = checkout.signals,
            status = checkout.status,
            totals = checkout.totals,
            additionalProperties = checkout.additionalProperties.filterKeys { it !in CheckoutSerializer.reservedKeys },
        )
    }
}
