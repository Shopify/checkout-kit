package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.*
import kotlinx.serialization.json.*
import kotlinx.serialization.descriptors.*
import kotlinx.serialization.encoding.*

/**
 * Base checkout schema. Extensions compose onto this using allOf.
 */
@Serializable(with = CheckoutSerializer::class)
public class Checkout internal constructor (
    /**
     * Outstanding extension-defined JsonObject for this checkout.
     */
    public val actions: Map<String, List<JsonObject>>? = null,

    public val attribution: Map<String, String>? = null,

    /**
     * Representation of the buyer.
     */
    public val buyer: Buyer? = null,

    public val context: Context? = null,

    /**
     * URL for checkout handoff and session recovery. MUST be provided when status is
     * requires_escalation. See specification for format and availability requirements.
     */
    @SerialName("continue_url")
    public val continueURL: String? = null,

    /**
     * ISO 4217 currency code reflecting the merchant's market determination. Derived from
     * address, context, and geo IP—buyers provide signals, merchants determine currency.
     */
    public val currency: String,

    public val discounts: CheckoutDiscounts? = null,

    /**
     * RFC 3339 expiry timestamp. Default TTL is 6 hours from creation if not sent.
     */
    @SerialName("expires_at")
    public val expiresAt: String? = null,

    /**
     * Fulfillment details.
     */
    public val fulfillment: CheckoutFulfillment? = null,

    /**
     * Unique identifier of the checkout session.
     */
    public val id: String,

    /**
     * List of line items being checked out.
     */
    @SerialName("line_items")
    public val lineItems: List<LineItem>,

    /**
     * Links to be displayed by the platform (Privacy Policy, TOS). Mandatory for legal
     * compliance.
     */
    public val links: List<Link>,

    /**
     * List of messages with error and info about the checkout session state.
     */
    public val messages: List<Message>? = null,

    /**
     * Details about an order created for this checkout session.
     */
    public val order: OrderConfirmation? = null,

    public val payment: Payment? = null,

    /**
     * Policies (e.g., return/refund terms) that apply to the items in this checkout.
     * `applies_to` targets are relative to the response root; when absent or empty, refer to
     * the URLs in `links[]`.
     */
    public val policies: List<Policy>? = null,

    public val signals: JsonObject? = null,

    /**
     * Checkout state indicating the current phase and required processing. See Checkout Status
     * lifecycle documentation for state transition details.
     */
    public val status: CheckoutStatus,

    /**
     * Different cart totals.
     */
    public val totals: List<CheckoutTotal>,

    public val ucp: UCPCheckoutResponseSchema,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Checkout &&
            actions == other.actions &&
            attribution == other.attribution &&
            buyer == other.buyer &&
            context == other.context &&
            continueURL == other.continueURL &&
            currency == other.currency &&
            discounts == other.discounts &&
            expiresAt == other.expiresAt &&
            fulfillment == other.fulfillment &&
            id == other.id &&
            lineItems == other.lineItems &&
            links == other.links &&
            messages == other.messages &&
            order == other.order &&
            payment == other.payment &&
            policies == other.policies &&
            signals == other.signals &&
            status == other.status &&
            totals == other.totals &&
            ucp == other.ucp &&
            additionalProperties == other.additionalProperties)

    override fun hashCode(): Int = java.util.Objects.hash(actions, attribution, buyer, context, continueURL, currency, discounts, expiresAt, fulfillment, id, lineItems, links, messages, order, payment, policies, signals, status, totals, ucp, additionalProperties)

    override fun toString(): String = "Checkout(actions=$actions, attribution=$attribution, buyer=$buyer, context=$context, continueURL=$continueURL, currency=$currency, discounts=$discounts, expiresAt=$expiresAt, fulfillment=$fulfillment, id=$id, lineItems=$lineItems, links=$links, messages=$messages, order=$order, payment=$payment, policies=$policies, signals=$signals, status=$status, totals=$totals, ucp=$ucp, additionalProperties=$additionalProperties)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(currency, id, lineItems, links, status, totals, ucp).also { builder ->
        builder.actions = this.actions
        builder.attribution = this.attribution
        builder.buyer = this.buyer
        builder.context = this.context
        builder.continueURL = this.continueURL
        builder.discounts = this.discounts
        builder.expiresAt = this.expiresAt
        builder.fulfillment = this.fulfillment
        builder.messages = this.messages
        builder.order = this.order
        builder.payment = this.payment
        builder.policies = this.policies
        builder.signals = this.signals
        builder.additionalProperties = this.additionalProperties
    }

    /** Builds a [Checkout]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var currency: String,
        public var id: String,
        public var lineItems: List<LineItem>,
        public var links: List<Link>,
        public var status: CheckoutStatus,
        public var totals: List<CheckoutTotal>,
        public var ucp: UCPCheckoutResponseSchema,
    ) {
        public var actions: Map<String, List<JsonObject>>? = null

        public var attribution: Map<String, String>? = null

        public var buyer: Buyer? = null

        public var context: Context? = null

        public var continueURL: String? = null

        public var discounts: CheckoutDiscounts? = null

        public var expiresAt: String? = null

        public var fulfillment: CheckoutFulfillment? = null

        public var messages: List<Message>? = null

        public var order: OrderConfirmation? = null

        public var payment: Payment? = null

        public var policies: List<Policy>? = null

        public var signals: JsonObject? = null

        public var additionalProperties: Map<String, JsonElement> = emptyMap()

        public fun actions(value: Map<String, List<JsonObject>>?): Builder = apply { this.actions = value }

        public fun attribution(value: Map<String, String>?): Builder = apply { this.attribution = value }

        public fun buyer(value: Buyer?): Builder = apply { this.buyer = value }

        public fun context(value: Context?): Builder = apply { this.context = value }

        public fun continueURL(value: String?): Builder = apply { this.continueURL = value }

        public fun currency(value: String): Builder = apply { this.currency = value }

        public fun discounts(value: CheckoutDiscounts?): Builder = apply { this.discounts = value }

        public fun expiresAt(value: String?): Builder = apply { this.expiresAt = value }

        public fun fulfillment(value: CheckoutFulfillment?): Builder = apply { this.fulfillment = value }

        public fun id(value: String): Builder = apply { this.id = value }

        public fun lineItems(value: List<LineItem>): Builder = apply { this.lineItems = value }

        public fun links(value: List<Link>): Builder = apply { this.links = value }

        public fun messages(value: List<Message>?): Builder = apply { this.messages = value }

        public fun order(value: OrderConfirmation?): Builder = apply { this.order = value }

        public fun payment(value: Payment?): Builder = apply { this.payment = value }

        public fun policies(value: List<Policy>?): Builder = apply { this.policies = value }

        public fun signals(value: JsonObject?): Builder = apply { this.signals = value }

        public fun status(value: CheckoutStatus): Builder = apply { this.status = value }

        public fun totals(value: List<CheckoutTotal>): Builder = apply { this.totals = value }

        public fun ucp(value: UCPCheckoutResponseSchema): Builder = apply { this.ucp = value }

        public fun additionalProperties(value: Map<String, JsonElement>): Builder = apply { this.additionalProperties = value }

        public fun build(): Checkout = Checkout(actions = actions, attribution = attribution, buyer = buyer, context = context, continueURL = continueURL, currency = currency, discounts = discounts, expiresAt = expiresAt, fulfillment = fulfillment, id = id, lineItems = lineItems, links = links, messages = messages, order = order, payment = payment, policies = policies, signals = signals, status = status, totals = totals, ucp = ucp, additionalProperties = additionalProperties)
    }

    public companion object {
        /** Builds a [Checkout]: `Checkout(required = …) { optional = … }`. */
        public operator fun invoke(currency: String, id: String, lineItems: List<LineItem>, links: List<Link>, status: CheckoutStatus, totals: List<CheckoutTotal>, ucp: UCPCheckoutResponseSchema, configure: Builder.() -> Unit = {}): Checkout =
            Builder(currency, id, lineItems, links, status, totals, ucp).apply(configure).build()
    }
}

/**
 * Non-empty instances of one Action type. JSON preserves array order; the declaring
 * extension defines whether order has processing semantics.
 *
 * Common fields for one outstanding Action instance are id and optional config. The
 * extension declaring the Action type defines type-specific processing data under config.
 * Additional properties are permitted for forward compatibility.
 */

/**
 * Representation of the buyer.
 */
@Serializable(with = BuyerSerializer::class)
public class Buyer internal constructor (
    /**
     * Email of the buyer.
     */
    public val email: String? = null,

    /**
     * First name of the buyer.
     */
    @SerialName("first_name")
    public val firstName: String? = null,

    /**
     * Last name of the buyer.
     */
    @SerialName("last_name")
    public val lastName: String? = null,

    /**
     * E.164 standard.
     */
    @SerialName("phone_number")
    public val phoneNumber: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Buyer &&
            email == other.email &&
            firstName == other.firstName &&
            lastName == other.lastName &&
            phoneNumber == other.phoneNumber &&
            additionalProperties == other.additionalProperties)

    override fun hashCode(): Int = java.util.Objects.hash(email, firstName, lastName, phoneNumber, additionalProperties)

    override fun toString(): String = "Buyer(email=$email, firstName=$firstName, lastName=$lastName, phoneNumber=$phoneNumber, additionalProperties=$additionalProperties)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.email = this.email
        builder.firstName = this.firstName
        builder.lastName = this.lastName
        builder.phoneNumber = this.phoneNumber
        builder.additionalProperties = this.additionalProperties
    }

    /** Builds a [Buyer]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var email: String? = null

        public var firstName: String? = null

        public var lastName: String? = null

        public var phoneNumber: String? = null

        public var additionalProperties: Map<String, JsonElement> = emptyMap()

        public fun email(value: String?): Builder = apply { this.email = value }

        public fun firstName(value: String?): Builder = apply { this.firstName = value }

        public fun lastName(value: String?): Builder = apply { this.lastName = value }

        public fun phoneNumber(value: String?): Builder = apply { this.phoneNumber = value }

        public fun additionalProperties(value: Map<String, JsonElement>): Builder = apply { this.additionalProperties = value }

        public fun build(): Buyer = Buyer(email = email, firstName = firstName, lastName = lastName, phoneNumber = phoneNumber, additionalProperties = additionalProperties)
    }

    public companion object {
        /** Builds a [Buyer]: `Buyer(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): Buyer =
            Builder().apply(configure).build()
    }
}

/**
 * Provisional buyer signals for relevance and localization—not authoritative data.
 * Businesses SHOULD use these values when verified inputs (e.g., shipping address) are
 * absent, and MAY ignore or down-rank them if inconsistent with higher-confidence signals
 * (authenticated account, risk detection) or regulatory constraints (export controls).
 * Eligibility and policy enforcement MUST occur at checkout time using binding transaction
 * data. Context SHOULD be non-identifying and can be disclosed progressively—coarse signals
 * early, finer resolution as the session progresses. Higher-resolution data (shipping
 * address, billing address) supersedes context.
 *
 * A coarse geographic location — country, region, and postal code. A lightweight
 * alternative to a full postal address.
 */
@Serializable(with = ContextSerializer::class)
public class Context internal constructor (
    /**
     * The country, as a 2-letter ISO 3166-1 alpha-2 code (e.g. "US"). A 3-letter alpha-3 code
     * or full country name MAY also be used.
     */
    @SerialName("address_country")
    public val addressCountry: String? = null,

    /**
     * The first-level administrative region within the country (e.g. a state or province such
     * as California).
     */
    @SerialName("address_region")
    public val addressRegion: String? = null,

    /**
     * The postal code (e.g. "94043").
     */
    @SerialName("postal_code")
    public val postalCode: String? = null,

    /**
     * Preferred currency (ISO 4217, e.g., 'EUR', 'USD'). Businesses determine presentment
     * currency from context and authoritative signals; this hint MAY inform selection in
     * multi-currency markets. Also serves as the denomination for price filter values —
     * platforms SHOULD include this field when sending price filters. Response prices include
     * explicit currency confirming the resolution.
     */
    public val currency: String? = null,

    /**
     * Buyer claims about eligible benefits such as loyalty membership, payment instrument
     * perks, and similar. Recognized claims MAY inform the Business response (e.g., member-only
     * product availability, adjusted pricing in catalog, provisional discounts at cart or
     * checkout). Businesses MUST ignore unrecognized values without error. Values MUST use
     * reverse-domain naming (e.g., 'com.example.loyalty_gold', 'org.school.student') and MUST
     * be non-identifying.
     */
    public val eligibility: List<String>? = null,

    /**
     * Background context describing buyer's intent (e.g., 'looking for a gift under $50', 'need
     * something durable for outdoor use'). Informs relevance, recommendations, and
     * personalization.
     */
    public val intent: String? = null,

    /**
     * Preferred language for content. Use IETF BCP 47 language tags (e.g., 'en', 'fr-CA',
     * 'zh-Hans'). For REST, equivalent to Accept-Language header—platforms SHOULD fall back to
     * Accept-Language when this field is absent; when provided, overrides Accept-Language.
     * Businesses MAY return content in a different language if unavailable.
     */
    public val language: String? = null,

    /**
     * Stable, opaque identifier for a Location in the Business's namespace. This provisional,
     * non-binding hint is distinct from the Buyer's locality. The operation specification or an
     * active capability/extension defines its effects. A common example in retail shopping is
     * the default home store ID selected and saved by the user when purchasing groceries.
     */
    public val location: String? = null,

    /**
     * Buyer-preferred payment handlers in priority order (most preferred first). Each entry
     * names a handler advertised in the Business profile's `ucp.payment_handlers`, optionally
     * narrowed to preferred instrument types. The Business SHOULD use it to preselect or
     * prioritize the handler (and type, when given) and MAY ignore unavailable or ineligible
     * entries; unrecognized values MUST be ignored without error.
     */
    public val payment: List<PreferredPaymentHandler>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Context &&
            addressCountry == other.addressCountry &&
            addressRegion == other.addressRegion &&
            postalCode == other.postalCode &&
            currency == other.currency &&
            eligibility == other.eligibility &&
            intent == other.intent &&
            language == other.language &&
            location == other.location &&
            payment == other.payment &&
            additionalProperties == other.additionalProperties)

    override fun hashCode(): Int = java.util.Objects.hash(addressCountry, addressRegion, postalCode, currency, eligibility, intent, language, location, payment, additionalProperties)

    override fun toString(): String = "Context(addressCountry=$addressCountry, addressRegion=$addressRegion, postalCode=$postalCode, currency=$currency, eligibility=$eligibility, intent=$intent, language=$language, location=$location, payment=$payment, additionalProperties=$additionalProperties)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.addressCountry = this.addressCountry
        builder.addressRegion = this.addressRegion
        builder.postalCode = this.postalCode
        builder.currency = this.currency
        builder.eligibility = this.eligibility
        builder.intent = this.intent
        builder.language = this.language
        builder.location = this.location
        builder.payment = this.payment
        builder.additionalProperties = this.additionalProperties
    }

    /** Builds a [Context]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var addressCountry: String? = null

        public var addressRegion: String? = null

        public var postalCode: String? = null

        public var currency: String? = null

        public var eligibility: List<String>? = null

        public var intent: String? = null

        public var language: String? = null

        public var location: String? = null

        public var payment: List<PreferredPaymentHandler>? = null

        public var additionalProperties: Map<String, JsonElement> = emptyMap()

        public fun addressCountry(value: String?): Builder = apply { this.addressCountry = value }

        public fun addressRegion(value: String?): Builder = apply { this.addressRegion = value }

        public fun postalCode(value: String?): Builder = apply { this.postalCode = value }

        public fun currency(value: String?): Builder = apply { this.currency = value }

        public fun eligibility(value: List<String>?): Builder = apply { this.eligibility = value }

        public fun intent(value: String?): Builder = apply { this.intent = value }

        public fun language(value: String?): Builder = apply { this.language = value }

        public fun location(value: String?): Builder = apply { this.location = value }

        public fun payment(value: List<PreferredPaymentHandler>?): Builder = apply { this.payment = value }

        public fun additionalProperties(value: Map<String, JsonElement>): Builder = apply { this.additionalProperties = value }

        public fun build(): Context = Context(addressCountry = addressCountry, addressRegion = addressRegion, postalCode = postalCode, currency = currency, eligibility = eligibility, intent = intent, language = language, location = location, payment = payment, additionalProperties = additionalProperties)
    }

    public companion object {
        /** Builds a [Context]: `Context(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): Context =
            Builder().apply(configure).build()
    }
}

@Serializable
public class PreferredPaymentHandler internal constructor (
    /**
     * Handler registry key advertised in the Business profile's `ucp.payment_handlers`.
     */
    public val handler: String,

    /**
     * Optional preferred instrument types for this handler, in priority order, aligned with the
     * handler's advertised `payment_instrument.type` values (for example `card` or `bank`).
     * Unrecognized values MUST be ignored.
     */
    public val types: List<String>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is PreferredPaymentHandler &&
            handler == other.handler &&
            types == other.types)

    override fun hashCode(): Int = java.util.Objects.hash(handler, types)

    override fun toString(): String = "PreferredPaymentHandler(handler=$handler, types=$types)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(handler).also { builder ->
        builder.types = this.types
    }

    /** Builds a [PreferredPaymentHandler]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var handler: String,
    ) {
        public var types: List<String>? = null

        public fun handler(value: String): Builder = apply { this.handler = value }

        public fun types(value: List<String>?): Builder = apply { this.types = value }

        public fun build(): PreferredPaymentHandler = PreferredPaymentHandler(handler = handler, types = types)
    }

    public companion object {
        /** Builds a [PreferredPaymentHandler]: `PreferredPaymentHandler(required = …) { optional = … }`. */
        public operator fun invoke(handler: String, configure: Builder.() -> Unit = {}): PreferredPaymentHandler =
            Builder(handler).apply(configure).build()
    }
}

/**
 * Discount codes input and applied discounts output.
 */
@Serializable
public class CheckoutDiscounts internal constructor (
    /**
     * Discounts successfully applied (code-based and automatic).
     */
    public val applied: List<AppliedDiscount>? = null,

    /**
     * Discount codes to apply. Case-insensitive. Replaces previously submitted codes. Send
     * empty array to clear.
     */
    public val codes: List<String>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is CheckoutDiscounts &&
            applied == other.applied &&
            codes == other.codes)

    override fun hashCode(): Int = java.util.Objects.hash(applied, codes)

    override fun toString(): String = "CheckoutDiscounts(applied=$applied, codes=$codes)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.applied = this.applied
        builder.codes = this.codes
    }

    /** Builds a [CheckoutDiscounts]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var applied: List<AppliedDiscount>? = null

        public var codes: List<String>? = null

        public fun applied(value: List<AppliedDiscount>?): Builder = apply { this.applied = value }

        public fun codes(value: List<String>?): Builder = apply { this.codes = value }

        public fun build(): CheckoutDiscounts = CheckoutDiscounts(applied = applied, codes = codes)
    }

    public companion object {
        /** Builds a [CheckoutDiscounts]: `CheckoutDiscounts(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): CheckoutDiscounts =
            Builder().apply(configure).build()
    }
}

/**
 * A discount that was successfully applied.
 */
@Serializable
public class AppliedDiscount internal constructor (
    /**
     * Breakdown of where this discount was allocated. Sum of allocation amounts equals total
     * amount.
     */
    public val allocations: List<DiscountAllocation>? = null,

    /**
     * Total discount amount in ISO 4217 minor units.
     */
    public val amount: Long,

    /**
     * True if applied automatically by merchant rules (no code required).
     */
    public val automatic: Boolean? = null,

    /**
     * The discount code. Omitted for automatic discounts.
     */
    public val code: String? = null,

    /**
     * The eligibility claim accepted by the Business for this discount. Corresponds to a value
     * from context.eligibility. Omitted for code-based and non-eligibility automatic discounts.
     */
    public val eligibility: String? = null,

    /**
     * Allocation method. 'each' = applied independently per item. 'across' = split
     * proportionally by value.
     */
    public val method: DiscountMethod? = null,

    /**
     * Stacking order for discount calculation. Lower numbers applied first (1 = first).
     */
    public val priority: Long? = null,

    /**
     * True if this discount requires additional verification.
     */
    public val provisional: Boolean? = null,

    /**
     * Human-readable discount name (e.g., 'Summer Sale 20% Off').
     */
    public val title: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is AppliedDiscount &&
            allocations == other.allocations &&
            amount == other.amount &&
            automatic == other.automatic &&
            code == other.code &&
            eligibility == other.eligibility &&
            method == other.method &&
            priority == other.priority &&
            provisional == other.provisional &&
            title == other.title)

    override fun hashCode(): Int = java.util.Objects.hash(allocations, amount, automatic, code, eligibility, method, priority, provisional, title)

    override fun toString(): String = "AppliedDiscount(allocations=$allocations, amount=$amount, automatic=$automatic, code=$code, eligibility=$eligibility, method=$method, priority=$priority, provisional=$provisional, title=$title)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(amount, title).also { builder ->
        builder.allocations = this.allocations
        builder.automatic = this.automatic
        builder.code = this.code
        builder.eligibility = this.eligibility
        builder.method = this.method
        builder.priority = this.priority
        builder.provisional = this.provisional
    }

    /** Builds a [AppliedDiscount]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var amount: Long,
        public var title: String,
    ) {
        public var allocations: List<DiscountAllocation>? = null

        public var automatic: Boolean? = null

        public var code: String? = null

        public var eligibility: String? = null

        public var method: DiscountMethod? = null

        public var priority: Long? = null

        public var provisional: Boolean? = null

        public fun allocations(value: List<DiscountAllocation>?): Builder = apply { this.allocations = value }

        public fun amount(value: Long): Builder = apply { this.amount = value }

        public fun automatic(value: Boolean?): Builder = apply { this.automatic = value }

        public fun code(value: String?): Builder = apply { this.code = value }

        public fun eligibility(value: String?): Builder = apply { this.eligibility = value }

        public fun method(value: DiscountMethod?): Builder = apply { this.method = value }

        public fun priority(value: Long?): Builder = apply { this.priority = value }

        public fun provisional(value: Boolean?): Builder = apply { this.provisional = value }

        public fun title(value: String): Builder = apply { this.title = value }

        public fun build(): AppliedDiscount = AppliedDiscount(allocations = allocations, amount = amount, automatic = automatic, code = code, eligibility = eligibility, method = method, priority = priority, provisional = provisional, title = title)
    }

    public companion object {
        /** Builds a [AppliedDiscount]: `AppliedDiscount(required = …) { optional = … }`. */
        public operator fun invoke(amount: Long, title: String, configure: Builder.() -> Unit = {}): AppliedDiscount =
            Builder(amount, title).apply(configure).build()
    }
}

/**
 * Breakdown of how a discount amount was allocated to a specific target.
 */
@Serializable
public class DiscountAllocation internal constructor (
    /**
     * Amount allocated to this target in ISO 4217 minor units.
     */
    public val amount: Long,

    /**
     * RFC 9535 JSONPath to the allocation target (e.g., '$.line_items[0]', '$.totals[?@.type ==
     * "fulfillment"]').
     */
    public val path: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is DiscountAllocation &&
            amount == other.amount &&
            path == other.path)

    override fun hashCode(): Int = java.util.Objects.hash(amount, path)

    override fun toString(): String = "DiscountAllocation(amount=$amount, path=$path)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(amount, path)

    /** Builds a [DiscountAllocation]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var amount: Long,
        public var path: String,
    ) {
        public fun amount(value: Long): Builder = apply { this.amount = value }

        public fun path(value: String): Builder = apply { this.path = value }

        public fun build(): DiscountAllocation = DiscountAllocation(amount = amount, path = path)
    }

    public companion object {
        /** Builds a [DiscountAllocation]: `DiscountAllocation(required = …) { optional = … }`. */
        public operator fun invoke(amount: Long, path: String, configure: Builder.() -> Unit = {}): DiscountAllocation =
            Builder(amount, path).apply(configure).build()
    }
}

/**
 * Allocation method. 'each' = applied independently per item. 'across' = split
 * proportionally by value.
 */
@Serializable(with = DiscountMethodSerializer::class)
public class DiscountMethod private constructor(public val value: String) {
    public companion object {
        @JvmField public val Across: DiscountMethod = DiscountMethod("across")
        @JvmField public val Each: DiscountMethod = DiscountMethod("each")

        /** Values defined by the pinned protocol version. */
        internal val known: Map<String, DiscountMethod> = listOf(Across, Each).associateBy { it.value }

        internal fun fromWire(value: String): DiscountMethod = known[value] ?: DiscountMethod(value)
    }

    override fun equals(other: Any?): Boolean = this === other || (other is DiscountMethod && value == other.value)

    override fun hashCode(): Int = value.hashCode()

    override fun toString(): String = value
}

internal object DiscountMethodSerializer : KSerializer<DiscountMethod> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.DiscountMethod", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): DiscountMethod {
        val value = if (decoder is JsonDecoder) {
            val primitive = decoder.decodeJsonElement() as? JsonPrimitive
            if (primitive?.isString != true) {
                throw SerializationException("Expected a string for DiscountMethod")
            }
            primitive.content
        } else {
            decoder.decodeString()
        }
        return DiscountMethod.fromWire(value)
    }

    override fun serialize(encoder: Encoder, value: DiscountMethod): Unit = encoder.encodeString(value.value)
}

/**
 * Fulfillment details.
 *
 * Container for fulfillment methods and availability.
 */
@Serializable
public class CheckoutFulfillment internal constructor (
    /**
     * Inventory availability hints.
     */
    @SerialName("available_methods")
    public val availableMethods: List<FulfillmentAvailableMethod>? = null,

    /**
     * Fulfillment methods for cart items.
     */
    public val methods: List<FulfillmentMethod>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is CheckoutFulfillment &&
            availableMethods == other.availableMethods &&
            methods == other.methods)

    override fun hashCode(): Int = java.util.Objects.hash(availableMethods, methods)

    override fun toString(): String = "CheckoutFulfillment(availableMethods=$availableMethods, methods=$methods)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.availableMethods = this.availableMethods
        builder.methods = this.methods
    }

    /** Builds a [CheckoutFulfillment]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var availableMethods: List<FulfillmentAvailableMethod>? = null

        public var methods: List<FulfillmentMethod>? = null

        public fun availableMethods(value: List<FulfillmentAvailableMethod>?): Builder = apply { this.availableMethods = value }

        public fun methods(value: List<FulfillmentMethod>?): Builder = apply { this.methods = value }

        public fun build(): CheckoutFulfillment = CheckoutFulfillment(availableMethods = availableMethods, methods = methods)
    }

    public companion object {
        /** Builds a [CheckoutFulfillment]: `CheckoutFulfillment(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): CheckoutFulfillment =
            Builder().apply(configure).build()
    }
}

/**
 * Inventory availability hint for a fulfillment method type.
 */
