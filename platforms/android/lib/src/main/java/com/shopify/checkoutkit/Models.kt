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

// To parse the JSON, install kotlin's serialization plugin and do:
//
// val json                        = Json { allowStructuredMapKeys = true }
// val checkout                    = json.parse(Checkout.serializer(), jsonString)
// val errorResponse               = json.parse(ErrorResponse.serializer(), jsonString)
// val paymentAccountInfo          = json.parse(PaymentAccountInfo.serializer(), jsonString)
// val adjustment                  = json.parse(Adjustment.serializer(), jsonString)
// val attribution                 = json.parse(Attribution.serializer(), jsonString)
// val availablePaymentInstrument  = json.parse(AvailablePaymentInstrument.serializer(), jsonString)
// val binding                     = json.parse(TokenBinding.serializer(), jsonString)
// val businessFulfillmentConfig   = json.parse(BusinessFulfillmentConfig.serializer(), jsonString)
// val businessSplitPaymentsConfig = json.parse(BusinessSplitPaymentsConfig.serializer(), jsonString)
// val buyer                       = json.parse(Buyer.serializer(), jsonString)
// val cardCredential              = json.parse(CardCredential.serializer(), jsonString)
// val cardPaymentInstrument       = json.parse(CardPaymentInstrument.serializer(), jsonString)
// val category                    = json.parse(Category.serializer(), jsonString)
// val context                     = json.parse(Context.serializer(), jsonString)
// val detailOptionValue           = json.parse(DetailOptionValue.serializer(), jsonString)
// val expectation                 = json.parse(Expectation.serializer(), jsonString)
// val fulfillment                 = json.parse(Fulfillment.serializer(), jsonString)
// val fulfillmentAvailableMethod  = json.parse(FulfillmentAvailableMethod.serializer(), jsonString)
// val fulfillmentDestination      = json.parse(FulfillmentDestination.serializer(), jsonString)
// val fulfillmentEvent            = json.parse(FulfillmentEvent.serializer(), jsonString)
// val fulfillmentGroup            = json.parse(FulfillmentGroup.serializer(), jsonString)
// val fulfillmentMethod           = json.parse(FulfillmentMethod.serializer(), jsonString)
// val fulfillmentOption           = json.parse(FulfillmentOption.serializer(), jsonString)
// val inputCorrelation            = json.parse(InputCorrelation.serializer(), jsonString)
// val instrumentGroup             = json.parse(InstrumentGroup.serializer(), jsonString)
// val item                        = json.parse(Item.serializer(), jsonString)
// val lineItem                    = json.parse(LineItem.serializer(), jsonString)
// val merchantFulfillmentConfig   = json.parse(MerchantFulfillmentConfig.serializer(), jsonString)
// val optionValue                 = json.parse(OptionValue.serializer(), jsonString)
// val orderConfirmation           = json.parse(OrderConfirmation.serializer(), jsonString)
// val orderLineItem               = json.parse(OrderLineItem.serializer(), jsonString)
// val paymentCredential           = json.parse(PaymentCredential.serializer(), jsonString)
// val paymentIdentity             = json.parse(PaymentIdentity.serializer(), jsonString)
// val paymentInstrument           = json.parse(PaymentInstrument.serializer(), jsonString)
// val platformFulfillmentConfig   = json.parse(PlatformFulfillmentConfig.serializer(), jsonString)
// val priceFilter                 = json.parse(PriceFilter.serializer(), jsonString)
// val priceRange                  = json.parse(PriceRange.serializer(), jsonString)
// val product                     = json.parse(Product.serializer(), jsonString)
// val productOption               = json.parse(ProductOption.serializer(), jsonString)
// val rating                      = json.parse(Rating.serializer(), jsonString)
// val retailLocation              = json.parse(RetailLocation.serializer(), jsonString)
// val searchFilters               = json.parse(SearchFilters.serializer(), jsonString)
// val selectedOption              = json.parse(SelectedOption.serializer(), jsonString)
// val shippingDestination         = json.parse(ShippingDestination.serializer(), jsonString)
// val signals                     = json.parse(Signals.serializer(), jsonString)
// val tokenCredential             = json.parse(TokenCredential.serializer(), jsonString)
// val total                       = json.parse(Total.serializer(), jsonString)
// val totals                      = json.parse(Totals.serializer(), jsonString)
// val variant                     = json.parse(Variant.serializer(), jsonString)
// val payment                     = json.parse(Payment.serializer(), jsonString)
// val order                       = json.parse(Order.serializer(), jsonString)
// val instrumentsChangeResult     = json.parse(InstrumentsChangeResult.serializer(), jsonString)
// val credentialResult            = json.parse(CredentialResult.serializer(), jsonString)

package com.shopify.checkoutkit

import kotlinx.serialization.*
import kotlinx.serialization.json.*
import kotlinx.serialization.descriptors.*
import kotlinx.serialization.encoding.*

public typealias Attribution = HashMap<String, String>
public typealias Totals = List<TotalElement>

/**
 * Base checkout schema. Extensions compose onto this using allOf.
 */
