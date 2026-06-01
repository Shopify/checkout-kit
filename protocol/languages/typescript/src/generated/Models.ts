// To parse this data:
//
//   import { Convert, Checkout, ErrorResponse, PaymentAccountInfo, Adjustment, AvailablePaymentInstrument, TokenBinding, BusinessFulfillmentConfig, BusinessSplitPaymentsConfig, Buyer, CardCredential, CardPaymentInstrument, Category, Context, DetailOptionValue, Expectation, Fulfillment, FulfillmentAvailableMethod, FulfillmentDestination, FulfillmentEvent, FulfillmentGroup, FulfillmentMethod, FulfillmentOption, InputCorrelation, InstrumentGroup, Item, LineItem, MerchantFulfillmentConfig, OptionValue, OrderConfirmation, OrderLineItem, PaymentCredential, PaymentIdentity, PaymentInstrument, PlatformFulfillmentConfig, PriceFilter, PriceRange, Product, ProductOption, Rating, RetailLocation, SearchFilters, SelectedOption, ShippingDestination, Signals, TokenCredential, Total, Variant, Payment, Order, InstrumentsChangeResult, CredentialResult } from "./file";
//
//   const checkout = Convert.toCheckout(json);
//   const errorResponse = Convert.toErrorResponse(json);
//   const paymentAccountInfo = Convert.toPaymentAccountInfo(json);
//   const adjustment = Convert.toAdjustment(json);
//   const attribution = Convert.toAttribution(json);
//   const availablePaymentInstrument = Convert.toAvailablePaymentInstrument(json);
//   const binding = Convert.toBinding(json);
//   const businessFulfillmentConfig = Convert.toBusinessFulfillmentConfig(json);
//   const businessSplitPaymentsConfig = Convert.toBusinessSplitPaymentsConfig(json);
//   const buyer = Convert.toBuyer(json);
//   const cardCredential = Convert.toCardCredential(json);
//   const cardPaymentInstrument = Convert.toCardPaymentInstrument(json);
//   const category = Convert.toCategory(json);
//   const context = Convert.toContext(json);
//   const detailOptionValue = Convert.toDetailOptionValue(json);
//   const expectation = Convert.toExpectation(json);
//   const fulfillment = Convert.toFulfillment(json);
//   const fulfillmentAvailableMethod = Convert.toFulfillmentAvailableMethod(json);
//   const fulfillmentDestination = Convert.toFulfillmentDestination(json);
//   const fulfillmentEvent = Convert.toFulfillmentEvent(json);
//   const fulfillmentGroup = Convert.toFulfillmentGroup(json);
//   const fulfillmentMethod = Convert.toFulfillmentMethod(json);
//   const fulfillmentOption = Convert.toFulfillmentOption(json);
//   const inputCorrelation = Convert.toInputCorrelation(json);
//   const instrumentGroup = Convert.toInstrumentGroup(json);
//   const item = Convert.toItem(json);
//   const lineItem = Convert.toLineItem(json);
//   const merchantFulfillmentConfig = Convert.toMerchantFulfillmentConfig(json);
//   const optionValue = Convert.toOptionValue(json);
//   const orderConfirmation = Convert.toOrderConfirmation(json);
//   const orderLineItem = Convert.toOrderLineItem(json);
//   const paymentCredential = Convert.toPaymentCredential(json);
//   const paymentIdentity = Convert.toPaymentIdentity(json);
//   const paymentInstrument = Convert.toPaymentInstrument(json);
//   const platformFulfillmentConfig = Convert.toPlatformFulfillmentConfig(json);
//   const priceFilter = Convert.toPriceFilter(json);
//   const priceRange = Convert.toPriceRange(json);
//   const product = Convert.toProduct(json);
//   const productOption = Convert.toProductOption(json);
//   const rating = Convert.toRating(json);
//   const retailLocation = Convert.toRetailLocation(json);
//   const searchFilters = Convert.toSearchFilters(json);
//   const selectedOption = Convert.toSelectedOption(json);
//   const shippingDestination = Convert.toShippingDestination(json);
//   const signals = Convert.toSignals(json);
//   const tokenCredential = Convert.toTokenCredential(json);
//   const total = Convert.toTotal(json);
//   const totals = Convert.toTotals(json);
//   const variant = Convert.toVariant(json);
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
    attribution?: { [key: string]: string };
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
    links: Link[];
    /**
     * List of messages with error and info about the checkout session state.
     */
    messages?: Message[];
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

export interface MessageError {
    code: string;
    content: string;
    contentType?: ContentType;
    path?: string;
    severity: Severity;
    type: StatusEnum;
    [property: string]: any;
}

export interface MessageInfo {
    code?: string;
    content: string;
    contentType?: ContentType;
    path?: string;
    type: "info";
    [property: string]: any;
}

export interface MessageWarning {
    code: string;
    content: string;
    contentType?: ContentType;
    imageUrl?: string;
    path?: string;
    presentation?: string;
    type: "warning";
    url?: string;
    [property: string]: any;
}

/**
 * Container for error, warning, or info messages.
 */