@Serializable(with = FulfillmentAvailableMethodSerializer::class)
public class FulfillmentAvailableMethod internal constructor (
    /**
     * Human-readable availability info (e.g., 'Available for pickup at Downtown Store today').
     */
    public val description: String? = null,

    /**
     * 'now' for immediate availability, or ISO 8601 date for future (preorders, transfers).
     */
    @SerialName("fulfillable_on")
    public val fulfillableOn: String? = null,

    /**
     * Line items available for this fulfillment method.
     */
    @SerialName("line_item_ids")
    public val lineItemIDS: List<String>,

    /**
     * Fulfillment method type this availability applies to. Well-known values: `shipping`,
     * `pickup`; businesses MAY use additional values.
     */
    public val type: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is FulfillmentAvailableMethod &&
            description == other.description &&
            fulfillableOn == other.fulfillableOn &&
            lineItemIDS == other.lineItemIDS &&
            type == other.type &&
            additionalProperties == other.additionalProperties)

    override fun hashCode(): Int = java.util.Objects.hash(description, fulfillableOn, lineItemIDS, type, additionalProperties)

    override fun toString(): String = "FulfillmentAvailableMethod(description=$description, fulfillableOn=$fulfillableOn, lineItemIDS=$lineItemIDS, type=$type, additionalProperties=$additionalProperties)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(lineItemIDS, type).also { builder ->
        builder.description = this.description
        builder.fulfillableOn = this.fulfillableOn
        builder.additionalProperties = this.additionalProperties
    }

    /** Builds a [FulfillmentAvailableMethod]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var lineItemIDS: List<String>,
        public var type: String,
    ) {
        public var description: String? = null

        public var fulfillableOn: String? = null

        public var additionalProperties: Map<String, JsonElement> = emptyMap()

        public fun description(value: String?): Builder = apply { this.description = value }

        public fun fulfillableOn(value: String?): Builder = apply { this.fulfillableOn = value }

        public fun lineItemIDS(value: List<String>): Builder = apply { this.lineItemIDS = value }

        public fun type(value: String): Builder = apply { this.type = value }

        public fun additionalProperties(value: Map<String, JsonElement>): Builder = apply { this.additionalProperties = value }

        public fun build(): FulfillmentAvailableMethod = FulfillmentAvailableMethod(description = description, fulfillableOn = fulfillableOn, lineItemIDS = lineItemIDS, type = type, additionalProperties = additionalProperties)
    }

    public companion object {
        /** Builds a [FulfillmentAvailableMethod]: `FulfillmentAvailableMethod(required = …) { optional = … }`. */
        public operator fun invoke(lineItemIDS: List<String>, type: String, configure: Builder.() -> Unit = {}): FulfillmentAvailableMethod =
            Builder(lineItemIDS, type).apply(configure).build()
    }
}

/**
 * A fulfillment method with destinations and groups.
 */
@Serializable(with = FulfillmentMethodSerializer::class)
public class FulfillmentMethod internal constructor (
    /**
     * Available destinations for this method. In Business responses, each destination carries a
     * `type` and `id`.
     */
    public val destinations: List<FulfillmentDestination>? = null,

    /**
     * Fulfillment groups for selecting options. Agent sets selected_option_id on groups to
     * choose shipping method.
     */
    public val groups: List<FulfillmentGroup>? = null,

    /**
     * Unique fulfillment method identifier.
     */
    public val id: String,

    /**
     * Line item IDs fulfilled via this method.
     */
    @SerialName("line_item_ids")
    public val lineItemIDS: List<String>,

    /**
     * ID of the selected destination. Accepts any stable, Business-scoped ID the Business
     * recognizes for this method, including Location IDs not yet enumerated in `destinations`.
     */
    @SerialName("selected_destination_id")
    public val selectedDestinationID: String? = null,

    /**
     * Fulfillment method type. Well-known values: `shipping`, `pickup`. Businesses MAY use
     * additional values.
     */
    public val type: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is FulfillmentMethod &&
            destinations == other.destinations &&
            groups == other.groups &&
            id == other.id &&
            lineItemIDS == other.lineItemIDS &&
            selectedDestinationID == other.selectedDestinationID &&
            type == other.type &&
            additionalProperties == other.additionalProperties)

    override fun hashCode(): Int = java.util.Objects.hash(destinations, groups, id, lineItemIDS, selectedDestinationID, type, additionalProperties)

    override fun toString(): String = "FulfillmentMethod(destinations=$destinations, groups=$groups, id=$id, lineItemIDS=$lineItemIDS, selectedDestinationID=$selectedDestinationID, type=$type, additionalProperties=$additionalProperties)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, lineItemIDS, type).also { builder ->
        builder.destinations = this.destinations
        builder.groups = this.groups
        builder.selectedDestinationID = this.selectedDestinationID
        builder.additionalProperties = this.additionalProperties
    }

    /** Builds a [FulfillmentMethod]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var lineItemIDS: List<String>,
        public var type: String,
    ) {
        public var destinations: List<FulfillmentDestination>? = null

        public var groups: List<FulfillmentGroup>? = null

        public var selectedDestinationID: String? = null

        public var additionalProperties: Map<String, JsonElement> = emptyMap()

        public fun destinations(value: List<FulfillmentDestination>?): Builder = apply { this.destinations = value }

        public fun groups(value: List<FulfillmentGroup>?): Builder = apply { this.groups = value }

        public fun id(value: String): Builder = apply { this.id = value }

        public fun lineItemIDS(value: List<String>): Builder = apply { this.lineItemIDS = value }

        public fun selectedDestinationID(value: String?): Builder = apply { this.selectedDestinationID = value }

        public fun type(value: String): Builder = apply { this.type = value }

        public fun additionalProperties(value: Map<String, JsonElement>): Builder = apply { this.additionalProperties = value }

        public fun build(): FulfillmentMethod = FulfillmentMethod(destinations = destinations, groups = groups, id = id, lineItemIDS = lineItemIDS, selectedDestinationID = selectedDestinationID, type = type, additionalProperties = additionalProperties)
    }

    public companion object {
        /** Builds a [FulfillmentMethod]: `FulfillmentMethod(required = …) { optional = … }`. */
        public operator fun invoke(id: String, lineItemIDS: List<String>, type: String, configure: Builder.() -> Unit = {}): FulfillmentMethod =
            Builder(id, lineItemIDS, type).apply(configure).build()
    }
}

/**
 * A destination for fulfillment.
 */
@Serializable
public class FulfillmentDestination internal constructor (
    /**
     * Physical address of the location.
     */
    public val address: PostalAddress? = null,

    /**
     * The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
     * For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
     * full country name such as "Singapore" can also be used.
     */
    @SerialName("address_country")
    public val addressCountry: String? = null,

    /**
     * The locality in which the street address is, and which is in the region. For example,
     * Mountain View.
     */
    @SerialName("address_locality")
    public val addressLocality: String? = null,

    /**
     * The region in which the locality is, and which is in the country. Required for applicable
     * countries (i.e. state in US, province in CA). For example, California or another
     * appropriate first-level Administrative division.
     */
    @SerialName("address_region")
    public val addressRegion: String? = null,

    /**
     * An address extension such as an apartment number, C/O or alternative name.
     */
    @SerialName("extended_address")
    public val extendedAddress: String? = null,

    /**
     * Optional. First name of the contact associated with the address.
     */
    @SerialName("first_name")
    public val firstName: String? = null,

    /**
     * Fulfillment destination identifier.
     */
    public val id: String,

    /**
     * Optional. Last name of the contact associated with the address.
     */
    @SerialName("last_name")
    public val lastName: String? = null,

    /**
     * Buyer-facing, Business-owned display name.
     */
    public val name: String? = null,

    /**
     * Optional. Phone number of the contact associated with the address.
     */
    @SerialName("phone_number")
    public val phoneNumber: String? = null,

    /**
     * The postal code. For example, 94043.
     */
    @SerialName("postal_code")
    public val postalCode: String? = null,

    /**
     * The street address.
     */
    @SerialName("street_address")
    public val streetAddress: String? = null,

    /**
     * Destination contract discriminator. Required in Business responses and optional in
     * Platform requests. Well-known values: `shipping_address`, `business_location`. The
     * enclosing method contract defines request defaults and which fields the Platform may
     * write; negotiated extensions define additional values.
     */
    public val type: String? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is FulfillmentDestination &&
            address == other.address &&
            addressCountry == other.addressCountry &&
            addressLocality == other.addressLocality &&
            addressRegion == other.addressRegion &&
            extendedAddress == other.extendedAddress &&
            firstName == other.firstName &&
            id == other.id &&
            lastName == other.lastName &&
            name == other.name &&
            phoneNumber == other.phoneNumber &&
            postalCode == other.postalCode &&
            streetAddress == other.streetAddress &&
            type == other.type)

    override fun hashCode(): Int = java.util.Objects.hash(address, addressCountry, addressLocality, addressRegion, extendedAddress, firstName, id, lastName, name, phoneNumber, postalCode, streetAddress, type)

    override fun toString(): String = "FulfillmentDestination(address=$address, addressCountry=$addressCountry, addressLocality=$addressLocality, addressRegion=$addressRegion, extendedAddress=$extendedAddress, firstName=$firstName, id=$id, lastName=$lastName, name=$name, phoneNumber=$phoneNumber, postalCode=$postalCode, streetAddress=$streetAddress, type=$type)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id).also { builder ->
        builder.address = this.address
        builder.addressCountry = this.addressCountry
        builder.addressLocality = this.addressLocality
        builder.addressRegion = this.addressRegion
        builder.extendedAddress = this.extendedAddress
        builder.firstName = this.firstName
        builder.lastName = this.lastName
        builder.name = this.name
        builder.phoneNumber = this.phoneNumber
        builder.postalCode = this.postalCode
        builder.streetAddress = this.streetAddress
        builder.type = this.type
    }

    /** Builds a [FulfillmentDestination]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
    ) {
        public var address: PostalAddress? = null

        public var addressCountry: String? = null

        public var addressLocality: String? = null

        public var addressRegion: String? = null

        public var extendedAddress: String? = null

        public var firstName: String? = null

        public var lastName: String? = null

        public var name: String? = null

        public var phoneNumber: String? = null

        public var postalCode: String? = null

        public var streetAddress: String? = null

        public var type: String? = null

        public fun address(value: PostalAddress?): Builder = apply { this.address = value }

        public fun addressCountry(value: String?): Builder = apply { this.addressCountry = value }

        public fun addressLocality(value: String?): Builder = apply { this.addressLocality = value }

        public fun addressRegion(value: String?): Builder = apply { this.addressRegion = value }

        public fun extendedAddress(value: String?): Builder = apply { this.extendedAddress = value }

        public fun firstName(value: String?): Builder = apply { this.firstName = value }

        public fun id(value: String): Builder = apply { this.id = value }

        public fun lastName(value: String?): Builder = apply { this.lastName = value }

        public fun name(value: String?): Builder = apply { this.name = value }

        public fun phoneNumber(value: String?): Builder = apply { this.phoneNumber = value }

        public fun postalCode(value: String?): Builder = apply { this.postalCode = value }

        public fun streetAddress(value: String?): Builder = apply { this.streetAddress = value }

        public fun type(value: String?): Builder = apply { this.type = value }

        public fun build(): FulfillmentDestination = FulfillmentDestination(address = address, addressCountry = addressCountry, addressLocality = addressLocality, addressRegion = addressRegion, extendedAddress = extendedAddress, firstName = firstName, id = id, lastName = lastName, name = name, phoneNumber = phoneNumber, postalCode = postalCode, streetAddress = streetAddress, type = type)
    }

    public companion object {
        /** Builds a [FulfillmentDestination]: `FulfillmentDestination(required = …) { optional = … }`. */
        public operator fun invoke(id: String, configure: Builder.() -> Unit = {}): FulfillmentDestination =
            Builder(id).apply(configure).build()
    }
}

/**
 * Physical address of the location.
 *
 * The billing address associated with this payment method.
 *
 * Delivery destination address.
 */
@Serializable
public class PostalAddress internal constructor (
    /**
     * The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
     * For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
     * full country name such as "Singapore" can also be used.
     */
    @SerialName("address_country")
    public val addressCountry: String? = null,

    /**
     * The locality in which the street address is, and which is in the region. For example,
     * Mountain View.
     */
    @SerialName("address_locality")
    public val addressLocality: String? = null,

    /**
     * The region in which the locality is, and which is in the country. Required for applicable
     * countries (i.e. state in US, province in CA). For example, California or another
     * appropriate first-level Administrative division.
     */
    @SerialName("address_region")
    public val addressRegion: String? = null,

    /**
     * An address extension such as an apartment number, C/O or alternative name.
     */
    @SerialName("extended_address")
    public val extendedAddress: String? = null,

    /**
     * Optional. First name of the contact associated with the address.
     */
    @SerialName("first_name")
    public val firstName: String? = null,

    /**
     * Optional. Last name of the contact associated with the address.
     */
    @SerialName("last_name")
    public val lastName: String? = null,

    /**
     * Optional. Phone number of the contact associated with the address.
     */
    @SerialName("phone_number")
    public val phoneNumber: String? = null,

    /**
     * The postal code. For example, 94043.
     */
    @SerialName("postal_code")
    public val postalCode: String? = null,

    /**
     * The street address.
     */
    @SerialName("street_address")
    public val streetAddress: String? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is PostalAddress &&
            addressCountry == other.addressCountry &&
            addressLocality == other.addressLocality &&
            addressRegion == other.addressRegion &&
            extendedAddress == other.extendedAddress &&
            firstName == other.firstName &&
            lastName == other.lastName &&
            phoneNumber == other.phoneNumber &&
            postalCode == other.postalCode &&
            streetAddress == other.streetAddress)

    override fun hashCode(): Int = java.util.Objects.hash(addressCountry, addressLocality, addressRegion, extendedAddress, firstName, lastName, phoneNumber, postalCode, streetAddress)

    override fun toString(): String = "PostalAddress(addressCountry=$addressCountry, addressLocality=$addressLocality, addressRegion=$addressRegion, extendedAddress=$extendedAddress, firstName=$firstName, lastName=$lastName, phoneNumber=$phoneNumber, postalCode=$postalCode, streetAddress=$streetAddress)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.addressCountry = this.addressCountry
        builder.addressLocality = this.addressLocality
        builder.addressRegion = this.addressRegion
        builder.extendedAddress = this.extendedAddress
        builder.firstName = this.firstName
        builder.lastName = this.lastName
        builder.phoneNumber = this.phoneNumber
        builder.postalCode = this.postalCode
        builder.streetAddress = this.streetAddress
    }

    /** Builds a [PostalAddress]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var addressCountry: String? = null

        public var addressLocality: String? = null

        public var addressRegion: String? = null

        public var extendedAddress: String? = null

        public var firstName: String? = null

        public var lastName: String? = null

        public var phoneNumber: String? = null

        public var postalCode: String? = null

        public var streetAddress: String? = null

        public fun addressCountry(value: String?): Builder = apply { this.addressCountry = value }

        public fun addressLocality(value: String?): Builder = apply { this.addressLocality = value }

        public fun addressRegion(value: String?): Builder = apply { this.addressRegion = value }

        public fun extendedAddress(value: String?): Builder = apply { this.extendedAddress = value }

        public fun firstName(value: String?): Builder = apply { this.firstName = value }

        public fun lastName(value: String?): Builder = apply { this.lastName = value }

        public fun phoneNumber(value: String?): Builder = apply { this.phoneNumber = value }

        public fun postalCode(value: String?): Builder = apply { this.postalCode = value }

        public fun streetAddress(value: String?): Builder = apply { this.streetAddress = value }

        public fun build(): PostalAddress = PostalAddress(addressCountry = addressCountry, addressLocality = addressLocality, addressRegion = addressRegion, extendedAddress = extendedAddress, firstName = firstName, lastName = lastName, phoneNumber = phoneNumber, postalCode = postalCode, streetAddress = streetAddress)
    }

    public companion object {
        /** Builds a [PostalAddress]: `PostalAddress(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): PostalAddress =
            Builder().apply(configure).build()
    }
}

/**
 * A merchant-generated package/group of line items with fulfillment options.
 */
@Serializable(with = FulfillmentGroupSerializer::class)
public class FulfillmentGroup internal constructor (
    /**
     * Group identifier for referencing merchant-generated groups in updates.
     */
    public val id: String,

    /**
     * Line item IDs included in this group/package.
     */
    @SerialName("line_item_ids")
    public val lineItemIDS: List<String>,

    /**
     * Available fulfillment options for this group.
     */
    public val options: List<FulfillmentOption>? = null,

    /**
     * ID of the selected fulfillment option for this group.
     */
    @SerialName("selected_option_id")
    public val selectedOptionID: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is FulfillmentGroup &&
            id == other.id &&
            lineItemIDS == other.lineItemIDS &&
            options == other.options &&
            selectedOptionID == other.selectedOptionID &&
            additionalProperties == other.additionalProperties)

    override fun hashCode(): Int = java.util.Objects.hash(id, lineItemIDS, options, selectedOptionID, additionalProperties)

    override fun toString(): String = "FulfillmentGroup(id=$id, lineItemIDS=$lineItemIDS, options=$options, selectedOptionID=$selectedOptionID, additionalProperties=$additionalProperties)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, lineItemIDS).also { builder ->
        builder.options = this.options
        builder.selectedOptionID = this.selectedOptionID
        builder.additionalProperties = this.additionalProperties
    }

    /** Builds a [FulfillmentGroup]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var lineItemIDS: List<String>,
    ) {
        public var options: List<FulfillmentOption>? = null

        public var selectedOptionID: String? = null

        public var additionalProperties: Map<String, JsonElement> = emptyMap()

        public fun id(value: String): Builder = apply { this.id = value }

        public fun lineItemIDS(value: List<String>): Builder = apply { this.lineItemIDS = value }

        public fun options(value: List<FulfillmentOption>?): Builder = apply { this.options = value }

        public fun selectedOptionID(value: String?): Builder = apply { this.selectedOptionID = value }

        public fun additionalProperties(value: Map<String, JsonElement>): Builder = apply { this.additionalProperties = value }

        public fun build(): FulfillmentGroup = FulfillmentGroup(id = id, lineItemIDS = lineItemIDS, options = options, selectedOptionID = selectedOptionID, additionalProperties = additionalProperties)
    }

    public companion object {
        /** Builds a [FulfillmentGroup]: `FulfillmentGroup(required = …) { optional = … }`. */
        public operator fun invoke(id: String, lineItemIDS: List<String>, configure: Builder.() -> Unit = {}): FulfillmentGroup =
            Builder(id, lineItemIDS).apply(configure).build()
    }
}

/**
 * A fulfillment option within a group (e.g., Standard Shipping $5, Express $15). Extends
 * the fulfillment option base with cost and timing.
 *
 * Common base for a fulfillment option: an addressable, renderable choice (e.g. Standard,
 * Express). Catalog uses this base directly; checkout composes it with cost and timing.
 */
@Serializable(with = FulfillmentOptionSerializer::class)
public class FulfillmentOption internal constructor (
    /**
     * Supplementary context for the title (e.g. 'Arrives in 4 business days', 'Arrives Dec
     * 12-15 via FedEx'). Directly renderable; MUST NOT repeat the title.
     */
    public val description: Description? = null,

    /**
     * Unique identifier for this fulfillment option.
     */
    public val id: String,

    /**
     * Short label that distinguishes this option from its siblings (e.g. 'Standard', 'Express
     * Shipping', 'Curbside Pickup').
     */
    public val title: String,

    /**
     * Carrier name (for shipping).
     */
    public val carrier: String? = null,

    /**
     * Earliest fulfillment date.
     */
    @SerialName("earliest_fulfillment_time")
    public val earliestFulfillmentTime: String? = null,

    /**
     * Latest fulfillment date.
     */
    @SerialName("latest_fulfillment_time")
    public val latestFulfillmentTime: String? = null,

    /**
     * Fulfillment option totals breakdown.
     */
    public val totals: List<LineItemTotal>,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is FulfillmentOption &&
            description == other.description &&
            id == other.id &&
            title == other.title &&
            carrier == other.carrier &&
            earliestFulfillmentTime == other.earliestFulfillmentTime &&
            latestFulfillmentTime == other.latestFulfillmentTime &&
            totals == other.totals &&
            additionalProperties == other.additionalProperties)

    override fun hashCode(): Int = java.util.Objects.hash(description, id, title, carrier, earliestFulfillmentTime, latestFulfillmentTime, totals, additionalProperties)

    override fun toString(): String = "FulfillmentOption(description=$description, id=$id, title=$title, carrier=$carrier, earliestFulfillmentTime=$earliestFulfillmentTime, latestFulfillmentTime=$latestFulfillmentTime, totals=$totals, additionalProperties=$additionalProperties)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, title, totals).also { builder ->
        builder.description = this.description
        builder.carrier = this.carrier
        builder.earliestFulfillmentTime = this.earliestFulfillmentTime
        builder.latestFulfillmentTime = this.latestFulfillmentTime
        builder.additionalProperties = this.additionalProperties
    }

    /** Builds a [FulfillmentOption]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var title: String,
        public var totals: List<LineItemTotal>,
    ) {
        public var description: Description? = null

        public var carrier: String? = null

        public var earliestFulfillmentTime: String? = null

        public var latestFulfillmentTime: String? = null

        public var additionalProperties: Map<String, JsonElement> = emptyMap()

        public fun description(value: Description?): Builder = apply { this.description = value }

        public fun id(value: String): Builder = apply { this.id = value }

        public fun title(value: String): Builder = apply { this.title = value }

        public fun carrier(value: String?): Builder = apply { this.carrier = value }

        public fun earliestFulfillmentTime(value: String?): Builder = apply { this.earliestFulfillmentTime = value }

        public fun latestFulfillmentTime(value: String?): Builder = apply { this.latestFulfillmentTime = value }

        public fun totals(value: List<LineItemTotal>): Builder = apply { this.totals = value }

        public fun additionalProperties(value: Map<String, JsonElement>): Builder = apply { this.additionalProperties = value }

        public fun build(): FulfillmentOption = FulfillmentOption(description = description, id = id, title = title, carrier = carrier, earliestFulfillmentTime = earliestFulfillmentTime, latestFulfillmentTime = latestFulfillmentTime, totals = totals, additionalProperties = additionalProperties)
    }

    public companion object {
        /** Builds a [FulfillmentOption]: `FulfillmentOption(required = …) { optional = … }`. */
        public operator fun invoke(id: String, title: String, totals: List<LineItemTotal>, configure: Builder.() -> Unit = {}): FulfillmentOption =
            Builder(id, title, totals).apply(configure).build()
    }
}

/**
 * Supplementary context for the title (e.g. 'Arrives in 4 business days', 'Arrives Dec
 * 12-15 via FedEx'). Directly renderable; MUST NOT repeat the title.
 *
 * Description content in one or more formats. At least one format must be provided.
 *
 * Human-readable policy summary in one or more formats (plain, markdown, html). Required on
 * every policy so a platform can present it without understanding any type-specific fields.
 * This is not the buyer-facing disclosure — display is compelled by a `messages[]` warning
 * (see the Policies section).
 */
@Serializable
public class Description internal constructor (
    /**
     * HTML-formatted content. Security: Platforms MUST sanitize before rendering—strip scripts,
     * event handlers, and untrusted elements. Treat all rich text as untrusted input.
     */
    public val html: String? = null,

    /**
     * Markdown-formatted content.
     */
    public val markdown: String? = null,

    /**
     * Plain text content.
     */
    public val plain: String? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Description &&
            html == other.html &&
            markdown == other.markdown &&
            plain == other.plain)

    override fun hashCode(): Int = java.util.Objects.hash(html, markdown, plain)

    override fun toString(): String = "Description(html=$html, markdown=$markdown, plain=$plain)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.html = this.html
        builder.markdown = this.markdown
        builder.plain = this.plain
    }

    /** Builds a [Description]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var html: String? = null

        public var markdown: String? = null

        public var plain: String? = null

        public fun html(value: String?): Builder = apply { this.html = value }

        public fun markdown(value: String?): Builder = apply { this.markdown = value }

        public fun plain(value: String?): Builder = apply { this.plain = value }

        public fun build(): Description = Description(html = html, markdown = markdown, plain = plain)
    }

    public companion object {
        /** Builds a [Description]: `Description(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): Description =
            Builder().apply(configure).build()
    }
}

/**
 * A cost breakdown entry with a category, amount, and optional display text.
 */
@Serializable
public class LineItemTotal internal constructor (
    public val amount: Long,

    /**
     * Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
     * 'Delivery').
     */
    @SerialName("display_text")
    public val displayText: String? = null,

    /**
     * Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
     * fee, total. Businesses MAY use additional values.
     */
    public val type: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is LineItemTotal &&
            amount == other.amount &&
            displayText == other.displayText &&
            type == other.type)

    override fun hashCode(): Int = java.util.Objects.hash(amount, displayText, type)

    override fun toString(): String = "LineItemTotal(amount=$amount, displayText=$displayText, type=$type)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(amount, type).also { builder ->
        builder.displayText = this.displayText
    }

    /** Builds a [LineItemTotal]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var amount: Long,
        public var type: String,
    ) {
        public var displayText: String? = null

        public fun amount(value: Long): Builder = apply { this.amount = value }

        public fun displayText(value: String?): Builder = apply { this.displayText = value }

        public fun type(value: String): Builder = apply { this.type = value }

        public fun build(): LineItemTotal = LineItemTotal(amount = amount, displayText = displayText, type = type)
    }

    public companion object {
        /** Builds a [LineItemTotal]: `LineItemTotal(required = …) { optional = … }`. */
        public operator fun invoke(amount: Long, type: String, configure: Builder.() -> Unit = {}): LineItemTotal =
            Builder(amount, type).apply(configure).build()
    }
}

/**
 * Line item object. Expected to use the currency of the parent object.
 */
@Serializable
public class LineItem internal constructor (
    public val id: String,
    public val item: Item,

    /**
     * Parent line item identifier for any nested structures.
     */
    @SerialName("parent_id")
    public val parentID: String? = null,

    /**
     * Always an integer step count. On Platform requests, steps use the item's
     * Business-authoritative sale basis; omitting `item.quantity_unit` makes no assertion and
     * does not imply `each`. On Business responses, `item.quantity_unit` describes the basis;
     * if absent, it encodes the `each` machine identity (`C62`, 0) and `quantity` counts whole
     * items.
     */
    public val quantity: Long,

    /**
     * Line item totals breakdown.
     */
    public val totals: List<LineItemTotal>
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is LineItem &&
            id == other.id &&
            item == other.item &&
            parentID == other.parentID &&
            quantity == other.quantity &&
            totals == other.totals)

    override fun hashCode(): Int = java.util.Objects.hash(id, item, parentID, quantity, totals)

    override fun toString(): String = "LineItem(id=$id, item=$item, parentID=$parentID, quantity=$quantity, totals=$totals)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, item, quantity, totals).also { builder ->
        builder.parentID = this.parentID
    }

    /** Builds a [LineItem]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var item: Item,
        public var quantity: Long,
        public var totals: List<LineItemTotal>,
    ) {
        public var parentID: String? = null

        public fun id(value: String): Builder = apply { this.id = value }

        public fun item(value: Item): Builder = apply { this.item = value }

        public fun parentID(value: String?): Builder = apply { this.parentID = value }

        public fun quantity(value: Long): Builder = apply { this.quantity = value }

        public fun totals(value: List<LineItemTotal>): Builder = apply { this.totals = value }

        public fun build(): LineItem = LineItem(id = id, item = item, parentID = parentID, quantity = quantity, totals = totals)
    }

    public companion object {
        /** Builds a [LineItem]: `LineItem(required = …) { optional = … }`. */
        public operator fun invoke(id: String, item: Item, quantity: Long, totals: List<LineItemTotal>, configure: Builder.() -> Unit = {}): LineItem =
            Builder(id, item, quantity, totals).apply(configure).build()
    }
}

