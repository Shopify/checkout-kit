// To parse this data:
//
//   import { Convert, Checkout, PaymentAccountInfo, Adjustment, AvailablePaymentInstrument, TokenBinding, BusinessFulfillmentConfig, Buyer, CardCredential, CardPaymentInstrument, Context, ErrorResponse, Expectation, FulfillmentAvailableMethod, FulfillmentDestination, FulfillmentEvent, FulfillmentGroup, FulfillmentMethod, FulfillmentOption, Fulfillment, Item, LineItem, Link, MerchantFulfillmentConfig, MessageError, MessageInfo, MessageWarning, Message, OrderConfirmation, OrderLineItem, PaymentCredential, PaymentIdentity, PaymentInstrument, PlatformFulfillmentConfig, PostalAddress, RetailLocation, ShippingDestination, Signals, TokenCredential, Total, Payment, Order, InstrumentsChangeResult, CredentialResult } from "./file";
//
//   const checkout = Convert.toCheckout(json);
//   const paymentAccountInfo = Convert.toPaymentAccountInfo(json);
//   const adjustment = Convert.toAdjustment(json);
//   const amount = Convert.toAmount(json);
//   const availablePaymentInstrument = Convert.toAvailablePaymentInstrument(json);
//   const binding = Convert.toBinding(json);
//   const businessFulfillmentConfig = Convert.toBusinessFulfillmentConfig(json);
//   const buyer = Convert.toBuyer(json);
//   const cardCredential = Convert.toCardCredential(json);
//   const cardPaymentInstrument = Convert.toCardPaymentInstrument(json);
//   const context = Convert.toContext(json);
//   const errorCode = Convert.toErrorCode(json);
//   const errorResponse = Convert.toErrorResponse(json);
//   const expectation = Convert.toExpectation(json);
//   const fulfillmentAvailableMethod = Convert.toFulfillmentAvailableMethod(json);
//   const fulfillmentDestination = Convert.toFulfillmentDestination(json);
//   const fulfillmentEvent = Convert.toFulfillmentEvent(json);
//   const fulfillmentGroup = Convert.toFulfillmentGroup(json);
//   const fulfillmentMethod = Convert.toFulfillmentMethod(json);
//   const fulfillmentOption = Convert.toFulfillmentOption(json);
//   const fulfillment = Convert.toFulfillment(json);
//   const item = Convert.toItem(json);
//   const lineItem = Convert.toLineItem(json);
//   const link = Convert.toLink(json);
//   const merchantFulfillmentConfig = Convert.toMerchantFulfillmentConfig(json);
//   const messageError = Convert.toMessageError(json);
//   const messageInfo = Convert.toMessageInfo(json);
//   const messageWarning = Convert.toMessageWarning(json);
//   const message = Convert.toMessage(json);
//   const orderConfirmation = Convert.toOrderConfirmation(json);
//   const orderLineItem = Convert.toOrderLineItem(json);
//   const paymentCredential = Convert.toPaymentCredential(json);
//   const paymentIdentity = Convert.toPaymentIdentity(json);
//   const paymentInstrument = Convert.toPaymentInstrument(json);
//   const platformFulfillmentConfig = Convert.toPlatformFulfillmentConfig(json);
//   const postalAddress = Convert.toPostalAddress(json);
//   const retailLocation = Convert.toRetailLocation(json);
//   const reverseDomainName = Convert.toReverseDomainName(json);
//   const shippingDestination = Convert.toShippingDestination(json);
//   const signals = Convert.toSignals(json);
//   const signedAmount = Convert.toSignedAmount(json);
//   const tokenCredential = Convert.toTokenCredential(json);
//   const total = Convert.toTotal(json);
//   const totals = Convert.toTotals(json);
//   const payment = Convert.toPayment(json);
//   const order = Convert.toOrder(json);
//   const instrumentsChangeResult = Convert.toInstrumentsChangeResult(json);
//   const credentialResult = Convert.toCredentialResult(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

/**
 * Base checkout schema. Extensions compose onto this using allOf.
 */
export interface Checkout {
    /**
     * Representation of the buyer.
     */
    buyer?:   Buyer;
    context?: Context;
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
    lineItems: LineItem[];
    /**
     * Links to be displayed by the platform (Privacy Policy, TOS). Mandatory for legal
     * compliance.
     */
    links: Link[];
    /**
     * List of messages with error and info about the checkout session state.
     */
    messages?: Message[];
    /**
     * Details about an order created for this checkout session.
     */
    order?:   OrderConfirmation;
    payment?: Payment;
    signals?: Signals;
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
 * Line item object. Expected to use the currency of the parent object.
 */
export interface LineItem {
    id:   string;
    item: Item;
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

/**
 * Payment configuration containing handlers.
 */
export interface Payment {
    /**
     * The payment instruments available for this payment. Each instrument is associated with a
     * specific handler via the handler_id field. Handlers can extend the base
     * payment_instrument schema to add handler-specific fields.
     */
    instruments?: SelectedPaymentInstrument[];
    [property: string]: any;
}

/**
 * A payment instrument with selection state.
 *
 * The base definition for any payment instrument. It links the instrument to a specific
 * payment handler.
 */
export interface SelectedPaymentInstrument {
    /**
     * The billing address associated with this payment method.
     */
    billingAddress?: PostalAddress;
    credential?:     PaymentCredential;
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
 */
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
    lines?: Line[];
    [property: string]: any;
}

/**
 * Sub-line entry. Additional metadata MAY be included.
 */
export interface Line {
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
 * Order schema with line items, buyer-facing fulfillment expectations, and event logs.
 */
export interface Order {
    /**
     * Post-order events (refunds, returns, credits, disputes, cancellations, etc.) that exist
     * independently of fulfillment.
     */
    adjustments?: Adjustment[];
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
    fulfillment: Fulfillment;
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
    lineItems: OrderLineItem[];
    /**
     * Business outcome messages (errors, warnings, informational). Present when the business
     * needs to communicate status or issues to the platform.
     */
    messages?: Message[];
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
 * Fulfillment data: buyer expectations and what actually happened.
 */
export interface Fulfillment {
    /**
     * Append-only event log of actual shipments. Each event references line items by ID.
     */
    events?: FulfillmentEvent[];
    /**
     * Buyer-facing groups representing when/how items will be delivered. Can be split, merged,
     * or adjusted post-order.
     */
    expectations?: Expectation[];
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
export interface Expectation {
    /**
     * Human-readable delivery description (e.g., 'Arrives in 5-8 business days').
     */
    description?: string;
    /**
     * Delivery destination address.
     */
    destination: PostalAddress;
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

export interface OrderLineItem {
    /**
     * Line item identifier.
     */
    id: string;
    /**
     * Product data (id, title, price, image_url).
     */
    item: Item;
    /**
     * Parent line item identifier for any nested structures.
     */
    parentId?: string;
    /**
     * Quantity tracking for the line item.
     */
    quantity: Quantity;
    /**
     * Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
     * quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
     * quantity.fulfilled > 0, otherwise processing.
     */
    status: LineItemStatus;
    /**
     * Line item totals breakdown.
     */
    totals: LineItemTotal[];
    [property: string]: any;
}

/**
 * Quantity tracking for the line item.
 */
export interface Quantity {
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
export type LineItemStatus = "processing" | "partial" | "fulfilled" | "removed";

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
    messages: Message[];
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
 * Application-level status of the UCP operation.
 */
export type StatusEnum = "error";

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
    messages?: Message[];
    [property: string]: any;
}

/**
 * Partial checkout update with payment instrument selection.
 */
export interface InstrumentsChangeCheckout {
    /**
     * Payment instruments with selected instrument ID.
     */
    payment?: InstrumentsChangePayment;
    [property: string]: any;
}

/**
 * Payment instruments with selected instrument ID.
 *
 * Payment configuration containing handlers.
 */
export interface InstrumentsChangePayment {
    /**
     * The payment instruments available for this payment. Each instrument is associated with a
     * specific handler via the handler_id field. Handlers can extend the base
     * payment_instrument schema to add handler-specific fields.
     */
    instruments?: SelectedPaymentInstrument[];
    /**
     * ID of the selected payment instrument.
     */
    selectedInstrumentId?: string;
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
    services?: { [key: string]: InstrumentsChangeService[] };
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
export interface InstrumentsChangeService {
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
    messages?: Message[];
    [property: string]: any;
}

/**
 * Partial checkout update with payment credential.
 */
export interface CredentialCheckout {
    payment?: Payment;
    [property: string]: any;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toCheckout(json: string): Checkout {
        return cast(JSON.parse(json), r("Checkout"));
    }

