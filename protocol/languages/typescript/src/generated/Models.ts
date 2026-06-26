// To parse this data:
//
//   import { Convert, Checkout, Order, ErrorResponse, InstrumentsChangeResult, CredentialResult } from "./file";
//
//   const checkout = Convert.toCheckout(json);
//   const order = Convert.toOrder(json);
//   const errorResponse = Convert.toErrorResponse(json);
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
    currency:   string;
    discounts?: CheckoutDiscounts;
    /**
     * RFC 3339 expiry timestamp. Default TTL is 6 hours from creation if not sent.
     */
    expiresAt?: string;
    /**
     * Fulfillment details.
     */
    fulfillment?: CheckoutFulfillment;
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
 * Discount codes input and applied discounts output.
 */
export interface CheckoutDiscounts {
    /**
     * Discounts successfully applied (code-based and automatic).
     */
    applied?: AppliedDiscount[];
    /**
     * Discount codes to apply. Case-insensitive. Replaces previously submitted codes. Send
     * empty array to clear.
     */
    codes?: string[];
    [property: string]: any;
}

/**
 * A discount that was successfully applied.
 */
export interface AppliedDiscount {
    /**
     * Breakdown of where this discount was allocated. Sum of allocation amounts equals total
     * amount.
     */
    allocations?: DiscountAllocation[];
    /**
     * Total discount amount in ISO 4217 minor units.
     */
    amount: number;
    /**
     * True if applied automatically by merchant rules (no code required).
     */
    automatic?: boolean;
    /**
     * The discount code. Omitted for automatic discounts.
     */
    code?: string;
    /**
     * The eligibility claim accepted by the Business for this discount. Corresponds to a value
     * from context.eligibility. Omitted for code-based and non-eligibility automatic discounts.
     */
    eligibility?: string;
    /**
     * Allocation method. 'each' = applied independently per item. 'across' = split
     * proportionally by value.
     */
    method?: DiscountMethod;
    /**
     * Stacking order for discount calculation. Lower numbers applied first (1 = first).
     */
    priority?: number;
    /**
     * True if this discount requires additional verification.
     */
    provisional?: boolean;
    /**
     * Human-readable discount name (e.g., 'Summer Sale 20% Off').
     */
    title: string;
    [property: string]: any;
}

/**
 * Breakdown of how a discount amount was allocated to a specific target.
 */
export interface DiscountAllocation {
    /**
     * Amount allocated to this target in ISO 4217 minor units.
     */
    amount: number;
    /**
     * JSONPath to the allocation target (e.g., '$.line_items[0]', '$.totals.shipping').
     */
    path: string;
    [property: string]: any;
}

/**
 * Allocation method. 'each' = applied independently per item. 'across' = split
 * proportionally by value.
 */
export type DiscountMethod = "each" | "across";

/**
 * Fulfillment details.
 *
 * Container for fulfillment methods and availability.
 */
export interface CheckoutFulfillment {
    /**
     * Inventory availability hints.
     */
    availableMethods?: FulfillmentAvailableMethod[];
    /**
     * Fulfillment methods for cart items.
     */
    methods?: FulfillmentMethod[];
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
    type: FulfillmentMethodType;
    [property: string]: any;
}

/**
 * Fulfillment method type this availability applies to.
 *
 * Fulfillment method type.
 */
export type FulfillmentMethodType = "shipping" | "pickup";

/**
 * A fulfillment method (shipping or pickup) with destinations and groups.
 */