/**
 * Purchased item data, including identity, price, and sale basis.
 */
@Serializable
public class Item internal constructor (
    /**
     * The product identifier, often the SKU, required to resolve the product details associated
     * with this line item. Should be recognized by both the Platform, and the Business.
     */
    public val id: String,

    /**
     * Product image URI.
     */
    @SerialName("image_url")
    public val imageURL: String? = null,

    /**
     * Unit price in ISO 4217 minor units. Price is the amount per one whole
     * `quantity_unit.unit` (for example, per lb or per hour); when `quantity_unit` is absent,
     * it is per `each`.
     */
    public val price: Long,

    /**
     * Sale basis this item's `quantity` is denominated in. On an authoritative Business
     * response, absence encodes the default `each` machine identity (`C62`, 0); the Business
     * MUST include this descriptor for every non-`each` response. On Platform requests,
     * omission makes no assertion: the Business interprets `quantity` using the item's
     * authoritative sale basis. If the Platform includes this descriptor, it asserts the
     * unit-descriptor machine identity. The Business MUST compare that machine identity
     * (`unit`, effective `scale`), ignore `display_text` and `increment`, and resolve a
     * mismatch by conversion surfaced as a visible line revision with a warning, or by
     * rejection with a recoverable business outcome; silent reinterpretation is forbidden. An
     * explicit `C62` descriptor at effective scale 0 matches an authoritative basis represented
     * by an absent descriptor.
     */
    @SerialName("quantity_unit")
    public val quantityUnit: QuantityUnit? = null,

    /**
     * Product title.
     */
    public val title: String,

    /**
     * Pricing basis for this item. On an authoritative Business response, the Business MUST
     * include `unit_price` on every line whose pricing basis differs from its sale basis (for
     * example, priced per pound but sold per `each`); presence on a line marks the rate as
     * transactional rather than display-only. When the pricing basis is the sale basis,
     * `item.price` fully denominates the charge and this field MAY be omitted.
     */
    @SerialName("unit_price")
    public val unitPrice: UnitPrice? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Item &&
            id == other.id &&
            imageURL == other.imageURL &&
            price == other.price &&
            quantityUnit == other.quantityUnit &&
            title == other.title &&
            unitPrice == other.unitPrice)

    override fun hashCode(): Int = java.util.Objects.hash(id, imageURL, price, quantityUnit, title, unitPrice)

    override fun toString(): String = "Item(id=$id, imageURL=$imageURL, price=$price, quantityUnit=$quantityUnit, title=$title, unitPrice=$unitPrice)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, price, title).also { builder ->
        builder.imageURL = this.imageURL
        builder.quantityUnit = this.quantityUnit
        builder.unitPrice = this.unitPrice
    }

    /** Builds a [Item]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var price: Long,
        public var title: String,
    ) {
        public var imageURL: String? = null

        public var quantityUnit: QuantityUnit? = null

        public var unitPrice: UnitPrice? = null

        public fun id(value: String): Builder = apply { this.id = value }

        public fun imageURL(value: String?): Builder = apply { this.imageURL = value }

        public fun price(value: Long): Builder = apply { this.price = value }

        public fun quantityUnit(value: QuantityUnit?): Builder = apply { this.quantityUnit = value }

        public fun title(value: String): Builder = apply { this.title = value }

        public fun unitPrice(value: UnitPrice?): Builder = apply { this.unitPrice = value }

        public fun build(): Item = Item(id = id, imageURL = imageURL, price = price, quantityUnit = quantityUnit, title = title, unitPrice = unitPrice)
    }

    public companion object {
        /** Builds a [Item]: `Item(required = …) { optional = … }`. */
        public operator fun invoke(id: String, price: Long, title: String, configure: Builder.() -> Unit = {}): Item =
            Builder(id, price, title).apply(configure).build()
    }
}

/**
 * Sale basis this item's `quantity` is denominated in. On an authoritative Business
 * response, absence encodes the default `each` machine identity (`C62`, 0); the Business
 * MUST include this descriptor for every non-`each` response. On Platform requests,
 * omission makes no assertion: the Business interprets `quantity` using the item's
 * authoritative sale basis. If the Platform includes this descriptor, it asserts the
 * unit-descriptor machine identity. The Business MUST compare that machine identity
 * (`unit`, effective `scale`), ignore `display_text` and `increment`, and resolve a
 * mismatch by conversion surfaced as a visible line revision with a warning, or by
 * rejection with a recoverable business outcome; silent reinterpretation is forbidden. An
 * explicit `C62` descriptor at effective scale 0 matches an authoritative basis represented
 * by an absent descriptor.
 *
 * Sale-basis descriptor for quantities: the shared unit descriptor plus the Business's
 * ordering policy. Its unit-descriptor machine identity remains (`unit`, effective
 * `scale`); `display_text` and `increment` are excluded from identity and mismatch
 * comparison.
 *
 * A reusable unit descriptor for quantities and measures. Its unit-descriptor machine
 * identity is (`unit`, effective `scale`), where effective `scale` is the provided `scale`
 * or 0; `display_text` is excluded.
 */
@Serializable
public class QuantityUnit internal constructor (
    /**
     * Required printable unit label provided by the Business. The Platform MUST use it when it
     * does not recognize `unit`; for a recognized UN/CEFACT Rec 20 Common Code, the Platform
     * MAY substitute its own localized label. It does not participate in unit identity or
     * mismatch comparison.
     */
    @SerialName("display_text")
    public val displayText: String,

    /**
     * One step equals `10^-scale` of `unit`. When `unit` is `C62`, `scale`, if present, MUST be
     * 0. The maximum of 15 is derived from the interoperable integer range: at scale 16 a
     * single whole unit (10^16 steps) is no longer representable, so larger scales cannot
     * denominate one unit of their own basis. Businesses needing finer granularity use a
     * smaller unit.
     */
    public val scale: Long? = null,

    /**
     * Stable machine identifier. The Business SHOULD use the exact UN/CEFACT Rec20 Common Code
     * when one accurately identifies the unit. Otherwise, the Business MAY use a custom unit
     * identifier and MUST use it consistently for the same unit. The Platform MUST treat an
     * unrecognized identifier as opaque.
     */
    public val unit: String,

    /**
     * Ordering granularity, denominated in steps: the Business sells this item in integer
     * multiples of `increment` steps. Its effective value is the provided value or 1. Advisory
     * merchandising policy, not a representational bound: Platform-authored quantities SHOULD
     * be integer multiples of the effective increment; the Business MAY accept, revise, or
     * reject an off-increment request with a recoverable business outcome and MUST NOT silently
     * reinterpret it. Business-authored quantities (checkout revisions, fulfillment events,
     * adjustments) are bounded only by `scale`.
     */
    public val increment: Long? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is QuantityUnit &&
            displayText == other.displayText &&
            scale == other.scale &&
            unit == other.unit &&
            increment == other.increment)

    override fun hashCode(): Int = java.util.Objects.hash(displayText, scale, unit, increment)

    override fun toString(): String = "QuantityUnit(displayText=$displayText, scale=$scale, unit=$unit, increment=$increment)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(displayText, unit).also { builder ->
        builder.scale = this.scale
        builder.increment = this.increment
    }

    /** Builds a [QuantityUnit]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var displayText: String,
        public var unit: String,
    ) {
        public var scale: Long? = null

        public var increment: Long? = null

        public fun displayText(value: String): Builder = apply { this.displayText = value }

        public fun scale(value: Long?): Builder = apply { this.scale = value }

        public fun unit(value: String): Builder = apply { this.unit = value }

        public fun increment(value: Long?): Builder = apply { this.increment = value }

        public fun build(): QuantityUnit = QuantityUnit(displayText = displayText, scale = scale, unit = unit, increment = increment)
    }

    public companion object {
        /** Builds a [QuantityUnit]: `QuantityUnit(required = …) { optional = … }`. */
        public operator fun invoke(displayText: String, unit: String, configure: Builder.() -> Unit = {}): QuantityUnit =
            Builder(displayText, unit).apply(configure).build()
    }
}

/**
 * Pricing basis for this item. On an authoritative Business response, the Business MUST
 * include `unit_price` on every line whose pricing basis differs from its sale basis (for
 * example, priced per pound but sold per `each`); presence on a line marks the rate as
 * transactional rather than display-only. When the pricing basis is the sale basis,
 * `item.price` fully denominates the charge and this field MAY be omitted.
 *
 * Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
 * `unit_price.currency` MUST equal `price.currency`; the comparator MUST NOT perform
 * currency conversion. `measure.unit` and `reference.unit` MUST be identical; cross-unit
 * conversion is not permitted. Their scales MAY differ; each value represents `value ×
 * 10^-scale`.
 */
@Serializable
public class UnitPrice internal constructor (
    /**
     * Unit price in ISO 4217 minor units. After satisfying the same-unit invariant, the
     * Business MUST compute the comparator as `(price.amount / (measure.value ×
     * 10^-measure.scale)) × (reference.value × 10^-reference.scale)` and round it once to ISO
     * 4217 minor units according to its pricing rules. The returned `unit_price.amount` is
     * authoritative; the Platform MUST NOT recompute or substitute its own result.
     */
    public val amount: Long,

    /**
     * ISO 4217 currency code.
     */
    public val currency: String,

    /**
     * Product quantity in packaging/content (for example, a 750 mL bottle), distinct from
     * `quantity_unit`, which defines the sale basis. Its integer `value` MUST be at least 1.
     */
    public val measure: Measure,

    /**
     * Denominator for unit price display (for example, per 100 mL or per 1 kg). Its integer
     * `value` MUST be at least 1.
     */
    public val reference: Measure
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is UnitPrice &&
            amount == other.amount &&
            currency == other.currency &&
            measure == other.measure &&
            reference == other.reference)

    override fun hashCode(): Int = java.util.Objects.hash(amount, currency, measure, reference)

    override fun toString(): String = "UnitPrice(amount=$amount, currency=$currency, measure=$measure, reference=$reference)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(amount, currency, measure, reference)

    /** Builds a [UnitPrice]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var amount: Long,
        public var currency: String,
        public var measure: Measure,
        public var reference: Measure,
    ) {
        public fun amount(value: Long): Builder = apply { this.amount = value }

        public fun currency(value: String): Builder = apply { this.currency = value }

        public fun measure(value: Measure): Builder = apply { this.measure = value }

        public fun reference(value: Measure): Builder = apply { this.reference = value }

        public fun build(): UnitPrice = UnitPrice(amount = amount, currency = currency, measure = measure, reference = reference)
    }

    public companion object {
        /** Builds a [UnitPrice]: `UnitPrice(required = …) { optional = … }`. */
        public operator fun invoke(amount: Long, currency: String, measure: Measure, reference: Measure, configure: Builder.() -> Unit = {}): UnitPrice =
            Builder(amount, currency, measure, reference).apply(configure).build()
    }
}

/**
 * Product quantity in packaging/content (for example, a 750 mL bottle), distinct from
 * `quantity_unit`, which defines the sale basis. Its integer `value` MUST be at least 1.
 *
 * Denominator for unit price display (for example, per 100 mL or per 1 kg). Its integer
 * `value` MUST be at least 1.
 *
 * The settled measurement this adjustment reconciles (for example, actual picked weight),
 * present when the line's price settles by measurement. Its unit identity MUST match the
 * line's pricing basis (`item.unit_price` measure/reference unit); no unit conversion. A
 * pure price settlement uses `quantity: 0` together with `measure` and a totals delta.
 *
 * A measure composed of an integer value and a unit descriptor. Its value is the integer
 * count of `10^-scale` units of `unit`.
 *
 * A reusable unit descriptor for quantities and measures. Its unit-descriptor machine
 * identity is (`unit`, effective `scale`), where effective `scale` is the provided `scale`
 * or 0; `display_text` is excluded.
 */
@Serializable
public class Measure internal constructor (
    /**
     * Required printable unit label provided by the Business. The Platform MUST use it when it
     * does not recognize `unit`; for a recognized UN/CEFACT Rec 20 Common Code, the Platform
     * MAY substitute its own localized label. It does not participate in unit identity or
     * mismatch comparison.
     */
    @SerialName("display_text")
    public val displayText: String,

    /**
     * One step equals `10^-scale` of `unit`. When `unit` is `C62`, `scale`, if present, MUST be
     * 0. The maximum of 15 is derived from the interoperable integer range: at scale 16 a
     * single whole unit (10^16 steps) is no longer representable, so larger scales cannot
     * denominate one unit of their own basis. Businesses needing finer granularity use a
     * smaller unit.
     */
    public val scale: Long? = null,

    /**
     * Stable machine identifier. The Business SHOULD use the exact UN/CEFACT Rec20 Common Code
     * when one accurately identifies the unit. Otherwise, the Business MAY use a custom unit
     * identifier and MUST use it consistently for the same unit. The Platform MUST treat an
     * unrecognized identifier as opaque.
     */
    public val unit: String,

    /**
     * Integer count of `10^-scale` units of `unit`.
     */
    public val value: Long
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Measure &&
            displayText == other.displayText &&
            scale == other.scale &&
            unit == other.unit &&
            value == other.value)

    override fun hashCode(): Int = java.util.Objects.hash(displayText, scale, unit, value)

    override fun toString(): String = "Measure(displayText=$displayText, scale=$scale, unit=$unit, value=$value)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(displayText, unit, value).also { builder ->
        builder.scale = this.scale
    }

    /** Builds a [Measure]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var displayText: String,
        public var unit: String,
        public var value: Long,
    ) {
        public var scale: Long? = null

        public fun displayText(value: String): Builder = apply { this.displayText = value }

        public fun scale(value: Long?): Builder = apply { this.scale = value }

        public fun unit(value: String): Builder = apply { this.unit = value }

        public fun value(value: Long): Builder = apply { this.value = value }

        public fun build(): Measure = Measure(displayText = displayText, scale = scale, unit = unit, value = value)
    }

    public companion object {
        /** Builds a [Measure]: `Measure(required = …) { optional = … }`. */
        public operator fun invoke(displayText: String, unit: String, value: Long, configure: Builder.() -> Unit = {}): Measure =
            Builder(displayText, unit, value).apply(configure).build()
    }
}

@Serializable
public class Link internal constructor (
    /**
     * Optional display text for the link. When provided, use this instead of generating from
     * type.
     */
    public val title: String? = null,

    /**
     * Type of link. Well-known values: `privacy_policy`, `terms_of_service`, `refund_policy`,
     * `shipping_policy`, `faq`. Consumers SHOULD handle unknown values gracefully by displaying
     * them using the `title` field or omitting the link.
     */
    public val type: String,

    /**
     * The actual URL pointing to the content to be displayed.
     */
    public val url: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Link &&
            title == other.title &&
            type == other.type &&
            url == other.url)

    override fun hashCode(): Int = java.util.Objects.hash(title, type, url)

    override fun toString(): String = "Link(title=$title, type=$type, url=$url)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(type, url).also { builder ->
        builder.title = this.title
    }

    /** Builds a [Link]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var type: String,
        public var url: String,
    ) {
        public var title: String? = null

        public fun title(value: String?): Builder = apply { this.title = value }

        public fun type(value: String): Builder = apply { this.type = value }

        public fun url(value: String): Builder = apply { this.url = value }

        public fun build(): Link = Link(title = title, type = type, url = url)
    }

    public companion object {
        /** Builds a [Link]: `Link(required = …) { optional = … }`. */
        public operator fun invoke(type: String, url: String, configure: Builder.() -> Unit = {}): Link =
            Builder(type, url).apply(configure).build()
    }
}

/**
 * Container for error, warning, or info messages.
 */
@Serializable
public class Message internal constructor (
    public val code: String? = null,

    /**
     * Human-readable message.
     *
     * Human-readable warning message that MUST be displayed.
     */
    public val content: String,

    /**
     * Content format, default = plain.
     */
    @SerialName("content_type")
    public val contentType: ContentType? = null,

    /**
     * RFC 9535 JSONPath to the component the message refers to (e.g., $.line_items[0]).
     */
    public val path: String? = null,

    /**
     * Reflects the resource state and recommended action. 'recoverable': platform can resolve
     * the condition in band, for example by modifying inputs or processing a related Action,
     * and submit a new operation when needed. 'requires_buyer_input': merchant requires
     * information their API doesn't support collecting programmatically (checkout incomplete).
     * 'requires_buyer_review': buyer must authorize before order placement due to policy,
     * regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
     * retry with new resource or inputs. Errors with 'requires_*' severity contribute to
     * 'status: requires_escalation'.
     */
    public val severity: Severity? = null,

    /**
     * Message type discriminator.
     */
    public val type: MessageType,

    /**
     * URL to a required visual element (e.g., warning symbol, energy class label).
     */
    @SerialName("image_url")
    public val imageURL: String? = null,

    /**
     * Rendering contract for this warning. 'notice' (default): platform MUST display, MAY
     * dismiss. 'disclosure': platform MUST display in proximity to the path-referenced
     * component, MUST NOT hide or auto-dismiss. See specification for full contract.
     */
    public val presentation: String? = null,

    /**
     * Reference URL for more information (e.g., regulatory site, registry entry, policy page).
     */
    public val url: String? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Message &&
            code == other.code &&
            content == other.content &&
            contentType == other.contentType &&
            path == other.path &&
            severity == other.severity &&
            type == other.type &&
            imageURL == other.imageURL &&
            presentation == other.presentation &&
            url == other.url)

    override fun hashCode(): Int = java.util.Objects.hash(code, content, contentType, path, severity, type, imageURL, presentation, url)

    override fun toString(): String = "Message(code=$code, content=$content, contentType=$contentType, path=$path, severity=$severity, type=$type, imageURL=$imageURL, presentation=$presentation, url=$url)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(content, type).also { builder ->
        builder.code = this.code
        builder.contentType = this.contentType
        builder.path = this.path
        builder.severity = this.severity
        builder.imageURL = this.imageURL
        builder.presentation = this.presentation
        builder.url = this.url
    }

    /** Builds a [Message]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var content: String,
        public var type: MessageType,
    ) {
        public var code: String? = null

        public var contentType: ContentType? = null

        public var path: String? = null

        public var severity: Severity? = null

        public var imageURL: String? = null

        public var presentation: String? = null

        public var url: String? = null

        public fun code(value: String?): Builder = apply { this.code = value }

        public fun content(value: String): Builder = apply { this.content = value }

        public fun contentType(value: ContentType?): Builder = apply { this.contentType = value }

        public fun path(value: String?): Builder = apply { this.path = value }

        public fun severity(value: Severity?): Builder = apply { this.severity = value }

        public fun type(value: MessageType): Builder = apply { this.type = value }

        public fun imageURL(value: String?): Builder = apply { this.imageURL = value }

        public fun presentation(value: String?): Builder = apply { this.presentation = value }

        public fun url(value: String?): Builder = apply { this.url = value }

        public fun build(): Message = Message(code = code, content = content, contentType = contentType, path = path, severity = severity, type = type, imageURL = imageURL, presentation = presentation, url = url)
    }

    public companion object {
        /** Builds a [Message]: `Message(required = …) { optional = … }`. */
        public operator fun invoke(content: String, type: MessageType, configure: Builder.() -> Unit = {}): Message =
            Builder(content, type).apply(configure).build()
    }
}

/**
 * Content format, default = plain.
 */
@Serializable(with = ContentTypeSerializer::class)
public class ContentType private constructor(public val value: String) {
    public companion object {
        @JvmField public val Markdown: ContentType = ContentType("markdown")
        @JvmField public val Plain: ContentType = ContentType("plain")

        /** Values defined by the pinned protocol version. */
        internal val known: Map<String, ContentType> = listOf(Markdown, Plain).associateBy { it.value }

        internal fun fromWire(value: String): ContentType = known[value] ?: ContentType(value)
    }

    override fun equals(other: Any?): Boolean = this === other || (other is ContentType && value == other.value)

    override fun hashCode(): Int = value.hashCode()

    override fun toString(): String = value
}

internal object ContentTypeSerializer : KSerializer<ContentType> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.ContentType", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): ContentType {
        val value = if (decoder is JsonDecoder) {
            val primitive = decoder.decodeJsonElement() as? JsonPrimitive
            if (primitive?.isString != true) {
                throw SerializationException("Expected a string for ContentType")
            }
            primitive.content
        } else {
            decoder.decodeString()
        }
        return ContentType.fromWire(value)
    }

    override fun serialize(encoder: Encoder, value: ContentType): Unit = encoder.encodeString(value.value)
}

/**
 * Reflects the resource state and recommended action. 'recoverable': platform can resolve
 * the condition in band, for example by modifying inputs or processing a related Action,
 * and submit a new operation when needed. 'requires_buyer_input': merchant requires
 * information their API doesn't support collecting programmatically (checkout incomplete).
 * 'requires_buyer_review': buyer must authorize before order placement due to policy,
 * regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
 * retry with new resource or inputs. Errors with 'requires_*' severity contribute to
 * 'status: requires_escalation'.
 */
@Serializable(with = SeveritySerializer::class)
public class Severity private constructor(public val value: String) {
    public companion object {
        @JvmField public val Recoverable: Severity = Severity("recoverable")
        @JvmField public val RequiresBuyerInput: Severity = Severity("requires_buyer_input")
        @JvmField public val RequiresBuyerReview: Severity = Severity("requires_buyer_review")
        @JvmField public val Unrecoverable: Severity = Severity("unrecoverable")

        /** Values defined by the pinned protocol version. */
        internal val known: Map<String, Severity> = listOf(Recoverable, RequiresBuyerInput, RequiresBuyerReview, Unrecoverable).associateBy { it.value }

        internal fun fromWire(value: String): Severity = known[value] ?: Severity(value)
    }

    override fun equals(other: Any?): Boolean = this === other || (other is Severity && value == other.value)

    override fun hashCode(): Int = value.hashCode()

    override fun toString(): String = value
}

internal object SeveritySerializer : KSerializer<Severity> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.Severity", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): Severity {
        val value = if (decoder is JsonDecoder) {
            val primitive = decoder.decodeJsonElement() as? JsonPrimitive
            if (primitive?.isString != true) {
                throw SerializationException("Expected a string for Severity")
            }
            primitive.content
        } else {
            decoder.decodeString()
        }
        return Severity.fromWire(value)
    }

    override fun serialize(encoder: Encoder, value: Severity): Unit = encoder.encodeString(value.value)
}

@Serializable(with = MessageTypeSerializer::class)
public class MessageType private constructor(public val value: String) {
    public companion object {
        @JvmField public val Error: MessageType = MessageType("error")
        @JvmField public val Info: MessageType = MessageType("info")
        @JvmField public val Warning: MessageType = MessageType("warning")

        /** Values defined by the pinned protocol version. */
        internal val known: Map<String, MessageType> = listOf(Error, Info, Warning).associateBy { it.value }

        internal fun fromWire(value: String): MessageType = known[value] ?: MessageType(value)
    }

    override fun equals(other: Any?): Boolean = this === other || (other is MessageType && value == other.value)

    override fun hashCode(): Int = value.hashCode()

    override fun toString(): String = value
}

internal object MessageTypeSerializer : KSerializer<MessageType> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.MessageType", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): MessageType {
        val value = if (decoder is JsonDecoder) {
            val primitive = decoder.decodeJsonElement() as? JsonPrimitive
            if (primitive?.isString != true) {
                throw SerializationException("Expected a string for MessageType")
            }
            primitive.content
        } else {
            decoder.decodeString()
        }
        return MessageType.fromWire(value)
    }

    override fun serialize(encoder: Encoder, value: MessageType): Unit = encoder.encodeString(value.value)
}

/**
 * Details about an order created for this checkout session.
 *
 * Order details available at the time of checkout completion.
 */
@Serializable
public class OrderConfirmation internal constructor (
    /**
     * Unique order identifier.
     */
    public val id: String,

    /**
     * Human-readable label for identifying the order. MUST only be provided by the business.
     */
    public val label: String? = null,

    /**
     * Permalink to access the order on merchant site.
     */
    @SerialName("permalink_url")
    public val permalinkURL: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is OrderConfirmation &&
            id == other.id &&
            label == other.label &&
            permalinkURL == other.permalinkURL)

    override fun hashCode(): Int = java.util.Objects.hash(id, label, permalinkURL)

    override fun toString(): String = "OrderConfirmation(id=$id, label=$label, permalinkURL=$permalinkURL)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, permalinkURL).also { builder ->
        builder.label = this.label
    }

    /** Builds a [OrderConfirmation]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var permalinkURL: String,
    ) {
        public var label: String? = null

        public fun id(value: String): Builder = apply { this.id = value }

        public fun label(value: String?): Builder = apply { this.label = value }

        public fun permalinkURL(value: String): Builder = apply { this.permalinkURL = value }

        public fun build(): OrderConfirmation = OrderConfirmation(id = id, label = label, permalinkURL = permalinkURL)
    }

    public companion object {
        /** Builds a [OrderConfirmation]: `OrderConfirmation(required = …) { optional = … }`. */
        public operator fun invoke(id: String, permalinkURL: String, configure: Builder.() -> Unit = {}): OrderConfirmation =
            Builder(id, permalinkURL).apply(configure).build()
    }
}

/**
 * Payment configuration containing handlers.
 */
@Serializable
public class Payment internal constructor (
    /**
     * The payment instruments available for this payment. Each instrument is associated with a
     * specific handler via the handler_id field. Handlers can extend the base
     * payment_instrument schema to add handler-specific fields.
     */
    public val instruments: List<SelectedPaymentInstrument>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Payment &&
            instruments == other.instruments)

    override fun hashCode(): Int = java.util.Objects.hash(instruments)

    override fun toString(): String = "Payment(instruments=$instruments)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.instruments = this.instruments
    }

    /** Builds a [Payment]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var instruments: List<SelectedPaymentInstrument>? = null

        public fun instruments(value: List<SelectedPaymentInstrument>?): Builder = apply { this.instruments = value }

        public fun build(): Payment = Payment(instruments = instruments)
    }

    public companion object {
        /** Builds a [Payment]: `Payment(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): Payment =
            Builder().apply(configure).build()
    }
}

/**
 * A payment instrument with selection state.
 *
 * The base definition for any payment instrument. It links the instrument to a specific
 * payment handler.
 */
