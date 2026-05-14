/*
MIT License

Copyright 2023 - Present, Shopify Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * Unit price in ISO 4217 minor units.
 *
 * Monetary amount in the currency's minor unit as defined by ISO 4217. Refer to the
 * currency's exponent to determine minor-to-major ratio (e.g., 2 for USD, 0 for JPY, 3 for
 * KWD).
 */
export type Amount = number;

/**
 * Error code identifying the type of error. Standard errors are defined in specification
 * (see examples), and have standardized semantics; freeform codes are permitted.
 */
export type ErrorCode = string;

/**
 * Reverse-domain identifier used for collision-safe namespacing of capabilities, services,
 * handlers, eligibility claims, and extension-contributed keys. Must contain at least two
 * dot-separated segments (e.g., 'dev.ucp.shopping.checkout', 'com.example.loyalty_gold').
 */
export type ReverseDomainName = string;

/**
 * Monetary amount in the currency's minor unit as defined by ISO 4217. Refer to the
 * currency's exponent to determine minor-to-major ratio (e.g., 2 for USD, 0 for JPY, 3 for
 * KWD). May be negative — the sign is intrinsic to the value (e.g., discounts are negative,
 * charges are positive).
 */
export type SignedAmount = number;

/**
 * Base checkout schema. Extensions compose onto this using allOf.
 */
export interface Checkout {
    /**
     * Representation of the buyer.
     */
    buyer?:   BuyerObject;
    context?: ContextObject;
    /**
     * URL for checkout handoff and session recovery. MUST be provided when status is
     * requires_escalation. See specification for format and availability requirements.
     */
    continueUrl?: string;
    /**
     * ISO 4217 currency code reflecting the merchant's market determination. Derived from
     * address, context, and geo IP—buyers provide signals, merchants determine currency.
     */
    currency: string;
    /**
     * RFC 3339 expiry timestamp. Default TTL is 6 hours from creation if not sent.
     */
    expiresAt?: string;
    /**
     * Unique identifier of the checkout session.
     */
    id: string;
    /**
     * List of line items being checked out.
     */
    lineItems: CheckoutLineItem[];
    /**
     * Links to be displayed by the platform (Privacy Policy, TOS). Mandatory for legal
     * compliance.
     */
    links: LinkElement[];
    /**
     * List of messages with error and info about the checkout session state.
     */
    messages?: MessageElement[];
    /**
     * Details about an order created for this checkout session.
     */
    order?:   OrderObject;
    payment?: PaymentObject;
    signals?: SignalsObject;
    /**
     * Checkout state indicating the current phase and required action. See Checkout Status
     * lifecycle documentation for state transition details.
     */
    status: CheckoutStatus;
    /**
     * Different cart totals.
     */
    totals: CheckoutTotal[];
    ucp:    UcpCheckoutResponseSchema;
    [property: string]: any;
}

/**
 * Representation of the buyer.
 */
