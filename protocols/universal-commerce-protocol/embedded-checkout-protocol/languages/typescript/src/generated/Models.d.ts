/**
 * Base checkout schema. Extensions compose onto this using allOf.
 */
export interface Checkout {
    /**
     * Outstanding extension-defined { [key: string]: any } for this checkout.
     */
    actions?: {
        [key: string]: {
            [key: string]: any;
        }[];
    };
    attribution?: {
        [key: string]: string;
    };
    /**
     * Representation of the buyer.
     */
    buyer?: Buyer;
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
    order?: OrderConfirmation;
    payment?: Payment;
    /**
     * Policies (e.g., return/refund terms) that apply to the items in this checkout.
     * `applies_to` targets are relative to the response root; when absent or empty, refer to
     * the URLs in `links[]`.
     */
    policies?: Policy[];
    signals?: {
        [key: string]: any;
    };
    /**
     * Checkout state indicating the current phase and required processing. See Checkout Status
     * lifecycle documentation for state transition details.
     */
    status: CheckoutStatus;
    /**
     * Different cart totals.
     */
    totals: CheckoutTotal[];
    ucp: UcpCheckoutResponseSchema;
    [property: string]: any;
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
 *
 * A coarse geographic location — country, region, and postal code. A lightweight
 * alternative to a full postal address.
 */
export interface Context {
    /**
     * The country, as a 2-letter ISO 3166-1 alpha-2 code (e.g. "US"). A 3-letter alpha-3 code
     * or full country name MAY also be used.
     */
    addressCountry?: string;
    /**
     * The first-level administrative region within the country (e.g. a state or province such
     * as California).
     */
    addressRegion?: string;
    /**
     * The postal code (e.g. "94043").
     */
    postalCode?: string;
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
     * Stable, opaque identifier for a Location in the Business's namespace. This provisional,
     * non-binding hint is distinct from the Buyer's locality. The operation specification or an
     * active capability/extension defines its effects. A common example in retail shopping is
     * the default home store ID selected and saved by the user when purchasing groceries.
     */
    location?: string;
    /**
     * Buyer-preferred payment handlers in priority order (most preferred first). Each entry
     * names a handler advertised in the Business profile's `ucp.payment_handlers`, optionally
     * narrowed to preferred instrument types. The Business SHOULD use it to preselect or
     * prioritize the handler (and type, when given) and MAY ignore unavailable or ineligible
     * entries; unrecognized values MUST be ignored without error.
     */
    payment?: PreferredPaymentHandler[];
    [property: string]: any;
}
export interface PreferredPaymentHandler {
    /**
     * Handler registry key advertised in the Business profile's `ucp.payment_handlers`.
     */
    handler: string;
    /**
     * Optional preferred instrument types for this handler, in priority order, aligned with the
     * handler's advertised `payment_instrument.type` values (for example `card` or `bank`).
     * Unrecognized values MUST be ignored.
     */
    types?: string[];
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
     * RFC 9535 JSONPath to the allocation target (e.g., '$.line_items[0]', '$.totals[?@.type ==
     * "fulfillment"]').
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
     * Fulfillment method type this availability applies to. Well-known values: `shipping`,
     * `pickup`; businesses MAY use additional values.
     */
    type: string;
    [property: string]: any;
}
/**
 * A fulfillment method with destinations and groups.
 */
export interface FulfillmentMethod {
    /**
     * Available destinations for this method. In Business responses, each destination carries a
     * `type` and `id`.
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
     * ID of the selected destination. Accepts any stable, Business-scoped ID the Business
     * recognizes for this method, including Location IDs not yet enumerated in `destinations`.
     */
    selectedDestinationId?: null | string;
    /**
     * Fulfillment method type. Well-known values: `shipping`, `pickup`. Businesses MAY use
     * additional values.
     */
    type: string;
    [property: string]: any;
}
/**
 * A destination for fulfillment.
 */
export interface FulfillmentDestination {
    /**
     * Physical address of the location.
     */
    address?: PostalAddress;
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
     * Fulfillment destination identifier.
     */
    id: string;
    /**
     * Optional. Last name of the contact associated with the address.
     */
    lastName?: string;
    /**
     * Buyer-facing, Business-owned display name.
     */
    name?: string;
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
     * Destination contract discriminator. Required in Business responses and optional in
     * Platform requests. Well-known values: `shipping_address`, `business_location`. The
     * enclosing method contract defines request defaults and which fields the Platform may
     * write; negotiated extensions define additional values.
     */
    type?: string;
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
 * A fulfillment option within a group (e.g., Standard Shipping $5, Express $15). Extends
 * the fulfillment option base with cost and timing.
 *
 * Common base for a fulfillment option: an addressable, renderable choice (e.g. Standard,
 * Express). Catalog uses this base directly; checkout composes it with cost and timing.
 */
export interface FulfillmentOption {
    /**
     * Supplementary context for the title (e.g. 'Arrives in 4 business days', 'Arrives Dec
     * 12-15 via FedEx'). Directly renderable; MUST NOT repeat the title.
     */
    description?: Description;
    /**
     * Unique identifier for this fulfillment option.
     */
    id: string;
    /**
     * Short label that distinguishes this option from its siblings (e.g. 'Standard', 'Express
     * Shipping', 'Curbside Pickup').
     */
    title: string;
    /**
     * Carrier name (for shipping).
     */
    carrier?: string;
    /**
     * Earliest fulfillment date.
     */
    earliestFulfillmentTime?: string;
    /**
     * Latest fulfillment date.
     */
    latestFulfillmentTime?: string;
    /**
     * Fulfillment option totals breakdown.
     */
    totals: LineItemTotal[];
    [property: string]: any;
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
    id: string;
    item: Item;
    /**
     * Parent line item identifier for any nested structures.
     */
    parentId?: string;
    /**
     * Always an integer step count. On Platform requests, steps use the item's
     * Business-authoritative sale basis; omitting `item.quantity_unit` makes no assertion and
     * does not imply `each`. On Business responses, `item.quantity_unit` describes the basis;
     * if absent, it encodes the `each` machine identity (`C62`, 0) and `quantity` counts whole
     * items.
     */
    quantity: number;
    /**
     * Line item totals breakdown.
     */
    totals: LineItemTotal[];
    [property: string]: any;
}
/**
 * Purchased item data, including identity, price, and sale basis.
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
     * Unit price in ISO 4217 minor units. Price is the amount per one whole
     * `quantity_unit.unit` (for example, per lb or per hour); when `quantity_unit` is absent,
     * it is per `each`.
     */
    price: number;
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
    quantityUnit?: QuantityUnit;
    /**
     * Product title.
     */
    title: string;
    /**
     * Pricing basis for this item. On an authoritative Business response, the Business MUST
     * include `unit_price` on every line whose pricing basis differs from its sale basis (for
     * example, priced per pound but sold per `each`); presence on a line marks the rate as
     * transactional rather than display-only. When the pricing basis is the sale basis,
     * `item.price` fully denominates the charge and this field MAY be omitted.
     */
    unitPrice?: UnitPrice;
    [property: string]: any;
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
export interface QuantityUnit {
    /**
     * Required printable unit label provided by the Business. The Platform MUST use it when it
     * does not recognize `unit`; for a recognized UN/CEFACT Rec 20 Common Code, the Platform
     * MAY substitute its own localized label. It does not participate in unit identity or
     * mismatch comparison.
     */
    displayText: string;
    /**
     * One step equals `10^-scale` of `unit`. When `unit` is `C62`, `scale`, if present, MUST be
     * 0. The maximum of 15 is derived from the interoperable integer range: at scale 16 a
     * single whole unit (10^16 steps) is no longer representable, so larger scales cannot
     * denominate one unit of their own basis. Businesses needing finer granularity use a
     * smaller unit.
     */
    scale?: number;
    /**
     * Stable machine identifier. The Business SHOULD use the exact UN/CEFACT Rec20 Common Code
     * when one accurately identifies the unit. Otherwise, the Business MAY use a custom unit
     * identifier and MUST use it consistently for the same unit. The Platform MUST treat an
     * unrecognized identifier as opaque.
     */
    unit: string;
    /**
     * Ordering granularity, denominated in steps: the Business sells this item in integer
     * multiples of `increment` steps. Its effective value is the provided value or 1. Advisory
     * merchandising policy, not a representational bound: Platform-authored quantities SHOULD
     * be integer multiples of the effective increment; the Business MAY accept, revise, or
     * reject an off-increment request with a recoverable business outcome and MUST NOT silently
     * reinterpret it. Business-authored quantities (checkout revisions, fulfillment events,
     * adjustments) are bounded only by `scale`.
     */
    increment?: number;
    [property: string]: any;
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
export interface UnitPrice {
    /**
     * Unit price in ISO 4217 minor units. After satisfying the same-unit invariant, the
     * Business MUST compute the comparator as `(price.amount / (measure.value ×
     * 10^-measure.scale)) × (reference.value × 10^-reference.scale)` and round it once to ISO
     * 4217 minor units according to its pricing rules. The returned `unit_price.amount` is
     * authoritative; the Platform MUST NOT recompute or substitute its own result.
     */
    amount: number;
    /**
     * ISO 4217 currency code.
     */
    currency: string;
    /**
     * Product quantity in packaging/content (for example, a 750 mL bottle), distinct from
     * `quantity_unit`, which defines the sale basis. Its integer `value` MUST be at least 1.
     */
    measure: Measure;
    /**
     * Denominator for unit price display (for example, per 100 mL or per 1 kg). Its integer
     * `value` MUST be at least 1.
     */
    reference: Measure;
    [property: string]: any;
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
export interface Measure {
    /**
     * Required printable unit label provided by the Business. The Platform MUST use it when it
     * does not recognize `unit`; for a recognized UN/CEFACT Rec 20 Common Code, the Platform
     * MAY substitute its own localized label. It does not participate in unit identity or
     * mismatch comparison.
     */
    displayText: string;
    /**
     * One step equals `10^-scale` of `unit`. When `unit` is `C62`, `scale`, if present, MUST be
     * 0. The maximum of 15 is derived from the interoperable integer range: at scale 16 a
     * single whole unit (10^16 steps) is no longer representable, so larger scales cannot
     * denominate one unit of their own basis. Businesses needing finer granularity use a
     * smaller unit.
     */
    scale?: number;
    /**
     * Stable machine identifier. The Business SHOULD use the exact UN/CEFACT Rec20 Common Code
     * when one accurately identifies the unit. Otherwise, the Business MAY use a custom unit
     * identifier and MUST use it consistently for the same unit. The Platform MUST treat an
     * unrecognized identifier as opaque.
     */
    unit: string;
    /**
     * Integer count of `10^-scale` units of `unit`.
     */
    value: number;
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
     * RFC 9535 JSONPath to the component the message refers to (e.g., $.line_items[0]).
     */
    path?: string;
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
 * the condition in band, for example by modifying inputs or processing a related Action,
 * and submit a new operation when needed. 'requires_buyer_input': merchant requires
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
    credential?: PaymentCredential;
    /**
     * Display information for this payment instrument. Each payment instrument schema defines
     * its specific display properties, as outlined by the payment handler.
     */
    display?: {
        [key: string]: any;
    };
    /**
     * The unique identifier for the handler instance that produced this instrument. This
     * corresponds to the 'id' field in the Payment Handler definition.
     */
    handlerId: string;
    /**
     * A unique identifier for this instrument instance. Typically assigned by the platform for
     * instruments it collects. For a business-owned saved instrument returned on an
     * identity-linked response, this identifier is assigned by the business; the platform MUST
     * treat it as an opaque, business-scoped reference, and the business resolves it
     * server-side when the buyer selects it.
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
 * A durable business rule about the items in a response — return/refund terms, warranty,
 * and the like — at the time of purchase. Every policy carries a `type` (an open
 * reverse-DNS vocabulary) and a `description` so a platform can present it without
 * understanding its type-specific fields; type-specific fields (gated by `type`) add
 * structured context for platforms that model that type. Policies are reference data; the
 * obligation to display a term to the buyer is carried by a `messages[]` warning whose
 * `code` equals the policy `type` — see the Policies section of the specification.
 */
export interface Policy {
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
    appliesTo?: string[];
    /**
     * Human-readable policy summary in one or more formats (plain, markdown, html). Required on
     * every policy so a platform can present it without understanding any type-specific fields.
     * This is not the buyer-facing disclosure — display is compelled by a `messages[]` warning
     * (see the Policies section).
     */
    description: Description;
    /**
     * Policy type discriminator. Open reverse-DNS vocabulary. Well-known values:
     * `dev.ucp.shopping.policy.return` (return terms), `dev.ucp.shopping.policy.warranty`
     * (warranty terms). Businesses MAY define custom types in their own domain (e.g.,
     * `com.example.policy.price_match`). Platforms MUST tolerate unknown values.
     */
    type: string;
    /**
     * Optional link to the full policy document.
     */
    url?: string;
    [property: string]: any;
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
    capabilities?: {
        [key: string]: CapabilityResponseSchema[];
    };
    /**
     * Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
     * (`services`, `capabilities`, and `payment_handlers`).
     */
    mapOrder?: {
        [key: string]: string[];
    };
    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    paymentHandlers: {
        [key: string]: PaymentHandlerResponseSchema[];
    };
    /**
     * Service registry keyed by reverse-domain name.
     */
    services?: {
        [key: string]: ServiceResponseSchema[];
    };
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
    config?: {
        [key: string]: any;
    };
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
    config?: {
        [key: string]: any;
    };
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
     * A Constraint Expression describing the instrument this entry makes available. Keys in
     * `properties` name members of the `constraint_target` declared by the instrument schema
     * for this `type`. Requirements on submitted request data belong in
     * `ucp.request_constraints` instead.
     */
    constraints?: ConstraintExpression;
    /**
     * The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
     * schema's type constant.
     */
    type: string;
    [property: string]: any;
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
export interface ConstraintProperty {
    /**
     * Alternative Object Constraints. The constrained object must satisfy at least one. A
     * branch must be non-empty: an empty branch is satisfied by every object and neutralizes
     * the alternation.
     */
    anyOf?: ConstraintExpression[];
    /**
     * Constraints keyed by property name. Must be non-empty: an empty object applies no
     * constraint.
     */
    properties?: {
        [key: string]: ConstraintProperty;
    };
    /**
     * Property names required by the constrained object. Must be non-empty: an empty array
     * applies no constraint.
     */
    required?: string[];
    const?: any;
    /**
     * A non-empty array of unique JSON values.
     */
    enum?: any[];
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
export interface ConstraintExpression {
    /**
     * Alternative Object Constraints. The constrained object must satisfy at least one. A
     * branch must be non-empty: an empty branch is satisfied by every object and neutralizes
     * the alternation.
     */
    anyOf?: ConstraintExpression[];
    /**
     * Constraints keyed by property name. Must be non-empty: an empty object applies no
     * constraint.
     */
    properties?: {
        [key: string]: ConstraintProperty;
    };
    /**
     * Property names required by the constrained object. Must be non-empty: an empty array
     * applies no constraint.
     */
    required?: string[];
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
    attribution?: {
        [key: string]: string;
    };
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
     * Snapshot of the policies that applied to the items at checkout, captured on the order as
     * a durable record. `applies_to` targets are relative to the response root.
     */
    policies?: Policy[];
    /**
     * Different totals for the order.
     */
    totals: CheckoutTotal[];
    ucp: UcpOrderResponseSchema;
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
     * The settled measurement this adjustment reconciles (for example, actual picked weight),
     * present when the line's price settles by measurement. Its unit identity MUST match the
     * line's pricing basis (`item.unit_price` measure/reference unit); no unit conversion. A
     * pure price settlement uses `quantity: 0` together with `measure` and a totals delta.
     */
    measure?: Measure;
    /**
     * Signed integer count of steps of the referenced line item's `quantity_unit` (`10^-scale`
     * × `unit`); when `quantity_unit` is absent, it counts whole items (`each`). Negative
     * values represent reductions (e.g. returns); positive values represent additions (e.g.
     * exchanges).
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
     * Integer count of steps of the referenced line item's `quantity_unit` (`10^-scale` ×
     * `unit`); when `quantity_unit` is absent, it counts whole items (`each`).
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
     * Delivery method type. Well-known values: `shipping`, `pickup`, `digital`; additional
     * values MAY be used.
     */
    methodType: string;
    [property: string]: any;
}
export interface ExpectationLineItem {
    /**
     * Line item ID reference.
     */
    id: string;
    /**
     * Integer count of steps of the referenced line item's `quantity_unit` (`10^-scale` ×
     * `unit`); when `quantity_unit` is absent, it counts whole items (`each`).
     */
    quantity: number;
    [property: string]: any;
}
export interface OrderLineItem {
    /**
     * Line item identifier.
     */
    id: string;
    /**
     * Purchased item data, including identity, price, and sale basis.
     */
    item: Item;
    /**
     * Parent line item identifier for any nested structures.
     */
    parentId?: string;
    /**
     * Tracks the line item's original, current active, and fulfilled quantities. All three
     * values use the same inherited `item.quantity_unit`. When `item.quantity_unit` is absent
     * on an authoritative order response, each step is one whole item (`each`) under the shared
     * default.
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
 * Tracks the line item's original, current active, and fulfilled quantities. All three
 * values use the same inherited `item.quantity_unit`. When `item.quantity_unit` is absent
 * on an authoritative order response, each step is one whole item (`each`) under the shared
 * default.
 */
export interface LineItemQuantity {
    /**
     * Quantity fulfilled so far, expressed as an integer step count.
     */
    fulfilled: number;
    /**
     * Quantity from the original checkout, expressed as an integer step count.
     */
    original?: number;
    /**
     * Current active quantity after returns, cancellations, or other order changes, expressed
     * as an integer step count.
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
    capabilities?: {
        [key: string]: CapabilityResponseSchema[];
    };
    /**
     * Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
     * (`services`, `capabilities`, and `payment_handlers`).
     */
    mapOrder?: {
        [key: string]: string[];
    };
    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    paymentHandlers?: {
        [key: string]: PaymentHandlerResponseSchema[];
    };
    /**
     * Service registry keyed by reverse-domain name.
     */
    services?: {
        [key: string]: Service[];
    };
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
export interface Service {
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    config?: {
        [key: string]: any;
    };
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
    capabilities?: {
        [key: string]: CapabilityResponseSchema[];
    };
    /**
     * Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
     * (`services`, `capabilities`, and `payment_handlers`).
     */
    mapOrder?: {
        [key: string]: string[];
    };
    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    paymentHandlers?: {
        [key: string]: PaymentHandlerResponseSchema[];
    };
    /**
     * Service registry keyed by reverse-domain name.
     */
    services?: {
        [key: string]: Service[];
    };
    /**
     * Application-level status of the UCP operation.
     */
    status: ErrorStatus;
    version: string;
    [property: string]: any;
}
/**
 * Application-level status of the UCP operation.
 */
export type ErrorStatus = "error";
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
    capabilities?: {
        [key: string]: CapabilityElement[];
    };
    /**
     * Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
     * (`services`, `capabilities`, and `payment_handlers`).
     */
    mapOrder?: {
        [key: string]: string[];
    };
    /**
     * Payment handler registry keyed by reverse-domain name.
     */
    paymentHandlers?: {
        [key: string]: PaymentHandlerElement[];
    };
    /**
     * Service registry keyed by reverse-domain name.
     */
    services?: {
        [key: string]: EmbeddedService[];
    };
    /**
     * Application-level status of the UCP operation.
     */
    status: UcpCheckoutResponseSchemaStatus;
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
    config?: {
        [key: string]: any;
    };
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
    config?: {
        [key: string]: any;
    };
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
     * A Constraint Expression describing the instrument this entry makes available. Keys in
     * `properties` name members of the `constraint_target` declared by the instrument schema
     * for this `type`. Requirements on submitted request data belong in
     * `ucp.request_constraints` instead.
     */
    constraints?: ConstraintExpression;
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
export interface EmbeddedService {
    /**
     * Entity-specific configuration. Structure defined by each entity's schema.
     */
    config?: {
        [key: string]: any;
    };
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
/**
 * Checkout state after address selection.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
export interface AddressChangeResult {
    /**
     * Partial checkout update with fulfillment address selection.
     */
    checkout?: AddressChangeCheckout;
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
 * Partial checkout update with fulfillment address selection.
 */
export interface AddressChangeCheckout {
    /**
     * Updated fulfillment with new selected destination and destinations.
     */
    fulfillment?: CheckoutFulfillmentObject;
    [property: string]: any;
}
/**
 * Updated fulfillment with new selected destination and destinations.
 *
 * Container for fulfillment methods and availability.
 */
export interface CheckoutFulfillmentObject {
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
export interface ReadyRequest {
    auth?: Auth;
    /**
     * Delegation types the merchant accepts. Must be subset of checkout.embedded.delegations.
     */
    delegate: string[];
    [property: string]: any;
}
export interface Auth {
    type?: string;
    [property: string]: any;
}
/**
 * Handshake response from host.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
export interface ReadyResult {
    /**
     * Initial delegation state from host. Fields are permitted only when the corresponding
     * delegation is accepted.
     */
    checkout?: ReadyCheckout;
    /**
     * Requested authorization. Some common examples include API key and OAuth token.
     */
    credential?: string;
    /**
     * UCP protocol metadata. Status MUST be 'error' for error response.
     */
    ucp: InstrumentsChangeResultUcp;
    /**
     * Channel upgrade instructions. If present, switch to provided MessagePort.
     */
    upgrade?: Upgrade;
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
 * Initial delegation state from host. Fields are permitted only when the corresponding
 * delegation is accepted.
 */
export interface ReadyCheckout {
    fulfillment?: CheckoutFulfillmentObject;
    /**
     * Payment instruments with selected instrument ID.
     */
    payment?: ReadyPayment;
    [property: string]: any;
}
/**
 * Payment instruments with selected instrument ID.
 *
 * Payment configuration containing handlers.
 */
export interface ReadyPayment {
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
 * Channel upgrade instructions. If present, switch to provided MessagePort.
 */
export interface Upgrade {
    /**
     * MessagePort for upgraded channel. Runtime type is MessagePort.
     */
    port?: {
        [key: string]: any;
    };
    [property: string]: any;
}
export interface AuthRequest {
    type?: string;
    [property: string]: any;
}
/**
 * Auth response from host containing the requested authorization data.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
export interface AuthResult {
    /**
     * Requested authorization. Some common examples include API key and OAuth token.
     */
    credential?: string;
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
export interface WindowOpenRequest {
    /**
     * The URL of the resource to present.
     */
    url: string;
    [property: string]: any;
}
/**
 * Acknowledgement that the host handled the request.
 *
 * Generic error response when business logic prevents resource creation or failed to
 * retrieve resource. Used when no valid resource can be established.
 */
export interface WindowOpenResult {
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
export declare class Convert {
    static toCheckout(json: string): Checkout;
    static checkoutToJson(value: Checkout): string;
    static toOrder(json: string): Order;
    static orderToJson(value: Order): string;
    static toErrorResponse(json: string): ErrorResponse;
    static errorResponseToJson(value: ErrorResponse): string;
    static toInstrumentsChangeResult(json: string): InstrumentsChangeResult;
    static instrumentsChangeResultToJson(value: InstrumentsChangeResult): string;
    static toCredentialResult(json: string): CredentialResult;
    static credentialResultToJson(value: CredentialResult): string;
    static toAddressChangeResult(json: string): AddressChangeResult;
    static addressChangeResultToJson(value: AddressChangeResult): string;
    static toReadyRequest(json: string): ReadyRequest;
    static readyRequestToJson(value: ReadyRequest): string;
    static toReadyResult(json: string): ReadyResult;
    static readyResultToJson(value: ReadyResult): string;
    static toAuthRequest(json: string): AuthRequest;
    static authRequestToJson(value: AuthRequest): string;
    static toAuthResult(json: string): AuthResult;
    static authResultToJson(value: AuthResult): string;
    static toWindowOpenRequest(json: string): WindowOpenRequest;
    static windowOpenRequestToJson(value: WindowOpenRequest): string;
    static toWindowOpenResult(json: string): WindowOpenResult;
    static windowOpenResultToJson(value: WindowOpenResult): string;
}