@Serializable(with = SelectedPaymentInstrumentSerializer::class)
public class SelectedPaymentInstrument internal constructor (
    /**
     * The billing address associated with this payment method.
     */
    @SerialName("billing_address")
    public val billingAddress: PostalAddress? = null,

    public val credential: PaymentCredential? = null,

    /**
     * Display information for this payment instrument. Each payment instrument schema defines
     * its specific display properties, as outlined by the payment handler.
     */
    public val display: JsonObject? = null,

    /**
     * The unique identifier for the handler instance that produced this instrument. This
     * corresponds to the 'id' field in the Payment Handler definition.
     */
    @SerialName("handler_id")
    public val handlerID: String,

    /**
     * A unique identifier for this instrument instance. Typically assigned by the platform for
     * instruments it collects. For a business-owned saved instrument returned on an
     * identity-linked response, this identifier is assigned by the business; the platform MUST
     * treat it as an opaque, business-scoped reference, and the business resolves it
     * server-side when the buyer selects it.
     */
    public val id: String,

    /**
     * The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
     * will constrain this to a constant value.
     */
    public val type: String,

    /**
     * Whether this instrument is selected by the user.
     */
    public val selected: Boolean? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is SelectedPaymentInstrument &&
            billingAddress == other.billingAddress &&
            credential == other.credential &&
            display == other.display &&
            handlerID == other.handlerID &&
            id == other.id &&
            type == other.type &&
            selected == other.selected &&
            additionalProperties == other.additionalProperties)

    override fun hashCode(): Int = java.util.Objects.hash(billingAddress, credential, display, handlerID, id, type, selected, additionalProperties)

    override fun toString(): String = "SelectedPaymentInstrument(billingAddress=$billingAddress, credential=$credential, display=$display, handlerID=$handlerID, id=$id, type=$type, selected=$selected, additionalProperties=$additionalProperties)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(handlerID, id, type).also { builder ->
        builder.billingAddress = this.billingAddress
        builder.credential = this.credential
        builder.display = this.display
        builder.selected = this.selected
        builder.additionalProperties = this.additionalProperties
    }

    /** Builds a [SelectedPaymentInstrument]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var handlerID: String,
        public var id: String,
        public var type: String,
    ) {
        public var billingAddress: PostalAddress? = null

        public var credential: PaymentCredential? = null

        public var display: JsonObject? = null

        public var selected: Boolean? = null

        public var additionalProperties: Map<String, JsonElement> = emptyMap()

        public fun billingAddress(value: PostalAddress?): Builder = apply { this.billingAddress = value }

        public fun credential(value: PaymentCredential?): Builder = apply { this.credential = value }

        public fun display(value: JsonObject?): Builder = apply { this.display = value }

        public fun handlerID(value: String): Builder = apply { this.handlerID = value }

        public fun id(value: String): Builder = apply { this.id = value }

        public fun type(value: String): Builder = apply { this.type = value }

        public fun selected(value: Boolean?): Builder = apply { this.selected = value }

        public fun additionalProperties(value: Map<String, JsonElement>): Builder = apply { this.additionalProperties = value }

        public fun build(): SelectedPaymentInstrument = SelectedPaymentInstrument(billingAddress = billingAddress, credential = credential, display = display, handlerID = handlerID, id = id, type = type, selected = selected, additionalProperties = additionalProperties)
    }

    public companion object {
        /** Builds a [SelectedPaymentInstrument]: `SelectedPaymentInstrument(required = …) { optional = … }`. */
        public operator fun invoke(handlerID: String, id: String, type: String, configure: Builder.() -> Unit = {}): SelectedPaymentInstrument =
            Builder(handlerID, id, type).apply(configure).build()
    }
}

/**
 * The base definition for any payment credential. Handlers define specific credential types.
 */
@Serializable(with = PaymentCredentialSerializer::class)
public class PaymentCredential internal constructor (
    /**
     * The credential type discriminator. Specific schemas will constrain this to a constant
     * value.
     */
    public val type: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is PaymentCredential &&
            type == other.type &&
            additionalProperties == other.additionalProperties)

    override fun hashCode(): Int = java.util.Objects.hash(type, additionalProperties)

    override fun toString(): String = "PaymentCredential(type=$type, additionalProperties=$additionalProperties)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(type).also { builder ->
        builder.additionalProperties = this.additionalProperties
    }

    /** Builds a [PaymentCredential]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var type: String,
    ) {
        public var additionalProperties: Map<String, JsonElement> = emptyMap()

        public fun type(value: String): Builder = apply { this.type = value }

        public fun additionalProperties(value: Map<String, JsonElement>): Builder = apply { this.additionalProperties = value }

        public fun build(): PaymentCredential = PaymentCredential(type = type, additionalProperties = additionalProperties)
    }

    public companion object {
        /** Builds a [PaymentCredential]: `PaymentCredential(required = …) { optional = … }`. */
        public operator fun invoke(type: String, configure: Builder.() -> Unit = {}): PaymentCredential =
            Builder(type).apply(configure).build()
    }
}

/**
 * A durable business rule about the items in a response — return/refund terms, warranty,
 * and the like — at the time of purchase. Every policy carries a `type` (an open
 * reverse-DNS vocabulary) and a `description` so a platform can present it without
 * understanding its type-specific fields; type-specific fields (gated by `type`) add
 * structured context for platforms that model that type. Policies are reference data; the
 * obligation to display a term to the buyer is carried by a `messages[]` warning whose
 * `code` equals the policy `type` — see the Policies section of the specification.
 */
@Serializable(with = PolicySerializer::class)
public class Policy internal constructor (
    /**
     * RFC 9535 JSONPath expressions identifying the nodes this policy applies to, relative to
     * the embedding response root (e.g., `$.line_items[0]` in cart/checkout, `$.products[2]` in
     * catalog). Each target covers the node it names and everything nested under it, so a
     * target on a product also covers its variants. A singular query (RFC 9535 Section 2.3.5.1;
     * name and index selectors only) names a single node; filters, wildcards, and slices match
     * a set. When omitted, the policy applies to the entire response. When policies of the same
     * `type` contest a node, the narrowest target wins and overrides the rest. See the Policies
     * section for how specificity resolves.
     */
    @SerialName("applies_to")
    public val appliesTo: List<String>? = null,

    /**
     * Human-readable policy summary in one or more formats (plain, markdown, html). Required on
     * every policy so a platform can present it without understanding any type-specific fields.
     * This is not the buyer-facing disclosure — display is compelled by a `messages[]` warning
     * (see the Policies section).
     */
    public val description: Description,

    /**
     * Policy type discriminator. Open reverse-DNS vocabulary. Well-known values:
     * `dev.ucp.shopping.policy.return` (return terms), `dev.ucp.shopping.policy.warranty`
     * (warranty terms). Businesses MAY define custom types in their own domain (e.g.,
     * `com.example.policy.price_match`). Platforms MUST tolerate unknown values.
     */
    public val type: String,

    /**
     * Optional link to the full policy document.
     */
    public val url: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Policy &&
            appliesTo == other.appliesTo &&
            description == other.description &&
            type == other.type &&
            url == other.url &&
            additionalProperties == other.additionalProperties)

    override fun hashCode(): Int = java.util.Objects.hash(appliesTo, description, type, url, additionalProperties)

    override fun toString(): String = "Policy(appliesTo=$appliesTo, description=$description, type=$type, url=$url, additionalProperties=$additionalProperties)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(description, type).also { builder ->
        builder.appliesTo = this.appliesTo
        builder.url = this.url
        builder.additionalProperties = this.additionalProperties
    }

    /** Builds a [Policy]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var description: Description,
        public var type: String,
    ) {
        public var appliesTo: List<String>? = null

        public var url: String? = null

        public var additionalProperties: Map<String, JsonElement> = emptyMap()

        public fun appliesTo(value: List<String>?): Builder = apply { this.appliesTo = value }

        public fun description(value: Description): Builder = apply { this.description = value }

        public fun type(value: String): Builder = apply { this.type = value }

        public fun url(value: String?): Builder = apply { this.url = value }

        public fun additionalProperties(value: Map<String, JsonElement>): Builder = apply { this.additionalProperties = value }

        public fun build(): Policy = Policy(appliesTo = appliesTo, description = description, type = type, url = url, additionalProperties = additionalProperties)
    }

    public companion object {
        /** Builds a [Policy]: `Policy(required = …) { optional = … }`. */
        public operator fun invoke(description: Description, type: String, configure: Builder.() -> Unit = {}): Policy =
            Builder(description, type).apply(configure).build()
    }
}

/**
 * Environment data provided by the platform to support authorization and abuse prevention.
 * Values MUST NOT be buyer-asserted claims — platforms provide signals based on direct
 * observation or independently verifiable third-party attestations. All signal keys MUST
 * use reverse-domain naming to ensure provenance and prevent collisions when multiple
 * extensions contribute to the shared namespace.
 */

/**
 * Checkout state indicating the current phase and required processing. See Checkout Status
 * lifecycle documentation for state transition details.
 */
@Serializable(with = CheckoutStatusSerializer::class)
public class CheckoutStatus private constructor(public val value: String) {
    public companion object {
        @JvmField public val Canceled: CheckoutStatus = CheckoutStatus("canceled")
        @JvmField public val CompleteInProgress: CheckoutStatus = CheckoutStatus("complete_in_progress")
        @JvmField public val Completed: CheckoutStatus = CheckoutStatus("completed")
        @JvmField public val Incomplete: CheckoutStatus = CheckoutStatus("incomplete")
        @JvmField public val ReadyForComplete: CheckoutStatus = CheckoutStatus("ready_for_complete")
        @JvmField public val RequiresEscalation: CheckoutStatus = CheckoutStatus("requires_escalation")

        /** Values defined by the pinned protocol version. */
        internal val known: Map<String, CheckoutStatus> = listOf(Canceled, CompleteInProgress, Completed, Incomplete, ReadyForComplete, RequiresEscalation).associateBy { it.value }

        internal fun fromWire(value: String): CheckoutStatus = known[value] ?: CheckoutStatus(value)
    }

    override fun equals(other: Any?): Boolean = this === other || (other is CheckoutStatus && value == other.value)

    override fun hashCode(): Int = value.hashCode()

    override fun toString(): String = value
}

internal object CheckoutStatusSerializer : KSerializer<CheckoutStatus> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.CheckoutStatus", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): CheckoutStatus {
        val value = if (decoder is JsonDecoder) {
            val primitive = decoder.decodeJsonElement() as? JsonPrimitive
            if (primitive?.isString != true) {
                throw SerializationException("Expected a string for CheckoutStatus")
            }
            primitive.content
        } else {
            decoder.decodeString()
        }
        return CheckoutStatus.fromWire(value)
    }

    override fun serialize(encoder: Encoder, value: CheckoutStatus): Unit = encoder.encodeString(value.value)
}

/**
 * Different cart totals.
 *
 * Pricing breakdown provided by the business. MUST contain exactly one subtotal and one
 * total entry. Detail types (tax, fee, discount, fulfillment) may appear multiple times for
 * itemization. Platforms MUST render all entries in order using display_text and amount.
 *
 * A cost breakdown entry with a category, amount, and optional display text.
 */
@Serializable
public class CheckoutTotal internal constructor (
    public val amount: Long,

    /**
     * Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
     * 'Delivery').
     */
    @SerialName("display_text")
    public val displayText: String? = null,

    /**
     * Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
     * fee, total. Businesses MAY use additional values.
     */
    public val type: String,

    /**
     * Optional itemized breakdown. The parent entry is always rendered; lines are
     * supplementary. Sum of line amounts MUST equal the parent entry amount.
     */
    public val lines: List<Line>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is CheckoutTotal &&
            amount == other.amount &&
            displayText == other.displayText &&
            type == other.type &&
            lines == other.lines)

    override fun hashCode(): Int = java.util.Objects.hash(amount, displayText, type, lines)

    override fun toString(): String = "CheckoutTotal(amount=$amount, displayText=$displayText, type=$type, lines=$lines)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(amount, type).also { builder ->
        builder.displayText = this.displayText
        builder.lines = this.lines
    }

    /** Builds a [CheckoutTotal]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var amount: Long,
        public var type: String,
    ) {
        public var displayText: String? = null

        public var lines: List<Line>? = null

        public fun amount(value: Long): Builder = apply { this.amount = value }

        public fun displayText(value: String?): Builder = apply { this.displayText = value }

        public fun type(value: String): Builder = apply { this.type = value }

        public fun lines(value: List<Line>?): Builder = apply { this.lines = value }

        public fun build(): CheckoutTotal = CheckoutTotal(amount = amount, displayText = displayText, type = type, lines = lines)
    }

    public companion object {
        /** Builds a [CheckoutTotal]: `CheckoutTotal(required = …) { optional = … }`. */
        public operator fun invoke(amount: Long, type: String, configure: Builder.() -> Unit = {}): CheckoutTotal =
            Builder(amount, type).apply(configure).build()
    }
}

/**
 * Sub-line entry. Additional metadata MAY be included.
 */
@Serializable
public class Line internal constructor (
    public val amount: Long,

    /**
     * Human-readable label for this sub-line.
     */
    @SerialName("display_text")
    public val displayText: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Line &&
            amount == other.amount &&
            displayText == other.displayText)

    override fun hashCode(): Int = java.util.Objects.hash(amount, displayText)

    override fun toString(): String = "Line(amount=$amount, displayText=$displayText)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(amount, displayText)

    /** Builds a [Line]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var amount: Long,
        public var displayText: String,
    ) {
        public fun amount(value: Long): Builder = apply { this.amount = value }

        public fun displayText(value: String): Builder = apply { this.displayText = value }

        public fun build(): Line = Line(amount = amount, displayText = displayText)
    }

    public companion object {
        /** Builds a [Line]: `Line(required = …) { optional = … }`. */
        public operator fun invoke(amount: Long, displayText: String, configure: Builder.() -> Unit = {}): Line =
            Builder(amount, displayText).apply(configure).build()
    }
}

/**
 * UCP metadata for checkout responses.
 *
 * Base UCP metadata with shared properties for all schema types.
 */
@Serializable
public class UCPCheckoutResponseSchema internal constructor (
    /**
     * Capability registry keyed by reverse-domain name.
     */
    public val capabilities: Map<String, List<CapabilityResponseSchema>>? = null,

    /**
     * Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
     * (`services`, `capabilities`, and `payment_handlers`).
     */
    @SerialName("map_order")
    public val mapOrder: Map<String, List<String>>? = null,

    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    @SerialName("payment_handlers")
    public val paymentHandlers: Map<String, List<PaymentHandlerResponseSchema>>,

    /**
     * Service registry keyed by reverse-domain name.
     */
    public val services: Map<String, List<ServiceResponseSchema>>? = null,

    /**
     * Application-level status of the UCP operation.
     */
    public val status: UCPCheckoutResponseSchemaStatus? = null,

    public val version: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is UCPCheckoutResponseSchema &&
            capabilities == other.capabilities &&
            mapOrder == other.mapOrder &&
            paymentHandlers == other.paymentHandlers &&
            services == other.services &&
            status == other.status &&
            version == other.version)

    override fun hashCode(): Int = java.util.Objects.hash(capabilities, mapOrder, paymentHandlers, services, status, version)

    override fun toString(): String = "UCPCheckoutResponseSchema(capabilities=$capabilities, mapOrder=$mapOrder, paymentHandlers=$paymentHandlers, services=$services, status=$status, version=$version)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(paymentHandlers, version).also { builder ->
        builder.capabilities = this.capabilities
        builder.mapOrder = this.mapOrder
        builder.services = this.services
        builder.status = this.status
    }

    /** Builds a [UCPCheckoutResponseSchema]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var paymentHandlers: Map<String, List<PaymentHandlerResponseSchema>>,
        public var version: String,
    ) {
        public var capabilities: Map<String, List<CapabilityResponseSchema>>? = null

        public var mapOrder: Map<String, List<String>>? = null

        public var services: Map<String, List<ServiceResponseSchema>>? = null

        public var status: UCPCheckoutResponseSchemaStatus? = null

        public fun capabilities(value: Map<String, List<CapabilityResponseSchema>>?): Builder = apply { this.capabilities = value }

        public fun mapOrder(value: Map<String, List<String>>?): Builder = apply { this.mapOrder = value }

        public fun paymentHandlers(value: Map<String, List<PaymentHandlerResponseSchema>>): Builder = apply { this.paymentHandlers = value }

        public fun services(value: Map<String, List<ServiceResponseSchema>>?): Builder = apply { this.services = value }

        public fun status(value: UCPCheckoutResponseSchemaStatus?): Builder = apply { this.status = value }

        public fun version(value: String): Builder = apply { this.version = value }

        public fun build(): UCPCheckoutResponseSchema = UCPCheckoutResponseSchema(capabilities = capabilities, mapOrder = mapOrder, paymentHandlers = paymentHandlers, services = services, status = status, version = version)
    }

    public companion object {
        /** Builds a [UCPCheckoutResponseSchema]: `UCPCheckoutResponseSchema(required = …) { optional = … }`. */
        public operator fun invoke(paymentHandlers: Map<String, List<PaymentHandlerResponseSchema>>, version: String, configure: Builder.() -> Unit = {}): UCPCheckoutResponseSchema =
            Builder(paymentHandlers, version).apply(configure).build()
    }
}

/**
 * Capability reference in responses. Only name/version required to confirm active
 * capabilities.
 *
 * Shared foundation for all UCP entities.
 */
@Serializable
public class CapabilityResponseSchema internal constructor (
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    public val config: JsonObject? = null,

    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    public val id: String? = null,

    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    public val schema: String? = null,

    /**
     * URL to human-readable specification document.
     */
    public val spec: String? = null,

    /**
     * Entity version in YYYY-MM-DD format.
     */
    public val version: String,

    /**
     * Parent capability(s) this extends. Present for extensions, absent for root capabilities.
     * Use array for multi-parent extensions.
     */
    public val extends: Extends? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is CapabilityResponseSchema &&
            config == other.config &&
            id == other.id &&
            schema == other.schema &&
            spec == other.spec &&
            version == other.version &&
            extends == other.extends)

    override fun hashCode(): Int = java.util.Objects.hash(config, id, schema, spec, version, extends)

    override fun toString(): String = "CapabilityResponseSchema(config=$config, id=$id, schema=$schema, spec=$spec, version=$version, extends=$extends)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(version).also { builder ->
        builder.config = this.config
        builder.id = this.id
        builder.schema = this.schema
        builder.spec = this.spec
        builder.extends = this.extends
    }

    /** Builds a [CapabilityResponseSchema]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var version: String,
    ) {
        public var config: JsonObject? = null

        public var id: String? = null

        public var schema: String? = null

        public var spec: String? = null

        public var extends: Extends? = null

        public fun config(value: JsonObject?): Builder = apply { this.config = value }

        public fun id(value: String?): Builder = apply { this.id = value }

        public fun schema(value: String?): Builder = apply { this.schema = value }

        public fun spec(value: String?): Builder = apply { this.spec = value }

        public fun version(value: String): Builder = apply { this.version = value }

        public fun extends(value: Extends?): Builder = apply { this.extends = value }

        public fun build(): CapabilityResponseSchema = CapabilityResponseSchema(config = config, id = id, schema = schema, spec = spec, version = version, extends = extends)
    }

    public companion object {
        /** Builds a [CapabilityResponseSchema]: `CapabilityResponseSchema(required = …) { optional = … }`. */
        public operator fun invoke(version: String, configure: Builder.() -> Unit = {}): CapabilityResponseSchema =
            Builder(version).apply(configure).build()
    }
}

/**
 * Parent capability(s) this extends. Present for extensions, absent for root capabilities.
 * Use array for multi-parent extensions.
 */
@Serializable(with = ExtendsSerializer::class)
public sealed class Extends {
    public class StringArrayValue(public val value: List<String>) : Extends()
    public class StringValue(public val value: String)            : Extends()
}

/**
 * Handler reference in responses. May include full config state for runtime usage of the
 * handler.
 *
 * Shared foundation for all UCP entities.
 */
@Serializable
public class PaymentHandlerResponseSchema internal constructor (
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    public val config: JsonObject? = null,

    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    public val id: String,

    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    public val schema: String? = null,

    /**
     * URL to human-readable specification document.
     */
    public val spec: String? = null,

    /**
     * Entity version in YYYY-MM-DD format.
     */
    public val version: String,

    /**
     * Instrument types this handler supports, with optional constraints. When absent, every
     * instrument should be considered available.
     */
    @SerialName("available_instruments")
    public val availableInstruments: List<PaymentHandlerResponseSchemaAvailableInstrument>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is PaymentHandlerResponseSchema &&
            config == other.config &&
            id == other.id &&
            schema == other.schema &&
            spec == other.spec &&
            version == other.version &&
            availableInstruments == other.availableInstruments)

    override fun hashCode(): Int = java.util.Objects.hash(config, id, schema, spec, version, availableInstruments)

    override fun toString(): String = "PaymentHandlerResponseSchema(config=$config, id=$id, schema=$schema, spec=$spec, version=$version, availableInstruments=$availableInstruments)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, version).also { builder ->
        builder.config = this.config
        builder.schema = this.schema
        builder.spec = this.spec
        builder.availableInstruments = this.availableInstruments
    }

    /** Builds a [PaymentHandlerResponseSchema]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var version: String,
    ) {
        public var config: JsonObject? = null

        public var schema: String? = null

        public var spec: String? = null

        public var availableInstruments: List<PaymentHandlerResponseSchemaAvailableInstrument>? = null

        public fun config(value: JsonObject?): Builder = apply { this.config = value }

        public fun id(value: String): Builder = apply { this.id = value }

        public fun schema(value: String?): Builder = apply { this.schema = value }

        public fun spec(value: String?): Builder = apply { this.spec = value }

        public fun version(value: String): Builder = apply { this.version = value }

        public fun availableInstruments(value: List<PaymentHandlerResponseSchemaAvailableInstrument>?): Builder = apply { this.availableInstruments = value }

        public fun build(): PaymentHandlerResponseSchema = PaymentHandlerResponseSchema(config = config, id = id, schema = schema, spec = spec, version = version, availableInstruments = availableInstruments)
    }

    public companion object {
        /** Builds a [PaymentHandlerResponseSchema]: `PaymentHandlerResponseSchema(required = …) { optional = … }`. */
        public operator fun invoke(id: String, version: String, configure: Builder.() -> Unit = {}): PaymentHandlerResponseSchema =
            Builder(id, version).apply(configure).build()
    }
}

/**
 * An instrument type available from a payment handler with optional constraints.
 */
@Serializable
public class PaymentHandlerResponseSchemaAvailableInstrument internal constructor (
    /**
     * A Constraint Expression describing the instrument this entry makes available. Keys in
     * `properties` name members of the `constraint_target` declared by the instrument schema
     * for this `type`. Requirements on submitted request data belong in
     * `ucp.request_constraints` instead.
     */
    public val constraints: ConstraintExpression? = null,

    /**
     * The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
     * schema's type constant.
     */
    public val type: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is PaymentHandlerResponseSchemaAvailableInstrument &&
            constraints == other.constraints &&
            type == other.type)

    override fun hashCode(): Int = java.util.Objects.hash(constraints, type)

    override fun toString(): String = "PaymentHandlerResponseSchemaAvailableInstrument(constraints=$constraints, type=$type)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(type).also { builder ->
        builder.constraints = this.constraints
    }

    /** Builds a [PaymentHandlerResponseSchemaAvailableInstrument]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var type: String,
    ) {
        public var constraints: ConstraintExpression? = null

        public fun constraints(value: ConstraintExpression?): Builder = apply { this.constraints = value }

        public fun type(value: String): Builder = apply { this.type = value }

        public fun build(): PaymentHandlerResponseSchemaAvailableInstrument = PaymentHandlerResponseSchemaAvailableInstrument(constraints = constraints, type = type)
    }

    public companion object {
        /** Builds a [PaymentHandlerResponseSchemaAvailableInstrument]: `PaymentHandlerResponseSchemaAvailableInstrument(required = …) { optional = … }`. */
        public operator fun invoke(type: String, configure: Builder.() -> Unit = {}): PaymentHandlerResponseSchemaAvailableInstrument =
            Builder(type).apply(configure).build()
    }
}

/**
 * A Constraint Expression describing the instrument this entry makes available. Keys in
 * `properties` name members of the `constraint_target` declared by the instrument schema
 * for this `type`. Requirements on submitted request data belong in
 * `ucp.request_constraints` instead.
 *
 * A closed JSON Schema Draft 2020-12 constraint expression with Object and Value Constraint
 * positions.
 *
 * A Value Constraint containing `enum`, `const`, or both.
 */
@Serializable(with = ConstraintPropertySerializer::class)
public class ConstraintProperty internal constructor (
    /**
     * Alternative Object Constraints. The constrained object must satisfy at least one. A
     * branch must be non-empty: an empty branch is satisfied by every object and neutralizes
     * the alternation.
     */
    public val anyOf: List<ConstraintExpression>? = null,

    /**
     * Constraints keyed by property name. Must be non-empty: an empty object applies no
     * constraint.
     */
    public val properties: Map<String, ConstraintProperty>? = null,

    /**
     * Property names required by the constrained object. Must be non-empty: an empty array
     * applies no constraint.
     */
    public val required: List<String>? = null,

    public val const: JsonElement? = null,

    /**
     * A non-empty array of unique JSON values.
     */
    public val enum: JsonArray? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is ConstraintProperty &&
            anyOf == other.anyOf &&
            properties == other.properties &&
            required == other.required &&
            const == other.const &&
            enum == other.enum)

    override fun hashCode(): Int = java.util.Objects.hash(anyOf, properties, required, const, enum)

    override fun toString(): String = "ConstraintProperty(anyOf=$anyOf, properties=$properties, required=$required, const=$const, enum=$enum)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.anyOf = this.anyOf
        builder.properties = this.properties
        builder.required = this.required
        builder.const = this.const
        builder.enum = this.enum
    }

    /** Builds a [ConstraintProperty]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var anyOf: List<ConstraintExpression>? = null

        public var properties: Map<String, ConstraintProperty>? = null

        public var required: List<String>? = null

        public var const: JsonElement? = null

        public var enum: JsonArray? = null

        public fun anyOf(value: List<ConstraintExpression>?): Builder = apply { this.anyOf = value }

        public fun properties(value: Map<String, ConstraintProperty>?): Builder = apply { this.properties = value }

        public fun required(value: List<String>?): Builder = apply { this.required = value }

        public fun const(value: JsonElement?): Builder = apply { this.const = value }

        public fun enum(value: JsonArray?): Builder = apply { this.enum = value }

        public fun build(): ConstraintProperty = ConstraintProperty(anyOf = anyOf, properties = properties, required = required, const = const, enum = enum)
    }

    public companion object {
        /** Builds a [ConstraintProperty]: `ConstraintProperty(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): ConstraintProperty =
            Builder().apply(configure).build()
    }
}

/**
 * A Constraint Expression describing the instrument this entry makes available. Keys in
 * `properties` name members of the `constraint_target` declared by the instrument schema
 * for this `type`. Requirements on submitted request data belong in
 * `ucp.request_constraints` instead.
 *
 * A closed JSON Schema Draft 2020-12 constraint expression with Object and Value Constraint
 * positions.
 */
