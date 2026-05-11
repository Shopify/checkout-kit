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
// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To regenerate: protocol/scripts/generate_models.sh --lang kotlin
//
// To parse the JSON, install kotlin's serialization plugin and do:
//
// val json                       = Json { allowStructuredMapKeys = true }
// val checkout                   = json.parse(Checkout.serializer(), jsonString)
// val paymentAccountInfo         = json.parse(PaymentAccountInfo.serializer(), jsonString)
// val adjustment                 = json.parse(Adjustment.serializer(), jsonString)
// val binding                    = json.parse(TokenBinding.serializer(), jsonString)
// val businessFulfillmentConfig  = json.parse(BusinessFulfillmentConfig.serializer(), jsonString)
// val buyer                      = json.parse(Buyer.serializer(), jsonString)
// val cardCredential             = json.parse(CardCredential.serializer(), jsonString)
// val cardPaymentInstrument      = json.parse(CardPaymentInstrument.serializer(), jsonString)
// val context                    = json.parse(Context.serializer(), jsonString)
// val errorCode                  = json.parse(ErrorCode.serializer(), jsonString)
// val expectation                = json.parse(Expectation.serializer(), jsonString)
// val fulfillmentAvailableMethod = json.parse(FulfillmentAvailableMethod.serializer(), jsonString)
// val fulfillmentDestination     = json.parse(FulfillmentDestination.serializer(), jsonString)
// val fulfillmentEvent           = json.parse(FulfillmentEvent.serializer(), jsonString)
// val fulfillmentGroup           = json.parse(FulfillmentGroup.serializer(), jsonString)
// val fulfillmentMethod          = json.parse(FulfillmentMethod.serializer(), jsonString)
// val fulfillmentOption          = json.parse(FulfillmentOption.serializer(), jsonString)
// val fulfillment                = json.parse(Fulfillment.serializer(), jsonString)
// val item                       = json.parse(Item.serializer(), jsonString)
// val lineItem                   = json.parse(LineItem.serializer(), jsonString)
// val link                       = json.parse(Link.serializer(), jsonString)
// val merchantFulfillmentConfig  = json.parse(MerchantFulfillmentConfig.serializer(), jsonString)
// val messageError               = json.parse(MessageError.serializer(), jsonString)
// val messageInfo                = json.parse(MessageInfo.serializer(), jsonString)
// val messageWarning             = json.parse(MessageWarning.serializer(), jsonString)
// val message                    = json.parse(Message.serializer(), jsonString)
// val orderConfirmation          = json.parse(OrderConfirmation.serializer(), jsonString)
// val orderLineItem              = json.parse(OrderLineItem.serializer(), jsonString)
// val paymentCredential          = json.parse(PaymentCredential.serializer(), jsonString)
// val paymentIdentity            = json.parse(PaymentIdentity.serializer(), jsonString)
// val paymentInstrument          = json.parse(PaymentInstrument.serializer(), jsonString)
// val platformFulfillmentConfig  = json.parse(PlatformFulfillmentConfig.serializer(), jsonString)
// val postalAddress              = json.parse(PostalAddress.serializer(), jsonString)
// val retailLocation             = json.parse(RetailLocation.serializer(), jsonString)
// val shippingDestination        = json.parse(ShippingDestination.serializer(), jsonString)
// val tokenCredential            = json.parse(TokenCredential.serializer(), jsonString)
// val total                      = json.parse(Total.serializer(), jsonString)
// val payment                    = json.parse(Payment.serializer(), jsonString)
// val order                      = json.parse(Order.serializer(), jsonString)
// val instrumentsChangeResult    = json.parse(InstrumentsChangeResult.serializer(), jsonString)
// val credentialResult           = json.parse(CredentialResult.serializer(), jsonString)

package com.shopify.checkoutkit

import kotlinx.serialization.*
import kotlinx.serialization.json.*
import kotlinx.serialization.descriptors.*
import kotlinx.serialization.encoding.*

public typealias ErrorCode = String

/**
 * Base checkout schema. Extensions compose onto this using allOf.
 */
