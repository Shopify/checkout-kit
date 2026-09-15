package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.*
import kotlinx.serialization.json.*
import kotlinx.serialization.descriptors.*
import kotlinx.serialization.encoding.*

/**
 * Base checkout schema. Extensions compose onto this using allOf.
 */
@Serializable(with = CheckoutSerializer::class)
public data class Checkout (
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
)

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
    public val phoneNumber: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
 *
 * A coarse geographic location — country, region, and postal code. A lightweight
 * alternative to a full postal address.
 */
@Serializable(with = ContextSerializer::class)
public data class Context (
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
)

@Serializable
public data class PreferredPaymentHandler (
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
)

/**
 * Discount codes input and applied discounts output.
 */
@Serializable
public data class CheckoutDiscounts (
    /**
     * Discounts successfully applied (code-based and automatic).
     */
    public val applied: List<AppliedDiscount>? = null,

    /**
     * Discount codes to apply. Case-insensitive. Replaces previously submitted codes. Send
     * empty array to clear.
     */
    public val codes: List<String>? = null
)

/**
 * A discount that was successfully applied.
 */
@Serializable
public data class AppliedDiscount (
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
)

/**
 * Breakdown of how a discount amount was allocated to a specific target.
 */
@Serializable
public data class DiscountAllocation (
    /**
     * Amount allocated to this target in ISO 4217 minor units.
     */
    public val amount: Long,

    /**
     * RFC 9535 JSONPath to the allocation target (e.g., '$.line_items[0]', '$.totals[?@.type ==
     * "fulfillment"]').
     */
    public val path: String
)

/**
 * Allocation method. 'each' = applied independently per item. 'across' = split
 * proportionally by value.
 */
@Serializable
public enum class DiscountMethod(public val value: String) {
    @SerialName("across") Across("across"),
    @SerialName("each") Each("each");
}

/**
 * Fulfillment details.
 *
 * Container for fulfillment methods and availability.
 */
@Serializable
public data class CheckoutFulfillment (
    /**
     * Inventory availability hints.
     */
    @SerialName("available_methods")
    public val availableMethods: List<FulfillmentAvailableMethod>? = null,

    /**
     * Fulfillment methods for cart items.
     */
    public val methods: List<FulfillmentMethod>? = null
)

/**
 * Inventory availability hint for a fulfillment method type.
 */
@Serializable(with = FulfillmentAvailableMethodSerializer::class)
public data class FulfillmentAvailableMethod (
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
)

/**
 * A fulfillment method with destinations and groups.
 */
@Serializable(with = FulfillmentMethodSerializer::class)
public data class FulfillmentMethod (
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
)

/**
 * A destination for fulfillment.
 */
@Serializable
public data class FulfillmentDestination (
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
)

/**
 * Physical address of the location.
 *
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
 * A merchant-generated package/group of line items with fulfillment options.
 */
@Serializable(with = FulfillmentGroupSerializer::class)
public data class FulfillmentGroup (
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
)

/**
 * A fulfillment option within a group (e.g., Standard Shipping $5, Express $15). Extends
 * the fulfillment option base with cost and timing.
 *
 * Common base for a fulfillment option: an addressable, renderable choice (e.g. Standard,
 * Express). Catalog uses this base directly; checkout composes it with cost and timing.
 */
@Serializable(with = FulfillmentOptionSerializer::class)
public data class FulfillmentOption (
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
)

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
public data class Description (
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
)

/**
 * Purchased item data, including identity, price, and sale basis.
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
)

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
public data class QuantityUnit (
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
)

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
public data class UnitPrice (
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
)

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
public data class Measure (
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
 * the condition in band, for example by modifying inputs or processing a related Action,
 * and submit a new operation when needed. 'requires_buyer_input': merchant requires
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
@Serializable(with = SelectedPaymentInstrumentSerializer::class)
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
)

/**
 * The base definition for any payment credential. Handlers define specific credential types.
 */