    public static checkoutToJson(value: Checkout): string {
        return JSON.stringify(uncast(value, r("Checkout")), null, 2);
    }

    public static toPaymentAccountInfo(json: string): PaymentAccountInfo {
        return cast(JSON.parse(json), r("PaymentAccountInfo"));
    }

    public static paymentAccountInfoToJson(value: PaymentAccountInfo): string {
        return JSON.stringify(uncast(value, r("PaymentAccountInfo")), null, 2);
    }

    public static toAdjustment(json: string): Adjustment {
        return cast(JSON.parse(json), r("Adjustment"));
    }

    public static adjustmentToJson(value: Adjustment): string {
        return JSON.stringify(uncast(value, r("Adjustment")), null, 2);
    }

    public static toAmount(json: string): number {
        return cast(JSON.parse(json), 0);
    }

    public static amountToJson(value: number): string {
        return JSON.stringify(uncast(value, 0), null, 2);
    }

    public static toAvailablePaymentInstrument(json: string): AvailablePaymentInstrument {
        return cast(JSON.parse(json), r("AvailablePaymentInstrument"));
    }

    public static availablePaymentInstrumentToJson(value: AvailablePaymentInstrument): string {
        return JSON.stringify(uncast(value, r("AvailablePaymentInstrument")), null, 2);
    }

    public static toBinding(json: string): TokenBinding {
        return cast(JSON.parse(json), r("TokenBinding"));
    }

    public static bindingToJson(value: TokenBinding): string {
        return JSON.stringify(uncast(value, r("TokenBinding")), null, 2);
    }

    public static toBusinessFulfillmentConfig(json: string): BusinessFulfillmentConfig {
        return cast(JSON.parse(json), r("BusinessFulfillmentConfig"));
    }

    public static businessFulfillmentConfigToJson(value: BusinessFulfillmentConfig): string {
        return JSON.stringify(uncast(value, r("BusinessFulfillmentConfig")), null, 2);
    }

    public static toBuyer(json: string): Buyer {
        return cast(JSON.parse(json), r("Buyer"));
    }

    public static buyerToJson(value: Buyer): string {
        return JSON.stringify(uncast(value, r("Buyer")), null, 2);
    }

    public static toCardCredential(json: string): CardCredential {
        return cast(JSON.parse(json), r("CardCredential"));
    }

    public static cardCredentialToJson(value: CardCredential): string {
        return JSON.stringify(uncast(value, r("CardCredential")), null, 2);
    }

    public static toCardPaymentInstrument(json: string): CardPaymentInstrument {
        return cast(JSON.parse(json), r("CardPaymentInstrument"));
    }

    public static cardPaymentInstrumentToJson(value: CardPaymentInstrument): string {
        return JSON.stringify(uncast(value, r("CardPaymentInstrument")), null, 2);
    }

    public static toContext(json: string): Context {
        return cast(JSON.parse(json), r("Context"));
    }

    public static contextToJson(value: Context): string {
        return JSON.stringify(uncast(value, r("Context")), null, 2);
    }

    public static toErrorCode(json: string): string {
        return cast(JSON.parse(json), "");
    }

    public static errorCodeToJson(value: string): string {
        return JSON.stringify(uncast(value, ""), null, 2);
    }

    public static toErrorResponse(json: string): ErrorResponse {
        return cast(JSON.parse(json), r("ErrorResponse"));
    }

    public static errorResponseToJson(value: ErrorResponse): string {
        return JSON.stringify(uncast(value, r("ErrorResponse")), null, 2);
    }

    public static toExpectation(json: string): Expectation {
        return cast(JSON.parse(json), r("Expectation"));
    }

    public static expectationToJson(value: Expectation): string {
        return JSON.stringify(uncast(value, r("Expectation")), null, 2);
    }

    public static toFulfillmentAvailableMethod(json: string): FulfillmentAvailableMethod {
        return cast(JSON.parse(json), r("FulfillmentAvailableMethod"));
    }

    public static fulfillmentAvailableMethodToJson(value: FulfillmentAvailableMethod): string {
        return JSON.stringify(uncast(value, r("FulfillmentAvailableMethod")), null, 2);
    }

    public static toFulfillmentDestination(json: string): FulfillmentDestination {
        return cast(JSON.parse(json), r("FulfillmentDestination"));
    }

    public static fulfillmentDestinationToJson(value: FulfillmentDestination): string {
        return JSON.stringify(uncast(value, r("FulfillmentDestination")), null, 2);
    }

    public static toFulfillmentEvent(json: string): FulfillmentEvent {
        return cast(JSON.parse(json), r("FulfillmentEvent"));
    }

    public static fulfillmentEventToJson(value: FulfillmentEvent): string {
        return JSON.stringify(uncast(value, r("FulfillmentEvent")), null, 2);
    }

    public static toFulfillmentGroup(json: string): FulfillmentGroup {
        return cast(JSON.parse(json), r("FulfillmentGroup"));
    }

    public static fulfillmentGroupToJson(value: FulfillmentGroup): string {
        return JSON.stringify(uncast(value, r("FulfillmentGroup")), null, 2);
    }

    public static toFulfillmentMethod(json: string): FulfillmentMethod {
        return cast(JSON.parse(json), r("FulfillmentMethod"));
    }

    public static fulfillmentMethodToJson(value: FulfillmentMethod): string {
        return JSON.stringify(uncast(value, r("FulfillmentMethod")), null, 2);
    }

    public static toFulfillmentOption(json: string): FulfillmentOption {
        return cast(JSON.parse(json), r("FulfillmentOption"));
    }

    public static fulfillmentOptionToJson(value: FulfillmentOption): string {
        return JSON.stringify(uncast(value, r("FulfillmentOption")), null, 2);
    }

    public static toFulfillment(json: string): Fulfillment {
        return cast(JSON.parse(json), r("Fulfillment"));
    }

    public static fulfillmentToJson(value: Fulfillment): string {
        return JSON.stringify(uncast(value, r("Fulfillment")), null, 2);
    }

    public static toItem(json: string): Item {
        return cast(JSON.parse(json), r("Item"));
    }

    public static itemToJson(value: Item): string {
        return JSON.stringify(uncast(value, r("Item")), null, 2);
    }

    public static toLineItem(json: string): LineItem {
        return cast(JSON.parse(json), r("LineItem"));
    }

