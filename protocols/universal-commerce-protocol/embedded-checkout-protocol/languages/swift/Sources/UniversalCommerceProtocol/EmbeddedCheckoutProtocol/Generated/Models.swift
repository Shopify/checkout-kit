// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse JSON with the protocol models, use:
//
//   let checkout = try EmbeddedCheckoutProtocol.Checkout(json)
//   let order = try Order(json)
//   let errorResponse = try EmbeddedCheckoutProtocol.ErrorResponse(json)
//   let instrumentsChangeResult = try EmbeddedCheckoutProtocol.InstrumentsChangeResult(json)
//   let credentialResult = try EmbeddedCheckoutProtocol.CredentialResult(json)
//   let addressChangeResult = try EmbeddedCheckoutProtocol.AddressChangeResult(json)
//   let readyRequest = try EmbeddedCheckoutProtocol.ReadyRequest(json)
//   let readyResult = try EmbeddedCheckoutProtocol.ReadyResult(json)
//   let authRequest = try EmbeddedCheckoutProtocol.AuthRequest(json)
//   let authResult = try EmbeddedCheckoutProtocol.AuthResult(json)
//   let windowOpenRequest = try EmbeddedCheckoutProtocol.WindowOpenRequest(json)
//   let windowOpenResult = try EmbeddedCheckoutProtocol.WindowOpenResult(json)

import Foundation

/// Base checkout schema. Extensions compose onto this using allOf.
// MARK: - Checkout
extension EmbeddedCheckoutProtocol {
    public struct Checkout: Codable, Sendable {
        /// Outstanding extension-defined [String: JSONAny] for this checkout.
        public var actions: [String: [[String: JSONAny]]]?
        public var attribution: [String: String]?
        /// Representation of the buyer.
        public var buyer: Buyer?
        public var context: Context?
        /// URL for checkout handoff and session recovery. MUST be provided when status is
        /// requires_escalation. See specification for format and availability requirements.
        public var continueURL: String?
        /// ISO 4217 currency code reflecting the merchant's market determination. Derived from
        /// address, context, and geo IP—buyers provide signals, merchants determine currency.
        public var currency: String
        public var discounts: CheckoutDiscounts?
        /// RFC 3339 expiry timestamp. Default TTL is 6 hours from creation if not sent.
        public var expiresAt: Date?
        /// Fulfillment details.
        public var fulfillment: CheckoutFulfillment?
        /// Unique identifier of the checkout session.
        public var id: String
        /// List of line items being checked out.
        public var lineItems: [LineItem]
        /// Links to be displayed by the platform (Privacy Policy, TOS). Mandatory for legal
        /// compliance.
        public var links: [Link]
        /// List of messages with error and info about the checkout session state.
        public var messages: [Message]?
        /// Details about an order created for this checkout session.
        public var order: OrderConfirmation?
        public var payment: Payment?
        /// Policies (e.g., return/refund terms) that apply to the items in this checkout.
        /// `applies_to` targets are relative to the response root; when absent or empty, refer to
        /// the URLs in `links[]`.
        public var policies: [Policy]?
        public var signals: [String: JSONAny]?
        /// Checkout state indicating the current phase and required processing. See Checkout Status
        /// lifecycle documentation for state transition details.
        public var status: CheckoutStatus
        /// Different cart totals.
        public var totals: [CheckoutTotal]
        public var ucp: EmbeddedCheckoutProtocol.UCPCheckoutResponseSchema

        enum CodingKeys: String, CodingKey {
            case actions, attribution, buyer, context
            case continueURL = "continue_url"
            case currency, discounts
            case expiresAt = "expires_at"
            case fulfillment, id
            case lineItems = "line_items"
            case links, messages, order, payment, policies, signals, status, totals, ucp
        }

        public init(currency: String, id: String, lineItems: [LineItem], links: [Link], status: CheckoutStatus, totals: [CheckoutTotal], ucp: EmbeddedCheckoutProtocol.UCPCheckoutResponseSchema, configure: (inout Self) -> Void = { _ in }) {
            self.currency = currency
            self.id = id
            self.lineItems = lineItems
            self.links = links
            self.status = status
            self.totals = totals
            self.ucp = ucp
            configure(&self)
        }

        public var additionalProperties: [String: JSONAny] = [:]

        private static let knownAdditionalPropertyKeys: Set<String> = ["actions", "attribution", "buyer", "context", "continue_url", "currency", "discounts", "expires_at", "fulfillment", "id", "line_items", "links", "messages", "order", "payment", "policies", "signals", "status", "totals", "ucp"]

        public init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            self.actions = try container.decodeIfPresent([String: [[String: JSONAny]]].self, forKey: .actions)
            self.attribution = try container.decodeIfPresent([String: String].self, forKey: .attribution)
            self.buyer = try container.decodeIfPresent(Buyer.self, forKey: .buyer)
            self.context = try container.decodeIfPresent(Context.self, forKey: .context)
            self.continueURL = try container.decodeIfPresent(String.self, forKey: .continueURL)
            self.currency = try container.decode(String.self, forKey: .currency)
            self.discounts = try container.decodeIfPresent(CheckoutDiscounts.self, forKey: .discounts)
            self.expiresAt = try container.decodeIfPresent(Date.self, forKey: .expiresAt)
            self.fulfillment = try container.decodeIfPresent(CheckoutFulfillment.self, forKey: .fulfillment)
            self.id = try container.decode(String.self, forKey: .id)
            self.lineItems = try container.decode([LineItem].self, forKey: .lineItems)
            self.links = try container.decode([Link].self, forKey: .links)
            self.messages = try container.decodeIfPresent([Message].self, forKey: .messages)
            self.order = try container.decodeIfPresent(OrderConfirmation.self, forKey: .order)
            self.payment = try container.decodeIfPresent(Payment.self, forKey: .payment)
            self.policies = try container.decodeIfPresent([Policy].self, forKey: .policies)
            self.signals = try container.decodeIfPresent([String: JSONAny].self, forKey: .signals)
            self.status = try container.decode(CheckoutStatus.self, forKey: .status)
            self.totals = try container.decode([CheckoutTotal].self, forKey: .totals)
            self.ucp = try container.decode(EmbeddedCheckoutProtocol.UCPCheckoutResponseSchema.self, forKey: .ucp)
            let additionalContainer = try decoder.container(keyedBy: JSONCodingKey.self)
            var extras: [String: JSONAny] = [:]
            for key in additionalContainer.allKeys where !Self.knownAdditionalPropertyKeys.contains(key.stringValue) {
                extras[key.stringValue] = try additionalContainer.decode(JSONAny.self, forKey: key)
            }
            self.additionalProperties = extras
        }

        public func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encodeIfPresent(actions, forKey: .actions)
            try container.encodeIfPresent(attribution, forKey: .attribution)
            try container.encodeIfPresent(buyer, forKey: .buyer)
            try container.encodeIfPresent(context, forKey: .context)
            try container.encodeIfPresent(continueURL, forKey: .continueURL)
            try container.encode(currency, forKey: .currency)
            try container.encodeIfPresent(discounts, forKey: .discounts)
            try container.encodeIfPresent(expiresAt, forKey: .expiresAt)
            try container.encodeIfPresent(fulfillment, forKey: .fulfillment)
            try container.encode(id, forKey: .id)
            try container.encode(lineItems, forKey: .lineItems)
            try container.encode(links, forKey: .links)
            try container.encodeIfPresent(messages, forKey: .messages)
            try container.encodeIfPresent(order, forKey: .order)
            try container.encodeIfPresent(payment, forKey: .payment)
            try container.encodeIfPresent(policies, forKey: .policies)
            try container.encodeIfPresent(signals, forKey: .signals)
            try container.encode(status, forKey: .status)
            try container.encode(totals, forKey: .totals)
            try container.encode(ucp, forKey: .ucp)
            var additionalContainer = encoder.container(keyedBy: JSONCodingKey.self)
            for key in additionalProperties.keys.sorted() where !Self.knownAdditionalPropertyKeys.contains(key) {
                try additionalContainer.encode(additionalProperties[key]!, forKey: JSONCodingKey(stringValue: key)!)
            }
        }
    }
}

// MARK: Checkout convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.Checkout {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.Checkout.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Non-empty instances of one Action type. JSON preserves array order; the declaring
/// extension defines whether order has processing semantics.
///
/// Common fields for one outstanding Action instance are id and optional config. The
/// extension declaring the Action type defines type-specific processing data under config.
/// Additional properties are permitted for forward compatibility.


/// Representation of the buyer.
// MARK: - Buyer
public struct Buyer: Codable, Sendable {
    /// Email of the buyer.
    public var email: String?
    /// First name of the buyer.
    public var firstName: String?
    /// Last name of the buyer.
    public var lastName: String?
    /// E.164 standard.
    public var phoneNumber: String?

    enum CodingKeys: String, CodingKey {
        case email
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
    }

    public init(configure: (inout Self) -> Void = { _ in }) {
        configure(&self)
    }

    public var additionalProperties: [String: JSONAny] = [:]

    private static let knownAdditionalPropertyKeys: Set<String> = ["email", "first_name", "last_name", "phone_number"]

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.email = try container.decodeIfPresent(String.self, forKey: .email)
        self.firstName = try container.decodeIfPresent(String.self, forKey: .firstName)
        self.lastName = try container.decodeIfPresent(String.self, forKey: .lastName)
        self.phoneNumber = try container.decodeIfPresent(String.self, forKey: .phoneNumber)
        let additionalContainer = try decoder.container(keyedBy: JSONCodingKey.self)
        var extras: [String: JSONAny] = [:]
        for key in additionalContainer.allKeys where !Self.knownAdditionalPropertyKeys.contains(key.stringValue) {
            extras[key.stringValue] = try additionalContainer.decode(JSONAny.self, forKey: key)
        }
        self.additionalProperties = extras
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(email, forKey: .email)
        try container.encodeIfPresent(firstName, forKey: .firstName)
        try container.encodeIfPresent(lastName, forKey: .lastName)
        try container.encodeIfPresent(phoneNumber, forKey: .phoneNumber)
        var additionalContainer = encoder.container(keyedBy: JSONCodingKey.self)
        for key in additionalProperties.keys.sorted() where !Self.knownAdditionalPropertyKeys.contains(key) {
            try additionalContainer.encode(additionalProperties[key]!, forKey: JSONCodingKey(stringValue: key)!)
        }
    }
}

// MARK: Buyer convenience initializers and mutators

public extension Buyer {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Buyer.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Provisional buyer signals for relevance and localization—not authoritative data.
/// Businesses SHOULD use these values when verified inputs (e.g., shipping address) are
/// absent, and MAY ignore or down-rank them if inconsistent with higher-confidence signals
/// (authenticated account, risk detection) or regulatory constraints (export controls).
/// Eligibility and policy enforcement MUST occur at checkout time using binding transaction
/// data. Context SHOULD be non-identifying and can be disclosed progressively—coarse signals
/// early, finer resolution as the session progresses. Higher-resolution data (shipping
/// address, billing address) supersedes context.
///
/// A coarse geographic location — country, region, and postal code. A lightweight
/// alternative to a full postal address.
// MARK: - Context
public struct Context: Codable, Sendable {
    /// The country, as a 2-letter ISO 3166-1 alpha-2 code (e.g. "US"). A 3-letter alpha-3 code
    /// or full country name MAY also be used.
    public var addressCountry: String?
    /// The first-level administrative region within the country (e.g. a state or province such
    /// as California).
    public var addressRegion: String?
    /// The postal code (e.g. "94043").
    public var postalCode: String?
    /// Preferred currency (ISO 4217, e.g., 'EUR', 'USD'). Businesses determine presentment
    /// currency from context and authoritative signals; this hint MAY inform selection in
    /// multi-currency markets. Also serves as the denomination for price filter values —
    /// platforms SHOULD include this field when sending price filters. Response prices include
    /// explicit currency confirming the resolution.
    public var currency: String?
    /// Buyer claims about eligible benefits such as loyalty membership, payment instrument
    /// perks, and similar. Recognized claims MAY inform the Business response (e.g., member-only
    /// product availability, adjusted pricing in catalog, provisional discounts at cart or
    /// checkout). Businesses MUST ignore unrecognized values without error. Values MUST use
    /// reverse-domain naming (e.g., 'com.example.loyalty_gold', 'org.school.student') and MUST
    /// be non-identifying.
    public var eligibility: [String]?
    /// Background context describing buyer's intent (e.g., 'looking for a gift under $50', 'need
    /// something durable for outdoor use'). Informs relevance, recommendations, and
    /// personalization.
    public var intent: String?
    /// Preferred language for content. Use IETF BCP 47 language tags (e.g., 'en', 'fr-CA',
    /// 'zh-Hans'). For REST, equivalent to Accept-Language header—platforms SHOULD fall back to
    /// Accept-Language when this field is absent; when provided, overrides Accept-Language.
    /// Businesses MAY return content in a different language if unavailable.
    public var language: String?
    /// Stable, opaque identifier for a Location in the Business's namespace. This provisional,
    /// non-binding hint is distinct from the Buyer's locality. The operation specification or an
    /// active capability/extension defines its effects. A common example in retail shopping is
    /// the default home store ID selected and saved by the user when purchasing groceries.
    public var location: String?
    /// Buyer-preferred payment handlers in priority order (most preferred first). Each entry
    /// names a handler advertised in the Business profile's `ucp.payment_handlers`, optionally
    /// narrowed to preferred instrument types. The Business SHOULD use it to preselect or
    /// prioritize the handler (and type, when given) and MAY ignore unavailable or ineligible
    /// entries; unrecognized values MUST be ignored without error.
    public var payment: [PreferredPaymentHandler]?

    enum CodingKeys: String, CodingKey {
        case addressCountry = "address_country"
        case addressRegion = "address_region"
        case postalCode = "postal_code"
        case currency, eligibility, intent, language, location, payment
    }

    public init(configure: (inout Self) -> Void = { _ in }) {
        configure(&self)
    }

    public var additionalProperties: [String: JSONAny] = [:]