export interface Message {
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
    billingAddress?: PostalAddress;
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

/**
 * Business-level configuration for split payments. Declaring the capability means multiple
 * payment instruments are supported; this config declares which combinations are valid.
 */
export interface BusinessSplitPaymentsConfig {
    /**
     * Array of valid instrument combinations. Each combination is an array of instrument
     * groups. A payment is valid if it matches any combination.
     */
    allowedCombinations: Array<AllowedCombinationElement[]>;
    [property: string]: any;
}

/**
 * A single valid combination: an array of instrument groups that together define the
 * constraints. All groups must be satisfied (AND logic).
 *
 * A constraint within an allowed combination that defines which instrument types can fill
 * this group and how many are permitted.
 */
export interface AllowedCombinationElement {
    /**
     * Maximum number of instruments allowed from this group. Defaults to 1. MUST be greater
     * than or equal to `min`.
     */
    max?: number;
    /**
     * Minimum number of instruments required from this group. Defaults to 0 (optional).
     */
    min?: number;
    /**
     * Instrument types accepted by this group (OR logic). Any listed type qualifies.
     */
    types: string[];
    [property: string]: any;
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
    type: ErrorCode;
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
export type ErrorCode = "card";

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
    billingAddress?: PostalAddress;
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
    type: ErrorCode;
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
 * A product category with optional taxonomy identifier.
 */
export interface Category {
    /**
     * Source taxonomy. Well-known values: `google_product_category`, `shopify`, `merchant`.
     */
    taxonomy?: string;
    /**
     * Category value or path (e.g., 'Apparel > Shirts', '1604').
     */
    value: string;
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
 * An option value with availability signals relative to the current selections. Used in
 * get_product responses where selected context exists.
 *
 * A selectable value for a product option.
 */
export interface DetailOptionValue {
    /**
     * Whether a variant matching this value and the current option selections is purchasable.
     */
    available?: boolean;
    /**
     * Whether a variant matching this value and the current option selections exists in the
     * catalog.
     */
    exists?: boolean;
    /**
     * Optional server-assigned identifier for this option value. When present in a
     * selected_option, the server SHOULD use it for matching instead of label.
     */
    id?: string;
    /**
     * Display text for this option value (e.g., 'Small', 'Blue').
     */
    label: string;
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
    address?: PostalAddress;
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
    address?: PostalAddress;
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
 * Maps a request identifier to the variant it resolved to, with match semantics.
 */
export interface InputCorrelation {
    /**
     * The identifier from the lookup request that resolved to this variant.
     */
    id: string;
    /**
     * How the request identifier resolved to this variant. Well-known values: `exact` (input
     * directly identifies this variant, e.g., variant ID, SKU), `featured` (server selected
     * this variant as representative, e.g., product ID resolved to best match). Businesses MAY
     * implement and provide additional resolution strategies.
     */
    match?: string;
    [property: string]: any;
}

/**
 * A constraint within an allowed combination that defines which instrument types can fill
 * this group and how many are permitted.
 */
export interface InstrumentGroup {
    /**
     * Maximum number of instruments allowed from this group. Defaults to 1. MUST be greater
     * than or equal to `min`.
     */
    max?: number;
    /**
     * Minimum number of instruments required from this group. Defaults to 0 (optional).
     */
    min?: number;
    /**
     * Instrument types accepted by this group (OR logic). Any listed type qualifies.
     */
    types: string[];
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

/**
 * A selectable value for a product option.
 */
export interface OptionValue {
    /**
     * Optional server-assigned identifier for this option value. When present in a
     * selected_option, the server SHOULD use it for matching instead of label.
     */
    id?: string;
    /**
     * Display text for this option value (e.g., 'Small', 'Blue').
     */
    label: string;
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
    billingAddress?: PostalAddress;
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

/**
 * Price range filter denominated in context.currency. When context.currency matches the
 * presentment currency, businesses apply the filter directly. When it differs, businesses
 * SHOULD convert filter values to the presentment currency before applying; if conversion
 * is not supported, businesses MAY ignore the filter and SHOULD indicate this via a
 * message. When context.currency is absent, filter denomination is ambiguous and businesses
 * MAY ignore it.
 */
export interface PriceFilter {
    /**
     * Maximum price in ISO 4217 minor units.
     */
    max?: number;
    /**
     * Minimum price in ISO 4217 minor units.
     */
    min?: number;
    [property: string]: any;
}

/**
 * A price range representing minimum and maximum values (e.g., across product variants).
 */
export interface PriceRange {
    /**
     * Maximum price in the range.
     */
    max: Price;
    /**
     * Minimum price in the range.
     */
    min: Price;
    [property: string]: any;
}

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
export interface Price {
    /**
     * Amount in ISO 4217 minor units. Use 0 for free items.
     */
    amount: number;
    /**
     * ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP').
     */
    currency: string;
    [property: string]: any;
}

/**
 * A product in the catalog with variants and options.
 */
export interface Product {
    /**
     * Product categories with optional taxonomy identifiers.
     */
    categories?: CategoryElement[];
    /**
     * Product description in one or more formats.
     */
    description: Description;
    /**
     * URL-safe slug for SEO-friendly URLs (e.g., 'blue-runner-pro'). Use id for stable API
     * references.
     */
    handle?: string;
    /**
     * Global ID (GID) uniquely identifying this product.
     */
    id: string;
    /**
     * List price range before discounts (for strikethrough display).
     */
    listPriceRange?: ListPriceRangeObject;
    /**
     * Product media (images, videos, 3D models). First item is the featured media for listings.
     */
    media?: Media[];
    /**
     * Business-defined custom data extending the standard product model.
     */
    metadata?: { [key: string]: any };
    /**
     * Product options (Size, Color, etc.).
     */
    options?: OptionObject[];
    /**
     * Price range across all variants.
     */
    priceRange: ListPriceRangeObject;
    /**
     * Aggregate product rating.
     */
    rating?: RatingObject;
    /**
     * Product tags for categorization and search.
     */
    tags?: string[];
    /**
     * Product title.
     */
    title: string;
    /**
     * Canonical product page URL.
     */
    url?: string;
    /**
     * Purchasable variants of this product. First item is the featured variant for listings.
     */
    variants: VariantElement[];
    [property: string]: any;
}

/**
 * A product category with optional taxonomy identifier.
 */
export interface CategoryElement {
    /**
     * Source taxonomy. Well-known values: `google_product_category`, `shopify`, `merchant`.
     */
    taxonomy?: string;
    /**
     * Category value or path (e.g., 'Apparel > Shirts', '1604').
     */
    value: string;
    [property: string]: any;
}

/**
 * Product description in one or more formats.
 *
 * Description content in one or more formats. At least one format must be provided.
 *
 * Variant description in one or more formats.
 */
export interface Description {
    /**
     * HTML-formatted content. Security: Platforms MUST sanitize before rendering—strip scripts,
     * event handlers, and untrusted elements. Treat all rich text as untrusted input.
     */
    html?: string;
    /**
     * Markdown-formatted content.
     */
    markdown?: string;
    /**
     * Plain text content.
     */
    plain?: string;
    [property: string]: any;
}

/**
 * List price range before discounts (for strikethrough display).
 *
 * A price range representing minimum and maximum values (e.g., across product variants).
 *
 * Price range across all variants.
 */
export interface ListPriceRangeObject {
    /**
     * Maximum price in the range.
     */
    max: Price;
    /**
     * Minimum price in the range.
     */
    min: Price;
    [property: string]: any;
}

/**
 * Media item (image, video, etc.).
 */
export interface Media {
    /**
     * Accessibility text describing the media.
     */
    altText?: string;
    /**
     * Height in pixels (for images/video).
     */
    height?: number;
    /**
     * Media type. Well-known values: `image`, `video`, `model_3d`.
     */
    type: string;
    /**
     * URL to the media resource.
     */
    url: string;
    /**
     * Width in pixels (for images/video).
     */
    width?: number;
    [property: string]: any;
}

/**
 * A product option such as size, color, or material.
 */
export interface OptionObject {
    /**
     * Option name (e.g., 'Size', 'Color').
     */
    name: string;
    /**
     * Available values for this option.
     */
    values: ValueElement[];
    [property: string]: any;
}

/**
 * A selectable value for a product option.
 */
export interface ValueElement {
    /**
     * Optional server-assigned identifier for this option value. When present in a
     * selected_option, the server SHOULD use it for matching instead of label.
     */
    id?: string;
    /**
     * Display text for this option value (e.g., 'Small', 'Blue').
     */
    label: string;
    [property: string]: any;
}

/**
 * Aggregate product rating.
 *
 * Product rating aggregate.
 *
 * Variant rating.
 */
export interface RatingObject {
    /**
     * Number of reviews contributing to the rating.
     */
    count?: number;
    /**
     * Maximum value on the rating scale (e.g., 5 for 5-star).
     */
    scaleMax: number;
    /**
     * Minimum value on the rating scale (e.g., 1 for 1-5 stars).
     */
    scaleMin?: number;
    /**
     * Average rating value.
     */
    value: number;
    [property: string]: any;
}

/**
 * A purchasable variant of a product with specific option selections.
 */
export interface VariantElement {
    /**
     * Variant availability for purchase.
     */
    availability?: VariantAvailability;
    /**
     * Industry-standard product identifiers for cross-reference and correlation.
     */
    barcodes?: VariantBarcode[];
    /**
     * Variant categories with optional taxonomy identifiers.
     */
    categories?: CategoryElement[];
    /**
     * Variant description in one or more formats.
     */
    description: Description;
    /**
     * URL-safe variant handle/slug.
     */
    handle?: string;
    /**
     * Global ID (GID) uniquely identifying this variant. Used as item.id in checkout.
     */
    id: string;
    /**
     * List price before discounts (for strikethrough display).
     */
    listPrice?: Price;
    /**
     * Variant media (images, videos, 3D models). First item is the featured media for listings.
     */
    media?: Media[];
    /**
     * Business-defined custom data extending the standard variant model.
     */
    metadata?: { [key: string]: any };
    /**
     * Option values that define this variant (e.g., Color: Blue, Size: Large).
     */
    options?: VariantOption[];
    /**
     * Current selling price.
     */
    price: Price;
    /**
     * Variant rating.
     */
    rating?: RatingObject;
    /**
     * Optional seller context for this variant.
     */
    seller?: VariantSeller;
    /**
     * Business-assigned identifier for inventory and fulfillment.
     */
    sku?: string;
    /**
     * Variant tags for categorization and search.
     */
    tags?: string[];
    /**
     * Variant display title (e.g., 'Blue / Large').
     */
    title: string;
    /**
     * Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
     */
    unitPrice?: VariantUnitPrice;
    /**
     * Canonical variant page URL.
     */
    url?: string;
    [property: string]: any;
}

/**
 * Variant availability for purchase.
 */
export interface VariantAvailability {
    /**
     * Whether this variant can be purchased. See status for fulfillment details.
     */
    available?: boolean;
    /**
     * Qualifies available with fulfillment state. Well-known values: `in_stock`, `backorder`,
     * `preorder`, `out_of_stock`, `discontinued`.
     */
    status?: string;
    [property: string]: any;
}

export interface VariantBarcode {
    /**
     * Barcode standard. Well-known values: UPC, EAN, ISBN, GTIN, JAN.
     */
    type: string;
    /**
     * Barcode value.
     */
    value: string;
    [property: string]: any;
}

/**
 * A specific option selection on a variant (e.g., Size: Large).
 */
export interface VariantOption {
    /**
     * Optional option value identifier from option_value.id. When present, the server SHOULD
     * use it for matching; name and label remain required for display.
     */
    id?: string;
    /**
     * Selected option label (e.g., 'Large').
     */
    label: string;
    /**
     * Option name (e.g., 'Size').
     */
    name: string;
    [property: string]: any;
}

/**
 * Optional seller context for this variant.
 */
export interface VariantSeller {
    /**
     * Seller policy and information links.
     */
    links?: Link[];
    /**
     * Seller display name.
     */
    name?: string;
    [property: string]: any;
}

/**
 * Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
 */
export interface VariantUnitPrice {
    /**
     * Unit price in ISO 4217 minor units. Business MUST return precomputed unit price value:
     * (variant.price / measure.value) * reference.value.
     */
    amount: number;
    /**
     * ISO 4217 currency code.
     */
    currency: string;
    /**
     * Product quantity in packaging (e.g., 750ml bottle).
     */
    measure: PurpleMeasure;
    /**
     * Denominator for unit price display (e.g., per 100ml, per 1kg).
     */
    reference: PurpleReference;
    [property: string]: any;
}

/**
 * Product quantity in packaging (e.g., 750ml bottle).
 */
export interface PurpleMeasure {
    /**
     * Unit of measurement.
     */
    unit: string;
    /**
     * Package quantity.
     */
    value: number;
    [property: string]: any;
}

/**
 * Denominator for unit price display (e.g., per 100ml, per 1kg).
 */
export interface PurpleReference {
    /**
     * Unit of measurement.
     */
    unit: string;
    /**
     * Reference quantity.
     */
    value: number;
    [property: string]: any;
}

/**
 * A product option such as size, color, or material.
 */
export interface ProductOption {
    /**
     * Option name (e.g., 'Size', 'Color').
     */
    name: string;
    /**
     * Available values for this option.
     */
    values: ValueElement[];
    [property: string]: any;
}

/**
 * Product rating aggregate.
 */
export interface Rating {
    /**
     * Number of reviews contributing to the rating.
     */
    count?: number;
    /**
     * Maximum value on the rating scale (e.g., 5 for 5-star).
     */
    scaleMax: number;
    /**
     * Minimum value on the rating scale (e.g., 1 for 1-5 stars).
     */
    scaleMin?: number;
    /**
     * Average rating value.
     */
    value: number;
    [property: string]: any;
}

/**
 * A pickup location (retail store, locker, etc.).
 */
export interface RetailLocation {
    /**
     * Physical address of the location.
     */
    address?: PostalAddress;
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
 * Filter criteria to narrow search results. All specified filters combine with AND logic.
 */
export interface SearchFilters {
    /**
     * Filter by product categories (OR logic — matches products in any listed categories).
     * Values match against the value field in product category entries. Valid values can be
     * discovered from the categories field in search results, merchant documentation, or
     * standard taxonomies that businesses may align with.
     */
    categories?: string[];
    price?:      PriceObject;
    [property: string]: any;
}

/**
 * Price range filter denominated in context.currency. When context.currency matches the
 * presentment currency, businesses apply the filter directly. When it differs, businesses
 * SHOULD convert filter values to the presentment currency before applying; if conversion
 * is not supported, businesses MAY ignore the filter and SHOULD indicate this via a
 * message. When context.currency is absent, filter denomination is ambiguous and businesses
 * MAY ignore it.
 */
export interface PriceObject {
    /**
     * Maximum price in ISO 4217 minor units.
     */
    max?: number;
    /**
     * Minimum price in ISO 4217 minor units.
     */
    min?: number;
    [property: string]: any;
}

/**
 * A specific option selection on a variant (e.g., Size: Large).
 */
export interface SelectedOption {
    /**
     * Optional option value identifier from option_value.id. When present, the server SHOULD
     * use it for matching; name and label remain required for display.
     */
    id?: string;
    /**
     * Selected option label (e.g., 'Large').
     */
    label: string;
    /**
     * Option name (e.g., 'Size').
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
 * A purchasable variant of a product with specific option selections.
 */
export interface Variant {
    /**
     * Variant availability for purchase.
     */
    availability?: VariantAvailabilityObject;
    /**
     * Industry-standard product identifiers for cross-reference and correlation.
     */
    barcodes?: VariantBarcodeObject[];
    /**
     * Variant categories with optional taxonomy identifiers.
     */
    categories?: CategoryElement[];
    /**
     * Variant description in one or more formats.
     */
    description: Description;
    /**
     * URL-safe variant handle/slug.
     */
    handle?: string;
    /**
     * Global ID (GID) uniquely identifying this variant. Used as item.id in checkout.
     */
    id: string;
    /**
     * List price before discounts (for strikethrough display).
     */
    listPrice?: Price;
    /**
     * Variant media (images, videos, 3D models). First item is the featured media for listings.
     */
    media?: Media[];
    /**
     * Business-defined custom data extending the standard variant model.
     */
    metadata?: { [key: string]: any };
    /**
     * Option values that define this variant (e.g., Color: Blue, Size: Large).
     */
    options?: VariantOption[];
    /**
     * Current selling price.
     */
    price: Price;
    /**
     * Variant rating.
     */
    rating?: RatingObject;
    /**
     * Optional seller context for this variant.
     */
    seller?: VariantSellerObject;
    /**
     * Business-assigned identifier for inventory and fulfillment.
     */
    sku?: string;
    /**
     * Variant tags for categorization and search.
     */
    tags?: string[];
    /**
     * Variant display title (e.g., 'Blue / Large').
     */
    title: string;
    /**
     * Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
     */
    unitPrice?: VariantUnitPriceObject;
    /**
     * Canonical variant page URL.
     */
    url?: string;
    [property: string]: any;
}

/**
 * Variant availability for purchase.
 */
export interface VariantAvailabilityObject {
    /**
     * Whether this variant can be purchased. See status for fulfillment details.
     */
    available?: boolean;
    /**
     * Qualifies available with fulfillment state. Well-known values: `in_stock`, `backorder`,
     * `preorder`, `out_of_stock`, `discontinued`.
     */
    status?: string;
    [property: string]: any;
}

export interface VariantBarcodeObject {
    /**
     * Barcode standard. Well-known values: UPC, EAN, ISBN, GTIN, JAN.
     */
    type: string;
    /**
     * Barcode value.
     */
    value: string;
    [property: string]: any;
}

/**
 * Optional seller context for this variant.
 */
export interface VariantSellerObject {
    /**
     * Seller policy and information links.
     */
    links?: Link[];
    /**
     * Seller display name.
     */
    name?: string;
    [property: string]: any;
}

/**
 * Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
 */
export interface VariantUnitPriceObject {
    /**
     * Unit price in ISO 4217 minor units. Business MUST return precomputed unit price value:
     * (variant.price / measure.value) * reference.value.
     */
    amount: number;
    /**
     * ISO 4217 currency code.
     */
    currency: string;
    /**
     * Product quantity in packaging (e.g., 750ml bottle).
     */
    measure: FluffyMeasure;
    /**
     * Denominator for unit price display (e.g., per 100ml, per 1kg).
     */
    reference: FluffyReference;
    [property: string]: any;
}

/**
 * Product quantity in packaging (e.g., 750ml bottle).
 */
export interface FluffyMeasure {
    /**
     * Unit of measurement.
     */
    unit: string;
    /**
     * Package quantity.
     */
    value: number;
    [property: string]: any;
}

/**
 * Denominator for unit price display (e.g., per 100ml, per 1kg).
 */
export interface FluffyReference {
    /**
     * Unit of measurement.
     */
    unit: string;
    /**
     * Reference quantity.
     */
    value: number;
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
     * Snapshot of the attribution associated with the originating checkout. Read-only on the
     * order.
     */
    attribution?: { [key: string]: string };
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
    messages?: Message[];
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
    billingAddress?: PostalAddress;
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
    messages?: Message[];
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

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toCheckout(json: string): Checkout {
        return cast(JSON.parse(json), r("Checkout"));
    }