export interface BuyerObject {
    /**
     * Email of the buyer.
     */
    email?: string;
    /**
     * First name of the buyer.
     */
    firstName?: string;
    /**
     * Last name of the buyer.
     */
    lastName?: string;
    /**
     * E.164 standard.
     */
    phoneNumber?: string;
    [property: string]: any;
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
 */
export interface ContextObject {
    /**
     * The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
     * For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
     * full country name such as "Singapore" can also be used. Optional hint for market context
     * (currency, availability, pricing)—higher-resolution data (e.g., shipping address)
     * supersedes this value.
     */
    addressCountry?: string;
    /**
     * The region in which the locality is, and which is in the country. For example, California
     * or another appropriate first-level Administrative division. Optional hint for progressive
     * localization—higher-resolution data (e.g., shipping address) supersedes this value.
     */
    addressRegion?: string;
    /**
     * Preferred currency (ISO 4217, e.g., 'EUR', 'USD'). Businesses determine presentment
     * currency from context and authoritative signals; this hint MAY inform selection in
     * multi-currency markets. Also serves as the denomination for price filter values —
     * platforms SHOULD include this field when sending price filters. Response prices include
     * explicit currency confirming the resolution.
     */
    currency?: string;
    /**
     * Buyer claims about eligible benefits such as loyalty membership, payment instrument
     * perks, and similar. Recognized claims MAY inform the Business response (e.g., member-only
     * product availability, adjusted pricing in catalog, provisional discounts at cart or
     * checkout). Businesses MUST ignore unrecognized values without error. Values MUST use
     * reverse-domain naming (e.g., 'com.example.loyalty_gold', 'org.school.student') and MUST
     * be non-identifying.
     */
    eligibility?: string[];
    /**
     * Background context describing buyer's intent (e.g., 'looking for a gift under $50', 'need
     * something durable for outdoor use'). Informs relevance, recommendations, and
     * personalization.
     */
    intent?: string;
    /**
     * Preferred language for content. Use IETF BCP 47 language tags (e.g., 'en', 'fr-CA',
     * 'zh-Hans'). For REST, equivalent to Accept-Language header—platforms SHOULD fall back to
     * Accept-Language when this field is absent; when provided, overrides Accept-Language.
     * Businesses MAY return content in a different language if unavailable.
     */
    language?: string;
    /**
     * The postal code. For example, 94043. Optional hint for regional
     * refinement—higher-resolution data (e.g., shipping address) supersedes this value.
     */
    postalCode?: string;
    [property: string]: any;
}

/**
 * Line item object. Expected to use the currency of the parent object.
 */
export interface CheckoutLineItem {
    id:   string;
    item: ItemObject;
    /**
     * Parent line item identifier for any nested structures.
     */
    parentId?: string;
    /**
     * Quantity of the item being purchased.
     */
    quantity: number;
    /**
     * Line item totals breakdown.
     */
    totals: LineItemTotal[];
    [property: string]: any;
}

/**
 * Product data (id, title, price, image_url).
 */
export interface ItemObject {
    /**
     * The product identifier, often the SKU, required to resolve the product details associated
     * with this line item. Should be recognized by both the Platform, and the Business.
     */
    id: string;
    /**
     * Product image URI.
     */
    imageUrl?: string;
    /**
     * Unit price in ISO 4217 minor units.
     */
    price: number;
    /**
     * Product title.
     */
    title: string;
    [property: string]: any;
}

/**
 * A cost breakdown entry with a category, amount, and optional display text.
 */
export interface LineItemTotal {
    amount: number;
    /**
     * Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
     * 'Delivery').
     */
    displayText?: string;
    /**
     * Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
     * fee, total. Businesses MAY use additional values.
     */
    type: string;
    [property: string]: any;
}

export interface LinkElement {
    /**
     * Optional display text for the link. When provided, use this instead of generating from
     * type.
     */
    title?: string;
    /**
     * Type of link. Well-known values: `privacy_policy`, `terms_of_service`, `refund_policy`,
     * `shipping_policy`, `faq`. Consumers SHOULD handle unknown values gracefully by displaying
     * them using the `title` field or omitting the link.
     */
    type: string;
    /**
     * The actual URL pointing to the content to be displayed.
     */
    url: string;
    [property: string]: any;
}

/**
 * Container for error, warning, or info messages.
 */
export interface MessageElement {
    /**
     * Warning code. Machine-readable identifier for the warning type (e.g., final_sale, prop65,
     * fulfillment_changed, age_restricted, etc.).
     *
     * Info code for programmatic handling.
     */
    code?: string;
    /**
     * Human-readable message.
     *
     * Human-readable warning message that MUST be displayed.
     */
    content: string;
    /**
     * Content format, default = plain.
     */
    contentType?: ContentType;
    /**
     * RFC 9535 JSONPath to the component the message refers to (e.g., $.items[1]).
     *
     * JSONPath (RFC 9535) to related field (e.g., $.line_items[0]).
     *
     * RFC 9535 JSONPath to the component the message refers to.
     */
    path?: string;
    /**
     * Reflects the resource state and recommended action. 'recoverable': platform can resolve
     * by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires
     * information their API doesn't support collecting programmatically (checkout incomplete).
     * 'requires_buyer_review': buyer must authorize before order placement due to policy,
     * regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
     * retry with new resource or inputs. Errors with 'requires_*' severity contribute to
     * 'status: requires_escalation'.
     */
    severity?: Severity;
    /**
     * Message type discriminator.
     */
    type: MessageType;
    /**
     * URL to a required visual element (e.g., warning symbol, energy class label).
     */
    imageUrl?: string;
    /**
     * Rendering contract for this warning. 'notice' (default): platform MUST display, MAY
     * dismiss. 'disclosure': platform MUST display in proximity to the path-referenced
     * component, MUST NOT hide or auto-dismiss. See specification for full contract.
     */
    presentation?: string;
    /**
     * Reference URL for more information (e.g., regulatory site, registry entry, policy page).
     */
    url?: string;
    [property: string]: any;
}

/**
 * Content format, default = plain.
 */
export type ContentType = "plain" | "markdown";

/**
 * Reflects the resource state and recommended action. 'recoverable': platform can resolve
 * by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires
 * information their API doesn't support collecting programmatically (checkout incomplete).
 * 'requires_buyer_review': buyer must authorize before order placement due to policy,
 * regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
 * retry with new resource or inputs. Errors with 'requires_*' severity contribute to
 * 'status: requires_escalation'.
 */
export type Severity = "recoverable" | "requires_buyer_input" | "requires_buyer_review" | "unrecoverable";

export type MessageType = "error" | "warning" | "info";

/**
 * Details about an order created for this checkout session.
 *
 * Order details available at the time of checkout completion.
 */
export interface OrderObject {
    /**
     * Unique order identifier.
     */
    id: string;
    /**
     * Human-readable label for identifying the order. MUST only be provided by the business.
     */
    label?: string;
    /**
     * Permalink to access the order on merchant site.
     */
    permalinkUrl: string;
    [property: string]: any;
}

/**
 * Payment configuration containing handlers.
 */
export interface PaymentObject {
    /**
     * The payment instruments available for this payment. Each instrument is associated with a
     * specific handler via the handler_id field. Handlers can extend the base
     * payment_instrument schema to add handler-specific fields.
     */
    instruments?: PaymentSelectedPaymentInstrument[];
    [property: string]: any;
}

/**
 * A payment instrument with selection state.
 *
 * The base definition for any payment instrument. It links the instrument to a specific
 * payment handler.
 */
export interface PaymentSelectedPaymentInstrument {
    /**
     * The billing address associated with this payment method.
     */
    billingAddress?: BillingAddressObject;
    credential?:     CredentialObject;
    /**
     * Display information for this payment instrument. Each payment instrument schema defines
     * its specific display properties, as outlined by the payment handler.
     */
    display?: { [key: string]: any };
    /**
     * The unique identifier for the handler instance that produced this instrument. This
     * corresponds to the 'id' field in the Payment Handler definition.
     */
    handlerId: string;
    /**
     * A unique identifier for this instrument instance, assigned by the platform.
     */
    id: string;
    /**
     * The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
     * will constrain this to a constant value.
     */
    type: string;
    /**
     * Whether this instrument is selected by the user.
     */
    selected?: boolean;
    [property: string]: any;
}

/**
 * The billing address associated with this payment method.
 *
 * Delivery destination address.
 *
 * Physical address of the location.
 */
export interface BillingAddressObject {
    /**
     * The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
     * For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
     * full country name such as "Singapore" can also be used.
     */
    addressCountry?: string;
    /**
     * The locality in which the street address is, and which is in the region. For example,
     * Mountain View.
     */
    addressLocality?: string;
    /**
     * The region in which the locality is, and which is in the country. Required for applicable
     * countries (i.e. state in US, province in CA). For example, California or another
     * appropriate first-level Administrative division.
     */
    addressRegion?: string;
    /**
     * An address extension such as an apartment number, C/O or alternative name.
     */
    extendedAddress?: string;
    /**
     * Optional. First name of the contact associated with the address.
     */
    firstName?: string;
    /**
     * Optional. Last name of the contact associated with the address.
     */
    lastName?: string;
    /**
     * Optional. Phone number of the contact associated with the address.
     */
    phoneNumber?: string;
    /**
     * The postal code. For example, 94043.
     */
    postalCode?: string;
    /**
     * The street address.
     */
    streetAddress?: string;
    [property: string]: any;
}

/**
 * The base definition for any payment credential. Handlers define specific credential types.
 */
export interface CredentialObject {
    /**
     * The credential type discriminator. Specific schemas will constrain this to a constant
     * value.
     */
    type: string;
    [property: string]: any;
}

/**
 * Environment data provided by the platform to support authorization and abuse prevention.
 * Values MUST NOT be buyer-asserted claims — platforms provide signals based on direct
 * observation or independently verifiable third-party attestations. All signal keys MUST
 * use reverse-domain naming to ensure provenance and prevent collisions when multiple
 * extensions contribute to the shared namespace.
 */
export interface SignalsObject {
    /**
     * Client's IP address (IPv4 or IPv6).
     */
    devUcpBuyerIp?: string;
    /**
     * Client's HTTP User-Agent header or equivalent.
     */
    devUcpUserAgent?: string;
    [property: string]: any;
}

/**
 * Checkout state indicating the current phase and required action. See Checkout Status
 * lifecycle documentation for state transition details.
 */
export type CheckoutStatus = "incomplete" | "requires_escalation" | "ready_for_complete" | "complete_in_progress" | "completed" | "canceled";

/**
 * Different cart totals.
 *
 * Pricing breakdown provided by the business. MUST contain exactly one subtotal and one
 * total entry. Detail types (tax, fee, discount, fulfillment) may appear multiple times for
 * itemization. Platforms MUST render all entries in order using display_text and amount.
 *
 * A cost breakdown entry with a category, amount, and optional display text.
 */
export interface CheckoutTotal {
    amount: number;
    /**
     * Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
     * 'Delivery').
     */
    displayText?: string;
    /**
     * Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
     * fee, total. Businesses MAY use additional values.
     */
    type: string;
    /**
     * Optional itemized breakdown. The parent entry is always rendered; lines are
     * supplementary. Sum of line amounts MUST equal the parent entry amount.
     */
    lines?: TotalLine[];
    [property: string]: any;
}

/**
 * Sub-line entry. Additional metadata MAY be included.
 */
export interface TotalLine {
    amount: number;
    /**
     * Human-readable label for this sub-line.
     */
    displayText: string;
    [property: string]: any;
}

/**
 * UCP metadata for checkout responses.
 *
 * Base UCP metadata with shared properties for all schema types.
 */
export interface UcpCheckoutResponseSchema {
    /**
     * Capability registry keyed by reverse-domain name.
     */
    capabilities?: { [key: string]: CapabilityResponseSchema[] };
    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    paymentHandlers: { [key: string]: PaymentHandlerResponseSchema[] };
    /**
     * Service registry keyed by reverse-domain name.
     */
    services?: { [key: string]: ServiceResponseSchema[] };
    /**
     * Application-level status of the UCP operation.
     */
    status?: UcpCheckoutResponseSchemaStatus;
    version: string;
    [property: string]: any;
}

/**
 * Capability reference in responses. Only name/version required to confirm active
 * capabilities.
 *
 * Shared foundation for all UCP entities.
 */
export interface CapabilityResponseSchema {
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    config?: { [key: string]: any };
    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    id?: string;
    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    schema?: string;
    /**
     * URL to human-readable specification document.
     */
    spec?: string;
    /**
     * Entity version in YYYY-MM-DD format.
     */
    version: string;
    /**
     * Parent capability(s) this extends. Present for extensions, absent for root capabilities.
     * Use array for multi-parent extensions.
     */
    extends?: string[] | string;
    [property: string]: any;
}

/**
 * Handler reference in responses. May include full config state for runtime usage of the
 * handler.
 *
 * Shared foundation for all UCP entities.
 */
export interface PaymentHandlerResponseSchema {
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    config?: { [key: string]: any };
    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    id: string;
    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    schema?: string;
    /**
     * URL to human-readable specification document.
     */
    spec?: string;
    /**
     * Entity version in YYYY-MM-DD format.
     */
    version: string;
    /**
     * Instrument types this handler supports, with optional constraints. When absent, every
     * instrument should be considered available.
     */
    availableInstruments?: PaymentHandlerResponseSchemaAvailableInstrument[];
    [property: string]: any;
}

/**
 * An instrument type available from a payment handler with optional constraints.
 */
export interface PaymentHandlerResponseSchemaAvailableInstrument {
    /**
     * Constraints on this instrument type. Structure depends on instrument type and active
     * capabilities.
     */
    constraints?: { [key: string]: any };
    /**
     * The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
     * schema's type constant.
     */
    type: string;
    [property: string]: any;
}

/**
 * Service binding in API responses. Includes per-resource transport configuration via typed
 * config.
 *
 * Shared foundation for all UCP entities.
 */
export interface ServiceResponseSchema {
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    config?: EmbeddedTransportConfig;
    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    id?: string;
    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    schema?: string;
    /**
     * URL to human-readable specification document.
     */
    spec?: string;
    /**
     * Entity version in YYYY-MM-DD format.
     */
    version: string;
    /**
     * Endpoint URL for this transport binding.
     */
    endpoint?: string;
    /**
     * Transport protocol for this service binding.
     */
    transport: Transport;
    [property: string]: any;
}

/**
 * Entity-specific configuration. Structure defined by each entity's schema.
 *
 * Per-session configuration for embedded transport binding. Allows businesses to vary EP
 * availability and delegations based on cart contents, agent authorization, or policy.
 */
export interface EmbeddedTransportConfig {
    /**
     * Color schemes the business supports. Hosts use ec_color_scheme query parameter to request
     * a scheme from this list.
     */
    colorScheme?: EmbeddedColorScheme[];
    /**
     * Delegations the business allows. At service-level, declares available delegations. In UCP
     * responses, confirms accepted delegations for this session.
     */
    delegate?: string[];
    [property: string]: any;
}

export type EmbeddedColorScheme = "light" | "dark";

/**
 * Transport protocol for this service binding.
 */
export type Transport = "rest" | "mcp" | "a2a" | "embedded";

/**
 * Application-level status of the UCP operation.
 */
export type UcpCheckoutResponseSchemaStatus = "success" | "error";

/**
 * Non-sensitive backend identifiers for linking.
 */
export interface PaymentAccountInfo {
    /**
     * EMVCo PAR. A unique identifier linking a payment card to a specific account, enabling
     * tracking across tokens (Apple Pay, physical card, etc).
     */
    paymentAccountReference?: string;
    [property: string]: any;
}

/**
 * Post-order event that exists independently of fulfillment. Typically represents money
 * movements but can be any post-order change. Polymorphic type that can optionally
 * reference line items.
 */
export interface Adjustment {
    /**
     * Human-readable reason or description (e.g., 'Defective item', 'Customer requested').
     */
    description?: string;
    /**
     * Adjustment event identifier.
     */
    id: string;
    /**
     * Which line items and quantities are affected (optional).
     */
    lineItems?: AdjustmentLineItem[];
    /**
     * RFC 3339 timestamp when this adjustment occurred.
     */
    occurredAt: string;
    /**
     * Adjustment status.
     */
    status: AdjustmentStatus;
    /**
     * Adjustment totals breakdown. Signed values - negative for money returned to buyer
     * (refunds, credits), positive for additional charges (exchanges).
     */
    totals?: LineItemTotal[];
    /**
     * Type of adjustment (open string). Typically money-related like: refund, return, credit,
     * price_adjustment, dispute, cancellation. Can be any value that makes sense for the
     * merchant's business.
     */
    type: string;
    [property: string]: any;
}

export interface AdjustmentLineItem {
    /**
     * Line item ID reference.
     */
    id: string;
    /**
     * Signed quantity affected by this adjustment. Negative values represent reductions (e.g.
     * returns); positive values represent additions (e.g. exchanges).
     */
    quantity: number;
    [property: string]: any;
}

/**
 * Adjustment status.
 */
export type AdjustmentStatus = "pending" | "completed" | "failed";

/**
 * An instrument type available from a payment handler with optional constraints.
 */
export interface AvailablePaymentInstrument {
    /**
     * Constraints on this instrument type. Structure depends on instrument type and active
     * capabilities.
     */
    constraints?: { [key: string]: any };
    /**
     * The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
     * schema's type constant.
     */
    type: string;
    [property: string]: any;
}

/**
 * Binds a token to a specific checkout session and participant. Prevents token reuse across
 * different checkouts or participants.
 */
export interface TokenBinding {
    /**
     * The checkout session identifier this token is bound to.
     */
    checkoutId: string;
    /**
     * The participant this token is bound to. Required when acting on behalf of another
     * participant (e.g., agent tokenizing for merchant). Omit when the authenticated caller is
     * the binding target.
     */
    identity?: IdentityObject;
    [property: string]: any;
}

/**
 * The participant this token is bound to. Required when acting on behalf of another
 * participant (e.g., agent tokenizing for merchant). Omit when the authenticated caller is
 * the binding target.
 *
 * Identity of a participant for token binding. The access_token uniquely identifies the
 * participant who tokens should be bound to.
 */
export interface IdentityObject {
    /**
     * Unique identifier for this participant, obtained during onboarding with the tokenizer.
     */
    accessToken: string;
    [property: string]: any;
}

/**
 * Business's fulfillment configuration.
 */
export interface BusinessFulfillmentConfig {
    /**
     * Allowed method type combinations.
     */
    allowsMethodCombinations?: Array<TypeElement[]>;
    /**
     * Permits multiple destinations per method type.
     */
    allowsMultiDestination?: BusinessFulfillmentConfigAllowsMultiDestination;
    [property: string]: any;
}

/**
 * Fulfillment method type this availability applies to.
 *
 * Fulfillment method type.
 */
export type TypeElement = "shipping" | "pickup";

/**
 * Permits multiple destinations per method type.
 */
export interface BusinessFulfillmentConfigAllowsMultiDestination {
    /**
     * Multiple pickup locations allowed.
     */
    pickup?: boolean;
    /**
     * Multiple shipping destinations allowed.
     */
    shipping?: boolean;
}

export interface Buyer {
    /**
     * Email of the buyer.
     */
    email?: string;
    /**
     * First name of the buyer.
     */
    firstName?: string;
    /**
     * Last name of the buyer.
     */
    lastName?: string;
    /**
     * E.164 standard.
     */
    phoneNumber?: string;
    [property: string]: any;
}

/**
 * A card credential containing sensitive payment card details including raw Primary Account
 * Numbers (PANs). This credential type MUST NOT be used for checkout, only with payment
 * handlers that tokenize or encrypt credentials. CRITICAL: Both parties handling
 * CardCredential (sender and receiver) MUST be PCI DSS compliant. Transmission MUST use
 * HTTPS/TLS with strong cipher suites.
 *
 * The base definition for any payment credential. Handlers define specific credential types.
 */
export interface CardCredential {
    /**
     * The credential type discriminator. Specific schemas will constrain this to a constant
     * value.
     *
     * The credential type identifier for card credentials.
     */
    type: TypeEnum;
    /**
     * The type of card number. Network tokens are preferred with fallback to FPAN. See PCI
     * Scope for more details.
     */
    cardNumberType: CardNumberType;
    /**
     * Cryptogram provided with network tokens.
     */
    cryptogram?: string;
    /**
     * Card CVC number.
     */
    cvc?: string;
    /**
     * Electronic Commerce Indicator / Security Level Indicator provided with network tokens.
     */
    eciValue?: string;
    /**
     * The month of the card's expiration date (1-12).
     */
    expiryMonth?: number;
    /**
     * The year of the card's expiration date.
     */
    expiryYear?: number;
    /**
     * Cardholder name.
     */
    name?: string;
    /**
     * Card number.
     */
    number?: string;
    [property: string]: any;
}

/**
 * The type of card number. Network tokens are preferred with fallback to FPAN. See PCI
 * Scope for more details.
 */
export type CardNumberType = "fpan" | "network_token" | "dpan";

/**
 * Error code identifying the type of error. Standard errors are defined in specification
 * (see examples), and have standardized semantics; freeform codes are permitted.
 */
export type TypeEnum = "card";

/**
 * A basic card payment instrument with visible card details. Can be inherited by a
 * handler's instrument schema to define handler-specific display details or more complex
 * credential structures.
 *
 * The base definition for any payment instrument. It links the instrument to a specific
 * payment handler.
 */
export interface CardPaymentInstrument {
    /**
     * The billing address associated with this payment method.
     */
    billingAddress?: BillingAddressObject;
    credential?:     CredentialObject;
    /**
     * Display information for this payment instrument. Each payment instrument schema defines
     * its specific display properties, as outlined by the payment handler.
     *
     * Display information for this card payment instrument.
     */
    display?: Display;
    /**
     * The unique identifier for the handler instance that produced this instrument. This
     * corresponds to the 'id' field in the Payment Handler definition.
     */
    handlerId: string;
    /**
     * A unique identifier for this instrument instance, assigned by the platform.
     */
    id: string;
    /**
     * The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
     * will constrain this to a constant value.
     *
     * Indicates this is a card payment instrument.
     */
    type: TypeEnum;
    [property: string]: any;
}

/**
 * Display information for this payment instrument. Each payment instrument schema defines
 * its specific display properties, as outlined by the payment handler.
 *
 * Display information for this card payment instrument.
 */
export interface Display {
    /**
     * The card brand/network (e.g., visa, mastercard, amex).
     */
    brand?: string;
    /**
     * An optional URI to a rich image representing the card (e.g., card art provided by the
     * issuer).
     */
    cardArt?: string;
    /**
     * An optional rich text description of the card to display to the user (e.g., 'Visa ending
     * in 1234, expires 12/2025').
     */
    description?: string;
    /**
     * The month of the card's expiration date (1-12).
     */
    expiryMonth?: number;
    /**
     * The year of the card's expiration date.
     */
    expiryYear?: number;
    /**
     * Last 4 digits of the card number.
     */
    lastDigits?: string;
    [property: string]: any;
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
 */
export interface Context {
    /**
     * The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
     * For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
     * full country name such as "Singapore" can also be used. Optional hint for market context
     * (currency, availability, pricing)—higher-resolution data (e.g., shipping address)
     * supersedes this value.
     */
    addressCountry?: string;
    /**
     * The region in which the locality is, and which is in the country. For example, California
     * or another appropriate first-level Administrative division. Optional hint for progressive
     * localization—higher-resolution data (e.g., shipping address) supersedes this value.
     */
    addressRegion?: string;
    /**
     * Preferred currency (ISO 4217, e.g., 'EUR', 'USD'). Businesses determine presentment
     * currency from context and authoritative signals; this hint MAY inform selection in
     * multi-currency markets. Also serves as the denomination for price filter values —
     * platforms SHOULD include this field when sending price filters. Response prices include
     * explicit currency confirming the resolution.
     */
    currency?: string;
    /**
     * Buyer claims about eligible benefits such as loyalty membership, payment instrument
     * perks, and similar. Recognized claims MAY inform the Business response (e.g., member-only
     * product availability, adjusted pricing in catalog, provisional discounts at cart or
     * checkout). Businesses MUST ignore unrecognized values without error. Values MUST use
     * reverse-domain naming (e.g., 'com.example.loyalty_gold', 'org.school.student') and MUST
     * be non-identifying.
     */
    eligibility?: string[];
    /**
     * Background context describing buyer's intent (e.g., 'looking for a gift under $50', 'need
     * something durable for outdoor use'). Informs relevance, recommendations, and
     * personalization.
     */
    intent?: string;
    /**
     * Preferred language for content. Use IETF BCP 47 language tags (e.g., 'en', 'fr-CA',
     * 'zh-Hans'). For REST, equivalent to Accept-Language header—platforms SHOULD fall back to
     * Accept-Language when this field is absent; when provided, overrides Accept-Language.
     * Businesses MAY return content in a different language if unavailable.
     */
    language?: string;
    /**
     * The postal code. For example, 94043. Optional hint for regional
     * refinement—higher-resolution data (e.g., shipping address) supersedes this value.
     */
    postalCode?: string;
    [property: string]: any;
}

/**
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
export interface ErrorResponse {
    /**
     * URL for buyer handoff or session recovery.
     */
    continueUrl?: string;
    /**
     * Array of messages describing why the operation failed.
     */
    messages: MessageElement[];
    /**
     * UCP protocol metadata. Status MUST be 'error' for error response.
     */
    ucp: ErrorResponseUcp;
}

/**
 * UCP protocol metadata. Status MUST be 'error' for error response.
 *
 * UCP metadata with status 'error'. Use for response branches that carry error
 * information.
 *
 * Base UCP metadata with shared properties for all schema types.
 */
export interface ErrorResponseUcp {
    /**
     * Capability registry keyed by reverse-domain name.
     */
    capabilities?: { [key: string]: CapabilityResponseSchema[] };
    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    paymentHandlers?: { [key: string]: PaymentHandlerResponseSchema[] };
    /**
     * Service registry keyed by reverse-domain name.
     */
    services?: { [key: string]: UcpOrderResponseSchemaService[] };
    /**
     * Application-level status of the UCP operation.
     */
    status:  StatusEnum;
    version: string;
    [property: string]: any;
}

/**
 * Shared foundation for all UCP entities.
 */
export interface UcpOrderResponseSchemaService {
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    config?: { [key: string]: any };
    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    id?: string;
    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    schema?: string;
    /**
     * URL to human-readable specification document.
     */
    spec?: string;
    /**
     * Entity version in YYYY-MM-DD format.
     */
    version: string;
    /**
     * Endpoint URL for this transport binding.
     */
    endpoint?: string;
    /**
     * Transport protocol for this service binding.
     */
    transport: Transport;
    [property: string]: any;
}

/**
 * Application-level status of the UCP operation.
 */
export type StatusEnum = "error";

/**
 * Buyer-facing fulfillment expectation representing logical groupings of items (e.g.,
 * 'package'). Can be split, merged, or adjusted post-order to set buyer expectations for
 * when/how items arrive.
 */
export interface Expectation {
    /**
     * Human-readable delivery description (e.g., 'Arrives in 5-8 business days').
     */
    description?: string;
    /**
     * Delivery destination address.
     */
    destination: BillingAddressObject;
    /**
     * When this expectation can be fulfilled: 'now' or ISO 8601 timestamp for future date
     * (backorder, pre-order).
     */
    fulfillableOn?: string;
    /**
     * Expectation identifier.
     */
    id: string;
    /**
     * Which line items and quantities are in this expectation.
     */
    lineItems: ExpectationLineItem[];
    /**
     * Delivery method type (shipping, pickup, digital).
     */
    methodType: MethodType;
    [property: string]: any;
}

export interface ExpectationLineItem {
    /**
     * Line item ID reference.
     */
    id: string;
    /**
     * Quantity of this item in this expectation.
     */
    quantity: number;
    [property: string]: any;
}

/**
 * Delivery method type (shipping, pickup, digital).
 */
export type MethodType = "shipping" | "pickup" | "digital";

/**
 * Inventory availability hint for a fulfillment method type.
 */
export interface FulfillmentAvailableMethod {
    /**
     * Human-readable availability info (e.g., 'Available for pickup at Downtown Store today').
     */
    description?: string;
    /**
     * 'now' for immediate availability, or ISO 8601 date for future (preorders, transfers).
     */
    fulfillableOn?: null | string;
    /**
     * Line items available for this fulfillment method.
     */
    lineItemIds: string[];
    /**
     * Fulfillment method type this availability applies to.
     */
    type: TypeElement;
    [property: string]: any;
}

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
export interface FulfillmentDestination {
    /**
     * The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
     * For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
     * full country name such as "Singapore" can also be used.
     */
    addressCountry?: string;
    /**
     * The locality in which the street address is, and which is in the region. For example,
     * Mountain View.
     */
    addressLocality?: string;
    /**
     * The region in which the locality is, and which is in the country. Required for applicable
     * countries (i.e. state in US, province in CA). For example, California or another
     * appropriate first-level Administrative division.
     */
    addressRegion?: string;
    /**
     * An address extension such as an apartment number, C/O or alternative name.
     */
    extendedAddress?: string;
    /**
     * Optional. First name of the contact associated with the address.
     */
    firstName?: string;
    /**
     * Optional. Last name of the contact associated with the address.
     */
    lastName?: string;
    /**
     * Optional. Phone number of the contact associated with the address.
     */
    phoneNumber?: string;
    /**
     * The postal code. For example, 94043.
     */
    postalCode?: string;
    /**
     * The street address.
     */
    streetAddress?: string;
    /**
     * ID specific to this shipping destination.
     *
     * Unique location identifier.
     */
    id: string;
    /**
     * Physical address of the location.
     */
    address?: BillingAddressObject;
    /**
     * Location name (e.g., store name).
     */
    name?: string;
    [property: string]: any;
}

/**
 * Append-only fulfillment event representing an actual shipment. References line items by
 * ID.
 */
export interface FulfillmentEvent {
    /**
     * Carrier name (e.g., 'FedEx', 'USPS').
     */
    carrier?: string;
    /**
     * Human-readable description of the shipment status or delivery information (e.g.,
     * 'Delivered to front door', 'Out for delivery').
     */
    description?: string;
    /**
     * Fulfillment event identifier.
     */
    id: string;
    /**
     * Which line items and quantities are fulfilled in this event.
     */
    lineItems: FulfillmentEventLineItem[];
    /**
     * RFC 3339 timestamp when this fulfillment event occurred.
     */
    occurredAt: string;
    /**
     * Carrier tracking number (required if type != processing).
     */
    trackingNumber?: string;
    /**
     * URL to track this shipment (required if type != processing).
     */
    trackingUrl?: string;
    /**
     * Fulfillment event type. Common values include: processing (preparing to ship), shipped
     * (handed to carrier), in_transit (in delivery network), delivered (received by buyer),
     * failed_attempt (delivery attempt failed), canceled (fulfillment canceled), undeliverable
     * (cannot be delivered), returned_to_sender (returned to merchant).
     */
    type: string;
    [property: string]: any;
}

export interface FulfillmentEventLineItem {
    /**
     * Line item ID reference.
     */
    id: string;
    /**
     * Quantity fulfilled in this event.
     */
    quantity: number;
    [property: string]: any;
}

/**
 * A merchant-generated package/group of line items with fulfillment options.
 */
export interface FulfillmentGroup {
    /**
     * Group identifier for referencing merchant-generated groups in updates.
     */
    id: string;
    /**
     * Line item IDs included in this group/package.
     */
    lineItemIds: string[];
    /**
     * Available fulfillment options for this group.
     */
    options?: OptionElement[];
    /**
     * ID of the selected fulfillment option for this group.
     */
    selectedOptionId?: null | string;
    [property: string]: any;
}

/**
 * A fulfillment option within a group (e.g., Standard Shipping $5, Express $15).
 */
export interface OptionElement {
    /**
     * Carrier name (for shipping).
     */
    carrier?: string;
    /**
     * Complete context for buyer decision (e.g., 'Arrives Dec 12-15 via FedEx').
     */
    description?: string;
    /**
     * Earliest fulfillment date.
     */
    earliestFulfillmentTime?: string;
    /**
     * Unique fulfillment option identifier.
     */
    id: string;
    /**
     * Latest fulfillment date.
     */
    latestFulfillmentTime?: string;
    /**
     * Short label (e.g., 'Express Shipping', 'Curbside Pickup').
     */
    title: string;
    /**
     * Fulfillment option totals breakdown.
     */
    totals: LineItemTotal[];
    [property: string]: any;
}

/**
 * A fulfillment method (shipping or pickup) with destinations and groups.
 */
export interface FulfillmentMethod {
    /**
     * Available destinations. For shipping: addresses. For pickup: retail locations.
     */
    destinations?: FulfillmentDestinationElement[];
    /**
     * Fulfillment groups for selecting options. Agent sets selected_option_id on groups to
     * choose shipping method.
     */
    groups?: GroupElement[];
    /**
     * Unique fulfillment method identifier.
     */
    id: string;
    /**
     * Line item IDs fulfilled via this method.
     */
    lineItemIds: string[];
    /**
     * ID of the selected destination.
     */
    selectedDestinationId?: null | string;
    /**
     * Fulfillment method type.
     */
    type: TypeElement;
    [property: string]: any;
}

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
export interface FulfillmentDestinationElement {
    /**
     * The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
     * For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
     * full country name such as "Singapore" can also be used.
     */
    addressCountry?: string;
    /**
     * The locality in which the street address is, and which is in the region. For example,
     * Mountain View.
     */
    addressLocality?: string;
    /**
     * The region in which the locality is, and which is in the country. Required for applicable
     * countries (i.e. state in US, province in CA). For example, California or another
     * appropriate first-level Administrative division.
     */
    addressRegion?: string;
    /**
     * An address extension such as an apartment number, C/O or alternative name.
     */
    extendedAddress?: string;
    /**
     * Optional. First name of the contact associated with the address.
     */
    firstName?: string;
    /**
     * Optional. Last name of the contact associated with the address.
     */
    lastName?: string;
    /**
     * Optional. Phone number of the contact associated with the address.
     */
    phoneNumber?: string;
    /**
     * The postal code. For example, 94043.
     */
    postalCode?: string;
    /**
     * The street address.
     */
    streetAddress?: string;
    /**
     * ID specific to this shipping destination.
     *
     * Unique location identifier.
     */
    id: string;
    /**
     * Physical address of the location.
     */
    address?: BillingAddressObject;
    /**
     * Location name (e.g., store name).
     */
    name?: string;
    [property: string]: any;
}

/**
 * A merchant-generated package/group of line items with fulfillment options.
 */
export interface GroupElement {
    /**
     * Group identifier for referencing merchant-generated groups in updates.
     */
    id: string;
    /**
     * Line item IDs included in this group/package.
     */
    lineItemIds: string[];
    /**
     * Available fulfillment options for this group.
     */
    options?: OptionElement[];
    /**
     * ID of the selected fulfillment option for this group.
     */
    selectedOptionId?: null | string;
    [property: string]: any;
}

/**
 * A fulfillment option within a group (e.g., Standard Shipping $5, Express $15).
 */
export interface FulfillmentOption {
    /**
     * Carrier name (for shipping).
     */
    carrier?: string;
    /**
     * Complete context for buyer decision (e.g., 'Arrives Dec 12-15 via FedEx').
     */
    description?: string;
    /**
     * Earliest fulfillment date.
     */
    earliestFulfillmentTime?: string;
    /**
     * Unique fulfillment option identifier.
     */
    id: string;
    /**
     * Latest fulfillment date.
     */
    latestFulfillmentTime?: string;
    /**
     * Short label (e.g., 'Express Shipping', 'Curbside Pickup').
     */
    title: string;
    /**
     * Fulfillment option totals breakdown.
     */
    totals: LineItemTotal[];
    [property: string]: any;
}

/**
 * Container for fulfillment methods and availability.
 */
export interface Fulfillment {
    /**
     * Inventory availability hints.
     */
    availableMethods?: AvailableMethodElement[];
    /**
     * Fulfillment methods for cart items.
     */
    methods?: MethodElement[];
    [property: string]: any;
}

/**
 * Inventory availability hint for a fulfillment method type.
 */
export interface AvailableMethodElement {
    /**
     * Human-readable availability info (e.g., 'Available for pickup at Downtown Store today').
     */
    description?: string;
    /**
     * 'now' for immediate availability, or ISO 8601 date for future (preorders, transfers).
     */
    fulfillableOn?: null | string;
    /**
     * Line items available for this fulfillment method.
     */
    lineItemIds: string[];
    /**
     * Fulfillment method type this availability applies to.
     */
    type: TypeElement;
    [property: string]: any;
}

/**
 * A fulfillment method (shipping or pickup) with destinations and groups.
 */
export interface MethodElement {
    /**
     * Available destinations. For shipping: addresses. For pickup: retail locations.
     */
    destinations?: FulfillmentDestinationElement[];
    /**
     * Fulfillment groups for selecting options. Agent sets selected_option_id on groups to
     * choose shipping method.
     */
    groups?: GroupElement[];
    /**
     * Unique fulfillment method identifier.
     */
    id: string;
    /**
     * Line item IDs fulfilled via this method.
     */
    lineItemIds: string[];
    /**
     * ID of the selected destination.
     */
    selectedDestinationId?: null | string;
    /**
     * Fulfillment method type.
     */
    type: TypeElement;
    [property: string]: any;
}

export interface Item {
    /**
     * The product identifier, often the SKU, required to resolve the product details associated
     * with this line item. Should be recognized by both the Platform, and the Business.
     */
    id: string;
    /**
     * Product image URI.
     */
    imageUrl?: string;
    /**
     * Unit price in ISO 4217 minor units.
     */
    price: number;
    /**
     * Product title.
     */
    title: string;
    [property: string]: any;
}

/**
 * Line item object. Expected to use the currency of the parent object.
 */
export interface LineItem {
    id:   string;
    item: ItemObject;
    /**
     * Parent line item identifier for any nested structures.
     */
    parentId?: string;
    /**
     * Quantity of the item being purchased.
     */
    quantity: number;
    /**
     * Line item totals breakdown.
     */
    totals: LineItemTotal[];
    [property: string]: any;
}

export interface Link {
    /**
     * Optional display text for the link. When provided, use this instead of generating from
     * type.
     */
    title?: string;
    /**
     * Type of link. Well-known values: `privacy_policy`, `terms_of_service`, `refund_policy`,
     * `shipping_policy`, `faq`. Consumers SHOULD handle unknown values gracefully by displaying
     * them using the `title` field or omitting the link.
     */
    type: string;
    /**
     * The actual URL pointing to the content to be displayed.
     */
    url: string;
    [property: string]: any;
}

/**
 * Merchant's fulfillment configuration.
 */
export interface MerchantFulfillmentConfig {
    /**
     * Allowed method type combinations.
     */
    allowsMethodCombinations?: Array<TypeElement[]>;
    /**
     * Permits multiple destinations per method type.
     */
    allowsMultiDestination?: MerchantFulfillmentConfigAllowsMultiDestination;
    [property: string]: any;
}

/**
 * Permits multiple destinations per method type.
 */
export interface MerchantFulfillmentConfigAllowsMultiDestination {
    /**
     * Multiple pickup locations allowed.
     */
    pickup?: boolean;
    /**
     * Multiple shipping destinations allowed.
     */
    shipping?: boolean;
}

export interface MessageError {
    code: string;
    /**
     * Human-readable message.
     */
    content: string;
    /**
     * Content format, default = plain.
     */
    contentType?: ContentType;
    /**
     * RFC 9535 JSONPath to the component the message refers to (e.g., $.items[1]).
     */
    path?: string;
    /**
     * Reflects the resource state and recommended action. 'recoverable': platform can resolve
     * by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires
     * information their API doesn't support collecting programmatically (checkout incomplete).
     * 'requires_buyer_review': buyer must authorize before order placement due to policy,
     * regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
     * retry with new resource or inputs. Errors with 'requires_*' severity contribute to
     * 'status: requires_escalation'.
     */
    severity: Severity;
    /**
     * Message type discriminator.
     */
    type: StatusEnum;
    [property: string]: any;
}

export interface MessageInfo {
    /**
     * Info code for programmatic handling.
     */
    code?: string;
    /**
     * Human-readable message.
     */
    content: string;
    /**
     * Content format, default = plain.
     */
    contentType?: ContentType;
    /**
     * RFC 9535 JSONPath to the component the message refers to.
     */
    path?: string;
    /**
     * Message type discriminator.
     */
    type: MessageInfoType;
    [property: string]: any;
}

export type MessageInfoType = "info";

export interface MessageWarning {
    /**
     * Warning code. Machine-readable identifier for the warning type (e.g., final_sale, prop65,
     * fulfillment_changed, age_restricted, etc.).
     */
    code: string;
    /**
     * Human-readable warning message that MUST be displayed.
     */
    content: string;
    /**
     * Content format, default = plain.
     */
    contentType?: ContentType;
    /**
     * URL to a required visual element (e.g., warning symbol, energy class label).
     */
    imageUrl?: string;
    /**
     * JSONPath (RFC 9535) to related field (e.g., $.line_items[0]).
     */
    path?: string;
    /**
     * Rendering contract for this warning. 'notice' (default): platform MUST display, MAY
     * dismiss. 'disclosure': platform MUST display in proximity to the path-referenced
     * component, MUST NOT hide or auto-dismiss. See specification for full contract.
     */
    presentation?: string;
    /**
     * Message type discriminator.
     */
    type: MessageWarningType;
    /**
     * Reference URL for more information (e.g., regulatory site, registry entry, policy page).
     */
    url?: string;
    [property: string]: any;
}

export type MessageWarningType = "warning";

/**
 * Container for error, warning, or info messages.
 */
export interface Message {
    /**
     * Warning code. Machine-readable identifier for the warning type (e.g., final_sale, prop65,
     * fulfillment_changed, age_restricted, etc.).
     *
     * Info code for programmatic handling.
     */
    code?: string;
    /**
     * Human-readable message.
     *
     * Human-readable warning message that MUST be displayed.
     */
    content: string;
    /**
     * Content format, default = plain.
     */
    contentType?: ContentType;
    /**
     * RFC 9535 JSONPath to the component the message refers to (e.g., $.items[1]).
     *
     * JSONPath (RFC 9535) to related field (e.g., $.line_items[0]).
     *
     * RFC 9535 JSONPath to the component the message refers to.
     */
    path?: string;
    /**
     * Reflects the resource state and recommended action. 'recoverable': platform can resolve
     * by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires
     * information their API doesn't support collecting programmatically (checkout incomplete).
     * 'requires_buyer_review': buyer must authorize before order placement due to policy,
     * regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
     * retry with new resource or inputs. Errors with 'requires_*' severity contribute to
     * 'status: requires_escalation'.
     */
    severity?: Severity;
    /**
     * Message type discriminator.
     */
    type: MessageType;
    /**
     * URL to a required visual element (e.g., warning symbol, energy class label).
     */
    imageUrl?: string;
    /**
     * Rendering contract for this warning. 'notice' (default): platform MUST display, MAY
     * dismiss. 'disclosure': platform MUST display in proximity to the path-referenced
     * component, MUST NOT hide or auto-dismiss. See specification for full contract.
     */
    presentation?: string;
    /**
     * Reference URL for more information (e.g., regulatory site, registry entry, policy page).
     */
    url?: string;
    [property: string]: any;
}

/**
 * Order details available at the time of checkout completion.
 */
export interface OrderConfirmation {
    /**
     * Unique order identifier.
     */
    id: string;
    /**
     * Human-readable label for identifying the order. MUST only be provided by the business.
     */
    label?: string;
    /**
     * Permalink to access the order on merchant site.
     */
    permalinkUrl: string;
    [property: string]: any;
}

export interface OrderLineItem {
    /**
     * Line item identifier.
     */
    id: string;
    /**
     * Product data (id, title, price, image_url).
     */
    item: ItemObject;
    /**
     * Parent line item identifier for any nested structures.
     */
    parentId?: string;
    /**
     * Quantity tracking for the line item.
     */
    quantity: OrderLineItemQuantity;
    /**
     * Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
     * quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
     * quantity.fulfilled > 0, otherwise processing.
     */
    status: OrderLineItemStatus;
    /**
     * Line item totals breakdown.
     */
    totals: LineItemTotal[];
    [property: string]: any;
}

/**
 * Quantity tracking for the line item.
 */
export interface OrderLineItemQuantity {
    /**
     * Quantity fulfilled so far.
     */
    fulfilled: number;
    /**
     * Quantity from the original checkout.
     */
    original?: number;
    /**
     * Current total active quantity. May differ from original due to post-order modifications
     * (e.g., returns or cancellations).
     */
    total: number;
    [property: string]: any;
}

/**
 * Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
 * quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
 * quantity.fulfilled > 0, otherwise processing.
 */
export type OrderLineItemStatus = "processing" | "partial" | "fulfilled" | "removed";

/**
 * The base definition for any payment credential. Handlers define specific credential types.
 */
export interface PaymentCredential {
    /**
     * The credential type discriminator. Specific schemas will constrain this to a constant
     * value.
     */
    type: string;
    [property: string]: any;
}

/**
 * Identity of a participant for token binding. The access_token uniquely identifies the
 * participant who tokens should be bound to.
 */
export interface PaymentIdentity {
    /**
     * Unique identifier for this participant, obtained during onboarding with the tokenizer.
     */
    accessToken: string;
    [property: string]: any;
}

/**
 * The base definition for any payment instrument. It links the instrument to a specific
 * payment handler.
 */
export interface PaymentInstrument {
    /**
     * The billing address associated with this payment method.
     */
    billingAddress?: BillingAddressObject;
    credential?:     CredentialObject;
    /**
     * Display information for this payment instrument. Each payment instrument schema defines
     * its specific display properties, as outlined by the payment handler.
     */
    display?: { [key: string]: any };
    /**
     * The unique identifier for the handler instance that produced this instrument. This
     * corresponds to the 'id' field in the Payment Handler definition.
     */
    handlerId: string;
    /**
     * A unique identifier for this instrument instance, assigned by the platform.
     */
    id: string;
    /**
     * The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
     * will constrain this to a constant value.
     */
    type: string;
    [property: string]: any;
}

/**
 * Platform's fulfillment configuration.
 */
export interface PlatformFulfillmentConfig {
    /**
     * Enables multiple groups per method.
     */
    supportsMultiGroup?: boolean;
    [property: string]: any;
}

export interface PostalAddress {
    /**
     * The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
     * For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
     * full country name such as "Singapore" can also be used.
     */
    addressCountry?: string;
    /**
     * The locality in which the street address is, and which is in the region. For example,
     * Mountain View.
     */
    addressLocality?: string;
    /**
     * The region in which the locality is, and which is in the country. Required for applicable
     * countries (i.e. state in US, province in CA). For example, California or another
     * appropriate first-level Administrative division.
     */
    addressRegion?: string;
    /**
     * An address extension such as an apartment number, C/O or alternative name.
     */
    extendedAddress?: string;
    /**
     * Optional. First name of the contact associated with the address.
     */
    firstName?: string;
    /**
     * Optional. Last name of the contact associated with the address.
     */
    lastName?: string;
    /**
     * Optional. Phone number of the contact associated with the address.
     */
    phoneNumber?: string;
    /**
     * The postal code. For example, 94043.
     */
    postalCode?: string;
    /**
     * The street address.
     */
    streetAddress?: string;
    [property: string]: any;
}

/**
 * A pickup location (retail store, locker, etc.).
 */
export interface RetailLocation {
    /**
     * Physical address of the location.
     */
    address?: BillingAddressObject;
    /**
     * Unique location identifier.
     */
    id: string;
    /**
     * Location name (e.g., store name).
     */
    name: string;
    [property: string]: any;
}

/**
 * Shipping destination.
 *
 * The billing address associated with this payment method.
 *
 * Delivery destination address.
 *
 * Physical address of the location.
 */
export interface ShippingDestination {
    /**
     * The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
     * For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
     * full country name such as "Singapore" can also be used.
     */
    addressCountry?: string;
    /**
     * The locality in which the street address is, and which is in the region. For example,
     * Mountain View.
     */
    addressLocality?: string;
    /**
     * The region in which the locality is, and which is in the country. Required for applicable
     * countries (i.e. state in US, province in CA). For example, California or another
     * appropriate first-level Administrative division.
     */
    addressRegion?: string;
    /**
     * An address extension such as an apartment number, C/O or alternative name.
     */
    extendedAddress?: string;
    /**
     * Optional. First name of the contact associated with the address.
     */
    firstName?: string;
    /**
     * Optional. Last name of the contact associated with the address.
     */
    lastName?: string;
    /**
     * Optional. Phone number of the contact associated with the address.
     */
    phoneNumber?: string;
    /**
     * The postal code. For example, 94043.
     */
    postalCode?: string;
    /**
     * The street address.
     */
    streetAddress?: string;
    /**
     * ID specific to this shipping destination.
     */
    id: string;
    [property: string]: any;
}

/**
 * Environment data provided by the platform to support authorization and abuse prevention.
 * Values MUST NOT be buyer-asserted claims — platforms provide signals based on direct
 * observation or independently verifiable third-party attestations. All signal keys MUST
 * use reverse-domain naming to ensure provenance and prevent collisions when multiple
 * extensions contribute to the shared namespace.
 */
export interface Signals {
    /**
     * Client's IP address (IPv4 or IPv6).
     */
    devUcpBuyerIp?: string;
    /**
     * Client's HTTP User-Agent header or equivalent.
     */
    devUcpUserAgent?: string;
    [property: string]: any;
}

/**
 * Base token credential schema. Concrete payment handlers may extend this schema with
 * additional fields and define their own constraints.
 *
 * The base definition for any payment credential. Handlers define specific credential types.
 */
export interface TokenCredential {
    /**
     * The credential type discriminator. Specific schemas will constrain this to a constant
     * value.
     *
     * The specific type of token produced by the handler (e.g., 'stripe_token').
     */
    type: string;
    /**
     * The token value.
     */
    token: string;
    [property: string]: any;
}

/**
 * A cost breakdown entry with a category, amount, and optional display text.
 */
export interface Total {
    amount: number;
    /**
     * Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
     * 'Delivery').
     */
    displayText?: string;
    /**
     * Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
     * fee, total. Businesses MAY use additional values.
     */
    type: string;
    [property: string]: any;
}

/**
 * Pricing breakdown provided by the business. MUST contain exactly one subtotal and one
 * total entry. Detail types (tax, fee, discount, fulfillment) may appear multiple times for
 * itemization. Platforms MUST render all entries in order using display_text and amount.
 *
 * A cost breakdown entry with a category, amount, and optional display text.
 */
export interface Totals {
    amount: number;
    /**
     * Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
     * 'Delivery').
     */
    displayText?: string;
    /**
     * Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
     * fee, total. Businesses MAY use additional values.
     */
    type: string;
    /**
     * Optional itemized breakdown. The parent entry is always rendered; lines are
     * supplementary. Sum of line amounts MUST equal the parent entry amount.
     */
    lines?: TotalLineObject[];
    [property: string]: any;
}

/**
 * Sub-line entry. Additional metadata MAY be included.
 */
export interface TotalLineObject {
    amount: number;
    /**
     * Human-readable label for this sub-line.
     */
    displayText: string;
    [property: string]: any;
}

/**
 * Payment configuration containing handlers.
 */
export interface Payment {
    /**
     * The payment instruments available for this payment. Each instrument is associated with a
     * specific handler via the handler_id field. Handlers can extend the base
     * payment_instrument schema to add handler-specific fields.
     */
    instruments?: PaymentSelectedPaymentInstrument[];
    [property: string]: any;
}

/**
 * Order schema with line items, buyer-facing fulfillment expectations, and event logs.
 */
export interface Order {
    /**
     * Post-order events (refunds, returns, credits, disputes, cancellations, etc.) that exist
     * independently of fulfillment.
     */
    adjustments?: AdjustmentElement[];
    /**
     * Associated checkout ID for reconciliation.
     */
    checkoutId: string;
    /**
     * ISO 4217 currency code. MUST match the currency from the originating checkout session.
     */
    currency: string;
    /**
     * Fulfillment data: buyer expectations and what actually happened.
     */
    fulfillment: FulfillmentObject;
    /**
     * Unique order identifier.
     */
    id: string;
    /**
     * Human-readable label for identifying the order. MUST only be provided by the business.
     */
    label?: string;
    /**
     * Line items representing what was purchased — can change post-order via edits or exchanges.
     */
    lineItems: LineItemElement[];
    /**
     * Business outcome messages (errors, warnings, informational). Present when the business
     * needs to communicate status or issues to the platform.
     */
    messages?: MessageElement[];
    /**
     * Permalink to access the order on merchant site.
     */
    permalinkUrl: string;
    /**
     * Different totals for the order.
     */
    totals: CheckoutTotal[];
    ucp:    UcpOrderResponseSchema;
    [property: string]: any;
}

/**
 * Post-order event that exists independently of fulfillment. Typically represents money
 * movements but can be any post-order change. Polymorphic type that can optionally
 * reference line items.
 */
export interface AdjustmentElement {
    /**
     * Human-readable reason or description (e.g., 'Defective item', 'Customer requested').
     */
    description?: string;
    /**
     * Adjustment event identifier.
     */
    id: string;
    /**
     * Which line items and quantities are affected (optional).
     */
    lineItems?: AdjustmentLineItemObject[];
    /**
     * RFC 3339 timestamp when this adjustment occurred.
     */
    occurredAt: string;
    /**
     * Adjustment status.
     */
    status: AdjustmentStatus;
    /**
     * Adjustment totals breakdown. Signed values - negative for money returned to buyer
     * (refunds, credits), positive for additional charges (exchanges).
     */
    totals?: LineItemTotal[];
    /**
     * Type of adjustment (open string). Typically money-related like: refund, return, credit,
     * price_adjustment, dispute, cancellation. Can be any value that makes sense for the
     * merchant's business.
     */
    type: string;
    [property: string]: any;
}

export interface AdjustmentLineItemObject {
    /**
     * Line item ID reference.
     */
    id: string;
    /**
     * Signed quantity affected by this adjustment. Negative values represent reductions (e.g.
     * returns); positive values represent additions (e.g. exchanges).
     */
    quantity: number;
    [property: string]: any;
}

/**
 * Fulfillment data: buyer expectations and what actually happened.
 */
export interface FulfillmentObject {
    /**
     * Append-only event log of actual shipments. Each event references line items by ID.
     */
    events?: EventElement[];
    /**
     * Buyer-facing groups representing when/how items will be delivered. Can be split, merged,
     * or adjusted post-order.
     */
    expectations?: ExpectationElement[];
    [property: string]: any;
}

/**
 * Append-only fulfillment event representing an actual shipment. References line items by
 * ID.
 */
export interface EventElement {
    /**
     * Carrier name (e.g., 'FedEx', 'USPS').
     */
    carrier?: string;
    /**
     * Human-readable description of the shipment status or delivery information (e.g.,
     * 'Delivered to front door', 'Out for delivery').
     */
    description?: string;
    /**
     * Fulfillment event identifier.
     */
    id: string;
    /**
     * Which line items and quantities are fulfilled in this event.
     */
    lineItems: EventLineItem[];
    /**
     * RFC 3339 timestamp when this fulfillment event occurred.
     */
    occurredAt: string;
    /**
     * Carrier tracking number (required if type != processing).
     */
    trackingNumber?: string;
    /**
     * URL to track this shipment (required if type != processing).
     */
    trackingUrl?: string;
    /**
     * Fulfillment event type. Common values include: processing (preparing to ship), shipped
     * (handed to carrier), in_transit (in delivery network), delivered (received by buyer),
     * failed_attempt (delivery attempt failed), canceled (fulfillment canceled), undeliverable
     * (cannot be delivered), returned_to_sender (returned to merchant).
     */
    type: string;
    [property: string]: any;
}

export interface EventLineItem {
    /**
     * Line item ID reference.
     */
    id: string;
    /**
     * Quantity fulfilled in this event.
     */
    quantity: number;
    [property: string]: any;
}

/**
 * Buyer-facing fulfillment expectation representing logical groupings of items (e.g.,
 * 'package'). Can be split, merged, or adjusted post-order to set buyer expectations for
 * when/how items arrive.
 */
export interface ExpectationElement {
    /**
     * Human-readable delivery description (e.g., 'Arrives in 5-8 business days').
     */
    description?: string;
    /**
     * Delivery destination address.
     */
    destination: BillingAddressObject;
    /**
     * When this expectation can be fulfilled: 'now' or ISO 8601 timestamp for future date
     * (backorder, pre-order).
     */
    fulfillableOn?: string;
    /**
     * Expectation identifier.
     */
    id: string;
    /**
     * Which line items and quantities are in this expectation.
     */
    lineItems: ExpectationLineItemObject[];
    /**
     * Delivery method type (shipping, pickup, digital).
     */
    methodType: MethodType;
    [property: string]: any;
}

export interface ExpectationLineItemObject {
    /**
     * Line item ID reference.
     */
    id: string;
    /**
     * Quantity of this item in this expectation.
     */
    quantity: number;
    [property: string]: any;
}

export interface LineItemElement {
    /**
     * Line item identifier.
     */
    id: string;
    /**
     * Product data (id, title, price, image_url).
     */
    item: ItemObject;
    /**
     * Parent line item identifier for any nested structures.
     */
    parentId?: string;
    /**
     * Quantity tracking for the line item.
     */
    quantity: LineItemQuantity;
    /**
     * Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
     * quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
     * quantity.fulfilled > 0, otherwise processing.
     */
    status: OrderLineItemStatus;
    /**
     * Line item totals breakdown.
     */
    totals: LineItemTotal[];
    [property: string]: any;
}

/**
 * Quantity tracking for the line item.
 */
export interface LineItemQuantity {
    /**
     * Quantity fulfilled so far.
     */
    fulfilled: number;
    /**
     * Quantity from the original checkout.
     */
    original?: number;
    /**
     * Current total active quantity. May differ from original due to post-order modifications
     * (e.g., returns or cancellations).
     */
    total: number;
    [property: string]: any;
}

/**
 * UCP metadata for order responses. No payment handlers needed post-purchase.
 *
 * Base UCP metadata with shared properties for all schema types.
 */
export interface UcpOrderResponseSchema {
    /**
     * Capability registry keyed by reverse-domain name.
     */
    capabilities?: { [key: string]: CapabilityResponseSchema[] };
    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    paymentHandlers?: { [key: string]: PaymentHandlerResponseSchema[] };
    /**
     * Service registry keyed by reverse-domain name.
     */
    services?: { [key: string]: UcpOrderResponseSchemaService[] };
    /**
     * Application-level status of the UCP operation.
     */
    status?: UcpCheckoutResponseSchemaStatus;
    version: string;
    [property: string]: any;
}

/**
 * Checkout state after instrument selection.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
export interface InstrumentsChangeResult {
    /**
     * Partial checkout update with payment instrument selection.
     */
    checkout?: InstrumentsChangeCheckout;
    /**
     * UCP protocol metadata. Status MUST be 'error' for error response.
     */
    ucp: InstrumentsChangeResultUcp;
    /**
     * URL for buyer handoff or session recovery.
     */
    continueUrl?: string;
    /**
     * Array of messages describing why the operation failed.
     */
    messages?: MessageElement[];
    [property: string]: any;
}