@Serializable
public class ConstraintExpression internal constructor (
    /**
     * Alternative Object Constraints. The constrained object must satisfy at least one. A
     * branch must be non-empty: an empty branch is satisfied by every object and neutralizes
     * the alternation.
     */
    public val anyOf: List<ConstraintExpression>? = null,

    /**
     * Constraints keyed by property name. Must be non-empty: an empty object applies no
     * constraint.
     */
    public val properties: Map<String, ConstraintProperty>? = null,

    /**
     * Property names required by the constrained object. Must be non-empty: an empty array
     * applies no constraint.
     */
    public val required: List<String>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is ConstraintExpression &&
            anyOf == other.anyOf &&
            properties == other.properties &&
            required == other.required)

    override fun hashCode(): Int = java.util.Objects.hash(anyOf, properties, required)

    override fun toString(): String = "ConstraintExpression(anyOf=$anyOf, properties=$properties, required=$required)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.anyOf = this.anyOf
        builder.properties = this.properties
        builder.required = this.required
    }

    /** Builds a [ConstraintExpression]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var anyOf: List<ConstraintExpression>? = null

        public var properties: Map<String, ConstraintProperty>? = null

        public var required: List<String>? = null

        public fun anyOf(value: List<ConstraintExpression>?): Builder = apply { this.anyOf = value }

        public fun properties(value: Map<String, ConstraintProperty>?): Builder = apply { this.properties = value }

        public fun required(value: List<String>?): Builder = apply { this.required = value }

        public fun build(): ConstraintExpression = ConstraintExpression(anyOf = anyOf, properties = properties, required = required)
    }

    public companion object {
        /** Builds a [ConstraintExpression]: `ConstraintExpression(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): ConstraintExpression =
            Builder().apply(configure).build()
    }
}

/**
 * Service binding in API responses. Includes per-resource transport configuration via typed
 * config.
 *
 * Shared foundation for all UCP entities.
 */
@Serializable
public class ServiceResponseSchema internal constructor (
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    public val config: EmbeddedTransportConfig? = null,

    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    public val id: String? = null,

    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    public val schema: String? = null,

    /**
     * URL to human-readable specification document.
     */
    public val spec: String? = null,

    /**
     * Entity version in YYYY-MM-DD format.
     */
    public val version: String,

    /**
     * Endpoint URL for this transport binding.
     */
    public val endpoint: String? = null,

    /**
     * Transport protocol for this service binding.
     */
    public val transport: Transport
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is ServiceResponseSchema &&
            config == other.config &&
            id == other.id &&
            schema == other.schema &&
            spec == other.spec &&
            version == other.version &&
            endpoint == other.endpoint &&
            transport == other.transport)

    override fun hashCode(): Int = java.util.Objects.hash(config, id, schema, spec, version, endpoint, transport)

    override fun toString(): String = "ServiceResponseSchema(config=$config, id=$id, schema=$schema, spec=$spec, version=$version, endpoint=$endpoint, transport=$transport)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(version, transport).also { builder ->
        builder.config = this.config
        builder.id = this.id
        builder.schema = this.schema
        builder.spec = this.spec
        builder.endpoint = this.endpoint
    }

    /** Builds a [ServiceResponseSchema]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var version: String,
        public var transport: Transport,
    ) {
        public var config: EmbeddedTransportConfig? = null

        public var id: String? = null

        public var schema: String? = null

        public var spec: String? = null

        public var endpoint: String? = null

        public fun config(value: EmbeddedTransportConfig?): Builder = apply { this.config = value }

        public fun id(value: String?): Builder = apply { this.id = value }

        public fun schema(value: String?): Builder = apply { this.schema = value }

        public fun spec(value: String?): Builder = apply { this.spec = value }

        public fun version(value: String): Builder = apply { this.version = value }

        public fun endpoint(value: String?): Builder = apply { this.endpoint = value }

        public fun transport(value: Transport): Builder = apply { this.transport = value }

        public fun build(): ServiceResponseSchema = ServiceResponseSchema(config = config, id = id, schema = schema, spec = spec, version = version, endpoint = endpoint, transport = transport)
    }

    public companion object {
        /** Builds a [ServiceResponseSchema]: `ServiceResponseSchema(required = …) { optional = … }`. */
        public operator fun invoke(version: String, transport: Transport, configure: Builder.() -> Unit = {}): ServiceResponseSchema =
            Builder(version, transport).apply(configure).build()
    }
}

/**
 * Entity-specific configuration. Structure defined by each entity's schema.
 *
 * Per-session configuration for embedded transport binding. Allows businesses to vary EP
 * availability and delegations based on cart contents, agent authorization, or policy.
 */
@Serializable
public class EmbeddedTransportConfig internal constructor (
    /**
     * Color schemes the business supports. Hosts use ec_color_scheme query parameter to request
     * a scheme from this list.
     */
    @SerialName("color_scheme")
    public val colorScheme: List<EmbeddedColorScheme>? = null,

    /**
     * Delegations the business allows. At service-level, declares available delegations. In UCP
     * responses, confirms accepted delegations for this session.
     */
    public val delegate: List<String>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is EmbeddedTransportConfig &&
            colorScheme == other.colorScheme &&
            delegate == other.delegate)

    override fun hashCode(): Int = java.util.Objects.hash(colorScheme, delegate)

    override fun toString(): String = "EmbeddedTransportConfig(colorScheme=$colorScheme, delegate=$delegate)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.colorScheme = this.colorScheme
        builder.delegate = this.delegate
    }

    /** Builds a [EmbeddedTransportConfig]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var colorScheme: List<EmbeddedColorScheme>? = null

        public var delegate: List<String>? = null

        public fun colorScheme(value: List<EmbeddedColorScheme>?): Builder = apply { this.colorScheme = value }

        public fun delegate(value: List<String>?): Builder = apply { this.delegate = value }

        public fun build(): EmbeddedTransportConfig = EmbeddedTransportConfig(colorScheme = colorScheme, delegate = delegate)
    }

    public companion object {
        /** Builds a [EmbeddedTransportConfig]: `EmbeddedTransportConfig(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): EmbeddedTransportConfig =
            Builder().apply(configure).build()
    }
}

@Serializable(with = EmbeddedColorSchemeSerializer::class)
public class EmbeddedColorScheme private constructor(public val value: String) {
    public companion object {
        @JvmField public val Dark: EmbeddedColorScheme = EmbeddedColorScheme("dark")
        @JvmField public val Light: EmbeddedColorScheme = EmbeddedColorScheme("light")

        /** Values defined by the pinned protocol version. */
        internal val known: Map<String, EmbeddedColorScheme> = listOf(Dark, Light).associateBy { it.value }

        internal fun fromWire(value: String): EmbeddedColorScheme = known[value] ?: EmbeddedColorScheme(value)
    }

    override fun equals(other: Any?): Boolean = this === other || (other is EmbeddedColorScheme && value == other.value)

    override fun hashCode(): Int = value.hashCode()

    override fun toString(): String = value
}

internal object EmbeddedColorSchemeSerializer : KSerializer<EmbeddedColorScheme> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.EmbeddedColorScheme", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): EmbeddedColorScheme {
        val value = if (decoder is JsonDecoder) {
            val primitive = decoder.decodeJsonElement() as? JsonPrimitive
            if (primitive?.isString != true) {
                throw SerializationException("Expected a string for EmbeddedColorScheme")
            }
            primitive.content
        } else {
            decoder.decodeString()
        }
        return EmbeddedColorScheme.fromWire(value)
    }

    override fun serialize(encoder: Encoder, value: EmbeddedColorScheme): Unit = encoder.encodeString(value.value)
}

/**
 * Transport protocol for this service binding.
 */
@Serializable(with = TransportSerializer::class)
public class Transport private constructor(public val value: String) {
    public companion object {
        @JvmField public val A2A: Transport = Transport("a2a")
        @JvmField public val Embedded: Transport = Transport("embedded")
        @JvmField public val MCP: Transport = Transport("mcp")
        @JvmField public val REST: Transport = Transport("rest")

        /** Values defined by the pinned protocol version. */
        internal val known: Map<String, Transport> = listOf(A2A, Embedded, MCP, REST).associateBy { it.value }

        internal fun fromWire(value: String): Transport = known[value] ?: Transport(value)
    }

    override fun equals(other: Any?): Boolean = this === other || (other is Transport && value == other.value)

    override fun hashCode(): Int = value.hashCode()

    override fun toString(): String = value
}

internal object TransportSerializer : KSerializer<Transport> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.Transport", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): Transport {
        val value = if (decoder is JsonDecoder) {
            val primitive = decoder.decodeJsonElement() as? JsonPrimitive
            if (primitive?.isString != true) {
                throw SerializationException("Expected a string for Transport")
            }
            primitive.content
        } else {
            decoder.decodeString()
        }
        return Transport.fromWire(value)
    }

    override fun serialize(encoder: Encoder, value: Transport): Unit = encoder.encodeString(value.value)
}

/**
 * Application-level status of the UCP operation.
 */
@Serializable(with = UCPCheckoutResponseSchemaStatusSerializer::class)
public class UCPCheckoutResponseSchemaStatus private constructor(public val value: String) {
    public companion object {
        @JvmField public val Error: UCPCheckoutResponseSchemaStatus = UCPCheckoutResponseSchemaStatus("error")
        @JvmField public val Success: UCPCheckoutResponseSchemaStatus = UCPCheckoutResponseSchemaStatus("success")

        /** Values defined by the pinned protocol version. */
        internal val known: Map<String, UCPCheckoutResponseSchemaStatus> = listOf(Error, Success).associateBy { it.value }

        internal fun fromWire(value: String): UCPCheckoutResponseSchemaStatus = known[value] ?: UCPCheckoutResponseSchemaStatus(value)
    }

    override fun equals(other: Any?): Boolean = this === other || (other is UCPCheckoutResponseSchemaStatus && value == other.value)

    override fun hashCode(): Int = value.hashCode()

    override fun toString(): String = value
}

internal object UCPCheckoutResponseSchemaStatusSerializer : KSerializer<UCPCheckoutResponseSchemaStatus> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.UCPCheckoutResponseSchemaStatus", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): UCPCheckoutResponseSchemaStatus {
        val value = if (decoder is JsonDecoder) {
            val primitive = decoder.decodeJsonElement() as? JsonPrimitive
            if (primitive?.isString != true) {
                throw SerializationException("Expected a string for UCPCheckoutResponseSchemaStatus")
            }
            primitive.content
        } else {
            decoder.decodeString()
        }
        return UCPCheckoutResponseSchemaStatus.fromWire(value)
    }

    override fun serialize(encoder: Encoder, value: UCPCheckoutResponseSchemaStatus): Unit = encoder.encodeString(value.value)
}

/**
 * Order schema with line items, buyer-facing fulfillment expectations, and event logs.
 */
@Serializable
public class Order internal constructor (
    /**
     * Post-order events (refunds, returns, credits, disputes, cancellations, etc.) that exist
     * independently of fulfillment.
     */
    public val adjustments: List<Adjustment>? = null,

    /**
     * Snapshot of the attribution associated with the originating checkout. Read-only on the
     * order.
     */
    public val attribution: Map<String, String>? = null,

    /**
     * Associated checkout ID for reconciliation.
     */
    @SerialName("checkout_id")
    public val checkoutID: String,

    /**
     * ISO 4217 currency code. MUST match the currency from the originating checkout session.
     */
    public val currency: String,

    /**
     * Fulfillment data: buyer expectations and what actually happened.
     */
    public val fulfillment: Fulfillment,

    /**
     * Unique order identifier.
     */
    public val id: String,

    /**
     * Human-readable label for identifying the order. MUST only be provided by the business.
     */
    public val label: String? = null,

    /**
     * Line items representing what was purchased — can change post-order via edits or exchanges.
     */
    @SerialName("line_items")
    public val lineItems: List<OrderLineItem>,

    /**
     * Business outcome messages (errors, warnings, informational). Present when the business
     * needs to communicate status or issues to the platform.
     */
    public val messages: List<Message>? = null,

    /**
     * Permalink to access the order on merchant site.
     */
    @SerialName("permalink_url")
    public val permalinkURL: String,

    /**
     * Snapshot of the policies that applied to the items at checkout, captured on the order as
     * a durable record. `applies_to` targets are relative to the response root.
     */
    public val policies: List<Policy>? = null,

    /**
     * Different totals for the order.
     */
    public val totals: List<CheckoutTotal>,

    public val ucp: UCPOrderResponseSchema
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Order &&
            adjustments == other.adjustments &&
            attribution == other.attribution &&
            checkoutID == other.checkoutID &&
            currency == other.currency &&
            fulfillment == other.fulfillment &&
            id == other.id &&
            label == other.label &&
            lineItems == other.lineItems &&
            messages == other.messages &&
            permalinkURL == other.permalinkURL &&
            policies == other.policies &&
            totals == other.totals &&
            ucp == other.ucp)

    override fun hashCode(): Int = java.util.Objects.hash(adjustments, attribution, checkoutID, currency, fulfillment, id, label, lineItems, messages, permalinkURL, policies, totals, ucp)

    override fun toString(): String = "Order(adjustments=$adjustments, attribution=$attribution, checkoutID=$checkoutID, currency=$currency, fulfillment=$fulfillment, id=$id, label=$label, lineItems=$lineItems, messages=$messages, permalinkURL=$permalinkURL, policies=$policies, totals=$totals, ucp=$ucp)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(checkoutID, currency, fulfillment, id, lineItems, permalinkURL, totals, ucp).also { builder ->
        builder.adjustments = this.adjustments
        builder.attribution = this.attribution
        builder.label = this.label
        builder.messages = this.messages
        builder.policies = this.policies
    }

    /** Builds a [Order]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var checkoutID: String,
        public var currency: String,
        public var fulfillment: Fulfillment,
        public var id: String,
        public var lineItems: List<OrderLineItem>,
        public var permalinkURL: String,
        public var totals: List<CheckoutTotal>,
        public var ucp: UCPOrderResponseSchema,
    ) {
        public var adjustments: List<Adjustment>? = null

        public var attribution: Map<String, String>? = null

        public var label: String? = null

        public var messages: List<Message>? = null

        public var policies: List<Policy>? = null

        public fun adjustments(value: List<Adjustment>?): Builder = apply { this.adjustments = value }

        public fun attribution(value: Map<String, String>?): Builder = apply { this.attribution = value }

        public fun checkoutID(value: String): Builder = apply { this.checkoutID = value }

        public fun currency(value: String): Builder = apply { this.currency = value }

        public fun fulfillment(value: Fulfillment): Builder = apply { this.fulfillment = value }

        public fun id(value: String): Builder = apply { this.id = value }

        public fun label(value: String?): Builder = apply { this.label = value }

        public fun lineItems(value: List<OrderLineItem>): Builder = apply { this.lineItems = value }

        public fun messages(value: List<Message>?): Builder = apply { this.messages = value }

        public fun permalinkURL(value: String): Builder = apply { this.permalinkURL = value }

        public fun policies(value: List<Policy>?): Builder = apply { this.policies = value }

        public fun totals(value: List<CheckoutTotal>): Builder = apply { this.totals = value }

        public fun ucp(value: UCPOrderResponseSchema): Builder = apply { this.ucp = value }

        public fun build(): Order = Order(adjustments = adjustments, attribution = attribution, checkoutID = checkoutID, currency = currency, fulfillment = fulfillment, id = id, label = label, lineItems = lineItems, messages = messages, permalinkURL = permalinkURL, policies = policies, totals = totals, ucp = ucp)
    }

    public companion object {
        /** Builds a [Order]: `Order(required = …) { optional = … }`. */
        public operator fun invoke(checkoutID: String, currency: String, fulfillment: Fulfillment, id: String, lineItems: List<OrderLineItem>, permalinkURL: String, totals: List<CheckoutTotal>, ucp: UCPOrderResponseSchema, configure: Builder.() -> Unit = {}): Order =
            Builder(checkoutID, currency, fulfillment, id, lineItems, permalinkURL, totals, ucp).apply(configure).build()
    }
}

/**
 * Post-order event that exists independently of fulfillment. Typically represents money
 * movements but can be any post-order change. Polymorphic type that can optionally
 * reference line items.
 */
@Serializable
public class Adjustment internal constructor (
    /**
     * Human-readable reason or description (e.g., 'Defective item', 'Customer requested').
     */
    public val description: String? = null,

    /**
     * Adjustment event identifier.
     */
    public val id: String,

    /**
     * Which line items and quantities are affected (optional).
     */
    @SerialName("line_items")
    public val lineItems: List<AdjustmentLineItem>? = null,

    /**
     * RFC 3339 timestamp when this adjustment occurred.
     */
    @SerialName("occurred_at")
    public val occurredAt: String,

    /**
     * Adjustment status.
     */
    public val status: AdjustmentStatus,

    /**
     * Adjustment totals breakdown. Signed values - negative for money returned to buyer
     * (refunds, credits), positive for additional charges (exchanges).
     */
    public val totals: List<LineItemTotal>? = null,

    /**
     * Type of adjustment (open string). Typically money-related like: refund, return, credit,
     * price_adjustment, dispute, cancellation. Can be any value that makes sense for the
     * merchant's business.
     */
    public val type: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Adjustment &&
            description == other.description &&
            id == other.id &&
            lineItems == other.lineItems &&
            occurredAt == other.occurredAt &&
            status == other.status &&
            totals == other.totals &&
            type == other.type)

    override fun hashCode(): Int = java.util.Objects.hash(description, id, lineItems, occurredAt, status, totals, type)

    override fun toString(): String = "Adjustment(description=$description, id=$id, lineItems=$lineItems, occurredAt=$occurredAt, status=$status, totals=$totals, type=$type)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, occurredAt, status, type).also { builder ->
        builder.description = this.description
        builder.lineItems = this.lineItems
        builder.totals = this.totals
    }

    /** Builds a [Adjustment]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var occurredAt: String,
        public var status: AdjustmentStatus,
        public var type: String,
    ) {
        public var description: String? = null

        public var lineItems: List<AdjustmentLineItem>? = null

        public var totals: List<LineItemTotal>? = null

        public fun description(value: String?): Builder = apply { this.description = value }

        public fun id(value: String): Builder = apply { this.id = value }

        public fun lineItems(value: List<AdjustmentLineItem>?): Builder = apply { this.lineItems = value }

        public fun occurredAt(value: String): Builder = apply { this.occurredAt = value }

        public fun status(value: AdjustmentStatus): Builder = apply { this.status = value }

        public fun totals(value: List<LineItemTotal>?): Builder = apply { this.totals = value }

        public fun type(value: String): Builder = apply { this.type = value }

        public fun build(): Adjustment = Adjustment(description = description, id = id, lineItems = lineItems, occurredAt = occurredAt, status = status, totals = totals, type = type)
    }

    public companion object {
        /** Builds a [Adjustment]: `Adjustment(required = …) { optional = … }`. */
        public operator fun invoke(id: String, occurredAt: String, status: AdjustmentStatus, type: String, configure: Builder.() -> Unit = {}): Adjustment =
            Builder(id, occurredAt, status, type).apply(configure).build()
    }
}

@Serializable
public class AdjustmentLineItem internal constructor (
    /**
     * Line item ID reference.
     */
    public val id: String,

    /**
     * The settled measurement this adjustment reconciles (for example, actual picked weight),
     * present when the line's price settles by measurement. Its unit identity MUST match the
     * line's pricing basis (`item.unit_price` measure/reference unit); no unit conversion. A
     * pure price settlement uses `quantity: 0` together with `measure` and a totals delta.
     */
    public val measure: Measure? = null,

    /**
     * Signed integer count of steps of the referenced line item's `quantity_unit` (`10^-scale`
     * × `unit`); when `quantity_unit` is absent, it counts whole items (`each`). Negative
     * values represent reductions (e.g. returns); positive values represent additions (e.g.
     * exchanges).
     */
    public val quantity: Long
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is AdjustmentLineItem &&
            id == other.id &&
            measure == other.measure &&
            quantity == other.quantity)

    override fun hashCode(): Int = java.util.Objects.hash(id, measure, quantity)

    override fun toString(): String = "AdjustmentLineItem(id=$id, measure=$measure, quantity=$quantity)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, quantity).also { builder ->
        builder.measure = this.measure
    }

    /** Builds a [AdjustmentLineItem]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var quantity: Long,
    ) {
        public var measure: Measure? = null

        public fun id(value: String): Builder = apply { this.id = value }

        public fun measure(value: Measure?): Builder = apply { this.measure = value }

        public fun quantity(value: Long): Builder = apply { this.quantity = value }

        public fun build(): AdjustmentLineItem = AdjustmentLineItem(id = id, measure = measure, quantity = quantity)
    }

    public companion object {
        /** Builds a [AdjustmentLineItem]: `AdjustmentLineItem(required = …) { optional = … }`. */
        public operator fun invoke(id: String, quantity: Long, configure: Builder.() -> Unit = {}): AdjustmentLineItem =
            Builder(id, quantity).apply(configure).build()
    }
}

/**
 * Adjustment status.
 */
@Serializable(with = AdjustmentStatusSerializer::class)
public class AdjustmentStatus private constructor(public val value: String) {
    public companion object {
        @JvmField public val Completed: AdjustmentStatus = AdjustmentStatus("completed")
        @JvmField public val Failed: AdjustmentStatus = AdjustmentStatus("failed")
        @JvmField public val Pending: AdjustmentStatus = AdjustmentStatus("pending")

        /** Values defined by the pinned protocol version. */
        internal val known: Map<String, AdjustmentStatus> = listOf(Completed, Failed, Pending).associateBy { it.value }

        internal fun fromWire(value: String): AdjustmentStatus = known[value] ?: AdjustmentStatus(value)
    }

    override fun equals(other: Any?): Boolean = this === other || (other is AdjustmentStatus && value == other.value)

    override fun hashCode(): Int = value.hashCode()

    override fun toString(): String = value
}

internal object AdjustmentStatusSerializer : KSerializer<AdjustmentStatus> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.AdjustmentStatus", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): AdjustmentStatus {
        val value = if (decoder is JsonDecoder) {
            val primitive = decoder.decodeJsonElement() as? JsonPrimitive
            if (primitive?.isString != true) {
                throw SerializationException("Expected a string for AdjustmentStatus")
            }
            primitive.content
        } else {
            decoder.decodeString()
        }
        return AdjustmentStatus.fromWire(value)
    }

    override fun serialize(encoder: Encoder, value: AdjustmentStatus): Unit = encoder.encodeString(value.value)
}

/**
 * Fulfillment data: buyer expectations and what actually happened.
 */
@Serializable
public class Fulfillment internal constructor (
    /**
     * Append-only event log of actual shipments. Each event references line items by ID.
     */
    public val events: List<FulfillmentEvent>? = null,

    /**
     * Buyer-facing groups representing when/how items will be delivered. Can be split, merged,
     * or adjusted post-order.
     */
    public val expectations: List<Expectation>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Fulfillment &&
            events == other.events &&
            expectations == other.expectations)

    override fun hashCode(): Int = java.util.Objects.hash(events, expectations)

    override fun toString(): String = "Fulfillment(events=$events, expectations=$expectations)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.events = this.events
        builder.expectations = this.expectations
    }

    /** Builds a [Fulfillment]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var events: List<FulfillmentEvent>? = null

        public var expectations: List<Expectation>? = null

        public fun events(value: List<FulfillmentEvent>?): Builder = apply { this.events = value }

        public fun expectations(value: List<Expectation>?): Builder = apply { this.expectations = value }

        public fun build(): Fulfillment = Fulfillment(events = events, expectations = expectations)
    }

    public companion object {
        /** Builds a [Fulfillment]: `Fulfillment(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): Fulfillment =
            Builder().apply(configure).build()
    }
}

/**
 * Append-only fulfillment event representing an actual shipment. References line items by
 * ID.
 */
@Serializable
public class FulfillmentEvent internal constructor (
    /**
     * Carrier name (e.g., 'FedEx', 'USPS').
     */
    public val carrier: String? = null,

    /**
     * Human-readable description of the shipment status or delivery information (e.g.,
     * 'Delivered to front door', 'Out for delivery').
     */
    public val description: String? = null,

    /**
     * Fulfillment event identifier.
     */
    public val id: String,

    /**
     * Which line items and quantities are fulfilled in this event.
     */
    @SerialName("line_items")
    public val lineItems: List<EventLineItem>,

    /**
     * RFC 3339 timestamp when this fulfillment event occurred.
     */
    @SerialName("occurred_at")
    public val occurredAt: String,

    /**
     * Carrier tracking number (required if type != processing).
     */
    @SerialName("tracking_number")
    public val trackingNumber: String? = null,

    /**
     * URL to track this shipment (required if type != processing).
     */
    @SerialName("tracking_url")
    public val trackingURL: String? = null,

    /**
     * Fulfillment event type. Common values include: processing (preparing to ship), shipped
     * (handed to carrier), in_transit (in delivery network), delivered (received by buyer),
     * failed_attempt (delivery attempt failed), canceled (fulfillment canceled), undeliverable
     * (cannot be delivered), returned_to_sender (returned to merchant).
     */
    public val type: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is FulfillmentEvent &&
            carrier == other.carrier &&
            description == other.description &&
            id == other.id &&
            lineItems == other.lineItems &&
            occurredAt == other.occurredAt &&
            trackingNumber == other.trackingNumber &&
            trackingURL == other.trackingURL &&
            type == other.type)

    override fun hashCode(): Int = java.util.Objects.hash(carrier, description, id, lineItems, occurredAt, trackingNumber, trackingURL, type)

    override fun toString(): String = "FulfillmentEvent(carrier=$carrier, description=$description, id=$id, lineItems=$lineItems, occurredAt=$occurredAt, trackingNumber=$trackingNumber, trackingURL=$trackingURL, type=$type)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, lineItems, occurredAt, type).also { builder ->
        builder.carrier = this.carrier
        builder.description = this.description
        builder.trackingNumber = this.trackingNumber
        builder.trackingURL = this.trackingURL
    }

    /** Builds a [FulfillmentEvent]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var lineItems: List<EventLineItem>,
        public var occurredAt: String,
        public var type: String,
    ) {
        public var carrier: String? = null

        public var description: String? = null

        public var trackingNumber: String? = null

        public var trackingURL: String? = null

        public fun carrier(value: String?): Builder = apply { this.carrier = value }

        public fun description(value: String?): Builder = apply { this.description = value }

        public fun id(value: String): Builder = apply { this.id = value }

        public fun lineItems(value: List<EventLineItem>): Builder = apply { this.lineItems = value }

        public fun occurredAt(value: String): Builder = apply { this.occurredAt = value }

        public fun trackingNumber(value: String?): Builder = apply { this.trackingNumber = value }

        public fun trackingURL(value: String?): Builder = apply { this.trackingURL = value }

        public fun type(value: String): Builder = apply { this.type = value }

        public fun build(): FulfillmentEvent = FulfillmentEvent(carrier = carrier, description = description, id = id, lineItems = lineItems, occurredAt = occurredAt, trackingNumber = trackingNumber, trackingURL = trackingURL, type = type)
    }

    public companion object {
        /** Builds a [FulfillmentEvent]: `FulfillmentEvent(required = …) { optional = … }`. */
        public operator fun invoke(id: String, lineItems: List<EventLineItem>, occurredAt: String, type: String, configure: Builder.() -> Unit = {}): FulfillmentEvent =
            Builder(id, lineItems, occurredAt, type).apply(configure).build()
    }
}