    private static let knownAdditionalPropertyKeys: Set<String> = ["address_country", "address_region", "postal_code", "currency", "eligibility", "intent", "language", "location", "payment"]

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.addressCountry = try container.decodeIfPresent(String.self, forKey: .addressCountry)
        self.addressRegion = try container.decodeIfPresent(String.self, forKey: .addressRegion)
        self.postalCode = try container.decodeIfPresent(String.self, forKey: .postalCode)
        self.currency = try container.decodeIfPresent(String.self, forKey: .currency)
        self.eligibility = try container.decodeIfPresent([String].self, forKey: .eligibility)
        self.intent = try container.decodeIfPresent(String.self, forKey: .intent)
        self.language = try container.decodeIfPresent(String.self, forKey: .language)
        self.location = try container.decodeIfPresent(String.self, forKey: .location)
        self.payment = try container.decodeIfPresent([PreferredPaymentHandler].self, forKey: .payment)
        let additionalContainer = try decoder.container(keyedBy: JSONCodingKey.self)
        var extras: [String: JSONAny] = [:]
        for key in additionalContainer.allKeys where !Self.knownAdditionalPropertyKeys.contains(key.stringValue) {
            extras[key.stringValue] = try additionalContainer.decode(JSONAny.self, forKey: key)
        }
        self.additionalProperties = extras
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(addressCountry, forKey: .addressCountry)
        try container.encodeIfPresent(addressRegion, forKey: .addressRegion)
        try container.encodeIfPresent(postalCode, forKey: .postalCode)
        try container.encodeIfPresent(currency, forKey: .currency)
        try container.encodeIfPresent(eligibility, forKey: .eligibility)
        try container.encodeIfPresent(intent, forKey: .intent)
        try container.encodeIfPresent(language, forKey: .language)
        try container.encodeIfPresent(location, forKey: .location)
        try container.encodeIfPresent(payment, forKey: .payment)
        var additionalContainer = encoder.container(keyedBy: JSONCodingKey.self)
        for key in additionalProperties.keys.sorted() where !Self.knownAdditionalPropertyKeys.contains(key) {
            try additionalContainer.encode(additionalProperties[key]!, forKey: JSONCodingKey(stringValue: key)!)
        }
    }
}

// MARK: Context convenience initializers and mutators

public extension Context {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Context.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - PreferredPaymentHandler
public struct PreferredPaymentHandler: Codable, Sendable {
    /// Handler registry key advertised in the Business profile's `ucp.payment_handlers`.
    public var handler: String
    /// Optional preferred instrument types for this handler, in priority order, aligned with the
    /// handler's advertised `payment_instrument.type` values (for example `card` or `bank`).
    /// Unrecognized values MUST be ignored.
    public var types: [String]?

    public init(handler: String, configure: (inout Self) -> Void = { _ in }) {
        self.handler = handler
        configure(&self)
    }
}

// MARK: PreferredPaymentHandler convenience initializers and mutators

public extension PreferredPaymentHandler {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PreferredPaymentHandler.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Discount codes input and applied discounts output.
// MARK: - CheckoutDiscounts
public struct CheckoutDiscounts: Codable, Sendable {
    /// Discounts successfully applied (code-based and automatic).
    public var applied: [AppliedDiscount]?
    /// Discount codes to apply. Case-insensitive. Replaces previously submitted codes. Send
    /// empty array to clear.
    public var codes: [String]?

    public init(configure: (inout Self) -> Void = { _ in }) {
        configure(&self)
    }
}

// MARK: CheckoutDiscounts convenience initializers and mutators

public extension CheckoutDiscounts {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CheckoutDiscounts.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A discount that was successfully applied.
// MARK: - AppliedDiscount
public struct AppliedDiscount: Codable, Sendable {
    /// Breakdown of where this discount was allocated. Sum of allocation amounts equals total
    /// amount.
    public var allocations: [DiscountAllocation]?
    /// Total discount amount in ISO 4217 minor units.
    public var amount: Int
    /// True if applied automatically by merchant rules (no code required).
    public var automatic: Bool?
    /// The discount code. Omitted for automatic discounts.
    public var code: String?
    /// The eligibility claim accepted by the Business for this discount. Corresponds to a value
    /// from context.eligibility. Omitted for code-based and non-eligibility automatic discounts.
    public var eligibility: String?
    /// Allocation method. 'each' = applied independently per item. 'across' = split
    /// proportionally by value.
    public var method: DiscountMethod?
    /// Stacking order for discount calculation. Lower numbers applied first (1 = first).
    public var priority: Int?
    /// True if this discount requires additional verification.
    public var provisional: Bool?
    /// Human-readable discount name (e.g., 'Summer Sale 20% Off').
    public var title: String

