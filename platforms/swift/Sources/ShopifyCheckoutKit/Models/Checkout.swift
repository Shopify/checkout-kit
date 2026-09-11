#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Foundation

/// A checkout snapshot that excludes protocol metadata.
public struct Checkout: Codable, Sendable {
    public var additionalProperties: [String: JSONAny]
    public let attribution: [String: String]?
    public let buyer: Buyer?
    public let context: Context?
    public let continueURL: String?
    public let currency: String
    public let discounts: CheckoutDiscounts?
    public let expiresAt: Date?
    public let fulfillment: CheckoutFulfillment?
    public let id: String
    public let lineItems: [LineItem]
    public let links: [Link]
    public let messages: [Message]?
    public let order: OrderConfirmation?
    public let payment: Payment?
    public let signals: [String: JSONAny]?
    public let status: CheckoutStatus
    public let totals: [CheckoutTotal]

    enum CodingKeys: String, CodingKey {
        case attribution, buyer, context
        case continueURL = "continue_url"
        case currency, discounts
        case expiresAt = "expires_at"
        case fulfillment, id
        case lineItems = "line_items"
        case links, messages, order, payment, signals, status, totals
    }

    /// Prevent typed fields and the omitted `ucp` metadata from being copied through `additionalProperties`.
    private static let excludedAdditionalPropertyKeys: Set<String> = [
        "attribution", "buyer", "context", "continue_url", "currency", "discounts", "expires_at",
        "fulfillment", "id", "line_items", "links", "messages", "order", "payment", "signals", "status",
        "totals", "ucp"
    ]

    public init(
        id: String,
        status: CheckoutStatus,
        currency: String,
        attribution: [String: String]? = nil,
        buyer: Buyer? = nil,
        context: Context? = nil,
        continueURL: String? = nil,
        discounts: CheckoutDiscounts? = nil,
        expiresAt: Date? = nil,
        fulfillment: CheckoutFulfillment? = nil,
        lineItems: [LineItem],
        links: [Link] = [],
        messages: [Message]? = nil,
        order: OrderConfirmation? = nil,
        payment: Payment? = nil,
        signals: [String: JSONAny]? = nil,
        totals: [CheckoutTotal],
        additionalProperties: [String: JSONAny] = [:]
    ) {
        self.additionalProperties = additionalProperties
        self.attribution = attribution
        self.buyer = buyer
        self.context = context
        self.continueURL = continueURL
        self.currency = currency
        self.discounts = discounts
        self.expiresAt = expiresAt
        self.fulfillment = fulfillment
        self.id = id
        self.lineItems = lineItems
        self.links = links
        self.messages = messages
        self.order = order
        self.payment = payment
        self.signals = signals
        self.status = status
        self.totals = totals
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        attribution = try container.decodeIfPresent([String: String].self, forKey: .attribution)
        buyer = try container.decodeIfPresent(Buyer.self, forKey: .buyer)
        context = try container.decodeIfPresent(Context.self, forKey: .context)
        continueURL = try container.decodeIfPresent(String.self, forKey: .continueURL)
        currency = try container.decode(String.self, forKey: .currency)
        discounts = try container.decodeIfPresent(CheckoutDiscounts.self, forKey: .discounts)
        expiresAt = try container.decodeIfPresent(Date.self, forKey: .expiresAt)
        fulfillment = try container.decodeIfPresent(CheckoutFulfillment.self, forKey: .fulfillment)
        id = try container.decode(String.self, forKey: .id)
        lineItems = try container.decode([LineItem].self, forKey: .lineItems)
        links = try container.decode([Link].self, forKey: .links)
        messages = try container.decodeIfPresent([Message].self, forKey: .messages)
        order = try container.decodeIfPresent(OrderConfirmation.self, forKey: .order)
        payment = try container.decodeIfPresent(Payment.self, forKey: .payment)
        signals = try container.decodeIfPresent([String: JSONAny].self, forKey: .signals)
        status = try container.decode(CheckoutStatus.self, forKey: .status)
        totals = try container.decode([CheckoutTotal].self, forKey: .totals)

        let additionalContainer = try decoder.container(keyedBy: CheckoutAdditionalPropertyKey.self)
        additionalProperties = try additionalContainer.allKeys.reduce(into: [:]) { properties, key in
            guard !Self.excludedAdditionalPropertyKeys.contains(key.stringValue) else { return }
            properties[key.stringValue] = try additionalContainer.decode(JSONAny.self, forKey: key)
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
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
        try container.encodeIfPresent(signals, forKey: .signals)
        try container.encode(status, forKey: .status)
        try container.encode(totals, forKey: .totals)

        var additionalContainer = encoder.container(keyedBy: CheckoutAdditionalPropertyKey.self)
        for key in additionalProperties.keys.sorted() where !Self.excludedAdditionalPropertyKeys.contains(key) {
            try additionalContainer.encode(
                additionalProperties[key],
                forKey: CheckoutAdditionalPropertyKey(stringValue: key)!
            )
        }
    }
}

private struct CheckoutAdditionalPropertyKey: CodingKey {
    let stringValue: String
    let intValue: Int? = nil

    init?(stringValue: String) {
        self.stringValue = stringValue
    }

    init?(intValue _: Int) {
        return nil
    }
}

extension Checkout: Equatable {
    public static func == (lhs: Checkout, rhs: Checkout) -> Bool {
        lhs.comparisonData == rhs.comparisonData
    }

    private var comparisonData: Data? {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = .sortedKeys
        return try? encoder.encode(self)
    }
}

extension Checkout {
    init?(protocolCheckout: some Encodable) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        guard
            let data = try? encoder.encode(protocolCheckout),
            let checkout = try? decoder.decode(Checkout.self, from: data)
        else {
            return nil
        }

        self = checkout
    }
}