    public static checkoutToJson(value: Checkout): string {
        return JSON.stringify(uncast(value, r("Checkout")), null, 2);
    }

    public static toErrorResponse(json: string): ErrorResponse {
        return cast(JSON.parse(json), r("ErrorResponse"));
    }

    public static errorResponseToJson(value: ErrorResponse): string {
        return JSON.stringify(uncast(value, r("ErrorResponse")), null, 2);
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

    public static toAttribution(json: string): { [key: string]: string } {
        return cast(JSON.parse(json), m(""));
    }

    public static attributionToJson(value: { [key: string]: string }): string {
        return JSON.stringify(uncast(value, m("")), null, 2);
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

    public static toBusinessSplitPaymentsConfig(json: string): BusinessSplitPaymentsConfig {
        return cast(JSON.parse(json), r("BusinessSplitPaymentsConfig"));
    }

    public static businessSplitPaymentsConfigToJson(value: BusinessSplitPaymentsConfig): string {
        return JSON.stringify(uncast(value, r("BusinessSplitPaymentsConfig")), null, 2);
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

    public static toCategory(json: string): Category {
        return cast(JSON.parse(json), r("Category"));
    }

    public static categoryToJson(value: Category): string {
        return JSON.stringify(uncast(value, r("Category")), null, 2);
    }

    public static toContext(json: string): Context {
        return cast(JSON.parse(json), r("Context"));
    }

    public static contextToJson(value: Context): string {
        return JSON.stringify(uncast(value, r("Context")), null, 2);
    }

    public static toDetailOptionValue(json: string): DetailOptionValue {
        return cast(JSON.parse(json), r("DetailOptionValue"));
    }

    public static detailOptionValueToJson(value: DetailOptionValue): string {
        return JSON.stringify(uncast(value, r("DetailOptionValue")), null, 2);
    }

    public static toExpectation(json: string): Expectation {
        return cast(JSON.parse(json), r("Expectation"));
    }

    public static expectationToJson(value: Expectation): string {
        return JSON.stringify(uncast(value, r("Expectation")), null, 2);
    }

    public static toFulfillment(json: string): Fulfillment {
        return cast(JSON.parse(json), r("Fulfillment"));
    }

    public static fulfillmentToJson(value: Fulfillment): string {
        return JSON.stringify(uncast(value, r("Fulfillment")), null, 2);
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

    public static toInputCorrelation(json: string): InputCorrelation {
        return cast(JSON.parse(json), r("InputCorrelation"));
    }

    public static inputCorrelationToJson(value: InputCorrelation): string {
        return JSON.stringify(uncast(value, r("InputCorrelation")), null, 2);
    }

    public static toInstrumentGroup(json: string): InstrumentGroup {
        return cast(JSON.parse(json), r("InstrumentGroup"));
    }

    public static instrumentGroupToJson(value: InstrumentGroup): string {
        return JSON.stringify(uncast(value, r("InstrumentGroup")), null, 2);
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

    public static toMerchantFulfillmentConfig(json: string): MerchantFulfillmentConfig {
        return cast(JSON.parse(json), r("MerchantFulfillmentConfig"));
    }

    public static merchantFulfillmentConfigToJson(value: MerchantFulfillmentConfig): string {
        return JSON.stringify(uncast(value, r("MerchantFulfillmentConfig")), null, 2);
    }

    public static toOptionValue(json: string): OptionValue {
        return cast(JSON.parse(json), r("OptionValue"));
    }

    public static optionValueToJson(value: OptionValue): string {
        return JSON.stringify(uncast(value, r("OptionValue")), null, 2);
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

    public static toPriceFilter(json: string): PriceFilter {
        return cast(JSON.parse(json), r("PriceFilter"));
    }

    public static priceFilterToJson(value: PriceFilter): string {
        return JSON.stringify(uncast(value, r("PriceFilter")), null, 2);
    }

    public static toPriceRange(json: string): PriceRange {
        return cast(JSON.parse(json), r("PriceRange"));
    }

    public static priceRangeToJson(value: PriceRange): string {
        return JSON.stringify(uncast(value, r("PriceRange")), null, 2);
    }

    public static toProduct(json: string): Product {
        return cast(JSON.parse(json), r("Product"));
    }

    public static productToJson(value: Product): string {
        return JSON.stringify(uncast(value, r("Product")), null, 2);
    }

    public static toProductOption(json: string): ProductOption {
        return cast(JSON.parse(json), r("ProductOption"));
    }

    public static productOptionToJson(value: ProductOption): string {
        return JSON.stringify(uncast(value, r("ProductOption")), null, 2);
    }

    public static toRating(json: string): Rating {
        return cast(JSON.parse(json), r("Rating"));
    }

    public static ratingToJson(value: Rating): string {
        return JSON.stringify(uncast(value, r("Rating")), null, 2);
    }

    public static toRetailLocation(json: string): RetailLocation {
        return cast(JSON.parse(json), r("RetailLocation"));
    }

    public static retailLocationToJson(value: RetailLocation): string {
        return JSON.stringify(uncast(value, r("RetailLocation")), null, 2);
    }

    public static toSearchFilters(json: string): SearchFilters {
        return cast(JSON.parse(json), r("SearchFilters"));
    }

    public static searchFiltersToJson(value: SearchFilters): string {
        return JSON.stringify(uncast(value, r("SearchFilters")), null, 2);
    }

    public static toSelectedOption(json: string): SelectedOption {
        return cast(JSON.parse(json), r("SelectedOption"));
    }

    public static selectedOptionToJson(value: SelectedOption): string {
        return JSON.stringify(uncast(value, r("SelectedOption")), null, 2);
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

    public static toVariant(json: string): Variant {
        return cast(JSON.parse(json), r("Variant"));
    }

    public static variantToJson(value: Variant): string {
        return JSON.stringify(uncast(value, r("Variant")), null, 2);
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
        { json: "attribution", js: "attribution", typ: u(undefined, m("")) },
        { json: "buyer", js: "buyer", typ: u(undefined, r("BuyerObject")) },
        { json: "context", js: "context", typ: u(undefined, r("ContextObject")) },
        { json: "continue_url", js: "continueUrl", typ: u(undefined, "") },
        { json: "currency", js: "currency", typ: "" },
        { json: "expires_at", js: "expiresAt", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "line_items", js: "lineItems", typ: a(r("CheckoutLineItem")) },
        { json: "links", js: "links", typ: a(r("Link")) },
        { json: "messages", js: "messages", typ: u(undefined, a(r("Message"))) },
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
    "Link": o([
        { json: "title", js: "title", typ: u(undefined, "") },
        { json: "type", js: "type", typ: "" },
        { json: "url", js: "url", typ: "" },
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
    "OrderObject": o([
        { json: "id", js: "id", typ: "" },
        { json: "label", js: "label", typ: u(undefined, "") },
        { json: "permalink_url", js: "permalinkUrl", typ: "" },
    ], "any"),
    "PaymentObject": o([
        { json: "instruments", js: "instruments", typ: u(undefined, a(r("PaymentSelectedPaymentInstrument"))) },
    ], "any"),
    "PaymentSelectedPaymentInstrument": o([
        { json: "billing_address", js: "billingAddress", typ: u(undefined, r("PostalAddress")) },
        { json: "credential", js: "credential", typ: u(undefined, r("CredentialObject")) },
        { json: "display", js: "display", typ: u(undefined, m("any")) },
        { json: "handler_id", js: "handlerId", typ: "" },
        { json: "id", js: "id", typ: "" },
        { json: "type", js: "type", typ: "" },
        { json: "selected", js: "selected", typ: u(undefined, true) },
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
    "ErrorResponse": o([
        { json: "continue_url", js: "continueUrl", typ: u(undefined, "") },
        { json: "messages", js: "messages", typ: a(r("Message")) },
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
    "BusinessSplitPaymentsConfig": o([
        { json: "allowed_combinations", js: "allowedCombinations", typ: a(a(r("AllowedCombinationElement"))) },
    ], "any"),
    "AllowedCombinationElement": o([
        { json: "max", js: "max", typ: u(undefined, 0) },
        { json: "min", js: "min", typ: u(undefined, 0) },
        { json: "types", js: "types", typ: a("") },
    ], "any"),
    "Buyer": o([
        { json: "email", js: "email", typ: u(undefined, "") },
        { json: "first_name", js: "firstName", typ: u(undefined, "") },
        { json: "last_name", js: "lastName", typ: u(undefined, "") },
        { json: "phone_number", js: "phoneNumber", typ: u(undefined, "") },
    ], "any"),
    "CardCredential": o([
        { json: "type", js: "type", typ: r("ErrorCode") },
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
        { json: "billing_address", js: "billingAddress", typ: u(undefined, r("PostalAddress")) },
        { json: "credential", js: "credential", typ: u(undefined, r("CredentialObject")) },
        { json: "display", js: "display", typ: u(undefined, r("Display")) },
        { json: "handler_id", js: "handlerId", typ: "" },
        { json: "id", js: "id", typ: "" },
        { json: "type", js: "type", typ: r("ErrorCode") },
    ], "any"),
    "Display": o([
        { json: "brand", js: "brand", typ: u(undefined, "") },
        { json: "card_art", js: "cardArt", typ: u(undefined, "") },
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "expiry_month", js: "expiryMonth", typ: u(undefined, 0) },
        { json: "expiry_year", js: "expiryYear", typ: u(undefined, 0) },
        { json: "last_digits", js: "lastDigits", typ: u(undefined, "") },
    ], "any"),
    "Category": o([
        { json: "taxonomy", js: "taxonomy", typ: u(undefined, "") },
        { json: "value", js: "value", typ: "" },
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
    "DetailOptionValue": o([
        { json: "available", js: "available", typ: u(undefined, true) },
        { json: "exists", js: "exists", typ: u(undefined, true) },
        { json: "id", js: "id", typ: u(undefined, "") },
        { json: "label", js: "label", typ: "" },
    ], "any"),
    "Expectation": o([
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "destination", js: "destination", typ: r("PostalAddress") },
        { json: "fulfillable_on", js: "fulfillableOn", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "line_items", js: "lineItems", typ: a(r("ExpectationLineItem")) },
        { json: "method_type", js: "methodType", typ: r("MethodType") },
    ], "any"),
    "ExpectationLineItem": o([
        { json: "id", js: "id", typ: "" },
        { json: "quantity", js: "quantity", typ: 0 },
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
        { json: "address", js: "address", typ: u(undefined, r("PostalAddress")) },
        { json: "name", js: "name", typ: u(undefined, "") },
    ], "any"),
    "GroupElement": o([
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
        { json: "address", js: "address", typ: u(undefined, r("PostalAddress")) },
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
    "FulfillmentMethod": o([
        { json: "destinations", js: "destinations", typ: u(undefined, a(r("FulfillmentDestinationElement"))) },
        { json: "groups", js: "groups", typ: u(undefined, a(r("GroupElement"))) },
        { json: "id", js: "id", typ: "" },
        { json: "line_item_ids", js: "lineItemIds", typ: a("") },
        { json: "selected_destination_id", js: "selectedDestinationId", typ: u(undefined, u(null, "")) },
        { json: "type", js: "type", typ: r("TypeElement") },
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
    "InputCorrelation": o([
        { json: "id", js: "id", typ: "" },
        { json: "match", js: "match", typ: u(undefined, "") },
    ], "any"),
    "InstrumentGroup": o([
        { json: "max", js: "max", typ: u(undefined, 0) },
        { json: "min", js: "min", typ: u(undefined, 0) },
        { json: "types", js: "types", typ: a("") },
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
    "MerchantFulfillmentConfig": o([
        { json: "allows_method_combinations", js: "allowsMethodCombinations", typ: u(undefined, a(a(r("TypeElement")))) },
        { json: "allows_multi_destination", js: "allowsMultiDestination", typ: u(undefined, r("MerchantFulfillmentConfigAllowsMultiDestination")) },
    ], "any"),
    "MerchantFulfillmentConfigAllowsMultiDestination": o([
        { json: "pickup", js: "pickup", typ: u(undefined, true) },
        { json: "shipping", js: "shipping", typ: u(undefined, true) },
    ], false),
    "OptionValue": o([
        { json: "id", js: "id", typ: u(undefined, "") },
        { json: "label", js: "label", typ: "" },
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
        { json: "billing_address", js: "billingAddress", typ: u(undefined, r("PostalAddress")) },
        { json: "credential", js: "credential", typ: u(undefined, r("CredentialObject")) },
        { json: "display", js: "display", typ: u(undefined, m("any")) },
        { json: "handler_id", js: "handlerId", typ: "" },
        { json: "id", js: "id", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PlatformFulfillmentConfig": o([
        { json: "supports_multi_group", js: "supportsMultiGroup", typ: u(undefined, true) },
    ], "any"),
    "PriceFilter": o([
        { json: "max", js: "max", typ: u(undefined, 0) },
        { json: "min", js: "min", typ: u(undefined, 0) },
    ], "any"),
    "PriceRange": o([
        { json: "max", js: "max", typ: r("Price") },
        { json: "min", js: "min", typ: r("Price") },
    ], "any"),
    "Price": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "currency", js: "currency", typ: "" },
    ], "any"),
    "Product": o([
        { json: "categories", js: "categories", typ: u(undefined, a(r("CategoryElement"))) },
        { json: "description", js: "description", typ: r("Description") },
        { json: "handle", js: "handle", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "list_price_range", js: "listPriceRange", typ: u(undefined, r("ListPriceRangeObject")) },
        { json: "media", js: "media", typ: u(undefined, a(r("Media"))) },
        { json: "metadata", js: "metadata", typ: u(undefined, m("any")) },
        { json: "options", js: "options", typ: u(undefined, a(r("OptionObject"))) },
        { json: "price_range", js: "priceRange", typ: r("ListPriceRangeObject") },
        { json: "rating", js: "rating", typ: u(undefined, r("RatingObject")) },
        { json: "tags", js: "tags", typ: u(undefined, a("")) },
        { json: "title", js: "title", typ: "" },
        { json: "url", js: "url", typ: u(undefined, "") },
        { json: "variants", js: "variants", typ: a(r("VariantElement")) },
    ], "any"),
    "CategoryElement": o([
        { json: "taxonomy", js: "taxonomy", typ: u(undefined, "") },
        { json: "value", js: "value", typ: "" },
    ], "any"),
    "Description": o([
        { json: "html", js: "html", typ: u(undefined, "") },
        { json: "markdown", js: "markdown", typ: u(undefined, "") },
        { json: "plain", js: "plain", typ: u(undefined, "") },
    ], "any"),
    "ListPriceRangeObject": o([
        { json: "max", js: "max", typ: r("Price") },
        { json: "min", js: "min", typ: r("Price") },
    ], "any"),
    "Media": o([
        { json: "alt_text", js: "altText", typ: u(undefined, "") },
        { json: "height", js: "height", typ: u(undefined, 0) },
        { json: "type", js: "type", typ: "" },
        { json: "url", js: "url", typ: "" },
        { json: "width", js: "width", typ: u(undefined, 0) },
    ], "any"),
    "OptionObject": o([
        { json: "name", js: "name", typ: "" },
        { json: "values", js: "values", typ: a(r("ValueElement")) },
    ], "any"),
    "ValueElement": o([
        { json: "id", js: "id", typ: u(undefined, "") },
        { json: "label", js: "label", typ: "" },
    ], "any"),
    "RatingObject": o([
        { json: "count", js: "count", typ: u(undefined, 0) },
        { json: "scale_max", js: "scaleMax", typ: 3.14 },
        { json: "scale_min", js: "scaleMin", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "VariantElement": o([
        { json: "availability", js: "availability", typ: u(undefined, r("VariantAvailability")) },
        { json: "barcodes", js: "barcodes", typ: u(undefined, a(r("VariantBarcode"))) },
        { json: "categories", js: "categories", typ: u(undefined, a(r("CategoryElement"))) },
        { json: "description", js: "description", typ: r("Description") },
        { json: "handle", js: "handle", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "list_price", js: "listPrice", typ: u(undefined, r("Price")) },
        { json: "media", js: "media", typ: u(undefined, a(r("Media"))) },
        { json: "metadata", js: "metadata", typ: u(undefined, m("any")) },
        { json: "options", js: "options", typ: u(undefined, a(r("VariantOption"))) },
        { json: "price", js: "price", typ: r("Price") },
        { json: "rating", js: "rating", typ: u(undefined, r("RatingObject")) },
        { json: "seller", js: "seller", typ: u(undefined, r("VariantSeller")) },
        { json: "sku", js: "sku", typ: u(undefined, "") },
        { json: "tags", js: "tags", typ: u(undefined, a("")) },
        { json: "title", js: "title", typ: "" },
        { json: "unit_price", js: "unitPrice", typ: u(undefined, r("VariantUnitPrice")) },
        { json: "url", js: "url", typ: u(undefined, "") },
    ], "any"),
    "VariantAvailability": o([
        { json: "available", js: "available", typ: u(undefined, true) },
        { json: "status", js: "status", typ: u(undefined, "") },
    ], "any"),
    "VariantBarcode": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: "" },
    ], "any"),
    "VariantOption": o([
        { json: "id", js: "id", typ: u(undefined, "") },
        { json: "label", js: "label", typ: "" },
        { json: "name", js: "name", typ: "" },
    ], "any"),
    "VariantSeller": o([
        { json: "links", js: "links", typ: u(undefined, a(r("Link"))) },
        { json: "name", js: "name", typ: u(undefined, "") },
    ], "any"),
    "VariantUnitPrice": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "currency", js: "currency", typ: "" },
        { json: "measure", js: "measure", typ: r("PurpleMeasure") },
        { json: "reference", js: "reference", typ: r("PurpleReference") },
    ], "any"),
    "PurpleMeasure": o([
        { json: "unit", js: "unit", typ: "" },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "PurpleReference": o([
        { json: "unit", js: "unit", typ: "" },
        { json: "value", js: "value", typ: 0 },
    ], "any"),
    "ProductOption": o([
        { json: "name", js: "name", typ: "" },
        { json: "values", js: "values", typ: a(r("ValueElement")) },
    ], "any"),
    "Rating": o([
        { json: "count", js: "count", typ: u(undefined, 0) },
        { json: "scale_max", js: "scaleMax", typ: 3.14 },
        { json: "scale_min", js: "scaleMin", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "RetailLocation": o([
        { json: "address", js: "address", typ: u(undefined, r("PostalAddress")) },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
    ], "any"),
    "SearchFilters": o([
        { json: "categories", js: "categories", typ: u(undefined, a("")) },
        { json: "price", js: "price", typ: u(undefined, r("PriceObject")) },
    ], "any"),
    "PriceObject": o([
        { json: "max", js: "max", typ: u(undefined, 0) },
        { json: "min", js: "min", typ: u(undefined, 0) },
    ], "any"),
    "SelectedOption": o([
        { json: "id", js: "id", typ: u(undefined, "") },
        { json: "label", js: "label", typ: "" },
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
    "Variant": o([
        { json: "availability", js: "availability", typ: u(undefined, r("VariantAvailabilityObject")) },
        { json: "barcodes", js: "barcodes", typ: u(undefined, a(r("VariantBarcodeObject"))) },
        { json: "categories", js: "categories", typ: u(undefined, a(r("CategoryElement"))) },
        { json: "description", js: "description", typ: r("Description") },
        { json: "handle", js: "handle", typ: u(undefined, "") },
        { json: "id", js: "id", typ: "" },
        { json: "list_price", js: "listPrice", typ: u(undefined, r("Price")) },
        { json: "media", js: "media", typ: u(undefined, a(r("Media"))) },
        { json: "metadata", js: "metadata", typ: u(undefined, m("any")) },
        { json: "options", js: "options", typ: u(undefined, a(r("VariantOption"))) },
        { json: "price", js: "price", typ: r("Price") },
        { json: "rating", js: "rating", typ: u(undefined, r("RatingObject")) },
        { json: "seller", js: "seller", typ: u(undefined, r("VariantSellerObject")) },
        { json: "sku", js: "sku", typ: u(undefined, "") },
        { json: "tags", js: "tags", typ: u(undefined, a("")) },
        { json: "title", js: "title", typ: "" },
        { json: "unit_price", js: "unitPrice", typ: u(undefined, r("VariantUnitPriceObject")) },
        { json: "url", js: "url", typ: u(undefined, "") },
    ], "any"),
    "VariantAvailabilityObject": o([
        { json: "available", js: "available", typ: u(undefined, true) },
        { json: "status", js: "status", typ: u(undefined, "") },
    ], "any"),
    "VariantBarcodeObject": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: "" },
    ], "any"),
    "VariantSellerObject": o([
        { json: "links", js: "links", typ: u(undefined, a(r("Link"))) },
        { json: "name", js: "name", typ: u(undefined, "") },
    ], "any"),
    "VariantUnitPriceObject": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "currency", js: "currency", typ: "" },
        { json: "measure", js: "measure", typ: r("FluffyMeasure") },
        { json: "reference", js: "reference", typ: r("FluffyReference") },
    ], "any"),
    "FluffyMeasure": o([
        { json: "unit", js: "unit", typ: "" },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "FluffyReference": o([
        { json: "unit", js: "unit", typ: "" },
        { json: "value", js: "value", typ: 0 },
    ], "any"),
    "Payment": o([
        { json: "instruments", js: "instruments", typ: u(undefined, a(r("PaymentSelectedPaymentInstrument"))) },
    ], "any"),
    "Order": o([
        { json: "adjustments", js: "adjustments", typ: u(undefined, a(r("AdjustmentElement"))) },
        { json: "attribution", js: "attribution", typ: u(undefined, m("")) },
        { json: "checkout_id", js: "checkoutId", typ: "" },
        { json: "currency", js: "currency", typ: "" },
        { json: "fulfillment", js: "fulfillment", typ: r("FulfillmentObject") },
        { json: "id", js: "id", typ: "" },
        { json: "label", js: "label", typ: u(undefined, "") },
        { json: "line_items", js: "lineItems", typ: a(r("LineItemElement")) },
        { json: "messages", js: "messages", typ: u(undefined, a(r("Message"))) },
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
        { json: "destination", js: "destination", typ: r("PostalAddress") },
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
        { json: "messages", js: "messages", typ: u(undefined, a(r("Message"))) },
    ], "any"),
    "InstrumentsChangeCheckout": o([
        { json: "payment", js: "payment", typ: u(undefined, r("InstrumentsChangePayment")) },
    ], "any"),
    "InstrumentsChangePayment": o([
        { json: "instruments", js: "instruments", typ: u(undefined, a(r("PurpleSelectedPaymentInstrument"))) },
        { json: "selected_instrument_id", js: "selectedInstrumentId", typ: u(undefined, "") },
    ], "any"),
    "PurpleSelectedPaymentInstrument": o([
        { json: "billing_address", js: "billingAddress", typ: u(undefined, r("PostalAddress")) },
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
        { json: "messages", js: "messages", typ: u(undefined, a(r("Message"))) },
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
    "StatusEnum": [
        "error",
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
    "ErrorCode": [
        "card",
    ],
    "MethodType": [
        "digital",
        "pickup",
        "shipping",
    ],
    "OrderLineItemStatus": [
        "fulfilled",
        "partial",
        "processing",
        "removed",
    ],
};