@Serializable
public class EventLineItem internal constructor (
    /**
     * Line item ID reference.
     */
    public val id: String,

    /**
     * Integer count of steps of the referenced line item's `quantity_unit` (`10^-scale` ×
     * `unit`); when `quantity_unit` is absent, it counts whole items (`each`).
     */
    public val quantity: Long
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is EventLineItem &&
            id == other.id &&
            quantity == other.quantity)

    override fun hashCode(): Int = java.util.Objects.hash(id, quantity)

    override fun toString(): String = "EventLineItem(id=$id, quantity=$quantity)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, quantity)

    /** Builds a [EventLineItem]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var quantity: Long,
    ) {
        public fun id(value: String): Builder = apply { this.id = value }

        public fun quantity(value: Long): Builder = apply { this.quantity = value }

        public fun build(): EventLineItem = EventLineItem(id = id, quantity = quantity)
    }

    public companion object {
        /** Builds a [EventLineItem]: `EventLineItem(required = …) { optional = … }`. */
        public operator fun invoke(id: String, quantity: Long, configure: Builder.() -> Unit = {}): EventLineItem =
            Builder(id, quantity).apply(configure).build()
    }
}

/**
 * Buyer-facing fulfillment expectation representing logical groupings of items (e.g.,
 * 'package'). Can be split, merged, or adjusted post-order to set buyer expectations for
 * when/how items arrive.
 */
@Serializable
public class Expectation internal constructor (
    /**
     * Human-readable delivery description (e.g., 'Arrives in 5-8 business days').
     */
    public val description: String? = null,

    /**
     * Delivery destination address.
     */
    public val destination: PostalAddress,

    /**
     * When this expectation can be fulfilled: 'now' or ISO 8601 timestamp for future date
     * (backorder, pre-order).
     */
    @SerialName("fulfillable_on")
    public val fulfillableOn: String? = null,

    /**
     * Expectation identifier.
     */
    public val id: String,

    /**
     * Which line items and quantities are in this expectation.
     */
    @SerialName("line_items")
    public val lineItems: List<ExpectationLineItem>,

    /**
     * Delivery method type. Well-known values: `shipping`, `pickup`, `digital`; additional
     * values MAY be used.
     */
    @SerialName("method_type")
    public val methodType: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Expectation &&
            description == other.description &&
            destination == other.destination &&
            fulfillableOn == other.fulfillableOn &&
            id == other.id &&
            lineItems == other.lineItems &&
            methodType == other.methodType)

    override fun hashCode(): Int = java.util.Objects.hash(description, destination, fulfillableOn, id, lineItems, methodType)

    override fun toString(): String = "Expectation(description=$description, destination=$destination, fulfillableOn=$fulfillableOn, id=$id, lineItems=$lineItems, methodType=$methodType)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(destination, id, lineItems, methodType).also { builder ->
        builder.description = this.description
        builder.fulfillableOn = this.fulfillableOn
    }

    /** Builds a [Expectation]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var destination: PostalAddress,
        public var id: String,
        public var lineItems: List<ExpectationLineItem>,
        public var methodType: String,
    ) {
        public var description: String? = null

        public var fulfillableOn: String? = null

        public fun description(value: String?): Builder = apply { this.description = value }

        public fun destination(value: PostalAddress): Builder = apply { this.destination = value }

        public fun fulfillableOn(value: String?): Builder = apply { this.fulfillableOn = value }

        public fun id(value: String): Builder = apply { this.id = value }

        public fun lineItems(value: List<ExpectationLineItem>): Builder = apply { this.lineItems = value }

        public fun methodType(value: String): Builder = apply { this.methodType = value }

        public fun build(): Expectation = Expectation(description = description, destination = destination, fulfillableOn = fulfillableOn, id = id, lineItems = lineItems, methodType = methodType)
    }

    public companion object {
        /** Builds a [Expectation]: `Expectation(required = …) { optional = … }`. */
        public operator fun invoke(destination: PostalAddress, id: String, lineItems: List<ExpectationLineItem>, methodType: String, configure: Builder.() -> Unit = {}): Expectation =
            Builder(destination, id, lineItems, methodType).apply(configure).build()
    }
}

@Serializable
public class ExpectationLineItem internal constructor (
    /**
     * Line item ID reference.
     */
    public val id: String,

    /**
     * Integer count of steps of the referenced line item's `quantity_unit` (`10^-scale` ×
     * `unit`); when `quantity_unit` is absent, it counts whole items (`each`).
     */
    public val quantity: Long
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is ExpectationLineItem &&
            id == other.id &&
            quantity == other.quantity)

    override fun hashCode(): Int = java.util.Objects.hash(id, quantity)

    override fun toString(): String = "ExpectationLineItem(id=$id, quantity=$quantity)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, quantity)

    /** Builds a [ExpectationLineItem]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var quantity: Long,
    ) {
        public fun id(value: String): Builder = apply { this.id = value }

        public fun quantity(value: Long): Builder = apply { this.quantity = value }

        public fun build(): ExpectationLineItem = ExpectationLineItem(id = id, quantity = quantity)
    }

    public companion object {
        /** Builds a [ExpectationLineItem]: `ExpectationLineItem(required = …) { optional = … }`. */
        public operator fun invoke(id: String, quantity: Long, configure: Builder.() -> Unit = {}): ExpectationLineItem =
            Builder(id, quantity).apply(configure).build()
    }
}

@Serializable
public class OrderLineItem internal constructor (
    /**
     * Line item identifier.
     */
    public val id: String,

    /**
     * Purchased item data, including identity, price, and sale basis.
     */
    public val item: Item,

    /**
     * Parent line item identifier for any nested structures.
     */
    @SerialName("parent_id")
    public val parentID: String? = null,

    /**
     * Tracks the line item's original, current active, and fulfilled quantities. All three
     * values use the same inherited `item.quantity_unit`. When `item.quantity_unit` is absent
     * on an authoritative order response, each step is one whole item (`each`) under the shared
     * default.
     */
    public val quantity: LineItemQuantity,

    /**
     * Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
     * quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
     * quantity.fulfilled > 0, otherwise processing.
     */
    public val status: LineItemStatus,

    /**
     * Line item totals breakdown.
     */
    public val totals: List<LineItemTotal>
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is OrderLineItem &&
            id == other.id &&
            item == other.item &&
            parentID == other.parentID &&
            quantity == other.quantity &&
            status == other.status &&
            totals == other.totals)

    override fun hashCode(): Int = java.util.Objects.hash(id, item, parentID, quantity, status, totals)

    override fun toString(): String = "OrderLineItem(id=$id, item=$item, parentID=$parentID, quantity=$quantity, status=$status, totals=$totals)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, item, quantity, status, totals).also { builder ->
        builder.parentID = this.parentID
    }

    /** Builds a [OrderLineItem]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var item: Item,
        public var quantity: LineItemQuantity,
        public var status: LineItemStatus,
        public var totals: List<LineItemTotal>,
    ) {
        public var parentID: String? = null

        public fun id(value: String): Builder = apply { this.id = value }

        public fun item(value: Item): Builder = apply { this.item = value }

        public fun parentID(value: String?): Builder = apply { this.parentID = value }

        public fun quantity(value: LineItemQuantity): Builder = apply { this.quantity = value }

        public fun status(value: LineItemStatus): Builder = apply { this.status = value }

        public fun totals(value: List<LineItemTotal>): Builder = apply { this.totals = value }

        public fun build(): OrderLineItem = OrderLineItem(id = id, item = item, parentID = parentID, quantity = quantity, status = status, totals = totals)
    }

    public companion object {
        /** Builds a [OrderLineItem]: `OrderLineItem(required = …) { optional = … }`. */
        public operator fun invoke(id: String, item: Item, quantity: LineItemQuantity, status: LineItemStatus, totals: List<LineItemTotal>, configure: Builder.() -> Unit = {}): OrderLineItem =
            Builder(id, item, quantity, status, totals).apply(configure).build()
    }
}

/**
 * Tracks the line item's original, current active, and fulfilled quantities. All three
 * values use the same inherited `item.quantity_unit`. When `item.quantity_unit` is absent
 * on an authoritative order response, each step is one whole item (`each`) under the shared
 * default.
 */
@Serializable
public class LineItemQuantity internal constructor (
    /**
     * Quantity fulfilled so far, expressed as an integer step count.
     */
    public val fulfilled: Long,

    /**
     * Quantity from the original checkout, expressed as an integer step count.
     */
    public val original: Long? = null,

    /**
     * Current active quantity after returns, cancellations, or other order changes, expressed
     * as an integer step count.
     */
    public val total: Long
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is LineItemQuantity &&
            fulfilled == other.fulfilled &&
            original == other.original &&
            total == other.total)

    override fun hashCode(): Int = java.util.Objects.hash(fulfilled, original, total)

    override fun toString(): String = "LineItemQuantity(fulfilled=$fulfilled, original=$original, total=$total)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(fulfilled, total).also { builder ->
        builder.original = this.original
    }

    /** Builds a [LineItemQuantity]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var fulfilled: Long,
        public var total: Long,
    ) {
        public var original: Long? = null

        public fun fulfilled(value: Long): Builder = apply { this.fulfilled = value }

        public fun original(value: Long?): Builder = apply { this.original = value }

        public fun total(value: Long): Builder = apply { this.total = value }

        public fun build(): LineItemQuantity = LineItemQuantity(fulfilled = fulfilled, original = original, total = total)
    }

    public companion object {
        /** Builds a [LineItemQuantity]: `LineItemQuantity(required = …) { optional = … }`. */
        public operator fun invoke(fulfilled: Long, total: Long, configure: Builder.() -> Unit = {}): LineItemQuantity =
            Builder(fulfilled, total).apply(configure).build()
    }
}

/**
 * Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
 * quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
 * quantity.fulfilled > 0, otherwise processing.
 */
@Serializable(with = LineItemStatusSerializer::class)
public class LineItemStatus private constructor(public val value: String) {
    public companion object {
        @JvmField public val Fulfilled: LineItemStatus = LineItemStatus("fulfilled")
        @JvmField public val Partial: LineItemStatus = LineItemStatus("partial")
        @JvmField public val Processing: LineItemStatus = LineItemStatus("processing")
        @JvmField public val Removed: LineItemStatus = LineItemStatus("removed")

        /** Values defined by the pinned protocol version. */
        internal val known: Map<String, LineItemStatus> = listOf(Fulfilled, Partial, Processing, Removed).associateBy { it.value }

        internal fun fromWire(value: String): LineItemStatus = known[value] ?: LineItemStatus(value)
    }

    override fun equals(other: Any?): Boolean = this === other || (other is LineItemStatus && value == other.value)

    override fun hashCode(): Int = value.hashCode()

    override fun toString(): String = value
}

internal object LineItemStatusSerializer : KSerializer<LineItemStatus> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.LineItemStatus", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): LineItemStatus {
        val value = if (decoder is JsonDecoder) {
            val primitive = decoder.decodeJsonElement() as? JsonPrimitive
            if (primitive?.isString != true) {
                throw SerializationException("Expected a string for LineItemStatus")
            }
            primitive.content
        } else {
            decoder.decodeString()
        }
        return LineItemStatus.fromWire(value)
    }

    override fun serialize(encoder: Encoder, value: LineItemStatus): Unit = encoder.encodeString(value.value)
}

/**
 * UCP metadata for order responses. No payment handlers needed post-purchase.
 *
 * Base UCP metadata with shared properties for all schema types.
 */
@Serializable
public class UCPOrderResponseSchema internal constructor (
    /**
     * Capability registry keyed by reverse-domain name.
     */
    public val capabilities: Map<String, List<CapabilityResponseSchema>>? = null,

    /**
     * Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
     * (`services`, `capabilities`, and `payment_handlers`).
     */
    @SerialName("map_order")
    public val mapOrder: Map<String, List<String>>? = null,

    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    @SerialName("payment_handlers")
    public val paymentHandlers: Map<String, List<PaymentHandlerResponseSchema>>? = null,

    /**
     * Service registry keyed by reverse-domain name.
     */
    public val services: Map<String, List<Service>>? = null,

    /**
     * Application-level status of the UCP operation.
     */
    public val status: UCPCheckoutResponseSchemaStatus? = null,

    public val version: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is UCPOrderResponseSchema &&
            capabilities == other.capabilities &&
            mapOrder == other.mapOrder &&
            paymentHandlers == other.paymentHandlers &&
            services == other.services &&
            status == other.status &&
            version == other.version)

    override fun hashCode(): Int = java.util.Objects.hash(capabilities, mapOrder, paymentHandlers, services, status, version)

    override fun toString(): String = "UCPOrderResponseSchema(capabilities=$capabilities, mapOrder=$mapOrder, paymentHandlers=$paymentHandlers, services=$services, status=$status, version=$version)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(version).also { builder ->
        builder.capabilities = this.capabilities
        builder.mapOrder = this.mapOrder
        builder.paymentHandlers = this.paymentHandlers
        builder.services = this.services
        builder.status = this.status
    }

    /** Builds a [UCPOrderResponseSchema]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var version: String,
    ) {
        public var capabilities: Map<String, List<CapabilityResponseSchema>>? = null

        public var mapOrder: Map<String, List<String>>? = null

        public var paymentHandlers: Map<String, List<PaymentHandlerResponseSchema>>? = null

        public var services: Map<String, List<Service>>? = null

        public var status: UCPCheckoutResponseSchemaStatus? = null

        public fun capabilities(value: Map<String, List<CapabilityResponseSchema>>?): Builder = apply { this.capabilities = value }

        public fun mapOrder(value: Map<String, List<String>>?): Builder = apply { this.mapOrder = value }

        public fun paymentHandlers(value: Map<String, List<PaymentHandlerResponseSchema>>?): Builder = apply { this.paymentHandlers = value }

        public fun services(value: Map<String, List<Service>>?): Builder = apply { this.services = value }

        public fun status(value: UCPCheckoutResponseSchemaStatus?): Builder = apply { this.status = value }

        public fun version(value: String): Builder = apply { this.version = value }

        public fun build(): UCPOrderResponseSchema = UCPOrderResponseSchema(capabilities = capabilities, mapOrder = mapOrder, paymentHandlers = paymentHandlers, services = services, status = status, version = version)
    }

    public companion object {
        /** Builds a [UCPOrderResponseSchema]: `UCPOrderResponseSchema(required = …) { optional = … }`. */
        public operator fun invoke(version: String, configure: Builder.() -> Unit = {}): UCPOrderResponseSchema =
            Builder(version).apply(configure).build()
    }
}

/**
 * Shared foundation for all UCP entities.
 */
@Serializable
public class Service internal constructor (
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    public val config: JsonObject? = null,

    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    public val id: String? = null,

    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    public val schema: String? = null,

    /**
     * URL to human-readable specification document.
     */
    public val spec: String? = null,

    /**
     * Entity version in YYYY-MM-DD format.
     */
    public val version: String,

    /**
     * Endpoint URL for this transport binding.
     */
    public val endpoint: String? = null,

    /**
     * Transport protocol for this service binding.
     */
    public val transport: Transport
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Service &&
            config == other.config &&
            id == other.id &&
            schema == other.schema &&
            spec == other.spec &&
            version == other.version &&
            endpoint == other.endpoint &&
            transport == other.transport)

    override fun hashCode(): Int = java.util.Objects.hash(config, id, schema, spec, version, endpoint, transport)

    override fun toString(): String = "Service(config=$config, id=$id, schema=$schema, spec=$spec, version=$version, endpoint=$endpoint, transport=$transport)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(version, transport).also { builder ->
        builder.config = this.config
        builder.id = this.id
        builder.schema = this.schema
        builder.spec = this.spec
        builder.endpoint = this.endpoint
    }

    /** Builds a [Service]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var version: String,
        public var transport: Transport,
    ) {
        public var config: JsonObject? = null

        public var id: String? = null

        public var schema: String? = null

        public var spec: String? = null

        public var endpoint: String? = null

        public fun config(value: JsonObject?): Builder = apply { this.config = value }

        public fun id(value: String?): Builder = apply { this.id = value }

        public fun schema(value: String?): Builder = apply { this.schema = value }

        public fun spec(value: String?): Builder = apply { this.spec = value }

        public fun version(value: String): Builder = apply { this.version = value }

        public fun endpoint(value: String?): Builder = apply { this.endpoint = value }

        public fun transport(value: Transport): Builder = apply { this.transport = value }

        public fun build(): Service = Service(config = config, id = id, schema = schema, spec = spec, version = version, endpoint = endpoint, transport = transport)
    }

    public companion object {
        /** Builds a [Service]: `Service(required = …) { optional = … }`. */
        public operator fun invoke(version: String, transport: Transport, configure: Builder.() -> Unit = {}): Service =
            Builder(version, transport).apply(configure).build()
    }
}

/**
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public class ErrorResponse internal constructor (
    /**
     * URL for buyer handoff or session recovery.
     */
    @SerialName("continue_url")
    public val continueURL: String? = null,

    /**
     * Array of messages describing why the operation failed.
     */
    public val messages: List<Message>,

    /**
     * UCP protocol metadata. Status MUST be 'error' for error response.
     */
    public val ucp: ErrorResponseUcp
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is ErrorResponse &&
            continueURL == other.continueURL &&
            messages == other.messages &&
            ucp == other.ucp)

    override fun hashCode(): Int = java.util.Objects.hash(continueURL, messages, ucp)

    override fun toString(): String = "ErrorResponse(continueURL=$continueURL, messages=$messages, ucp=$ucp)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(messages, ucp).also { builder ->
        builder.continueURL = this.continueURL
    }

    /** Builds a [ErrorResponse]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var messages: List<Message>,
        public var ucp: ErrorResponseUcp,
    ) {
        public var continueURL: String? = null

        public fun continueURL(value: String?): Builder = apply { this.continueURL = value }

        public fun messages(value: List<Message>): Builder = apply { this.messages = value }

        public fun ucp(value: ErrorResponseUcp): Builder = apply { this.ucp = value }

        public fun build(): ErrorResponse = ErrorResponse(continueURL = continueURL, messages = messages, ucp = ucp)
    }

    public companion object {
        /** Builds a [ErrorResponse]: `ErrorResponse(required = …) { optional = … }`. */
        public operator fun invoke(messages: List<Message>, ucp: ErrorResponseUcp, configure: Builder.() -> Unit = {}): ErrorResponse =
            Builder(messages, ucp).apply(configure).build()
    }
}

/**
 * UCP protocol metadata. Status MUST be 'error' for error response.
 *
 * UCP metadata with status 'error'. Use for response branches that carry error
 * information.
 *
 * Base UCP metadata with shared properties for all schema types.
 */
@Serializable
public class ErrorResponseUcp internal constructor (
    /**
     * Capability registry keyed by reverse-domain name.
     */
    public val capabilities: Map<String, List<CapabilityResponseSchema>>? = null,

    /**
     * Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
     * (`services`, `capabilities`, and `payment_handlers`).
     */
    @SerialName("map_order")
    public val mapOrder: Map<String, List<String>>? = null,

    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    @SerialName("payment_handlers")
    public val paymentHandlers: Map<String, List<PaymentHandlerResponseSchema>>? = null,

    /**
     * Service registry keyed by reverse-domain name.
     */
    public val services: Map<String, List<Service>>? = null,

    /**
     * Application-level status of the UCP operation.
     */
    public val status: ErrorStatus,

    public val version: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is ErrorResponseUcp &&
            capabilities == other.capabilities &&
            mapOrder == other.mapOrder &&
            paymentHandlers == other.paymentHandlers &&
            services == other.services &&
            status == other.status &&
            version == other.version)

    override fun hashCode(): Int = java.util.Objects.hash(capabilities, mapOrder, paymentHandlers, services, status, version)

    override fun toString(): String = "ErrorResponseUcp(capabilities=$capabilities, mapOrder=$mapOrder, paymentHandlers=$paymentHandlers, services=$services, status=$status, version=$version)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(status, version).also { builder ->
        builder.capabilities = this.capabilities
        builder.mapOrder = this.mapOrder
        builder.paymentHandlers = this.paymentHandlers
        builder.services = this.services
    }

    /** Builds a [ErrorResponseUcp]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var status: ErrorStatus,
        public var version: String,
    ) {
        public var capabilities: Map<String, List<CapabilityResponseSchema>>? = null

        public var mapOrder: Map<String, List<String>>? = null

        public var paymentHandlers: Map<String, List<PaymentHandlerResponseSchema>>? = null

        public var services: Map<String, List<Service>>? = null

        public fun capabilities(value: Map<String, List<CapabilityResponseSchema>>?): Builder = apply { this.capabilities = value }

        public fun mapOrder(value: Map<String, List<String>>?): Builder = apply { this.mapOrder = value }

        public fun paymentHandlers(value: Map<String, List<PaymentHandlerResponseSchema>>?): Builder = apply { this.paymentHandlers = value }

        public fun services(value: Map<String, List<Service>>?): Builder = apply { this.services = value }

        public fun status(value: ErrorStatus): Builder = apply { this.status = value }

        public fun version(value: String): Builder = apply { this.version = value }

        public fun build(): ErrorResponseUcp = ErrorResponseUcp(capabilities = capabilities, mapOrder = mapOrder, paymentHandlers = paymentHandlers, services = services, status = status, version = version)
    }

    public companion object {
        /** Builds a [ErrorResponseUcp]: `ErrorResponseUcp(required = …) { optional = … }`. */
        public operator fun invoke(status: ErrorStatus, version: String, configure: Builder.() -> Unit = {}): ErrorResponseUcp =
            Builder(status, version).apply(configure).build()
    }
}

/**
 * Application-level status of the UCP operation.
 */
@Serializable(with = ErrorStatusSerializer::class)
public class ErrorStatus private constructor(public val value: String) {
    public companion object {
        @JvmField public val Error: ErrorStatus = ErrorStatus("error")

        /** Values defined by the pinned protocol version. */
        internal val known: Map<String, ErrorStatus> = listOf(Error).associateBy { it.value }

        internal fun fromWire(value: String): ErrorStatus = known[value] ?: ErrorStatus(value)
    }

    override fun equals(other: Any?): Boolean = this === other || (other is ErrorStatus && value == other.value)

    override fun hashCode(): Int = value.hashCode()

    override fun toString(): String = value
}

internal object ErrorStatusSerializer : KSerializer<ErrorStatus> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.ErrorStatus", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): ErrorStatus {
        val value = if (decoder is JsonDecoder) {
            val primitive = decoder.decodeJsonElement() as? JsonPrimitive
            if (primitive?.isString != true) {
                throw SerializationException("Expected a string for ErrorStatus")
            }
            primitive.content
        } else {
            decoder.decodeString()
        }
        return ErrorStatus.fromWire(value)
    }

    override fun serialize(encoder: Encoder, value: ErrorStatus): Unit = encoder.encodeString(value.value)
}

/**
 * Checkout state after instrument selection.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public class InstrumentsChangeResult internal constructor (
    /**
     * Partial checkout update with payment instrument selection.
     */
    public val checkout: InstrumentsChangeCheckout? = null,

    /**
     * UCP protocol metadata. Status MUST be 'error' for error response.
     */
    public val ucp: InstrumentsChangeResultUcp,

    /**
     * URL for buyer handoff or session recovery.
     */
    @SerialName("continue_url")
    public val continueURL: String? = null,

    /**
     * Array of messages describing why the operation failed.
     */
    public val messages: List<Message>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is InstrumentsChangeResult &&
            checkout == other.checkout &&
            ucp == other.ucp &&
            continueURL == other.continueURL &&
            messages == other.messages)

    override fun hashCode(): Int = java.util.Objects.hash(checkout, ucp, continueURL, messages)

    override fun toString(): String = "InstrumentsChangeResult(checkout=$checkout, ucp=$ucp, continueURL=$continueURL, messages=$messages)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(ucp).also { builder ->
        builder.checkout = this.checkout
        builder.continueURL = this.continueURL
        builder.messages = this.messages
    }

    /** Builds a [InstrumentsChangeResult]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var ucp: InstrumentsChangeResultUcp,
    ) {
        public var checkout: InstrumentsChangeCheckout? = null

        public var continueURL: String? = null

        public var messages: List<Message>? = null

        public fun checkout(value: InstrumentsChangeCheckout?): Builder = apply { this.checkout = value }

        public fun ucp(value: InstrumentsChangeResultUcp): Builder = apply { this.ucp = value }

        public fun continueURL(value: String?): Builder = apply { this.continueURL = value }

        public fun messages(value: List<Message>?): Builder = apply { this.messages = value }

        public fun build(): InstrumentsChangeResult = InstrumentsChangeResult(checkout = checkout, ucp = ucp, continueURL = continueURL, messages = messages)
    }

    public companion object {
        /** Builds a [InstrumentsChangeResult]: `InstrumentsChangeResult(required = …) { optional = … }`. */
        public operator fun invoke(ucp: InstrumentsChangeResultUcp, configure: Builder.() -> Unit = {}): InstrumentsChangeResult =
            Builder(ucp).apply(configure).build()
    }
}

/**
 * Partial checkout update with payment instrument selection.
 */
@Serializable
public class InstrumentsChangeCheckout internal constructor (
    /**
     * Payment instruments with selected instrument ID.
     */
    public val payment: InstrumentsChangePayment? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is InstrumentsChangeCheckout &&
            payment == other.payment)

    override fun hashCode(): Int = java.util.Objects.hash(payment)

    override fun toString(): String = "InstrumentsChangeCheckout(payment=$payment)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.payment = this.payment
    }

    /** Builds a [InstrumentsChangeCheckout]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var payment: InstrumentsChangePayment? = null

        public fun payment(value: InstrumentsChangePayment?): Builder = apply { this.payment = value }

        public fun build(): InstrumentsChangeCheckout = InstrumentsChangeCheckout(payment = payment)
    }

    public companion object {
        /** Builds a [InstrumentsChangeCheckout]: `InstrumentsChangeCheckout(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): InstrumentsChangeCheckout =
            Builder().apply(configure).build()
    }
}

/**
 * Payment instruments with selected instrument ID.
 *
 * Payment configuration containing handlers.
 */