/**
 * Partial checkout update with payment instrument selection.
 */
export interface InstrumentsChangeCheckout {
    payment?: InstrumentsChangePayment;
    [property: string]: any;
}

/**
 * Payment instruments with selected instrument ID.
 *
 * Payment instruments from host.
 */
export interface InstrumentsChangePayment {
    /**
     * Available payment instruments.
     */
    instruments?: PurpleSelectedPaymentInstrument[];
    /**
     * ID of the selected payment instrument.
     */
    selectedInstrumentId?: string;
    [property: string]: any;
}

/**
 * A payment instrument with selection state.
 *
 * The base definition for any payment instrument. It links the instrument to a specific
 * payment handler.
 */
export interface PurpleSelectedPaymentInstrument {
    /**
     * The billing address associated with this payment method.
     */
    billingAddress?: BillingAddressObject;
    credential?:     CredentialObject;
    /**
     * Display information for this payment instrument. Each payment instrument schema defines
     * its specific display properties, as outlined by the payment handler.
     */
    display?: { [key: string]: any };
    /**
     * The unique identifier for the handler instance that produced this instrument. This
     * corresponds to the 'id' field in the Payment Handler definition.
     */
    handlerId: string;
    /**
     * A unique identifier for this instrument instance, assigned by the platform.
     */
    id: string;
    /**
     * The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
     * will constrain this to a constant value.
     */
    type: string;
    /**
     * Whether this instrument is selected by the user.
     */
    selected?: boolean;
    [property: string]: any;
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
export interface InstrumentsChangeResultUcp {
    /**
     * Capability registry keyed by reverse-domain name.
     */
    capabilities?: { [key: string]: CapabilityElement[] };
    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    paymentHandlers?: { [key: string]: PaymentHandlerElement[] };
    /**
     * Service registry keyed by reverse-domain name.
     */
    services?: { [key: string]: PurpleService[] };
    /**
     * Application-level status of the UCP operation.
     */
    status:  UcpCheckoutResponseSchemaStatus;
    version: string;
    [property: string]: any;
}

/**
 * Shared foundation for all UCP entities.
 *
 * Capability reference in responses. Only name/version required to confirm active
 * capabilities.
 */
export interface CapabilityElement {
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    config?: { [key: string]: any };
    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    id?: string;
    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    schema?: string;
    /**
     * URL to human-readable specification document.
     */
    spec?: string;
    /**
     * Entity version in YYYY-MM-DD format.
     */
    version: string;
    /**
     * Parent capability(s) this extends. Present for extensions, absent for root capabilities.
     * Use array for multi-parent extensions.
     */
    extends?: string[] | string;
    [property: string]: any;
}

/**
 * Shared foundation for all UCP entities.
 *
 * Handler reference in responses. May include full config state for runtime usage of the
 * handler.
 */
export interface PaymentHandlerElement {
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    config?: { [key: string]: any };
    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    id: string;
    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    schema?: string;
    /**
     * URL to human-readable specification document.
     */
    spec?: string;
    /**
     * Entity version in YYYY-MM-DD format.
     */
    version: string;
    /**
     * Instrument types this handler supports, with optional constraints. When absent, every
     * instrument should be considered available.
     */
    availableInstruments?: PaymentHandlerAvailableInstrument[];
    [property: string]: any;
}

/**
 * An instrument type available from a payment handler with optional constraints.
 */
export interface PaymentHandlerAvailableInstrument {
    /**
     * Constraints on this instrument type. Structure depends on instrument type and active
     * capabilities.
     */
    constraints?: { [key: string]: any };
    /**
     * The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
     * schema's type constant.
     */
    type: string;
    [property: string]: any;
}

/**
 * Shared foundation for all UCP entities.
 */
export interface PurpleService {
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    config?: { [key: string]: any };
    /**
     * Unique identifier for this entity instance. Used to disambiguate when multiple instances
     * exist.
     */
    id?: string;
    /**
     * URL to JSON Schema defining this entity's structure and payloads.
     */
    schema?: string;
    /**
     * URL to human-readable specification document.
     */
    spec?: string;
    /**
     * Entity version in YYYY-MM-DD format.
     */
    version: string;
    /**
     * Endpoint URL for this transport binding.
     */
    endpoint?: string;
    /**
     * Transport protocol for this service binding.
     */
    transport: Transport;
    [property: string]: any;
}

/**
 * Checkout state with payment credential ready for completion.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
export interface CredentialResult {
    /**
     * Partial checkout update with payment credential.
     */
    checkout?: CredentialCheckout;
    /**
     * UCP protocol metadata. Status MUST be 'error' for error response.
     */
    ucp: InstrumentsChangeResultUcp;
    /**
     * URL for buyer handoff or session recovery.
     */
    continueUrl?: string;
    /**
     * Array of messages describing why the operation failed.
     */
    messages?: MessageElement[];
    [property: string]: any;
}

/**
 * Partial checkout update with payment credential.
 */
export interface CredentialCheckout {
    payment?: CredentialPayment;
    [property: string]: any;
}

/**
 * Payment instruments from host.
 */
export interface CredentialPayment {
    /**
     * Available payment instruments.
     */
    instruments?: PurpleSelectedPaymentInstrument[];
    [property: string]: any;
}