    public static lineItemToJson(value: LineItem): string {
        return JSON.stringify(uncast(value, r("LineItem")), null, 2);
    }

    public static toLink(json: string): Link {
        return cast(JSON.parse(json), r("Link"));
    }

    public static linkToJson(value: Link): string {
        return JSON.stringify(uncast(value, r("Link")), null, 2);
    }

    public static toMerchantFulfillmentConfig(json: string): MerchantFulfillmentConfig {
        return cast(JSON.parse(json), r("MerchantFulfillmentConfig"));
    }

    public static merchantFulfillmentConfigToJson(value: MerchantFulfillmentConfig): string {
        return JSON.stringify(uncast(value, r("MerchantFulfillmentConfig")), null, 2);
    }

    public static toMessageError(json: string): MessageError {
        return cast(JSON.parse(json), r("MessageError"));
    }

    public static messageErrorToJson(value: MessageError): string {
        return JSON.stringify(uncast(value, r("MessageError")), null, 2);
    }

    public static toMessageInfo(json: string): MessageInfo {
        return cast(JSON.parse(json), r("MessageInfo"));
    }

    public static messageInfoToJson(value: MessageInfo): string {
        return JSON.stringify(uncast(value, r("MessageInfo")), null, 2);
    }

    public static toMessageWarning(json: string): MessageWarning {
        return cast(JSON.parse(json), r("MessageWarning"));
    }

    public static messageWarningToJson(value: MessageWarning): string {
        return JSON.stringify(uncast(value, r("MessageWarning")), null, 2);
    }

    public static toMessage(json: string): Message {
        return cast(JSON.parse(json), r("Message"));
    }

    public static messageToJson(value: Message): string {
        return JSON.stringify(uncast(value, r("Message")), null, 2);
    }

    public static toOrderConfirmation(json: string): OrderConfirmation {
        return cast(JSON.parse(json), r("OrderConfirmation"));
    }

    public static orderConfirmationToJson(value: OrderConfirmation): string {
        return JSON.stringify(uncast(value, r("OrderConfirmation")), null, 2);
    }

    public static toOrderLineItem(json: string): OrderLineItem {
        return cast(JSON.parse(json), r("OrderLineItem"));
    }

    public static orderLineItemToJson(value: OrderLineItem): string {
        return JSON.stringify(uncast(value, r("OrderLineItem")), null, 2);
    }

    public static toPaymentCredential(json: string): PaymentCredential {
        return cast(JSON.parse(json), r("PaymentCredential"));
    }

    public static paymentCredentialToJson(value: PaymentCredential): string {
        return JSON.stringify(uncast(value, r("PaymentCredential")), null, 2);
    }

    public static toPaymentIdentity(json: string): PaymentIdentity {
        return cast(JSON.parse(json), r("PaymentIdentity"));
    }

    public static paymentIdentityToJson(value: PaymentIdentity): string {
        return JSON.stringify(uncast(value, r("PaymentIdentity")), null, 2);
    }

    public static toPaymentInstrument(json: string): PaymentInstrument {
        return cast(JSON.parse(json), r("PaymentInstrument"));
    }

    public static paymentInstrumentToJson(value: PaymentInstrument): string {
        return JSON.stringify(uncast(value, r("PaymentInstrument")), null, 2);
    }

    public static toPlatformFulfillmentConfig(json: string): PlatformFulfillmentConfig {
        return cast(JSON.parse(json), r("PlatformFulfillmentConfig"));
    }

    public static platformFulfillmentConfigToJson(value: PlatformFulfillmentConfig): string {
        return JSON.stringify(uncast(value, r("PlatformFulfillmentConfig")), null, 2);
    }

    public static toPostalAddress(json: string): PostalAddress {
        return cast(JSON.parse(json), r("PostalAddress"));
    }

    public static postalAddressToJson(value: PostalAddress): string {
        return JSON.stringify(uncast(value, r("PostalAddress")), null, 2);
    }

    public static toRetailLocation(json: string): RetailLocation {
        return cast(JSON.parse(json), r("RetailLocation"));
    }

    public static retailLocationToJson(value: RetailLocation): string {
        return JSON.stringify(uncast(value, r("RetailLocation")), null, 2);
    }

    public static toReverseDomainName(json: string): string {
        return cast(JSON.parse(json), "");
    }

    public static reverseDomainNameToJson(value: string): string {
        return JSON.stringify(uncast(value, ""), null, 2);
    }

    public static toShippingDestination(json: string): ShippingDestination {
        return cast(JSON.parse(json), r("ShippingDestination"));
    }

    public static shippingDestinationToJson(value: ShippingDestination): string {
        return JSON.stringify(uncast(value, r("ShippingDestination")), null, 2);
    }

    public static toSignals(json: string): Signals {
        return cast(JSON.parse(json), r("Signals"));
    }

    public static signalsToJson(value: Signals): string {
        return JSON.stringify(uncast(value, r("Signals")), null, 2);
    }

    public static toSignedAmount(json: string): number {
        return cast(JSON.parse(json), 0);
    }

    public static signedAmountToJson(value: number): string {
        return JSON.stringify(uncast(value, 0), null, 2);
    }

    public static toTokenCredential(json: string): TokenCredential {
        return cast(JSON.parse(json), r("TokenCredential"));
    }

    public static tokenCredentialToJson(value: TokenCredential): string {
        return JSON.stringify(uncast(value, r("TokenCredential")), null, 2);
    }

    public static toTotal(json: string): Total {
        return cast(JSON.parse(json), r("Total"));
    }

    public static totalToJson(value: Total): string {
        return JSON.stringify(uncast(value, r("Total")), null, 2);
    }

    public static toTotals(json: string): Totals[] {
        return cast(JSON.parse(json), a(r("Totals")));
    }

    public static totalsToJson(value: Totals[]): string {
        return JSON.stringify(uncast(value, a(r("Totals"))), null, 2);
    }

    public static toPayment(json: string): Payment {
        return cast(JSON.parse(json), r("Payment"));
    }

    public static paymentToJson(value: Payment): string {
        return JSON.stringify(uncast(value, r("Payment")), null, 2);
    }

    public static toOrder(json: string): Order {
        return cast(JSON.parse(json), r("Order"));
    }

    public static orderToJson(value: Order): string {
        return JSON.stringify(uncast(value, r("Order")), null, 2);
    }

    public static toInstrumentsChangeResult(json: string): InstrumentsChangeResult {
        return cast(JSON.parse(json), r("InstrumentsChangeResult"));
    }

    public static instrumentsChangeResultToJson(value: InstrumentsChangeResult): string {
        return JSON.stringify(uncast(value, r("InstrumentsChangeResult")), null, 2);
    }

    public static toCredentialResult(json: string): CredentialResult {
        return cast(JSON.parse(json), r("CredentialResult"));
    }