@Serializable
public data class Checkout (
    public val attribution: Map<String, String>? = null,

    /**
     * Representation of the buyer.
     */
    public val buyer: BuyerClass? = null,

    public val context: ContextClass? = null,

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
    public val lineItems: List<CheckoutLineItem>,

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
    public val order: OrderClass? = null,

    public val payment: PaymentClass? = null,
    public val signals: SignalsClass? = null,

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
public data class BuyerClass (
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
public data class ContextClass (
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
public data class CheckoutLineItem (
    public val id: String,
    public val item: ItemClass,

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
public data class ItemClass (
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
public data class OrderClass (
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
public data class PaymentClass (
    /**
     * The payment instruments available for this payment. Each instrument is associated with a
     * specific handler via the handler_id field. Handlers can extend the base
     * payment_instrument schema to add handler-specific fields.
     */
    public val instruments: List<PaymentSelectedPaymentInstrument>? = null
)

/**
 * A payment instrument with selection state.
 *
 * The base definition for any payment instrument. It links the instrument to a specific
 * payment handler.
 */
@Serializable
public data class PaymentSelectedPaymentInstrument (
    /**
     * The billing address associated with this payment method.
     */
    @SerialName("billing_address")
    public val billingAddress: PostalAddress? = null,

    public val credential: CredentialClass? = null,

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
 *
 * Physical address of the location.
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
public data class CredentialClass (
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
public data class SignalsClass (
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
    public val lines: List<TotalLine>? = null
)

/**
 * Sub-line entry. Additional metadata MAY be included.
 */
@Serializable
public data class TotalLine (
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
 * Application-level status of the UCP operation.
 */
@Serializable
public enum class StatusEnum(public val value: String) {
    @SerialName("error") Error("error");
}

/**
 * Non-sensitive backend identifiers for linking.
 */
@Serializable
public data class PaymentAccountInfo (
    /**
     * EMVCo PAR. A unique identifier linking a payment card to a specific account, enabling
     * tracking across tokens (Apple Pay, physical card, etc).
     */
    @SerialName("payment_account_reference")
    public val paymentAccountReference: String? = null
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
 * An instrument type available from a payment handler with optional constraints.
 */
@Serializable
public data class AvailablePaymentInstrument (
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
 * Binds a token to a specific checkout session and participant. Prevents token reuse across
 * different checkouts or participants.
 */
@Serializable
public data class TokenBinding (
    /**
     * The checkout session identifier this token is bound to.
     */
    @SerialName("checkout_id")
    public val checkoutID: String,

    /**
     * The participant this token is bound to. Required when acting on behalf of another
     * participant (e.g., agent tokenizing for merchant). Omit when the authenticated caller is
     * the binding target.
     */
    public val identity: IdentityClass? = null
)

/**
 * The participant this token is bound to. Required when acting on behalf of another
 * participant (e.g., agent tokenizing for merchant). Omit when the authenticated caller is
 * the binding target.
 *
 * Identity of a participant for token binding. The access_token uniquely identifies the
 * participant who tokens should be bound to.
 */
@Serializable
public data class IdentityClass (
    /**
     * Unique identifier for this participant, obtained during onboarding with the tokenizer.
     */
    @SerialName("access_token")
    public val accessToken: String
)

/**
 * Business's fulfillment configuration.
 */
@Serializable
public data class BusinessFulfillmentConfig (
    /**
     * Allowed method type combinations.
     */
    @SerialName("allows_method_combinations")
    public val allowsMethodCombinations: List<List<TypeElement>>? = null,

    /**
     * Permits multiple destinations per method type.
     */
    @SerialName("allows_multi_destination")
    public val allowsMultiDestination: BusinessFulfillmentConfigAllowsMultiDestination? = null
)

/**
 * Fulfillment method type this availability applies to.
 *
 * Fulfillment method type.
 */
@Serializable
public enum class TypeElement(public val value: String) {
    @SerialName("pickup") Pickup("pickup"),
    @SerialName("shipping") Shipping("shipping");
}

/**
 * Permits multiple destinations per method type.
 */
@Serializable
public data class BusinessFulfillmentConfigAllowsMultiDestination (
    /**
     * Multiple pickup locations allowed.
     */
    public val pickup: Boolean? = null,

    /**
     * Multiple shipping destinations allowed.
     */
    public val shipping: Boolean? = null
)

/**
 * Business-level configuration for split payments. Declaring the capability means multiple
 * payment instruments are supported; this config declares which combinations are valid.
 */
@Serializable
public data class BusinessSplitPaymentsConfig (
    /**
     * Array of valid instrument combinations. Each combination is an array of instrument
     * groups. A payment is valid if it matches any combination.
     */
    @SerialName("allowed_combinations")
    public val allowedCombinations: List<List<AllowedCombinationElement>>
)

/**
 * A single valid combination: an array of instrument groups that together define the
 * constraints. All groups must be satisfied (AND logic).
 *
 * A constraint within an allowed combination that defines which instrument types can fill
 * this group and how many are permitted.
 */
@Serializable
public data class AllowedCombinationElement (
    /**
     * Maximum number of instruments allowed from this group. Defaults to 1. MUST be greater
     * than or equal to `min`.
     */
    public val max: Long? = null,

    /**
     * Minimum number of instruments required from this group. Defaults to 0 (optional).
     */
    public val min: Long? = null,

    /**
     * Instrument types accepted by this group (OR logic). Any listed type qualifies.
     */
    public val types: List<String>
)

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
 * A card credential containing sensitive payment card details including raw Primary Account
 * Numbers (PANs). This credential type MUST NOT be used for checkout, only with payment
 * handlers that tokenize or encrypt credentials. CRITICAL: Both parties handling
 * CardCredential (sender and receiver) MUST be PCI DSS compliant. Transmission MUST use
 * HTTPS/TLS with strong cipher suites.
 *
 * The base definition for any payment credential. Handlers define specific credential types.
 */
@Serializable
public data class CardCredential (
    /**
     * The credential type discriminator. Specific schemas will constrain this to a constant
     * value.
     *
     * The credential type identifier for card credentials.
     */
    public val type: ErrorCode,

    /**
     * The type of card number. Network tokens are preferred with fallback to FPAN. See PCI
     * Scope for more details.
     */
    @SerialName("card_number_type")
    public val cardNumberType: CardNumberType,

    /**
     * Cryptogram provided with network tokens.
     */
    public val cryptogram: String? = null,

    /**
     * Card CVC number.
     */
    public val cvc: String? = null,

    /**
     * Electronic Commerce Indicator / Security Level Indicator provided with network tokens.
     */
    @SerialName("eci_value")
    public val eciValue: String? = null,

    /**
     * The month of the card's expiration date (1-12).
     */
    @SerialName("expiry_month")
    public val expiryMonth: Long? = null,

    /**
     * The year of the card's expiration date.
     */
    @SerialName("expiry_year")
    public val expiryYear: Long? = null,

    /**
     * Cardholder name.
     */
    public val name: String? = null,

    /**
     * Card number.
     */
    public val number: String? = null
)

/**
 * The type of card number. Network tokens are preferred with fallback to FPAN. See PCI
 * Scope for more details.
 */
@Serializable
public enum class CardNumberType(public val value: String) {
    @SerialName("dpan") Dpan("dpan"),
    @SerialName("fpan") Fpan("fpan"),
    @SerialName("network_token") NetworkToken("network_token");
}

/**
 * URL-style parameter value, encoded as a string. Numeric or boolean values MUST be
 * string-encoded as they would be in a URL query string.
 *
 * Error code identifying the type of error. Standard errors are defined in capability
 * specifications (see examples) and have standardized semantics; freeform codes are
 * permitted.
 *
 * Warning code identifying the type of warning. Standard codes are defined in capability
 * specifications (see examples) and have standardized semantics; freeform codes are
 * permitted.
 *
 * Info code identifying the type of informational message. Standard codes are defined in
 * capability specifications (see examples) and have standardized semantics; freeform codes
 * are permitted.
 */
@Serializable
public enum class ErrorCode(public val value: String) {
    @SerialName("card") Card("card");
}

/**
 * A basic card payment instrument with visible card details. Can be inherited by a
 * handler's instrument schema to define handler-specific display details or more complex
 * credential structures.
 *
 * The base definition for any payment instrument. It links the instrument to a specific
 * payment handler.
 */
@Serializable
public data class CardPaymentInstrument (
    /**
     * The billing address associated with this payment method.
     */
    @SerialName("billing_address")
    public val billingAddress: PostalAddress? = null,

    public val credential: CredentialClass? = null,

    /**
     * Display information for this payment instrument. Each payment instrument schema defines
     * its specific display properties, as outlined by the payment handler.
     *
     * Display information for this card payment instrument.
     */
    public val display: Display? = null,

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
     *
     * Indicates this is a card payment instrument.
     */
    public val type: ErrorCode
)

/**
 * Display information for this payment instrument. Each payment instrument schema defines
 * its specific display properties, as outlined by the payment handler.
 *
 * Display information for this card payment instrument.
 */
@Serializable
public data class Display (
    /**
     * The card brand/network (e.g., visa, mastercard, amex).
     */
    public val brand: String? = null,

    /**
     * An optional URI to a rich image representing the card (e.g., card art provided by the
     * issuer).
     */
    @SerialName("card_art")
    public val cardArt: String? = null,

    /**
     * An optional rich text description of the card to display to the user (e.g., 'Visa ending
     * in 1234, expires 12/2025').
     */
    public val description: String? = null,

    /**
     * The month of the card's expiration date (1-12).
     */
    @SerialName("expiry_month")
    public val expiryMonth: Long? = null,

    /**
     * The year of the card's expiration date.
     */
    @SerialName("expiry_year")
    public val expiryYear: Long? = null,

    /**
     * Last 4 digits of the card number.
     */
    @SerialName("last_digits")
    public val lastDigits: String? = null
)

/**
 * A product category with optional taxonomy identifier.
 */
@Serializable
public data class Category (
    /**
     * Source taxonomy. Well-known values: `google_product_category`, `shopify`, `merchant`.
     */
    public val taxonomy: String? = null,

    /**
     * Category value or path (e.g., 'Apparel > Shirts', '1604').
     */
    public val value: String
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
 * An option value with availability signals relative to the current selections. Used in
 * get_product responses where selected context exists.
 *
 * A selectable value for a product option.
 */
@Serializable
public data class DetailOptionValue (
    /**
     * Whether a variant matching this value and the current option selections is purchasable.
     */
    public val available: Boolean? = null,

    /**
     * Whether a variant matching this value and the current option selections exists in the
     * catalog.
     */
    public val exists: Boolean? = null,

    /**
     * Optional server-assigned identifier for this option value. When present in a
     * selected_option, the server SHOULD use it for matching instead of label.
     */
    public val id: String? = null,

    /**
     * Display text for this option value (e.g., 'Small', 'Blue').
     */
    public val label: String
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

/**
 * Container for fulfillment methods and availability.
 */
@Serializable
public data class Fulfillment (
    /**
     * Inventory availability hints.
     */
    @SerialName("available_methods")
    public val availableMethods: List<AvailableMethodElement>? = null,

    /**
     * Fulfillment methods for cart items.
     */
    public val methods: List<MethodElement>? = null
)

/**
 * Inventory availability hint for a fulfillment method type.
 */
@Serializable
public data class AvailableMethodElement (
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
    public val type: TypeElement
)

/**
 * A fulfillment method (shipping or pickup) with destinations and groups.
 */
@Serializable
public data class MethodElement (
    /**
     * Available destinations. For shipping: addresses. For pickup: retail locations.
     */
    public val destinations: List<FulfillmentDestinationElement>? = null,

    /**
     * Fulfillment groups for selecting options. Agent sets selected_option_id on groups to
     * choose shipping method.
     */
    public val groups: List<GroupElement>? = null,

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
    public val type: TypeElement
)

/**
 * A destination for fulfillment.
 *
 * Shipping destination.
 *
 * The billing address associated with this payment method.
 *
 * Delivery destination address.
 *
 * Physical address of the location.
 *
 * A pickup location (retail store, locker, etc.).
 */
@Serializable
public data class FulfillmentDestinationElement (
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
    public val name: String? = null
)

/**
 * A merchant-generated package/group of line items with fulfillment options.
 */
@Serializable
public data class GroupElement (
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
    public val options: List<OptionElement>? = null,

    /**
     * ID of the selected fulfillment option for this group.
     */
    @SerialName("selected_option_id")
    public val selectedOptionID: String? = null
)

/**
 * A fulfillment option within a group (e.g., Standard Shipping $5, Express $15).
 */
@Serializable
public data class OptionElement (
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
    public val totals: List<LineItemTotal>
)

/**
 * Inventory availability hint for a fulfillment method type.
 */
@Serializable
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
    public val type: TypeElement
)

/**
 * A destination for fulfillment.
 *
 * Shipping destination.
 *
 * The billing address associated with this payment method.
 *
 * Delivery destination address.
 *
 * Physical address of the location.
 *
 * A pickup location (retail store, locker, etc.).
 */
@Serializable
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
    public val name: String? = null
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
    public val lineItems: List<FulfillmentEventLineItem>,

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
public data class FulfillmentEventLineItem (
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
 * A merchant-generated package/group of line items with fulfillment options.
 */
@Serializable
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
    public val options: List<OptionElement>? = null,

    /**
     * ID of the selected fulfillment option for this group.
     */
    @SerialName("selected_option_id")
    public val selectedOptionID: String? = null
)

/**
 * A fulfillment method (shipping or pickup) with destinations and groups.
 */
@Serializable
public data class FulfillmentMethod (
    /**
     * Available destinations. For shipping: addresses. For pickup: retail locations.
     */
    public val destinations: List<FulfillmentDestinationElement>? = null,

    /**
     * Fulfillment groups for selecting options. Agent sets selected_option_id on groups to
     * choose shipping method.
     */
    public val groups: List<GroupElement>? = null,

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
    public val type: TypeElement
)

/**
 * A fulfillment option within a group (e.g., Standard Shipping $5, Express $15).
 */
@Serializable
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
    public val totals: List<LineItemTotal>
)

/**
 * Maps a request identifier to the variant it resolved to, with match semantics.
 */
@Serializable
public data class InputCorrelation (
    /**
     * The identifier from the lookup request that resolved to this variant.
     */
    public val id: String,

    /**
     * How the request identifier resolved to this variant. Well-known values: `exact` (input
     * directly identifies this variant, e.g., variant ID, SKU), `featured` (server selected
     * this variant as representative, e.g., product ID resolved to best match). Businesses MAY
     * implement and provide additional resolution strategies.
     */
    public val match: String? = null
)

/**
 * A constraint within an allowed combination that defines which instrument types can fill
 * this group and how many are permitted.
 */
@Serializable
public data class InstrumentGroup (
    /**
     * Maximum number of instruments allowed from this group. Defaults to 1. MUST be greater
     * than or equal to `min`.
     */
    public val max: Long? = null,

    /**
     * Minimum number of instruments required from this group. Defaults to 0 (optional).
     */
    public val min: Long? = null,

    /**
     * Instrument types accepted by this group (OR logic). Any listed type qualifies.
     */
    public val types: List<String>
)

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
 * Line item object. Expected to use the currency of the parent object.
 */
@Serializable
public data class LineItem (
    public val id: String,
    public val item: ItemClass,

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
 * Merchant's fulfillment configuration.
 */
@Serializable
public data class MerchantFulfillmentConfig (
    /**
     * Allowed method type combinations.
     */
    @SerialName("allows_method_combinations")
    public val allowsMethodCombinations: List<List<TypeElement>>? = null,

    /**
     * Permits multiple destinations per method type.
     */
    @SerialName("allows_multi_destination")
    public val allowsMultiDestination: MerchantFulfillmentConfigAllowsMultiDestination? = null
)

/**
 * Permits multiple destinations per method type.
 */
@Serializable
public data class MerchantFulfillmentConfigAllowsMultiDestination (
    /**
     * Multiple pickup locations allowed.
     */
    public val pickup: Boolean? = null,

    /**
     * Multiple shipping destinations allowed.
     */
    public val shipping: Boolean? = null
)

/**
 * A selectable value for a product option.
 */
@Serializable
public data class OptionValue (
    /**
     * Optional server-assigned identifier for this option value. When present in a
     * selected_option, the server SHOULD use it for matching instead of label.
     */
    public val id: String? = null,

    /**
     * Display text for this option value (e.g., 'Small', 'Blue').
     */
    public val label: String
)

/**
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

@Serializable
public data class OrderLineItem (
    /**
     * Line item identifier.
     */
    public val id: String,

    /**
     * Product data (id, title, price, image_url).
     */
    public val item: ItemClass,

    /**
     * Parent line item identifier for any nested structures.
     */
    @SerialName("parent_id")
    public val parentID: String? = null,

    /**
     * Quantity tracking for the line item.
     */
    public val quantity: OrderLineItemQuantity,

    /**
     * Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
     * quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
     * quantity.fulfilled > 0, otherwise processing.
     */
    public val status: OrderLineItemStatus,

    /**
     * Line item totals breakdown.
     */
    public val totals: List<LineItemTotal>
)

/**
 * Quantity tracking for the line item.
 */
@Serializable
public data class OrderLineItemQuantity (
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
public enum class OrderLineItemStatus(public val value: String) {
    @SerialName("fulfilled") Fulfilled("fulfilled"),
    @SerialName("partial") Partial("partial"),
    @SerialName("processing") Processing("processing"),
    @SerialName("removed") Removed("removed");
}

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
 * Identity of a participant for token binding. The access_token uniquely identifies the
 * participant who tokens should be bound to.
 */
@Serializable
public data class PaymentIdentity (
    /**
     * Unique identifier for this participant, obtained during onboarding with the tokenizer.
     */
    @SerialName("access_token")
    public val accessToken: String
)

/**
 * The base definition for any payment instrument. It links the instrument to a specific
 * payment handler.
 */
@Serializable
public data class PaymentInstrument (
    /**
     * The billing address associated with this payment method.
     */
    @SerialName("billing_address")
    public val billingAddress: PostalAddress? = null,

    public val credential: CredentialClass? = null,

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
    public val type: String
)

/**
 * Platform's fulfillment configuration.
 */
@Serializable
public data class PlatformFulfillmentConfig (
    /**
     * Enables multiple groups per method.
     */
    @SerialName("supports_multi_group")
    public val supportsMultiGroup: Boolean? = null
)

/**
 * Price range filter denominated in context.currency. When context.currency matches the
 * presentment currency, businesses apply the filter directly. When it differs, businesses
 * SHOULD convert filter values to the presentment currency before applying; if conversion
 * is not supported, businesses MAY ignore the filter and SHOULD indicate this via a
 * message. When context.currency is absent, filter denomination is ambiguous and businesses
 * MAY ignore it.
 */
@Serializable
public data class PriceFilter (
    /**
     * Maximum price in ISO 4217 minor units.
     */
    public val max: Long? = null,

    /**
     * Minimum price in ISO 4217 minor units.
     */
    public val min: Long? = null
)

/**
 * A price range representing minimum and maximum values (e.g., across product variants).
 */
@Serializable
public data class PriceRange (
    /**
     * Maximum price in the range.
     */
    public val max: Price,

    /**
     * Minimum price in the range.
     */
    public val min: Price
)

/**
 * Maximum price in the range.
 *
 * Price with explicit currency.
 *
 * Minimum price in the range.
 *
 * List price before discounts (for strikethrough display).
 *
 * Current selling price.
 */
@Serializable
public data class Price (
    /**
     * Amount in ISO 4217 minor units. Use 0 for free items.
     */
    public val amount: Long,

    /**
     * ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP').
     */
    public val currency: String
)

/**
 * A product in the catalog with variants and options.
 */
@Serializable
public data class Product (
    /**
     * Product categories with optional taxonomy identifiers.
     */
    public val categories: List<CategoryElement>? = null,

    /**
     * Product description in one or more formats.
     */
    public val description: Description,

    /**
     * URL-safe slug for SEO-friendly URLs (e.g., 'blue-runner-pro'). Use id for stable API
     * references.
     */
    public val handle: String? = null,

    /**
     * Global ID (GID) uniquely identifying this product.
     */
    public val id: String,

    /**
     * List price range before discounts (for strikethrough display).
     */
    @SerialName("list_price_range")
    public val listPriceRange: ListPriceRangeClass? = null,

    /**
     * Product media (images, videos, 3D models). First item is the featured media for listings.
     */
    public val media: List<Media>? = null,

    /**
     * Business-defined custom data extending the standard product model.
     */
    public val metadata: JsonObject? = null,

    /**
     * Product options (Size, Color, etc.).
     */
    public val options: List<OptionClass>? = null,

    /**
     * Price range across all variants.
     */
    @SerialName("price_range")
    public val priceRange: ListPriceRangeClass,

    /**
     * Aggregate product rating.
     */
    public val rating: RatingClass? = null,

    /**
     * Product tags for categorization and search.
     */
    public val tags: List<String>? = null,

    /**
     * Product title.
     */
    public val title: String,

    /**
     * Canonical product page URL.
     */
    public val url: String? = null,

    /**
     * Purchasable variants of this product. First item is the featured variant for listings.
     */
    public val variants: List<VariantElement>
)

/**
 * A product category with optional taxonomy identifier.
 */
@Serializable
public data class CategoryElement (
    /**
     * Source taxonomy. Well-known values: `google_product_category`, `shopify`, `merchant`.
     */
    public val taxonomy: String? = null,

    /**
     * Category value or path (e.g., 'Apparel > Shirts', '1604').
     */
    public val value: String
)

/**
 * Product description in one or more formats.
 *
 * Description content in one or more formats. At least one format must be provided.
 *
 * Variant description in one or more formats.
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
 * List price range before discounts (for strikethrough display).
 *
 * A price range representing minimum and maximum values (e.g., across product variants).
 *
 * Price range across all variants.
 */
@Serializable
public data class ListPriceRangeClass (
    /**
     * Maximum price in the range.
     */
    public val max: Price,

    /**
     * Minimum price in the range.
     */
    public val min: Price
)

/**
 * Media item (image, video, etc.).
 */
@Serializable
public data class Media (
    /**
     * Accessibility text describing the media.
     */
    @SerialName("alt_text")
    public val altText: String? = null,

    /**
     * Height in pixels (for images/video).
     */
    public val height: Long? = null,

    /**
     * Media type. Well-known values: `image`, `video`, `model_3d`.
     */
    public val type: String,

    /**
     * URL to the media resource.
     */
    public val url: String,

    /**
     * Width in pixels (for images/video).
     */
    public val width: Long? = null
)

/**
 * A product option such as size, color, or material.
 */
@Serializable
public data class OptionClass (
    /**
     * Option name (e.g., 'Size', 'Color').
     */
    public val name: String,

    /**
     * Available values for this option.
     */
    public val values: List<ValueElement>
)

/**
 * A selectable value for a product option.
 */
@Serializable
public data class ValueElement (
    /**
     * Optional server-assigned identifier for this option value. When present in a
     * selected_option, the server SHOULD use it for matching instead of label.
     */
    public val id: String? = null,

    /**
     * Display text for this option value (e.g., 'Small', 'Blue').
     */
    public val label: String
)

/**
 * Aggregate product rating.
 *
 * Product rating aggregate.
 *
 * Variant rating.
 */
@Serializable
public data class RatingClass (
    /**
     * Number of reviews contributing to the rating.
     */
    public val count: Long? = null,

    /**
     * Maximum value on the rating scale (e.g., 5 for 5-star).
     */
    @SerialName("scale_max")
    public val scaleMax: Double,

    /**
     * Minimum value on the rating scale (e.g., 1 for 1-5 stars).
     */
    @SerialName("scale_min")
    public val scaleMin: Double? = null,

    /**
     * Average rating value.
     */
    public val value: Double
)

/**
 * A purchasable variant of a product with specific option selections.
 */
@Serializable
public data class VariantElement (
    /**
     * Variant availability for purchase.
     */
    public val availability: VariantAvailability? = null,

    /**
     * Industry-standard product identifiers for cross-reference and correlation.
     */
    public val barcodes: List<VariantBarcode>? = null,

    /**
     * Variant categories with optional taxonomy identifiers.
     */
    public val categories: List<CategoryElement>? = null,

    /**
     * Variant description in one or more formats.
     */
    public val description: Description,

    /**
     * URL-safe variant handle/slug.
     */
    public val handle: String? = null,

    /**
     * Global ID (GID) uniquely identifying this variant. Used as item.id in checkout.
     */
    public val id: String,

    /**
     * List price before discounts (for strikethrough display).
     */
    @SerialName("list_price")
    public val listPrice: Price? = null,

    /**
     * Variant media (images, videos, 3D models). First item is the featured media for listings.
     */
    public val media: List<Media>? = null,

    /**
     * Business-defined custom data extending the standard variant model.
     */
    public val metadata: JsonObject? = null,

    /**
     * Option values that define this variant (e.g., Color: Blue, Size: Large).
     */
    public val options: List<VariantOption>? = null,

    /**
     * Current selling price.
     */
    public val price: Price,

    /**
     * Variant rating.
     */
    public val rating: RatingClass? = null,

    /**
     * Optional seller context for this variant.
     */
    public val seller: VariantSeller? = null,

    /**
     * Business-assigned identifier for inventory and fulfillment.
     */
    public val sku: String? = null,

    /**
     * Variant tags for categorization and search.
     */
    public val tags: List<String>? = null,

    /**
     * Variant display title (e.g., 'Blue / Large').
     */
    public val title: String,

    /**
     * Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
     */
    @SerialName("unit_price")
    public val unitPrice: VariantUnitPrice? = null,

    /**
     * Canonical variant page URL.
     */
    public val url: String? = null
)

/**
 * Variant availability for purchase.
 */
@Serializable
public data class VariantAvailability (
    /**
     * Whether this variant can be purchased. See status for fulfillment details.
     */
    public val available: Boolean? = null,

    /**
     * Qualifies available with fulfillment state. Well-known values: `in_stock`, `backorder`,
     * `preorder`, `out_of_stock`, `discontinued`.
     */
    public val status: String? = null
)

@Serializable
public data class VariantBarcode (
    /**
     * Barcode standard. Well-known values: UPC, EAN, ISBN, GTIN, JAN.
     */
    public val type: String,

    /**
     * Barcode value.
     */
    public val value: String
)

/**
 * A specific option selection on a variant (e.g., Size: Large).
 */
@Serializable
public data class VariantOption (
    /**
     * Optional option value identifier from option_value.id. When present, the server SHOULD
     * use it for matching; name and label remain required for display.
     */
    public val id: String? = null,

    /**
     * Selected option label (e.g., 'Large').
     */
    public val label: String,

    /**
     * Option name (e.g., 'Size').
     */
    public val name: String
)

/**
 * Optional seller context for this variant.
 */
@Serializable
public data class VariantSeller (
    /**
     * Seller policy and information links.
     */
    public val links: List<Link>? = null,

    /**
     * Seller display name.
     */
    public val name: String? = null
)

/**
 * Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
 */
@Serializable
public data class VariantUnitPrice (
    /**
     * Unit price in ISO 4217 minor units. Business MUST return precomputed unit price value:
     * (variant.price / measure.value) * reference.value.
     */
    public val amount: Long,

    /**
     * ISO 4217 currency code.
     */
    public val currency: String,

    /**
     * Product quantity in packaging (e.g., 750ml bottle).
     */
    public val measure: PurpleMeasure,

    /**
     * Denominator for unit price display (e.g., per 100ml, per 1kg).
     */
    public val reference: PurpleReference
)

/**
 * Product quantity in packaging (e.g., 750ml bottle).
 */
@Serializable
public data class PurpleMeasure (
    /**
     * Unit of measurement.
     */
    public val unit: String,

    /**
     * Package quantity.
     */
    public val value: Double
)

/**
 * Denominator for unit price display (e.g., per 100ml, per 1kg).
 */
@Serializable
public data class PurpleReference (
    /**
     * Unit of measurement.
     */
    public val unit: String,

    /**
     * Reference quantity.
     */
    public val value: Long
)

/**
 * A product option such as size, color, or material.
 */
@Serializable
public data class ProductOption (
    /**
     * Option name (e.g., 'Size', 'Color').
     */
    public val name: String,

    /**
     * Available values for this option.
     */
    public val values: List<ValueElement>
)

/**
 * Product rating aggregate.
 */
@Serializable
public data class Rating (
    /**
     * Number of reviews contributing to the rating.
     */
    public val count: Long? = null,

    /**
     * Maximum value on the rating scale (e.g., 5 for 5-star).
     */
    @SerialName("scale_max")
    public val scaleMax: Double,

    /**
     * Minimum value on the rating scale (e.g., 1 for 1-5 stars).
     */
    @SerialName("scale_min")
    public val scaleMin: Double? = null,

    /**
     * Average rating value.
     */
    public val value: Double
)

/**
 * A pickup location (retail store, locker, etc.).
 */
@Serializable
public data class RetailLocation (
    /**
     * Physical address of the location.
     */
    public val address: PostalAddress? = null,

    /**
     * Unique location identifier.
     */
    public val id: String,

    /**
     * Location name (e.g., store name).
     */
    public val name: String
)

/**
 * Filter criteria to narrow search results. All specified filters combine with AND logic.
 */
@Serializable
public data class SearchFilters (
    /**
     * Filter by product categories (OR logic — matches products in any listed categories).
     * Values match against the value field in product category entries. Valid values can be
     * discovered from the categories field in search results, merchant documentation, or
     * standard taxonomies that businesses may align with.
     */
    public val categories: List<String>? = null,

    public val price: PriceClass? = null
)

/**
 * Price range filter denominated in context.currency. When context.currency matches the
 * presentment currency, businesses apply the filter directly. When it differs, businesses
 * SHOULD convert filter values to the presentment currency before applying; if conversion
 * is not supported, businesses MAY ignore the filter and SHOULD indicate this via a
 * message. When context.currency is absent, filter denomination is ambiguous and businesses
 * MAY ignore it.
 */
@Serializable
public data class PriceClass (
    /**
     * Maximum price in ISO 4217 minor units.
     */
    public val max: Long? = null,

    /**
     * Minimum price in ISO 4217 minor units.
     */
    public val min: Long? = null
)

/**
 * A specific option selection on a variant (e.g., Size: Large).
 */
@Serializable
public data class SelectedOption (
    /**
     * Optional option value identifier from option_value.id. When present, the server SHOULD
     * use it for matching; name and label remain required for display.
     */
    public val id: String? = null,

    /**
     * Selected option label (e.g., 'Large').
     */
    public val label: String,

    /**
     * Option name (e.g., 'Size').
     */
    public val name: String
)

/**
 * Shipping destination.
 *
 * The billing address associated with this payment method.
 *
 * Delivery destination address.
 *
 * Physical address of the location.
 */
@Serializable
public data class ShippingDestination (
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
     */
    public val id: String
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
 * Base token credential schema. Concrete payment handlers may extend this schema with
 * additional fields and define their own constraints.
 *
 * The base definition for any payment credential. Handlers define specific credential types.
 */
@Serializable
public data class TokenCredential (
    /**
     * The credential type discriminator. Specific schemas will constrain this to a constant
     * value.
     *
     * The specific type of token produced by the handler (e.g., 'stripe_token').
     */
    public val type: String,

    /**
     * The token value.
     */
    public val token: String
)

/**
 * A cost breakdown entry with a category, amount, and optional display text.
 */
@Serializable
public data class Total (
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
 * Pricing breakdown provided by the business. MUST contain exactly one subtotal and one
 * total entry. Detail types (tax, fee, discount, fulfillment) may appear multiple times for
 * itemization. Platforms MUST render all entries in order using display_text and amount.
 *
 * A cost breakdown entry with a category, amount, and optional display text.
 */
@Serializable
public data class TotalElement (
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
    public val lines: List<TotalLineClass>? = null
)

/**
 * Sub-line entry. Additional metadata MAY be included.
 */
@Serializable
public data class TotalLineClass (
    public val amount: Long,

    /**
     * Human-readable label for this sub-line.
     */
    @SerialName("display_text")
    public val displayText: String
)

/**
 * A purchasable variant of a product with specific option selections.
 */
@Serializable
public data class Variant (
    /**
     * Variant availability for purchase.
     */
    public val availability: VariantAvailabilityClass? = null,

    /**
     * Industry-standard product identifiers for cross-reference and correlation.
     */
    public val barcodes: List<VariantBarcodeClass>? = null,

    /**
     * Variant categories with optional taxonomy identifiers.
     */
    public val categories: List<CategoryElement>? = null,

    /**
     * Variant description in one or more formats.
     */
    public val description: Description,

    /**
     * URL-safe variant handle/slug.
     */
    public val handle: String? = null,

    /**
     * Global ID (GID) uniquely identifying this variant. Used as item.id in checkout.
     */
    public val id: String,

    /**
     * List price before discounts (for strikethrough display).
     */
    @SerialName("list_price")
    public val listPrice: Price? = null,

    /**
     * Variant media (images, videos, 3D models). First item is the featured media for listings.
     */
    public val media: List<Media>? = null,

    /**
     * Business-defined custom data extending the standard variant model.
     */
    public val metadata: JsonObject? = null,

    /**
     * Option values that define this variant (e.g., Color: Blue, Size: Large).
     */
    public val options: List<VariantOption>? = null,

    /**
     * Current selling price.
     */
    public val price: Price,

    /**
     * Variant rating.
     */
    public val rating: RatingClass? = null,

    /**
     * Optional seller context for this variant.
     */
    public val seller: VariantSellerClass? = null,

    /**
     * Business-assigned identifier for inventory and fulfillment.
     */
    public val sku: String? = null,

    /**
     * Variant tags for categorization and search.
     */
    public val tags: List<String>? = null,

    /**
     * Variant display title (e.g., 'Blue / Large').
     */
    public val title: String,

    /**
     * Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
     */
    @SerialName("unit_price")
    public val unitPrice: VariantUnitPriceClass? = null,

    /**
     * Canonical variant page URL.
     */
    public val url: String? = null
)

/**
 * Variant availability for purchase.
 */
@Serializable
public data class VariantAvailabilityClass (
    /**
     * Whether this variant can be purchased. See status for fulfillment details.
     */
    public val available: Boolean? = null,

    /**
     * Qualifies available with fulfillment state. Well-known values: `in_stock`, `backorder`,
     * `preorder`, `out_of_stock`, `discontinued`.
     */
    public val status: String? = null
)

@Serializable
public data class VariantBarcodeClass (
    /**
     * Barcode standard. Well-known values: UPC, EAN, ISBN, GTIN, JAN.
     */
    public val type: String,

    /**
     * Barcode value.
     */
    public val value: String
)

/**
 * Optional seller context for this variant.
 */
@Serializable
public data class VariantSellerClass (
    /**
     * Seller policy and information links.
     */
    public val links: List<Link>? = null,

    /**
     * Seller display name.
     */
    public val name: String? = null
)

/**
 * Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
 */
@Serializable
public data class VariantUnitPriceClass (
    /**
     * Unit price in ISO 4217 minor units. Business MUST return precomputed unit price value:
     * (variant.price / measure.value) * reference.value.
     */
    public val amount: Long,

    /**
     * ISO 4217 currency code.
     */
    public val currency: String,

    /**
     * Product quantity in packaging (e.g., 750ml bottle).
     */
    public val measure: FluffyMeasure,

    /**
     * Denominator for unit price display (e.g., per 100ml, per 1kg).
     */
    public val reference: FluffyReference
)

/**
 * Product quantity in packaging (e.g., 750ml bottle).
 */
@Serializable
public data class FluffyMeasure (
    /**
     * Unit of measurement.
     */
    public val unit: String,

    /**
     * Package quantity.
     */
    public val value: Double
)

/**
 * Denominator for unit price display (e.g., per 100ml, per 1kg).
 */
@Serializable
public data class FluffyReference (
    /**
     * Unit of measurement.
     */
    public val unit: String,

    /**
     * Reference quantity.
     */
    public val value: Long
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
    public val instruments: List<PaymentSelectedPaymentInstrument>? = null
)

/**
 * Order schema with line items, buyer-facing fulfillment expectations, and event logs.
 */
@Serializable
public data class Order (
    /**
     * Post-order events (refunds, returns, credits, disputes, cancellations, etc.) that exist
     * independently of fulfillment.
     */
    public val adjustments: List<AdjustmentElement>? = null,

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
    public val fulfillment: FulfillmentClass,

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
    public val lineItems: List<LineItemElement>,

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
public data class AdjustmentElement (
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
    public val lineItems: List<AdjustmentLineItemClass>? = null,

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
public data class AdjustmentLineItemClass (
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
 * Fulfillment data: buyer expectations and what actually happened.
 */
@Serializable
public data class FulfillmentClass (
    /**
     * Append-only event log of actual shipments. Each event references line items by ID.
     */
    public val events: List<EventElement>? = null,

    /**
     * Buyer-facing groups representing when/how items will be delivered. Can be split, merged,
     * or adjusted post-order.
     */
    public val expectations: List<ExpectationElement>? = null
)

/**
 * Append-only fulfillment event representing an actual shipment. References line items by
 * ID.
 */
@Serializable
public data class EventElement (
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
public data class ExpectationElement (
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
    public val lineItems: List<ExpectationLineItemClass>,

    /**
     * Delivery method type (shipping, pickup, digital).
     */
    @SerialName("method_type")
    public val methodType: MethodType
)

@Serializable
public data class ExpectationLineItemClass (
    /**
     * Line item ID reference.
     */
    public val id: String,

    /**
     * Quantity of this item in this expectation.
     */
    public val quantity: Long
)

@Serializable
public data class LineItemElement (
    /**
     * Line item identifier.
     */
    public val id: String,

    /**
     * Product data (id, title, price, image_url).
     */
    public val item: ItemClass,

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
    public val status: OrderLineItemStatus,

    /**
     * Line item totals breakdown.
     */
    public val totals: List<LineItemTotal>
)

/**
 * Quantity tracking for the line item.
 */
@Serializable
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
    public val total: Long
)

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
    public val payment: InstrumentsChangePayment? = null
)

/**
 * Payment instruments with selected instrument ID.
 *
 * Payment instruments from host.
 */
@Serializable
public data class InstrumentsChangePayment (
    /**
     * Available payment instruments.
     */
    public val instruments: List<PurpleSelectedPaymentInstrument>? = null,

    /**
     * ID of the selected payment instrument.
     */
    @SerialName("selected_instrument_id")
    public val selectedInstrumentID: String? = null
)

/**
 * A payment instrument with selection state.
 *
 * The base definition for any payment instrument. It links the instrument to a specific
 * payment handler.
 */
@Serializable
public data class PurpleSelectedPaymentInstrument (
    /**
     * The billing address associated with this payment method.
     */
    @SerialName("billing_address")
    public val billingAddress: PostalAddress? = null,

    public val credential: CredentialClass? = null,

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
    public val services: Map<String, List<PurpleService>>? = null,

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
public data class PurpleService (
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
    public val payment: CredentialPayment? = null
)

/**
 * Payment instruments from host.
 */
@Serializable
public data class CredentialPayment (
    /**
     * Available payment instruments.
     */
    public val instruments: List<PurpleSelectedPaymentInstrument>? = null
)