@Serializable
public class InstrumentsChangePayment internal constructor (
    /**
     * The payment instruments available for this payment. Each instrument is associated with a
     * specific handler via the handler_id field. Handlers can extend the base
     * payment_instrument schema to add handler-specific fields.
     */
    public val instruments: List<SelectedPaymentInstrument>? = null,

    /**
     * ID of the selected payment instrument.
     */
    @SerialName("selected_instrument_id")
    public val selectedInstrumentID: String? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is InstrumentsChangePayment &&
            instruments == other.instruments &&
            selectedInstrumentID == other.selectedInstrumentID)

    override fun hashCode(): Int = java.util.Objects.hash(instruments, selectedInstrumentID)

    override fun toString(): String = "InstrumentsChangePayment(instruments=$instruments, selectedInstrumentID=$selectedInstrumentID)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.instruments = this.instruments
        builder.selectedInstrumentID = this.selectedInstrumentID
    }

    /** Builds a [InstrumentsChangePayment]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var instruments: List<SelectedPaymentInstrument>? = null

        public var selectedInstrumentID: String? = null

        public fun instruments(value: List<SelectedPaymentInstrument>?): Builder = apply { this.instruments = value }

        public fun selectedInstrumentID(value: String?): Builder = apply { this.selectedInstrumentID = value }

        public fun build(): InstrumentsChangePayment = InstrumentsChangePayment(instruments = instruments, selectedInstrumentID = selectedInstrumentID)
    }

    public companion object {
        /** Builds a [InstrumentsChangePayment]: `InstrumentsChangePayment(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): InstrumentsChangePayment =
            Builder().apply(configure).build()
    }
}

/**
 * UCP metadata with status 'success'. Use for response branches that carry the expected
 * payload.
 *
 * Base UCP metadata with shared properties for all schema types.
 *
 * UCP protocol metadata. Status MUST be 'error' for error response.
 *
 * UCP metadata with status 'error'. Use for response branches that carry error information.
 */
@Serializable
public class InstrumentsChangeResultUcp internal constructor (
    /**
     * Capability registry keyed by reverse-domain name.
     */
    public val capabilities: Map<String, List<CapabilityElement>>? = null,

    /**
     * Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
     * (`services`, `capabilities`, and `payment_handlers`).
     */
    @SerialName("map_order")
    public val mapOrder: Map<String, List<String>>? = null,

    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    @SerialName("payment_handlers")
    public val paymentHandlers: Map<String, List<PaymentHandlerElement>>? = null,

    /**
     * Service registry keyed by reverse-domain name.
     */
    public val services: Map<String, List<EmbeddedService>>? = null,

    /**
     * Application-level status of the UCP operation.
     */
    public val status: UCPCheckoutResponseSchemaStatus,

    public val version: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is InstrumentsChangeResultUcp &&
            capabilities == other.capabilities &&
            mapOrder == other.mapOrder &&
            paymentHandlers == other.paymentHandlers &&
            services == other.services &&
            status == other.status &&
            version == other.version)

    override fun hashCode(): Int = java.util.Objects.hash(capabilities, mapOrder, paymentHandlers, services, status, version)

    override fun toString(): String = "InstrumentsChangeResultUcp(capabilities=$capabilities, mapOrder=$mapOrder, paymentHandlers=$paymentHandlers, services=$services, status=$status, version=$version)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(status, version).also { builder ->
        builder.capabilities = this.capabilities
        builder.mapOrder = this.mapOrder
        builder.paymentHandlers = this.paymentHandlers
        builder.services = this.services
    }

    /** Builds a [InstrumentsChangeResultUcp]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var status: UCPCheckoutResponseSchemaStatus,
        public var version: String,
    ) {
        public var capabilities: Map<String, List<CapabilityElement>>? = null

        public var mapOrder: Map<String, List<String>>? = null

        public var paymentHandlers: Map<String, List<PaymentHandlerElement>>? = null

        public var services: Map<String, List<EmbeddedService>>? = null

        public fun capabilities(value: Map<String, List<CapabilityElement>>?): Builder = apply { this.capabilities = value }

        public fun mapOrder(value: Map<String, List<String>>?): Builder = apply { this.mapOrder = value }

        public fun paymentHandlers(value: Map<String, List<PaymentHandlerElement>>?): Builder = apply { this.paymentHandlers = value }

        public fun services(value: Map<String, List<EmbeddedService>>?): Builder = apply { this.services = value }

        public fun status(value: UCPCheckoutResponseSchemaStatus): Builder = apply { this.status = value }

        public fun version(value: String): Builder = apply { this.version = value }

        public fun build(): InstrumentsChangeResultUcp = InstrumentsChangeResultUcp(capabilities = capabilities, mapOrder = mapOrder, paymentHandlers = paymentHandlers, services = services, status = status, version = version)
    }

    public companion object {
        /** Builds a [InstrumentsChangeResultUcp]: `InstrumentsChangeResultUcp(required = …) { optional = … }`. */
        public operator fun invoke(status: UCPCheckoutResponseSchemaStatus, version: String, configure: Builder.() -> Unit = {}): InstrumentsChangeResultUcp =
            Builder(status, version).apply(configure).build()
    }
}

/**
 * Shared foundation for all UCP entities.
 *
 * Capability reference in responses. Only name/version required to confirm active
 * capabilities.
 */
@Serializable
public class CapabilityElement internal constructor (
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    public val config: JsonObject? = null,

    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    public val id: String? = null,

    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    public val schema: String? = null,

    /**
     * URL to human-readable specification document.
     */
    public val spec: String? = null,

    /**
     * Entity version in YYYY-MM-DD format.
     */
    public val version: String,

    /**
     * Parent capability(s) this extends. Present for extensions, absent for root capabilities.
     * Use array for multi-parent extensions.
     */
    public val extends: Extends? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is CapabilityElement &&
            config == other.config &&
            id == other.id &&
            schema == other.schema &&
            spec == other.spec &&
            version == other.version &&
            extends == other.extends)

    override fun hashCode(): Int = java.util.Objects.hash(config, id, schema, spec, version, extends)

    override fun toString(): String = "CapabilityElement(config=$config, id=$id, schema=$schema, spec=$spec, version=$version, extends=$extends)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(version).also { builder ->
        builder.config = this.config
        builder.id = this.id
        builder.schema = this.schema
        builder.spec = this.spec
        builder.extends = this.extends
    }

    /** Builds a [CapabilityElement]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var version: String,
    ) {
        public var config: JsonObject? = null

        public var id: String? = null

        public var schema: String? = null

        public var spec: String? = null

        public var extends: Extends? = null

        public fun config(value: JsonObject?): Builder = apply { this.config = value }

        public fun id(value: String?): Builder = apply { this.id = value }

        public fun schema(value: String?): Builder = apply { this.schema = value }

        public fun spec(value: String?): Builder = apply { this.spec = value }

        public fun version(value: String): Builder = apply { this.version = value }

        public fun extends(value: Extends?): Builder = apply { this.extends = value }

        public fun build(): CapabilityElement = CapabilityElement(config = config, id = id, schema = schema, spec = spec, version = version, extends = extends)
    }

    public companion object {
        /** Builds a [CapabilityElement]: `CapabilityElement(required = …) { optional = … }`. */
        public operator fun invoke(version: String, configure: Builder.() -> Unit = {}): CapabilityElement =
            Builder(version).apply(configure).build()
    }
}

/**
 * Shared foundation for all UCP entities.
 *
 * Handler reference in responses. May include full config state for runtime usage of the
 * handler.
 */
@Serializable
public class PaymentHandlerElement internal constructor (
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    public val config: JsonObject? = null,

    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    public val id: String,

    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    public val schema: String? = null,

    /**
     * URL to human-readable specification document.
     */
    public val spec: String? = null,

    /**
     * Entity version in YYYY-MM-DD format.
     */
    public val version: String,

    /**
     * Instrument types this handler supports, with optional constraints. When absent, every
     * instrument should be considered available.
     */
    @SerialName("available_instruments")
    public val availableInstruments: List<PaymentHandlerAvailableInstrument>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is PaymentHandlerElement &&
            config == other.config &&
            id == other.id &&
            schema == other.schema &&
            spec == other.spec &&
            version == other.version &&
            availableInstruments == other.availableInstruments)

    override fun hashCode(): Int = java.util.Objects.hash(config, id, schema, spec, version, availableInstruments)

    override fun toString(): String = "PaymentHandlerElement(config=$config, id=$id, schema=$schema, spec=$spec, version=$version, availableInstruments=$availableInstruments)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(id, version).also { builder ->
        builder.config = this.config
        builder.schema = this.schema
        builder.spec = this.spec
        builder.availableInstruments = this.availableInstruments
    }

    /** Builds a [PaymentHandlerElement]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var id: String,
        public var version: String,
    ) {
        public var config: JsonObject? = null

        public var schema: String? = null

        public var spec: String? = null

        public var availableInstruments: List<PaymentHandlerAvailableInstrument>? = null

        public fun config(value: JsonObject?): Builder = apply { this.config = value }

        public fun id(value: String): Builder = apply { this.id = value }

        public fun schema(value: String?): Builder = apply { this.schema = value }

        public fun spec(value: String?): Builder = apply { this.spec = value }

        public fun version(value: String): Builder = apply { this.version = value }

        public fun availableInstruments(value: List<PaymentHandlerAvailableInstrument>?): Builder = apply { this.availableInstruments = value }

        public fun build(): PaymentHandlerElement = PaymentHandlerElement(config = config, id = id, schema = schema, spec = spec, version = version, availableInstruments = availableInstruments)
    }

    public companion object {
        /** Builds a [PaymentHandlerElement]: `PaymentHandlerElement(required = …) { optional = … }`. */
        public operator fun invoke(id: String, version: String, configure: Builder.() -> Unit = {}): PaymentHandlerElement =
            Builder(id, version).apply(configure).build()
    }
}

/**
 * An instrument type available from a payment handler with optional constraints.
 */
@Serializable
public class PaymentHandlerAvailableInstrument internal constructor (
    /**
     * A Constraint Expression describing the instrument this entry makes available. Keys in
     * `properties` name members of the `constraint_target` declared by the instrument schema
     * for this `type`. Requirements on submitted request data belong in
     * `ucp.request_constraints` instead.
     */
    public val constraints: ConstraintExpression? = null,

    /**
     * The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
     * schema's type constant.
     */
    public val type: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is PaymentHandlerAvailableInstrument &&
            constraints == other.constraints &&
            type == other.type)

    override fun hashCode(): Int = java.util.Objects.hash(constraints, type)

    override fun toString(): String = "PaymentHandlerAvailableInstrument(constraints=$constraints, type=$type)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(type).also { builder ->
        builder.constraints = this.constraints
    }

    /** Builds a [PaymentHandlerAvailableInstrument]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var type: String,
    ) {
        public var constraints: ConstraintExpression? = null

        public fun constraints(value: ConstraintExpression?): Builder = apply { this.constraints = value }

        public fun type(value: String): Builder = apply { this.type = value }

        public fun build(): PaymentHandlerAvailableInstrument = PaymentHandlerAvailableInstrument(constraints = constraints, type = type)
    }

    public companion object {
        /** Builds a [PaymentHandlerAvailableInstrument]: `PaymentHandlerAvailableInstrument(required = …) { optional = … }`. */
        public operator fun invoke(type: String, configure: Builder.() -> Unit = {}): PaymentHandlerAvailableInstrument =
            Builder(type).apply(configure).build()
    }
}

/**
 * Shared foundation for all UCP entities.
 */
@Serializable
public class EmbeddedService internal constructor (
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    public val config: JsonObject? = null,

    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    public val id: String? = null,

    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    public val schema: String? = null,

    /**
     * URL to human-readable specification document.
     */
    public val spec: String? = null,

    /**
     * Entity version in YYYY-MM-DD format.
     */
    public val version: String,

    /**
     * Endpoint URL for this transport binding.
     */
    public val endpoint: String? = null,

    /**
     * Transport protocol for this service binding.
     */
    public val transport: Transport
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is EmbeddedService &&
            config == other.config &&
            id == other.id &&
            schema == other.schema &&
            spec == other.spec &&
            version == other.version &&
            endpoint == other.endpoint &&
            transport == other.transport)

    override fun hashCode(): Int = java.util.Objects.hash(config, id, schema, spec, version, endpoint, transport)

    override fun toString(): String = "EmbeddedService(config=$config, id=$id, schema=$schema, spec=$spec, version=$version, endpoint=$endpoint, transport=$transport)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(version, transport).also { builder ->
        builder.config = this.config
        builder.id = this.id
        builder.schema = this.schema
        builder.spec = this.spec
        builder.endpoint = this.endpoint
    }

    /** Builds a [EmbeddedService]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var version: String,
        public var transport: Transport,
    ) {
        public var config: JsonObject? = null

        public var id: String? = null

        public var schema: String? = null

        public var spec: String? = null

        public var endpoint: String? = null

        public fun config(value: JsonObject?): Builder = apply { this.config = value }

        public fun id(value: String?): Builder = apply { this.id = value }

        public fun schema(value: String?): Builder = apply { this.schema = value }

        public fun spec(value: String?): Builder = apply { this.spec = value }

        public fun version(value: String): Builder = apply { this.version = value }

        public fun endpoint(value: String?): Builder = apply { this.endpoint = value }

        public fun transport(value: Transport): Builder = apply { this.transport = value }

        public fun build(): EmbeddedService = EmbeddedService(config = config, id = id, schema = schema, spec = spec, version = version, endpoint = endpoint, transport = transport)
    }

    public companion object {
        /** Builds a [EmbeddedService]: `EmbeddedService(required = …) { optional = … }`. */
        public operator fun invoke(version: String, transport: Transport, configure: Builder.() -> Unit = {}): EmbeddedService =
            Builder(version, transport).apply(configure).build()
    }
}

/**
 * Checkout state with payment credential ready for completion.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public class CredentialResult internal constructor (
    /**
     * Partial checkout update with payment credential.
     */
    public val checkout: CredentialCheckout? = null,

    /**
     * UCP protocol metadata. Status MUST be 'error' for error response.
     */
    public val ucp: InstrumentsChangeResultUcp,

    /**
     * URL for buyer handoff or session recovery.
     */
    @SerialName("continue_url")
    public val continueURL: String? = null,

    /**
     * Array of messages describing why the operation failed.
     */
    public val messages: List<Message>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is CredentialResult &&
            checkout == other.checkout &&
            ucp == other.ucp &&
            continueURL == other.continueURL &&
            messages == other.messages)

    override fun hashCode(): Int = java.util.Objects.hash(checkout, ucp, continueURL, messages)

    override fun toString(): String = "CredentialResult(checkout=$checkout, ucp=$ucp, continueURL=$continueURL, messages=$messages)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(ucp).also { builder ->
        builder.checkout = this.checkout
        builder.continueURL = this.continueURL
        builder.messages = this.messages
    }

    /** Builds a [CredentialResult]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var ucp: InstrumentsChangeResultUcp,
    ) {
        public var checkout: CredentialCheckout? = null

        public var continueURL: String? = null

        public var messages: List<Message>? = null

        public fun checkout(value: CredentialCheckout?): Builder = apply { this.checkout = value }

        public fun ucp(value: InstrumentsChangeResultUcp): Builder = apply { this.ucp = value }

        public fun continueURL(value: String?): Builder = apply { this.continueURL = value }

        public fun messages(value: List<Message>?): Builder = apply { this.messages = value }

        public fun build(): CredentialResult = CredentialResult(checkout = checkout, ucp = ucp, continueURL = continueURL, messages = messages)
    }

    public companion object {
        /** Builds a [CredentialResult]: `CredentialResult(required = …) { optional = … }`. */
        public operator fun invoke(ucp: InstrumentsChangeResultUcp, configure: Builder.() -> Unit = {}): CredentialResult =
            Builder(ucp).apply(configure).build()
    }
}

/**
 * Partial checkout update with payment credential.
 */
@Serializable
public class CredentialCheckout internal constructor (
    public val payment: Payment? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is CredentialCheckout &&
            payment == other.payment)

    override fun hashCode(): Int = java.util.Objects.hash(payment)

    override fun toString(): String = "CredentialCheckout(payment=$payment)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.payment = this.payment
    }

    /** Builds a [CredentialCheckout]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var payment: Payment? = null

        public fun payment(value: Payment?): Builder = apply { this.payment = value }

        public fun build(): CredentialCheckout = CredentialCheckout(payment = payment)
    }

    public companion object {
        /** Builds a [CredentialCheckout]: `CredentialCheckout(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): CredentialCheckout =
            Builder().apply(configure).build()
    }
}

/**
 * Checkout state after address selection.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public class AddressChangeResult internal constructor (
    /**
     * Partial checkout update with fulfillment address selection.
     */
    public val checkout: AddressChangeCheckout? = null,

    /**
     * UCP protocol metadata. Status MUST be 'error' for error response.
     */
    public val ucp: InstrumentsChangeResultUcp,

    /**
     * URL for buyer handoff or session recovery.
     */
    @SerialName("continue_url")
    public val continueURL: String? = null,

    /**
     * Array of messages describing why the operation failed.
     */
    public val messages: List<Message>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is AddressChangeResult &&
            checkout == other.checkout &&
            ucp == other.ucp &&
            continueURL == other.continueURL &&
            messages == other.messages)

    override fun hashCode(): Int = java.util.Objects.hash(checkout, ucp, continueURL, messages)

    override fun toString(): String = "AddressChangeResult(checkout=$checkout, ucp=$ucp, continueURL=$continueURL, messages=$messages)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(ucp).also { builder ->
        builder.checkout = this.checkout
        builder.continueURL = this.continueURL
        builder.messages = this.messages
    }

    /** Builds a [AddressChangeResult]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var ucp: InstrumentsChangeResultUcp,
    ) {
        public var checkout: AddressChangeCheckout? = null

        public var continueURL: String? = null

        public var messages: List<Message>? = null

        public fun checkout(value: AddressChangeCheckout?): Builder = apply { this.checkout = value }

        public fun ucp(value: InstrumentsChangeResultUcp): Builder = apply { this.ucp = value }

        public fun continueURL(value: String?): Builder = apply { this.continueURL = value }

        public fun messages(value: List<Message>?): Builder = apply { this.messages = value }

        public fun build(): AddressChangeResult = AddressChangeResult(checkout = checkout, ucp = ucp, continueURL = continueURL, messages = messages)
    }

    public companion object {
        /** Builds a [AddressChangeResult]: `AddressChangeResult(required = …) { optional = … }`. */
        public operator fun invoke(ucp: InstrumentsChangeResultUcp, configure: Builder.() -> Unit = {}): AddressChangeResult =
            Builder(ucp).apply(configure).build()
    }
}

/**
 * Partial checkout update with fulfillment address selection.
 */
@Serializable
public class AddressChangeCheckout internal constructor (
    /**
     * Updated fulfillment with new selected destination and destinations.
     */
    public val fulfillment: CheckoutFulfillmentClass? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is AddressChangeCheckout &&
            fulfillment == other.fulfillment)

    override fun hashCode(): Int = java.util.Objects.hash(fulfillment)

    override fun toString(): String = "AddressChangeCheckout(fulfillment=$fulfillment)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.fulfillment = this.fulfillment
    }

    /** Builds a [AddressChangeCheckout]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var fulfillment: CheckoutFulfillmentClass? = null

        public fun fulfillment(value: CheckoutFulfillmentClass?): Builder = apply { this.fulfillment = value }

        public fun build(): AddressChangeCheckout = AddressChangeCheckout(fulfillment = fulfillment)
    }

    public companion object {
        /** Builds a [AddressChangeCheckout]: `AddressChangeCheckout(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): AddressChangeCheckout =
            Builder().apply(configure).build()
    }
}

/**
 * Updated fulfillment with new selected destination and destinations.
 *
 * Container for fulfillment methods and availability.
 */
@Serializable
public class CheckoutFulfillmentClass internal constructor (
    /**
     * Inventory availability hints.
     */
    @SerialName("available_methods")
    public val availableMethods: List<FulfillmentAvailableMethod>? = null,

    /**
     * Fulfillment methods for cart items.
     */
    public val methods: List<FulfillmentMethod>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is CheckoutFulfillmentClass &&
            availableMethods == other.availableMethods &&
            methods == other.methods)

    override fun hashCode(): Int = java.util.Objects.hash(availableMethods, methods)

    override fun toString(): String = "CheckoutFulfillmentClass(availableMethods=$availableMethods, methods=$methods)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.availableMethods = this.availableMethods
        builder.methods = this.methods
    }

    /** Builds a [CheckoutFulfillmentClass]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var availableMethods: List<FulfillmentAvailableMethod>? = null

        public var methods: List<FulfillmentMethod>? = null

        public fun availableMethods(value: List<FulfillmentAvailableMethod>?): Builder = apply { this.availableMethods = value }

        public fun methods(value: List<FulfillmentMethod>?): Builder = apply { this.methods = value }

        public fun build(): CheckoutFulfillmentClass = CheckoutFulfillmentClass(availableMethods = availableMethods, methods = methods)
    }

    public companion object {
        /** Builds a [CheckoutFulfillmentClass]: `CheckoutFulfillmentClass(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): CheckoutFulfillmentClass =
            Builder().apply(configure).build()
    }
}

@Serializable
public class ReadyRequest internal constructor (
    public val auth: Auth? = null,

    /**
     * Delegation types the merchant accepts. Must be subset of checkout.embedded.delegations.
     */
    public val delegate: List<String>
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is ReadyRequest &&
            auth == other.auth &&
            delegate == other.delegate)

    override fun hashCode(): Int = java.util.Objects.hash(auth, delegate)

    override fun toString(): String = "ReadyRequest(auth=$auth, delegate=$delegate)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(delegate).also { builder ->
        builder.auth = this.auth
    }

    /** Builds a [ReadyRequest]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var delegate: List<String>,
    ) {
        public var auth: Auth? = null

        public fun auth(value: Auth?): Builder = apply { this.auth = value }

        public fun delegate(value: List<String>): Builder = apply { this.delegate = value }

        public fun build(): ReadyRequest = ReadyRequest(auth = auth, delegate = delegate)
    }

    public companion object {
        /** Builds a [ReadyRequest]: `ReadyRequest(required = …) { optional = … }`. */
        public operator fun invoke(delegate: List<String>, configure: Builder.() -> Unit = {}): ReadyRequest =
            Builder(delegate).apply(configure).build()
    }
}

@Serializable
public class Auth internal constructor (
    public val type: String? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Auth &&
            type == other.type)

    override fun hashCode(): Int = java.util.Objects.hash(type)

    override fun toString(): String = "Auth(type=$type)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.type = this.type
    }

    /** Builds a [Auth]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var type: String? = null

        public fun type(value: String?): Builder = apply { this.type = value }

        public fun build(): Auth = Auth(type = type)
    }

    public companion object {
        /** Builds a [Auth]: `Auth(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): Auth =
            Builder().apply(configure).build()
    }
}

/**
 * Handshake response from host.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public class ReadyResult internal constructor (
    /**
     * Initial delegation state from host. Fields are permitted only when the corresponding
     * delegation is accepted.
     */
    public val checkout: ReadyCheckout? = null,

    /**
     * Requested authorization. Some common examples include API key and OAuth token.
     */
    public val credential: String? = null,

    /**
     * UCP protocol metadata. Status MUST be 'error' for error response.
     */
    public val ucp: InstrumentsChangeResultUcp,

    /**
     * Channel upgrade instructions. If present, switch to provided MessagePort.
     */
    public val upgrade: Upgrade? = null,

    /**
     * URL for buyer handoff or session recovery.
     */
    @SerialName("continue_url")
    public val continueURL: String? = null,

    /**
     * Array of messages describing why the operation failed.
     */
    public val messages: List<Message>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is ReadyResult &&
            checkout == other.checkout &&
            credential == other.credential &&
            ucp == other.ucp &&
            upgrade == other.upgrade &&
            continueURL == other.continueURL &&
            messages == other.messages)

    override fun hashCode(): Int = java.util.Objects.hash(checkout, credential, ucp, upgrade, continueURL, messages)

    override fun toString(): String = "ReadyResult(checkout=$checkout, credential=$credential, ucp=$ucp, upgrade=$upgrade, continueURL=$continueURL, messages=$messages)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(ucp).also { builder ->
        builder.checkout = this.checkout
        builder.credential = this.credential
        builder.upgrade = this.upgrade
        builder.continueURL = this.continueURL
        builder.messages = this.messages
    }

    /** Builds a [ReadyResult]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var ucp: InstrumentsChangeResultUcp,
    ) {
        public var checkout: ReadyCheckout? = null

        public var credential: String? = null

        public var upgrade: Upgrade? = null

        public var continueURL: String? = null

        public var messages: List<Message>? = null

        public fun checkout(value: ReadyCheckout?): Builder = apply { this.checkout = value }

        public fun credential(value: String?): Builder = apply { this.credential = value }

        public fun ucp(value: InstrumentsChangeResultUcp): Builder = apply { this.ucp = value }

        public fun upgrade(value: Upgrade?): Builder = apply { this.upgrade = value }

        public fun continueURL(value: String?): Builder = apply { this.continueURL = value }

        public fun messages(value: List<Message>?): Builder = apply { this.messages = value }

        public fun build(): ReadyResult = ReadyResult(checkout = checkout, credential = credential, ucp = ucp, upgrade = upgrade, continueURL = continueURL, messages = messages)
    }

    public companion object {
        /** Builds a [ReadyResult]: `ReadyResult(required = …) { optional = … }`. */
        public operator fun invoke(ucp: InstrumentsChangeResultUcp, configure: Builder.() -> Unit = {}): ReadyResult =
            Builder(ucp).apply(configure).build()
    }
}

/**
 * Initial delegation state from host. Fields are permitted only when the corresponding
 * delegation is accepted.
 */
@Serializable
public class ReadyCheckout internal constructor (
    public val fulfillment: CheckoutFulfillmentClass? = null,

    /**
     * Payment instruments with selected instrument ID.
     */
    public val payment: ReadyPayment? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is ReadyCheckout &&
            fulfillment == other.fulfillment &&
            payment == other.payment)

    override fun hashCode(): Int = java.util.Objects.hash(fulfillment, payment)

    override fun toString(): String = "ReadyCheckout(fulfillment=$fulfillment, payment=$payment)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.fulfillment = this.fulfillment
        builder.payment = this.payment
    }

    /** Builds a [ReadyCheckout]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var fulfillment: CheckoutFulfillmentClass? = null

        public var payment: ReadyPayment? = null

        public fun fulfillment(value: CheckoutFulfillmentClass?): Builder = apply { this.fulfillment = value }

        public fun payment(value: ReadyPayment?): Builder = apply { this.payment = value }

        public fun build(): ReadyCheckout = ReadyCheckout(fulfillment = fulfillment, payment = payment)
    }

    public companion object {
        /** Builds a [ReadyCheckout]: `ReadyCheckout(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): ReadyCheckout =
            Builder().apply(configure).build()
    }
}

/**
 * Payment instruments with selected instrument ID.
 *
 * Payment configuration containing handlers.
 */
