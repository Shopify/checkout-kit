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
interface Buyer {
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
interface Context {
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
interface PreferredPaymentHandler {
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
interface CheckoutDiscounts {
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
interface AppliedDiscount {
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
interface DiscountAllocation {
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
type DiscountMethod = "each" | "across" | (string & {});
/**
 * Fulfillment details.
 *
 * Container for fulfillment methods and availability.
 */
interface CheckoutFulfillment {
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
interface FulfillmentAvailableMethod {
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
interface FulfillmentMethod {
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
interface FulfillmentDestination {
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
interface PostalAddress {
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
interface FulfillmentGroup {
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
interface FulfillmentOption {
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
interface Description {
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
interface LineItemTotal {
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
interface LineItem {
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
interface Item {
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
interface QuantityUnit {
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
interface UnitPrice {
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
interface Measure {
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
interface Link {
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
interface Message {
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
type ContentType = "plain" | "markdown" | (string & {});
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
type Severity = "recoverable" | "requires_buyer_input" | "requires_buyer_review" | "unrecoverable" | (string & {});
type MessageType = "error" | "warning" | "info" | (string & {});
/**
 * Details about an order created for this checkout session.
 *
 * Order details available at the time of checkout completion.
 */
interface OrderConfirmation {
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
interface Payment {
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
interface SelectedPaymentInstrument {
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
interface PaymentCredential {
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
interface Policy {
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
type CheckoutStatus = "incomplete" | "requires_escalation" | "ready_for_complete" | "complete_in_progress" | "completed" | "canceled" | (string & {});
/**
 * Different cart totals.
 *
 * Pricing breakdown provided by the business. MUST contain exactly one subtotal and one
 * total entry. Detail types (tax, fee, discount, fulfillment) may appear multiple times for
 * itemization. Platforms MUST render all entries in order using display_text and amount.
 *
 * A cost breakdown entry with a category, amount, and optional display text.
 */
interface CheckoutTotal {
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
interface Line {
  amount: number;
  /**
   * Human-readable label for this sub-line.
   */
  displayText: string;
  [property: string]: any;
}
/** A checkout snapshot containing checkout data without protocol metadata. */
interface Checkout {
  actions?: Record<string, Record<string, unknown>[]>;
  attribution?: Record<string, string>;
  buyer?: Buyer;
  context?: Context;
  continueUrl?: string;
  currency: string;
  discounts?: CheckoutDiscounts;
  expiresAt?: string;
  fulfillment?: CheckoutFulfillment;
  id: string;
  lineItems: LineItem[];
  links: Link[];
  messages?: Message[];
  order?: OrderConfirmation;
  payment?: Payment;
  policies?: Policy[];
  signals?: Record<string, unknown>;
  status: CheckoutStatus;
  totals: CheckoutTotal[];
  /** Extension fields keep their original names and values. */
  [key: string]: unknown;
}
/** Stable checkout error reasons applications can use to choose recovery. */
type CheckoutErrorCode = "unsupported_browser" | "sdk_error" | "storefront_password_required" | "customer_account_required" | "cart_expired" | "cart_completed" | "invalid_cart" | "unknown";
/** A checkout error with a stable reason and a diagnostic description. */
interface CheckoutError {
  code: CheckoutErrorCode;
  /** Diagnostic text; use `code` for application behavior. */
  message: string;
}
/**
 * The error codes shared by the checkout elements. `sdk_error` reports a local
 * Checkout Kit failure; unrecognized protocol codes become `unknown`.
 */
type CheckoutFailureCode = CheckoutErrorCode;
/** A failure a multi-checkout element reports, with a stable code and diagnostic text. */
interface CheckoutFailure {
  readonly code: CheckoutFailureCode;
  /** Diagnostic text; use `code` for application behavior. */
  readonly message: string;
}
/** Why the browser kept a checkout window from opening. */
type CheckoutBlockedCode = "popup_blocked";
/** The `blocked` event's detail: the browser kept the checkout window from opening. */
interface CheckoutBlockedDetail {
  readonly code: CheckoutBlockedCode;
}
/**
 * The base class for Checkout Kit elements. Server rendering has no DOM, so this is a
 * stand-in there: modules that define elements stay safe to import, and elements are only
 * constructed in a browser.
 */
declare const HTMLElementBase: typeof HTMLElement;
/**
 * Console logging verbosity, ordered as a threshold: `debug` is the most
 * verbose and `none` silences everything. Selecting a level emits that level
 * and every more-severe level (e.g. `warn` also emits `error`).
 */
type LogLevel = "debug" | "warn" | "error" | "none";
type CheckoutTarget = "auto" | "popup" | "_blank";
type CheckoutAppearance = "app:light" | "app:dark" | "app:automatic" | "storefront";
interface CheckoutAttributes {
  src?: string;
  target?: CheckoutTarget | string;
  appearance?: CheckoutAppearance | string;
  "log-level"?: LogLevel;
  telemetry?: boolean | "true" | "false";
  /**
   * Space/comma-separated list of extra trusted message origin patterns. Each
   * entry may be an exact origin (`https://example.com`), a wildcard subdomain
   * (`https://*.example.com`), or `*` to disable origin validation.
   */
  "allowed-origins"?: string;
}
/** Payload passed to {@link CheckoutProperties.onMessageRejected}. */
interface MessageRejectedDetail {
  /** Origin of the dropped `MessageEvent`. */
  origin: string;
  /** Raw `event.data` of the dropped message. Treat as untrusted. */
  data: unknown;
  /** Human-readable reason the message was dropped. */
  reason: string;
}
interface CheckoutMethods {
  /**
   * Opens the checkout in a popup window by default, but can be configured
   * to open in a new tab or named window using the `target` property.
   */
  open?: () => void;
  /**
   * Closes the checkout popup.
   * Can be used after checkout completion or to cancel the checkout process
   */
  close?: () => void;
}
interface CheckoutProperties {
  /**
   * The URL of the checkout to load. This will typically come from the `cart.checkoutUrl` field in
   * Shopify’s Storefront API, but could also be a cart permalink or other valid checkout URL.
   *
   * This property is automatically reflected to the `src` attribute, so you can use the `src` attribute
   * or this property interchangeably.
   */
  src?: string;
  /**
   * The mode in which to display the checkout when opened. Defaults to `'auto'`.
   * - `'popup'`: Opens checkout in a popup window
   * - `'_blank' | `'auto'`: Opens checkout in a new tab (default)
   * - `string`: Opens checkout in a new named window
   *
   * For more details on window targets, see the [`Window.open()` `target` parameter](https://developer.mozilla.org/en-US/docs/Web/API/Window/open#target)
   *
   * This property is automatically reflected to the `target` attribute, so you can use the `target` attribute
   * or this property interchangeably.
   */
  target?: CheckoutTarget | string;
  /**
   * The checkout appearance preference. Defaults to `'storefront'`.
   *
   * This property is automatically reflected to the `appearance` attribute, so you can use the
   * `appearance` attribute or this property interchangeably.
   */
  appearance?: CheckoutAppearance | string;
  /**
   * Console logging verbosity. Ordered as a threshold — `debug` is the most
   * verbose and `none` silences everything; `warn` and `error` sit between.
   * Defaults to `'error'`.
   *
   * This property is automatically reflected to the `log-level` attribute, so
   * you can use the `log-level` attribute or this property interchangeably.
   *
   * @example
   * ```html
   * <shopify-checkout log-level="debug" src="..."></shopify-checkout>
   * ```
   */
  logLevel?: LogLevel;
  /**
   * Controls anonymous diagnostic metrics sent by Checkout Kit. Defaults to `true`.
   *
   * This property is reflected to the `telemetry` attribute. Set it to
   * `false` before opening checkout to opt out.
   */
  telemetry?: boolean;
  /**
   * Extra origins allowed to post incoming checkout-protocol messages, on top
   * of the always-trusted cart URL origin (from `src`) and Shopify-owned
   * `shop.app` and `shop.com` domains.
   *
   * Web is closed by default: with no configured origins only the cart URL
   * origin and Shopify-owned `shop.app` and `shop.com` domains (including
   * their subdomains) are trusted. Entries may
   * be exact origins (`https://example.com`), wildcard subdomains
   * (`https://*.example.com`), or `'*'` to disable origin validation entirely.
   *
   * Reflected to the space/comma-separated `allowed-origins` attribute.
   */
  allowedOrigins?: string[];
  /**
   * Called when an incoming message is dropped by origin validation. The smart
   * default logs a warning; override to observe rejected messages. Treat the
   * payload as untrusted — it was dropped precisely because its origin was not
   * in the allowlist.
   */
  onMessageRejected?: (detail: MessageRejectedDetail) => void;
}
type TypedEventListener<Event> = ((event: Event) => void) | {
  handleEvent(event: Event): void;
};
export { CheckoutTarget as a, LogLevel as c, CheckoutError as d, CheckoutErrorCode as f, Checkout as h, CheckoutProperties as i, HTMLElementBase as l, CheckoutFailureCode as m, CheckoutAttributes as n, MessageRejectedDetail as o, CheckoutFailure as p, CheckoutMethods as r, TypedEventListener as s, CheckoutAppearance as t, CheckoutBlockedDetail as u };