@Serializable
public data class Checkout (
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
    public val links: List<LinkElement>,

    /**
     * List of messages with error and info about the checkout session state.
     */
    public val messages: List<MessageElement>? = null,

    /**
     * Details about an order created for this checkout session.
     */
    public val order: OrderClass? = null,

    public val payment: PaymentClass? = null,

    /**
     * Checkout state indicating the current phase and required action. See Checkout Status
     * lifecycle documentation for state transition details.
     */
    public val status: CheckoutStatus,

    /**
     * Different cart totals.
     */
    public val totals: List<TotalElement>,

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
 * Provisional buyer signals for relevance and localization: product availability, pricing,
 * currency, tax, shipping, payment methods, and eligibility (e.g., student or affiliation
 * discounts). Businesses SHOULD use these values when authoritative data (e.g., address) is
 * absent, and MAY ignore unsupported values without returning errors. Context SHOULD be
 * non-identifying and can be disclosed progressively—coarse signals early, finer resolution
 * as the session progresses. Higher-resolution data (shipping address, billing address)
 * supersedes context. Platforms SHOULD progressively enhance context throughout the buyer
 * journey.
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
     * Background context describing buyer's intent (e.g., 'looking for a gift under $50', 'need
     * something durable for outdoor use'). Informs relevance, recommendations, and
     * personalization.
     */
    public val intent: String? = null,

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
    public val totals: List<TotalElement>
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
     * Unit price in minor (cents) currency units.
     */
    public val price: Long,

    /**
     * Product title.
     */
    public val title: String
)

@Serializable
public data class TotalElement (
    /**
     * If type == total, sums subtotal - discount + fulfillment + tax + fee. Should be >= 0.
     * Amount in minor (cents) currency units.
     */
    public val amount: Long,

    /**
     * Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
     * 'Delivery').
     */
    @SerialName("display_text")
    public val displayText: String? = null,

    /**
     * Type of total categorization.
     */
    public val type: TotalType
)

/**
 * Type of total categorization.
 */
@Serializable
public enum class TotalType(public val value: String) {
    @SerialName("discount") Discount("discount"),
    @SerialName("fee") Fee("fee"),
    @SerialName("fulfillment") Fulfillment("fulfillment"),
    @SerialName("items_discount") ItemsDiscount("items_discount"),
    @SerialName("subtotal") Subtotal("subtotal"),
    @SerialName("tax") Tax("tax"),
    @SerialName("total") Total("total");
}