@Serializable
public class ReadyPayment internal constructor (
    /**
     * The payment instruments available for this payment. Each instrument is associated with a
     * specific handler via the handler_id field. Handlers can extend the base
     * payment_instrument schema to add handler-specific fields.
     */
    public val instruments: List<SelectedPaymentInstrument>? = null,

    /**
     * ID of the selected payment instrument.
     */
    @SerialName("selected_instrument_id")
    public val selectedInstrumentID: String? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is ReadyPayment &&
            instruments == other.instruments &&
            selectedInstrumentID == other.selectedInstrumentID)

    override fun hashCode(): Int = java.util.Objects.hash(instruments, selectedInstrumentID)

    override fun toString(): String = "ReadyPayment(instruments=$instruments, selectedInstrumentID=$selectedInstrumentID)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.instruments = this.instruments
        builder.selectedInstrumentID = this.selectedInstrumentID
    }

    /** Builds a [ReadyPayment]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var instruments: List<SelectedPaymentInstrument>? = null

        public var selectedInstrumentID: String? = null

        public fun instruments(value: List<SelectedPaymentInstrument>?): Builder = apply { this.instruments = value }

        public fun selectedInstrumentID(value: String?): Builder = apply { this.selectedInstrumentID = value }

        public fun build(): ReadyPayment = ReadyPayment(instruments = instruments, selectedInstrumentID = selectedInstrumentID)
    }

    public companion object {
        /** Builds a [ReadyPayment]: `ReadyPayment(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): ReadyPayment =
            Builder().apply(configure).build()
    }
}

/**
 * Channel upgrade instructions. If present, switch to provided MessagePort.
 */
@Serializable
public class Upgrade internal constructor (
    /**
     * MessagePort for upgraded channel. Runtime type is MessagePort.
     */
    public val port: JsonObject? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is Upgrade &&
            port == other.port)

    override fun hashCode(): Int = java.util.Objects.hash(port)

    override fun toString(): String = "Upgrade(port=$port)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.port = this.port
    }

    /** Builds a [Upgrade]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var port: JsonObject? = null

        public fun port(value: JsonObject?): Builder = apply { this.port = value }

        public fun build(): Upgrade = Upgrade(port = port)
    }

    public companion object {
        /** Builds a [Upgrade]: `Upgrade(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): Upgrade =
            Builder().apply(configure).build()
    }
}

@Serializable
public class AuthRequest internal constructor (
    public val type: String? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is AuthRequest &&
            type == other.type)

    override fun hashCode(): Int = java.util.Objects.hash(type)

    override fun toString(): String = "AuthRequest(type=$type)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder().also { builder ->
        builder.type = this.type
    }

    /** Builds a [AuthRequest]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder {
        public var type: String? = null

        public fun type(value: String?): Builder = apply { this.type = value }

        public fun build(): AuthRequest = AuthRequest(type = type)
    }

    public companion object {
        /** Builds a [AuthRequest]: `AuthRequest(required = …) { optional = … }`. */
        public operator fun invoke(configure: Builder.() -> Unit = {}): AuthRequest =
            Builder().apply(configure).build()
    }
}

/**
 * Auth response from host containing the requested authorization data.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public class AuthResult internal constructor (
    /**
     * Requested authorization. Some common examples include API key and OAuth token.
     */
    public val credential: String? = null,

    /**
     * UCP protocol metadata. Status MUST be 'error' for error response.
     */
    public val ucp: InstrumentsChangeResultUcp,

    /**
     * URL for buyer handoff or session recovery.
     */
    @SerialName("continue_url")
    public val continueURL: String? = null,

    /**
     * Array of messages describing why the operation failed.
     */
    public val messages: List<Message>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is AuthResult &&
            credential == other.credential &&
            ucp == other.ucp &&
            continueURL == other.continueURL &&
            messages == other.messages)

    override fun hashCode(): Int = java.util.Objects.hash(credential, ucp, continueURL, messages)

    override fun toString(): String = "AuthResult(credential=$credential, ucp=$ucp, continueURL=$continueURL, messages=$messages)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(ucp).also { builder ->
        builder.credential = this.credential
        builder.continueURL = this.continueURL
        builder.messages = this.messages
    }

    /** Builds a [AuthResult]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var ucp: InstrumentsChangeResultUcp,
    ) {
        public var credential: String? = null

        public var continueURL: String? = null

        public var messages: List<Message>? = null

        public fun credential(value: String?): Builder = apply { this.credential = value }

        public fun ucp(value: InstrumentsChangeResultUcp): Builder = apply { this.ucp = value }

        public fun continueURL(value: String?): Builder = apply { this.continueURL = value }

        public fun messages(value: List<Message>?): Builder = apply { this.messages = value }

        public fun build(): AuthResult = AuthResult(credential = credential, ucp = ucp, continueURL = continueURL, messages = messages)
    }

    public companion object {
        /** Builds a [AuthResult]: `AuthResult(required = …) { optional = … }`. */
        public operator fun invoke(ucp: InstrumentsChangeResultUcp, configure: Builder.() -> Unit = {}): AuthResult =
            Builder(ucp).apply(configure).build()
    }
}

@Serializable
public class WindowOpenRequest internal constructor (
    /**
     * The URL of the resource to present.
     */
    public val url: String
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is WindowOpenRequest &&
            url == other.url)

    override fun hashCode(): Int = java.util.Objects.hash(url)

    override fun toString(): String = "WindowOpenRequest(url=$url)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(url)

    /** Builds a [WindowOpenRequest]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var url: String,
    ) {
        public fun url(value: String): Builder = apply { this.url = value }

        public fun build(): WindowOpenRequest = WindowOpenRequest(url = url)
    }

    public companion object {
        /** Builds a [WindowOpenRequest]: `WindowOpenRequest(required = …) { optional = … }`. */
        public operator fun invoke(url: String, configure: Builder.() -> Unit = {}): WindowOpenRequest =
            Builder(url).apply(configure).build()
    }
}

/**
 * Acknowledgement that the host handled the request.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public class WindowOpenResult internal constructor (
    /**
     * UCP protocol metadata. Status MUST be 'error' for error response.
     */
    public val ucp: InstrumentsChangeResultUcp,

    /**
     * URL for buyer handoff or session recovery.
     */
    @SerialName("continue_url")
    public val continueURL: String? = null,

    /**
     * Array of messages describing why the operation failed.
     */
    public val messages: List<Message>? = null
) {
    override fun equals(other: Any?): Boolean =
        this === other || (other is WindowOpenResult &&
            ucp == other.ucp &&
            continueURL == other.continueURL &&
            messages == other.messages)

    override fun hashCode(): Int = java.util.Objects.hash(ucp, continueURL, messages)

    override fun toString(): String = "WindowOpenResult(ucp=$ucp, continueURL=$continueURL, messages=$messages)"

    /** Returns a builder initialized with every field of this model. Nested values are shared. */
    public fun toBuilder(): Builder = Builder(ucp).also { builder ->
        builder.continueURL = this.continueURL
        builder.messages = this.messages
    }

    /** Builds a [WindowOpenResult]. Required fields are constructor parameters; all fields have properties and setters. */
    @ProtocolModelDsl
    public class Builder(
        public var ucp: InstrumentsChangeResultUcp,
    ) {
        public var continueURL: String? = null

        public var messages: List<Message>? = null

        public fun ucp(value: InstrumentsChangeResultUcp): Builder = apply { this.ucp = value }

        public fun continueURL(value: String?): Builder = apply { this.continueURL = value }

        public fun messages(value: List<Message>?): Builder = apply { this.messages = value }

        public fun build(): WindowOpenResult = WindowOpenResult(ucp = ucp, continueURL = continueURL, messages = messages)
    }

    public companion object {
        /** Builds a [WindowOpenResult]: `WindowOpenResult(required = …) { optional = … }`. */
        public operator fun invoke(ucp: InstrumentsChangeResultUcp, configure: Builder.() -> Unit = {}): WindowOpenResult =
            Builder(ucp).apply(configure).build()
    }
}

public object CheckoutSerializer : KSerializer<Checkout> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Checkout")
    override fun deserialize(decoder: Decoder): Checkout {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Checkout can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("actions", "attribution", "buyer", "context", "continue_url", "currency", "discounts", "expires_at", "fulfillment", "id", "line_items", "links", "messages", "order", "payment", "policies", "signals", "status", "totals", "ucp")
        return Checkout(
            actions = obj["actions"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<JsonObject>>>(), it) },
            attribution = obj["attribution"]?.let { json.decodeFromJsonElement(serializer<Map<String, String>>(), it) },
            buyer = obj["buyer"]?.let { json.decodeFromJsonElement(serializer<Buyer>(), it) },
            context = obj["context"]?.let { json.decodeFromJsonElement(serializer<Context>(), it) },
            continueURL = obj["continue_url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            currency = json.decodeFromJsonElement(serializer<String>(), obj["currency"] ?: throw SerializationException("Missing currency for Checkout")),
            discounts = obj["discounts"]?.let { json.decodeFromJsonElement(serializer<CheckoutDiscounts>(), it) },
            expiresAt = obj["expires_at"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            fulfillment = obj["fulfillment"]?.let { json.decodeFromJsonElement(serializer<CheckoutFulfillment>(), it) },
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for Checkout")),
            lineItems = json.decodeFromJsonElement(serializer<List<LineItem>>(), obj["line_items"] ?: throw SerializationException("Missing line_items for Checkout")),
            links = json.decodeFromJsonElement(serializer<List<Link>>(), obj["links"] ?: throw SerializationException("Missing links for Checkout")),
            messages = obj["messages"]?.let { json.decodeFromJsonElement(serializer<List<Message>>(), it) },
            order = obj["order"]?.let { json.decodeFromJsonElement(serializer<OrderConfirmation>(), it) },
            payment = obj["payment"]?.let { json.decodeFromJsonElement(serializer<Payment>(), it) },
            policies = obj["policies"]?.let { json.decodeFromJsonElement(serializer<List<Policy>>(), it) },
            signals = obj["signals"]?.let { json.decodeFromJsonElement(serializer<JsonObject>(), it) },
            status = json.decodeFromJsonElement(serializer<CheckoutStatus>(), obj["status"] ?: throw SerializationException("Missing status for Checkout")),
            totals = json.decodeFromJsonElement(serializer<List<CheckoutTotal>>(), obj["totals"] ?: throw SerializationException("Missing totals for Checkout")),
            ucp = json.decodeFromJsonElement(serializer<UCPCheckoutResponseSchema>(), obj["ucp"] ?: throw SerializationException("Missing ucp for Checkout")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Checkout) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Checkout can only be serialized to JSON")
        val json = output.json
        val known = setOf("actions", "attribution", "buyer", "context", "continue_url", "currency", "discounts", "expires_at", "fulfillment", "id", "line_items", "links", "messages", "order", "payment", "policies", "signals", "status", "totals", "ucp")
        val map = linkedMapOf<String, JsonElement>()
        value.actions?.let { map["actions"] = json.encodeToJsonElement(serializer<Map<String, List<JsonObject>>>(), it) }
        value.attribution?.let { map["attribution"] = json.encodeToJsonElement(serializer<Map<String, String>>(), it) }
        value.buyer?.let { map["buyer"] = json.encodeToJsonElement(serializer<Buyer>(), it) }
        value.context?.let { map["context"] = json.encodeToJsonElement(serializer<Context>(), it) }
        value.continueURL?.let { map["continue_url"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["currency"] = json.encodeToJsonElement(serializer<String>(), value.currency)
        value.discounts?.let { map["discounts"] = json.encodeToJsonElement(serializer<CheckoutDiscounts>(), it) }
        value.expiresAt?.let { map["expires_at"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.fulfillment?.let { map["fulfillment"] = json.encodeToJsonElement(serializer<CheckoutFulfillment>(), it) }
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["line_items"] = json.encodeToJsonElement(serializer<List<LineItem>>(), value.lineItems)
        map["links"] = json.encodeToJsonElement(serializer<List<Link>>(), value.links)
        value.messages?.let { map["messages"] = json.encodeToJsonElement(serializer<List<Message>>(), it) }
        value.order?.let { map["order"] = json.encodeToJsonElement(serializer<OrderConfirmation>(), it) }
        value.payment?.let { map["payment"] = json.encodeToJsonElement(serializer<Payment>(), it) }
        value.policies?.let { map["policies"] = json.encodeToJsonElement(serializer<List<Policy>>(), it) }
        value.signals?.let { map["signals"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        map["status"] = json.encodeToJsonElement(serializer<CheckoutStatus>(), value.status)
        map["totals"] = json.encodeToJsonElement(serializer<List<CheckoutTotal>>(), value.totals)
        map["ucp"] = json.encodeToJsonElement(serializer<UCPCheckoutResponseSchema>(), value.ucp)
        value.additionalProperties
            .filterKeys { it !in known }
            .forEach { (key, element) -> map[key] = element }
        output.encodeJsonElement(JsonObject(map))
    }
}
public object BuyerSerializer : KSerializer<Buyer> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Buyer")
    override fun deserialize(decoder: Decoder): Buyer {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Buyer can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("email", "first_name", "last_name", "phone_number")
        return Buyer(
            email = obj["email"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            firstName = obj["first_name"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            lastName = obj["last_name"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            phoneNumber = obj["phone_number"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Buyer) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Buyer can only be serialized to JSON")
        val json = output.json
        val known = setOf("email", "first_name", "last_name", "phone_number")
        val map = linkedMapOf<String, JsonElement>()
        value.email?.let { map["email"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.firstName?.let { map["first_name"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.lastName?.let { map["last_name"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.phoneNumber?.let { map["phone_number"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.additionalProperties
            .filterKeys { it !in known }
            .forEach { (key, element) -> map[key] = element }
        output.encodeJsonElement(JsonObject(map))
    }
}
public object ContextSerializer : KSerializer<Context> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Context")
    override fun deserialize(decoder: Decoder): Context {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Context can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("address_country", "address_region", "postal_code", "currency", "eligibility", "intent", "language", "location", "payment")
        return Context(
            addressCountry = obj["address_country"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            addressRegion = obj["address_region"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            postalCode = obj["postal_code"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            currency = obj["currency"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            eligibility = obj["eligibility"]?.let { json.decodeFromJsonElement(serializer<List<String>>(), it) },
            intent = obj["intent"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            language = obj["language"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            location = obj["location"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            payment = obj["payment"]?.let { json.decodeFromJsonElement(serializer<List<PreferredPaymentHandler>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Context) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Context can only be serialized to JSON")
        val json = output.json
        val known = setOf("address_country", "address_region", "postal_code", "currency", "eligibility", "intent", "language", "location", "payment")
        val map = linkedMapOf<String, JsonElement>()
        value.addressCountry?.let { map["address_country"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.addressRegion?.let { map["address_region"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.postalCode?.let { map["postal_code"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.currency?.let { map["currency"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.eligibility?.let { map["eligibility"] = json.encodeToJsonElement(serializer<List<String>>(), it) }
        value.intent?.let { map["intent"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.language?.let { map["language"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.location?.let { map["location"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.payment?.let { map["payment"] = json.encodeToJsonElement(serializer<List<PreferredPaymentHandler>>(), it) }
        value.additionalProperties
            .filterKeys { it !in known }
            .forEach { (key, element) -> map[key] = element }
        output.encodeJsonElement(JsonObject(map))
    }
}
public object FulfillmentAvailableMethodSerializer : KSerializer<FulfillmentAvailableMethod> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.FulfillmentAvailableMethod")
    override fun deserialize(decoder: Decoder): FulfillmentAvailableMethod {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("FulfillmentAvailableMethod can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("description", "fulfillable_on", "line_item_ids", "type")
        return FulfillmentAvailableMethod(
            description = obj["description"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            fulfillableOn = obj["fulfillable_on"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            lineItemIDS = json.decodeFromJsonElement(serializer<List<String>>(), obj["line_item_ids"] ?: throw SerializationException("Missing line_item_ids for FulfillmentAvailableMethod")),
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for FulfillmentAvailableMethod")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: FulfillmentAvailableMethod) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("FulfillmentAvailableMethod can only be serialized to JSON")
        val json = output.json
        val known = setOf("description", "fulfillable_on", "line_item_ids", "type")
        val map = linkedMapOf<String, JsonElement>()
        value.description?.let { map["description"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.fulfillableOn?.let { map["fulfillable_on"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["line_item_ids"] = json.encodeToJsonElement(serializer<List<String>>(), value.lineItemIDS)
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        value.additionalProperties
            .filterKeys { it !in known }
            .forEach { (key, element) -> map[key] = element }
        output.encodeJsonElement(JsonObject(map))
    }
}
public object FulfillmentMethodSerializer : KSerializer<FulfillmentMethod> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.FulfillmentMethod")
    override fun deserialize(decoder: Decoder): FulfillmentMethod {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("FulfillmentMethod can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("destinations", "groups", "id", "line_item_ids", "selected_destination_id", "type")
        return FulfillmentMethod(
            destinations = obj["destinations"]?.let { json.decodeFromJsonElement(serializer<List<FulfillmentDestination>>(), it) },
            groups = obj["groups"]?.let { json.decodeFromJsonElement(serializer<List<FulfillmentGroup>>(), it) },
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for FulfillmentMethod")),
            lineItemIDS = json.decodeFromJsonElement(serializer<List<String>>(), obj["line_item_ids"] ?: throw SerializationException("Missing line_item_ids for FulfillmentMethod")),
            selectedDestinationID = obj["selected_destination_id"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for FulfillmentMethod")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: FulfillmentMethod) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("FulfillmentMethod can only be serialized to JSON")
        val json = output.json
        val known = setOf("destinations", "groups", "id", "line_item_ids", "selected_destination_id", "type")
        val map = linkedMapOf<String, JsonElement>()
        value.destinations?.let { map["destinations"] = json.encodeToJsonElement(serializer<List<FulfillmentDestination>>(), it) }
        value.groups?.let { map["groups"] = json.encodeToJsonElement(serializer<List<FulfillmentGroup>>(), it) }
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["line_item_ids"] = json.encodeToJsonElement(serializer<List<String>>(), value.lineItemIDS)
        value.selectedDestinationID?.let { map["selected_destination_id"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        value.additionalProperties
            .filterKeys { it !in known }
            .forEach { (key, element) -> map[key] = element }
        output.encodeJsonElement(JsonObject(map))
    }
}
public object FulfillmentGroupSerializer : KSerializer<FulfillmentGroup> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.FulfillmentGroup")
    override fun deserialize(decoder: Decoder): FulfillmentGroup {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("FulfillmentGroup can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("id", "line_item_ids", "options", "selected_option_id")
        return FulfillmentGroup(
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for FulfillmentGroup")),
            lineItemIDS = json.decodeFromJsonElement(serializer<List<String>>(), obj["line_item_ids"] ?: throw SerializationException("Missing line_item_ids for FulfillmentGroup")),
            options = obj["options"]?.let { json.decodeFromJsonElement(serializer<List<FulfillmentOption>>(), it) },
            selectedOptionID = obj["selected_option_id"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: FulfillmentGroup) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("FulfillmentGroup can only be serialized to JSON")
        val json = output.json
        val known = setOf("id", "line_item_ids", "options", "selected_option_id")
        val map = linkedMapOf<String, JsonElement>()
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["line_item_ids"] = json.encodeToJsonElement(serializer<List<String>>(), value.lineItemIDS)
        value.options?.let { map["options"] = json.encodeToJsonElement(serializer<List<FulfillmentOption>>(), it) }
        value.selectedOptionID?.let { map["selected_option_id"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.additionalProperties
            .filterKeys { it !in known }
            .forEach { (key, element) -> map[key] = element }
        output.encodeJsonElement(JsonObject(map))
    }
}
public object FulfillmentOptionSerializer : KSerializer<FulfillmentOption> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.FulfillmentOption")
    override fun deserialize(decoder: Decoder): FulfillmentOption {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("FulfillmentOption can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("description", "id", "title", "carrier", "earliest_fulfillment_time", "latest_fulfillment_time", "totals")
        return FulfillmentOption(
            description = obj["description"]?.let { element ->
                if (element is JsonPrimitive && element.isString) {
                    Description(plain = element.content)
                } else {
                    json.decodeFromJsonElement(serializer<Description>(), element)
                }
            },
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for FulfillmentOption")),
            title = json.decodeFromJsonElement(serializer<String>(), obj["title"] ?: throw SerializationException("Missing title for FulfillmentOption")),
            carrier = obj["carrier"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            earliestFulfillmentTime = obj["earliest_fulfillment_time"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            latestFulfillmentTime = obj["latest_fulfillment_time"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            totals = json.decodeFromJsonElement(serializer<List<LineItemTotal>>(), obj["totals"] ?: throw SerializationException("Missing totals for FulfillmentOption")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: FulfillmentOption) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("FulfillmentOption can only be serialized to JSON")
        val json = output.json
        val known = setOf("description", "id", "title", "carrier", "earliest_fulfillment_time", "latest_fulfillment_time", "totals")
        val map = linkedMapOf<String, JsonElement>()
        value.description?.let { map["description"] = json.encodeToJsonElement(serializer<Description>(), it) }
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["title"] = json.encodeToJsonElement(serializer<String>(), value.title)
        value.carrier?.let { map["carrier"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.earliestFulfillmentTime?.let { map["earliest_fulfillment_time"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.latestFulfillmentTime?.let { map["latest_fulfillment_time"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["totals"] = json.encodeToJsonElement(serializer<List<LineItemTotal>>(), value.totals)
        value.additionalProperties
            .filterKeys { it !in known }
            .forEach { (key, element) -> map[key] = element }
        output.encodeJsonElement(JsonObject(map))
    }
}
public object SelectedPaymentInstrumentSerializer : KSerializer<SelectedPaymentInstrument> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.SelectedPaymentInstrument")
    override fun deserialize(decoder: Decoder): SelectedPaymentInstrument {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("SelectedPaymentInstrument can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("billing_address", "credential", "display", "handler_id", "id", "type", "selected")
        return SelectedPaymentInstrument(
            billingAddress = obj["billing_address"]?.let { json.decodeFromJsonElement(serializer<PostalAddress>(), it) },
            credential = obj["credential"]?.let { json.decodeFromJsonElement(serializer<PaymentCredential>(), it) },
            display = obj["display"]?.let { json.decodeFromJsonElement(serializer<JsonObject>(), it) },
            handlerID = json.decodeFromJsonElement(serializer<String>(), obj["handler_id"] ?: throw SerializationException("Missing handler_id for SelectedPaymentInstrument")),
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for SelectedPaymentInstrument")),
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for SelectedPaymentInstrument")),
            selected = obj["selected"]?.let { json.decodeFromJsonElement(serializer<Boolean>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: SelectedPaymentInstrument) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("SelectedPaymentInstrument can only be serialized to JSON")
        val json = output.json
        val known = setOf("billing_address", "credential", "display", "handler_id", "id", "type", "selected")
        val map = linkedMapOf<String, JsonElement>()
        value.billingAddress?.let { map["billing_address"] = json.encodeToJsonElement(serializer<PostalAddress>(), it) }
        value.credential?.let { map["credential"] = json.encodeToJsonElement(serializer<PaymentCredential>(), it) }
        value.display?.let { map["display"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        map["handler_id"] = json.encodeToJsonElement(serializer<String>(), value.handlerID)
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        value.selected?.let { map["selected"] = json.encodeToJsonElement(serializer<Boolean>(), it) }
        value.additionalProperties
            .filterKeys { it !in known }
            .forEach { (key, element) -> map[key] = element }
        output.encodeJsonElement(JsonObject(map))
    }
}
public object PaymentCredentialSerializer : KSerializer<PaymentCredential> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.PaymentCredential")
    override fun deserialize(decoder: Decoder): PaymentCredential {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("PaymentCredential can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("type")
        return PaymentCredential(
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for PaymentCredential")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: PaymentCredential) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("PaymentCredential can only be serialized to JSON")
        val json = output.json
        val known = setOf("type")
        val map = linkedMapOf<String, JsonElement>()
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        value.additionalProperties
            .filterKeys { it !in known }
            .forEach { (key, element) -> map[key] = element }
        output.encodeJsonElement(JsonObject(map))
    }
}
public object PolicySerializer : KSerializer<Policy> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Policy")
    override fun deserialize(decoder: Decoder): Policy {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Policy can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("applies_to", "description", "type", "url")
        return Policy(
            appliesTo = obj["applies_to"]?.let { json.decodeFromJsonElement(serializer<List<String>>(), it) },
            description = json.decodeFromJsonElement(serializer<Description>(), obj["description"] ?: throw SerializationException("Missing description for Policy")),
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for Policy")),
            url = obj["url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Policy) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Policy can only be serialized to JSON")
        val json = output.json
        val known = setOf("applies_to", "description", "type", "url")
        val map = linkedMapOf<String, JsonElement>()
        value.appliesTo?.let { map["applies_to"] = json.encodeToJsonElement(serializer<List<String>>(), it) }
        map["description"] = json.encodeToJsonElement(serializer<Description>(), value.description)
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        value.url?.let { map["url"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.additionalProperties
            .filterKeys { it !in known }
            .forEach { (key, element) -> map[key] = element }
        output.encodeJsonElement(JsonObject(map))
    }
}

internal object ConstraintPropertySerializer : KSerializer<ConstraintProperty> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.ConstraintProperty")
    override fun deserialize(decoder: Decoder): ConstraintProperty {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("ConstraintProperty can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("anyOf", "properties", "required", "const", "enum")
        if (!json.configuration.ignoreUnknownKeys && obj.keys.any { it !in known }) {
            throw SerializationException("Unknown property for ConstraintProperty")
        }
        return ConstraintProperty(
            anyOf = obj["anyOf"]?.let { json.decodeFromJsonElement(serializer<List<ConstraintExpression>>(), it) },
            properties = obj["properties"]?.let { json.decodeFromJsonElement(serializer<Map<String, ConstraintProperty>>(), it) },
            required = obj["required"]?.let { json.decodeFromJsonElement(serializer<List<String>>(), it) },
            const = obj["const"]?.let { json.decodeFromJsonElement(serializer<JsonElement>(), it) },
            enum = obj["enum"]?.let { json.decodeFromJsonElement(serializer<JsonArray>(), it) },
        )
    }
    override fun serialize(encoder: Encoder, value: ConstraintProperty) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("ConstraintProperty can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.anyOf?.let { map["anyOf"] = json.encodeToJsonElement(serializer<List<ConstraintExpression>>(), it) }
        value.properties?.let { map["properties"] = json.encodeToJsonElement(serializer<Map<String, ConstraintProperty>>(), it) }
        value.required?.let { map["required"] = json.encodeToJsonElement(serializer<List<String>>(), it) }
        value.const?.let { map["const"] = json.encodeToJsonElement(serializer<JsonElement>(), it) }
        value.enum?.let { map["enum"] = json.encodeToJsonElement(serializer<JsonArray>(), it) }
        output.encodeJsonElement(JsonObject(map))
    }
}