    public init(amount: Int, title: String, configure: (inout Self) -> Void = { _ in }) {
        self.amount = amount
        self.title = title
        configure(&self)
    }
}

// MARK: AppliedDiscount convenience initializers and mutators

public extension AppliedDiscount {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(AppliedDiscount.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Breakdown of how a discount amount was allocated to a specific target.
// MARK: - DiscountAllocation
public struct DiscountAllocation: Codable, Sendable {
    /// Amount allocated to this target in ISO 4217 minor units.
    public var amount: Int
    /// RFC 9535 JSONPath to the allocation target (e.g., '$.line_items[0]', '$.totals[?@.type ==
    /// "fulfillment"]').
    public var path: String

    public init(amount: Int, path: String, configure: (inout Self) -> Void = { _ in }) {
        self.amount = amount
        self.path = path
        configure(&self)
    }
}

// MARK: DiscountAllocation convenience initializers and mutators

public extension DiscountAllocation {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(DiscountAllocation.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Allocation method. 'each' = applied independently per item. 'across' = split
/// proportionally by value.
public struct DiscountMethod: RawRepresentable, Codable, Hashable, Sendable {
    public let rawValue: String

    /// Preserves the string, including values this protocol version doesn't define.
    /// This initializer never returns nil. Use `isKnown` to check for a named value.
    public init?(rawValue: String) {
        self.init(unchecked: rawValue)
    }

    private init(unchecked rawValue: String) {
        self.rawValue = rawValue
    }

    public static let across = DiscountMethod(unchecked: "across")
    public static let each = DiscountMethod(unchecked: "each")

    /// Values defined by the pinned protocol version.
    static let knownValues: Set<String> = ["across", "each"]

    /// Whether this protocol version defines a named constant for the value.
    public var isKnown: Bool { Self.knownValues.contains(rawValue) }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.init(unchecked: try container.decode(String.self))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

/// Fulfillment details.
///
/// Container for fulfillment methods and availability.
// MARK: - CheckoutFulfillment
public struct CheckoutFulfillment: Codable, Sendable {
    /// Inventory availability hints.
    public var availableMethods: [FulfillmentAvailableMethod]?
    /// Fulfillment methods for cart items.
    public var methods: [FulfillmentMethod]?

    enum CodingKeys: String, CodingKey {
        case availableMethods = "available_methods"
        case methods
    }

    public init(configure: (inout Self) -> Void = { _ in }) {
        configure(&self)
    }
}

// MARK: CheckoutFulfillment convenience initializers and mutators

public extension CheckoutFulfillment {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CheckoutFulfillment.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Inventory availability hint for a fulfillment method type.
// MARK: - FulfillmentAvailableMethod
public struct FulfillmentAvailableMethod: Codable, Sendable {
    /// Human-readable availability info (e.g., 'Available for pickup at Downtown Store today').
    public var description: String?
    /// 'now' for immediate availability, or ISO 8601 date for future (preorders, transfers).
    public var fulfillableOn: String?
    /// Line items available for this fulfillment method.
    public var lineItemIDS: [String]
    /// Fulfillment method type this availability applies to. Well-known values: `shipping`,
    /// `pickup`; businesses MAY use additional values.
    public var type: String

    enum CodingKeys: String, CodingKey {
        case description
        case fulfillableOn = "fulfillable_on"
        case lineItemIDS = "line_item_ids"
        case type
    }

    public init(lineItemIDS: [String], type: String, configure: (inout Self) -> Void = { _ in }) {
        self.lineItemIDS = lineItemIDS
        self.type = type
        configure(&self)
    }

    public var additionalProperties: [String: JSONAny] = [:]

    private static let knownAdditionalPropertyKeys: Set<String> = ["description", "fulfillable_on", "line_item_ids", "type"]

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.description = try container.decodeIfPresent(String.self, forKey: .description)
        self.fulfillableOn = try container.decodeIfPresent(String.self, forKey: .fulfillableOn)
        self.lineItemIDS = try container.decode([String].self, forKey: .lineItemIDS)
        self.type = try container.decode(String.self, forKey: .type)
        let additionalContainer = try decoder.container(keyedBy: JSONCodingKey.self)
        var extras: [String: JSONAny] = [:]
        for key in additionalContainer.allKeys where !Self.knownAdditionalPropertyKeys.contains(key.stringValue) {
            extras[key.stringValue] = try additionalContainer.decode(JSONAny.self, forKey: key)
        }
        self.additionalProperties = extras
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(fulfillableOn, forKey: .fulfillableOn)
        try container.encode(lineItemIDS, forKey: .lineItemIDS)
        try container.encode(type, forKey: .type)
        var additionalContainer = encoder.container(keyedBy: JSONCodingKey.self)
        for key in additionalProperties.keys.sorted() where !Self.knownAdditionalPropertyKeys.contains(key) {
            try additionalContainer.encode(additionalProperties[key]!, forKey: JSONCodingKey(stringValue: key)!)
        }
    }
}

// MARK: FulfillmentAvailableMethod convenience initializers and mutators

public extension FulfillmentAvailableMethod {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FulfillmentAvailableMethod.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A fulfillment method with destinations and groups.
// MARK: - FulfillmentMethod
public struct FulfillmentMethod: Codable, Sendable {
    /// Available destinations for this method. In Business responses, each destination carries a
    /// `type` and `id`.
    public var destinations: [FulfillmentDestination]?
    /// Fulfillment groups for selecting options. Agent sets selected_option_id on groups to
    /// choose shipping method.
    public var groups: [FulfillmentGroup]?
    /// Unique fulfillment method identifier.
    public var id: String
    /// Line item IDs fulfilled via this method.
    public var lineItemIDS: [String]
    /// ID of the selected destination. Accepts any stable, Business-scoped ID the Business
    /// recognizes for this method, including Location IDs not yet enumerated in `destinations`.
    public var selectedDestinationID: String?
    /// Fulfillment method type. Well-known values: `shipping`, `pickup`. Businesses MAY use
    /// additional values.
    public var type: String

    enum CodingKeys: String, CodingKey {
        case destinations, groups, id
        case lineItemIDS = "line_item_ids"
        case selectedDestinationID = "selected_destination_id"
        case type
    }

    public init(id: String, lineItemIDS: [String], type: String, configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.lineItemIDS = lineItemIDS
        self.type = type
        configure(&self)
    }

    public var additionalProperties: [String: JSONAny] = [:]

    private static let knownAdditionalPropertyKeys: Set<String> = ["destinations", "groups", "id", "line_item_ids", "selected_destination_id", "type"]

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.destinations = try container.decodeIfPresent([FulfillmentDestination].self, forKey: .destinations)
        self.groups = try container.decodeIfPresent([FulfillmentGroup].self, forKey: .groups)
        self.id = try container.decode(String.self, forKey: .id)
        self.lineItemIDS = try container.decode([String].self, forKey: .lineItemIDS)
        self.selectedDestinationID = try container.decodeIfPresent(String.self, forKey: .selectedDestinationID)
        self.type = try container.decode(String.self, forKey: .type)
        let additionalContainer = try decoder.container(keyedBy: JSONCodingKey.self)
        var extras: [String: JSONAny] = [:]
        for key in additionalContainer.allKeys where !Self.knownAdditionalPropertyKeys.contains(key.stringValue) {
            extras[key.stringValue] = try additionalContainer.decode(JSONAny.self, forKey: key)
        }
        self.additionalProperties = extras
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(destinations, forKey: .destinations)
        try container.encodeIfPresent(groups, forKey: .groups)
        try container.encode(id, forKey: .id)
        try container.encode(lineItemIDS, forKey: .lineItemIDS)
        try container.encodeIfPresent(selectedDestinationID, forKey: .selectedDestinationID)
        try container.encode(type, forKey: .type)
        var additionalContainer = encoder.container(keyedBy: JSONCodingKey.self)
        for key in additionalProperties.keys.sorted() where !Self.knownAdditionalPropertyKeys.contains(key) {
            try additionalContainer.encode(additionalProperties[key]!, forKey: JSONCodingKey(stringValue: key)!)
        }
    }
}

// MARK: FulfillmentMethod convenience initializers and mutators

public extension FulfillmentMethod {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FulfillmentMethod.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A destination for fulfillment.
// MARK: - FulfillmentDestination
public struct FulfillmentDestination: Codable, Sendable {
    /// Physical address of the location.
    public var address: PostalAddress?
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used.
    public var addressCountry: String?
    /// The locality in which the street address is, and which is in the region. For example,
    /// Mountain View.
    public var addressLocality: String?
    /// The region in which the locality is, and which is in the country. Required for applicable
    /// countries (i.e. state in US, province in CA). For example, California or another
    /// appropriate first-level Administrative division.
    public var addressRegion: String?
    /// An address extension such as an apartment number, C/O or alternative name.
    public var extendedAddress: String?
    /// Optional. First name of the contact associated with the address.
    public var firstName: String?
    /// Fulfillment destination identifier.
    public var id: String
    /// Optional. Last name of the contact associated with the address.
    public var lastName: String?
    /// Buyer-facing, Business-owned display name.
    public var name: String?
    /// Optional. Phone number of the contact associated with the address.
    public var phoneNumber: String?
    /// The postal code. For example, 94043.
    public var postalCode: String?
    /// The street address.
    public var streetAddress: String?
    /// Destination contract discriminator. Required in Business responses and optional in
    /// Platform requests. Well-known values: `shipping_address`, `business_location`. The
    /// enclosing method contract defines request defaults and which fields the Platform may
    /// write; negotiated extensions define additional values.
    public var type: String?

    enum CodingKeys: String, CodingKey {
        case address
        case addressCountry = "address_country"
        case addressLocality = "address_locality"
        case addressRegion = "address_region"
        case extendedAddress = "extended_address"
        case firstName = "first_name"
        case id
        case lastName = "last_name"
        case name
        case phoneNumber = "phone_number"
        case postalCode = "postal_code"
        case streetAddress = "street_address"
        case type
    }

    public init(id: String, configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        configure(&self)
    }
}

// MARK: FulfillmentDestination convenience initializers and mutators

public extension FulfillmentDestination {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FulfillmentDestination.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Physical address of the location.
///
/// The billing address associated with this payment method.
///
/// Delivery destination address.
// MARK: - PostalAddress
public struct PostalAddress: Codable, Sendable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used.
    public var addressCountry: String?
    /// The locality in which the street address is, and which is in the region. For example,
    /// Mountain View.
    public var addressLocality: String?
    /// The region in which the locality is, and which is in the country. Required for applicable
    /// countries (i.e. state in US, province in CA). For example, California or another
    /// appropriate first-level Administrative division.
    public var addressRegion: String?
    /// An address extension such as an apartment number, C/O or alternative name.
    public var extendedAddress: String?
    /// Optional. First name of the contact associated with the address.
    public var firstName: String?
    /// Optional. Last name of the contact associated with the address.
    public var lastName: String?
    /// Optional. Phone number of the contact associated with the address.
    public var phoneNumber: String?
    /// The postal code. For example, 94043.
    public var postalCode: String?
    /// The street address.
    public var streetAddress: String?

    enum CodingKeys: String, CodingKey {
        case addressCountry = "address_country"
        case addressLocality = "address_locality"
        case addressRegion = "address_region"
        case extendedAddress = "extended_address"
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
        case postalCode = "postal_code"
        case streetAddress = "street_address"
    }

    public init(configure: (inout Self) -> Void = { _ in }) {
        configure(&self)
    }
}

// MARK: PostalAddress convenience initializers and mutators

public extension PostalAddress {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PostalAddress.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A merchant-generated package/group of line items with fulfillment options.
// MARK: - FulfillmentGroup
public struct FulfillmentGroup: Codable, Sendable {
    /// Group identifier for referencing merchant-generated groups in updates.
    public var id: String
    /// Line item IDs included in this group/package.
    public var lineItemIDS: [String]
    /// Available fulfillment options for this group.
    public var options: [FulfillmentOption]?
    /// ID of the selected fulfillment option for this group.
    public var selectedOptionID: String?

    enum CodingKeys: String, CodingKey {
        case id
        case lineItemIDS = "line_item_ids"
        case options
        case selectedOptionID = "selected_option_id"
    }

    public init(id: String, lineItemIDS: [String], configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.lineItemIDS = lineItemIDS
        configure(&self)
    }

    public var additionalProperties: [String: JSONAny] = [:]

    private static let knownAdditionalPropertyKeys: Set<String> = ["id", "line_item_ids", "options", "selected_option_id"]

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.lineItemIDS = try container.decode([String].self, forKey: .lineItemIDS)
        self.options = try container.decodeIfPresent([FulfillmentOption].self, forKey: .options)
        self.selectedOptionID = try container.decodeIfPresent(String.self, forKey: .selectedOptionID)
        let additionalContainer = try decoder.container(keyedBy: JSONCodingKey.self)
        var extras: [String: JSONAny] = [:]
        for key in additionalContainer.allKeys where !Self.knownAdditionalPropertyKeys.contains(key.stringValue) {
            extras[key.stringValue] = try additionalContainer.decode(JSONAny.self, forKey: key)
        }
        self.additionalProperties = extras
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(lineItemIDS, forKey: .lineItemIDS)
        try container.encodeIfPresent(options, forKey: .options)
        try container.encodeIfPresent(selectedOptionID, forKey: .selectedOptionID)
        var additionalContainer = encoder.container(keyedBy: JSONCodingKey.self)
        for key in additionalProperties.keys.sorted() where !Self.knownAdditionalPropertyKeys.contains(key) {
            try additionalContainer.encode(additionalProperties[key]!, forKey: JSONCodingKey(stringValue: key)!)
        }
    }
}

// MARK: FulfillmentGroup convenience initializers and mutators

public extension FulfillmentGroup {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FulfillmentGroup.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A fulfillment option within a group (e.g., Standard Shipping $5, Express $15). Extends
/// the fulfillment option base with cost and timing.
///
/// Common base for a fulfillment option: an addressable, renderable choice (e.g. Standard,
/// Express). Catalog uses this base directly; checkout composes it with cost and timing.
// MARK: - FulfillmentOption
public struct FulfillmentOption: Codable, Sendable {
    /// Supplementary context for the title (e.g. 'Arrives in 4 business days', 'Arrives Dec
    /// 12-15 via FedEx'). Directly renderable; MUST NOT repeat the title.
    public var description: Description?
    /// Unique identifier for this fulfillment option.
    public var id: String
    /// Short label that distinguishes this option from its siblings (e.g. 'Standard', 'Express
    /// Shipping', 'Curbside Pickup').
    public var title: String
    /// Carrier name (for shipping).
    public var carrier: String?
    /// Earliest fulfillment date.
    public var earliestFulfillmentTime: Date?
    /// Latest fulfillment date.
    public var latestFulfillmentTime: Date?
    /// Fulfillment option totals breakdown.
    public var totals: [LineItemTotal]

    enum CodingKeys: String, CodingKey {
        case description, id, title, carrier
        case earliestFulfillmentTime = "earliest_fulfillment_time"
        case latestFulfillmentTime = "latest_fulfillment_time"
        case totals
    }

    public init(id: String, title: String, totals: [LineItemTotal], configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.title = title
        self.totals = totals
        configure(&self)
    }

    public var additionalProperties: [String: JSONAny] = [:]

    private static let knownAdditionalPropertyKeys: Set<String> = ["description", "id", "title", "carrier", "earliest_fulfillment_time", "latest_fulfillment_time", "totals"]

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        if let legacyDescription = try? container.decode(String.self, forKey: .description) {
            self.description = Description { $0.plain = legacyDescription }
        } else {
            self.description = try container.decodeIfPresent(Description.self, forKey: .description)
        }
        self.id = try container.decode(String.self, forKey: .id)
        self.title = try container.decode(String.self, forKey: .title)
        self.carrier = try container.decodeIfPresent(String.self, forKey: .carrier)
        self.earliestFulfillmentTime = try container.decodeIfPresent(Date.self, forKey: .earliestFulfillmentTime)
        self.latestFulfillmentTime = try container.decodeIfPresent(Date.self, forKey: .latestFulfillmentTime)
        self.totals = try container.decode([LineItemTotal].self, forKey: .totals)
        let additionalContainer = try decoder.container(keyedBy: JSONCodingKey.self)
        var extras: [String: JSONAny] = [:]
        for key in additionalContainer.allKeys where !Self.knownAdditionalPropertyKeys.contains(key.stringValue) {
            extras[key.stringValue] = try additionalContainer.decode(JSONAny.self, forKey: key)
        }
        self.additionalProperties = extras
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encode(id, forKey: .id)
        try container.encode(title, forKey: .title)
        try container.encodeIfPresent(carrier, forKey: .carrier)
        try container.encodeIfPresent(earliestFulfillmentTime, forKey: .earliestFulfillmentTime)
        try container.encodeIfPresent(latestFulfillmentTime, forKey: .latestFulfillmentTime)
        try container.encode(totals, forKey: .totals)
        var additionalContainer = encoder.container(keyedBy: JSONCodingKey.self)
        for key in additionalProperties.keys.sorted() where !Self.knownAdditionalPropertyKeys.contains(key) {
            try additionalContainer.encode(additionalProperties[key]!, forKey: JSONCodingKey(stringValue: key)!)
        }
    }
}

// MARK: FulfillmentOption convenience initializers and mutators

public extension FulfillmentOption {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FulfillmentOption.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Supplementary context for the title (e.g. 'Arrives in 4 business days', 'Arrives Dec
/// 12-15 via FedEx'). Directly renderable; MUST NOT repeat the title.
///
/// Description content in one or more formats. At least one format must be provided.
///
/// Human-readable policy summary in one or more formats (plain, markdown, html). Required on
/// every policy so a platform can present it without understanding any type-specific fields.
/// This is not the buyer-facing disclosure — display is compelled by a `messages[]` warning
/// (see the Policies section).
// MARK: - Description
public struct Description: Codable, Sendable {
    /// HTML-formatted content. Security: Platforms MUST sanitize before rendering—strip scripts,
    /// event handlers, and untrusted elements. Treat all rich text as untrusted input.
    public var html: String?
    /// Markdown-formatted content.
    public var markdown: String?
    /// Plain text content.
    public var plain: String?

    public init(configure: (inout Self) -> Void = { _ in }) {
        configure(&self)
    }
}

// MARK: Description convenience initializers and mutators

public extension Description {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Description.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A cost breakdown entry with a category, amount, and optional display text.
// MARK: - LineItemTotal
public struct LineItemTotal: Codable, Sendable {
    public var amount: Int
    /// Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
    /// 'Delivery').
    public var displayText: String?
    /// Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
    /// fee, total. Businesses MAY use additional values.
    public var type: String

    enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
        case type
    }

    public init(amount: Int, type: String, configure: (inout Self) -> Void = { _ in }) {
        self.amount = amount
        self.type = type
        configure(&self)
    }
}

// MARK: LineItemTotal convenience initializers and mutators

public extension LineItemTotal {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(LineItemTotal.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Line item object. Expected to use the currency of the parent object.
// MARK: - LineItem
public struct LineItem: Codable, Sendable {
    public var id: String
    public var item: Item
    /// Parent line item identifier for any nested structures.
    public var parentID: String?
    /// Always an integer step count. On Platform requests, steps use the item's
    /// Business-authoritative sale basis; omitting `item.quantity_unit` makes no assertion and
    /// does not imply `each`. On Business responses, `item.quantity_unit` describes the basis;
    /// if absent, it encodes the `each` machine identity (`C62`, 0) and `quantity` counts whole
    /// items.
    public var quantity: Int
    /// Line item totals breakdown.
    public var totals: [LineItemTotal]

    enum CodingKeys: String, CodingKey {
        case id, item
        case parentID = "parent_id"
        case quantity, totals
    }

    public init(id: String, item: Item, quantity: Int, totals: [LineItemTotal], configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.item = item
        self.quantity = quantity
        self.totals = totals
        configure(&self)
    }
}

// MARK: LineItem convenience initializers and mutators

public extension LineItem {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(LineItem.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Purchased item data, including identity, price, and sale basis.
// MARK: - Item
public struct Item: Codable, Sendable {
    /// The product identifier, often the SKU, required to resolve the product details associated
    /// with this line item. Should be recognized by both the Platform, and the Business.
    public var id: String
    /// Product image URI.
    public var imageURL: String?
    /// Unit price in ISO 4217 minor units. Price is the amount per one whole
    /// `quantity_unit.unit` (for example, per lb or per hour); when `quantity_unit` is absent,
    /// it is per `each`.
    public var price: Int
    /// Sale basis this item's `quantity` is denominated in. On an authoritative Business
    /// response, absence encodes the default `each` machine identity (`C62`, 0); the Business
    /// MUST include this descriptor for every non-`each` response. On Platform requests,
    /// omission makes no assertion: the Business interprets `quantity` using the item's
    /// authoritative sale basis. If the Platform includes this descriptor, it asserts the
    /// unit-descriptor machine identity. The Business MUST compare that machine identity
    /// (`unit`, effective `scale`), ignore `display_text` and `increment`, and resolve a
    /// mismatch by conversion surfaced as a visible line revision with a warning, or by
    /// rejection with a recoverable business outcome; silent reinterpretation is forbidden. An
    /// explicit `C62` descriptor at effective scale 0 matches an authoritative basis represented
    /// by an absent descriptor.
    public var quantityUnit: QuantityUnit?
    /// Product title.
    public var title: String
    /// Pricing basis for this item. On an authoritative Business response, the Business MUST
    /// include `unit_price` on every line whose pricing basis differs from its sale basis (for
    /// example, priced per pound but sold per `each`); presence on a line marks the rate as
    /// transactional rather than display-only. When the pricing basis is the sale basis,
    /// `item.price` fully denominates the charge and this field MAY be omitted.
    public var unitPrice: UnitPrice?

    enum CodingKeys: String, CodingKey {
        case id
        case imageURL = "image_url"
        case price
        case quantityUnit = "quantity_unit"
        case title
        case unitPrice = "unit_price"
    }

    public init(id: String, price: Int, title: String, configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.price = price
        self.title = title
        configure(&self)
    }
}

// MARK: Item convenience initializers and mutators

public extension Item {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Item.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Sale basis this item's `quantity` is denominated in. On an authoritative Business
/// response, absence encodes the default `each` machine identity (`C62`, 0); the Business
/// MUST include this descriptor for every non-`each` response. On Platform requests,
/// omission makes no assertion: the Business interprets `quantity` using the item's
/// authoritative sale basis. If the Platform includes this descriptor, it asserts the
/// unit-descriptor machine identity. The Business MUST compare that machine identity
/// (`unit`, effective `scale`), ignore `display_text` and `increment`, and resolve a
/// mismatch by conversion surfaced as a visible line revision with a warning, or by
/// rejection with a recoverable business outcome; silent reinterpretation is forbidden. An
/// explicit `C62` descriptor at effective scale 0 matches an authoritative basis represented
/// by an absent descriptor.
///
/// Sale-basis descriptor for quantities: the shared unit descriptor plus the Business's
/// ordering policy. Its unit-descriptor machine identity remains (`unit`, effective
/// `scale`); `display_text` and `increment` are excluded from identity and mismatch
/// comparison.
///
/// A reusable unit descriptor for quantities and measures. Its unit-descriptor machine
/// identity is (`unit`, effective `scale`), where effective `scale` is the provided `scale`
/// or 0; `display_text` is excluded.
// MARK: - QuantityUnit
public struct QuantityUnit: Codable, Sendable {
    /// Required printable unit label provided by the Business. The Platform MUST use it when it
    /// does not recognize `unit`; for a recognized UN/CEFACT Rec 20 Common Code, the Platform
    /// MAY substitute its own localized label. It does not participate in unit identity or
    /// mismatch comparison.
    public var displayText: String
    /// One step equals `10^-scale` of `unit`. When `unit` is `C62`, `scale`, if present, MUST be
    /// 0. The maximum of 15 is derived from the interoperable integer range: at scale 16 a
    /// single whole unit (10^16 steps) is no longer representable, so larger scales cannot
    /// denominate one unit of their own basis. Businesses needing finer granularity use a
    /// smaller unit.
    public var scale: Int?
    /// Stable machine identifier. The Business SHOULD use the exact UN/CEFACT Rec20 Common Code
    /// when one accurately identifies the unit. Otherwise, the Business MAY use a custom unit
    /// identifier and MUST use it consistently for the same unit. The Platform MUST treat an
    /// unrecognized identifier as opaque.
    public var unit: String
    /// Ordering granularity, denominated in steps: the Business sells this item in integer
    /// multiples of `increment` steps. Its effective value is the provided value or 1. Advisory
    /// merchandising policy, not a representational bound: Platform-authored quantities SHOULD
    /// be integer multiples of the effective increment; the Business MAY accept, revise, or
    /// reject an off-increment request with a recoverable business outcome and MUST NOT silently
    /// reinterpret it. Business-authored quantities (checkout revisions, fulfillment events,
    /// adjustments) are bounded only by `scale`.
    public var increment: Int?

    enum CodingKeys: String, CodingKey {
        case displayText = "display_text"
        case scale, unit, increment
    }

    public init(displayText: String, unit: String, configure: (inout Self) -> Void = { _ in }) {
        self.displayText = displayText
        self.unit = unit
        configure(&self)
    }
}

// MARK: QuantityUnit convenience initializers and mutators

public extension QuantityUnit {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(QuantityUnit.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Pricing basis for this item. On an authoritative Business response, the Business MUST
/// include `unit_price` on every line whose pricing basis differs from its sale basis (for
/// example, priced per pound but sold per `each`); presence on a line marks the rate as
/// transactional rather than display-only. When the pricing basis is the sale basis,
/// `item.price` fully denominates the charge and this field MAY be omitted.
///
/// Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
/// `unit_price.currency` MUST equal `price.currency`; the comparator MUST NOT perform
/// currency conversion. `measure.unit` and `reference.unit` MUST be identical; cross-unit
/// conversion is not permitted. Their scales MAY differ; each value represents `value ×
/// 10^-scale`.
// MARK: - UnitPrice
public struct UnitPrice: Codable, Sendable {
    /// Unit price in ISO 4217 minor units. After satisfying the same-unit invariant, the
    /// Business MUST compute the comparator as `(price.amount / (measure.value ×
    /// 10^-measure.scale)) × (reference.value × 10^-reference.scale)` and round it once to ISO
    /// 4217 minor units according to its pricing rules. The returned `unit_price.amount` is
    /// authoritative; the Platform MUST NOT recompute or substitute its own result.
    public var amount: Int
    /// ISO 4217 currency code.
    public var currency: String
    /// Product quantity in packaging/content (for example, a 750 mL bottle), distinct from
    /// `quantity_unit`, which defines the sale basis. Its integer `value` MUST be at least 1.
    public var measure: Measure
    /// Denominator for unit price display (for example, per 100 mL or per 1 kg). Its integer
    /// `value` MUST be at least 1.
    public var reference: Measure

    public init(amount: Int, currency: String, measure: Measure, reference: Measure, configure: (inout Self) -> Void = { _ in }) {
        self.amount = amount
        self.currency = currency
        self.measure = measure
        self.reference = reference
        configure(&self)
    }
}

// MARK: UnitPrice convenience initializers and mutators

public extension UnitPrice {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(UnitPrice.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Product quantity in packaging/content (for example, a 750 mL bottle), distinct from
/// `quantity_unit`, which defines the sale basis. Its integer `value` MUST be at least 1.
///
/// Denominator for unit price display (for example, per 100 mL or per 1 kg). Its integer
/// `value` MUST be at least 1.
///
/// The settled measurement this adjustment reconciles (for example, actual picked weight),
/// present when the line's price settles by measurement. Its unit identity MUST match the
/// line's pricing basis (`item.unit_price` measure/reference unit); no unit conversion. A
/// pure price settlement uses `quantity: 0` together with `measure` and a totals delta.
///
/// A measure composed of an integer value and a unit descriptor. Its value is the integer
/// count of `10^-scale` units of `unit`.
///
/// A reusable unit descriptor for quantities and measures. Its unit-descriptor machine
/// identity is (`unit`, effective `scale`), where effective `scale` is the provided `scale`
/// or 0; `display_text` is excluded.
// MARK: - Measure
public struct Measure: Codable, Sendable {
    /// Required printable unit label provided by the Business. The Platform MUST use it when it
    /// does not recognize `unit`; for a recognized UN/CEFACT Rec 20 Common Code, the Platform
    /// MAY substitute its own localized label. It does not participate in unit identity or
    /// mismatch comparison.
    public var displayText: String
    /// One step equals `10^-scale` of `unit`. When `unit` is `C62`, `scale`, if present, MUST be
    /// 0. The maximum of 15 is derived from the interoperable integer range: at scale 16 a
    /// single whole unit (10^16 steps) is no longer representable, so larger scales cannot
    /// denominate one unit of their own basis. Businesses needing finer granularity use a
    /// smaller unit.
    public var scale: Int?
    /// Stable machine identifier. The Business SHOULD use the exact UN/CEFACT Rec20 Common Code
    /// when one accurately identifies the unit. Otherwise, the Business MAY use a custom unit
    /// identifier and MUST use it consistently for the same unit. The Platform MUST treat an
    /// unrecognized identifier as opaque.
    public var unit: String
    /// Integer count of `10^-scale` units of `unit`.
    public var value: Int

    enum CodingKeys: String, CodingKey {
        case displayText = "display_text"
        case scale, unit, value
    }

    public init(displayText: String, unit: String, value: Int, configure: (inout Self) -> Void = { _ in }) {
        self.displayText = displayText
        self.unit = unit
        self.value = value
        configure(&self)
    }
}

// MARK: Measure convenience initializers and mutators

public extension Measure {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Measure.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - Link
public struct Link: Codable, Sendable {
    /// Optional display text for the link. When provided, use this instead of generating from
    /// type.
    public var title: String?
    /// Type of link. Well-known values: `privacy_policy`, `terms_of_service`, `refund_policy`,
    /// `shipping_policy`, `faq`. Consumers SHOULD handle unknown values gracefully by displaying
    /// them using the `title` field or omitting the link.
    public var type: String
    /// The actual URL pointing to the content to be displayed.
    public var url: String

    public init(type: String, url: String, configure: (inout Self) -> Void = { _ in }) {
        self.type = type
        self.url = url
        configure(&self)
    }
}

// MARK: Link convenience initializers and mutators

public extension Link {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Link.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Container for error, warning, or info messages.
// MARK: - Message
public struct Message: Codable, Sendable {
    public var code: String?
    /// Human-readable message.
    ///
    /// Human-readable warning message that MUST be displayed.
    public var content: String
    /// Content format, default = plain.
    public var contentType: ContentType?
    /// RFC 9535 JSONPath to the component the message refers to (e.g., $.line_items[0]).
    public var path: String?
    /// Reflects the resource state and recommended action. 'recoverable': platform can resolve
    /// the condition in band, for example by modifying inputs or processing a related Action,
    /// and submit a new operation when needed. 'requires_buyer_input': merchant requires
    /// information their API doesn't support collecting programmatically (checkout incomplete).
    /// 'requires_buyer_review': buyer must authorize before order placement due to policy,
    /// regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
    /// retry with new resource or inputs. Errors with 'requires_*' severity contribute to
    /// 'status: requires_escalation'.
    public var severity: Severity?
    /// Message type discriminator.
    public var type: MessageType
    /// URL to a required visual element (e.g., warning symbol, energy class label).
    public var imageURL: String?
    /// Rendering contract for this warning. 'notice' (default): platform MUST display, MAY
    /// dismiss. 'disclosure': platform MUST display in proximity to the path-referenced
    /// component, MUST NOT hide or auto-dismiss. See specification for full contract.
    public var presentation: String?
    /// Reference URL for more information (e.g., regulatory site, registry entry, policy page).
    public var url: String?

    enum CodingKeys: String, CodingKey {
        case code, content
        case contentType = "content_type"
        case path, severity, type
        case imageURL = "image_url"
        case presentation, url
    }

    public init(content: String, type: MessageType, configure: (inout Self) -> Void = { _ in }) {
        self.content = content
        self.type = type
        configure(&self)
    }
}

// MARK: Message convenience initializers and mutators

public extension Message {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Message.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Content format, default = plain.
public struct ContentType: RawRepresentable, Codable, Hashable, Sendable {
    public let rawValue: String

    /// Preserves the string, including values this protocol version doesn't define.
    /// This initializer never returns nil. Use `isKnown` to check for a named value.
    public init?(rawValue: String) {
        self.init(unchecked: rawValue)
    }

    private init(unchecked rawValue: String) {
        self.rawValue = rawValue
    }

    public static let markdown = ContentType(unchecked: "markdown")
    public static let plain = ContentType(unchecked: "plain")

    /// Values defined by the pinned protocol version.
    static let knownValues: Set<String> = ["markdown", "plain"]

    /// Whether this protocol version defines a named constant for the value.
    public var isKnown: Bool { Self.knownValues.contains(rawValue) }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.init(unchecked: try container.decode(String.self))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

/// Reflects the resource state and recommended action. 'recoverable': platform can resolve
/// the condition in band, for example by modifying inputs or processing a related Action,
/// and submit a new operation when needed. 'requires_buyer_input': merchant requires
/// information their API doesn't support collecting programmatically (checkout incomplete).
/// 'requires_buyer_review': buyer must authorize before order placement due to policy,
/// regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
/// retry with new resource or inputs. Errors with 'requires_*' severity contribute to
/// 'status: requires_escalation'.
public struct Severity: RawRepresentable, Codable, Hashable, Sendable {
    public let rawValue: String

    /// Preserves the string, including values this protocol version doesn't define.
    /// This initializer never returns nil. Use `isKnown` to check for a named value.
    public init?(rawValue: String) {
        self.init(unchecked: rawValue)
    }

    private init(unchecked rawValue: String) {
        self.rawValue = rawValue
    }

    public static let recoverable = Severity(unchecked: "recoverable")
    public static let requiresBuyerInput = Severity(unchecked: "requires_buyer_input")
    public static let requiresBuyerReview = Severity(unchecked: "requires_buyer_review")
    public static let unrecoverable = Severity(unchecked: "unrecoverable")

    /// Values defined by the pinned protocol version.
    static let knownValues: Set<String> = ["recoverable", "requires_buyer_input", "requires_buyer_review", "unrecoverable"]

    /// Whether this protocol version defines a named constant for the value.
    public var isKnown: Bool { Self.knownValues.contains(rawValue) }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.init(unchecked: try container.decode(String.self))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

public struct MessageType: RawRepresentable, Codable, Hashable, Sendable {
    public let rawValue: String

    /// Preserves the string, including values this protocol version doesn't define.
    /// This initializer never returns nil. Use `isKnown` to check for a named value.
    public init?(rawValue: String) {
        self.init(unchecked: rawValue)
    }

    private init(unchecked rawValue: String) {
        self.rawValue = rawValue
    }

    public static let error = MessageType(unchecked: "error")
    public static let info = MessageType(unchecked: "info")
    public static let warning = MessageType(unchecked: "warning")

    /// Values defined by the pinned protocol version.
    static let knownValues: Set<String> = ["error", "info", "warning"]

    /// Whether this protocol version defines a named constant for the value.
    public var isKnown: Bool { Self.knownValues.contains(rawValue) }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.init(unchecked: try container.decode(String.self))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

/// Details about an order created for this checkout session.
///
/// Order details available at the time of checkout completion.
// MARK: - OrderConfirmation
public struct OrderConfirmation: Codable, Sendable {
    /// Unique order identifier.
    public var id: String
    /// Human-readable label for identifying the order. MUST only be provided by the business.
    public var label: String?
    /// Permalink to access the order on merchant site.
    public var permalinkURL: String

    enum CodingKeys: String, CodingKey {
        case id, label
        case permalinkURL = "permalink_url"
    }

    public init(id: String, permalinkURL: String, configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.permalinkURL = permalinkURL
        configure(&self)
    }
}

// MARK: OrderConfirmation convenience initializers and mutators

public extension OrderConfirmation {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(OrderConfirmation.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Payment configuration containing handlers.
// MARK: - Payment
public struct Payment: Codable, Sendable {
    /// The payment instruments available for this payment. Each instrument is associated with a
    /// specific handler via the handler_id field. Handlers can extend the base
    /// payment_instrument schema to add handler-specific fields.
    public var instruments: [SelectedPaymentInstrument]?

    public init(configure: (inout Self) -> Void = { _ in }) {
        configure(&self)
    }
}

// MARK: Payment convenience initializers and mutators

public extension Payment {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Payment.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A payment instrument with selection state.
///
/// The base definition for any payment instrument. It links the instrument to a specific
/// payment handler.
// MARK: - SelectedPaymentInstrument
public struct SelectedPaymentInstrument: Codable, Sendable {
    /// The billing address associated with this payment method.
    public var billingAddress: PostalAddress?
    public var credential: PaymentCredential?
    /// Display information for this payment instrument. Each payment instrument schema defines
    /// its specific display properties, as outlined by the payment handler.
    public var display: [String: JSONAny]?
    /// The unique identifier for the handler instance that produced this instrument. This
    /// corresponds to the 'id' field in the Payment Handler definition.
    public var handlerID: String
    /// A unique identifier for this instrument instance. Typically assigned by the platform for
    /// instruments it collects. For a business-owned saved instrument returned on an
    /// identity-linked response, this identifier is assigned by the business; the platform MUST
    /// treat it as an opaque, business-scoped reference, and the business resolves it
    /// server-side when the buyer selects it.
    public var id: String
    /// The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
    /// will constrain this to a constant value.
    public var type: String
    /// Whether this instrument is selected by the user.
    public var selected: Bool?

    enum CodingKeys: String, CodingKey {
        case billingAddress = "billing_address"
        case credential, display
        case handlerID = "handler_id"
        case id, type, selected
    }

    public init(handlerID: String, id: String, type: String, configure: (inout Self) -> Void = { _ in }) {
        self.handlerID = handlerID
        self.id = id
        self.type = type
        configure(&self)
    }

    public var additionalProperties: [String: JSONAny] = [:]

    private static let knownAdditionalPropertyKeys: Set<String> = ["billing_address", "credential", "display", "handler_id", "id", "type", "selected"]

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.billingAddress = try container.decodeIfPresent(PostalAddress.self, forKey: .billingAddress)
        self.credential = try container.decodeIfPresent(PaymentCredential.self, forKey: .credential)
        self.display = try container.decodeIfPresent([String: JSONAny].self, forKey: .display)
        self.handlerID = try container.decode(String.self, forKey: .handlerID)
        self.id = try container.decode(String.self, forKey: .id)
        self.type = try container.decode(String.self, forKey: .type)
        self.selected = try container.decodeIfPresent(Bool.self, forKey: .selected)
        let additionalContainer = try decoder.container(keyedBy: JSONCodingKey.self)
        var extras: [String: JSONAny] = [:]
        for key in additionalContainer.allKeys where !Self.knownAdditionalPropertyKeys.contains(key.stringValue) {
            extras[key.stringValue] = try additionalContainer.decode(JSONAny.self, forKey: key)
        }
        self.additionalProperties = extras
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(billingAddress, forKey: .billingAddress)
        try container.encodeIfPresent(credential, forKey: .credential)
        try container.encodeIfPresent(display, forKey: .display)
        try container.encode(handlerID, forKey: .handlerID)
        try container.encode(id, forKey: .id)
        try container.encode(type, forKey: .type)
        try container.encodeIfPresent(selected, forKey: .selected)
        var additionalContainer = encoder.container(keyedBy: JSONCodingKey.self)
        for key in additionalProperties.keys.sorted() where !Self.knownAdditionalPropertyKeys.contains(key) {
            try additionalContainer.encode(additionalProperties[key]!, forKey: JSONCodingKey(stringValue: key)!)
        }
    }
}

// MARK: SelectedPaymentInstrument convenience initializers and mutators

public extension SelectedPaymentInstrument {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SelectedPaymentInstrument.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// The base definition for any payment credential. Handlers define specific credential types.
// MARK: - PaymentCredential
public struct PaymentCredential: Codable, Sendable {
    /// The credential type discriminator. Specific schemas will constrain this to a constant
    /// value.
    public var type: String

    public init(type: String, configure: (inout Self) -> Void = { _ in }) {
        self.type = type
        configure(&self)
    }

    public var additionalProperties: [String: JSONAny] = [:]

    enum CodingKeys: String, CodingKey {
        case type
    }

    private static let knownAdditionalPropertyKeys: Set<String> = ["type"]

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.type = try container.decode(String.self, forKey: .type)
        let additionalContainer = try decoder.container(keyedBy: JSONCodingKey.self)
        var extras: [String: JSONAny] = [:]
        for key in additionalContainer.allKeys where !Self.knownAdditionalPropertyKeys.contains(key.stringValue) {
            extras[key.stringValue] = try additionalContainer.decode(JSONAny.self, forKey: key)
        }
        self.additionalProperties = extras
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .type)
        var additionalContainer = encoder.container(keyedBy: JSONCodingKey.self)
        for key in additionalProperties.keys.sorted() where !Self.knownAdditionalPropertyKeys.contains(key) {
            try additionalContainer.encode(additionalProperties[key]!, forKey: JSONCodingKey(stringValue: key)!)
        }
    }
}

// MARK: PaymentCredential convenience initializers and mutators

public extension PaymentCredential {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PaymentCredential.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A durable business rule about the items in a response — return/refund terms, warranty,
/// and the like — at the time of purchase. Every policy carries a `type` (an open
/// reverse-DNS vocabulary) and a `description` so a platform can present it without
/// understanding its type-specific fields; type-specific fields (gated by `type`) add
/// structured context for platforms that model that type. Policies are reference data; the
/// obligation to display a term to the buyer is carried by a `messages[]` warning whose
/// `code` equals the policy `type` — see the Policies section of the specification.
// MARK: - Policy
public struct Policy: Codable, Sendable {
    /// RFC 9535 JSONPath expressions identifying the nodes this policy applies to, relative to
    /// the embedding response root (e.g., `$.line_items[0]` in cart/checkout, `$.products[2]` in
    /// catalog). Each target covers the node it names and everything nested under it, so a
    /// target on a product also covers its variants. A singular query (RFC 9535 Section 2.3.5.1;
    /// name and index selectors only) names a single node; filters, wildcards, and slices match
    /// a set. When omitted, the policy applies to the entire response. When policies of the same
    /// `type` contest a node, the narrowest target wins and overrides the rest. See the Policies
    /// section for how specificity resolves.
    public var appliesTo: [String]?
    /// Human-readable policy summary in one or more formats (plain, markdown, html). Required on
    /// every policy so a platform can present it without understanding any type-specific fields.
    /// This is not the buyer-facing disclosure — display is compelled by a `messages[]` warning
    /// (see the Policies section).
    public var description: Description
    /// Policy type discriminator. Open reverse-DNS vocabulary. Well-known values:
    /// `dev.ucp.shopping.policy.return` (return terms), `dev.ucp.shopping.policy.warranty`
    /// (warranty terms). Businesses MAY define custom types in their own domain (e.g.,
    /// `com.example.policy.price_match`). Platforms MUST tolerate unknown values.
    public var type: String
    /// Optional link to the full policy document.
    public var url: String?

    enum CodingKeys: String, CodingKey {
        case appliesTo = "applies_to"
        case description, type, url
    }

    public init(description: Description, type: String, configure: (inout Self) -> Void = { _ in }) {
        self.description = description
        self.type = type
        configure(&self)
    }

    public var additionalProperties: [String: JSONAny] = [:]

    private static let knownAdditionalPropertyKeys: Set<String> = ["applies_to", "description", "type", "url"]

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.appliesTo = try container.decodeIfPresent([String].self, forKey: .appliesTo)
        self.description = try container.decode(Description.self, forKey: .description)
        self.type = try container.decode(String.self, forKey: .type)
        self.url = try container.decodeIfPresent(String.self, forKey: .url)
        let additionalContainer = try decoder.container(keyedBy: JSONCodingKey.self)
        var extras: [String: JSONAny] = [:]
        for key in additionalContainer.allKeys where !Self.knownAdditionalPropertyKeys.contains(key.stringValue) {
            extras[key.stringValue] = try additionalContainer.decode(JSONAny.self, forKey: key)
        }
        self.additionalProperties = extras
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(appliesTo, forKey: .appliesTo)
        try container.encode(description, forKey: .description)
        try container.encode(type, forKey: .type)
        try container.encodeIfPresent(url, forKey: .url)
        var additionalContainer = encoder.container(keyedBy: JSONCodingKey.self)
        for key in additionalProperties.keys.sorted() where !Self.knownAdditionalPropertyKeys.contains(key) {
            try additionalContainer.encode(additionalProperties[key]!, forKey: JSONCodingKey(stringValue: key)!)
        }
    }
}

// MARK: Policy convenience initializers and mutators

public extension Policy {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Policy.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Environment data provided by the platform to support authorization and abuse prevention.
/// Values MUST NOT be buyer-asserted claims — platforms provide signals based on direct
/// observation or independently verifiable third-party attestations. All signal keys MUST
/// use reverse-domain naming to ensure provenance and prevent collisions when multiple
/// extensions contribute to the shared namespace.


/// Checkout state indicating the current phase and required processing. See Checkout Status
/// lifecycle documentation for state transition details.
public struct CheckoutStatus: RawRepresentable, Codable, Hashable, Sendable {
    public let rawValue: String

    /// Preserves the string, including values this protocol version doesn't define.
    /// This initializer never returns nil. Use `isKnown` to check for a named value.
    public init?(rawValue: String) {
        self.init(unchecked: rawValue)
    }

    private init(unchecked rawValue: String) {
        self.rawValue = rawValue
    }

    public static let canceled = CheckoutStatus(unchecked: "canceled")
    public static let completeInProgress = CheckoutStatus(unchecked: "complete_in_progress")
    public static let completed = CheckoutStatus(unchecked: "completed")
    public static let incomplete = CheckoutStatus(unchecked: "incomplete")
    public static let readyForComplete = CheckoutStatus(unchecked: "ready_for_complete")
    public static let requiresEscalation = CheckoutStatus(unchecked: "requires_escalation")

    /// Values defined by the pinned protocol version.
    static let knownValues: Set<String> = ["canceled", "complete_in_progress", "completed", "incomplete", "ready_for_complete", "requires_escalation"]

    /// Whether this protocol version defines a named constant for the value.
    public var isKnown: Bool { Self.knownValues.contains(rawValue) }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.init(unchecked: try container.decode(String.self))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

/// Different cart totals.
///
/// Pricing breakdown provided by the business. MUST contain exactly one subtotal and one
/// total entry. Detail types (tax, fee, discount, fulfillment) may appear multiple times for
/// itemization. Platforms MUST render all entries in order using display_text and amount.
///
/// A cost breakdown entry with a category, amount, and optional display text.
// MARK: - CheckoutTotal
public struct CheckoutTotal: Codable, Sendable {
    public var amount: Int
    /// Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
    /// 'Delivery').
    public var displayText: String?
    /// Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
    /// fee, total. Businesses MAY use additional values.
    public var type: String
    /// Optional itemized breakdown. The parent entry is always rendered; lines are
    /// supplementary. Sum of line amounts MUST equal the parent entry amount.
    public var lines: [Line]?

    enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
        case type, lines
    }

    public init(amount: Int, type: String, configure: (inout Self) -> Void = { _ in }) {
        self.amount = amount
        self.type = type
        configure(&self)
    }
}

// MARK: CheckoutTotal convenience initializers and mutators

public extension CheckoutTotal {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CheckoutTotal.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Sub-line entry. Additional metadata MAY be included.
// MARK: - Line
public struct Line: Codable, Sendable {
    public var amount: Int
    /// Human-readable label for this sub-line.
    public var displayText: String

    enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
    }

    public init(amount: Int, displayText: String, configure: (inout Self) -> Void = { _ in }) {
        self.amount = amount
        self.displayText = displayText
        configure(&self)
    }
}

// MARK: Line convenience initializers and mutators

public extension Line {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Line.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// UCP metadata for checkout responses.
///
/// Base UCP metadata with shared properties for all schema types.
// MARK: - UCPCheckoutResponseSchema
extension EmbeddedCheckoutProtocol {
    public struct UCPCheckoutResponseSchema: Codable, Sendable {
        /// Capability registry keyed by reverse-domain name.
        public var capabilities: [String: [CapabilityResponseSchema]]?
        /// Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
        /// (`services`, `capabilities`, and `payment_handlers`).
        public var mapOrder: [String: [String]]?
        /// Payment handler registry keyed by reverse-domain name.
        public var paymentHandlers: [String: [PaymentHandlerResponseSchema]]
        /// Service registry keyed by reverse-domain name.
        public var services: [String: [EmbeddedCheckoutProtocol.ServiceResponseSchema]]?
        /// Application-level status of the UCP operation.
        public var status: UCPCheckoutResponseSchemaStatus?
        public var version: String

        enum CodingKeys: String, CodingKey {
            case capabilities
            case mapOrder = "map_order"
            case paymentHandlers = "payment_handlers"
            case services, status, version
        }

        public init(paymentHandlers: [String: [PaymentHandlerResponseSchema]], version: String, configure: (inout Self) -> Void = { _ in }) {
            self.paymentHandlers = paymentHandlers
            self.version = version
            configure(&self)
        }
    }
}

// MARK: UCPCheckoutResponseSchema convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.UCPCheckoutResponseSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.UCPCheckoutResponseSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Capability reference in responses. Only name/version required to confirm active
/// capabilities.
///
/// Shared foundation for all UCP entities.
// MARK: - CapabilityResponseSchema
public struct CapabilityResponseSchema: Codable, Sendable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    public var config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    public var id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    public var schema: String?
    /// URL to human-readable specification document.
    public var spec: String?
    /// Entity version in YYYY-MM-DD format.
    public var version: String
    /// Parent capability(s) this extends. Present for extensions, absent for root capabilities.
    /// Use array for multi-parent extensions.
    public var extends: Extends?

    public init(version: String, configure: (inout Self) -> Void = { _ in }) {
        self.version = version
        configure(&self)
    }
}

// MARK: CapabilityResponseSchema convenience initializers and mutators

public extension CapabilityResponseSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CapabilityResponseSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Parent capability(s) this extends. Present for extensions, absent for root capabilities.
/// Use array for multi-parent extensions.
public enum Extends: Codable, Sendable {
    case string(String)
    case stringArray([String])

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode([String].self) {
            self = .stringArray(x)
            return
        }
        if let x = try? container.decode(String.self) {
            self = .string(x)
            return
        }
        throw DecodingError.typeMismatch(Extends.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for Extends"))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let x):
            try container.encode(x)
        case .stringArray(let x):
            try container.encode(x)
        }
    }
}

/// Handler reference in responses. May include full config state for runtime usage of the
/// handler.
///
/// Shared foundation for all UCP entities.
// MARK: - PaymentHandlerResponseSchema
public struct PaymentHandlerResponseSchema: Codable, Sendable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    public var config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    public var id: String
    /// URL to JSON Schema defining this entity's structure and payloads.
    public var schema: String?
    /// URL to human-readable specification document.
    public var spec: String?
    /// Entity version in YYYY-MM-DD format.
    public var version: String
    /// Instrument types this handler supports, with optional constraints. When absent, every
    /// instrument should be considered available.
    public var availableInstruments: [PaymentHandlerResponseSchemaAvailableInstrument]?

    enum CodingKeys: String, CodingKey {
        case config, id, schema, spec, version
        case availableInstruments = "available_instruments"
    }

    public init(id: String, version: String, configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.version = version
        configure(&self)
    }
}

// MARK: PaymentHandlerResponseSchema convenience initializers and mutators

public extension PaymentHandlerResponseSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PaymentHandlerResponseSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// An instrument type available from a payment handler with optional constraints.
// MARK: - PaymentHandlerResponseSchemaAvailableInstrument
public struct PaymentHandlerResponseSchemaAvailableInstrument: Codable, Sendable {
    /// A Constraint Expression describing the instrument this entry makes available. Keys in
    /// `properties` name members of the `constraint_target` declared by the instrument schema
    /// for this `type`. Requirements on submitted request data belong in
    /// `ucp.request_constraints` instead.
    public var constraints: ConstraintExpression?
    /// The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
    /// schema's type constant.
    public var type: String

    public init(type: String, configure: (inout Self) -> Void = { _ in }) {
        self.type = type
        configure(&self)
    }
}

// MARK: PaymentHandlerResponseSchemaAvailableInstrument convenience initializers and mutators

public extension PaymentHandlerResponseSchemaAvailableInstrument {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PaymentHandlerResponseSchemaAvailableInstrument.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A Constraint Expression describing the instrument this entry makes available. Keys in
/// `properties` name members of the `constraint_target` declared by the instrument schema
/// for this `type`. Requirements on submitted request data belong in
/// `ucp.request_constraints` instead.
///
/// A closed JSON Schema Draft 2020-12 constraint expression with Object and Value Constraint
/// positions.
///
/// A Value Constraint containing `enum`, `const`, or both.
// MARK: - ConstraintProperty
public struct ConstraintProperty: Codable, Sendable {
    /// Alternative Object Constraints. The constrained object must satisfy at least one. A
    /// branch must be non-empty: an empty branch is satisfied by every object and neutralizes
    /// the alternation.
    public var anyOf: [ConstraintExpression]?
    /// Constraints keyed by property name. Must be non-empty: an empty object applies no
    /// constraint.
    public var properties: [String: ConstraintProperty]?
    /// Property names required by the constrained object. Must be non-empty: an empty array
    /// applies no constraint.
    public var constraintPropertyRequired: [String]?
    public var const: JSONAny?
    /// A non-empty array of unique JSON values.
    public var constraintPropertyEnum: [JSONAny]?

    enum CodingKeys: String, CodingKey {
        case anyOf, properties
        case constraintPropertyRequired = "required"
        case const
        case constraintPropertyEnum = "enum"
    }

    public init(configure: (inout Self) -> Void = { _ in }) {
        configure(&self)
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.anyOf = try container.decodeIfPresent([ConstraintExpression].self, forKey: .anyOf)
        self.properties = try container.decodeIfPresent([String: ConstraintProperty].self, forKey: .properties)
        self.constraintPropertyRequired = try container.decodeIfPresent([String].self, forKey: .constraintPropertyRequired)
        self.const = container.contains(.const) ? try container.decode(JSONAny.self, forKey: .const) : nil
        self.constraintPropertyEnum = try container.decodeIfPresent([JSONAny].self, forKey: .constraintPropertyEnum)
    }
}

// MARK: ConstraintProperty convenience initializers and mutators

public extension ConstraintProperty {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ConstraintProperty.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A Constraint Expression describing the instrument this entry makes available. Keys in
/// `properties` name members of the `constraint_target` declared by the instrument schema
/// for this `type`. Requirements on submitted request data belong in
/// `ucp.request_constraints` instead.
///
/// A closed JSON Schema Draft 2020-12 constraint expression with Object and Value Constraint
/// positions.
// MARK: - ConstraintExpression
public struct ConstraintExpression: Codable, Sendable {
    /// Alternative Object Constraints. The constrained object must satisfy at least one. A
    /// branch must be non-empty: an empty branch is satisfied by every object and neutralizes
    /// the alternation.
    public var anyOf: [ConstraintExpression]?
    /// Constraints keyed by property name. Must be non-empty: an empty object applies no
    /// constraint.
    public var properties: [String: ConstraintProperty]?
    /// Property names required by the constrained object. Must be non-empty: an empty array
    /// applies no constraint.
    public var constraintExpressionRequired: [String]?

    enum CodingKeys: String, CodingKey {
        case anyOf, properties
        case constraintExpressionRequired = "required"
    }

    public init(configure: (inout Self) -> Void = { _ in }) {
        configure(&self)
    }
}

// MARK: ConstraintExpression convenience initializers and mutators

public extension ConstraintExpression {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ConstraintExpression.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Service binding in API responses. Includes per-resource transport configuration via typed
/// config.
///
/// Shared foundation for all UCP entities.
// MARK: - ServiceResponseSchema
extension EmbeddedCheckoutProtocol {
    public struct ServiceResponseSchema: Codable, Sendable {
        /// Entity-specific configuration. Structure defined by each entity's schema.
        public var config: EmbeddedCheckoutProtocol.EmbeddedTransportConfig?
        /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
        /// exist.
        public var id: String?
        /// URL to JSON Schema defining this entity's structure and payloads.
        public var schema: String?
        /// URL to human-readable specification document.
        public var spec: String?
        /// Entity version in YYYY-MM-DD format.
        public var version: String
        /// Endpoint URL for this transport binding.
        public var endpoint: String?
        /// Transport protocol for this service binding.
        public var transport: Transport

        public init(version: String, transport: Transport, configure: (inout Self) -> Void = { _ in }) {
            self.version = version
            self.transport = transport
            configure(&self)
        }
    }
}

// MARK: ServiceResponseSchema convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.ServiceResponseSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.ServiceResponseSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Entity-specific configuration. Structure defined by each entity's schema.
///
/// Per-session configuration for embedded transport binding. Allows businesses to vary EP
/// availability and delegations based on cart contents, agent authorization, or policy.
// MARK: - EmbeddedTransportConfig
extension EmbeddedCheckoutProtocol {
    public struct EmbeddedTransportConfig: Codable, Sendable {
        /// Color schemes the business supports. Hosts use ec_color_scheme query parameter to request
        /// a scheme from this list.
        public var colorScheme: [EmbeddedCheckoutProtocol.EmbeddedColorScheme]?
        /// Delegations the business allows. At service-level, declares available delegations. In UCP
        /// responses, confirms accepted delegations for this session.
        public var delegate: [String]?

        enum CodingKeys: String, CodingKey {
            case colorScheme = "color_scheme"
            case delegate
        }

        public init(configure: (inout Self) -> Void = { _ in }) {
            configure(&self)
        }
    }
}

// MARK: EmbeddedTransportConfig convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.EmbeddedTransportConfig {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.EmbeddedTransportConfig.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

extension EmbeddedCheckoutProtocol {
    public struct EmbeddedColorScheme: RawRepresentable, Codable, Hashable, Sendable {
        public let rawValue: String

        /// Preserves the string, including values this protocol version doesn't define.
        /// This initializer never returns nil. Use `isKnown` to check for a named value.
        public init?(rawValue: String) {
            self.init(unchecked: rawValue)
        }

        private init(unchecked rawValue: String) {
            self.rawValue = rawValue
        }

        public static let dark = EmbeddedColorScheme(unchecked: "dark")
        public static let light = EmbeddedColorScheme(unchecked: "light")

        /// Values defined by the pinned protocol version.
        static let knownValues: Set<String> = ["dark", "light"]

        /// Whether this protocol version defines a named constant for the value.
        public var isKnown: Bool { Self.knownValues.contains(rawValue) }

        public init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            self.init(unchecked: try container.decode(String.self))
        }

        public func encode(to encoder: Encoder) throws {
            var container = encoder.singleValueContainer()
            try container.encode(rawValue)
        }
    }
}

/// Transport protocol for this service binding.
public struct Transport: RawRepresentable, Codable, Hashable, Sendable {
    public let rawValue: String

    /// Preserves the string, including values this protocol version doesn't define.
    /// This initializer never returns nil. Use `isKnown` to check for a named value.
    public init?(rawValue: String) {
        self.init(unchecked: rawValue)
    }

    private init(unchecked rawValue: String) {
        self.rawValue = rawValue
    }

    public static let a2A = Transport(unchecked: "a2a")
    public static let embedded = Transport(unchecked: "embedded")
    public static let mcp = Transport(unchecked: "mcp")
    public static let rest = Transport(unchecked: "rest")

    /// Values defined by the pinned protocol version.
    static let knownValues: Set<String> = ["a2a", "embedded", "mcp", "rest"]

    /// Whether this protocol version defines a named constant for the value.
    public var isKnown: Bool { Self.knownValues.contains(rawValue) }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.init(unchecked: try container.decode(String.self))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

/// Application-level status of the UCP operation.
public struct UCPCheckoutResponseSchemaStatus: RawRepresentable, Codable, Hashable, Sendable {
    public let rawValue: String

    /// Preserves the string, including values this protocol version doesn't define.
    /// This initializer never returns nil. Use `isKnown` to check for a named value.
    public init?(rawValue: String) {
        self.init(unchecked: rawValue)
    }

    private init(unchecked rawValue: String) {
        self.rawValue = rawValue
    }

    public static let error = UCPCheckoutResponseSchemaStatus(unchecked: "error")
    public static let success = UCPCheckoutResponseSchemaStatus(unchecked: "success")

    /// Values defined by the pinned protocol version.
    static let knownValues: Set<String> = ["error", "success"]

    /// Whether this protocol version defines a named constant for the value.
    public var isKnown: Bool { Self.knownValues.contains(rawValue) }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.init(unchecked: try container.decode(String.self))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

/// Order schema with line items, buyer-facing fulfillment expectations, and event logs.
// MARK: - Order
public struct Order: Codable, Sendable {
    /// Post-order events (refunds, returns, credits, disputes, cancellations, etc.) that exist
    /// independently of fulfillment.
    public var adjustments: [Adjustment]?
    /// Snapshot of the attribution associated with the originating checkout. Read-only on the
    /// order.
    public var attribution: [String: String]?
    /// Associated checkout ID for reconciliation.
    public var checkoutID: String
    /// ISO 4217 currency code. MUST match the currency from the originating checkout session.
    public var currency: String
    /// Fulfillment data: buyer expectations and what actually happened.
    public var fulfillment: Fulfillment
    /// Unique order identifier.
    public var id: String
    /// Human-readable label for identifying the order. MUST only be provided by the business.
    public var label: String?
    /// Line items representing what was purchased — can change post-order via edits or exchanges.
    public var lineItems: [OrderLineItem]
    /// Business outcome messages (errors, warnings, informational). Present when the business
    /// needs to communicate status or issues to the platform.
    public var messages: [Message]?
    /// Permalink to access the order on merchant site.
    public var permalinkURL: String
    /// Snapshot of the policies that applied to the items at checkout, captured on the order as
    /// a durable record. `applies_to` targets are relative to the response root.
    public var policies: [Policy]?
    /// Different totals for the order.
    public var totals: [CheckoutTotal]
    public var ucp: UCPOrderResponseSchema

    enum CodingKeys: String, CodingKey {
        case adjustments, attribution
        case checkoutID = "checkout_id"
        case currency, fulfillment, id, label
        case lineItems = "line_items"
        case messages
        case permalinkURL = "permalink_url"
        case policies, totals, ucp
    }

    public init(checkoutID: String, currency: String, fulfillment: Fulfillment, id: String, lineItems: [OrderLineItem], permalinkURL: String, totals: [CheckoutTotal], ucp: UCPOrderResponseSchema, configure: (inout Self) -> Void = { _ in }) {
        self.checkoutID = checkoutID
        self.currency = currency
        self.fulfillment = fulfillment
        self.id = id
        self.lineItems = lineItems
        self.permalinkURL = permalinkURL
        self.totals = totals
        self.ucp = ucp
        configure(&self)
    }
}

// MARK: Order convenience initializers and mutators

public extension Order {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Order.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Post-order event that exists independently of fulfillment. Typically represents money
/// movements but can be any post-order change. Polymorphic type that can optionally
/// reference line items.
// MARK: - Adjustment
public struct Adjustment: Codable, Sendable {
    /// Human-readable reason or description (e.g., 'Defective item', 'Customer requested').
    public var description: String?
    /// Adjustment event identifier.
    public var id: String
    /// Which line items and quantities are affected (optional).
    public var lineItems: [AdjustmentLineItem]?
    /// RFC 3339 timestamp when this adjustment occurred.
    public var occurredAt: Date
    /// Adjustment status.
    public var status: AdjustmentStatus
    /// Adjustment totals breakdown. Signed values - negative for money returned to buyer
    /// (refunds, credits), positive for additional charges (exchanges).
    public var totals: [LineItemTotal]?
    /// Type of adjustment (open string). Typically money-related like: refund, return, credit,
    /// price_adjustment, dispute, cancellation. Can be any value that makes sense for the
    /// merchant's business.
    public var type: String

    enum CodingKeys: String, CodingKey {
        case description, id
        case lineItems = "line_items"
        case occurredAt = "occurred_at"
        case status, totals, type
    }

    public init(id: String, occurredAt: Date, status: AdjustmentStatus, type: String, configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.occurredAt = occurredAt
        self.status = status
        self.type = type
        configure(&self)
    }
}

// MARK: Adjustment convenience initializers and mutators

public extension Adjustment {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Adjustment.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - AdjustmentLineItem
public struct AdjustmentLineItem: Codable, Sendable {
    /// Line item ID reference.
    public var id: String
    /// The settled measurement this adjustment reconciles (for example, actual picked weight),
    /// present when the line's price settles by measurement. Its unit identity MUST match the
    /// line's pricing basis (`item.unit_price` measure/reference unit); no unit conversion. A
    /// pure price settlement uses `quantity: 0` together with `measure` and a totals delta.
    public var measure: Measure?
    /// Signed integer count of steps of the referenced line item's `quantity_unit` (`10^-scale`
    /// × `unit`); when `quantity_unit` is absent, it counts whole items (`each`). Negative
    /// values represent reductions (e.g. returns); positive values represent additions (e.g.
    /// exchanges).
    public var quantity: Int

    public init(id: String, quantity: Int, configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.quantity = quantity
        configure(&self)
    }
}

// MARK: AdjustmentLineItem convenience initializers and mutators

public extension AdjustmentLineItem {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(AdjustmentLineItem.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Adjustment status.
public struct AdjustmentStatus: RawRepresentable, Codable, Hashable, Sendable {
    public let rawValue: String

    /// Preserves the string, including values this protocol version doesn't define.
    /// This initializer never returns nil. Use `isKnown` to check for a named value.
    public init?(rawValue: String) {
        self.init(unchecked: rawValue)
    }

    private init(unchecked rawValue: String) {
        self.rawValue = rawValue
    }

    public static let completed = AdjustmentStatus(unchecked: "completed")
    public static let failed = AdjustmentStatus(unchecked: "failed")
    public static let pending = AdjustmentStatus(unchecked: "pending")

    /// Values defined by the pinned protocol version.
    static let knownValues: Set<String> = ["completed", "failed", "pending"]

    /// Whether this protocol version defines a named constant for the value.
    public var isKnown: Bool { Self.knownValues.contains(rawValue) }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.init(unchecked: try container.decode(String.self))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

/// Fulfillment data: buyer expectations and what actually happened.
// MARK: - Fulfillment
public struct Fulfillment: Codable, Sendable {
    /// Append-only event log of actual shipments. Each event references line items by ID.
    public var events: [FulfillmentEvent]?
    /// Buyer-facing groups representing when/how items will be delivered. Can be split, merged,
    /// or adjusted post-order.
    public var expectations: [Expectation]?

    public init(configure: (inout Self) -> Void = { _ in }) {
        configure(&self)
    }
}

// MARK: Fulfillment convenience initializers and mutators

public extension Fulfillment {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Fulfillment.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Append-only fulfillment event representing an actual shipment. References line items by
/// ID.
// MARK: - FulfillmentEvent
public struct FulfillmentEvent: Codable, Sendable {
    /// Carrier name (e.g., 'FedEx', 'USPS').
    public var carrier: String?
    /// Human-readable description of the shipment status or delivery information (e.g.,
    /// 'Delivered to front door', 'Out for delivery').
    public var description: String?
    /// Fulfillment event identifier.
    public var id: String
    /// Which line items and quantities are fulfilled in this event.
    public var lineItems: [EventLineItem]
    /// RFC 3339 timestamp when this fulfillment event occurred.
    public var occurredAt: Date
    /// Carrier tracking number (required if type != processing).
    public var trackingNumber: String?
    /// URL to track this shipment (required if type != processing).
    public var trackingURL: String?
    /// Fulfillment event type. Common values include: processing (preparing to ship), shipped
    /// (handed to carrier), in_transit (in delivery network), delivered (received by buyer),
    /// failed_attempt (delivery attempt failed), canceled (fulfillment canceled), undeliverable
    /// (cannot be delivered), returned_to_sender (returned to merchant).
    public var type: String

    enum CodingKeys: String, CodingKey {
        case carrier, description, id
        case lineItems = "line_items"
        case occurredAt = "occurred_at"
        case trackingNumber = "tracking_number"
        case trackingURL = "tracking_url"
        case type
    }

    public init(id: String, lineItems: [EventLineItem], occurredAt: Date, type: String, configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.lineItems = lineItems
        self.occurredAt = occurredAt
        self.type = type
        configure(&self)
    }
}

// MARK: FulfillmentEvent convenience initializers and mutators

public extension FulfillmentEvent {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FulfillmentEvent.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - EventLineItem
public struct EventLineItem: Codable, Sendable {
    /// Line item ID reference.
    public var id: String
    /// Integer count of steps of the referenced line item's `quantity_unit` (`10^-scale` ×
    /// `unit`); when `quantity_unit` is absent, it counts whole items (`each`).
    public var quantity: Int

    public init(id: String, quantity: Int, configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.quantity = quantity
        configure(&self)
    }
}

// MARK: EventLineItem convenience initializers and mutators

public extension EventLineItem {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EventLineItem.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Buyer-facing fulfillment expectation representing logical groupings of items (e.g.,
/// 'package'). Can be split, merged, or adjusted post-order to set buyer expectations for
/// when/how items arrive.
// MARK: - Expectation
public struct Expectation: Codable, Sendable {
    /// Human-readable delivery description (e.g., 'Arrives in 5-8 business days').
    public var description: String?
    /// Delivery destination address.
    public var destination: PostalAddress
    /// When this expectation can be fulfilled: 'now' or ISO 8601 timestamp for future date
    /// (backorder, pre-order).
    public var fulfillableOn: String?
    /// Expectation identifier.
    public var id: String
    /// Which line items and quantities are in this expectation.
    public var lineItems: [ExpectationLineItem]
    /// Delivery method type. Well-known values: `shipping`, `pickup`, `digital`; additional
    /// values MAY be used.
    public var methodType: String

    enum CodingKeys: String, CodingKey {
        case description, destination
        case fulfillableOn = "fulfillable_on"
        case id
        case lineItems = "line_items"
        case methodType = "method_type"
    }

    public init(destination: PostalAddress, id: String, lineItems: [ExpectationLineItem], methodType: String, configure: (inout Self) -> Void = { _ in }) {
        self.destination = destination
        self.id = id
        self.lineItems = lineItems
        self.methodType = methodType
        configure(&self)
    }
}

// MARK: Expectation convenience initializers and mutators

public extension Expectation {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Expectation.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - ExpectationLineItem
public struct ExpectationLineItem: Codable, Sendable {
    /// Line item ID reference.
    public var id: String
    /// Integer count of steps of the referenced line item's `quantity_unit` (`10^-scale` ×
    /// `unit`); when `quantity_unit` is absent, it counts whole items (`each`).
    public var quantity: Int

    public init(id: String, quantity: Int, configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.quantity = quantity
        configure(&self)
    }
}

// MARK: ExpectationLineItem convenience initializers and mutators

public extension ExpectationLineItem {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ExpectationLineItem.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - OrderLineItem
public struct OrderLineItem: Codable, Sendable {
    /// Line item identifier.
    public var id: String
    /// Purchased item data, including identity, price, and sale basis.
    public var item: Item
    /// Parent line item identifier for any nested structures.
    public var parentID: String?
    /// Tracks the line item's original, current active, and fulfilled quantities. All three
    /// values use the same inherited `item.quantity_unit`. When `item.quantity_unit` is absent
    /// on an authoritative order response, each step is one whole item (`each`) under the shared
    /// default.
    public var quantity: LineItemQuantity
    /// Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
    /// quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
    /// quantity.fulfilled > 0, otherwise processing.
    public var status: LineItemStatus
    /// Line item totals breakdown.
    public var totals: [LineItemTotal]

    enum CodingKeys: String, CodingKey {
        case id, item
        case parentID = "parent_id"
        case quantity, status, totals
    }

    public init(id: String, item: Item, quantity: LineItemQuantity, status: LineItemStatus, totals: [LineItemTotal], configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        self.item = item
        self.quantity = quantity
        self.status = status
        self.totals = totals
        configure(&self)
    }
}

// MARK: OrderLineItem convenience initializers and mutators

public extension OrderLineItem {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(OrderLineItem.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Tracks the line item's original, current active, and fulfilled quantities. All three
/// values use the same inherited `item.quantity_unit`. When `item.quantity_unit` is absent
/// on an authoritative order response, each step is one whole item (`each`) under the shared
/// default.
// MARK: - LineItemQuantity
public struct LineItemQuantity: Codable, Sendable {
    /// Quantity fulfilled so far, expressed as an integer step count.
    public var fulfilled: Int
    /// Quantity from the original checkout, expressed as an integer step count.
    public var original: Int?
    /// Current active quantity after returns, cancellations, or other order changes, expressed
    /// as an integer step count.
    public var total: Int

    public init(fulfilled: Int, total: Int, configure: (inout Self) -> Void = { _ in }) {
        self.fulfilled = fulfilled
        self.total = total
        configure(&self)
    }
}

// MARK: LineItemQuantity convenience initializers and mutators

public extension LineItemQuantity {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(LineItemQuantity.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
/// quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
/// quantity.fulfilled > 0, otherwise processing.
public struct LineItemStatus: RawRepresentable, Codable, Hashable, Sendable {
    public let rawValue: String

    /// Preserves the string, including values this protocol version doesn't define.
    /// This initializer never returns nil. Use `isKnown` to check for a named value.
    public init?(rawValue: String) {
        self.init(unchecked: rawValue)
    }

    private init(unchecked rawValue: String) {
        self.rawValue = rawValue
    }

    public static let fulfilled = LineItemStatus(unchecked: "fulfilled")
    public static let partial = LineItemStatus(unchecked: "partial")
    public static let processing = LineItemStatus(unchecked: "processing")
    public static let removed = LineItemStatus(unchecked: "removed")

    /// Values defined by the pinned protocol version.
    static let knownValues: Set<String> = ["fulfilled", "partial", "processing", "removed"]

    /// Whether this protocol version defines a named constant for the value.
    public var isKnown: Bool { Self.knownValues.contains(rawValue) }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.init(unchecked: try container.decode(String.self))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

/// UCP metadata for order responses. No payment handlers needed post-purchase.
///
/// Base UCP metadata with shared properties for all schema types.
// MARK: - UCPOrderResponseSchema
public struct UCPOrderResponseSchema: Codable, Sendable {
    /// Capability registry keyed by reverse-domain name.
    public var capabilities: [String: [CapabilityResponseSchema]]?
    /// Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
    /// (`services`, `capabilities`, and `payment_handlers`).
    public var mapOrder: [String: [String]]?
    /// Payment handler registry keyed by reverse-domain name.
    public var paymentHandlers: [String: [PaymentHandlerResponseSchema]]?
    /// Service registry keyed by reverse-domain name.
    public var services: [String: [Service]]?
    /// Application-level status of the UCP operation.
    public var status: UCPCheckoutResponseSchemaStatus?
    public var version: String

    enum CodingKeys: String, CodingKey {
        case capabilities
        case mapOrder = "map_order"
        case paymentHandlers = "payment_handlers"
        case services, status, version
    }

    public init(version: String, configure: (inout Self) -> Void = { _ in }) {
        self.version = version
        configure(&self)
    }
}

// MARK: UCPOrderResponseSchema convenience initializers and mutators

public extension UCPOrderResponseSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(UCPOrderResponseSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Shared foundation for all UCP entities.
// MARK: - Service
public struct Service: Codable, Sendable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    public var config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    public var id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    public var schema: String?
    /// URL to human-readable specification document.
    public var spec: String?
    /// Entity version in YYYY-MM-DD format.
    public var version: String
    /// Endpoint URL for this transport binding.
    public var endpoint: String?
    /// Transport protocol for this service binding.
    public var transport: Transport

    public init(version: String, transport: Transport, configure: (inout Self) -> Void = { _ in }) {
        self.version = version
        self.transport = transport
        configure(&self)
    }
}

// MARK: Service convenience initializers and mutators

public extension Service {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Service.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Generic error response when business logic prevents resource creation or failed to
/// retrieve resource. Used when no valid resource can be established.
// MARK: - ErrorResponse
extension EmbeddedCheckoutProtocol {
    public struct ErrorResponse: Codable, Sendable {
        /// URL for buyer handoff or session recovery.
        public var continueURL: String?
        /// Array of messages describing why the operation failed.
        public var messages: [Message]
        /// UCP protocol metadata. Status MUST be 'error' for error response.
        public var ucp: EmbeddedCheckoutProtocol.ErrorResponseUcp

        enum CodingKeys: String, CodingKey {
            case continueURL = "continue_url"
            case messages, ucp
        }

        public init(messages: [Message], ucp: EmbeddedCheckoutProtocol.ErrorResponseUcp, configure: (inout Self) -> Void = { _ in }) {
            self.messages = messages
            self.ucp = ucp
            configure(&self)
        }
    }
}

// MARK: ErrorResponse convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.ErrorResponse {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.ErrorResponse.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// UCP protocol metadata. Status MUST be 'error' for error response.
///
/// UCP metadata with status 'error'. Use for response branches that carry error
/// information.
///
/// Base UCP metadata with shared properties for all schema types.
// MARK: - ErrorResponseUcp
extension EmbeddedCheckoutProtocol {
    public struct ErrorResponseUcp: Codable, Sendable {
        /// Capability registry keyed by reverse-domain name.
        public var capabilities: [String: [CapabilityResponseSchema]]?
        /// Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
        /// (`services`, `capabilities`, and `payment_handlers`).
        public var mapOrder: [String: [String]]?
        /// Payment handler registry keyed by reverse-domain name.
        public var paymentHandlers: [String: [PaymentHandlerResponseSchema]]?
        /// Service registry keyed by reverse-domain name.
        public var services: [String: [Service]]?
        /// Application-level status of the UCP operation.
        public var status: EmbeddedCheckoutProtocol.ErrorStatus
        public var version: String

        enum CodingKeys: String, CodingKey {
            case capabilities
            case mapOrder = "map_order"
            case paymentHandlers = "payment_handlers"
            case services, status, version
        }

        public init(status: EmbeddedCheckoutProtocol.ErrorStatus, version: String, configure: (inout Self) -> Void = { _ in }) {
            self.status = status
            self.version = version
            configure(&self)
        }
    }
}

// MARK: ErrorResponseUcp convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.ErrorResponseUcp {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.ErrorResponseUcp.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Application-level status of the UCP operation.
extension EmbeddedCheckoutProtocol {
    public struct ErrorStatus: RawRepresentable, Codable, Hashable, Sendable {
        public let rawValue: String

        /// Preserves the string, including values this protocol version doesn't define.
        /// This initializer never returns nil. Use `isKnown` to check for a named value.
        public init?(rawValue: String) {
            self.init(unchecked: rawValue)
        }

        private init(unchecked rawValue: String) {
            self.rawValue = rawValue
        }

        public static let error = ErrorStatus(unchecked: "error")

        /// Values defined by the pinned protocol version.
        static let knownValues: Set<String> = ["error"]

        /// Whether this protocol version defines a named constant for the value.
        public var isKnown: Bool { Self.knownValues.contains(rawValue) }

        public init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            self.init(unchecked: try container.decode(String.self))
        }

        public func encode(to encoder: Encoder) throws {
            var container = encoder.singleValueContainer()
            try container.encode(rawValue)
        }
    }
}

/// Checkout state after instrument selection.
///
/// Generic error response when business logic prevents resource creation or failed to
/// retrieve resource. Used when no valid resource can be established.
// MARK: - InstrumentsChangeResult
extension EmbeddedCheckoutProtocol {
    public struct InstrumentsChangeResult: Codable, Sendable {
        /// Partial checkout update with payment instrument selection.
        public var checkout: EmbeddedCheckoutProtocol.InstrumentsChangeCheckout?
        /// UCP protocol metadata. Status MUST be 'error' for error response.
        public var ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp
        /// URL for buyer handoff or session recovery.
        public var continueURL: String?
        /// Array of messages describing why the operation failed.
        public var messages: [Message]?

        enum CodingKeys: String, CodingKey {
            case checkout, ucp
            case continueURL = "continue_url"
            case messages
        }

        public init(ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp, configure: (inout Self) -> Void = { _ in }) {
            self.ucp = ucp
            configure(&self)
        }
    }
}

// MARK: InstrumentsChangeResult convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.InstrumentsChangeResult {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.InstrumentsChangeResult.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Partial checkout update with payment instrument selection.
// MARK: - InstrumentsChangeCheckout
extension EmbeddedCheckoutProtocol {
    public struct InstrumentsChangeCheckout: Codable, Sendable {
        /// Payment instruments with selected instrument ID.
        public var payment: EmbeddedCheckoutProtocol.InstrumentsChangePayment?

        public init(configure: (inout Self) -> Void = { _ in }) {
            configure(&self)
        }
    }
}

// MARK: InstrumentsChangeCheckout convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.InstrumentsChangeCheckout {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.InstrumentsChangeCheckout.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Payment instruments with selected instrument ID.
///
/// Payment configuration containing handlers.
// MARK: - InstrumentsChangePayment
extension EmbeddedCheckoutProtocol {
    public struct InstrumentsChangePayment: Codable, Sendable {
        /// The payment instruments available for this payment. Each instrument is associated with a
        /// specific handler via the handler_id field. Handlers can extend the base
        /// payment_instrument schema to add handler-specific fields.
        public var instruments: [SelectedPaymentInstrument]?
        /// ID of the selected payment instrument.
        public var selectedInstrumentID: String?

        enum CodingKeys: String, CodingKey {
            case instruments
            case selectedInstrumentID = "selected_instrument_id"
        }

        public init(configure: (inout Self) -> Void = { _ in }) {
            configure(&self)
        }
    }
}

// MARK: InstrumentsChangePayment convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.InstrumentsChangePayment {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.InstrumentsChangePayment.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// UCP metadata with status 'success'. Use for response branches that carry the expected
/// payload.
///
/// Base UCP metadata with shared properties for all schema types.
///
/// UCP protocol metadata. Status MUST be 'error' for error response.
///
/// UCP metadata with status 'error'. Use for response branches that carry error information.
// MARK: - InstrumentsChangeResultUcp
extension EmbeddedCheckoutProtocol {
    public struct InstrumentsChangeResultUcp: Codable, Sendable {
        /// Capability registry keyed by reverse-domain name.
        public var capabilities: [String: [EmbeddedCheckoutProtocol.CapabilityElement]]?
        /// Preferred key-traversal order for sibling registry fields inside the root `ucp` envelope
        /// (`services`, `capabilities`, and `payment_handlers`).
        public var mapOrder: [String: [String]]?
        /// Payment handler registry keyed by reverse-domain name.
        public var paymentHandlers: [String: [EmbeddedCheckoutProtocol.PaymentHandlerElement]]?
        /// Service registry keyed by reverse-domain name.
        public var services: [String: [EmbeddedCheckoutProtocol.EmbeddedService]]?
        /// Application-level status of the UCP operation.
        public var status: UCPCheckoutResponseSchemaStatus
        public var version: String

        enum CodingKeys: String, CodingKey {
            case capabilities
            case mapOrder = "map_order"
            case paymentHandlers = "payment_handlers"
            case services, status, version
        }

        public init(status: UCPCheckoutResponseSchemaStatus, version: String, configure: (inout Self) -> Void = { _ in }) {
            self.status = status
            self.version = version
            configure(&self)
        }
    }
}

// MARK: InstrumentsChangeResultUcp convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Shared foundation for all UCP entities.
///
/// Capability reference in responses. Only name/version required to confirm active
/// capabilities.
// MARK: - CapabilityElement
extension EmbeddedCheckoutProtocol {
    public struct CapabilityElement: Codable, Sendable {
        /// Entity-specific configuration. Structure defined by each entity's schema.
        public var config: [String: JSONAny]?
        /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
        /// exist.
        public var id: String?
        /// URL to JSON Schema defining this entity's structure and payloads.
        public var schema: String?
        /// URL to human-readable specification document.
        public var spec: String?
        /// Entity version in YYYY-MM-DD format.
        public var version: String
        /// Parent capability(s) this extends. Present for extensions, absent for root capabilities.
        /// Use array for multi-parent extensions.
        public var extends: Extends?

        public init(version: String, configure: (inout Self) -> Void = { _ in }) {
            self.version = version
            configure(&self)
        }
    }
}

// MARK: CapabilityElement convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.CapabilityElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.CapabilityElement.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Shared foundation for all UCP entities.
///
/// Handler reference in responses. May include full config state for runtime usage of the
/// handler.
// MARK: - PaymentHandlerElement
extension EmbeddedCheckoutProtocol {
    public struct PaymentHandlerElement: Codable, Sendable {
        /// Entity-specific configuration. Structure defined by each entity's schema.
        public var config: [String: JSONAny]?
        /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
        /// exist.
        public var id: String
        /// URL to JSON Schema defining this entity's structure and payloads.
        public var schema: String?
        /// URL to human-readable specification document.
        public var spec: String?
        /// Entity version in YYYY-MM-DD format.
        public var version: String
        /// Instrument types this handler supports, with optional constraints. When absent, every
        /// instrument should be considered available.
        public var availableInstruments: [EmbeddedCheckoutProtocol.PaymentHandlerAvailableInstrument]?

        enum CodingKeys: String, CodingKey {
            case config, id, schema, spec, version
            case availableInstruments = "available_instruments"
        }

        public init(id: String, version: String, configure: (inout Self) -> Void = { _ in }) {
            self.id = id
            self.version = version
            configure(&self)
        }
    }
}

// MARK: PaymentHandlerElement convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.PaymentHandlerElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.PaymentHandlerElement.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// An instrument type available from a payment handler with optional constraints.
// MARK: - PaymentHandlerAvailableInstrument
extension EmbeddedCheckoutProtocol {
    public struct PaymentHandlerAvailableInstrument: Codable, Sendable {
        /// A Constraint Expression describing the instrument this entry makes available. Keys in
        /// `properties` name members of the `constraint_target` declared by the instrument schema
        /// for this `type`. Requirements on submitted request data belong in
        /// `ucp.request_constraints` instead.
        public var constraints: ConstraintExpression?
        /// The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
        /// schema's type constant.
        public var type: String

        public init(type: String, configure: (inout Self) -> Void = { _ in }) {
            self.type = type
            configure(&self)
        }
    }
}

// MARK: PaymentHandlerAvailableInstrument convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.PaymentHandlerAvailableInstrument {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.PaymentHandlerAvailableInstrument.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Shared foundation for all UCP entities.
// MARK: - EmbeddedService
extension EmbeddedCheckoutProtocol {
    public struct EmbeddedService: Codable, Sendable {
        /// Entity-specific configuration. Structure defined by each entity's schema.
        public var config: [String: JSONAny]?
        /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
        /// exist.
        public var id: String?
        /// URL to JSON Schema defining this entity's structure and payloads.
        public var schema: String?
        /// URL to human-readable specification document.
        public var spec: String?
        /// Entity version in YYYY-MM-DD format.
        public var version: String
        /// Endpoint URL for this transport binding.
        public var endpoint: String?
        /// Transport protocol for this service binding.
        public var transport: Transport

        public init(version: String, transport: Transport, configure: (inout Self) -> Void = { _ in }) {
            self.version = version
            self.transport = transport
            configure(&self)
        }
    }
}

// MARK: EmbeddedService convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.EmbeddedService {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.EmbeddedService.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Checkout state with payment credential ready for completion.
///
/// Generic error response when business logic prevents resource creation or failed to
/// retrieve resource. Used when no valid resource can be established.
// MARK: - CredentialResult
extension EmbeddedCheckoutProtocol {
    public struct CredentialResult: Codable, Sendable {
        /// Partial checkout update with payment credential.
        public var checkout: EmbeddedCheckoutProtocol.CredentialCheckout?
        /// UCP protocol metadata. Status MUST be 'error' for error response.
        public var ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp
        /// URL for buyer handoff or session recovery.
        public var continueURL: String?
        /// Array of messages describing why the operation failed.
        public var messages: [Message]?

        enum CodingKeys: String, CodingKey {
            case checkout, ucp
            case continueURL = "continue_url"
            case messages
        }

        public init(ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp, configure: (inout Self) -> Void = { _ in }) {
            self.ucp = ucp
            configure(&self)
        }
    }
}

// MARK: CredentialResult convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.CredentialResult {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.CredentialResult.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Partial checkout update with payment credential.
// MARK: - CredentialCheckout
extension EmbeddedCheckoutProtocol {
    public struct CredentialCheckout: Codable, Sendable {
        public var payment: Payment?

        public init(configure: (inout Self) -> Void = { _ in }) {
            configure(&self)
        }
    }
}

// MARK: CredentialCheckout convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.CredentialCheckout {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.CredentialCheckout.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Checkout state after address selection.
///
/// Generic error response when business logic prevents resource creation or failed to
/// retrieve resource. Used when no valid resource can be established.
// MARK: - AddressChangeResult
extension EmbeddedCheckoutProtocol {
    public struct AddressChangeResult: Codable, Sendable {
        /// Partial checkout update with fulfillment address selection.
        public var checkout: EmbeddedCheckoutProtocol.AddressChangeCheckout?
        /// UCP protocol metadata. Status MUST be 'error' for error response.
        public var ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp
        /// URL for buyer handoff or session recovery.
        public var continueURL: String?
        /// Array of messages describing why the operation failed.
        public var messages: [Message]?

        enum CodingKeys: String, CodingKey {
            case checkout, ucp
            case continueURL = "continue_url"
            case messages
        }

        public init(ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp, configure: (inout Self) -> Void = { _ in }) {
            self.ucp = ucp
            configure(&self)
        }
    }
}

// MARK: AddressChangeResult convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.AddressChangeResult {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.AddressChangeResult.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Partial checkout update with fulfillment address selection.
// MARK: - AddressChangeCheckout
extension EmbeddedCheckoutProtocol {
    public struct AddressChangeCheckout: Codable, Sendable {
        /// Updated fulfillment with new selected destination and destinations.
        public var fulfillment: EmbeddedCheckoutProtocol.CheckoutFulfillmentClass?

        public init(configure: (inout Self) -> Void = { _ in }) {
            configure(&self)
        }
    }
}

// MARK: AddressChangeCheckout convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.AddressChangeCheckout {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.AddressChangeCheckout.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Updated fulfillment with new selected destination and destinations.
///
/// Container for fulfillment methods and availability.
// MARK: - CheckoutFulfillmentClass
extension EmbeddedCheckoutProtocol {
    public struct CheckoutFulfillmentClass: Codable, Sendable {
        /// Inventory availability hints.
        public var availableMethods: [FulfillmentAvailableMethod]?
        /// Fulfillment methods for cart items.
        public var methods: [FulfillmentMethod]?

        enum CodingKeys: String, CodingKey {
            case availableMethods = "available_methods"
            case methods
        }

        public init(configure: (inout Self) -> Void = { _ in }) {
            configure(&self)
        }
    }
}

// MARK: CheckoutFulfillmentClass convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.CheckoutFulfillmentClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.CheckoutFulfillmentClass.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - ReadyRequest
extension EmbeddedCheckoutProtocol {
    public struct ReadyRequest: Codable, Sendable {
        public var auth: EmbeddedCheckoutProtocol.Auth?
        /// Delegation types the merchant accepts. Must be subset of checkout.embedded.delegations.
        public var delegate: [String]

        public init(delegate: [String], configure: (inout Self) -> Void = { _ in }) {
            self.delegate = delegate
            configure(&self)
        }
    }
}

// MARK: ReadyRequest convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.ReadyRequest {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.ReadyRequest.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - Auth
extension EmbeddedCheckoutProtocol {
    public struct Auth: Codable, Sendable {
        public var type: String?

        public init(configure: (inout Self) -> Void = { _ in }) {
            configure(&self)
        }
    }
}

// MARK: Auth convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.Auth {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.Auth.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Handshake response from host.
///
/// Generic error response when business logic prevents resource creation or failed to
/// retrieve resource. Used when no valid resource can be established.
// MARK: - ReadyResult
extension EmbeddedCheckoutProtocol {
    public struct ReadyResult: Codable, Sendable {
        /// Initial delegation state from host. Fields are permitted only when the corresponding
        /// delegation is accepted.
        public var checkout: EmbeddedCheckoutProtocol.ReadyCheckout?
        /// Requested authorization. Some common examples include API key and OAuth token.
        public var credential: String?
        /// UCP protocol metadata. Status MUST be 'error' for error response.
        public var ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp
        /// Channel upgrade instructions. If present, switch to provided MessagePort.
        public var upgrade: EmbeddedCheckoutProtocol.Upgrade?
        /// URL for buyer handoff or session recovery.
        public var continueURL: String?
        /// Array of messages describing why the operation failed.
        public var messages: [Message]?

        enum CodingKeys: String, CodingKey {
            case checkout, credential, ucp, upgrade
            case continueURL = "continue_url"
            case messages
        }

        public init(ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp, configure: (inout Self) -> Void = { _ in }) {
            self.ucp = ucp
            configure(&self)
        }
    }
}

// MARK: ReadyResult convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.ReadyResult {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.ReadyResult.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Initial delegation state from host. Fields are permitted only when the corresponding
/// delegation is accepted.
// MARK: - ReadyCheckout
extension EmbeddedCheckoutProtocol {
    public struct ReadyCheckout: Codable, Sendable {
        public var fulfillment: EmbeddedCheckoutProtocol.CheckoutFulfillmentClass?
        /// Payment instruments with selected instrument ID.
        public var payment: EmbeddedCheckoutProtocol.ReadyPayment?

        public init(configure: (inout Self) -> Void = { _ in }) {
            configure(&self)
        }
    }
}

// MARK: ReadyCheckout convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.ReadyCheckout {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.ReadyCheckout.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Payment instruments with selected instrument ID.
///
/// Payment configuration containing handlers.
// MARK: - ReadyPayment
extension EmbeddedCheckoutProtocol {
    public struct ReadyPayment: Codable, Sendable {
        /// The payment instruments available for this payment. Each instrument is associated with a
        /// specific handler via the handler_id field. Handlers can extend the base
        /// payment_instrument schema to add handler-specific fields.
        public var instruments: [SelectedPaymentInstrument]?
        /// ID of the selected payment instrument.
        public var selectedInstrumentID: String?

        enum CodingKeys: String, CodingKey {
            case instruments
            case selectedInstrumentID = "selected_instrument_id"
        }

        public init(configure: (inout Self) -> Void = { _ in }) {
            configure(&self)
        }
    }
}

// MARK: ReadyPayment convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.ReadyPayment {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.ReadyPayment.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Channel upgrade instructions. If present, switch to provided MessagePort.
// MARK: - Upgrade
extension EmbeddedCheckoutProtocol {
    public struct Upgrade: Codable, Sendable {
        /// MessagePort for upgraded channel. Runtime type is MessagePort.
        public var port: [String: JSONAny]?

        public init(configure: (inout Self) -> Void = { _ in }) {
            configure(&self)
        }
    }
}

// MARK: Upgrade convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.Upgrade {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.Upgrade.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - AuthRequest
extension EmbeddedCheckoutProtocol {
    public struct AuthRequest: Codable, Sendable {
        public var type: String?

        public init(configure: (inout Self) -> Void = { _ in }) {
            configure(&self)
        }
    }
}

// MARK: AuthRequest convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.AuthRequest {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.AuthRequest.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Auth response from host containing the requested authorization data.
///
/// Generic error response when business logic prevents resource creation or failed to
/// retrieve resource. Used when no valid resource can be established.
// MARK: - AuthResult
extension EmbeddedCheckoutProtocol {
    public struct AuthResult: Codable, Sendable {
        /// Requested authorization. Some common examples include API key and OAuth token.
        public var credential: String?
        /// UCP protocol metadata. Status MUST be 'error' for error response.
        public var ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp
        /// URL for buyer handoff or session recovery.
        public var continueURL: String?
        /// Array of messages describing why the operation failed.
        public var messages: [Message]?

        enum CodingKeys: String, CodingKey {
            case credential, ucp
            case continueURL = "continue_url"
            case messages
        }

        public init(ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp, configure: (inout Self) -> Void = { _ in }) {
            self.ucp = ucp
            configure(&self)
        }
    }
}

// MARK: AuthResult convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.AuthResult {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.AuthResult.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - WindowOpenRequest
extension EmbeddedCheckoutProtocol {
    public struct WindowOpenRequest: Codable, Sendable {
        /// The URL of the resource to present.
        public var url: String

        public init(url: String, configure: (inout Self) -> Void = { _ in }) {
            self.url = url
            configure(&self)
        }
    }
}

// MARK: WindowOpenRequest convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.WindowOpenRequest {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.WindowOpenRequest.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Acknowledgement that the host handled the request.
///
/// Generic error response when business logic prevents resource creation or failed to
/// retrieve resource. Used when no valid resource can be established.
// MARK: - WindowOpenResult
extension EmbeddedCheckoutProtocol {
    public struct WindowOpenResult: Codable, Sendable {
        /// UCP protocol metadata. Status MUST be 'error' for error response.
        public var ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp
        /// URL for buyer handoff or session recovery.
        public var continueURL: String?
        /// Array of messages describing why the operation failed.
        public var messages: [Message]?

        enum CodingKeys: String, CodingKey {
            case ucp
            case continueURL = "continue_url"
            case messages
        }

        public init(ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp, configure: (inout Self) -> Void = { _ in }) {
            self.ucp = ucp
            configure(&self)
        }
    }
}

// MARK: WindowOpenResult convenience initializers and mutators

public extension EmbeddedCheckoutProtocol.WindowOpenResult {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedCheckoutProtocol.WindowOpenResult.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    /// Returns a copy with `update` applied.
    func with(_ update: (inout Self) -> Void) -> Self {
        var copy = self
        update(&copy)
        return copy
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - Encode/decode helpers
// quicktype's encoder/decoder and JSONAny/JSONNull helper suffix is intentionally replaced here.
// See ../JSONCoding.swift and ../JSONAny.swift for the maintained Swift implementations.