@Serializable
public data class LinkElement (
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
public data class MessageElement (
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
     * Declares who resolves this error. 'recoverable': agent can fix via API.
     * 'requires_buyer_input': merchant requires information their API doesn't support
     * collecting programmatically (checkout incomplete). 'requires_buyer_review': buyer must
     * authorize before order placement due to policy, regulatory, or entitlement rules
     * (checkout complete). Errors with 'requires_*' severity contribute to 'status:
     * requires_escalation'.
     */
    public val severity: Severity? = null,

    /**
     * Message type discriminator.
     */
    public val type: MessageType
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
 * Declares who resolves this error. 'recoverable': agent can fix via API.
 * 'requires_buyer_input': merchant requires information their API doesn't support
 * collecting programmatically (checkout incomplete). 'requires_buyer_review': buyer must
 * authorize before order placement due to policy, regulatory, or entitlement rules
 * (checkout complete). Errors with 'requires_*' severity contribute to 'status:
 * requires_escalation'.
 */
@Serializable
public enum class Severity(public val value: String) {
    @SerialName("recoverable") Recoverable("recoverable"),
    @SerialName("requires_buyer_input") RequiresBuyerInput("requires_buyer_input"),
    @SerialName("requires_buyer_review") RequiresBuyerReview("requires_buyer_review");
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
    public val billingAddress: BillingAddressClass? = null,

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
public data class BillingAddressClass (
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
@Serializable
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
    public val version: String
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
 * Per-checkout configuration for embedded transport binding. Allows businesses to vary ECP
 * availability and delegations based on cart contents, agent authorization, or policy.
 */
@Serializable
public data class EmbeddedTransportConfig (
    /**
     * Delegations the business allows. At service-level, declares available delegations. In
     * checkout responses, confirms accepted delegations for this session.
     */
    public val delegate: List<String>? = null
)

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
 * Append-only event that exists independently of fulfillment. Typically represents money
 * movements but can be any post-order change. Polymorphic type that can optionally
 * reference line items.
 */
@Serializable
public data class Adjustment (
    /**
     * Amount in minor units (cents) for refunds, credits, price adjustments (optional).
     */
    public val amount: Long? = null,

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
     * Quantity affected by this adjustment.
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
    public val type: TypeEnum,

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
 * Error code identifying the type of error. Standard errors are defined in specification
 * (see examples), and have standardized semantics; freeform codes are permitted.
 */
@Serializable
public enum class TypeEnum(public val value: String) {
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
    public val billingAddress: BillingAddressClass? = null,

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
    public val type: TypeEnum
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
 * Provisional buyer signals for relevance and localization: product availability, pricing,
 * currency, tax, shipping, payment methods, and eligibility (e.g., student or affiliation
 * discounts). Businesses SHOULD use these values when authoritative data (e.g., address) is
 * absent, and MAY ignore unsupported values without returning errors. Context SHOULD be
 * non-identifying and can be disclosed progressively—coarse signals early, finer resolution
 * as the session progresses. Higher-resolution data (shipping address, billing address)
 * supersedes context. Platforms SHOULD progressively enhance context throughout the buyer
 * journey.
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
     * Background context describing buyer's intent (e.g., 'looking for a gift under $50', 'need
     * something durable for outdoor use'). Informs relevance, recommendations, and
     * personalization.
     */
    public val intent: String? = null,

    /**
     * The postal code. For example, 94043. Optional hint for regional
     * refinement—higher-resolution data (e.g., shipping address) supersedes this value.
     */
    @SerialName("postal_code")
    public val postalCode: String? = null
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
    public val destination: BillingAddressClass,

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
    public val address: BillingAddressClass? = null,

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
    public val totals: List<TotalElement>
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
    public val address: BillingAddressClass? = null,

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
    public val totals: List<TotalElement>
)

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
     * Unit price in minor (cents) currency units.
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
    public val totals: List<TotalElement>
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

@Serializable
public data class MessageError (
    public val code: String,

    /**
     * Human-readable message.
     */
    public val content: String,

    /**
     * Content format, default = plain.
     */
    @SerialName("content_type")
    public val contentType: ContentType? = null,

    /**
     * RFC 9535 JSONPath to the component the message refers to (e.g., $.items[1]).
     */
    public val path: String? = null,

    /**
     * Declares who resolves this error. 'recoverable': agent can fix via API.
     * 'requires_buyer_input': merchant requires information their API doesn't support
     * collecting programmatically (checkout incomplete). 'requires_buyer_review': buyer must
     * authorize before order placement due to policy, regulatory, or entitlement rules
     * (checkout complete). Errors with 'requires_*' severity contribute to 'status:
     * requires_escalation'.
     */
    public val severity: Severity,

    /**
     * Message type discriminator.
     */
    public val type: MessageErrorType
)

@Serializable
public enum class MessageErrorType(public val value: String) {
    @SerialName("error") Error("error");
}

@Serializable
public data class MessageInfo (
    /**
     * Info code for programmatic handling.
     */
    public val code: String? = null,

    /**
     * Human-readable message.
     */
    public val content: String,

    /**
     * Content format, default = plain.
     */
    @SerialName("content_type")
    public val contentType: ContentType? = null,

    /**
     * RFC 9535 JSONPath to the component the message refers to.
     */
    public val path: String? = null,

    /**
     * Message type discriminator.
     */
    public val type: MessageInfoType
)

@Serializable
public enum class MessageInfoType(public val value: String) {
    @SerialName("info") Info("info");
}

@Serializable
public data class MessageWarning (
    /**
     * Warning code. Machine-readable identifier for the warning type (e.g., final_sale, prop65,
     * fulfillment_changed, age_restricted, etc.).
     */
    public val code: String,

    /**
     * Human-readable warning message that MUST be displayed.
     */
    public val content: String,

    /**
     * Content format, default = plain.
     */
    @SerialName("content_type")
    public val contentType: ContentType? = null,

    /**
     * JSONPath (RFC 9535) to related field (e.g., $.line_items[0]).
     */
    public val path: String? = null,

    /**
     * Message type discriminator.
     */
    public val type: MessageWarningType
)

@Serializable
public enum class MessageWarningType(public val value: String) {
    @SerialName("warning") Warning("warning");
}

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
     * Declares who resolves this error. 'recoverable': agent can fix via API.
     * 'requires_buyer_input': merchant requires information their API doesn't support
     * collecting programmatically (checkout incomplete). 'requires_buyer_review': buyer must
     * authorize before order placement due to policy, regulatory, or entitlement rules
     * (checkout complete). Errors with 'requires_*' severity contribute to 'status:
     * requires_escalation'.
     */
    public val severity: Severity? = null,

    /**
     * Message type discriminator.
     */
    public val type: MessageType
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
     * Quantity tracking. Both total and fulfilled are derived from events.
     */
    public val quantity: OrderLineItemQuantity,

    /**
     * Derived status: fulfilled if quantity.fulfilled == quantity.total, partial if
     * quantity.fulfilled > 0, otherwise processing.
     */
    public val status: OrderLineItemStatus,

    /**
     * Line item totals breakdown.
     */
    public val totals: List<TotalElement>
)

/**
 * Quantity tracking. Both total and fulfilled are derived from events.
 */
@Serializable
public data class OrderLineItemQuantity (
    /**
     * Quantity fulfilled (sum from fulfillment events).
     */
    public val fulfilled: Long,

    /**
     * Current total quantity.
     */
    public val total: Long
)

/**
 * Derived status: fulfilled if quantity.fulfilled == quantity.total, partial if
 * quantity.fulfilled > 0, otherwise processing.
 */
@Serializable
public enum class OrderLineItemStatus(public val value: String) {
    @SerialName("fulfilled") Fulfilled("fulfilled"),
    @SerialName("partial") Partial("partial"),
    @SerialName("processing") Processing("processing");
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
    public val billingAddress: BillingAddressClass? = null,

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
 * A pickup location (retail store, locker, etc.).
 */
@Serializable
public data class RetailLocation (
    /**
     * Physical address of the location.
     */
    public val address: BillingAddressClass? = null,

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

@Serializable
public data class Total (
    /**
     * If type == total, sums subtotal - discount + fulfillment + tax + fee. Should be >= 0.
     * Amount in minor (cents) currency units.
     */
    public val amount: Long,

    /**
     * Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
     * 'Delivery').
     */
    @SerialName("display_text")
    public val displayText: String? = null,

    /**
     * Type of total categorization.
     */
    public val type: TotalType
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
 * Order schema with immutable line items, buyer-facing fulfillment expectations, and
 * append-only event logs.
 */
@Serializable
public data class Order (
    /**
     * Append-only event log of money movements (refunds, returns, credits, disputes,
     * cancellations, etc.) that exist independently of fulfillment.
     */
    public val adjustments: List<AdjustmentElement>? = null,

    /**
     * Associated checkout ID for reconciliation.
     */
    @SerialName("checkout_id")
    public val checkoutID: String,

    /**
     * Fulfillment data: buyer expectations and what actually happened.
     */
    public val fulfillment: FulfillmentClass,

    /**
     * Unique order identifier.
     */
    public val id: String,

    /**
     * Immutable line items — source of truth for what was ordered.
     */
    @SerialName("line_items")
    public val lineItems: List<LineItemElement>,

    /**
     * Permalink to access the order on merchant site.
     */
    @SerialName("permalink_url")
    public val permalinkURL: String,

    /**
     * Different totals for the order.
     */
    public val totals: List<TotalElement>,

    public val ucp: UCPOrderResponseSchema
)

/**
 * Append-only event that exists independently of fulfillment. Typically represents money
 * movements but can be any post-order change. Polymorphic type that can optionally
 * reference line items.
 */
@Serializable
public data class AdjustmentElement (
    /**
     * Amount in minor units (cents) for refunds, credits, price adjustments (optional).
     */
    public val amount: Long? = null,

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
     * Quantity affected by this adjustment.
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
    public val destination: BillingAddressClass,

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
     * Quantity tracking. Both total and fulfilled are derived from events.
     */
    public val quantity: LineItemQuantity,

    /**
     * Derived status: fulfilled if quantity.fulfilled == quantity.total, partial if
     * quantity.fulfilled > 0, otherwise processing.
     */
    public val status: OrderLineItemStatus,

    /**
     * Line item totals breakdown.
     */
    public val totals: List<TotalElement>
)

/**
 * Quantity tracking. Both total and fulfilled are derived from events.
 */
@Serializable
public data class LineItemQuantity (
    /**
     * Quantity fulfilled (sum from fulfillment events).
     */
    public val fulfilled: Long,

    /**
     * Current total quantity.
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
    public val services: Map<String, List<Service>>? = null,

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
 * Checkout state after instrument selection.
 */
@Serializable
public data class InstrumentsChangeResult (
    /**
     * Partial checkout update with payment instrument selection.
     */
    public val checkout: InstrumentsChangeCheckout
)

/**
 * Partial checkout update with payment instrument selection.
 */
@Serializable
public data class InstrumentsChangeCheckout (
    public val payment: InstrumentsChangePayment? = null
)

@Serializable
public data class InstrumentsChangePayment (
    public val instruments: List<SelectedPaymentInstrument>? = null,

    /**
     * ID of the selected payment instrument.
     */
    @SerialName("selected_instrument_id")
    public val selectedInstrumentID: String? = null
)

/**
 * Checkout state with payment credential ready for completion.
 */
@Serializable
public data class CredentialResult (
    /**
     * Partial checkout update with payment credential.
     */
    public val checkout: CredentialCheckout
)

/**
 * Partial checkout update with payment credential.
 */
@Serializable
public data class CredentialCheckout (
    public val payment: CredentialPayment? = null
)

@Serializable
public data class CredentialPayment (
    public val instruments: List<SelectedPaymentInstrument>? = null
)
