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
import com.shopify.ucp.embedded.checkout.Policy
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
 *
 * Use [Builder] to construct snapshots for tests and [toBuilder] to create a modified snapshot.
 */
@Serializable(with = CheckoutSerializer::class)
public class Checkout private constructor(private val state: State) {
    public val actions: Map<String, List<JsonObject>>?
        get() = state.actions

    public val attribution: Map<String, String>?
        get() = state.attribution

    public val buyer: Buyer?
        get() = state.buyer

    public val context: Context?
        get() = state.context

    public val continueURL: String?
        get() = state.continueURL

    public val currency: String
        get() = state.currency

    public val discounts: CheckoutDiscounts?
        get() = state.discounts

    public val expiresAt: String?
        get() = state.expiresAt

    public val fulfillment: CheckoutFulfillment?
        get() = state.fulfillment

    public val id: String
        get() = state.id

    public val lineItems: List<LineItem>
        get() = state.lineItems

    public val links: List<Link>
        get() = state.links

    public val messages: List<Message>?
        get() = state.messages

    public val order: OrderConfirmation?
        get() = state.order

    public val payment: Payment?
        get() = state.payment

    public val policies: List<Policy>?
        get() = state.policies

    public val signals: JsonObject?
        get() = state.signals

    public val status: CheckoutStatus
        get() = state.status

    public val totals: List<CheckoutTotal>
        get() = state.totals

    public val additionalProperties: Map<String, JsonElement>
        get() = state.additionalProperties

    /** Returns a builder containing all values from this snapshot. */
    public fun toBuilder(): Builder = Builder()
        .actions(actions)
        .attribution(attribution)
        .buyer(buyer)
        .context(context)
        .continueURL(continueURL)
        .currency(currency)
        .discounts(discounts)
        .expiresAt(expiresAt)
        .fulfillment(fulfillment)
        .id(id)
        .lineItems(lineItems)
        .links(links)
        .messages(messages)
        .order(order)
        .payment(payment)
        .policies(policies)
        .signals(signals)
        .status(status)
        .totals(totals)
        .additionalProperties(additionalProperties)

    override fun equals(other: Any?): Boolean = other is Checkout && state == other.state

    override fun hashCode(): Int = state.hashCode()

    override fun toString(): String = "Checkout${state.toString().removePrefix("State")}"

    /**
     * Constructs checkout snapshots without depending on a constructor tied to the checkout schema.
     *
     * [currency], [id], [lineItems], [links], [status], and [totals] must be supplied before [build].
     * Optional fields default to `null`; empty collections remain distinct from absent fields.
     */
    @Suppress("TooManyFunctions")
    public class Builder {
        private var actions: Map<String, List<JsonObject>>? = null
        private var attribution: Map<String, String>? = null
        private var buyer: Buyer? = null
        private var context: Context? = null
        private var continueURL: String? = null
        private var currency: String? = null
        private var discounts: CheckoutDiscounts? = null
        private var expiresAt: String? = null
        private var fulfillment: CheckoutFulfillment? = null
        private var id: String? = null
        private var lineItems: List<LineItem>? = null
        private var links: List<Link>? = null
        private var messages: List<Message>? = null
        private var order: OrderConfirmation? = null
        private var payment: Payment? = null
        private var policies: List<Policy>? = null
        private var signals: JsonObject? = null
        private var status: CheckoutStatus? = null
        private var totals: List<CheckoutTotal>? = null
        private var additionalProperties: Map<String, JsonElement> = emptyMap()

        public fun actions(value: Map<String, List<JsonObject>>?): Builder = apply { actions = value }

        public fun attribution(value: Map<String, String>?): Builder = apply { attribution = value }

        public fun buyer(value: Buyer?): Builder = apply { buyer = value }

        public fun context(value: Context?): Builder = apply { context = value }

        public fun continueURL(value: String?): Builder = apply { continueURL = value }

