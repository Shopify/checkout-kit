package com.shopify.checkoutkit

import kotlinx.serialization.*
import kotlinx.serialization.json.*
import kotlinx.serialization.descriptors.*
import kotlinx.serialization.encoding.*

/**
 * Base checkout schema. Extensions compose onto this using allOf.
 */
@Serializable
public data class Checkout (
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

    /**
     * RFC 3339 expiry timestamp. Default TTL is 6 hours from creation if not sent.
     */
    @SerialName("expires_at")
    public val expiresAt: String? = null,

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
    public val signals: Signals? = null,

    /**
     * Checkout state indicating the current phase and required action. See Checkout Status
     * lifecycle documentation for state transition details.
     */
    public val status: CheckoutStatus,

    /**
     * Different cart totals.
     */
    public val totals: List<CheckoutTotal>,

    public val ucp: UCPCheckoutResponseSchema
)

/**
 * Representation of the buyer.
 */
@Serializable
public data class Buyer (
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
    public val phoneNumber: String? = null
)

/**
 * Provisional buyer signals for relevance and localization—not authoritative data.
 * Businesses SHOULD use these values when verified inputs (e.g., shipping address) are
 * absent, and MAY ignore or down-rank them if inconsistent with higher-confidence signals
 * (authenticated account, risk detection) or regulatory constraints (export controls).
 * Eligibility and policy enforcement MUST occur at checkout time using binding transaction
 * data. Context SHOULD be non-identifying and can be disclosed progressively—coarse signals
 * early, finer resolution as the session progresses. Higher-resolution data (shipping
 * address, billing address) supersedes context.
 */
@Serializable
public data class Context (
    /**
     * The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
     * For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
     * full country name such as "Singapore" can also be used. Optional hint for market context
     * (currency, availability, pricing)—higher-resolution data (e.g., shipping address)
     * supersedes this value.
     */
    @SerialName("address_country")
    public val addressCountry: String? = null,

    /**
     * The region in which the locality is, and which is in the country. For example, California
     * or another appropriate first-level Administrative division. Optional hint for progressive
     * localization—higher-resolution data (e.g., shipping address) supersedes this value.
     */
    @SerialName("address_region")
    public val addressRegion: String? = null,

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
     * The postal code. For example, 94043. Optional hint for regional
     * refinement—higher-resolution data (e.g., shipping address) supersedes this value.
     */
    @SerialName("postal_code")
    public val postalCode: String? = null
)

/**
 * Line item object. Expected to use the currency of the parent object.
 */
@Serializable
public data class LineItem (
    public val id: String,
    public val item: Item,

    /**
     * Parent line item identifier for any nested structures.
     */
    @SerialName("parent_id")
    public val parentID: String? = null,

    /**
     * Quantity of the item being purchased.
     */
    public val quantity: Long,

    /**
     * Line item totals breakdown.
     */
    public val totals: List<LineItemTotal>
)

/**
 * Product data (id, title, price, image_url).
 */
@Serializable
public data class Item (
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
     * Unit price in ISO 4217 minor units.
     */
    public val price: Long,

    /**
     * Product title.
     */
    public val title: String
)

/**
 * A cost breakdown entry with a category, amount, and optional display text.
 */
@Serializable
public data class LineItemTotal (
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
)

@Serializable
public data class Link (
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
)

/**
 * Container for error, warning, or info messages.
 */