@Serializable(with = PaymentCredentialSerializer::class)
public data class PaymentCredential (
    /**
     * The credential type discriminator. Specific schemas will constrain this to a constant
     * value.
     */
    public val type: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

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
public data class Policy (
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
)

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
     * A Constraint Expression describing the instrument this entry makes available. Keys in
     * `properties` name members of the `constraint_target` declared by the instrument schema
     * for this `type`. Requirements on submitted request data belong in
     * `ucp.request_constraints` instead.
     */
    public val constraints: ConstraintsElement? = null,

    /**
     * The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
     * schema's type constant.
     */
    public val type: String
)

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
@Serializable
public data class PropertyValue (
    /**
     * Alternative Object Constraints. The constrained object must satisfy at least one. A
     * branch must be non-empty: an empty branch is satisfied by every object and neutralizes
     * the alternation.
     */
    public val anyOf: List<ConstraintsElement>? = null,

    /**
     * Constraints keyed by property name. Must be non-empty: an empty object applies no
     * constraint.
     */
    public val properties: Map<String, PropertyValue>? = null,

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
)

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
public data class ConstraintsElement (
    /**
     * Alternative Object Constraints. The constrained object must satisfy at least one. A
     * branch must be non-empty: an empty branch is satisfied by every object and neutralizes
     * the alternation.
     */
    public val anyOf: List<ConstraintsElement>? = null,

    /**
     * Constraints keyed by property name. Must be non-empty: an empty object applies no
     * constraint.
     */
    public val properties: Map<String, PropertyValue>? = null,

    /**
     * Property names required by the constrained object. Must be non-empty: an empty array
     * applies no constraint.
     */
    public val required: List<String>? = null
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
     * Integer count of steps of the referenced line item's `quantity_unit` (`10^-scale` ×
     * `unit`); when `quantity_unit` is absent, it counts whole items (`each`).
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
     * Delivery method type. Well-known values: `shipping`, `pickup`, `digital`; additional
     * values MAY be used.
     */
    @SerialName("method_type")
    public val methodType: String
)

@Serializable
public data class ExpectationLineItem (
    /**
     * Line item ID reference.
     */
    public val id: String,

    /**
     * Integer count of steps of the referenced line item's `quantity_unit` (`10^-scale` ×
     * `unit`); when `quantity_unit` is absent, it counts whole items (`each`).
     */
    public val quantity: Long
)

@Serializable
public data class OrderLineItem (
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
)

/**
 * Tracks the line item's original, current active, and fulfilled quantities. All three
 * values use the same inherited `item.quantity_unit`. When `item.quantity_unit` is absent
 * on an authoritative order response, each step is one whole item (`each`) under the shared
 * default.
 */
@Serializable
public data class LineItemQuantity (
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
)

/**
 * Shared foundation for all UCP entities.
 */
@Serializable
public data class Service (
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
)

/**
 * Application-level status of the UCP operation.
 */
@Serializable
public enum class ErrorStatus(public val value: String) {
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
     * A Constraint Expression describing the instrument this entry makes available. Keys in
     * `properties` name members of the `constraint_target` declared by the instrument schema
     * for this `type`. Requirements on submitted request data belong in
     * `ucp.request_constraints` instead.
     */
    public val constraints: ConstraintsElement? = null,

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
public data class EmbeddedService (
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

/**
 * Checkout state after address selection.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public data class AddressChangeResult (
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
)

/**
 * Partial checkout update with fulfillment address selection.
 */
@Serializable
public data class AddressChangeCheckout (
    /**
     * Updated fulfillment with new selected destination and destinations.
     */
    public val fulfillment: CheckoutFulfillmentClass? = null
)

/**
 * Updated fulfillment with new selected destination and destinations.
 *
 * Container for fulfillment methods and availability.
 */
@Serializable
public data class CheckoutFulfillmentClass (
    /**
     * Inventory availability hints.
     */
    @SerialName("available_methods")
    public val availableMethods: List<FulfillmentAvailableMethod>? = null,

    /**
     * Fulfillment methods for cart items.
     */
    public val methods: List<FulfillmentMethod>? = null
)

@Serializable
public data class ReadyRequest (
    public val auth: Auth? = null,

    /**
     * Delegation types the merchant accepts. Must be subset of checkout.embedded.delegations.
     */
    public val delegate: List<String>
)

@Serializable
public data class Auth (
    public val type: String? = null
)

/**
 * Handshake response from host.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public data class ReadyResult (
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
)

/**
 * Initial delegation state from host. Fields are permitted only when the corresponding
 * delegation is accepted.
 */
@Serializable
public data class ReadyCheckout (
    public val fulfillment: CheckoutFulfillmentClass? = null,

    /**
     * Payment instruments with selected instrument ID.
     */
    public val payment: ReadyPayment? = null
)

/**
 * Payment instruments with selected instrument ID.
 *
 * Payment configuration containing handlers.
 */
@Serializable
public data class ReadyPayment (
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
 * Channel upgrade instructions. If present, switch to provided MessagePort.
 */
@Serializable
public data class Upgrade (
    /**
     * MessagePort for upgraded channel. Runtime type is MessagePort.
     */
    public val port: JsonObject? = null
)

@Serializable
public data class AuthRequest (
    public val type: String? = null
)

/**
 * Auth response from host containing the requested authorization data.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public data class AuthResult (
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
)

@Serializable
public data class WindowOpenRequest (
    /**
     * The URL of the resource to present.
     */
    public val url: String
)

/**
 * Acknowledgement that the host handled the request.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable
public data class WindowOpenResult (
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
            description = obj["description"]?.let { json.decodeFromJsonElement(serializer<Description>(), it) },
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
