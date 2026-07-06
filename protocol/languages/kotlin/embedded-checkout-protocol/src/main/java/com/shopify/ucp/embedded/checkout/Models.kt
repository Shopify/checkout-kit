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
    public val signals: JsonObject? = null,

    /**
     * Checkout state indicating the current phase and required action. See Checkout Status
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
 */
@Serializable(with = ContextSerializer::class)
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
    public val postalCode: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Discount codes input and applied discounts output.
 */
@Serializable(with = CheckoutDiscountsSerializer::class)
public data class CheckoutDiscounts (
    /**
     * Discounts successfully applied (code-based and automatic).
     */
    public val applied: List<AppliedDiscount>? = null,

    /**
     * Discount codes to apply. Case-insensitive. Replaces previously submitted codes. Send
     * empty array to clear.
     */
    public val codes: List<String>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * A discount that was successfully applied.
 */
@Serializable(with = AppliedDiscountSerializer::class)
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
    public val title: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Breakdown of how a discount amount was allocated to a specific target.
 */
@Serializable(with = DiscountAllocationSerializer::class)
public data class DiscountAllocation (
    /**
     * Amount allocated to this target in ISO 4217 minor units.
     */
    public val amount: Long,

    /**
     * JSONPath to the allocation target (e.g., '$.line_items[0]', '$.totals.shipping').
     */
    public val path: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
@Serializable(with = CheckoutFulfillmentSerializer::class)
public data class CheckoutFulfillment (
    /**
     * Inventory availability hints.
     */
    @SerialName("available_methods")
    public val availableMethods: List<FulfillmentAvailableMethod>? = null,

    /**
     * Fulfillment methods for cart items.
     */
    public val methods: List<FulfillmentMethod>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
     * Fulfillment method type this availability applies to.
     */
    public val type: FulfillmentMethodType,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Fulfillment method type this availability applies to.
 *
 * Fulfillment method type.
 */
@Serializable
public enum class FulfillmentMethodType(public val value: String) {
    @SerialName("pickup") Pickup("pickup"),
    @SerialName("shipping") Shipping("shipping");
}

/**
 * A fulfillment method (shipping or pickup) with destinations and groups.
 */
@Serializable(with = FulfillmentMethodSerializer::class)
public data class FulfillmentMethod (
    /**
     * Available destinations. For shipping: addresses. For pickup: retail locations.
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
     * ID of the selected destination.
     */
    @SerialName("selected_destination_id")
    public val selectedDestinationID: String? = null,

    /**
     * Fulfillment method type.
     */
    public val type: FulfillmentMethodType,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * A destination for fulfillment.
 *
 * Shipping destination.
 *
 * Physical address of the location.
 *
 * The billing address associated with this payment method.
 *
 * Delivery destination address.
 *
 * A pickup location (retail store, locker, etc.).
 */
@Serializable(with = FulfillmentDestinationSerializer::class)
public data class FulfillmentDestination (
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
    public val streetAddress: String? = null,

    /**
     * ID specific to this shipping destination.
     *
     * Unique location identifier.
     */
    public val id: String,

    /**
     * Physical address of the location.
     */
    public val address: PostalAddress? = null,

    /**
     * Location name (e.g., store name).
     */
    public val name: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Physical address of the location.
 *
 * The billing address associated with this payment method.
 *
 * Delivery destination address.
 */
@Serializable(with = PostalAddressSerializer::class)
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
    public val streetAddress: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
 * A fulfillment option within a group (e.g., Standard Shipping $5, Express $15).
 */
@Serializable(with = FulfillmentOptionSerializer::class)
public data class FulfillmentOption (
    /**
     * Carrier name (for shipping).
     */
    public val carrier: String? = null,

    /**
     * Complete context for buyer decision (e.g., 'Arrives Dec 12-15 via FedEx').
     */
    public val description: String? = null,

    /**
     * Earliest fulfillment date.
     */
    @SerialName("earliest_fulfillment_time")
    public val earliestFulfillmentTime: String? = null,

    /**
     * Unique fulfillment option identifier.
     */
    public val id: String,

    /**
     * Latest fulfillment date.
     */
    @SerialName("latest_fulfillment_time")
    public val latestFulfillmentTime: String? = null,

    /**
     * Short label (e.g., 'Express Shipping', 'Curbside Pickup').
     */
    public val title: String,

    /**
     * Fulfillment option totals breakdown.
     */
    public val totals: List<LineItemTotal>,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * A cost breakdown entry with a category, amount, and optional display text.
 */
@Serializable(with = LineItemTotalSerializer::class)
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
    public val type: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Line item object. Expected to use the currency of the parent object.
 */
@Serializable(with = LineItemSerializer::class)
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
    public val totals: List<LineItemTotal>,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Product data (id, title, price, image_url).
 */
@Serializable(with = ItemSerializer::class)
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
    public val title: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

@Serializable(with = LinkSerializer::class)
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
    public val url: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Container for error, warning, or info messages.
 */
@Serializable(with = MessageSerializer::class)
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
    public val url: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
@Serializable(with = OrderConfirmationSerializer::class)
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
    public val permalinkURL: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Payment configuration containing handlers.
 */
@Serializable(with = PaymentSerializer::class)
public data class Payment (
    /**
     * The payment instruments available for this payment. Each instrument is associated with a
     * specific handler via the handler_id field. Handlers can extend the base
     * payment_instrument schema to add handler-specific fields.
     */
    public val instruments: List<SelectedPaymentInstrument>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
@Serializable(with = CheckoutTotalSerializer::class)
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
    public val lines: List<Line>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Sub-line entry. Additional metadata MAY be included.
 */
@Serializable(with = LineSerializer::class)
public data class Line (
    public val amount: Long,

    /**
     * Human-readable label for this sub-line.
     */
    @SerialName("display_text")
    public val displayText: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * UCP metadata for checkout responses.
 *
 * Base UCP metadata with shared properties for all schema types.
 */
@Serializable(with = UCPCheckoutResponseSchemaSerializer::class)
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

    public val version: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Capability reference in responses. Only name/version required to confirm active
 * capabilities.
 *
 * Shared foundation for all UCP entities.
 */
@Serializable(with = CapabilityResponseSchemaSerializer::class)
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
    public val extends: Extends? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
@Serializable(with = PaymentHandlerResponseSchemaSerializer::class)
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
    public val availableInstruments: List<PaymentHandlerResponseSchemaAvailableInstrument>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * An instrument type available from a payment handler with optional constraints.
 */
@Serializable(with = PaymentHandlerResponseSchemaAvailableInstrumentSerializer::class)
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
    public val type: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Service binding in API responses. Includes per-resource transport configuration via typed
 * config.
 *
 * Shared foundation for all UCP entities.
 */
@Serializable(with = ServiceResponseSchemaSerializer::class)
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
    public val transport: Transport,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Entity-specific configuration. Structure defined by each entity's schema.
 *
 * Per-session configuration for embedded transport binding. Allows businesses to vary EP
 * availability and delegations based on cart contents, agent authorization, or policy.
 */
@Serializable(with = EmbeddedTransportConfigSerializer::class)
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
    public val delegate: List<String>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
@Serializable(with = OrderSerializer::class)
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
     * Different totals for the order.
     */
    public val totals: List<CheckoutTotal>,

    public val ucp: UCPOrderResponseSchema,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Post-order event that exists independently of fulfillment. Typically represents money
 * movements but can be any post-order change. Polymorphic type that can optionally
 * reference line items.
 */
@Serializable(with = AdjustmentSerializer::class)
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
    public val type: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

@Serializable(with = AdjustmentLineItemSerializer::class)
public data class AdjustmentLineItem (
    /**
     * Line item ID reference.
     */
    public val id: String,

    /**
     * Signed quantity affected by this adjustment. Negative values represent reductions (e.g.
     * returns); positive values represent additions (e.g. exchanges).
     */
    public val quantity: Long,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
@Serializable(with = FulfillmentSerializer::class)
public data class Fulfillment (
    /**
     * Append-only event log of actual shipments. Each event references line items by ID.
     */
    public val events: List<FulfillmentEvent>? = null,

    /**
     * Buyer-facing groups representing when/how items will be delivered. Can be split, merged,
     * or adjusted post-order.
     */
    public val expectations: List<Expectation>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Append-only fulfillment event representing an actual shipment. References line items by
 * ID.
 */
@Serializable(with = FulfillmentEventSerializer::class)
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
    public val type: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

@Serializable(with = EventLineItemSerializer::class)
public data class EventLineItem (
    /**
     * Line item ID reference.
     */
    public val id: String,

    /**
     * Quantity fulfilled in this event.
     */
    public val quantity: Long,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Buyer-facing fulfillment expectation representing logical groupings of items (e.g.,
 * 'package'). Can be split, merged, or adjusted post-order to set buyer expectations for
 * when/how items arrive.
 */
@Serializable(with = ExpectationSerializer::class)
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
    public val methodType: MethodType,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

@Serializable(with = ExpectationLineItemSerializer::class)
public data class ExpectationLineItem (
    /**
     * Line item ID reference.
     */
    public val id: String,

    /**
     * Quantity of this item in this expectation.
     */
    public val quantity: Long,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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

@Serializable(with = OrderLineItemSerializer::class)
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
    public val totals: List<LineItemTotal>,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Quantity tracking for the line item.
 */
@Serializable(with = LineItemQuantitySerializer::class)
public data class LineItemQuantity (
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
    public val total: Long,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
@Serializable(with = UCPOrderResponseSchemaSerializer::class)
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
    public val services: Map<String, List<Service>>? = null,

    /**
     * Application-level status of the UCP operation.
     */
    public val status: UCPCheckoutResponseSchemaStatus? = null,

    public val version: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Shared foundation for all UCP entities.
 */
@Serializable(with = ServiceSerializer::class)
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
    public val transport: Transport,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
@Serializable(with = ErrorResponseUcpSerializer::class)
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
    public val services: Map<String, List<Service>>? = null,

    /**
     * Application-level status of the UCP operation.
     */
    public val status: ErrorStatus,

    public val version: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
@Serializable(with = InstrumentsChangeResultSerializer::class)
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
    public val messages: List<Message>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Partial checkout update with payment instrument selection.
 */
@Serializable(with = InstrumentsChangeCheckoutSerializer::class)
public data class InstrumentsChangeCheckout (
    /**
     * Payment instruments with selected instrument ID.
     */
    public val payment: InstrumentsChangePayment? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Payment instruments with selected instrument ID.
 *
 * Payment configuration containing handlers.
 */
@Serializable(with = InstrumentsChangePaymentSerializer::class)
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
    public val selectedInstrumentID: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
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
@Serializable(with = InstrumentsChangeResultUcpSerializer::class)
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
    public val services: Map<String, List<EmbeddedService>>? = null,

    /**
     * Application-level status of the UCP operation.
     */
    public val status: UCPCheckoutResponseSchemaStatus,

    public val version: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Shared foundation for all UCP entities.
 *
 * Capability reference in responses. Only name/version required to confirm active
 * capabilities.
 */
@Serializable(with = CapabilityElementSerializer::class)
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
    public val extends: Extends? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Shared foundation for all UCP entities.
 *
 * Handler reference in responses. May include full config state for runtime usage of the
 * handler.
 */
@Serializable(with = PaymentHandlerElementSerializer::class)
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
    public val availableInstruments: List<PaymentHandlerAvailableInstrument>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * An instrument type available from a payment handler with optional constraints.
 */
@Serializable(with = PaymentHandlerAvailableInstrumentSerializer::class)
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
    public val type: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Shared foundation for all UCP entities.
 */
@Serializable(with = EmbeddedServiceSerializer::class)
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
    public val transport: Transport,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Checkout state with payment credential ready for completion.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable(with = CredentialResultSerializer::class)
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
    public val messages: List<Message>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Partial checkout update with payment credential.
 */
@Serializable(with = CredentialCheckoutSerializer::class)
public data class CredentialCheckout (
    public val payment: Payment? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Checkout state after address selection.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable(with = AddressChangeResultSerializer::class)
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
    public val messages: List<Message>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Partial checkout update with fulfillment address selection.
 */
@Serializable(with = AddressChangeCheckoutSerializer::class)
public data class AddressChangeCheckout (
    /**
     * Updated fulfillment with new selected destination and destinations.
     */
    public val fulfillment: CheckoutFulfillmentClass? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Updated fulfillment with new selected destination and destinations.
 *
 * Container for fulfillment methods and availability.
 */
@Serializable(with = CheckoutFulfillmentClassSerializer::class)
public data class CheckoutFulfillmentClass (
    /**
     * Inventory availability hints.
     */
    @SerialName("available_methods")
    public val availableMethods: List<FulfillmentAvailableMethod>? = null,

    /**
     * Fulfillment methods for cart items.
     */
    public val methods: List<FulfillmentMethod>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

@Serializable(with = ReadyRequestSerializer::class)
public data class ReadyRequest (
    public val auth: Auth? = null,

    /**
     * Delegation types the merchant accepts. Must be subset of checkout.embedded.delegations.
     */
    public val delegate: List<String>,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

@Serializable(with = AuthSerializer::class)
public data class Auth (
    public val type: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Handshake response from host.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable(with = ReadyResultSerializer::class)
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
    public val messages: List<Message>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Initial delegation state from host. Fields are permitted only when the corresponding
 * delegation is accepted.
 */
@Serializable(with = ReadyCheckoutSerializer::class)
public data class ReadyCheckout (
    public val fulfillment: CheckoutFulfillmentClass? = null,

    /**
     * Payment instruments with selected instrument ID.
     */
    public val payment: ReadyPayment? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Payment instruments with selected instrument ID.
 *
 * Payment configuration containing handlers.
 */
@Serializable(with = ReadyPaymentSerializer::class)
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
    public val selectedInstrumentID: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Channel upgrade instructions. If present, switch to provided MessagePort.
 */
@Serializable(with = UpgradeSerializer::class)
public data class Upgrade (
    /**
     * MessagePort for upgraded channel. Runtime type is MessagePort.
     */
    public val port: JsonObject? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

@Serializable(with = AuthRequestSerializer::class)
public data class AuthRequest (
    public val type: String? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Auth response from host containing the requested authorization data.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable(with = AuthResultSerializer::class)
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
    public val messages: List<Message>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

@Serializable(with = WindowOpenRequestSerializer::class)
public data class WindowOpenRequest (
    /**
     * The URL of the resource to present.
     */
    public val url: String,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

/**
 * Acknowledgement that the host handled the request.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
@Serializable(with = WindowOpenResultSerializer::class)
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
    public val messages: List<Message>? = null,

    public val additionalProperties: Map<String, JsonElement> = emptyMap()
)

public object CheckoutSerializer : KSerializer<Checkout> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Checkout")
    override fun deserialize(decoder: Decoder): Checkout {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Checkout can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("attribution", "buyer", "context", "continue_url", "currency", "discounts", "expires_at", "fulfillment", "id", "line_items", "links", "messages", "order", "payment", "signals", "status", "totals", "ucp")
        return Checkout(
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
        val map = linkedMapOf<String, JsonElement>()
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
        value.signals?.let { map["signals"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        map["status"] = json.encodeToJsonElement(serializer<CheckoutStatus>(), value.status)
        map["totals"] = json.encodeToJsonElement(serializer<List<CheckoutTotal>>(), value.totals)
        map["ucp"] = json.encodeToJsonElement(serializer<UCPCheckoutResponseSchema>(), value.ucp)
        map.putAll(value.additionalProperties)
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
        val map = linkedMapOf<String, JsonElement>()
        value.email?.let { map["email"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.firstName?.let { map["first_name"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.lastName?.let { map["last_name"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.phoneNumber?.let { map["phone_number"] = json.encodeToJsonElement(serializer<String>(), it) }
        map.putAll(value.additionalProperties)
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
        val known = setOf("address_country", "address_region", "currency", "eligibility", "intent", "language", "postal_code")
        return Context(
            addressCountry = obj["address_country"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            addressRegion = obj["address_region"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            currency = obj["currency"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            eligibility = obj["eligibility"]?.let { json.decodeFromJsonElement(serializer<List<String>>(), it) },
            intent = obj["intent"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            language = obj["language"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            postalCode = obj["postal_code"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Context) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Context can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.addressCountry?.let { map["address_country"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.addressRegion?.let { map["address_region"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.currency?.let { map["currency"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.eligibility?.let { map["eligibility"] = json.encodeToJsonElement(serializer<List<String>>(), it) }
        value.intent?.let { map["intent"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.language?.let { map["language"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.postalCode?.let { map["postal_code"] = json.encodeToJsonElement(serializer<String>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object CheckoutDiscountsSerializer : KSerializer<CheckoutDiscounts> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.CheckoutDiscounts")
    override fun deserialize(decoder: Decoder): CheckoutDiscounts {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("CheckoutDiscounts can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("applied", "codes")
        return CheckoutDiscounts(
            applied = obj["applied"]?.let { json.decodeFromJsonElement(serializer<List<AppliedDiscount>>(), it) },
            codes = obj["codes"]?.let { json.decodeFromJsonElement(serializer<List<String>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: CheckoutDiscounts) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("CheckoutDiscounts can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.applied?.let { map["applied"] = json.encodeToJsonElement(serializer<List<AppliedDiscount>>(), it) }
        value.codes?.let { map["codes"] = json.encodeToJsonElement(serializer<List<String>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object AppliedDiscountSerializer : KSerializer<AppliedDiscount> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.AppliedDiscount")
    override fun deserialize(decoder: Decoder): AppliedDiscount {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("AppliedDiscount can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("allocations", "amount", "automatic", "code", "eligibility", "method", "priority", "provisional", "title")
        return AppliedDiscount(
            allocations = obj["allocations"]?.let { json.decodeFromJsonElement(serializer<List<DiscountAllocation>>(), it) },
            amount = json.decodeFromJsonElement(serializer<Long>(), obj["amount"] ?: throw SerializationException("Missing amount for AppliedDiscount")),
            automatic = obj["automatic"]?.let { json.decodeFromJsonElement(serializer<Boolean>(), it) },
            code = obj["code"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            eligibility = obj["eligibility"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            method = obj["method"]?.let { json.decodeFromJsonElement(serializer<DiscountMethod>(), it) },
            priority = obj["priority"]?.let { json.decodeFromJsonElement(serializer<Long>(), it) },
            provisional = obj["provisional"]?.let { json.decodeFromJsonElement(serializer<Boolean>(), it) },
            title = json.decodeFromJsonElement(serializer<String>(), obj["title"] ?: throw SerializationException("Missing title for AppliedDiscount")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: AppliedDiscount) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("AppliedDiscount can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.allocations?.let { map["allocations"] = json.encodeToJsonElement(serializer<List<DiscountAllocation>>(), it) }
        map["amount"] = json.encodeToJsonElement(serializer<Long>(), value.amount)
        value.automatic?.let { map["automatic"] = json.encodeToJsonElement(serializer<Boolean>(), it) }
        value.code?.let { map["code"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.eligibility?.let { map["eligibility"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.method?.let { map["method"] = json.encodeToJsonElement(serializer<DiscountMethod>(), it) }
        value.priority?.let { map["priority"] = json.encodeToJsonElement(serializer<Long>(), it) }
        value.provisional?.let { map["provisional"] = json.encodeToJsonElement(serializer<Boolean>(), it) }
        map["title"] = json.encodeToJsonElement(serializer<String>(), value.title)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object DiscountAllocationSerializer : KSerializer<DiscountAllocation> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.DiscountAllocation")
    override fun deserialize(decoder: Decoder): DiscountAllocation {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("DiscountAllocation can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("amount", "path")
        return DiscountAllocation(
            amount = json.decodeFromJsonElement(serializer<Long>(), obj["amount"] ?: throw SerializationException("Missing amount for DiscountAllocation")),
            path = json.decodeFromJsonElement(serializer<String>(), obj["path"] ?: throw SerializationException("Missing path for DiscountAllocation")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: DiscountAllocation) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("DiscountAllocation can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["amount"] = json.encodeToJsonElement(serializer<Long>(), value.amount)
        map["path"] = json.encodeToJsonElement(serializer<String>(), value.path)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object CheckoutFulfillmentSerializer : KSerializer<CheckoutFulfillment> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.CheckoutFulfillment")
    override fun deserialize(decoder: Decoder): CheckoutFulfillment {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("CheckoutFulfillment can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("available_methods", "methods")
        return CheckoutFulfillment(
            availableMethods = obj["available_methods"]?.let { json.decodeFromJsonElement(serializer<List<FulfillmentAvailableMethod>>(), it) },
            methods = obj["methods"]?.let { json.decodeFromJsonElement(serializer<List<FulfillmentMethod>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: CheckoutFulfillment) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("CheckoutFulfillment can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.availableMethods?.let { map["available_methods"] = json.encodeToJsonElement(serializer<List<FulfillmentAvailableMethod>>(), it) }
        value.methods?.let { map["methods"] = json.encodeToJsonElement(serializer<List<FulfillmentMethod>>(), it) }
        map.putAll(value.additionalProperties)
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
            type = json.decodeFromJsonElement(serializer<FulfillmentMethodType>(), obj["type"] ?: throw SerializationException("Missing type for FulfillmentAvailableMethod")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: FulfillmentAvailableMethod) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("FulfillmentAvailableMethod can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.description?.let { map["description"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.fulfillableOn?.let { map["fulfillable_on"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["line_item_ids"] = json.encodeToJsonElement(serializer<List<String>>(), value.lineItemIDS)
        map["type"] = json.encodeToJsonElement(serializer<FulfillmentMethodType>(), value.type)
        map.putAll(value.additionalProperties)
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
            type = json.decodeFromJsonElement(serializer<FulfillmentMethodType>(), obj["type"] ?: throw SerializationException("Missing type for FulfillmentMethod")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: FulfillmentMethod) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("FulfillmentMethod can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.destinations?.let { map["destinations"] = json.encodeToJsonElement(serializer<List<FulfillmentDestination>>(), it) }
        value.groups?.let { map["groups"] = json.encodeToJsonElement(serializer<List<FulfillmentGroup>>(), it) }
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["line_item_ids"] = json.encodeToJsonElement(serializer<List<String>>(), value.lineItemIDS)
        value.selectedDestinationID?.let { map["selected_destination_id"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["type"] = json.encodeToJsonElement(serializer<FulfillmentMethodType>(), value.type)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object FulfillmentDestinationSerializer : KSerializer<FulfillmentDestination> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.FulfillmentDestination")
    override fun deserialize(decoder: Decoder): FulfillmentDestination {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("FulfillmentDestination can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("address_country", "address_locality", "address_region", "extended_address", "first_name", "last_name", "phone_number", "postal_code", "street_address", "id", "address", "name")
        return FulfillmentDestination(
            addressCountry = obj["address_country"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            addressLocality = obj["address_locality"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            addressRegion = obj["address_region"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            extendedAddress = obj["extended_address"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            firstName = obj["first_name"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            lastName = obj["last_name"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            phoneNumber = obj["phone_number"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            postalCode = obj["postal_code"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            streetAddress = obj["street_address"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for FulfillmentDestination")),
            address = obj["address"]?.let { json.decodeFromJsonElement(serializer<PostalAddress>(), it) },
            name = obj["name"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: FulfillmentDestination) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("FulfillmentDestination can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.addressCountry?.let { map["address_country"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.addressLocality?.let { map["address_locality"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.addressRegion?.let { map["address_region"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.extendedAddress?.let { map["extended_address"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.firstName?.let { map["first_name"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.lastName?.let { map["last_name"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.phoneNumber?.let { map["phone_number"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.postalCode?.let { map["postal_code"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.streetAddress?.let { map["street_address"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        value.address?.let { map["address"] = json.encodeToJsonElement(serializer<PostalAddress>(), it) }
        value.name?.let { map["name"] = json.encodeToJsonElement(serializer<String>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object PostalAddressSerializer : KSerializer<PostalAddress> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.PostalAddress")
    override fun deserialize(decoder: Decoder): PostalAddress {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("PostalAddress can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("address_country", "address_locality", "address_region", "extended_address", "first_name", "last_name", "phone_number", "postal_code", "street_address")
        return PostalAddress(
            addressCountry = obj["address_country"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            addressLocality = obj["address_locality"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            addressRegion = obj["address_region"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            extendedAddress = obj["extended_address"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            firstName = obj["first_name"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            lastName = obj["last_name"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            phoneNumber = obj["phone_number"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            postalCode = obj["postal_code"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            streetAddress = obj["street_address"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: PostalAddress) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("PostalAddress can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.addressCountry?.let { map["address_country"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.addressLocality?.let { map["address_locality"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.addressRegion?.let { map["address_region"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.extendedAddress?.let { map["extended_address"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.firstName?.let { map["first_name"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.lastName?.let { map["last_name"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.phoneNumber?.let { map["phone_number"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.postalCode?.let { map["postal_code"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.streetAddress?.let { map["street_address"] = json.encodeToJsonElement(serializer<String>(), it) }
        map.putAll(value.additionalProperties)
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
        val map = linkedMapOf<String, JsonElement>()
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["line_item_ids"] = json.encodeToJsonElement(serializer<List<String>>(), value.lineItemIDS)
        value.options?.let { map["options"] = json.encodeToJsonElement(serializer<List<FulfillmentOption>>(), it) }
        value.selectedOptionID?.let { map["selected_option_id"] = json.encodeToJsonElement(serializer<String>(), it) }
        map.putAll(value.additionalProperties)
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
        val known = setOf("carrier", "description", "earliest_fulfillment_time", "id", "latest_fulfillment_time", "title", "totals")
        return FulfillmentOption(
            carrier = obj["carrier"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            description = obj["description"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            earliestFulfillmentTime = obj["earliest_fulfillment_time"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for FulfillmentOption")),
            latestFulfillmentTime = obj["latest_fulfillment_time"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            title = json.decodeFromJsonElement(serializer<String>(), obj["title"] ?: throw SerializationException("Missing title for FulfillmentOption")),
            totals = json.decodeFromJsonElement(serializer<List<LineItemTotal>>(), obj["totals"] ?: throw SerializationException("Missing totals for FulfillmentOption")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: FulfillmentOption) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("FulfillmentOption can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.carrier?.let { map["carrier"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.description?.let { map["description"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.earliestFulfillmentTime?.let { map["earliest_fulfillment_time"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        value.latestFulfillmentTime?.let { map["latest_fulfillment_time"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["title"] = json.encodeToJsonElement(serializer<String>(), value.title)
        map["totals"] = json.encodeToJsonElement(serializer<List<LineItemTotal>>(), value.totals)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object LineItemTotalSerializer : KSerializer<LineItemTotal> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.LineItemTotal")
    override fun deserialize(decoder: Decoder): LineItemTotal {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("LineItemTotal can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("amount", "display_text", "type")
        return LineItemTotal(
            amount = json.decodeFromJsonElement(serializer<Long>(), obj["amount"] ?: throw SerializationException("Missing amount for LineItemTotal")),
            displayText = obj["display_text"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for LineItemTotal")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: LineItemTotal) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("LineItemTotal can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["amount"] = json.encodeToJsonElement(serializer<Long>(), value.amount)
        value.displayText?.let { map["display_text"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object LineItemSerializer : KSerializer<LineItem> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.LineItem")
    override fun deserialize(decoder: Decoder): LineItem {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("LineItem can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("id", "item", "parent_id", "quantity", "totals")
        return LineItem(
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for LineItem")),
            item = json.decodeFromJsonElement(serializer<Item>(), obj["item"] ?: throw SerializationException("Missing item for LineItem")),
            parentID = obj["parent_id"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            quantity = json.decodeFromJsonElement(serializer<Long>(), obj["quantity"] ?: throw SerializationException("Missing quantity for LineItem")),
            totals = json.decodeFromJsonElement(serializer<List<LineItemTotal>>(), obj["totals"] ?: throw SerializationException("Missing totals for LineItem")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: LineItem) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("LineItem can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["item"] = json.encodeToJsonElement(serializer<Item>(), value.item)
        value.parentID?.let { map["parent_id"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["quantity"] = json.encodeToJsonElement(serializer<Long>(), value.quantity)
        map["totals"] = json.encodeToJsonElement(serializer<List<LineItemTotal>>(), value.totals)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object ItemSerializer : KSerializer<Item> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Item")
    override fun deserialize(decoder: Decoder): Item {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Item can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("id", "image_url", "price", "title")
        return Item(
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for Item")),
            imageURL = obj["image_url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            price = json.decodeFromJsonElement(serializer<Long>(), obj["price"] ?: throw SerializationException("Missing price for Item")),
            title = json.decodeFromJsonElement(serializer<String>(), obj["title"] ?: throw SerializationException("Missing title for Item")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Item) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Item can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        value.imageURL?.let { map["image_url"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["price"] = json.encodeToJsonElement(serializer<Long>(), value.price)
        map["title"] = json.encodeToJsonElement(serializer<String>(), value.title)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object LinkSerializer : KSerializer<Link> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Link")
    override fun deserialize(decoder: Decoder): Link {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Link can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("title", "type", "url")
        return Link(
            title = obj["title"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for Link")),
            url = json.decodeFromJsonElement(serializer<String>(), obj["url"] ?: throw SerializationException("Missing url for Link")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Link) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Link can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.title?.let { map["title"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        map["url"] = json.encodeToJsonElement(serializer<String>(), value.url)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object MessageSerializer : KSerializer<Message> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Message")
    override fun deserialize(decoder: Decoder): Message {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Message can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("code", "content", "content_type", "path", "severity", "type", "image_url", "presentation", "url")
        return Message(
            code = obj["code"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            content = json.decodeFromJsonElement(serializer<String>(), obj["content"] ?: throw SerializationException("Missing content for Message")),
            contentType = obj["content_type"]?.let { json.decodeFromJsonElement(serializer<ContentType>(), it) },
            path = obj["path"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            severity = obj["severity"]?.let { json.decodeFromJsonElement(serializer<Severity>(), it) },
            type = json.decodeFromJsonElement(serializer<MessageType>(), obj["type"] ?: throw SerializationException("Missing type for Message")),
            imageURL = obj["image_url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            presentation = obj["presentation"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            url = obj["url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Message) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Message can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.code?.let { map["code"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["content"] = json.encodeToJsonElement(serializer<String>(), value.content)
        value.contentType?.let { map["content_type"] = json.encodeToJsonElement(serializer<ContentType>(), it) }
        value.path?.let { map["path"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.severity?.let { map["severity"] = json.encodeToJsonElement(serializer<Severity>(), it) }
        map["type"] = json.encodeToJsonElement(serializer<MessageType>(), value.type)
        value.imageURL?.let { map["image_url"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.presentation?.let { map["presentation"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.url?.let { map["url"] = json.encodeToJsonElement(serializer<String>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object OrderConfirmationSerializer : KSerializer<OrderConfirmation> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.OrderConfirmation")
    override fun deserialize(decoder: Decoder): OrderConfirmation {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("OrderConfirmation can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("id", "label", "permalink_url")
        return OrderConfirmation(
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for OrderConfirmation")),
            label = obj["label"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            permalinkURL = json.decodeFromJsonElement(serializer<String>(), obj["permalink_url"] ?: throw SerializationException("Missing permalink_url for OrderConfirmation")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: OrderConfirmation) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("OrderConfirmation can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        value.label?.let { map["label"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["permalink_url"] = json.encodeToJsonElement(serializer<String>(), value.permalinkURL)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object PaymentSerializer : KSerializer<Payment> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Payment")
    override fun deserialize(decoder: Decoder): Payment {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Payment can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("instruments")
        return Payment(
            instruments = obj["instruments"]?.let { json.decodeFromJsonElement(serializer<List<SelectedPaymentInstrument>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Payment) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Payment can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.instruments?.let { map["instruments"] = json.encodeToJsonElement(serializer<List<SelectedPaymentInstrument>>(), it) }
        map.putAll(value.additionalProperties)
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
        val map = linkedMapOf<String, JsonElement>()
        value.billingAddress?.let { map["billing_address"] = json.encodeToJsonElement(serializer<PostalAddress>(), it) }
        value.credential?.let { map["credential"] = json.encodeToJsonElement(serializer<PaymentCredential>(), it) }
        value.display?.let { map["display"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        map["handler_id"] = json.encodeToJsonElement(serializer<String>(), value.handlerID)
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        value.selected?.let { map["selected"] = json.encodeToJsonElement(serializer<Boolean>(), it) }
        map.putAll(value.additionalProperties)
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
        val map = linkedMapOf<String, JsonElement>()
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object CheckoutTotalSerializer : KSerializer<CheckoutTotal> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.CheckoutTotal")
    override fun deserialize(decoder: Decoder): CheckoutTotal {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("CheckoutTotal can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("amount", "display_text", "type", "lines")
        return CheckoutTotal(
            amount = json.decodeFromJsonElement(serializer<Long>(), obj["amount"] ?: throw SerializationException("Missing amount for CheckoutTotal")),
            displayText = obj["display_text"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for CheckoutTotal")),
            lines = obj["lines"]?.let { json.decodeFromJsonElement(serializer<List<Line>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: CheckoutTotal) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("CheckoutTotal can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["amount"] = json.encodeToJsonElement(serializer<Long>(), value.amount)
        value.displayText?.let { map["display_text"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        value.lines?.let { map["lines"] = json.encodeToJsonElement(serializer<List<Line>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object LineSerializer : KSerializer<Line> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Line")
    override fun deserialize(decoder: Decoder): Line {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Line can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("amount", "display_text")
        return Line(
            amount = json.decodeFromJsonElement(serializer<Long>(), obj["amount"] ?: throw SerializationException("Missing amount for Line")),
            displayText = json.decodeFromJsonElement(serializer<String>(), obj["display_text"] ?: throw SerializationException("Missing display_text for Line")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Line) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Line can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["amount"] = json.encodeToJsonElement(serializer<Long>(), value.amount)
        map["display_text"] = json.encodeToJsonElement(serializer<String>(), value.displayText)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object UCPCheckoutResponseSchemaSerializer : KSerializer<UCPCheckoutResponseSchema> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.UCPCheckoutResponseSchema")
    override fun deserialize(decoder: Decoder): UCPCheckoutResponseSchema {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("UCPCheckoutResponseSchema can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("capabilities", "payment_handlers", "services", "status", "version")
        return UCPCheckoutResponseSchema(
            capabilities = obj["capabilities"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<CapabilityResponseSchema>>>(), it) },
            paymentHandlers = json.decodeFromJsonElement(serializer<Map<String, List<PaymentHandlerResponseSchema>>>(), obj["payment_handlers"] ?: throw SerializationException("Missing payment_handlers for UCPCheckoutResponseSchema")),
            services = obj["services"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<ServiceResponseSchema>>>(), it) },
            status = obj["status"]?.let { json.decodeFromJsonElement(serializer<UCPCheckoutResponseSchemaStatus>(), it) },
            version = json.decodeFromJsonElement(serializer<String>(), obj["version"] ?: throw SerializationException("Missing version for UCPCheckoutResponseSchema")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: UCPCheckoutResponseSchema) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("UCPCheckoutResponseSchema can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.capabilities?.let { map["capabilities"] = json.encodeToJsonElement(serializer<Map<String, List<CapabilityResponseSchema>>>(), it) }
        map["payment_handlers"] = json.encodeToJsonElement(serializer<Map<String, List<PaymentHandlerResponseSchema>>>(), value.paymentHandlers)
        value.services?.let { map["services"] = json.encodeToJsonElement(serializer<Map<String, List<ServiceResponseSchema>>>(), it) }
        value.status?.let { map["status"] = json.encodeToJsonElement(serializer<UCPCheckoutResponseSchemaStatus>(), it) }
        map["version"] = json.encodeToJsonElement(serializer<String>(), value.version)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object CapabilityResponseSchemaSerializer : KSerializer<CapabilityResponseSchema> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.CapabilityResponseSchema")
    override fun deserialize(decoder: Decoder): CapabilityResponseSchema {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("CapabilityResponseSchema can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("config", "id", "schema", "spec", "version", "extends")
        return CapabilityResponseSchema(
            config = obj["config"]?.let { json.decodeFromJsonElement(serializer<JsonObject>(), it) },
            id = obj["id"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            schema = obj["schema"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            spec = obj["spec"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            version = json.decodeFromJsonElement(serializer<String>(), obj["version"] ?: throw SerializationException("Missing version for CapabilityResponseSchema")),
            extends = obj["extends"]?.let { json.decodeFromJsonElement(serializer<Extends>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: CapabilityResponseSchema) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("CapabilityResponseSchema can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.config?.let { map["config"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        value.id?.let { map["id"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.schema?.let { map["schema"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.spec?.let { map["spec"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["version"] = json.encodeToJsonElement(serializer<String>(), value.version)
        value.extends?.let { map["extends"] = json.encodeToJsonElement(serializer<Extends>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object PaymentHandlerResponseSchemaSerializer : KSerializer<PaymentHandlerResponseSchema> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.PaymentHandlerResponseSchema")
    override fun deserialize(decoder: Decoder): PaymentHandlerResponseSchema {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("PaymentHandlerResponseSchema can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("config", "id", "schema", "spec", "version", "available_instruments")
        return PaymentHandlerResponseSchema(
            config = obj["config"]?.let { json.decodeFromJsonElement(serializer<JsonObject>(), it) },
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for PaymentHandlerResponseSchema")),
            schema = obj["schema"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            spec = obj["spec"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            version = json.decodeFromJsonElement(serializer<String>(), obj["version"] ?: throw SerializationException("Missing version for PaymentHandlerResponseSchema")),
            availableInstruments = obj["available_instruments"]?.let { json.decodeFromJsonElement(serializer<List<PaymentHandlerResponseSchemaAvailableInstrument>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: PaymentHandlerResponseSchema) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("PaymentHandlerResponseSchema can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.config?.let { map["config"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        value.schema?.let { map["schema"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.spec?.let { map["spec"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["version"] = json.encodeToJsonElement(serializer<String>(), value.version)
        value.availableInstruments?.let { map["available_instruments"] = json.encodeToJsonElement(serializer<List<PaymentHandlerResponseSchemaAvailableInstrument>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object PaymentHandlerResponseSchemaAvailableInstrumentSerializer : KSerializer<PaymentHandlerResponseSchemaAvailableInstrument> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.PaymentHandlerResponseSchemaAvailableInstrument")
    override fun deserialize(decoder: Decoder): PaymentHandlerResponseSchemaAvailableInstrument {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("PaymentHandlerResponseSchemaAvailableInstrument can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("constraints", "type")
        return PaymentHandlerResponseSchemaAvailableInstrument(
            constraints = obj["constraints"]?.let { json.decodeFromJsonElement(serializer<JsonObject>(), it) },
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for PaymentHandlerResponseSchemaAvailableInstrument")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: PaymentHandlerResponseSchemaAvailableInstrument) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("PaymentHandlerResponseSchemaAvailableInstrument can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.constraints?.let { map["constraints"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object ServiceResponseSchemaSerializer : KSerializer<ServiceResponseSchema> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.ServiceResponseSchema")
    override fun deserialize(decoder: Decoder): ServiceResponseSchema {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("ServiceResponseSchema can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("config", "id", "schema", "spec", "version", "endpoint", "transport")
        return ServiceResponseSchema(
            config = obj["config"]?.let { json.decodeFromJsonElement(serializer<EmbeddedTransportConfig>(), it) },
            id = obj["id"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            schema = obj["schema"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            spec = obj["spec"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            version = json.decodeFromJsonElement(serializer<String>(), obj["version"] ?: throw SerializationException("Missing version for ServiceResponseSchema")),
            endpoint = obj["endpoint"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            transport = json.decodeFromJsonElement(serializer<Transport>(), obj["transport"] ?: throw SerializationException("Missing transport for ServiceResponseSchema")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: ServiceResponseSchema) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("ServiceResponseSchema can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.config?.let { map["config"] = json.encodeToJsonElement(serializer<EmbeddedTransportConfig>(), it) }
        value.id?.let { map["id"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.schema?.let { map["schema"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.spec?.let { map["spec"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["version"] = json.encodeToJsonElement(serializer<String>(), value.version)
        value.endpoint?.let { map["endpoint"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["transport"] = json.encodeToJsonElement(serializer<Transport>(), value.transport)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object EmbeddedTransportConfigSerializer : KSerializer<EmbeddedTransportConfig> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.EmbeddedTransportConfig")
    override fun deserialize(decoder: Decoder): EmbeddedTransportConfig {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("EmbeddedTransportConfig can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("color_scheme", "delegate")
        return EmbeddedTransportConfig(
            colorScheme = obj["color_scheme"]?.let { json.decodeFromJsonElement(serializer<List<EmbeddedColorScheme>>(), it) },
            delegate = obj["delegate"]?.let { json.decodeFromJsonElement(serializer<List<String>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: EmbeddedTransportConfig) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("EmbeddedTransportConfig can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.colorScheme?.let { map["color_scheme"] = json.encodeToJsonElement(serializer<List<EmbeddedColorScheme>>(), it) }
        value.delegate?.let { map["delegate"] = json.encodeToJsonElement(serializer<List<String>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object OrderSerializer : KSerializer<Order> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Order")
    override fun deserialize(decoder: Decoder): Order {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Order can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("adjustments", "attribution", "checkout_id", "currency", "fulfillment", "id", "label", "line_items", "messages", "permalink_url", "totals", "ucp")
        return Order(
            adjustments = obj["adjustments"]?.let { json.decodeFromJsonElement(serializer<List<Adjustment>>(), it) },
            attribution = obj["attribution"]?.let { json.decodeFromJsonElement(serializer<Map<String, String>>(), it) },
            checkoutID = json.decodeFromJsonElement(serializer<String>(), obj["checkout_id"] ?: throw SerializationException("Missing checkout_id for Order")),
            currency = json.decodeFromJsonElement(serializer<String>(), obj["currency"] ?: throw SerializationException("Missing currency for Order")),
            fulfillment = json.decodeFromJsonElement(serializer<Fulfillment>(), obj["fulfillment"] ?: throw SerializationException("Missing fulfillment for Order")),
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for Order")),
            label = obj["label"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            lineItems = json.decodeFromJsonElement(serializer<List<OrderLineItem>>(), obj["line_items"] ?: throw SerializationException("Missing line_items for Order")),
            messages = obj["messages"]?.let { json.decodeFromJsonElement(serializer<List<Message>>(), it) },
            permalinkURL = json.decodeFromJsonElement(serializer<String>(), obj["permalink_url"] ?: throw SerializationException("Missing permalink_url for Order")),
            totals = json.decodeFromJsonElement(serializer<List<CheckoutTotal>>(), obj["totals"] ?: throw SerializationException("Missing totals for Order")),
            ucp = json.decodeFromJsonElement(serializer<UCPOrderResponseSchema>(), obj["ucp"] ?: throw SerializationException("Missing ucp for Order")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Order) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Order can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.adjustments?.let { map["adjustments"] = json.encodeToJsonElement(serializer<List<Adjustment>>(), it) }
        value.attribution?.let { map["attribution"] = json.encodeToJsonElement(serializer<Map<String, String>>(), it) }
        map["checkout_id"] = json.encodeToJsonElement(serializer<String>(), value.checkoutID)
        map["currency"] = json.encodeToJsonElement(serializer<String>(), value.currency)
        map["fulfillment"] = json.encodeToJsonElement(serializer<Fulfillment>(), value.fulfillment)
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        value.label?.let { map["label"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["line_items"] = json.encodeToJsonElement(serializer<List<OrderLineItem>>(), value.lineItems)
        value.messages?.let { map["messages"] = json.encodeToJsonElement(serializer<List<Message>>(), it) }
        map["permalink_url"] = json.encodeToJsonElement(serializer<String>(), value.permalinkURL)
        map["totals"] = json.encodeToJsonElement(serializer<List<CheckoutTotal>>(), value.totals)
        map["ucp"] = json.encodeToJsonElement(serializer<UCPOrderResponseSchema>(), value.ucp)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object AdjustmentSerializer : KSerializer<Adjustment> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Adjustment")
    override fun deserialize(decoder: Decoder): Adjustment {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Adjustment can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("description", "id", "line_items", "occurred_at", "status", "totals", "type")
        return Adjustment(
            description = obj["description"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for Adjustment")),
            lineItems = obj["line_items"]?.let { json.decodeFromJsonElement(serializer<List<AdjustmentLineItem>>(), it) },
            occurredAt = json.decodeFromJsonElement(serializer<String>(), obj["occurred_at"] ?: throw SerializationException("Missing occurred_at for Adjustment")),
            status = json.decodeFromJsonElement(serializer<AdjustmentStatus>(), obj["status"] ?: throw SerializationException("Missing status for Adjustment")),
            totals = obj["totals"]?.let { json.decodeFromJsonElement(serializer<List<LineItemTotal>>(), it) },
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for Adjustment")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Adjustment) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Adjustment can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.description?.let { map["description"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        value.lineItems?.let { map["line_items"] = json.encodeToJsonElement(serializer<List<AdjustmentLineItem>>(), it) }
        map["occurred_at"] = json.encodeToJsonElement(serializer<String>(), value.occurredAt)
        map["status"] = json.encodeToJsonElement(serializer<AdjustmentStatus>(), value.status)
        value.totals?.let { map["totals"] = json.encodeToJsonElement(serializer<List<LineItemTotal>>(), it) }
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object AdjustmentLineItemSerializer : KSerializer<AdjustmentLineItem> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.AdjustmentLineItem")
    override fun deserialize(decoder: Decoder): AdjustmentLineItem {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("AdjustmentLineItem can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("id", "quantity")
        return AdjustmentLineItem(
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for AdjustmentLineItem")),
            quantity = json.decodeFromJsonElement(serializer<Long>(), obj["quantity"] ?: throw SerializationException("Missing quantity for AdjustmentLineItem")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: AdjustmentLineItem) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("AdjustmentLineItem can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["quantity"] = json.encodeToJsonElement(serializer<Long>(), value.quantity)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object FulfillmentSerializer : KSerializer<Fulfillment> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Fulfillment")
    override fun deserialize(decoder: Decoder): Fulfillment {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Fulfillment can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("events", "expectations")
        return Fulfillment(
            events = obj["events"]?.let { json.decodeFromJsonElement(serializer<List<FulfillmentEvent>>(), it) },
            expectations = obj["expectations"]?.let { json.decodeFromJsonElement(serializer<List<Expectation>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Fulfillment) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Fulfillment can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.events?.let { map["events"] = json.encodeToJsonElement(serializer<List<FulfillmentEvent>>(), it) }
        value.expectations?.let { map["expectations"] = json.encodeToJsonElement(serializer<List<Expectation>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object FulfillmentEventSerializer : KSerializer<FulfillmentEvent> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.FulfillmentEvent")
    override fun deserialize(decoder: Decoder): FulfillmentEvent {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("FulfillmentEvent can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("carrier", "description", "id", "line_items", "occurred_at", "tracking_number", "tracking_url", "type")
        return FulfillmentEvent(
            carrier = obj["carrier"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            description = obj["description"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for FulfillmentEvent")),
            lineItems = json.decodeFromJsonElement(serializer<List<EventLineItem>>(), obj["line_items"] ?: throw SerializationException("Missing line_items for FulfillmentEvent")),
            occurredAt = json.decodeFromJsonElement(serializer<String>(), obj["occurred_at"] ?: throw SerializationException("Missing occurred_at for FulfillmentEvent")),
            trackingNumber = obj["tracking_number"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            trackingURL = obj["tracking_url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for FulfillmentEvent")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: FulfillmentEvent) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("FulfillmentEvent can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.carrier?.let { map["carrier"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.description?.let { map["description"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["line_items"] = json.encodeToJsonElement(serializer<List<EventLineItem>>(), value.lineItems)
        map["occurred_at"] = json.encodeToJsonElement(serializer<String>(), value.occurredAt)
        value.trackingNumber?.let { map["tracking_number"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.trackingURL?.let { map["tracking_url"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object EventLineItemSerializer : KSerializer<EventLineItem> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.EventLineItem")
    override fun deserialize(decoder: Decoder): EventLineItem {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("EventLineItem can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("id", "quantity")
        return EventLineItem(
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for EventLineItem")),
            quantity = json.decodeFromJsonElement(serializer<Long>(), obj["quantity"] ?: throw SerializationException("Missing quantity for EventLineItem")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: EventLineItem) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("EventLineItem can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["quantity"] = json.encodeToJsonElement(serializer<Long>(), value.quantity)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object ExpectationSerializer : KSerializer<Expectation> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Expectation")
    override fun deserialize(decoder: Decoder): Expectation {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Expectation can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("description", "destination", "fulfillable_on", "id", "line_items", "method_type")
        return Expectation(
            description = obj["description"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            destination = json.decodeFromJsonElement(serializer<PostalAddress>(), obj["destination"] ?: throw SerializationException("Missing destination for Expectation")),
            fulfillableOn = obj["fulfillable_on"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for Expectation")),
            lineItems = json.decodeFromJsonElement(serializer<List<ExpectationLineItem>>(), obj["line_items"] ?: throw SerializationException("Missing line_items for Expectation")),
            methodType = json.decodeFromJsonElement(serializer<MethodType>(), obj["method_type"] ?: throw SerializationException("Missing method_type for Expectation")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Expectation) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Expectation can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.description?.let { map["description"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["destination"] = json.encodeToJsonElement(serializer<PostalAddress>(), value.destination)
        value.fulfillableOn?.let { map["fulfillable_on"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["line_items"] = json.encodeToJsonElement(serializer<List<ExpectationLineItem>>(), value.lineItems)
        map["method_type"] = json.encodeToJsonElement(serializer<MethodType>(), value.methodType)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object ExpectationLineItemSerializer : KSerializer<ExpectationLineItem> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.ExpectationLineItem")
    override fun deserialize(decoder: Decoder): ExpectationLineItem {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("ExpectationLineItem can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("id", "quantity")
        return ExpectationLineItem(
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for ExpectationLineItem")),
            quantity = json.decodeFromJsonElement(serializer<Long>(), obj["quantity"] ?: throw SerializationException("Missing quantity for ExpectationLineItem")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: ExpectationLineItem) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("ExpectationLineItem can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["quantity"] = json.encodeToJsonElement(serializer<Long>(), value.quantity)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object OrderLineItemSerializer : KSerializer<OrderLineItem> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.OrderLineItem")
    override fun deserialize(decoder: Decoder): OrderLineItem {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("OrderLineItem can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("id", "item", "parent_id", "quantity", "status", "totals")
        return OrderLineItem(
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for OrderLineItem")),
            item = json.decodeFromJsonElement(serializer<Item>(), obj["item"] ?: throw SerializationException("Missing item for OrderLineItem")),
            parentID = obj["parent_id"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            quantity = json.decodeFromJsonElement(serializer<LineItemQuantity>(), obj["quantity"] ?: throw SerializationException("Missing quantity for OrderLineItem")),
            status = json.decodeFromJsonElement(serializer<LineItemStatus>(), obj["status"] ?: throw SerializationException("Missing status for OrderLineItem")),
            totals = json.decodeFromJsonElement(serializer<List<LineItemTotal>>(), obj["totals"] ?: throw SerializationException("Missing totals for OrderLineItem")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: OrderLineItem) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("OrderLineItem can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        map["item"] = json.encodeToJsonElement(serializer<Item>(), value.item)
        value.parentID?.let { map["parent_id"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["quantity"] = json.encodeToJsonElement(serializer<LineItemQuantity>(), value.quantity)
        map["status"] = json.encodeToJsonElement(serializer<LineItemStatus>(), value.status)
        map["totals"] = json.encodeToJsonElement(serializer<List<LineItemTotal>>(), value.totals)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object LineItemQuantitySerializer : KSerializer<LineItemQuantity> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.LineItemQuantity")
    override fun deserialize(decoder: Decoder): LineItemQuantity {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("LineItemQuantity can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("fulfilled", "original", "total")
        return LineItemQuantity(
            fulfilled = json.decodeFromJsonElement(serializer<Long>(), obj["fulfilled"] ?: throw SerializationException("Missing fulfilled for LineItemQuantity")),
            original = obj["original"]?.let { json.decodeFromJsonElement(serializer<Long>(), it) },
            total = json.decodeFromJsonElement(serializer<Long>(), obj["total"] ?: throw SerializationException("Missing total for LineItemQuantity")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: LineItemQuantity) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("LineItemQuantity can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["fulfilled"] = json.encodeToJsonElement(serializer<Long>(), value.fulfilled)
        value.original?.let { map["original"] = json.encodeToJsonElement(serializer<Long>(), it) }
        map["total"] = json.encodeToJsonElement(serializer<Long>(), value.total)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object UCPOrderResponseSchemaSerializer : KSerializer<UCPOrderResponseSchema> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.UCPOrderResponseSchema")
    override fun deserialize(decoder: Decoder): UCPOrderResponseSchema {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("UCPOrderResponseSchema can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("capabilities", "payment_handlers", "services", "status", "version")
        return UCPOrderResponseSchema(
            capabilities = obj["capabilities"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<CapabilityResponseSchema>>>(), it) },
            paymentHandlers = obj["payment_handlers"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<PaymentHandlerResponseSchema>>>(), it) },
            services = obj["services"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<Service>>>(), it) },
            status = obj["status"]?.let { json.decodeFromJsonElement(serializer<UCPCheckoutResponseSchemaStatus>(), it) },
            version = json.decodeFromJsonElement(serializer<String>(), obj["version"] ?: throw SerializationException("Missing version for UCPOrderResponseSchema")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: UCPOrderResponseSchema) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("UCPOrderResponseSchema can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.capabilities?.let { map["capabilities"] = json.encodeToJsonElement(serializer<Map<String, List<CapabilityResponseSchema>>>(), it) }
        value.paymentHandlers?.let { map["payment_handlers"] = json.encodeToJsonElement(serializer<Map<String, List<PaymentHandlerResponseSchema>>>(), it) }
        value.services?.let { map["services"] = json.encodeToJsonElement(serializer<Map<String, List<Service>>>(), it) }
        value.status?.let { map["status"] = json.encodeToJsonElement(serializer<UCPCheckoutResponseSchemaStatus>(), it) }
        map["version"] = json.encodeToJsonElement(serializer<String>(), value.version)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object ServiceSerializer : KSerializer<Service> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Service")
    override fun deserialize(decoder: Decoder): Service {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Service can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("config", "id", "schema", "spec", "version", "endpoint", "transport")
        return Service(
            config = obj["config"]?.let { json.decodeFromJsonElement(serializer<JsonObject>(), it) },
            id = obj["id"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            schema = obj["schema"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            spec = obj["spec"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            version = json.decodeFromJsonElement(serializer<String>(), obj["version"] ?: throw SerializationException("Missing version for Service")),
            endpoint = obj["endpoint"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            transport = json.decodeFromJsonElement(serializer<Transport>(), obj["transport"] ?: throw SerializationException("Missing transport for Service")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Service) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Service can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.config?.let { map["config"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        value.id?.let { map["id"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.schema?.let { map["schema"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.spec?.let { map["spec"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["version"] = json.encodeToJsonElement(serializer<String>(), value.version)
        value.endpoint?.let { map["endpoint"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["transport"] = json.encodeToJsonElement(serializer<Transport>(), value.transport)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object ErrorResponseUcpSerializer : KSerializer<ErrorResponseUcp> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.ErrorResponseUcp")
    override fun deserialize(decoder: Decoder): ErrorResponseUcp {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("ErrorResponseUcp can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("capabilities", "payment_handlers", "services", "status", "version")
        return ErrorResponseUcp(
            capabilities = obj["capabilities"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<CapabilityResponseSchema>>>(), it) },
            paymentHandlers = obj["payment_handlers"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<PaymentHandlerResponseSchema>>>(), it) },
            services = obj["services"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<Service>>>(), it) },
            status = json.decodeFromJsonElement(serializer<ErrorStatus>(), obj["status"] ?: throw SerializationException("Missing status for ErrorResponseUcp")),
            version = json.decodeFromJsonElement(serializer<String>(), obj["version"] ?: throw SerializationException("Missing version for ErrorResponseUcp")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: ErrorResponseUcp) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("ErrorResponseUcp can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.capabilities?.let { map["capabilities"] = json.encodeToJsonElement(serializer<Map<String, List<CapabilityResponseSchema>>>(), it) }
        value.paymentHandlers?.let { map["payment_handlers"] = json.encodeToJsonElement(serializer<Map<String, List<PaymentHandlerResponseSchema>>>(), it) }
        value.services?.let { map["services"] = json.encodeToJsonElement(serializer<Map<String, List<Service>>>(), it) }
        map["status"] = json.encodeToJsonElement(serializer<ErrorStatus>(), value.status)
        map["version"] = json.encodeToJsonElement(serializer<String>(), value.version)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object InstrumentsChangeResultSerializer : KSerializer<InstrumentsChangeResult> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.InstrumentsChangeResult")
    override fun deserialize(decoder: Decoder): InstrumentsChangeResult {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("InstrumentsChangeResult can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("checkout", "ucp", "continue_url", "messages")
        return InstrumentsChangeResult(
            checkout = obj["checkout"]?.let { json.decodeFromJsonElement(serializer<InstrumentsChangeCheckout>(), it) },
            ucp = json.decodeFromJsonElement(serializer<InstrumentsChangeResultUcp>(), obj["ucp"] ?: throw SerializationException("Missing ucp for InstrumentsChangeResult")),
            continueURL = obj["continue_url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            messages = obj["messages"]?.let { json.decodeFromJsonElement(serializer<List<Message>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: InstrumentsChangeResult) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("InstrumentsChangeResult can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.checkout?.let { map["checkout"] = json.encodeToJsonElement(serializer<InstrumentsChangeCheckout>(), it) }
        map["ucp"] = json.encodeToJsonElement(serializer<InstrumentsChangeResultUcp>(), value.ucp)
        value.continueURL?.let { map["continue_url"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.messages?.let { map["messages"] = json.encodeToJsonElement(serializer<List<Message>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object InstrumentsChangeCheckoutSerializer : KSerializer<InstrumentsChangeCheckout> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.InstrumentsChangeCheckout")
    override fun deserialize(decoder: Decoder): InstrumentsChangeCheckout {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("InstrumentsChangeCheckout can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("payment")
        return InstrumentsChangeCheckout(
            payment = obj["payment"]?.let { json.decodeFromJsonElement(serializer<InstrumentsChangePayment>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: InstrumentsChangeCheckout) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("InstrumentsChangeCheckout can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.payment?.let { map["payment"] = json.encodeToJsonElement(serializer<InstrumentsChangePayment>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object InstrumentsChangePaymentSerializer : KSerializer<InstrumentsChangePayment> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.InstrumentsChangePayment")
    override fun deserialize(decoder: Decoder): InstrumentsChangePayment {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("InstrumentsChangePayment can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("instruments", "selected_instrument_id")
        return InstrumentsChangePayment(
            instruments = obj["instruments"]?.let { json.decodeFromJsonElement(serializer<List<SelectedPaymentInstrument>>(), it) },
            selectedInstrumentID = obj["selected_instrument_id"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: InstrumentsChangePayment) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("InstrumentsChangePayment can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.instruments?.let { map["instruments"] = json.encodeToJsonElement(serializer<List<SelectedPaymentInstrument>>(), it) }
        value.selectedInstrumentID?.let { map["selected_instrument_id"] = json.encodeToJsonElement(serializer<String>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object InstrumentsChangeResultUcpSerializer : KSerializer<InstrumentsChangeResultUcp> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.InstrumentsChangeResultUcp")
    override fun deserialize(decoder: Decoder): InstrumentsChangeResultUcp {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("InstrumentsChangeResultUcp can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("capabilities", "payment_handlers", "services", "status", "version")
        return InstrumentsChangeResultUcp(
            capabilities = obj["capabilities"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<CapabilityElement>>>(), it) },
            paymentHandlers = obj["payment_handlers"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<PaymentHandlerElement>>>(), it) },
            services = obj["services"]?.let { json.decodeFromJsonElement(serializer<Map<String, List<EmbeddedService>>>(), it) },
            status = json.decodeFromJsonElement(serializer<UCPCheckoutResponseSchemaStatus>(), obj["status"] ?: throw SerializationException("Missing status for InstrumentsChangeResultUcp")),
            version = json.decodeFromJsonElement(serializer<String>(), obj["version"] ?: throw SerializationException("Missing version for InstrumentsChangeResultUcp")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: InstrumentsChangeResultUcp) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("InstrumentsChangeResultUcp can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.capabilities?.let { map["capabilities"] = json.encodeToJsonElement(serializer<Map<String, List<CapabilityElement>>>(), it) }
        value.paymentHandlers?.let { map["payment_handlers"] = json.encodeToJsonElement(serializer<Map<String, List<PaymentHandlerElement>>>(), it) }
        value.services?.let { map["services"] = json.encodeToJsonElement(serializer<Map<String, List<EmbeddedService>>>(), it) }
        map["status"] = json.encodeToJsonElement(serializer<UCPCheckoutResponseSchemaStatus>(), value.status)
        map["version"] = json.encodeToJsonElement(serializer<String>(), value.version)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object CapabilityElementSerializer : KSerializer<CapabilityElement> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.CapabilityElement")
    override fun deserialize(decoder: Decoder): CapabilityElement {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("CapabilityElement can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("config", "id", "schema", "spec", "version", "extends")
        return CapabilityElement(
            config = obj["config"]?.let { json.decodeFromJsonElement(serializer<JsonObject>(), it) },
            id = obj["id"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            schema = obj["schema"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            spec = obj["spec"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            version = json.decodeFromJsonElement(serializer<String>(), obj["version"] ?: throw SerializationException("Missing version for CapabilityElement")),
            extends = obj["extends"]?.let { json.decodeFromJsonElement(serializer<Extends>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: CapabilityElement) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("CapabilityElement can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.config?.let { map["config"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        value.id?.let { map["id"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.schema?.let { map["schema"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.spec?.let { map["spec"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["version"] = json.encodeToJsonElement(serializer<String>(), value.version)
        value.extends?.let { map["extends"] = json.encodeToJsonElement(serializer<Extends>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object PaymentHandlerElementSerializer : KSerializer<PaymentHandlerElement> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.PaymentHandlerElement")
    override fun deserialize(decoder: Decoder): PaymentHandlerElement {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("PaymentHandlerElement can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("config", "id", "schema", "spec", "version", "available_instruments")
        return PaymentHandlerElement(
            config = obj["config"]?.let { json.decodeFromJsonElement(serializer<JsonObject>(), it) },
            id = json.decodeFromJsonElement(serializer<String>(), obj["id"] ?: throw SerializationException("Missing id for PaymentHandlerElement")),
            schema = obj["schema"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            spec = obj["spec"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            version = json.decodeFromJsonElement(serializer<String>(), obj["version"] ?: throw SerializationException("Missing version for PaymentHandlerElement")),
            availableInstruments = obj["available_instruments"]?.let { json.decodeFromJsonElement(serializer<List<PaymentHandlerAvailableInstrument>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: PaymentHandlerElement) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("PaymentHandlerElement can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.config?.let { map["config"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        map["id"] = json.encodeToJsonElement(serializer<String>(), value.id)
        value.schema?.let { map["schema"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.spec?.let { map["spec"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["version"] = json.encodeToJsonElement(serializer<String>(), value.version)
        value.availableInstruments?.let { map["available_instruments"] = json.encodeToJsonElement(serializer<List<PaymentHandlerAvailableInstrument>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object PaymentHandlerAvailableInstrumentSerializer : KSerializer<PaymentHandlerAvailableInstrument> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.PaymentHandlerAvailableInstrument")
    override fun deserialize(decoder: Decoder): PaymentHandlerAvailableInstrument {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("PaymentHandlerAvailableInstrument can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("constraints", "type")
        return PaymentHandlerAvailableInstrument(
            constraints = obj["constraints"]?.let { json.decodeFromJsonElement(serializer<JsonObject>(), it) },
            type = json.decodeFromJsonElement(serializer<String>(), obj["type"] ?: throw SerializationException("Missing type for PaymentHandlerAvailableInstrument")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: PaymentHandlerAvailableInstrument) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("PaymentHandlerAvailableInstrument can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.constraints?.let { map["constraints"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        map["type"] = json.encodeToJsonElement(serializer<String>(), value.type)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object EmbeddedServiceSerializer : KSerializer<EmbeddedService> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.EmbeddedService")
    override fun deserialize(decoder: Decoder): EmbeddedService {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("EmbeddedService can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("config", "id", "schema", "spec", "version", "endpoint", "transport")
        return EmbeddedService(
            config = obj["config"]?.let { json.decodeFromJsonElement(serializer<JsonObject>(), it) },
            id = obj["id"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            schema = obj["schema"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            spec = obj["spec"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            version = json.decodeFromJsonElement(serializer<String>(), obj["version"] ?: throw SerializationException("Missing version for EmbeddedService")),
            endpoint = obj["endpoint"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            transport = json.decodeFromJsonElement(serializer<Transport>(), obj["transport"] ?: throw SerializationException("Missing transport for EmbeddedService")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: EmbeddedService) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("EmbeddedService can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.config?.let { map["config"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        value.id?.let { map["id"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.schema?.let { map["schema"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.spec?.let { map["spec"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["version"] = json.encodeToJsonElement(serializer<String>(), value.version)
        value.endpoint?.let { map["endpoint"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["transport"] = json.encodeToJsonElement(serializer<Transport>(), value.transport)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object CredentialResultSerializer : KSerializer<CredentialResult> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.CredentialResult")
    override fun deserialize(decoder: Decoder): CredentialResult {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("CredentialResult can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("checkout", "ucp", "continue_url", "messages")
        return CredentialResult(
            checkout = obj["checkout"]?.let { json.decodeFromJsonElement(serializer<CredentialCheckout>(), it) },
            ucp = json.decodeFromJsonElement(serializer<InstrumentsChangeResultUcp>(), obj["ucp"] ?: throw SerializationException("Missing ucp for CredentialResult")),
            continueURL = obj["continue_url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            messages = obj["messages"]?.let { json.decodeFromJsonElement(serializer<List<Message>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: CredentialResult) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("CredentialResult can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.checkout?.let { map["checkout"] = json.encodeToJsonElement(serializer<CredentialCheckout>(), it) }
        map["ucp"] = json.encodeToJsonElement(serializer<InstrumentsChangeResultUcp>(), value.ucp)
        value.continueURL?.let { map["continue_url"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.messages?.let { map["messages"] = json.encodeToJsonElement(serializer<List<Message>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object CredentialCheckoutSerializer : KSerializer<CredentialCheckout> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.CredentialCheckout")
    override fun deserialize(decoder: Decoder): CredentialCheckout {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("CredentialCheckout can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("payment")
        return CredentialCheckout(
            payment = obj["payment"]?.let { json.decodeFromJsonElement(serializer<Payment>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: CredentialCheckout) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("CredentialCheckout can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.payment?.let { map["payment"] = json.encodeToJsonElement(serializer<Payment>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object AddressChangeResultSerializer : KSerializer<AddressChangeResult> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.AddressChangeResult")
    override fun deserialize(decoder: Decoder): AddressChangeResult {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("AddressChangeResult can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("checkout", "ucp", "continue_url", "messages")
        return AddressChangeResult(
            checkout = obj["checkout"]?.let { json.decodeFromJsonElement(serializer<AddressChangeCheckout>(), it) },
            ucp = json.decodeFromJsonElement(serializer<InstrumentsChangeResultUcp>(), obj["ucp"] ?: throw SerializationException("Missing ucp for AddressChangeResult")),
            continueURL = obj["continue_url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            messages = obj["messages"]?.let { json.decodeFromJsonElement(serializer<List<Message>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: AddressChangeResult) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("AddressChangeResult can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.checkout?.let { map["checkout"] = json.encodeToJsonElement(serializer<AddressChangeCheckout>(), it) }
        map["ucp"] = json.encodeToJsonElement(serializer<InstrumentsChangeResultUcp>(), value.ucp)
        value.continueURL?.let { map["continue_url"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.messages?.let { map["messages"] = json.encodeToJsonElement(serializer<List<Message>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object AddressChangeCheckoutSerializer : KSerializer<AddressChangeCheckout> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.AddressChangeCheckout")
    override fun deserialize(decoder: Decoder): AddressChangeCheckout {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("AddressChangeCheckout can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("fulfillment")
        return AddressChangeCheckout(
            fulfillment = obj["fulfillment"]?.let { json.decodeFromJsonElement(serializer<CheckoutFulfillmentClass>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: AddressChangeCheckout) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("AddressChangeCheckout can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.fulfillment?.let { map["fulfillment"] = json.encodeToJsonElement(serializer<CheckoutFulfillmentClass>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object CheckoutFulfillmentClassSerializer : KSerializer<CheckoutFulfillmentClass> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.CheckoutFulfillmentClass")
    override fun deserialize(decoder: Decoder): CheckoutFulfillmentClass {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("CheckoutFulfillmentClass can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("available_methods", "methods")
        return CheckoutFulfillmentClass(
            availableMethods = obj["available_methods"]?.let { json.decodeFromJsonElement(serializer<List<FulfillmentAvailableMethod>>(), it) },
            methods = obj["methods"]?.let { json.decodeFromJsonElement(serializer<List<FulfillmentMethod>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: CheckoutFulfillmentClass) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("CheckoutFulfillmentClass can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.availableMethods?.let { map["available_methods"] = json.encodeToJsonElement(serializer<List<FulfillmentAvailableMethod>>(), it) }
        value.methods?.let { map["methods"] = json.encodeToJsonElement(serializer<List<FulfillmentMethod>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object ReadyRequestSerializer : KSerializer<ReadyRequest> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.ReadyRequest")
    override fun deserialize(decoder: Decoder): ReadyRequest {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("ReadyRequest can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("auth", "delegate")
        return ReadyRequest(
            auth = obj["auth"]?.let { json.decodeFromJsonElement(serializer<Auth>(), it) },
            delegate = json.decodeFromJsonElement(serializer<List<String>>(), obj["delegate"] ?: throw SerializationException("Missing delegate for ReadyRequest")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: ReadyRequest) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("ReadyRequest can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.auth?.let { map["auth"] = json.encodeToJsonElement(serializer<Auth>(), it) }
        map["delegate"] = json.encodeToJsonElement(serializer<List<String>>(), value.delegate)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object AuthSerializer : KSerializer<Auth> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Auth")
    override fun deserialize(decoder: Decoder): Auth {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Auth can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("type")
        return Auth(
            type = obj["type"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Auth) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Auth can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.type?.let { map["type"] = json.encodeToJsonElement(serializer<String>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object ReadyResultSerializer : KSerializer<ReadyResult> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.ReadyResult")
    override fun deserialize(decoder: Decoder): ReadyResult {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("ReadyResult can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("checkout", "credential", "ucp", "upgrade", "continue_url", "messages")
        return ReadyResult(
            checkout = obj["checkout"]?.let { json.decodeFromJsonElement(serializer<ReadyCheckout>(), it) },
            credential = obj["credential"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            ucp = json.decodeFromJsonElement(serializer<InstrumentsChangeResultUcp>(), obj["ucp"] ?: throw SerializationException("Missing ucp for ReadyResult")),
            upgrade = obj["upgrade"]?.let { json.decodeFromJsonElement(serializer<Upgrade>(), it) },
            continueURL = obj["continue_url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            messages = obj["messages"]?.let { json.decodeFromJsonElement(serializer<List<Message>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: ReadyResult) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("ReadyResult can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.checkout?.let { map["checkout"] = json.encodeToJsonElement(serializer<ReadyCheckout>(), it) }
        value.credential?.let { map["credential"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["ucp"] = json.encodeToJsonElement(serializer<InstrumentsChangeResultUcp>(), value.ucp)
        value.upgrade?.let { map["upgrade"] = json.encodeToJsonElement(serializer<Upgrade>(), it) }
        value.continueURL?.let { map["continue_url"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.messages?.let { map["messages"] = json.encodeToJsonElement(serializer<List<Message>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object ReadyCheckoutSerializer : KSerializer<ReadyCheckout> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.ReadyCheckout")
    override fun deserialize(decoder: Decoder): ReadyCheckout {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("ReadyCheckout can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("fulfillment", "payment")
        return ReadyCheckout(
            fulfillment = obj["fulfillment"]?.let { json.decodeFromJsonElement(serializer<CheckoutFulfillmentClass>(), it) },
            payment = obj["payment"]?.let { json.decodeFromJsonElement(serializer<ReadyPayment>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: ReadyCheckout) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("ReadyCheckout can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.fulfillment?.let { map["fulfillment"] = json.encodeToJsonElement(serializer<CheckoutFulfillmentClass>(), it) }
        value.payment?.let { map["payment"] = json.encodeToJsonElement(serializer<ReadyPayment>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object ReadyPaymentSerializer : KSerializer<ReadyPayment> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.ReadyPayment")
    override fun deserialize(decoder: Decoder): ReadyPayment {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("ReadyPayment can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("instruments", "selected_instrument_id")
        return ReadyPayment(
            instruments = obj["instruments"]?.let { json.decodeFromJsonElement(serializer<List<SelectedPaymentInstrument>>(), it) },
            selectedInstrumentID = obj["selected_instrument_id"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: ReadyPayment) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("ReadyPayment can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.instruments?.let { map["instruments"] = json.encodeToJsonElement(serializer<List<SelectedPaymentInstrument>>(), it) }
        value.selectedInstrumentID?.let { map["selected_instrument_id"] = json.encodeToJsonElement(serializer<String>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object UpgradeSerializer : KSerializer<Upgrade> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.Upgrade")
    override fun deserialize(decoder: Decoder): Upgrade {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("Upgrade can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("port")
        return Upgrade(
            port = obj["port"]?.let { json.decodeFromJsonElement(serializer<JsonObject>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: Upgrade) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("Upgrade can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.port?.let { map["port"] = json.encodeToJsonElement(serializer<JsonObject>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object AuthRequestSerializer : KSerializer<AuthRequest> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.AuthRequest")
    override fun deserialize(decoder: Decoder): AuthRequest {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("AuthRequest can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("type")
        return AuthRequest(
            type = obj["type"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: AuthRequest) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("AuthRequest can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.type?.let { map["type"] = json.encodeToJsonElement(serializer<String>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object AuthResultSerializer : KSerializer<AuthResult> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.AuthResult")
    override fun deserialize(decoder: Decoder): AuthResult {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("AuthResult can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("credential", "ucp", "continue_url", "messages")
        return AuthResult(
            credential = obj["credential"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            ucp = json.decodeFromJsonElement(serializer<InstrumentsChangeResultUcp>(), obj["ucp"] ?: throw SerializationException("Missing ucp for AuthResult")),
            continueURL = obj["continue_url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            messages = obj["messages"]?.let { json.decodeFromJsonElement(serializer<List<Message>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: AuthResult) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("AuthResult can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        value.credential?.let { map["credential"] = json.encodeToJsonElement(serializer<String>(), it) }
        map["ucp"] = json.encodeToJsonElement(serializer<InstrumentsChangeResultUcp>(), value.ucp)
        value.continueURL?.let { map["continue_url"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.messages?.let { map["messages"] = json.encodeToJsonElement(serializer<List<Message>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object WindowOpenRequestSerializer : KSerializer<WindowOpenRequest> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.WindowOpenRequest")
    override fun deserialize(decoder: Decoder): WindowOpenRequest {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("WindowOpenRequest can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("url")
        return WindowOpenRequest(
            url = json.decodeFromJsonElement(serializer<String>(), obj["url"] ?: throw SerializationException("Missing url for WindowOpenRequest")),
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: WindowOpenRequest) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("WindowOpenRequest can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["url"] = json.encodeToJsonElement(serializer<String>(), value.url)
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
public object WindowOpenResultSerializer : KSerializer<WindowOpenResult> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("com.shopify.ucp.embedded.checkout.WindowOpenResult")
    override fun deserialize(decoder: Decoder): WindowOpenResult {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("WindowOpenResult can only be deserialized from JSON")
        val obj = input.decodeJsonElement().jsonObject
        val json = input.json
        val known = setOf("ucp", "continue_url", "messages")
        return WindowOpenResult(
            ucp = json.decodeFromJsonElement(serializer<InstrumentsChangeResultUcp>(), obj["ucp"] ?: throw SerializationException("Missing ucp for WindowOpenResult")),
            continueURL = obj["continue_url"]?.let { json.decodeFromJsonElement(serializer<String>(), it) },
            messages = obj["messages"]?.let { json.decodeFromJsonElement(serializer<List<Message>>(), it) },
            additionalProperties = obj.filterKeys { it !in known }
        )
    }
    override fun serialize(encoder: Encoder, value: WindowOpenResult) {
        val output = encoder as? JsonEncoder
            ?: throw SerializationException("WindowOpenResult can only be serialized to JSON")
        val json = output.json
        val map = linkedMapOf<String, JsonElement>()
        map["ucp"] = json.encodeToJsonElement(serializer<InstrumentsChangeResultUcp>(), value.ucp)
        value.continueURL?.let { map["continue_url"] = json.encodeToJsonElement(serializer<String>(), it) }
        value.messages?.let { map["messages"] = json.encodeToJsonElement(serializer<List<Message>>(), it) }
        map.putAll(value.additionalProperties)
        output.encodeJsonElement(JsonObject(map))
    }
}