    public static credentialResultToJson(value: CredentialResult): string {
        return JSON.stringify(uncast(value, r("CredentialResult")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Checkout": o([
        { json: "buyer", js: "buyer", typ: u(undefined, r("BuyerObject")) },
        { json: "context", js: "context", typ: u(undefined, r("ContextObject")) },
        { json: "continue_url", js: "continueUrl", typ: u(undefined, "") },
        { json: "currency", js: "currency", typ: "" },
        { json: "expires_at", js: "expiresAt", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "line_items", js: "lineItems", typ: a(r("CheckoutLineItem")) },
        { json: "links", js: "links", typ: a(r("LinkElement")) },
        { json: "messages", js: "messages", typ: u(undefined, a(r("MessageElement"))) },
        { json: "order", js: "order", typ: u(undefined, r("OrderObject")) },
        { json: "payment", js: "payment", typ: u(undefined, r("PaymentObject")) },
        { json: "signals", js: "signals", typ: u(undefined, r("SignalsObject")) },
        { json: "status", js: "status", typ: r("CheckoutStatus") },
        { json: "totals", js: "totals", typ: a(r("CheckoutTotal")) },
        { json: "ucp", js: "ucp", typ: r("UcpCheckoutResponseSchema") },
    ], "any"),
    "BuyerObject": o([
        { json: "email", js: "email", typ: u(undefined, "") },
        { json: "first_name", js: "firstName", typ: u(undefined, "") },
        { json: "last_name", js: "lastName", typ: u(undefined, "") },
        { json: "phone_number", js: "phoneNumber", typ: u(undefined, "") },
    ], "any"),
    "ContextObject": o([
        { json: "address_country", js: "addressCountry", typ: u(undefined, "") },
        { json: "address_region", js: "addressRegion", typ: u(undefined, "") },
        { json: "currency", js: "currency", typ: u(undefined, "") },
        { json: "eligibility", js: "eligibility", typ: u(undefined, a("")) },
        { json: "intent", js: "intent", typ: u(undefined, "") },
        { json: "language", js: "language", typ: u(undefined, "") },
        { json: "postal_code", js: "postalCode", typ: u(undefined, "") },
    ], "any"),
    "CheckoutLineItem": o([
        { json: "id", js: "id", typ: "" },
        { json: "item", js: "item", typ: r("ItemObject") },
        { json: "parent_id", js: "parentId", typ: u(undefined, "") },
        { json: "quantity", js: "quantity", typ: 0 },
        { json: "totals", js: "totals", typ: a(r("LineItemTotal")) },
    ], "any"),
    "ItemObject": o([
        { json: "id", js: "id", typ: "" },
        { json: "image_url", js: "imageUrl", typ: u(undefined, "") },
        { json: "price", js: "price", typ: 0 },
        { json: "title", js: "title", typ: "" },
    ], "any"),
    "LineItemTotal": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "display_text", js: "displayText", typ: u(undefined, "") },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "LinkElement": o([
        { json: "title", js: "title", typ: u(undefined, "") },
        { json: "type", js: "type", typ: "" },
        { json: "url", js: "url", typ: "" },
    ], "any"),
    "MessageElement": o([
        { json: "code", js: "code", typ: u(undefined, "") },
        { json: "content", js: "content", typ: "" },
        { json: "content_type", js: "contentType", typ: u(undefined, r("ContentType")) },
        { json: "path", js: "path", typ: u(undefined, "") },
        { json: "severity", js: "severity", typ: u(undefined, r("Severity")) },
        { json: "type", js: "type", typ: r("MessageType") },
        { json: "image_url", js: "imageUrl", typ: u(undefined, "") },
        { json: "presentation", js: "presentation", typ: u(undefined, "") },
        { json: "url", js: "url", typ: u(undefined, "") },
    ], "any"),
    "OrderObject": o([
        { json: "id", js: "id", typ: "" },
        { json: "label", js: "label", typ: u(undefined, "") },
        { json: "permalink_url", js: "permalinkUrl", typ: "" },
    ], "any"),
    "PaymentObject": o([
        { json: "instruments", js: "instruments", typ: u(undefined, a(r("PaymentSelectedPaymentInstrument"))) },
    ], "any"),
    "PaymentSelectedPaymentInstrument": o([
        { json: "billing_address", js: "billingAddress", typ: u(undefined, r("BillingAddressObject")) },
        { json: "credential", js: "credential", typ: u(undefined, r("CredentialObject")) },
        { json: "display", js: "display", typ: u(undefined, m("any")) },
        { json: "handler_id", js: "handlerId", typ: "" },
        { json: "id", js: "id", typ: "" },
        { json: "type", js: "type", typ: "" },
        { json: "selected", js: "selected", typ: u(undefined, true) },
    ], "any"),
    "BillingAddressObject": o([
        { json: "address_country", js: "addressCountry", typ: u(undefined, "") },
        { json: "address_locality", js: "addressLocality", typ: u(undefined, "") },
        { json: "address_region", js: "addressRegion", typ: u(undefined, "") },
        { json: "extended_address", js: "extendedAddress", typ: u(undefined, "") },
        { json: "first_name", js: "firstName", typ: u(undefined, "") },
        { json: "last_name", js: "lastName", typ: u(undefined, "") },
        { json: "phone_number", js: "phoneNumber", typ: u(undefined, "") },
        { json: "postal_code", js: "postalCode", typ: u(undefined, "") },
        { json: "street_address", js: "streetAddress", typ: u(undefined, "") },
    ], "any"),
    "CredentialObject": o([
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "SignalsObject": o([
        { json: "dev.ucp.buyer_ip", js: "devUcpBuyerIp", typ: u(undefined, "") },
        { json: "dev.ucp.user_agent", js: "devUcpUserAgent", typ: u(undefined, "") },
    ], "any"),
    "CheckoutTotal": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "display_text", js: "displayText", typ: u(undefined, "") },
        { json: "type", js: "type", typ: "" },
        { json: "lines", js: "lines", typ: u(undefined, a(r("TotalLine"))) },
    ], "any"),
    "TotalLine": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "display_text", js: "displayText", typ: "" },
    ], "any"),
    "UcpCheckoutResponseSchema": o([
        { json: "capabilities", js: "capabilities", typ: u(undefined, m(a(r("CapabilityResponseSchema")))) },
        { json: "payment_handlers", js: "paymentHandlers", typ: m(a(r("PaymentHandlerResponseSchema"))) },
        { json: "services", js: "services", typ: u(undefined, m(a(r("ServiceResponseSchema")))) },
        { json: "status", js: "status", typ: u(undefined, r("UcpCheckoutResponseSchemaStatus")) },
        { json: "version", js: "version", typ: "" },
    ], "any"),
    "CapabilityResponseSchema": o([
        { json: "config", js: "config", typ: u(undefined, m("any")) },
        { json: "id", js: "id", typ: u(undefined, "") },
        { json: "schema", js: "schema", typ: u(undefined, "") },
        { json: "spec", js: "spec", typ: u(undefined, "") },
        { json: "version", js: "version", typ: "" },
        { json: "extends", js: "extends", typ: u(undefined, u(a(""), "")) },
    ], "any"),
    "PaymentHandlerResponseSchema": o([
        { json: "config", js: "config", typ: u(undefined, m("any")) },
        { json: "id", js: "id", typ: "" },
        { json: "schema", js: "schema", typ: u(undefined, "") },
        { json: "spec", js: "spec", typ: u(undefined, "") },
        { json: "version", js: "version", typ: "" },
        { json: "available_instruments", js: "availableInstruments", typ: u(undefined, a(r("PaymentHandlerResponseSchemaAvailableInstrument"))) },
    ], "any"),
    "PaymentHandlerResponseSchemaAvailableInstrument": o([
        { json: "constraints", js: "constraints", typ: u(undefined, m("any")) },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "ServiceResponseSchema": o([
        { json: "config", js: "config", typ: u(undefined, r("EmbeddedTransportConfig")) },
        { json: "id", js: "id", typ: u(undefined, "") },
        { json: "schema", js: "schema", typ: u(undefined, "") },
        { json: "spec", js: "spec", typ: u(undefined, "") },
        { json: "version", js: "version", typ: "" },
        { json: "endpoint", js: "endpoint", typ: u(undefined, "") },
        { json: "transport", js: "transport", typ: r("Transport") },
    ], "any"),
    "EmbeddedTransportConfig": o([
        { json: "color_scheme", js: "colorScheme", typ: u(undefined, a(r("EmbeddedColorScheme"))) },
        { json: "delegate", js: "delegate", typ: u(undefined, a("")) },
    ], "any"),
    "PaymentAccountInfo": o([
        { json: "payment_account_reference", js: "paymentAccountReference", typ: u(undefined, "") },
    ], "any"),
    "Adjustment": o([
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "line_items", js: "lineItems", typ: u(undefined, a(r("AdjustmentLineItem"))) },
        { json: "occurred_at", js: "occurredAt", typ: "" },
        { json: "status", js: "status", typ: r("AdjustmentStatus") },
        { json: "totals", js: "totals", typ: u(undefined, a(r("LineItemTotal"))) },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "AdjustmentLineItem": o([
        { json: "id", js: "id", typ: "" },
        { json: "quantity", js: "quantity", typ: 0 },
    ], "any"),
    "AvailablePaymentInstrument": o([
        { json: "constraints", js: "constraints", typ: u(undefined, m("any")) },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "TokenBinding": o([
        { json: "checkout_id", js: "checkoutId", typ: "" },
        { json: "identity", js: "identity", typ: u(undefined, r("IdentityObject")) },
    ], "any"),
    "IdentityObject": o([
        { json: "access_token", js: "accessToken", typ: "" },
    ], "any"),
    "BusinessFulfillmentConfig": o([
        { json: "allows_method_combinations", js: "allowsMethodCombinations", typ: u(undefined, a(a(r("TypeElement")))) },
        { json: "allows_multi_destination", js: "allowsMultiDestination", typ: u(undefined, r("BusinessFulfillmentConfigAllowsMultiDestination")) },
    ], "any"),
    "BusinessFulfillmentConfigAllowsMultiDestination": o([
        { json: "pickup", js: "pickup", typ: u(undefined, true) },
        { json: "shipping", js: "shipping", typ: u(undefined, true) },
    ], false),
    "Buyer": o([
        { json: "email", js: "email", typ: u(undefined, "") },
        { json: "first_name", js: "firstName", typ: u(undefined, "") },
        { json: "last_name", js: "lastName", typ: u(undefined, "") },
        { json: "phone_number", js: "phoneNumber", typ: u(undefined, "") },
    ], "any"),
    "CardCredential": o([
        { json: "type", js: "type", typ: r("TypeEnum") },
        { json: "card_number_type", js: "cardNumberType", typ: r("CardNumberType") },
        { json: "cryptogram", js: "cryptogram", typ: u(undefined, "") },
        { json: "cvc", js: "cvc", typ: u(undefined, "") },
        { json: "eci_value", js: "eciValue", typ: u(undefined, "") },
        { json: "expiry_month", js: "expiryMonth", typ: u(undefined, 0) },
        { json: "expiry_year", js: "expiryYear", typ: u(undefined, 0) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "number", js: "number", typ: u(undefined, "") },
    ], "any"),
    "CardPaymentInstrument": o([
        { json: "billing_address", js: "billingAddress", typ: u(undefined, r("BillingAddressObject")) },
        { json: "credential", js: "credential", typ: u(undefined, r("CredentialObject")) },
        { json: "display", js: "display", typ: u(undefined, r("Display")) },
        { json: "handler_id", js: "handlerId", typ: "" },
        { json: "id", js: "id", typ: "" },
        { json: "type", js: "type", typ: r("TypeEnum") },
    ], "any"),
    "Display": o([
        { json: "brand", js: "brand", typ: u(undefined, "") },
        { json: "card_art", js: "cardArt", typ: u(undefined, "") },
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "expiry_month", js: "expiryMonth", typ: u(undefined, 0) },
        { json: "expiry_year", js: "expiryYear", typ: u(undefined, 0) },
        { json: "last_digits", js: "lastDigits", typ: u(undefined, "") },
    ], "any"),
    "Context": o([
        { json: "address_country", js: "addressCountry", typ: u(undefined, "") },
        { json: "address_region", js: "addressRegion", typ: u(undefined, "") },
        { json: "currency", js: "currency", typ: u(undefined, "") },
        { json: "eligibility", js: "eligibility", typ: u(undefined, a("")) },
        { json: "intent", js: "intent", typ: u(undefined, "") },
        { json: "language", js: "language", typ: u(undefined, "") },
        { json: "postal_code", js: "postalCode", typ: u(undefined, "") },
    ], "any"),
    "ErrorResponse": o([
        { json: "continue_url", js: "continueUrl", typ: u(undefined, "") },
        { json: "messages", js: "messages", typ: a(r("MessageElement")) },
        { json: "ucp", js: "ucp", typ: r("ErrorResponseUcp") },
    ], false),
    "ErrorResponseUcp": o([
        { json: "capabilities", js: "capabilities", typ: u(undefined, m(a(r("CapabilityResponseSchema")))) },
        { json: "payment_handlers", js: "paymentHandlers", typ: u(undefined, m(a(r("PaymentHandlerResponseSchema")))) },
        { json: "services", js: "services", typ: u(undefined, m(a(r("UcpOrderResponseSchemaService")))) },
        { json: "status", js: "status", typ: r("StatusEnum") },
        { json: "version", js: "version", typ: "" },
    ], "any"),
    "UcpOrderResponseSchemaService": o([
        { json: "config", js: "config", typ: u(undefined, m("any")) },
        { json: "id", js: "id", typ: u(undefined, "") },
        { json: "schema", js: "schema", typ: u(undefined, "") },
        { json: "spec", js: "spec", typ: u(undefined, "") },
        { json: "version", js: "version", typ: "" },
        { json: "endpoint", js: "endpoint", typ: u(undefined, "") },
        { json: "transport", js: "transport", typ: r("Transport") },
    ], "any"),
    "Expectation": o([
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "destination", js: "destination", typ: r("BillingAddressObject") },
        { json: "fulfillable_on", js: "fulfillableOn", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "line_items", js: "lineItems", typ: a(r("ExpectationLineItem")) },
        { json: "method_type", js: "methodType", typ: r("MethodType") },
    ], "any"),
    "ExpectationLineItem": o([
        { json: "id", js: "id", typ: "" },
        { json: "quantity", js: "quantity", typ: 0 },
    ], "any"),
    "FulfillmentAvailableMethod": o([
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "fulfillable_on", js: "fulfillableOn", typ: u(undefined, u(null, "")) },
        { json: "line_item_ids", js: "lineItemIds", typ: a("") },
        { json: "type", js: "type", typ: r("TypeElement") },
    ], "any"),
    "FulfillmentDestination": o([
        { json: "address_country", js: "addressCountry", typ: u(undefined, "") },
        { json: "address_locality", js: "addressLocality", typ: u(undefined, "") },
        { json: "address_region", js: "addressRegion", typ: u(undefined, "") },
        { json: "extended_address", js: "extendedAddress", typ: u(undefined, "") },
        { json: "first_name", js: "firstName", typ: u(undefined, "") },
        { json: "last_name", js: "lastName", typ: u(undefined, "") },
        { json: "phone_number", js: "phoneNumber", typ: u(undefined, "") },
        { json: "postal_code", js: "postalCode", typ: u(undefined, "") },
        { json: "street_address", js: "streetAddress", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "address", js: "address", typ: u(undefined, r("BillingAddressObject")) },
        { json: "name", js: "name", typ: u(undefined, "") },
    ], "any"),
    "FulfillmentEvent": o([
        { json: "carrier", js: "carrier", typ: u(undefined, "") },
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "line_items", js: "lineItems", typ: a(r("FulfillmentEventLineItem")) },
        { json: "occurred_at", js: "occurredAt", typ: "" },
        { json: "tracking_number", js: "trackingNumber", typ: u(undefined, "") },
        { json: "tracking_url", js: "trackingUrl", typ: u(undefined, "") },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "FulfillmentEventLineItem": o([
        { json: "id", js: "id", typ: "" },
        { json: "quantity", js: "quantity", typ: 0 },
    ], "any"),
    "FulfillmentGroup": o([
        { json: "id", js: "id", typ: "" },
        { json: "line_item_ids", js: "lineItemIds", typ: a("") },
        { json: "options", js: "options", typ: u(undefined, a(r("OptionElement"))) },
        { json: "selected_option_id", js: "selectedOptionId", typ: u(undefined, u(null, "")) },
    ], "any"),
    "OptionElement": o([
        { json: "carrier", js: "carrier", typ: u(undefined, "") },
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "earliest_fulfillment_time", js: "earliestFulfillmentTime", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "latest_fulfillment_time", js: "latestFulfillmentTime", typ: u(undefined, "") },
        { json: "title", js: "title", typ: "" },
        { json: "totals", js: "totals", typ: a(r("LineItemTotal")) },
    ], "any"),
    "FulfillmentMethod": o([
        { json: "destinations", js: "destinations", typ: u(undefined, a(r("FulfillmentDestinationElement"))) },
        { json: "groups", js: "groups", typ: u(undefined, a(r("GroupElement"))) },
        { json: "id", js: "id", typ: "" },
        { json: "line_item_ids", js: "lineItemIds", typ: a("") },
        { json: "selected_destination_id", js: "selectedDestinationId", typ: u(undefined, u(null, "")) },
        { json: "type", js: "type", typ: r("TypeElement") },
    ], "any"),
    "FulfillmentDestinationElement": o([
        { json: "address_country", js: "addressCountry", typ: u(undefined, "") },
        { json: "address_locality", js: "addressLocality", typ: u(undefined, "") },
        { json: "address_region", js: "addressRegion", typ: u(undefined, "") },
        { json: "extended_address", js: "extendedAddress", typ: u(undefined, "") },
        { json: "first_name", js: "firstName", typ: u(undefined, "") },
        { json: "last_name", js: "lastName", typ: u(undefined, "") },
        { json: "phone_number", js: "phoneNumber", typ: u(undefined, "") },
        { json: "postal_code", js: "postalCode", typ: u(undefined, "") },
        { json: "street_address", js: "streetAddress", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "address", js: "address", typ: u(undefined, r("BillingAddressObject")) },
        { json: "name", js: "name", typ: u(undefined, "") },
    ], "any"),
    "GroupElement": o([
        { json: "id", js: "id", typ: "" },
        { json: "line_item_ids", js: "lineItemIds", typ: a("") },
        { json: "options", js: "options", typ: u(undefined, a(r("OptionElement"))) },
        { json: "selected_option_id", js: "selectedOptionId", typ: u(undefined, u(null, "")) },
    ], "any"),
    "FulfillmentOption": o([
        { json: "carrier", js: "carrier", typ: u(undefined, "") },
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "earliest_fulfillment_time", js: "earliestFulfillmentTime", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "latest_fulfillment_time", js: "latestFulfillmentTime", typ: u(undefined, "") },
        { json: "title", js: "title", typ: "" },
        { json: "totals", js: "totals", typ: a(r("LineItemTotal")) },
    ], "any"),
    "Fulfillment": o([
        { json: "available_methods", js: "availableMethods", typ: u(undefined, a(r("AvailableMethodElement"))) },
        { json: "methods", js: "methods", typ: u(undefined, a(r("MethodElement"))) },
    ], "any"),
    "AvailableMethodElement": o([
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "fulfillable_on", js: "fulfillableOn", typ: u(undefined, u(null, "")) },
        { json: "line_item_ids", js: "lineItemIds", typ: a("") },
        { json: "type", js: "type", typ: r("TypeElement") },
    ], "any"),
    "MethodElement": o([
        { json: "destinations", js: "destinations", typ: u(undefined, a(r("FulfillmentDestinationElement"))) },
        { json: "groups", js: "groups", typ: u(undefined, a(r("GroupElement"))) },
        { json: "id", js: "id", typ: "" },
        { json: "line_item_ids", js: "lineItemIds", typ: a("") },
        { json: "selected_destination_id", js: "selectedDestinationId", typ: u(undefined, u(null, "")) },
        { json: "type", js: "type", typ: r("TypeElement") },
    ], "any"),
    "Item": o([
        { json: "id", js: "id", typ: "" },
        { json: "image_url", js: "imageUrl", typ: u(undefined, "") },
        { json: "price", js: "price", typ: 0 },
        { json: "title", js: "title", typ: "" },
    ], "any"),
    "LineItem": o([
        { json: "id", js: "id", typ: "" },
        { json: "item", js: "item", typ: r("ItemObject") },
        { json: "parent_id", js: "parentId", typ: u(undefined, "") },
        { json: "quantity", js: "quantity", typ: 0 },
        { json: "totals", js: "totals", typ: a(r("LineItemTotal")) },
    ], "any"),
    "Link": o([
        { json: "title", js: "title", typ: u(undefined, "") },
        { json: "type", js: "type", typ: "" },
        { json: "url", js: "url", typ: "" },
    ], "any"),
    "MerchantFulfillmentConfig": o([
        { json: "allows_method_combinations", js: "allowsMethodCombinations", typ: u(undefined, a(a(r("TypeElement")))) },
        { json: "allows_multi_destination", js: "allowsMultiDestination", typ: u(undefined, r("MerchantFulfillmentConfigAllowsMultiDestination")) },
    ], "any"),
    "MerchantFulfillmentConfigAllowsMultiDestination": o([
        { json: "pickup", js: "pickup", typ: u(undefined, true) },
        { json: "shipping", js: "shipping", typ: u(undefined, true) },
    ], false),
    "MessageError": o([
        { json: "code", js: "code", typ: "" },
        { json: "content", js: "content", typ: "" },
        { json: "content_type", js: "contentType", typ: u(undefined, r("ContentType")) },
        { json: "path", js: "path", typ: u(undefined, "") },
        { json: "severity", js: "severity", typ: r("Severity") },
        { json: "type", js: "type", typ: r("StatusEnum") },
    ], "any"),
    "MessageInfo": o([
        { json: "code", js: "code", typ: u(undefined, "") },
        { json: "content", js: "content", typ: "" },
        { json: "content_type", js: "contentType", typ: u(undefined, r("ContentType")) },
        { json: "path", js: "path", typ: u(undefined, "") },
        { json: "type", js: "type", typ: r("MessageInfoType") },
    ], "any"),
    "MessageWarning": o([
        { json: "code", js: "code", typ: "" },
        { json: "content", js: "content", typ: "" },
        { json: "content_type", js: "contentType", typ: u(undefined, r("ContentType")) },
        { json: "image_url", js: "imageUrl", typ: u(undefined, "") },
        { json: "path", js: "path", typ: u(undefined, "") },
        { json: "presentation", js: "presentation", typ: u(undefined, "") },
        { json: "type", js: "type", typ: r("MessageWarningType") },
        { json: "url", js: "url", typ: u(undefined, "") },
    ], "any"),
    "Message": o([
        { json: "code", js: "code", typ: u(undefined, "") },
        { json: "content", js: "content", typ: "" },
        { json: "content_type", js: "contentType", typ: u(undefined, r("ContentType")) },
        { json: "path", js: "path", typ: u(undefined, "") },
        { json: "severity", js: "severity", typ: u(undefined, r("Severity")) },
        { json: "type", js: "type", typ: r("MessageType") },
        { json: "image_url", js: "imageUrl", typ: u(undefined, "") },
        { json: "presentation", js: "presentation", typ: u(undefined, "") },
        { json: "url", js: "url", typ: u(undefined, "") },
    ], "any"),
    "OrderConfirmation": o([
        { json: "id", js: "id", typ: "" },
        { json: "label", js: "label", typ: u(undefined, "") },
        { json: "permalink_url", js: "permalinkUrl", typ: "" },
    ], "any"),
    "OrderLineItem": o([
        { json: "id", js: "id", typ: "" },
        { json: "item", js: "item", typ: r("ItemObject") },
        { json: "parent_id", js: "parentId", typ: u(undefined, "") },
        { json: "quantity", js: "quantity", typ: r("OrderLineItemQuantity") },
        { json: "status", js: "status", typ: r("OrderLineItemStatus") },
        { json: "totals", js: "totals", typ: a(r("LineItemTotal")) },
    ], "any"),
    "OrderLineItemQuantity": o([
        { json: "fulfilled", js: "fulfilled", typ: 0 },
        { json: "original", js: "original", typ: u(undefined, 0) },
        { json: "total", js: "total", typ: 0 },
    ], "any"),
    "PaymentCredential": o([
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PaymentIdentity": o([
        { json: "access_token", js: "accessToken", typ: "" },
    ], "any"),
    "PaymentInstrument": o([
        { json: "billing_address", js: "billingAddress", typ: u(undefined, r("BillingAddressObject")) },
        { json: "credential", js: "credential", typ: u(undefined, r("CredentialObject")) },
        { json: "display", js: "display", typ: u(undefined, m("any")) },
        { json: "handler_id", js: "handlerId", typ: "" },
        { json: "id", js: "id", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PlatformFulfillmentConfig": o([
        { json: "supports_multi_group", js: "supportsMultiGroup", typ: u(undefined, true) },
    ], "any"),
    "PostalAddress": o([
        { json: "address_country", js: "addressCountry", typ: u(undefined, "") },
        { json: "address_locality", js: "addressLocality", typ: u(undefined, "") },
        { json: "address_region", js: "addressRegion", typ: u(undefined, "") },
        { json: "extended_address", js: "extendedAddress", typ: u(undefined, "") },
        { json: "first_name", js: "firstName", typ: u(undefined, "") },
        { json: "last_name", js: "lastName", typ: u(undefined, "") },
        { json: "phone_number", js: "phoneNumber", typ: u(undefined, "") },
        { json: "postal_code", js: "postalCode", typ: u(undefined, "") },
        { json: "street_address", js: "streetAddress", typ: u(undefined, "") },
    ], "any"),
    "RetailLocation": o([
        { json: "address", js: "address", typ: u(undefined, r("BillingAddressObject")) },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
    ], "any"),
    "ShippingDestination": o([
        { json: "address_country", js: "addressCountry", typ: u(undefined, "") },
        { json: "address_locality", js: "addressLocality", typ: u(undefined, "") },
        { json: "address_region", js: "addressRegion", typ: u(undefined, "") },
        { json: "extended_address", js: "extendedAddress", typ: u(undefined, "") },
        { json: "first_name", js: "firstName", typ: u(undefined, "") },
        { json: "last_name", js: "lastName", typ: u(undefined, "") },
        { json: "phone_number", js: "phoneNumber", typ: u(undefined, "") },
        { json: "postal_code", js: "postalCode", typ: u(undefined, "") },
        { json: "street_address", js: "streetAddress", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
    ], "any"),
    "Signals": o([
        { json: "dev.ucp.buyer_ip", js: "devUcpBuyerIp", typ: u(undefined, "") },
        { json: "dev.ucp.user_agent", js: "devUcpUserAgent", typ: u(undefined, "") },
    ], "any"),
    "TokenCredential": o([
        { json: "type", js: "type", typ: "" },
        { json: "token", js: "token", typ: "" },
    ], "any"),
    "Total": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "display_text", js: "displayText", typ: u(undefined, "") },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "Totals": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "display_text", js: "displayText", typ: u(undefined, "") },
        { json: "type", js: "type", typ: "" },
        { json: "lines", js: "lines", typ: u(undefined, a(r("TotalLineObject"))) },
    ], "any"),
    "TotalLineObject": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "display_text", js: "displayText", typ: "" },
    ], "any"),
    "Payment": o([
        { json: "instruments", js: "instruments", typ: u(undefined, a(r("PaymentSelectedPaymentInstrument"))) },
    ], "any"),
    "Order": o([
        { json: "adjustments", js: "adjustments", typ: u(undefined, a(r("AdjustmentElement"))) },
        { json: "checkout_id", js: "checkoutId", typ: "" },
        { json: "currency", js: "currency", typ: "" },
        { json: "fulfillment", js: "fulfillment", typ: r("FulfillmentObject") },
        { json: "id", js: "id", typ: "" },
        { json: "label", js: "label", typ: u(undefined, "") },
        { json: "line_items", js: "lineItems", typ: a(r("LineItemElement")) },
        { json: "messages", js: "messages", typ: u(undefined, a(r("MessageElement"))) },
        { json: "permalink_url", js: "permalinkUrl", typ: "" },
        { json: "totals", js: "totals", typ: a(r("CheckoutTotal")) },
        { json: "ucp", js: "ucp", typ: r("UcpOrderResponseSchema") },
    ], "any"),
    "AdjustmentElement": o([
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "line_items", js: "lineItems", typ: u(undefined, a(r("AdjustmentLineItemObject"))) },
        { json: "occurred_at", js: "occurredAt", typ: "" },
        { json: "status", js: "status", typ: r("AdjustmentStatus") },
        { json: "totals", js: "totals", typ: u(undefined, a(r("LineItemTotal"))) },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "AdjustmentLineItemObject": o([
        { json: "id", js: "id", typ: "" },
        { json: "quantity", js: "quantity", typ: 0 },
    ], "any"),
    "FulfillmentObject": o([
        { json: "events", js: "events", typ: u(undefined, a(r("EventElement"))) },
        { json: "expectations", js: "expectations", typ: u(undefined, a(r("ExpectationElement"))) },
    ], "any"),
    "EventElement": o([
        { json: "carrier", js: "carrier", typ: u(undefined, "") },
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "line_items", js: "lineItems", typ: a(r("EventLineItem")) },
        { json: "occurred_at", js: "occurredAt", typ: "" },
        { json: "tracking_number", js: "trackingNumber", typ: u(undefined, "") },
        { json: "tracking_url", js: "trackingUrl", typ: u(undefined, "") },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "EventLineItem": o([
        { json: "id", js: "id", typ: "" },
        { json: "quantity", js: "quantity", typ: 0 },
    ], "any"),
    "ExpectationElement": o([
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "destination", js: "destination", typ: r("BillingAddressObject") },
        { json: "fulfillable_on", js: "fulfillableOn", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "line_items", js: "lineItems", typ: a(r("ExpectationLineItemObject")) },
        { json: "method_type", js: "methodType", typ: r("MethodType") },
    ], "any"),
    "ExpectationLineItemObject": o([
        { json: "id", js: "id", typ: "" },
        { json: "quantity", js: "quantity", typ: 0 },
    ], "any"),
    "LineItemElement": o([
        { json: "id", js: "id", typ: "" },
        { json: "item", js: "item", typ: r("ItemObject") },
        { json: "parent_id", js: "parentId", typ: u(undefined, "") },
        { json: "quantity", js: "quantity", typ: r("LineItemQuantity") },
        { json: "status", js: "status", typ: r("OrderLineItemStatus") },
        { json: "totals", js: "totals", typ: a(r("LineItemTotal")) },
    ], "any"),
    "LineItemQuantity": o([
        { json: "fulfilled", js: "fulfilled", typ: 0 },
        { json: "original", js: "original", typ: u(undefined, 0) },
        { json: "total", js: "total", typ: 0 },
    ], "any"),
    "UcpOrderResponseSchema": o([
        { json: "capabilities", js: "capabilities", typ: u(undefined, m(a(r("CapabilityResponseSchema")))) },
        { json: "payment_handlers", js: "paymentHandlers", typ: u(undefined, m(a(r("PaymentHandlerResponseSchema")))) },
        { json: "services", js: "services", typ: u(undefined, m(a(r("UcpOrderResponseSchemaService")))) },
        { json: "status", js: "status", typ: u(undefined, r("UcpCheckoutResponseSchemaStatus")) },
        { json: "version", js: "version", typ: "" },
    ], "any"),
    "InstrumentsChangeResult": o([
        { json: "checkout", js: "checkout", typ: u(undefined, r("InstrumentsChangeCheckout")) },
        { json: "ucp", js: "ucp", typ: r("InstrumentsChangeResultUcp") },
        { json: "continue_url", js: "continueUrl", typ: u(undefined, "") },
        { json: "messages", js: "messages", typ: u(undefined, a(r("MessageElement"))) },
    ], "any"),
    "InstrumentsChangeCheckout": o([
        { json: "payment", js: "payment", typ: u(undefined, r("InstrumentsChangePayment")) },
    ], "any"),
    "InstrumentsChangePayment": o([
        { json: "instruments", js: "instruments", typ: u(undefined, a(r("PurpleSelectedPaymentInstrument"))) },
        { json: "selected_instrument_id", js: "selectedInstrumentId", typ: u(undefined, "") },
    ], "any"),
    "PurpleSelectedPaymentInstrument": o([
        { json: "billing_address", js: "billingAddress", typ: u(undefined, r("BillingAddressObject")) },
        { json: "credential", js: "credential", typ: u(undefined, r("CredentialObject")) },
        { json: "display", js: "display", typ: u(undefined, m("any")) },
        { json: "handler_id", js: "handlerId", typ: "" },
        { json: "id", js: "id", typ: "" },
        { json: "type", js: "type", typ: "" },
        { json: "selected", js: "selected", typ: u(undefined, true) },
    ], "any"),
    "InstrumentsChangeResultUcp": o([
        { json: "capabilities", js: "capabilities", typ: u(undefined, m(a(r("CapabilityElement")))) },
        { json: "payment_handlers", js: "paymentHandlers", typ: u(undefined, m(a(r("PaymentHandlerElement")))) },
        { json: "services", js: "services", typ: u(undefined, m(a(r("PurpleService")))) },
        { json: "status", js: "status", typ: r("UcpCheckoutResponseSchemaStatus") },
        { json: "version", js: "version", typ: "" },
    ], "any"),
    "CapabilityElement": o([
        { json: "config", js: "config", typ: u(undefined, m("any")) },
        { json: "id", js: "id", typ: u(undefined, "") },
        { json: "schema", js: "schema", typ: u(undefined, "") },
        { json: "spec", js: "spec", typ: u(undefined, "") },
        { json: "version", js: "version", typ: "" },
        { json: "extends", js: "extends", typ: u(undefined, u(a(""), "")) },
    ], "any"),
    "PaymentHandlerElement": o([
        { json: "config", js: "config", typ: u(undefined, m("any")) },
        { json: "id", js: "id", typ: "" },
        { json: "schema", js: "schema", typ: u(undefined, "") },
        { json: "spec", js: "spec", typ: u(undefined, "") },
        { json: "version", js: "version", typ: "" },
        { json: "available_instruments", js: "availableInstruments", typ: u(undefined, a(r("PaymentHandlerAvailableInstrument"))) },
    ], "any"),
    "PaymentHandlerAvailableInstrument": o([
        { json: "constraints", js: "constraints", typ: u(undefined, m("any")) },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleService": o([
        { json: "config", js: "config", typ: u(undefined, m("any")) },
        { json: "id", js: "id", typ: u(undefined, "") },
        { json: "schema", js: "schema", typ: u(undefined, "") },
        { json: "spec", js: "spec", typ: u(undefined, "") },
        { json: "version", js: "version", typ: "" },
        { json: "endpoint", js: "endpoint", typ: u(undefined, "") },
        { json: "transport", js: "transport", typ: r("Transport") },
    ], "any"),
    "CredentialResult": o([
        { json: "checkout", js: "checkout", typ: u(undefined, r("CredentialCheckout")) },
        { json: "ucp", js: "ucp", typ: r("InstrumentsChangeResultUcp") },
        { json: "continue_url", js: "continueUrl", typ: u(undefined, "") },
        { json: "messages", js: "messages", typ: u(undefined, a(r("MessageElement"))) },
    ], "any"),
    "CredentialCheckout": o([
        { json: "payment", js: "payment", typ: u(undefined, r("CredentialPayment")) },
    ], "any"),
    "CredentialPayment": o([
        { json: "instruments", js: "instruments", typ: u(undefined, a(r("PurpleSelectedPaymentInstrument"))) },
    ], "any"),
    "ContentType": [
        "markdown",
        "plain",
    ],
    "Severity": [
        "recoverable",
        "requires_buyer_input",
        "requires_buyer_review",
        "unrecoverable",
    ],
    "MessageType": [
        "error",
        "info",
        "warning",
    ],
    "CheckoutStatus": [
        "canceled",
        "complete_in_progress",
        "completed",
        "incomplete",
        "ready_for_complete",
        "requires_escalation",
    ],
    "EmbeddedColorScheme": [
        "dark",
        "light",
    ],
    "Transport": [
        "a2a",
        "embedded",
        "mcp",
        "rest",
    ],
    "UcpCheckoutResponseSchemaStatus": [
        "error",
        "success",
    ],
    "AdjustmentStatus": [
        "completed",
        "failed",
        "pending",
    ],
    "TypeElement": [
        "pickup",
        "shipping",
    ],
    "CardNumberType": [
        "dpan",
        "fpan",
        "network_token",
    ],
    "TypeEnum": [
        "card",
    ],
    "StatusEnum": [
        "error",
    ],
    "MethodType": [
        "digital",
        "pickup",
        "shipping",
    ],
    "MessageInfoType": [
        "info",
    ],
    "MessageWarningType": [
        "warning",
    ],
    "OrderLineItemStatus": [
        "fulfilled",
        "partial",
        "processing",
        "removed",
    ],
};