export interface FulfillmentMethod {
    /**
     * Available destinations. For shipping: addresses. For pickup: retail locations.
     */
    destinations?: FulfillmentDestination[];
    /**
     * Fulfillment groups for selecting options. Agent sets selected_option_id on groups to
     * choose shipping method.
     */
    groups?: FulfillmentGroup[];
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
    type: FulfillmentMethodType;
    [property: string]: any;
}

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
 * Physical address of the location.
 *
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
    options?: FulfillmentOption[];
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
    quantity: LineItemQuantity;
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

    public static toOrder(json: string): Order {
        return cast(JSON.parse(json), r("Order"));
    }

    public static orderToJson(value: Order): string {
        return JSON.stringify(uncast(value, r("Order")), null, 2);
    }

    public static toErrorResponse(json: string): ErrorResponse {
        return cast(JSON.parse(json), r("ErrorResponse"));
    }

    public static errorResponseToJson(value: ErrorResponse): string {
        return JSON.stringify(uncast(value, r("ErrorResponse")), null, 2);
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
        { json: "buyer", js: "buyer", typ: u(undefined, r("Buyer")) },
        { json: "context", js: "context", typ: u(undefined, r("Context")) },
        { json: "continue_url", js: "continueUrl", typ: u(undefined, "") },
        { json: "currency", js: "currency", typ: "" },
        { json: "discounts", js: "discounts", typ: u(undefined, r("CheckoutDiscounts")) },
        { json: "expires_at", js: "expiresAt", typ: u(undefined, "") },
        { json: "fulfillment", js: "fulfillment", typ: u(undefined, r("CheckoutFulfillment")) },
        { json: "id", js: "id", typ: "" },
        { json: "line_items", js: "lineItems", typ: a(r("LineItem")) },
        { json: "links", js: "links", typ: a(r("Link")) },
        { json: "messages", js: "messages", typ: u(undefined, a(r("Message"))) },
        { json: "order", js: "order", typ: u(undefined, r("OrderConfirmation")) },
        { json: "payment", js: "payment", typ: u(undefined, r("Payment")) },
        { json: "signals", js: "signals", typ: u(undefined, r("Signals")) },
        { json: "status", js: "status", typ: r("CheckoutStatus") },
        { json: "totals", js: "totals", typ: a(r("CheckoutTotal")) },
        { json: "ucp", js: "ucp", typ: r("UcpCheckoutResponseSchema") },
    ], "any"),
    "Buyer": o([
        { json: "email", js: "email", typ: u(undefined, "") },
        { json: "first_name", js: "firstName", typ: u(undefined, "") },
        { json: "last_name", js: "lastName", typ: u(undefined, "") },
        { json: "phone_number", js: "phoneNumber", typ: u(undefined, "") },
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
    "CheckoutDiscounts": o([
        { json: "applied", js: "applied", typ: u(undefined, a(r("AppliedDiscount"))) },
        { json: "codes", js: "codes", typ: u(undefined, a("")) },
    ], "any"),
    "AppliedDiscount": o([
        { json: "allocations", js: "allocations", typ: u(undefined, a(r("DiscountAllocation"))) },
        { json: "amount", js: "amount", typ: 0 },
        { json: "automatic", js: "automatic", typ: u(undefined, true) },
        { json: "code", js: "code", typ: u(undefined, "") },
        { json: "eligibility", js: "eligibility", typ: u(undefined, "") },
        { json: "method", js: "method", typ: u(undefined, r("DiscountMethod")) },
        { json: "priority", js: "priority", typ: u(undefined, 0) },
        { json: "provisional", js: "provisional", typ: u(undefined, true) },
        { json: "title", js: "title", typ: "" },
    ], "any"),
    "DiscountAllocation": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "path", js: "path", typ: "" },
    ], "any"),
    "CheckoutFulfillment": o([
        { json: "available_methods", js: "availableMethods", typ: u(undefined, a(r("FulfillmentAvailableMethod"))) },
        { json: "methods", js: "methods", typ: u(undefined, a(r("FulfillmentMethod"))) },
    ], "any"),
    "FulfillmentAvailableMethod": o([
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "fulfillable_on", js: "fulfillableOn", typ: u(undefined, u(null, "")) },
        { json: "line_item_ids", js: "lineItemIds", typ: a("") },
        { json: "type", js: "type", typ: r("FulfillmentMethodType") },
    ], "any"),
    "FulfillmentMethod": o([
        { json: "destinations", js: "destinations", typ: u(undefined, a(r("FulfillmentDestination"))) },
        { json: "groups", js: "groups", typ: u(undefined, a(r("FulfillmentGroup"))) },
        { json: "id", js: "id", typ: "" },
        { json: "line_item_ids", js: "lineItemIds", typ: a("") },
        { json: "selected_destination_id", js: "selectedDestinationId", typ: u(undefined, u(null, "")) },
        { json: "type", js: "type", typ: r("FulfillmentMethodType") },
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
    "FulfillmentGroup": o([
        { json: "id", js: "id", typ: "" },
        { json: "line_item_ids", js: "lineItemIds", typ: a("") },
        { json: "options", js: "options", typ: u(undefined, a(r("FulfillmentOption"))) },
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
    "LineItemTotal": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "display_text", js: "displayText", typ: u(undefined, "") },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "LineItem": o([
        { json: "id", js: "id", typ: "" },
        { json: "item", js: "item", typ: r("Item") },
        { json: "parent_id", js: "parentId", typ: u(undefined, "") },
        { json: "quantity", js: "quantity", typ: 0 },
        { json: "totals", js: "totals", typ: a(r("LineItemTotal")) },
    ], "any"),
    "Item": o([
        { json: "id", js: "id", typ: "" },
        { json: "image_url", js: "imageUrl", typ: u(undefined, "") },
        { json: "price", js: "price", typ: 0 },
        { json: "title", js: "title", typ: "" },
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
    "OrderConfirmation": o([
        { json: "id", js: "id", typ: "" },
        { json: "label", js: "label", typ: u(undefined, "") },
        { json: "permalink_url", js: "permalinkUrl", typ: "" },
    ], "any"),
    "Payment": o([
        { json: "instruments", js: "instruments", typ: u(undefined, a(r("SelectedPaymentInstrument"))) },
    ], "any"),
    "SelectedPaymentInstrument": o([
        { json: "billing_address", js: "billingAddress", typ: u(undefined, r("PostalAddress")) },
        { json: "credential", js: "credential", typ: u(undefined, r("PaymentCredential")) },
        { json: "display", js: "display", typ: u(undefined, m("any")) },
        { json: "handler_id", js: "handlerId", typ: "" },
        { json: "id", js: "id", typ: "" },
        { json: "type", js: "type", typ: "" },
        { json: "selected", js: "selected", typ: u(undefined, true) },
    ], "any"),
    "PaymentCredential": o([
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "Signals": o([
        { json: "dev.ucp.buyer_ip", js: "devUcpBuyerIp", typ: u(undefined, "") },
        { json: "dev.ucp.user_agent", js: "devUcpUserAgent", typ: u(undefined, "") },
    ], "any"),
    "CheckoutTotal": o([
        { json: "amount", js: "amount", typ: 0 },
        { json: "display_text", js: "displayText", typ: u(undefined, "") },
        { json: "type", js: "type", typ: "" },
        { json: "lines", js: "lines", typ: u(undefined, a(r("Line"))) },
    ], "any"),
    "Line": o([
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
    "Order": o([
        { json: "adjustments", js: "adjustments", typ: u(undefined, a(r("Adjustment"))) },
        { json: "attribution", js: "attribution", typ: u(undefined, m("")) },
        { json: "checkout_id", js: "checkoutId", typ: "" },
        { json: "currency", js: "currency", typ: "" },
        { json: "fulfillment", js: "fulfillment", typ: r("Fulfillment") },
        { json: "id", js: "id", typ: "" },
        { json: "label", js: "label", typ: u(undefined, "") },
        { json: "line_items", js: "lineItems", typ: a(r("OrderLineItem")) },
        { json: "messages", js: "messages", typ: u(undefined, a(r("Message"))) },
        { json: "permalink_url", js: "permalinkUrl", typ: "" },
        { json: "totals", js: "totals", typ: a(r("CheckoutTotal")) },
        { json: "ucp", js: "ucp", typ: r("UcpOrderResponseSchema") },
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
    "Fulfillment": o([
        { json: "events", js: "events", typ: u(undefined, a(r("FulfillmentEvent"))) },
        { json: "expectations", js: "expectations", typ: u(undefined, a(r("Expectation"))) },
    ], "any"),
    "FulfillmentEvent": o([
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
    "OrderLineItem": o([
        { json: "id", js: "id", typ: "" },
        { json: "item", js: "item", typ: r("Item") },
        { json: "parent_id", js: "parentId", typ: u(undefined, "") },
        { json: "quantity", js: "quantity", typ: r("LineItemQuantity") },
        { json: "status", js: "status", typ: r("LineItemStatus") },
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
    "UcpOrderResponseSchemaService": o([
        { json: "config", js: "config", typ: u(undefined, m("any")) },
        { json: "id", js: "id", typ: u(undefined, "") },
        { json: "schema", js: "schema", typ: u(undefined, "") },
        { json: "spec", js: "spec", typ: u(undefined, "") },
        { json: "version", js: "version", typ: "" },
        { json: "endpoint", js: "endpoint", typ: u(undefined, "") },
        { json: "transport", js: "transport", typ: r("Transport") },
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
        { json: "instruments", js: "instruments", typ: u(undefined, a(r("SelectedPaymentInstrument"))) },
        { json: "selected_instrument_id", js: "selectedInstrumentId", typ: u(undefined, "") },
    ], "any"),
    "InstrumentsChangeResultUcp": o([
        { json: "capabilities", js: "capabilities", typ: u(undefined, m(a(r("CapabilityElement")))) },
        { json: "payment_handlers", js: "paymentHandlers", typ: u(undefined, m(a(r("PaymentHandlerElement")))) },
        { json: "services", js: "services", typ: u(undefined, m(a(r("InstrumentsChangeService")))) },
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
    "InstrumentsChangeService": o([
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
        { json: "payment", js: "payment", typ: u(undefined, r("Payment")) },
    ], "any"),
    "DiscountMethod": [
        "across",
        "each",
    ],
    "FulfillmentMethodType": [
        "pickup",
        "shipping",
    ],
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
    "MethodType": [
        "digital",
        "pickup",
        "shipping",
    ],
    "LineItemStatus": [
        "fulfilled",
        "partial",
        "processing",
        "removed",
    ],
    "StatusEnum": [
        "error",
    ],
};