@Serializable
public data class Message (
    /**
     * Warning code. Machine-readable identifier for the warning type (e.g., final_sale, prop65,
     * fulfillment_changed, age_restricted, etc.).
     *
     * Info code for programmatic handling.
     */
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
     * RFC 9535 JSONPath to the component the message refers to (e.g., $.items[1]).
     *
     * JSONPath (RFC 9535) to related field (e.g., $.line_items[0]).
     *
     * RFC 9535 JSONPath to the component the message refers to.
     */
    public val path: String? = null,

    /**
     * Reflects the resource state and recommended action. 'recoverable': platform can resolve
     * by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires
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
)

/**
 * Content format, default = plain.
 */
@Serializable
public enum class ContentType(public val value: String) {
    @SerialName("markdown") Markdown("markdown"),
    @SerialName("plain") Plain("plain");
}

/**
 * Reflects the resource state and recommended action. 'recoverable': platform can resolve
 * by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires
 * information their API doesn't support collecting programmatically (checkout incomplete).
 * 'requires_buyer_review': buyer must authorize before order placement due to policy,
 * regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
 * retry with new resource or inputs. Errors with 'requires_*' severity contribute to
 * 'status: requires_escalation'.
 */
@Serializable
public enum class Severity(public val value: String) {
    @SerialName("recoverable") Recoverable("recoverable"),
    @SerialName("requires_buyer_input") RequiresBuyerInput("requires_buyer_input"),
    @SerialName("requires_buyer_review") RequiresBuyerReview("requires_buyer_review"),
    @SerialName("unrecoverable") Unrecoverable("unrecoverable");
}

@Serializable
public enum class MessageType(public val value: String) {
    @SerialName("error") Error("error"),
    @SerialName("info") Info("info"),
    @SerialName("warning") Warning("warning");
}

/**
 * Details about an order created for this checkout session.
 *
 * Order details available at the time of checkout completion.
 */
@Serializable
public data class OrderConfirmation (
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
)

/**
 * Payment configuration containing handlers.
 */
@Serializable
public data class Payment (
    /**
     * The payment instruments available for this payment. Each instrument is associated with a
     * specific handler via the handler_id field. Handlers can extend the base
     * payment_instrument schema to add handler-specific fields.
     */
    public val instruments: List<SelectedPaymentInstrument>? = null
)

/**
 * A payment instrument with selection state.
 *
 * The base definition for any payment instrument. It links the instrument to a specific
 * payment handler.
 */
@Serializable
public data class SelectedPaymentInstrument (
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
     * A unique identifier for this instrument instance, assigned by the platform.
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
    public val selected: Boolean? = null
)

/**
 * The billing address associated with this payment method.
 *
 * Delivery destination address.
 */
@Serializable
public data class PostalAddress (
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
)

/**
 * The base definition for any payment credential. Handlers define specific credential types.
 */
@Serializable
public data class PaymentCredential (
    /**
     * The credential type discriminator. Specific schemas will constrain this to a constant
     * value.
     */
    public val type: String
)

/**
 * Environment data provided by the platform to support authorization and abuse prevention.
 * Values MUST NOT be buyer-asserted claims — platforms provide signals based on direct
 * observation or independently verifiable third-party attestations. All signal keys MUST
 * use reverse-domain naming to ensure provenance and prevent collisions when multiple
 * extensions contribute to the shared namespace.
 */
@Serializable
public data class Signals (
    /**
     * Client's IP address (IPv4 or IPv6).
     */
    @SerialName("dev.ucp.buyer_ip")
    public val devUcpBuyerIP: String? = null,

    /**
     * Client's HTTP User-Agent header or equivalent.
     */
    @SerialName("dev.ucp.user_agent")
    public val devUcpUserAgent: String? = null
)

/**
 * Checkout state indicating the current phase and required action. See Checkout Status
 * lifecycle documentation for state transition details.
 */
@Serializable
public enum class CheckoutStatus(public val value: String) {
    @SerialName("canceled") Canceled("canceled"),
    @SerialName("complete_in_progress") CompleteInProgress("complete_in_progress"),
    @SerialName("completed") Completed("completed"),
    @SerialName("incomplete") Incomplete("incomplete"),
    @SerialName("ready_for_complete") ReadyForComplete("ready_for_complete"),
    @SerialName("requires_escalation") RequiresEscalation("requires_escalation");
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
public data class CheckoutTotal (
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
)

/**
 * Sub-line entry. Additional metadata MAY be included.
 */
@Serializable
public data class Line (
    public val amount: Long,

    /**
     * Human-readable label for this sub-line.
     */
    @SerialName("display_text")
    public val displayText: String
)

/**
 * UCP metadata for checkout responses.
 *
 * Base UCP metadata with shared properties for all schema types.
 */
@Serializable
public data class UCPCheckoutResponseSchema (
    /**
     * Capability registry keyed by reverse-domain name.
     */
    public val capabilities: Map<String, List<CapabilityResponseSchema>>? = null,

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
)

/**
 * Capability reference in responses. Only name/version required to confirm active
 * capabilities.
 *
 * Shared foundation for all UCP entities.
 */
@Serializable
public data class CapabilityResponseSchema (
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
)

/**
 * Parent capability(s) this extends. Present for extensions, absent for root capabilities.
 * Use array for multi-parent extensions.
 */
@Serializable(with = ExtendsSerializer::class)
public sealed class Extends {
    public class StringArrayValue(public val value: List<String>) : Extends()
    public class StringValue(public val value: String)            : Extends()
}

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

/**
 * Handler reference in responses. May include full config state for runtime usage of the
 * handler.
 *
 * Shared foundation for all UCP entities.
 */
@Serializable
public data class PaymentHandlerResponseSchema (
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
)

/**
 * An instrument type available from a payment handler with optional constraints.
 */
@Serializable
public data class PaymentHandlerResponseSchemaAvailableInstrument (
    /**
     * Constraints on this instrument type. Structure depends on instrument type and active
     * capabilities.
     */
    public val constraints: JsonObject? = null,

    /**
     * The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
     * schema's type constant.
     */
    public val type: String
)

/**
 * Service binding in API responses. Includes per-resource transport configuration via typed
 * config.
 *
 * Shared foundation for all UCP entities.
 */
@Serializable
public data class ServiceResponseSchema (
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
)

/**
 * Entity-specific configuration. Structure defined by each entity's schema.
 *
 * Per-session configuration for embedded transport binding. Allows businesses to vary EP
 * availability and delegations based on cart contents, agent authorization, or policy.
 */
@Serializable
public data class EmbeddedTransportConfig (
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
)

@Serializable
public enum class EmbeddedColorScheme(public val value: String) {
    @SerialName("dark") Dark("dark"),
    @SerialName("light") Light("light");
}

/**
 * Transport protocol for this service binding.
 */
@Serializable
public enum class Transport(public val value: String) {
    @SerialName("a2a") A2A("a2a"),
    @SerialName("embedded") Embedded("embedded"),
    @SerialName("mcp") MCP("mcp"),
    @SerialName("rest") REST("rest");
}

/**
 * Application-level status of the UCP operation.
 */
@Serializable
public enum class UCPCheckoutResponseSchemaStatus(public val value: String) {
    @SerialName("error") Error("error"),
    @SerialName("success") Success("success");
}

/**
 * Order schema with line items, buyer-facing fulfillment expectations, and event logs.
 */
@Serializable
public data class Order (
    /**
     * Post-order events (refunds, returns, credits, disputes, cancellations, etc.) that exist
     * independently of fulfillment.
     */
    public val adjustments: List<Adjustment>? = null,

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
     * Different totals for the order.
     */
    public val totals: List<CheckoutTotal>,

    public val ucp: UCPOrderResponseSchema
)

/**
 * Post-order event that exists independently of fulfillment. Typically represents money
 * movements but can be any post-order change. Polymorphic type that can optionally
 * reference line items.
 */
@Serializable
public data class Adjustment (
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
)

@Serializable
public data class AdjustmentLineItem (
    /**
     * Line item ID reference.
     */
    public val id: String,

    /**
     * Signed quantity affected by this adjustment. Negative values represent reductions (e.g.
     * returns); positive values represent additions (e.g. exchanges).
     */
    public val quantity: Long
)

/**
 * Adjustment status.
 */
@Serializable
public enum class AdjustmentStatus(public val value: String) {
    @SerialName("completed") Completed("completed"),
    @SerialName("failed") Failed("failed"),
    @SerialName("pending") Pending("pending");
}

/**
 * Fulfillment data: buyer expectations and what actually happened.
 */
@Serializable
public data class Fulfillment (
    /**
     * Append-only event log of actual shipments. Each event references line items by ID.
     */
    public val events: List<FulfillmentEvent>? = null,

    /**
     * Buyer-facing groups representing when/how items will be delivered. Can be split, merged,
     * or adjusted post-order.
     */
    public val expectations: List<Expectation>? = null
)

/**
 * Append-only fulfillment event representing an actual shipment. References line items by
 * ID.
 */
@Serializable
public data class FulfillmentEvent (
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
)

@Serializable
public data class EventLineItem (
    /**
     * Line item ID reference.
     */
    public val id: String,

    /**
     * Quantity fulfilled in this event.
     */
    public val quantity: Long
)

/**
 * Buyer-facing fulfillment expectation representing logical groupings of items (e.g.,
 * 'package'). Can be split, merged, or adjusted post-order to set buyer expectations for
 * when/how items arrive.
 */
@Serializable
public data class Expectation (
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
     * Delivery method type (shipping, pickup, digital).
     */
    @SerialName("method_type")
    public val methodType: MethodType
)

@Serializable
public data class ExpectationLineItem (
    /**
     * Line item ID reference.
     */
    public val id: String,

    /**
     * Quantity of this item in this expectation.
     */
    public val quantity: Long
)

/**
 * Delivery method type (shipping, pickup, digital).
 */
@Serializable
public enum class MethodType(public val value: String) {
    @SerialName("digital") Digital("digital"),
    @SerialName("pickup") Pickup("pickup"),
    @SerialName("shipping") Shipping("shipping");
}

@Serializable
public data class OrderLineItem (
    /**
     * Line item identifier.
     */
    public val id: String,

    /**
     * Product data (id, title, price, image_url).
     */
    public val item: Item,

    /**
     * Parent line item identifier for any nested structures.
     */
    @SerialName("parent_id")
    public val parentID: String? = null,

    /**
     * Quantity tracking for the line item.
     */
    public val quantity: Quantity,

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
)

/**
 * Quantity tracking for the line item.
 */
@Serializable
public data class Quantity (
    /**
     * Quantity fulfilled so far.
     */
    public val fulfilled: Long,

    /**
     * Quantity from the original checkout.
     */
    public val original: Long? = null,

    /**
     * Current total active quantity. May differ from original due to post-order modifications
     * (e.g., returns or cancellations).
     */
    public val total: Long
)

/**
 * Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
 * quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
 * quantity.fulfilled > 0, otherwise processing.
 */
@Serializable
public enum class LineItemStatus(public val value: String) {
    @SerialName("fulfilled") Fulfilled("fulfilled"),
    @SerialName("partial") Partial("partial"),
    @SerialName("processing") Processing("processing"),
    @SerialName("removed") Removed("removed");
}

/**
 * UCP metadata for order responses. No payment handlers needed post-purchase.
 *
 * Base UCP metadata with shared properties for all schema types.
 */
@Serializable
public data class UCPOrderResponseSchema (
    /**
     * Capability registry keyed by reverse-domain name.
     */
    public val capabilities: Map<String, List<CapabilityResponseSchema>>? = null,

    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    @SerialName("payment_handlers")
    public val paymentHandlers: Map<String, List<PaymentHandlerResponseSchema>>? = null,

    /**
     * Service registry keyed by reverse-domain name.
     */
    public val services: Map<String, List<UCPOrderResponseSchemaService>>? = null,

    /**
     * Application-level status of the UCP operation.
     */
    public val status: UCPCheckoutResponseSchemaStatus? = null,

    public val version: String
)

/**
 * Shared foundation for all UCP entities.
 */
@Serializable
public data class UCPOrderResponseSchemaService (
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
)

/**
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public data class ErrorResponse (
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
)

/**
 * UCP protocol metadata. Status MUST be 'error' for error response.
 *
 * UCP metadata with status 'error'. Use for response branches that carry error
 * information.
 *
 * Base UCP metadata with shared properties for all schema types.
 */
@Serializable
public data class ErrorResponseUcp (
    /**
     * Capability registry keyed by reverse-domain name.
     */
    public val capabilities: Map<String, List<CapabilityResponseSchema>>? = null,

    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    @SerialName("payment_handlers")
    public val paymentHandlers: Map<String, List<PaymentHandlerResponseSchema>>? = null,

    /**
     * Service registry keyed by reverse-domain name.
     */
    public val services: Map<String, List<UCPOrderResponseSchemaService>>? = null,

    /**
     * Application-level status of the UCP operation.
     */
    public val status: StatusEnum,

    public val version: String
)

/**
 * Application-level status of the UCP operation.
 */
@Serializable
public enum class StatusEnum(public val value: String) {
    @SerialName("error") Error("error");
}

/**
 * Checkout state after instrument selection.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public data class InstrumentsChangeResult (
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
)

/**
 * Partial checkout update with payment instrument selection.
 */
@Serializable
public data class InstrumentsChangeCheckout (
    /**
     * Payment instruments with selected instrument ID.
     */
    public val payment: InstrumentsChangePayment? = null
)

/**
 * Payment instruments with selected instrument ID.
 *
 * Payment configuration containing handlers.
 */
@Serializable
public data class InstrumentsChangePayment (
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
)

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
public data class InstrumentsChangeResultUcp (
    /**
     * Capability registry keyed by reverse-domain name.
     */
    public val capabilities: Map<String, List<CapabilityElement>>? = null,

    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    @SerialName("payment_handlers")
    public val paymentHandlers: Map<String, List<PaymentHandlerElement>>? = null,

    /**
     * Service registry keyed by reverse-domain name.
     */
    public val services: Map<String, List<InstrumentsChangeService>>? = null,

    /**
     * Application-level status of the UCP operation.
     */
    public val status: UCPCheckoutResponseSchemaStatus,

    public val version: String
)

/**
 * Shared foundation for all UCP entities.
 *
 * Capability reference in responses. Only name/version required to confirm active
 * capabilities.
 */
@Serializable
public data class CapabilityElement (
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
)

/**
 * Shared foundation for all UCP entities.
 *
 * Handler reference in responses. May include full config state for runtime usage of the
 * handler.
 */
@Serializable
public data class PaymentHandlerElement (
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
)

/**
 * An instrument type available from a payment handler with optional constraints.
 */
@Serializable
public data class PaymentHandlerAvailableInstrument (
    /**
     * Constraints on this instrument type. Structure depends on instrument type and active
     * capabilities.
     */
    public val constraints: JsonObject? = null,

    /**
     * The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
     * schema's type constant.
     */
    public val type: String
)

/**
 * Shared foundation for all UCP entities.
 */
@Serializable
public data class InstrumentsChangeService (
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
)

/**
 * Checkout state with payment credential ready for completion.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public data class CredentialResult (
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
)

/**
 * Partial checkout update with payment credential.
 */
@Serializable
public data class CredentialCheckout (
    public val payment: Payment? = null
)