        public fun currency(value: String): Builder = apply { currency = value }

        public fun discounts(value: CheckoutDiscounts?): Builder = apply { discounts = value }

        public fun expiresAt(value: String?): Builder = apply { expiresAt = value }

        public fun fulfillment(value: CheckoutFulfillment?): Builder = apply { fulfillment = value }

        public fun id(value: String): Builder = apply { id = value }

        public fun lineItems(value: List<LineItem>): Builder = apply { lineItems = value }

        public fun links(value: List<Link>): Builder = apply { links = value }

        public fun messages(value: List<Message>?): Builder = apply { messages = value }

        public fun order(value: OrderConfirmation?): Builder = apply { order = value }

        public fun payment(value: Payment?): Builder = apply { payment = value }

        public fun policies(value: List<Policy>?): Builder = apply { policies = value }

        public fun signals(value: JsonObject?): Builder = apply { signals = value }

        public fun status(value: CheckoutStatus): Builder = apply { status = value }

        public fun totals(value: List<CheckoutTotal>): Builder = apply { totals = value }

        public fun additionalProperties(value: Map<String, JsonElement>): Builder = apply { additionalProperties = value }

        /**
         * Returns a snapshot of the builder values, excluding reserved extension keys.
         *
         * @throws IllegalStateException if a required field has not been supplied.
         */
        public fun build(): Checkout = Checkout(
            State(
                actions = actions,
                attribution = attribution,
                buyer = buyer,
                context = context,
                continueURL = continueURL,
                currency = checkNotNull(currency) { "Missing required checkout field: currency" },
                discounts = discounts,
                expiresAt = expiresAt,
                fulfillment = fulfillment,
                id = checkNotNull(id) { "Missing required checkout field: id" },
                lineItems = checkNotNull(lineItems) { "Missing required checkout field: lineItems" },
                links = checkNotNull(links) { "Missing required checkout field: links" },
                messages = messages,
                order = order,
                payment = payment,
                policies = policies,
                signals = signals,
                status = checkNotNull(status) { "Missing required checkout field: status" },
                totals = checkNotNull(totals) { "Missing required checkout field: totals" },
                additionalProperties = additionalProperties.filterKeys { it !in CheckoutSerializer.reservedKeys },
            ),
        )
    }

    @Suppress("LongParameterList")
    private data class State(
        val actions: Map<String, List<JsonObject>>?,
        val attribution: Map<String, String>?,
        val buyer: Buyer?,
        val context: Context?,
        val continueURL: String?,
        val currency: String,
        val discounts: CheckoutDiscounts?,
        val expiresAt: String?,
        val fulfillment: CheckoutFulfillment?,
        val id: String,
        val lineItems: List<LineItem>,
        val links: List<Link>,
        val messages: List<Message>?,
        val order: OrderConfirmation?,
        val payment: Payment?,
        val policies: List<Policy>?,
        val signals: JsonObject?,
        val status: CheckoutStatus,
        val totals: List<CheckoutTotal>,
        val additionalProperties: Map<String, JsonElement>,
    )

    public companion object {
        internal fun fromProtocol(checkout: ProtocolCheckout): Checkout = Builder()
            .actions(checkout.actions)
            .attribution(checkout.attribution)
            .buyer(checkout.buyer)
            .context(checkout.context)
            .continueURL(checkout.continueURL)
            .currency(checkout.currency)
            .discounts(checkout.discounts)
            .expiresAt(checkout.expiresAt)
            .fulfillment(checkout.fulfillment)
            .id(checkout.id)
            .lineItems(checkout.lineItems)
            .links(checkout.links)
            .messages(checkout.messages)
            .order(checkout.order)
            .payment(checkout.payment)
            .policies(checkout.policies)
            .signals(checkout.signals)
            .status(checkout.status)
            .totals(checkout.totals)
            .additionalProperties(checkout.additionalProperties)
            .build()
    }
}
