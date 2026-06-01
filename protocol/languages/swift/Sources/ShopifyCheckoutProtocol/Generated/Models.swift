// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let checkout = try Checkout(json)
//   let errorResponse = try ErrorResponse(json)
//   let paymentAccountInfo = try PaymentAccountInfo(json)
//   let adjustment = try Adjustment(json)
//   let attribution = try Attribution(json)
//   let availablePaymentInstrument = try AvailablePaymentInstrument(json)
//   let binding = try TokenBinding(json)
//   let businessFulfillmentConfig = try BusinessFulfillmentConfig(json)
//   let businessSplitPaymentsConfig = try BusinessSplitPaymentsConfig(json)
//   let buyer = try Buyer(json)
//   let cardCredential = try CardCredential(json)
//   let cardPaymentInstrument = try CardPaymentInstrument(json)
//   let category = try Category(json)
//   let context = try Context(json)
//   let detailOptionValue = try DetailOptionValue(json)
//   let expectation = try Expectation(json)
//   let fulfillment = try Fulfillment(json)
//   let fulfillmentAvailableMethod = try FulfillmentAvailableMethod(json)
//   let fulfillmentDestination = try FulfillmentDestination(json)
//   let fulfillmentEvent = try FulfillmentEvent(json)
//   let fulfillmentGroup = try FulfillmentGroup(json)
//   let fulfillmentMethod = try FulfillmentMethod(json)
//   let fulfillmentOption = try FulfillmentOption(json)
//   let inputCorrelation = try InputCorrelation(json)
//   let instrumentGroup = try InstrumentGroup(json)
//   let item = try Item(json)
//   let lineItem = try LineItem(json)
//   let merchantFulfillmentConfig = try MerchantFulfillmentConfig(json)
//   let optionValue = try OptionValue(json)
//   let orderConfirmation = try OrderConfirmation(json)
//   let orderLineItem = try OrderLineItem(json)
//   let paymentCredential = try PaymentCredential(json)
//   let paymentIdentity = try PaymentIdentity(json)
//   let paymentInstrument = try PaymentInstrument(json)
//   let platformFulfillmentConfig = try PlatformFulfillmentConfig(json)
//   let priceFilter = try PriceFilter(json)
//   let priceRange = try PriceRange(json)
//   let product = try Product(json)
//   let productOption = try ProductOption(json)
//   let rating = try Rating(json)
//   let retailLocation = try RetailLocation(json)
//   let searchFilters = try SearchFilters(json)
//   let selectedOption = try SelectedOption(json)
//   let shippingDestination = try ShippingDestination(json)
//   let signals = try Signals(json)
//   let tokenCredential = try TokenCredential(json)
//   let total = try Total(json)
//   let totals = try Totals(json)
//   let variant = try Variant(json)
//   let payment = try Payment(json)
//   let order = try Order(json)
//   let instrumentsChangeResult = try InstrumentsChangeResult(json)
//   let credentialResult = try CredentialResult(json)

import Foundation

/// Base checkout schema. Extensions compose onto this using allOf.
// MARK: - Checkout
public struct Checkout: Codable, Sendable {
    public let attribution: [String: String]?
    /// Representation of the buyer.
    public let buyer: BuyerClass?
    public let context: ContextClass?
    /// URL for checkout handoff and session recovery. MUST be provided when status is
    /// requires_escalation. See specification for format and availability requirements.
    public let continueURL: String?
    /// ISO 4217 currency code reflecting the merchant's market determination. Derived from
    /// address, context, and geo IP—buyers provide signals, merchants determine currency.
    public let currency: String
    /// RFC 3339 expiry timestamp. Default TTL is 6 hours from creation if not sent.
    public let expiresAt: Date?
    /// Unique identifier of the checkout session.
    public let id: String
    /// List of line items being checked out.
    public let lineItems: [CheckoutLineItem]
    /// Links to be displayed by the platform (Privacy Policy, TOS). Mandatory for legal
    /// compliance.
    public let links: [Link]
    /// List of messages with error and info about the checkout session state.
    public let messages: [Message]?
    /// Details about an order created for this checkout session.
    public let order: OrderClass?
    public let payment: PaymentClass?
    public let signals: SignalsClass?
    /// Checkout state indicating the current phase and required action. See Checkout Status
    /// lifecycle documentation for state transition details.
    public let status: CheckoutStatus
    /// Different cart totals.
    public let totals: [CheckoutTotal]
    public let ucp: UCPCheckoutResponseSchema

    public enum CodingKeys: String, CodingKey {
        case attribution, buyer, context
        case continueURL = "continue_url"
        case currency
        case expiresAt = "expires_at"
        case id
        case lineItems = "line_items"
        case links, messages, order, payment, signals, status, totals, ucp
    }

    public init(attribution: [String: String]?, buyer: BuyerClass?, context: ContextClass?, continueURL: String?, currency: String, expiresAt: Date?, id: String, lineItems: [CheckoutLineItem], links: [Link], messages: [Message]?, order: OrderClass?, payment: PaymentClass?, signals: SignalsClass?, status: CheckoutStatus, totals: [CheckoutTotal], ucp: UCPCheckoutResponseSchema) {
        self.attribution = attribution
        self.buyer = buyer
        self.context = context
        self.continueURL = continueURL
        self.currency = currency
        self.expiresAt = expiresAt
        self.id = id
        self.lineItems = lineItems
        self.links = links
        self.messages = messages
        self.order = order
        self.payment = payment
        self.signals = signals
        self.status = status
        self.totals = totals
        self.ucp = ucp
    }
}

// MARK: Checkout convenience initializers and mutators

public extension Checkout {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Checkout.self, from: data)
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

    func with(
        attribution: [String: String]?? = nil,
        buyer: BuyerClass?? = nil,
        context: ContextClass?? = nil,
        continueURL: String?? = nil,
        currency: String? = nil,
        expiresAt: Date?? = nil,
        id: String? = nil,
        lineItems: [CheckoutLineItem]? = nil,
        links: [Link]? = nil,
        messages: [Message]?? = nil,
        order: OrderClass?? = nil,
        payment: PaymentClass?? = nil,
        signals: SignalsClass?? = nil,
        status: CheckoutStatus? = nil,
        totals: [CheckoutTotal]? = nil,
        ucp: UCPCheckoutResponseSchema? = nil
    ) -> Checkout {
        return Checkout(
            attribution: attribution ?? self.attribution,
            buyer: buyer ?? self.buyer,
            context: context ?? self.context,
            continueURL: continueURL ?? self.continueURL,
            currency: currency ?? self.currency,
            expiresAt: expiresAt ?? self.expiresAt,
            id: id ?? self.id,
            lineItems: lineItems ?? self.lineItems,
            links: links ?? self.links,
            messages: messages ?? self.messages,
            order: order ?? self.order,
            payment: payment ?? self.payment,
            signals: signals ?? self.signals,
            status: status ?? self.status,
            totals: totals ?? self.totals,
            ucp: ucp ?? self.ucp
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Representation of the buyer.
// MARK: - BuyerClass
public struct BuyerClass: Codable, Sendable {
    /// Email of the buyer.
    public let email: String?
    /// First name of the buyer.
    public let firstName: String?
    /// Last name of the buyer.
    public let lastName: String?
    /// E.164 standard.
    public let phoneNumber: String?

    public enum CodingKeys: String, CodingKey {
        case email
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
    }

    public init(email: String?, firstName: String?, lastName: String?, phoneNumber: String?) {
        self.email = email
        self.firstName = firstName
        self.lastName = lastName
        self.phoneNumber = phoneNumber
    }
}

// MARK: BuyerClass convenience initializers and mutators

public extension BuyerClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BuyerClass.self, from: data)
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

    func with(
        email: String?? = nil,
        firstName: String?? = nil,
        lastName: String?? = nil,
        phoneNumber: String?? = nil
    ) -> BuyerClass {
        return BuyerClass(
            email: email ?? self.email,
            firstName: firstName ?? self.firstName,
            lastName: lastName ?? self.lastName,
            phoneNumber: phoneNumber ?? self.phoneNumber
        )
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
// MARK: - ContextClass
public struct ContextClass: Codable, Sendable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used. Optional hint for market context
    /// (currency, availability, pricing)—higher-resolution data (e.g., shipping address)
    /// supersedes this value.
    public let addressCountry: String?
    /// The region in which the locality is, and which is in the country. For example, California
    /// or another appropriate first-level Administrative division. Optional hint for progressive
    /// localization—higher-resolution data (e.g., shipping address) supersedes this value.
    public let addressRegion: String?
    /// Preferred currency (ISO 4217, e.g., 'EUR', 'USD'). Businesses determine presentment
    /// currency from context and authoritative signals; this hint MAY inform selection in
    /// multi-currency markets. Also serves as the denomination for price filter values —
    /// platforms SHOULD include this field when sending price filters. Response prices include
    /// explicit currency confirming the resolution.
    public let currency: String?
    /// Buyer claims about eligible benefits such as loyalty membership, payment instrument
    /// perks, and similar. Recognized claims MAY inform the Business response (e.g., member-only
    /// product availability, adjusted pricing in catalog, provisional discounts at cart or
    /// checkout). Businesses MUST ignore unrecognized values without error. Values MUST use
    /// reverse-domain naming (e.g., 'com.example.loyalty_gold', 'org.school.student') and MUST
    /// be non-identifying.
    public let eligibility: [String]?
    /// Background context describing buyer's intent (e.g., 'looking for a gift under $50', 'need
    /// something durable for outdoor use'). Informs relevance, recommendations, and
    /// personalization.
    public let intent: String?
    /// Preferred language for content. Use IETF BCP 47 language tags (e.g., 'en', 'fr-CA',
    /// 'zh-Hans'). For REST, equivalent to Accept-Language header—platforms SHOULD fall back to
    /// Accept-Language when this field is absent; when provided, overrides Accept-Language.
    /// Businesses MAY return content in a different language if unavailable.
    public let language: String?
    /// The postal code. For example, 94043. Optional hint for regional
    /// refinement—higher-resolution data (e.g., shipping address) supersedes this value.
    public let postalCode: String?

    public enum CodingKeys: String, CodingKey {
        case addressCountry = "address_country"
        case addressRegion = "address_region"
        case currency, eligibility, intent, language
        case postalCode = "postal_code"
    }

    public init(addressCountry: String?, addressRegion: String?, currency: String?, eligibility: [String]?, intent: String?, language: String?, postalCode: String?) {
        self.addressCountry = addressCountry
        self.addressRegion = addressRegion
        self.currency = currency
        self.eligibility = eligibility
        self.intent = intent
        self.language = language
        self.postalCode = postalCode
    }
}

// MARK: ContextClass convenience initializers and mutators

public extension ContextClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ContextClass.self, from: data)
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

    func with(
        addressCountry: String?? = nil,
        addressRegion: String?? = nil,
        currency: String?? = nil,
        eligibility: [String]?? = nil,
        intent: String?? = nil,
        language: String?? = nil,
        postalCode: String?? = nil
    ) -> ContextClass {
        return ContextClass(
            addressCountry: addressCountry ?? self.addressCountry,
            addressRegion: addressRegion ?? self.addressRegion,
            currency: currency ?? self.currency,
            eligibility: eligibility ?? self.eligibility,
            intent: intent ?? self.intent,
            language: language ?? self.language,
            postalCode: postalCode ?? self.postalCode
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Line item object. Expected to use the currency of the parent object.
// MARK: - CheckoutLineItem
public struct CheckoutLineItem: Codable, Sendable {
    public let id: String
    public let item: ItemClass
    /// Parent line item identifier for any nested structures.
    public let parentID: String?
    /// Quantity of the item being purchased.
    public let quantity: Int
    /// Line item totals breakdown.
    public let totals: [LineItemTotal]

    public enum CodingKeys: String, CodingKey {
        case id, item
        case parentID = "parent_id"
        case quantity, totals
    }

    public init(id: String, item: ItemClass, parentID: String?, quantity: Int, totals: [LineItemTotal]) {
        self.id = id
        self.item = item
        self.parentID = parentID
        self.quantity = quantity
        self.totals = totals
    }
}

// MARK: CheckoutLineItem convenience initializers and mutators

public extension CheckoutLineItem {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CheckoutLineItem.self, from: data)
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

    func with(
        id: String? = nil,
        item: ItemClass? = nil,
        parentID: String?? = nil,
        quantity: Int? = nil,
        totals: [LineItemTotal]? = nil
    ) -> CheckoutLineItem {
        return CheckoutLineItem(
            id: id ?? self.id,
            item: item ?? self.item,
            parentID: parentID ?? self.parentID,
            quantity: quantity ?? self.quantity,
            totals: totals ?? self.totals
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Product data (id, title, price, image_url).
// MARK: - ItemClass
public struct ItemClass: Codable, Sendable {
    /// The product identifier, often the SKU, required to resolve the product details associated
    /// with this line item. Should be recognized by both the Platform, and the Business.
    public let id: String
    /// Product image URI.
    public let imageURL: String?
    /// Unit price in ISO 4217 minor units.
    public let price: Int
    /// Product title.
    public let title: String

    public enum CodingKeys: String, CodingKey {
        case id
        case imageURL = "image_url"
        case price, title
    }

    public init(id: String, imageURL: String?, price: Int, title: String) {
        self.id = id
        self.imageURL = imageURL
        self.price = price
        self.title = title
    }
}

// MARK: ItemClass convenience initializers and mutators

public extension ItemClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ItemClass.self, from: data)
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

    func with(
        id: String? = nil,
        imageURL: String?? = nil,
        price: Int? = nil,
        title: String? = nil
    ) -> ItemClass {
        return ItemClass(
            id: id ?? self.id,
            imageURL: imageURL ?? self.imageURL,
            price: price ?? self.price,
            title: title ?? self.title
        )
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
    public let amount: Int
    /// Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
    /// 'Delivery').
    public let displayText: String?
    /// Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
    /// fee, total. Businesses MAY use additional values.
    public let type: String

    public enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
        case type
    }

    public init(amount: Int, displayText: String?, type: String) {
        self.amount = amount
        self.displayText = displayText
        self.type = type
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

    func with(
        amount: Int? = nil,
        displayText: String?? = nil,
        type: String? = nil
    ) -> LineItemTotal {
        return LineItemTotal(
            amount: amount ?? self.amount,
            displayText: displayText ?? self.displayText,
            type: type ?? self.type
        )
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
    public let title: String?
    /// Type of link. Well-known values: `privacy_policy`, `terms_of_service`, `refund_policy`,
    /// `shipping_policy`, `faq`. Consumers SHOULD handle unknown values gracefully by displaying
    /// them using the `title` field or omitting the link.
    public let type: String
    /// The actual URL pointing to the content to be displayed.
    public let url: String

    public init(title: String?, type: String, url: String) {
        self.title = title
        self.type = type
        self.url = url
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

    func with(
        title: String?? = nil,
        type: String? = nil,
        url: String? = nil
    ) -> Link {
        return Link(
            title: title ?? self.title,
            type: type ?? self.type,
            url: url ?? self.url
        )
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
    public let code: String?
    /// Human-readable message.
    ///
    /// Human-readable warning message that MUST be displayed.
    public let content: String
    /// Content format, default = plain.
    public let contentType: ContentType?
    /// RFC 9535 JSONPath to the component the message refers to (e.g., $.items[1]).
    ///
    /// JSONPath (RFC 9535) to related field (e.g., $.line_items[0]).
    ///
    /// RFC 9535 JSONPath to the component the message refers to.
    public let path: String?
    /// Reflects the resource state and recommended action. 'recoverable': platform can resolve
    /// by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires
    /// information their API doesn't support collecting programmatically (checkout incomplete).
    /// 'requires_buyer_review': buyer must authorize before order placement due to policy,
    /// regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
    /// retry with new resource or inputs. Errors with 'requires_*' severity contribute to
    /// 'status: requires_escalation'.
    public let severity: Severity?
    /// Message type discriminator.
    public let type: MessageType
    /// URL to a required visual element (e.g., warning symbol, energy class label).
    public let imageURL: String?
    /// Rendering contract for this warning. 'notice' (default): platform MUST display, MAY
    /// dismiss. 'disclosure': platform MUST display in proximity to the path-referenced
    /// component, MUST NOT hide or auto-dismiss. See specification for full contract.
    public let presentation: String?
    /// Reference URL for more information (e.g., regulatory site, registry entry, policy page).
    public let url: String?

    public enum CodingKeys: String, CodingKey {
        case code, content
        case contentType = "content_type"
        case path, severity, type
        case imageURL = "image_url"
        case presentation, url
    }

    public init(code: String?, content: String, contentType: ContentType?, path: String?, severity: Severity?, type: MessageType, imageURL: String?, presentation: String?, url: String?) {
        self.code = code
        self.content = content
        self.contentType = contentType
        self.path = path
        self.severity = severity
        self.type = type
        self.imageURL = imageURL
        self.presentation = presentation
        self.url = url
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

    func with(
        code: String?? = nil,
        content: String? = nil,
        contentType: ContentType?? = nil,
        path: String?? = nil,
        severity: Severity?? = nil,
        type: MessageType? = nil,
        imageURL: String?? = nil,
        presentation: String?? = nil,
        url: String?? = nil
    ) -> Message {
        return Message(
            code: code ?? self.code,
            content: content ?? self.content,
            contentType: contentType ?? self.contentType,
            path: path ?? self.path,
            severity: severity ?? self.severity,
            type: type ?? self.type,
            imageURL: imageURL ?? self.imageURL,
            presentation: presentation ?? self.presentation,
            url: url ?? self.url
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Content format, default = plain.
public enum ContentType: String, Codable, Sendable {
    case markdown = "markdown"
    case plain = "plain"
}

/// Reflects the resource state and recommended action. 'recoverable': platform can resolve
/// by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires
/// information their API doesn't support collecting programmatically (checkout incomplete).
/// 'requires_buyer_review': buyer must authorize before order placement due to policy,
/// regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
/// retry with new resource or inputs. Errors with 'requires_*' severity contribute to
/// 'status: requires_escalation'.
public enum Severity: String, Codable, Sendable {
    case recoverable = "recoverable"
    case requiresBuyerInput = "requires_buyer_input"
    case requiresBuyerReview = "requires_buyer_review"
    case unrecoverable = "unrecoverable"
}

public enum MessageType: String, Codable, Sendable {
    case error = "error"
    case info = "info"
    case warning = "warning"
}

/// Details about an order created for this checkout session.
///
/// Order details available at the time of checkout completion.
// MARK: - OrderClass
public struct OrderClass: Codable, Sendable {
    /// Unique order identifier.
    public let id: String
    /// Human-readable label for identifying the order. MUST only be provided by the business.
    public let label: String?
    /// Permalink to access the order on merchant site.
    public let permalinkURL: String

    public enum CodingKeys: String, CodingKey {
        case id, label
        case permalinkURL = "permalink_url"
    }

    public init(id: String, label: String?, permalinkURL: String) {
        self.id = id
        self.label = label
        self.permalinkURL = permalinkURL
    }
}

// MARK: OrderClass convenience initializers and mutators

public extension OrderClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(OrderClass.self, from: data)
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

    func with(
        id: String? = nil,
        label: String?? = nil,
        permalinkURL: String? = nil
    ) -> OrderClass {
        return OrderClass(
            id: id ?? self.id,
            label: label ?? self.label,
            permalinkURL: permalinkURL ?? self.permalinkURL
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Payment configuration containing handlers.
// MARK: - PaymentClass
public struct PaymentClass: Codable, Sendable {
    /// The payment instruments available for this payment. Each instrument is associated with a
    /// specific handler via the handler_id field. Handlers can extend the base
    /// payment_instrument schema to add handler-specific fields.
    public let instruments: [PaymentSelectedPaymentInstrument]?

    public init(instruments: [PaymentSelectedPaymentInstrument]?) {
        self.instruments = instruments
    }
}

// MARK: PaymentClass convenience initializers and mutators

public extension PaymentClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PaymentClass.self, from: data)
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

    func with(
        instruments: [PaymentSelectedPaymentInstrument]?? = nil
    ) -> PaymentClass {
        return PaymentClass(
            instruments: instruments ?? self.instruments
        )
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
// MARK: - PaymentSelectedPaymentInstrument
public struct PaymentSelectedPaymentInstrument: Codable, Sendable {
    /// The billing address associated with this payment method.
    public let billingAddress: PostalAddress?
    public let credential: CredentialClass?
    /// Display information for this payment instrument. Each payment instrument schema defines
    /// its specific display properties, as outlined by the payment handler.
    public let display: [String: JSONAny]?
    /// The unique identifier for the handler instance that produced this instrument. This
    /// corresponds to the 'id' field in the Payment Handler definition.
    public let handlerID: String
    /// A unique identifier for this instrument instance, assigned by the platform.
    public let id: String
    /// The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
    /// will constrain this to a constant value.
    public let type: String
    /// Whether this instrument is selected by the user.
    public let selected: Bool?

    public enum CodingKeys: String, CodingKey {
        case billingAddress = "billing_address"
        case credential, display
        case handlerID = "handler_id"
        case id, type, selected
    }

    public init(billingAddress: PostalAddress?, credential: CredentialClass?, display: [String: JSONAny]?, handlerID: String, id: String, type: String, selected: Bool?) {
        self.billingAddress = billingAddress
        self.credential = credential
        self.display = display
        self.handlerID = handlerID
        self.id = id
        self.type = type
        self.selected = selected
    }
}

// MARK: PaymentSelectedPaymentInstrument convenience initializers and mutators

public extension PaymentSelectedPaymentInstrument {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PaymentSelectedPaymentInstrument.self, from: data)
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

    func with(
        billingAddress: PostalAddress?? = nil,
        credential: CredentialClass?? = nil,
        display: [String: JSONAny]?? = nil,
        handlerID: String? = nil,
        id: String? = nil,
        type: String? = nil,
        selected: Bool?? = nil
    ) -> PaymentSelectedPaymentInstrument {
        return PaymentSelectedPaymentInstrument(
            billingAddress: billingAddress ?? self.billingAddress,
            credential: credential ?? self.credential,
            display: display ?? self.display,
            handlerID: handlerID ?? self.handlerID,
            id: id ?? self.id,
            type: type ?? self.type,
            selected: selected ?? self.selected
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// The billing address associated with this payment method.
///
/// Delivery destination address.
///
/// Physical address of the location.
// MARK: - PostalAddress
public struct PostalAddress: Codable, Sendable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used.
    public let addressCountry: String?
    /// The locality in which the street address is, and which is in the region. For example,
    /// Mountain View.
    public let addressLocality: String?
    /// The region in which the locality is, and which is in the country. Required for applicable
    /// countries (i.e. state in US, province in CA). For example, California or another
    /// appropriate first-level Administrative division.
    public let addressRegion: String?
    /// An address extension such as an apartment number, C/O or alternative name.
    public let extendedAddress: String?
    /// Optional. First name of the contact associated with the address.
    public let firstName: String?
    /// Optional. Last name of the contact associated with the address.
    public let lastName: String?
    /// Optional. Phone number of the contact associated with the address.
    public let phoneNumber: String?
    /// The postal code. For example, 94043.
    public let postalCode: String?
    /// The street address.
    public let streetAddress: String?

    public enum CodingKeys: String, CodingKey {
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

    public init(addressCountry: String?, addressLocality: String?, addressRegion: String?, extendedAddress: String?, firstName: String?, lastName: String?, phoneNumber: String?, postalCode: String?, streetAddress: String?) {
        self.addressCountry = addressCountry
        self.addressLocality = addressLocality
        self.addressRegion = addressRegion
        self.extendedAddress = extendedAddress
        self.firstName = firstName
        self.lastName = lastName
        self.phoneNumber = phoneNumber
        self.postalCode = postalCode
        self.streetAddress = streetAddress
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

    func with(
        addressCountry: String?? = nil,
        addressLocality: String?? = nil,
        addressRegion: String?? = nil,
        extendedAddress: String?? = nil,
        firstName: String?? = nil,
        lastName: String?? = nil,
        phoneNumber: String?? = nil,
        postalCode: String?? = nil,
        streetAddress: String?? = nil
    ) -> PostalAddress {
        return PostalAddress(
            addressCountry: addressCountry ?? self.addressCountry,
            addressLocality: addressLocality ?? self.addressLocality,
            addressRegion: addressRegion ?? self.addressRegion,
            extendedAddress: extendedAddress ?? self.extendedAddress,
            firstName: firstName ?? self.firstName,
            lastName: lastName ?? self.lastName,
            phoneNumber: phoneNumber ?? self.phoneNumber,
            postalCode: postalCode ?? self.postalCode,
            streetAddress: streetAddress ?? self.streetAddress
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// The base definition for any payment credential. Handlers define specific credential types.
// MARK: - CredentialClass
public struct CredentialClass: Codable, Sendable {
    /// The credential type discriminator. Specific schemas will constrain this to a constant
    /// value.
    public let type: String

    public init(type: String) {
        self.type = type
    }
}

// MARK: CredentialClass convenience initializers and mutators

public extension CredentialClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CredentialClass.self, from: data)
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

    func with(
        type: String? = nil
    ) -> CredentialClass {
        return CredentialClass(
            type: type ?? self.type
        )
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
// MARK: - SignalsClass
public struct SignalsClass: Codable, Sendable {
    /// Client's IP address (IPv4 or IPv6).
    public let devUcpBuyerIP: String?
    /// Client's HTTP User-Agent header or equivalent.
    public let devUcpUserAgent: String?

    public enum CodingKeys: String, CodingKey {
        case devUcpBuyerIP = "dev.ucp.buyer_ip"
        case devUcpUserAgent = "dev.ucp.user_agent"
    }

    public init(devUcpBuyerIP: String?, devUcpUserAgent: String?) {
        self.devUcpBuyerIP = devUcpBuyerIP
        self.devUcpUserAgent = devUcpUserAgent
    }
}

// MARK: SignalsClass convenience initializers and mutators

public extension SignalsClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SignalsClass.self, from: data)
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

    func with(
        devUcpBuyerIP: String?? = nil,
        devUcpUserAgent: String?? = nil
    ) -> SignalsClass {
        return SignalsClass(
            devUcpBuyerIP: devUcpBuyerIP ?? self.devUcpBuyerIP,
            devUcpUserAgent: devUcpUserAgent ?? self.devUcpUserAgent
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Checkout state indicating the current phase and required action. See Checkout Status
/// lifecycle documentation for state transition details.
public enum CheckoutStatus: String, Codable, Sendable {
    case canceled = "canceled"
    case completeInProgress = "complete_in_progress"
    case completed = "completed"
    case incomplete = "incomplete"
    case readyForComplete = "ready_for_complete"
    case requiresEscalation = "requires_escalation"
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
    public let amount: Int
    /// Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
    /// 'Delivery').
    public let displayText: String?
    /// Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
    /// fee, total. Businesses MAY use additional values.
    public let type: String
    /// Optional itemized breakdown. The parent entry is always rendered; lines are
    /// supplementary. Sum of line amounts MUST equal the parent entry amount.
    public let lines: [TotalLine]?

    public enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
        case type, lines
    }

    public init(amount: Int, displayText: String?, type: String, lines: [TotalLine]?) {
        self.amount = amount
        self.displayText = displayText
        self.type = type
        self.lines = lines
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

    func with(
        amount: Int? = nil,
        displayText: String?? = nil,
        type: String? = nil,
        lines: [TotalLine]?? = nil
    ) -> CheckoutTotal {
        return CheckoutTotal(
            amount: amount ?? self.amount,
            displayText: displayText ?? self.displayText,
            type: type ?? self.type,
            lines: lines ?? self.lines
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Sub-line entry. Additional metadata MAY be included.
// MARK: - TotalLine
public struct TotalLine: Codable, Sendable {
    public let amount: Int
    /// Human-readable label for this sub-line.
    public let displayText: String

    public enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
    }

    public init(amount: Int, displayText: String) {
        self.amount = amount
        self.displayText = displayText
    }
}

// MARK: TotalLine convenience initializers and mutators

public extension TotalLine {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(TotalLine.self, from: data)
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

    func with(
        amount: Int? = nil,
        displayText: String? = nil
    ) -> TotalLine {
        return TotalLine(
            amount: amount ?? self.amount,
            displayText: displayText ?? self.displayText
        )
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
public struct UCPCheckoutResponseSchema: Codable, Sendable {
    /// Capability registry keyed by reverse-domain name.
    public let capabilities: [String: [CapabilityResponseSchema]]?
    /// Payment handler registry keyed by reverse-domain name.
    public let paymentHandlers: [String: [PaymentHandlerResponseSchema]]
    /// Service registry keyed by reverse-domain name.
    public let services: [String: [ServiceResponseSchema]]?
    /// Application-level status of the UCP operation.
    public let status: UCPCheckoutResponseSchemaStatus?
    public let version: String

    public enum CodingKeys: String, CodingKey {
        case capabilities
        case paymentHandlers = "payment_handlers"
        case services, status, version
    }

    public init(capabilities: [String: [CapabilityResponseSchema]]?, paymentHandlers: [String: [PaymentHandlerResponseSchema]], services: [String: [ServiceResponseSchema]]?, status: UCPCheckoutResponseSchemaStatus?, version: String) {
        self.capabilities = capabilities
        self.paymentHandlers = paymentHandlers
        self.services = services
        self.status = status
        self.version = version
    }
}

// MARK: UCPCheckoutResponseSchema convenience initializers and mutators

public extension UCPCheckoutResponseSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(UCPCheckoutResponseSchema.self, from: data)
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

    func with(
        capabilities: [String: [CapabilityResponseSchema]]?? = nil,
        paymentHandlers: [String: [PaymentHandlerResponseSchema]]? = nil,
        services: [String: [ServiceResponseSchema]]?? = nil,
        status: UCPCheckoutResponseSchemaStatus?? = nil,
        version: String? = nil
    ) -> UCPCheckoutResponseSchema {
        return UCPCheckoutResponseSchema(
            capabilities: capabilities ?? self.capabilities,
            paymentHandlers: paymentHandlers ?? self.paymentHandlers,
            services: services ?? self.services,
            status: status ?? self.status,
            version: version ?? self.version
        )
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
    public let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    public let id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    public let schema: String?
    /// URL to human-readable specification document.
    public let spec: String?
    /// Entity version in YYYY-MM-DD format.
    public let version: String
    /// Parent capability(s) this extends. Present for extensions, absent for root capabilities.
    /// Use array for multi-parent extensions.
    public let extends: Extends?

    public init(config: [String: JSONAny]?, id: String?, schema: String?, spec: String?, version: String, extends: Extends?) {
        self.config = config
        self.id = id
        self.schema = schema
        self.spec = spec
        self.version = version
        self.extends = extends
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

    func with(
        config: [String: JSONAny]?? = nil,
        id: String?? = nil,
        schema: String?? = nil,
        spec: String?? = nil,
        version: String? = nil,
        extends: Extends?? = nil
    ) -> CapabilityResponseSchema {
        return CapabilityResponseSchema(
            config: config ?? self.config,
            id: id ?? self.id,
            schema: schema ?? self.schema,
            spec: spec ?? self.spec,
            version: version ?? self.version,
            extends: extends ?? self.extends
        )
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
    public let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    public let id: String
    /// URL to JSON Schema defining this entity's structure and payloads.
    public let schema: String?
    /// URL to human-readable specification document.
    public let spec: String?
    /// Entity version in YYYY-MM-DD format.
    public let version: String
    /// Instrument types this handler supports, with optional constraints. When absent, every
    /// instrument should be considered available.
    public let availableInstruments: [PaymentHandlerResponseSchemaAvailableInstrument]?

    public enum CodingKeys: String, CodingKey {
        case config, id, schema, spec, version
        case availableInstruments = "available_instruments"
    }

    public init(config: [String: JSONAny]?, id: String, schema: String?, spec: String?, version: String, availableInstruments: [PaymentHandlerResponseSchemaAvailableInstrument]?) {
        self.config = config
        self.id = id
        self.schema = schema
        self.spec = spec
        self.version = version
        self.availableInstruments = availableInstruments
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

    func with(
        config: [String: JSONAny]?? = nil,
        id: String? = nil,
        schema: String?? = nil,
        spec: String?? = nil,
        version: String? = nil,
        availableInstruments: [PaymentHandlerResponseSchemaAvailableInstrument]?? = nil
    ) -> PaymentHandlerResponseSchema {
        return PaymentHandlerResponseSchema(
            config: config ?? self.config,
            id: id ?? self.id,
            schema: schema ?? self.schema,
            spec: spec ?? self.spec,
            version: version ?? self.version,
            availableInstruments: availableInstruments ?? self.availableInstruments
        )
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
    /// Constraints on this instrument type. Structure depends on instrument type and active
    /// capabilities.
    public let constraints: [String: JSONAny]?
    /// The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
    /// schema's type constant.
    public let type: String

    public init(constraints: [String: JSONAny]?, type: String) {
        self.constraints = constraints
        self.type = type
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

    func with(
        constraints: [String: JSONAny]?? = nil,
        type: String? = nil
    ) -> PaymentHandlerResponseSchemaAvailableInstrument {
        return PaymentHandlerResponseSchemaAvailableInstrument(
            constraints: constraints ?? self.constraints,
            type: type ?? self.type
        )
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
public struct ServiceResponseSchema: Codable, Sendable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    public let config: EmbeddedTransportConfig?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    public let id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    public let schema: String?
    /// URL to human-readable specification document.
    public let spec: String?
    /// Entity version in YYYY-MM-DD format.
    public let version: String
    /// Endpoint URL for this transport binding.
    public let endpoint: String?
    /// Transport protocol for this service binding.
    public let transport: Transport

    public init(config: EmbeddedTransportConfig?, id: String?, schema: String?, spec: String?, version: String, endpoint: String?, transport: Transport) {
        self.config = config
        self.id = id
        self.schema = schema
        self.spec = spec
        self.version = version
        self.endpoint = endpoint
        self.transport = transport
    }
}

// MARK: ServiceResponseSchema convenience initializers and mutators

public extension ServiceResponseSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ServiceResponseSchema.self, from: data)
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

    func with(
        config: EmbeddedTransportConfig?? = nil,
        id: String?? = nil,
        schema: String?? = nil,
        spec: String?? = nil,
        version: String? = nil,
        endpoint: String?? = nil,
        transport: Transport? = nil
    ) -> ServiceResponseSchema {
        return ServiceResponseSchema(
            config: config ?? self.config,
            id: id ?? self.id,
            schema: schema ?? self.schema,
            spec: spec ?? self.spec,
            version: version ?? self.version,
            endpoint: endpoint ?? self.endpoint,
            transport: transport ?? self.transport
        )
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
public struct EmbeddedTransportConfig: Codable, Sendable {
    /// Color schemes the business supports. Hosts use ec_color_scheme query parameter to request
    /// a scheme from this list.
    public let colorScheme: [EmbeddedColorScheme]?
    /// Delegations the business allows. At service-level, declares available delegations. In UCP
    /// responses, confirms accepted delegations for this session.
    public let delegate: [String]?

    public enum CodingKeys: String, CodingKey {
        case colorScheme = "color_scheme"
        case delegate
    }

    public init(colorScheme: [EmbeddedColorScheme]?, delegate: [String]?) {
        self.colorScheme = colorScheme
        self.delegate = delegate
    }
}

// MARK: EmbeddedTransportConfig convenience initializers and mutators

public extension EmbeddedTransportConfig {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EmbeddedTransportConfig.self, from: data)
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

    func with(
        colorScheme: [EmbeddedColorScheme]?? = nil,
        delegate: [String]?? = nil
    ) -> EmbeddedTransportConfig {
        return EmbeddedTransportConfig(
            colorScheme: colorScheme ?? self.colorScheme,
            delegate: delegate ?? self.delegate
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum EmbeddedColorScheme: String, Codable, Sendable {
    case dark = "dark"
    case light = "light"
}

/// Transport protocol for this service binding.
public enum Transport: String, Codable, Sendable {
    case a2A = "a2a"
    case embedded = "embedded"
    case mcp = "mcp"
    case rest = "rest"
}

/// Application-level status of the UCP operation.
public enum UCPCheckoutResponseSchemaStatus: String, Codable, Sendable {
    case error = "error"
    case success = "success"
}

/// Generic error response when business logic prevents resource creation or failed to
/// retrieve resource. Used when no valid resource can be established.
// MARK: - ErrorResponse
public struct ErrorResponse: Codable, Sendable {
    /// URL for buyer handoff or session recovery.
    public let continueURL: String?
    /// Array of messages describing why the operation failed.
    public let messages: [Message]
    /// UCP protocol metadata. Status MUST be 'error' for error response.
    public let ucp: ErrorResponseUcp

    public enum CodingKeys: String, CodingKey {
        case continueURL = "continue_url"
        case messages, ucp
    }

    public init(continueURL: String?, messages: [Message], ucp: ErrorResponseUcp) {
        self.continueURL = continueURL
        self.messages = messages
        self.ucp = ucp
    }
}

// MARK: ErrorResponse convenience initializers and mutators

public extension ErrorResponse {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ErrorResponse.self, from: data)
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

    func with(
        continueURL: String?? = nil,
        messages: [Message]? = nil,
        ucp: ErrorResponseUcp? = nil
    ) -> ErrorResponse {
        return ErrorResponse(
            continueURL: continueURL ?? self.continueURL,
            messages: messages ?? self.messages,
            ucp: ucp ?? self.ucp
        )
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
public struct ErrorResponseUcp: Codable, Sendable {
    /// Capability registry keyed by reverse-domain name.
    public let capabilities: [String: [CapabilityResponseSchema]]?
    /// Payment handler registry keyed by reverse-domain name.
    public let paymentHandlers: [String: [PaymentHandlerResponseSchema]]?
    /// Service registry keyed by reverse-domain name.
    public let services: [String: [UCPOrderResponseSchemaService]]?
    /// Application-level status of the UCP operation.
    public let status: StatusEnum
    public let version: String

    public enum CodingKeys: String, CodingKey {
        case capabilities
        case paymentHandlers = "payment_handlers"
        case services, status, version
    }

    public init(capabilities: [String: [CapabilityResponseSchema]]?, paymentHandlers: [String: [PaymentHandlerResponseSchema]]?, services: [String: [UCPOrderResponseSchemaService]]?, status: StatusEnum, version: String) {
        self.capabilities = capabilities
        self.paymentHandlers = paymentHandlers
        self.services = services
        self.status = status
        self.version = version
    }
}

// MARK: ErrorResponseUcp convenience initializers and mutators

public extension ErrorResponseUcp {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ErrorResponseUcp.self, from: data)
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

    func with(
        capabilities: [String: [CapabilityResponseSchema]]?? = nil,
        paymentHandlers: [String: [PaymentHandlerResponseSchema]]?? = nil,
        services: [String: [UCPOrderResponseSchemaService]]?? = nil,
        status: StatusEnum? = nil,
        version: String? = nil
    ) -> ErrorResponseUcp {
        return ErrorResponseUcp(
            capabilities: capabilities ?? self.capabilities,
            paymentHandlers: paymentHandlers ?? self.paymentHandlers,
            services: services ?? self.services,
            status: status ?? self.status,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Shared foundation for all UCP entities.
// MARK: - UCPOrderResponseSchemaService
public struct UCPOrderResponseSchemaService: Codable, Sendable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    public let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    public let id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    public let schema: String?
    /// URL to human-readable specification document.
    public let spec: String?
    /// Entity version in YYYY-MM-DD format.
    public let version: String
    /// Endpoint URL for this transport binding.
    public let endpoint: String?
    /// Transport protocol for this service binding.
    public let transport: Transport

    public init(config: [String: JSONAny]?, id: String?, schema: String?, spec: String?, version: String, endpoint: String?, transport: Transport) {
        self.config = config
        self.id = id
        self.schema = schema
        self.spec = spec
        self.version = version
        self.endpoint = endpoint
        self.transport = transport
    }
}

// MARK: UCPOrderResponseSchemaService convenience initializers and mutators

public extension UCPOrderResponseSchemaService {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(UCPOrderResponseSchemaService.self, from: data)
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

    func with(
        config: [String: JSONAny]?? = nil,
        id: String?? = nil,
        schema: String?? = nil,
        spec: String?? = nil,
        version: String? = nil,
        endpoint: String?? = nil,
        transport: Transport? = nil
    ) -> UCPOrderResponseSchemaService {
        return UCPOrderResponseSchemaService(
            config: config ?? self.config,
            id: id ?? self.id,
            schema: schema ?? self.schema,
            spec: spec ?? self.spec,
            version: version ?? self.version,
            endpoint: endpoint ?? self.endpoint,
            transport: transport ?? self.transport
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Application-level status of the UCP operation.
public enum StatusEnum: String, Codable, Sendable {
    case error = "error"
}

/// Non-sensitive backend identifiers for linking.
// MARK: - PaymentAccountInfo
public struct PaymentAccountInfo: Codable, Sendable {
    /// EMVCo PAR. A unique identifier linking a payment card to a specific account, enabling
    /// tracking across tokens (Apple Pay, physical card, etc).
    public let paymentAccountReference: String?

    public enum CodingKeys: String, CodingKey {
        case paymentAccountReference = "payment_account_reference"
    }

    public init(paymentAccountReference: String?) {
        self.paymentAccountReference = paymentAccountReference
    }
}

// MARK: PaymentAccountInfo convenience initializers and mutators

public extension PaymentAccountInfo {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PaymentAccountInfo.self, from: data)
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

    func with(
        paymentAccountReference: String?? = nil
    ) -> PaymentAccountInfo {
        return PaymentAccountInfo(
            paymentAccountReference: paymentAccountReference ?? self.paymentAccountReference
        )
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
    public let description: String?
    /// Adjustment event identifier.
    public let id: String
    /// Which line items and quantities are affected (optional).
    public let lineItems: [AdjustmentLineItem]?
    /// RFC 3339 timestamp when this adjustment occurred.
    public let occurredAt: Date
    /// Adjustment status.
    public let status: AdjustmentStatus
    /// Adjustment totals breakdown. Signed values - negative for money returned to buyer
    /// (refunds, credits), positive for additional charges (exchanges).
    public let totals: [LineItemTotal]?
    /// Type of adjustment (open string). Typically money-related like: refund, return, credit,
    /// price_adjustment, dispute, cancellation. Can be any value that makes sense for the
    /// merchant's business.
    public let type: String

    public enum CodingKeys: String, CodingKey {
        case description, id
        case lineItems = "line_items"
        case occurredAt = "occurred_at"
        case status, totals, type
    }

    public init(description: String?, id: String, lineItems: [AdjustmentLineItem]?, occurredAt: Date, status: AdjustmentStatus, totals: [LineItemTotal]?, type: String) {
        self.description = description
        self.id = id
        self.lineItems = lineItems
        self.occurredAt = occurredAt
        self.status = status
        self.totals = totals
        self.type = type
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

    func with(
        description: String?? = nil,
        id: String? = nil,
        lineItems: [AdjustmentLineItem]?? = nil,
        occurredAt: Date? = nil,
        status: AdjustmentStatus? = nil,
        totals: [LineItemTotal]?? = nil,
        type: String? = nil
    ) -> Adjustment {
        return Adjustment(
            description: description ?? self.description,
            id: id ?? self.id,
            lineItems: lineItems ?? self.lineItems,
            occurredAt: occurredAt ?? self.occurredAt,
            status: status ?? self.status,
            totals: totals ?? self.totals,
            type: type ?? self.type
        )
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
    public let id: String
    /// Signed quantity affected by this adjustment. Negative values represent reductions (e.g.
    /// returns); positive values represent additions (e.g. exchanges).
    public let quantity: Int

    public init(id: String, quantity: Int) {
        self.id = id
        self.quantity = quantity
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

    func with(
        id: String? = nil,
        quantity: Int? = nil
    ) -> AdjustmentLineItem {
        return AdjustmentLineItem(
            id: id ?? self.id,
            quantity: quantity ?? self.quantity
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Adjustment status.
public enum AdjustmentStatus: String, Codable, Sendable {
    case completed = "completed"
    case failed = "failed"
    case pending = "pending"
}

/// An instrument type available from a payment handler with optional constraints.
// MARK: - AvailablePaymentInstrument
public struct AvailablePaymentInstrument: Codable, Sendable {
    /// Constraints on this instrument type. Structure depends on instrument type and active
    /// capabilities.
    public let constraints: [String: JSONAny]?
    /// The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
    /// schema's type constant.
    public let type: String

    public init(constraints: [String: JSONAny]?, type: String) {
        self.constraints = constraints
        self.type = type
    }
}

// MARK: AvailablePaymentInstrument convenience initializers and mutators

public extension AvailablePaymentInstrument {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(AvailablePaymentInstrument.self, from: data)
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

    func with(
        constraints: [String: JSONAny]?? = nil,
        type: String? = nil
    ) -> AvailablePaymentInstrument {
        return AvailablePaymentInstrument(
            constraints: constraints ?? self.constraints,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Binds a token to a specific checkout session and participant. Prevents token reuse across
/// different checkouts or participants.
// MARK: - TokenBinding
public struct TokenBinding: Codable, Sendable {
    /// The checkout session identifier this token is bound to.
    public let checkoutID: String
    /// The participant this token is bound to. Required when acting on behalf of another
    /// participant (e.g., agent tokenizing for merchant). Omit when the authenticated caller is
    /// the binding target.
    public let identity: IdentityClass?

    public enum CodingKeys: String, CodingKey {
        case checkoutID = "checkout_id"
        case identity
    }

    public init(checkoutID: String, identity: IdentityClass?) {
        self.checkoutID = checkoutID
        self.identity = identity
    }
}

// MARK: TokenBinding convenience initializers and mutators

public extension TokenBinding {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(TokenBinding.self, from: data)
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

    func with(
        checkoutID: String? = nil,
        identity: IdentityClass?? = nil
    ) -> TokenBinding {
        return TokenBinding(
            checkoutID: checkoutID ?? self.checkoutID,
            identity: identity ?? self.identity
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// The participant this token is bound to. Required when acting on behalf of another
/// participant (e.g., agent tokenizing for merchant). Omit when the authenticated caller is
/// the binding target.
///
/// Identity of a participant for token binding. The access_token uniquely identifies the
/// participant who tokens should be bound to.
// MARK: - IdentityClass
public struct IdentityClass: Codable, Sendable {
    /// Unique identifier for this participant, obtained during onboarding with the tokenizer.
    public let accessToken: String

    public enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
    }

    public init(accessToken: String) {
        self.accessToken = accessToken
    }
}

// MARK: IdentityClass convenience initializers and mutators

public extension IdentityClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(IdentityClass.self, from: data)
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

    func with(
        accessToken: String? = nil
    ) -> IdentityClass {
        return IdentityClass(
            accessToken: accessToken ?? self.accessToken
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Business's fulfillment configuration.
// MARK: - BusinessFulfillmentConfig
public struct BusinessFulfillmentConfig: Codable, Sendable {
    /// Allowed method type combinations.
    public let allowsMethodCombinations: [[TypeElement]]?
    /// Permits multiple destinations per method type.
    public let allowsMultiDestination: BusinessFulfillmentConfigAllowsMultiDestination?

    public enum CodingKeys: String, CodingKey {
        case allowsMethodCombinations = "allows_method_combinations"
        case allowsMultiDestination = "allows_multi_destination"
    }

    public init(allowsMethodCombinations: [[TypeElement]]?, allowsMultiDestination: BusinessFulfillmentConfigAllowsMultiDestination?) {
        self.allowsMethodCombinations = allowsMethodCombinations
        self.allowsMultiDestination = allowsMultiDestination
    }
}

// MARK: BusinessFulfillmentConfig convenience initializers and mutators

public extension BusinessFulfillmentConfig {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BusinessFulfillmentConfig.self, from: data)
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

    func with(
        allowsMethodCombinations: [[TypeElement]]?? = nil,
        allowsMultiDestination: BusinessFulfillmentConfigAllowsMultiDestination?? = nil
    ) -> BusinessFulfillmentConfig {
        return BusinessFulfillmentConfig(
            allowsMethodCombinations: allowsMethodCombinations ?? self.allowsMethodCombinations,
            allowsMultiDestination: allowsMultiDestination ?? self.allowsMultiDestination
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Fulfillment method type this availability applies to.
///
/// Fulfillment method type.
public enum TypeElement: String, Codable, Sendable {
    case pickup = "pickup"
    case shipping = "shipping"
}

/// Permits multiple destinations per method type.
// MARK: - BusinessFulfillmentConfigAllowsMultiDestination
public struct BusinessFulfillmentConfigAllowsMultiDestination: Codable, Sendable {
    /// Multiple pickup locations allowed.
    public let pickup: Bool?
    /// Multiple shipping destinations allowed.
    public let shipping: Bool?

    public init(pickup: Bool?, shipping: Bool?) {
        self.pickup = pickup
        self.shipping = shipping
    }
}

// MARK: BusinessFulfillmentConfigAllowsMultiDestination convenience initializers and mutators

public extension BusinessFulfillmentConfigAllowsMultiDestination {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BusinessFulfillmentConfigAllowsMultiDestination.self, from: data)
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

    func with(
        pickup: Bool?? = nil,
        shipping: Bool?? = nil
    ) -> BusinessFulfillmentConfigAllowsMultiDestination {
        return BusinessFulfillmentConfigAllowsMultiDestination(
            pickup: pickup ?? self.pickup,
            shipping: shipping ?? self.shipping
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Business-level configuration for split payments. Declaring the capability means multiple
/// payment instruments are supported; this config declares which combinations are valid.
// MARK: - BusinessSplitPaymentsConfig
public struct BusinessSplitPaymentsConfig: Codable, Sendable {
    /// Array of valid instrument combinations. Each combination is an array of instrument
    /// groups. A payment is valid if it matches any combination.
    public let allowedCombinations: [[AllowedCombinationElement]]

    public enum CodingKeys: String, CodingKey {
        case allowedCombinations = "allowed_combinations"
    }

    public init(allowedCombinations: [[AllowedCombinationElement]]) {
        self.allowedCombinations = allowedCombinations
    }
}

// MARK: BusinessSplitPaymentsConfig convenience initializers and mutators

public extension BusinessSplitPaymentsConfig {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BusinessSplitPaymentsConfig.self, from: data)
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

    func with(
        allowedCombinations: [[AllowedCombinationElement]]? = nil
    ) -> BusinessSplitPaymentsConfig {
        return BusinessSplitPaymentsConfig(
            allowedCombinations: allowedCombinations ?? self.allowedCombinations
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A single valid combination: an array of instrument groups that together define the
/// constraints. All groups must be satisfied (AND logic).
///
/// A constraint within an allowed combination that defines which instrument types can fill
/// this group and how many are permitted.
// MARK: - AllowedCombinationElement
public struct AllowedCombinationElement: Codable, Sendable {
    /// Maximum number of instruments allowed from this group. Defaults to 1. MUST be greater
    /// than or equal to `min`.
    public let max: Int?
    /// Minimum number of instruments required from this group. Defaults to 0 (optional).
    public let min: Int?
    /// Instrument types accepted by this group (OR logic). Any listed type qualifies.
    public let types: [String]

    public init(max: Int?, min: Int?, types: [String]) {
        self.max = max
        self.min = min
        self.types = types
    }
}

// MARK: AllowedCombinationElement convenience initializers and mutators

public extension AllowedCombinationElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(AllowedCombinationElement.self, from: data)
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

    func with(
        max: Int?? = nil,
        min: Int?? = nil,
        types: [String]? = nil
    ) -> AllowedCombinationElement {
        return AllowedCombinationElement(
            max: max ?? self.max,
            min: min ?? self.min,
            types: types ?? self.types
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - Buyer
public struct Buyer: Codable, Sendable {
    /// Email of the buyer.
    public let email: String?
    /// First name of the buyer.
    public let firstName: String?
    /// Last name of the buyer.
    public let lastName: String?
    /// E.164 standard.
    public let phoneNumber: String?

    public enum CodingKeys: String, CodingKey {
        case email
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
    }

    public init(email: String?, firstName: String?, lastName: String?, phoneNumber: String?) {
        self.email = email
        self.firstName = firstName
        self.lastName = lastName
        self.phoneNumber = phoneNumber
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

    func with(
        email: String?? = nil,
        firstName: String?? = nil,
        lastName: String?? = nil,
        phoneNumber: String?? = nil
    ) -> Buyer {
        return Buyer(
            email: email ?? self.email,
            firstName: firstName ?? self.firstName,
            lastName: lastName ?? self.lastName,
            phoneNumber: phoneNumber ?? self.phoneNumber
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A card credential containing sensitive payment card details including raw Primary Account
/// Numbers (PANs). This credential type MUST NOT be used for checkout, only with payment
/// handlers that tokenize or encrypt credentials. CRITICAL: Both parties handling
/// CardCredential (sender and receiver) MUST be PCI DSS compliant. Transmission MUST use
/// HTTPS/TLS with strong cipher suites.
///
/// The base definition for any payment credential. Handlers define specific credential types.
// MARK: - CardCredential
public struct CardCredential: Codable, Sendable {
    /// The credential type discriminator. Specific schemas will constrain this to a constant
    /// value.
    ///
    /// The credential type identifier for card credentials.
    public let type: ErrorCode
    /// The type of card number. Network tokens are preferred with fallback to FPAN. See PCI
    /// Scope for more details.
    public let cardNumberType: CardNumberType
    /// Cryptogram provided with network tokens.
    public let cryptogram: String?
    /// Card CVC number.
    public let cvc: String?
    /// Electronic Commerce Indicator / Security Level Indicator provided with network tokens.
    public let eciValue: String?
    /// The month of the card's expiration date (1-12).
    public let expiryMonth: Int?
    /// The year of the card's expiration date.
    public let expiryYear: Int?
    /// Cardholder name.
    public let name: String?
    /// Card number.
    public let number: String?

    public enum CodingKeys: String, CodingKey {
        case type
        case cardNumberType = "card_number_type"
        case cryptogram, cvc
        case eciValue = "eci_value"
        case expiryMonth = "expiry_month"
        case expiryYear = "expiry_year"
        case name, number
    }

    public init(type: ErrorCode, cardNumberType: CardNumberType, cryptogram: String?, cvc: String?, eciValue: String?, expiryMonth: Int?, expiryYear: Int?, name: String?, number: String?) {
        self.type = type
        self.cardNumberType = cardNumberType
        self.cryptogram = cryptogram
        self.cvc = cvc
        self.eciValue = eciValue
        self.expiryMonth = expiryMonth
        self.expiryYear = expiryYear
        self.name = name
        self.number = number
    }
}

// MARK: CardCredential convenience initializers and mutators

public extension CardCredential {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CardCredential.self, from: data)
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

    func with(
        type: ErrorCode? = nil,
        cardNumberType: CardNumberType? = nil,
        cryptogram: String?? = nil,
        cvc: String?? = nil,
        eciValue: String?? = nil,
        expiryMonth: Int?? = nil,
        expiryYear: Int?? = nil,
        name: String?? = nil,
        number: String?? = nil
    ) -> CardCredential {
        return CardCredential(
            type: type ?? self.type,
            cardNumberType: cardNumberType ?? self.cardNumberType,
            cryptogram: cryptogram ?? self.cryptogram,
            cvc: cvc ?? self.cvc,
            eciValue: eciValue ?? self.eciValue,
            expiryMonth: expiryMonth ?? self.expiryMonth,
            expiryYear: expiryYear ?? self.expiryYear,
            name: name ?? self.name,
            number: number ?? self.number
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// The type of card number. Network tokens are preferred with fallback to FPAN. See PCI
/// Scope for more details.
public enum CardNumberType: String, Codable, Sendable {
    case dpan = "dpan"
    case fpan = "fpan"
    case networkToken = "network_token"
}

/// URL-style parameter value, encoded as a string. Numeric or boolean values MUST be
/// string-encoded as they would be in a URL query string.
///
/// Error code identifying the type of error. Standard errors are defined in capability
/// specifications (see examples) and have standardized semantics; freeform codes are
/// permitted.
///
/// Warning code identifying the type of warning. Standard codes are defined in capability
/// specifications (see examples) and have standardized semantics; freeform codes are
/// permitted.
///
/// Info code identifying the type of informational message. Standard codes are defined in
/// capability specifications (see examples) and have standardized semantics; freeform codes
/// are permitted.
public enum ErrorCode: String, Codable, Sendable {
    case card = "card"
}

/// A basic card payment instrument with visible card details. Can be inherited by a
/// handler's instrument schema to define handler-specific display details or more complex
/// credential structures.
///
/// The base definition for any payment instrument. It links the instrument to a specific
/// payment handler.
// MARK: - CardPaymentInstrument
public struct CardPaymentInstrument: Codable, Sendable {
    /// The billing address associated with this payment method.
    public let billingAddress: PostalAddress?
    public let credential: CredentialClass?
    /// Display information for this payment instrument. Each payment instrument schema defines
    /// its specific display properties, as outlined by the payment handler.
    ///
    /// Display information for this card payment instrument.
    public let display: Display?
    /// The unique identifier for the handler instance that produced this instrument. This
    /// corresponds to the 'id' field in the Payment Handler definition.
    public let handlerID: String
    /// A unique identifier for this instrument instance, assigned by the platform.
    public let id: String
    /// The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
    /// will constrain this to a constant value.
    ///
    /// Indicates this is a card payment instrument.
    public let type: ErrorCode

    public enum CodingKeys: String, CodingKey {
        case billingAddress = "billing_address"
        case credential, display
        case handlerID = "handler_id"
        case id, type
    }

    public init(billingAddress: PostalAddress?, credential: CredentialClass?, display: Display?, handlerID: String, id: String, type: ErrorCode) {
        self.billingAddress = billingAddress
        self.credential = credential
        self.display = display
        self.handlerID = handlerID
        self.id = id
        self.type = type
    }
}

// MARK: CardPaymentInstrument convenience initializers and mutators

public extension CardPaymentInstrument {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CardPaymentInstrument.self, from: data)
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

    func with(
        billingAddress: PostalAddress?? = nil,
        credential: CredentialClass?? = nil,
        display: Display?? = nil,
        handlerID: String? = nil,
        id: String? = nil,
        type: ErrorCode? = nil
    ) -> CardPaymentInstrument {
        return CardPaymentInstrument(
            billingAddress: billingAddress ?? self.billingAddress,
            credential: credential ?? self.credential,
            display: display ?? self.display,
            handlerID: handlerID ?? self.handlerID,
            id: id ?? self.id,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Display information for this payment instrument. Each payment instrument schema defines
/// its specific display properties, as outlined by the payment handler.
///
/// Display information for this card payment instrument.
// MARK: - Display
public struct Display: Codable, Sendable {
    /// The card brand/network (e.g., visa, mastercard, amex).
    public let brand: String?
    /// An optional URI to a rich image representing the card (e.g., card art provided by the
    /// issuer).
    public let cardArt: String?
    /// An optional rich text description of the card to display to the user (e.g., 'Visa ending
    /// in 1234, expires 12/2025').
    public let description: String?
    /// The month of the card's expiration date (1-12).
    public let expiryMonth: Int?
    /// The year of the card's expiration date.
    public let expiryYear: Int?
    /// Last 4 digits of the card number.
    public let lastDigits: String?

    public enum CodingKeys: String, CodingKey {
        case brand
        case cardArt = "card_art"
        case description
        case expiryMonth = "expiry_month"
        case expiryYear = "expiry_year"
        case lastDigits = "last_digits"
    }

    public init(brand: String?, cardArt: String?, description: String?, expiryMonth: Int?, expiryYear: Int?, lastDigits: String?) {
        self.brand = brand
        self.cardArt = cardArt
        self.description = description
        self.expiryMonth = expiryMonth
        self.expiryYear = expiryYear
        self.lastDigits = lastDigits
    }
}

// MARK: Display convenience initializers and mutators

public extension Display {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Display.self, from: data)
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

    func with(
        brand: String?? = nil,
        cardArt: String?? = nil,
        description: String?? = nil,
        expiryMonth: Int?? = nil,
        expiryYear: Int?? = nil,
        lastDigits: String?? = nil
    ) -> Display {
        return Display(
            brand: brand ?? self.brand,
            cardArt: cardArt ?? self.cardArt,
            description: description ?? self.description,
            expiryMonth: expiryMonth ?? self.expiryMonth,
            expiryYear: expiryYear ?? self.expiryYear,
            lastDigits: lastDigits ?? self.lastDigits
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A product category with optional taxonomy identifier.
// MARK: - Category
public struct Category: Codable, Sendable {
    /// Source taxonomy. Well-known values: `google_product_category`, `shopify`, `merchant`.
    public let taxonomy: String?
    /// Category value or path (e.g., 'Apparel > Shirts', '1604').
    public let value: String

    public init(taxonomy: String?, value: String) {
        self.taxonomy = taxonomy
        self.value = value
    }
}

// MARK: Category convenience initializers and mutators

public extension Category {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Category.self, from: data)
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

    func with(
        taxonomy: String?? = nil,
        value: String? = nil
    ) -> Category {
        return Category(
            taxonomy: taxonomy ?? self.taxonomy,
            value: value ?? self.value
        )
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
// MARK: - Context
public struct Context: Codable, Sendable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used. Optional hint for market context
    /// (currency, availability, pricing)—higher-resolution data (e.g., shipping address)
    /// supersedes this value.
    public let addressCountry: String?
    /// The region in which the locality is, and which is in the country. For example, California
    /// or another appropriate first-level Administrative division. Optional hint for progressive
    /// localization—higher-resolution data (e.g., shipping address) supersedes this value.
    public let addressRegion: String?
    /// Preferred currency (ISO 4217, e.g., 'EUR', 'USD'). Businesses determine presentment
    /// currency from context and authoritative signals; this hint MAY inform selection in
    /// multi-currency markets. Also serves as the denomination for price filter values —
    /// platforms SHOULD include this field when sending price filters. Response prices include
    /// explicit currency confirming the resolution.
    public let currency: String?
    /// Buyer claims about eligible benefits such as loyalty membership, payment instrument
    /// perks, and similar. Recognized claims MAY inform the Business response (e.g., member-only
    /// product availability, adjusted pricing in catalog, provisional discounts at cart or
    /// checkout). Businesses MUST ignore unrecognized values without error. Values MUST use
    /// reverse-domain naming (e.g., 'com.example.loyalty_gold', 'org.school.student') and MUST
    /// be non-identifying.
    public let eligibility: [String]?
    /// Background context describing buyer's intent (e.g., 'looking for a gift under $50', 'need
    /// something durable for outdoor use'). Informs relevance, recommendations, and
    /// personalization.
    public let intent: String?
    /// Preferred language for content. Use IETF BCP 47 language tags (e.g., 'en', 'fr-CA',
    /// 'zh-Hans'). For REST, equivalent to Accept-Language header—platforms SHOULD fall back to
    /// Accept-Language when this field is absent; when provided, overrides Accept-Language.
    /// Businesses MAY return content in a different language if unavailable.
    public let language: String?
    /// The postal code. For example, 94043. Optional hint for regional
    /// refinement—higher-resolution data (e.g., shipping address) supersedes this value.
    public let postalCode: String?

    public enum CodingKeys: String, CodingKey {
        case addressCountry = "address_country"
        case addressRegion = "address_region"
        case currency, eligibility, intent, language
        case postalCode = "postal_code"
    }

    public init(addressCountry: String?, addressRegion: String?, currency: String?, eligibility: [String]?, intent: String?, language: String?, postalCode: String?) {
        self.addressCountry = addressCountry
        self.addressRegion = addressRegion
        self.currency = currency
        self.eligibility = eligibility
        self.intent = intent
        self.language = language
        self.postalCode = postalCode
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

    func with(
        addressCountry: String?? = nil,
        addressRegion: String?? = nil,
        currency: String?? = nil,
        eligibility: [String]?? = nil,
        intent: String?? = nil,
        language: String?? = nil,
        postalCode: String?? = nil
    ) -> Context {
        return Context(
            addressCountry: addressCountry ?? self.addressCountry,
            addressRegion: addressRegion ?? self.addressRegion,
            currency: currency ?? self.currency,
            eligibility: eligibility ?? self.eligibility,
            intent: intent ?? self.intent,
            language: language ?? self.language,
            postalCode: postalCode ?? self.postalCode
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// An option value with availability signals relative to the current selections. Used in
/// get_product responses where selected context exists.
///
/// A selectable value for a product option.
// MARK: - DetailOptionValue
public struct DetailOptionValue: Codable, Sendable {
    /// Whether a variant matching this value and the current option selections is purchasable.
    public let available: Bool?
    /// Whether a variant matching this value and the current option selections exists in the
    /// catalog.
    public let exists: Bool?
    /// Optional server-assigned identifier for this option value. When present in a
    /// selected_option, the server SHOULD use it for matching instead of label.
    public let id: String?
    /// Display text for this option value (e.g., 'Small', 'Blue').
    public let label: String

    public init(available: Bool?, exists: Bool?, id: String?, label: String) {
        self.available = available
        self.exists = exists
        self.id = id
        self.label = label
    }
}

// MARK: DetailOptionValue convenience initializers and mutators

public extension DetailOptionValue {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(DetailOptionValue.self, from: data)
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

    func with(
        available: Bool?? = nil,
        exists: Bool?? = nil,
        id: String?? = nil,
        label: String? = nil
    ) -> DetailOptionValue {
        return DetailOptionValue(
            available: available ?? self.available,
            exists: exists ?? self.exists,
            id: id ?? self.id,
            label: label ?? self.label
        )
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
    public let description: String?
    /// Delivery destination address.
    public let destination: PostalAddress
    /// When this expectation can be fulfilled: 'now' or ISO 8601 timestamp for future date
    /// (backorder, pre-order).
    public let fulfillableOn: String?
    /// Expectation identifier.
    public let id: String
    /// Which line items and quantities are in this expectation.
    public let lineItems: [ExpectationLineItem]
    /// Delivery method type (shipping, pickup, digital).
    public let methodType: MethodType

    public enum CodingKeys: String, CodingKey {
        case description, destination
        case fulfillableOn = "fulfillable_on"
        case id
        case lineItems = "line_items"
        case methodType = "method_type"
    }

    public init(description: String?, destination: PostalAddress, fulfillableOn: String?, id: String, lineItems: [ExpectationLineItem], methodType: MethodType) {
        self.description = description
        self.destination = destination
        self.fulfillableOn = fulfillableOn
        self.id = id
        self.lineItems = lineItems
        self.methodType = methodType
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

    func with(
        description: String?? = nil,
        destination: PostalAddress? = nil,
        fulfillableOn: String?? = nil,
        id: String? = nil,
        lineItems: [ExpectationLineItem]? = nil,
        methodType: MethodType? = nil
    ) -> Expectation {
        return Expectation(
            description: description ?? self.description,
            destination: destination ?? self.destination,
            fulfillableOn: fulfillableOn ?? self.fulfillableOn,
            id: id ?? self.id,
            lineItems: lineItems ?? self.lineItems,
            methodType: methodType ?? self.methodType
        )
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
    public let id: String
    /// Quantity of this item in this expectation.
    public let quantity: Int

    public init(id: String, quantity: Int) {
        self.id = id
        self.quantity = quantity
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

    func with(
        id: String? = nil,
        quantity: Int? = nil
    ) -> ExpectationLineItem {
        return ExpectationLineItem(
            id: id ?? self.id,
            quantity: quantity ?? self.quantity
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Delivery method type (shipping, pickup, digital).
public enum MethodType: String, Codable, Sendable {
    case digital = "digital"
    case pickup = "pickup"
    case shipping = "shipping"
}

/// Container for fulfillment methods and availability.
// MARK: - Fulfillment
public struct Fulfillment: Codable, Sendable {
    /// Inventory availability hints.
    public let availableMethods: [AvailableMethodElement]?
    /// Fulfillment methods for cart items.
    public let methods: [MethodElement]?

    public enum CodingKeys: String, CodingKey {
        case availableMethods = "available_methods"
        case methods
    }

    public init(availableMethods: [AvailableMethodElement]?, methods: [MethodElement]?) {
        self.availableMethods = availableMethods
        self.methods = methods
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

    func with(
        availableMethods: [AvailableMethodElement]?? = nil,
        methods: [MethodElement]?? = nil
    ) -> Fulfillment {
        return Fulfillment(
            availableMethods: availableMethods ?? self.availableMethods,
            methods: methods ?? self.methods
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Inventory availability hint for a fulfillment method type.
// MARK: - AvailableMethodElement
public struct AvailableMethodElement: Codable, Sendable {
    /// Human-readable availability info (e.g., 'Available for pickup at Downtown Store today').
    public let description: String?
    /// 'now' for immediate availability, or ISO 8601 date for future (preorders, transfers).
    public let fulfillableOn: String?
    /// Line items available for this fulfillment method.
    public let lineItemIDS: [String]
    /// Fulfillment method type this availability applies to.
    public let type: TypeElement

    public enum CodingKeys: String, CodingKey {
        case description
        case fulfillableOn = "fulfillable_on"
        case lineItemIDS = "line_item_ids"
        case type
    }

    public init(description: String?, fulfillableOn: String?, lineItemIDS: [String], type: TypeElement) {
        self.description = description
        self.fulfillableOn = fulfillableOn
        self.lineItemIDS = lineItemIDS
        self.type = type
    }
}

// MARK: AvailableMethodElement convenience initializers and mutators

public extension AvailableMethodElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(AvailableMethodElement.self, from: data)
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

    func with(
        description: String?? = nil,
        fulfillableOn: String?? = nil,
        lineItemIDS: [String]? = nil,
        type: TypeElement? = nil
    ) -> AvailableMethodElement {
        return AvailableMethodElement(
            description: description ?? self.description,
            fulfillableOn: fulfillableOn ?? self.fulfillableOn,
            lineItemIDS: lineItemIDS ?? self.lineItemIDS,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A fulfillment method (shipping or pickup) with destinations and groups.
// MARK: - MethodElement
public struct MethodElement: Codable, Sendable {
    /// Available destinations. For shipping: addresses. For pickup: retail locations.
    public let destinations: [FulfillmentDestinationElement]?
    /// Fulfillment groups for selecting options. Agent sets selected_option_id on groups to
    /// choose shipping method.
    public let groups: [GroupElement]?
    /// Unique fulfillment method identifier.
    public let id: String
    /// Line item IDs fulfilled via this method.
    public let lineItemIDS: [String]
    /// ID of the selected destination.
    public let selectedDestinationID: String?
    /// Fulfillment method type.
    public let type: TypeElement

    public enum CodingKeys: String, CodingKey {
        case destinations, groups, id
        case lineItemIDS = "line_item_ids"
        case selectedDestinationID = "selected_destination_id"
        case type
    }

    public init(destinations: [FulfillmentDestinationElement]?, groups: [GroupElement]?, id: String, lineItemIDS: [String], selectedDestinationID: String?, type: TypeElement) {
        self.destinations = destinations
        self.groups = groups
        self.id = id
        self.lineItemIDS = lineItemIDS
        self.selectedDestinationID = selectedDestinationID
        self.type = type
    }
}

// MARK: MethodElement convenience initializers and mutators

public extension MethodElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(MethodElement.self, from: data)
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

    func with(
        destinations: [FulfillmentDestinationElement]?? = nil,
        groups: [GroupElement]?? = nil,
        id: String? = nil,
        lineItemIDS: [String]? = nil,
        selectedDestinationID: String?? = nil,
        type: TypeElement? = nil
    ) -> MethodElement {
        return MethodElement(
            destinations: destinations ?? self.destinations,
            groups: groups ?? self.groups,
            id: id ?? self.id,
            lineItemIDS: lineItemIDS ?? self.lineItemIDS,
            selectedDestinationID: selectedDestinationID ?? self.selectedDestinationID,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A destination for fulfillment.
///
/// Shipping destination.
///
/// The billing address associated with this payment method.
///
/// Delivery destination address.
///
/// Physical address of the location.
///
/// A pickup location (retail store, locker, etc.).
// MARK: - FulfillmentDestinationElement
public struct FulfillmentDestinationElement: Codable, Sendable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used.
    public let addressCountry: String?
    /// The locality in which the street address is, and which is in the region. For example,
    /// Mountain View.
    public let addressLocality: String?
    /// The region in which the locality is, and which is in the country. Required for applicable
    /// countries (i.e. state in US, province in CA). For example, California or another
    /// appropriate first-level Administrative division.
    public let addressRegion: String?
    /// An address extension such as an apartment number, C/O or alternative name.
    public let extendedAddress: String?
    /// Optional. First name of the contact associated with the address.
    public let firstName: String?
    /// Optional. Last name of the contact associated with the address.
    public let lastName: String?
    /// Optional. Phone number of the contact associated with the address.
    public let phoneNumber: String?
    /// The postal code. For example, 94043.
    public let postalCode: String?
    /// The street address.
    public let streetAddress: String?
    /// ID specific to this shipping destination.
    ///
    /// Unique location identifier.
    public let id: String
    /// Physical address of the location.
    public let address: PostalAddress?
    /// Location name (e.g., store name).
    public let name: String?

    public enum CodingKeys: String, CodingKey {
        case addressCountry = "address_country"
        case addressLocality = "address_locality"
        case addressRegion = "address_region"
        case extendedAddress = "extended_address"
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
        case postalCode = "postal_code"
        case streetAddress = "street_address"
        case id, address, name
    }

    public init(addressCountry: String?, addressLocality: String?, addressRegion: String?, extendedAddress: String?, firstName: String?, lastName: String?, phoneNumber: String?, postalCode: String?, streetAddress: String?, id: String, address: PostalAddress?, name: String?) {
        self.addressCountry = addressCountry
        self.addressLocality = addressLocality
        self.addressRegion = addressRegion
        self.extendedAddress = extendedAddress
        self.firstName = firstName
        self.lastName = lastName
        self.phoneNumber = phoneNumber
        self.postalCode = postalCode
        self.streetAddress = streetAddress
        self.id = id
        self.address = address
        self.name = name
    }
}

// MARK: FulfillmentDestinationElement convenience initializers and mutators

public extension FulfillmentDestinationElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FulfillmentDestinationElement.self, from: data)
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

    func with(
        addressCountry: String?? = nil,
        addressLocality: String?? = nil,
        addressRegion: String?? = nil,
        extendedAddress: String?? = nil,
        firstName: String?? = nil,
        lastName: String?? = nil,
        phoneNumber: String?? = nil,
        postalCode: String?? = nil,
        streetAddress: String?? = nil,
        id: String? = nil,
        address: PostalAddress?? = nil,
        name: String?? = nil
    ) -> FulfillmentDestinationElement {
        return FulfillmentDestinationElement(
            addressCountry: addressCountry ?? self.addressCountry,
            addressLocality: addressLocality ?? self.addressLocality,
            addressRegion: addressRegion ?? self.addressRegion,
            extendedAddress: extendedAddress ?? self.extendedAddress,
            firstName: firstName ?? self.firstName,
            lastName: lastName ?? self.lastName,
            phoneNumber: phoneNumber ?? self.phoneNumber,
            postalCode: postalCode ?? self.postalCode,
            streetAddress: streetAddress ?? self.streetAddress,
            id: id ?? self.id,
            address: address ?? self.address,
            name: name ?? self.name
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A merchant-generated package/group of line items with fulfillment options.
// MARK: - GroupElement
public struct GroupElement: Codable, Sendable {
    /// Group identifier for referencing merchant-generated groups in updates.
    public let id: String
    /// Line item IDs included in this group/package.
    public let lineItemIDS: [String]
    /// Available fulfillment options for this group.
    public let options: [OptionElement]?
    /// ID of the selected fulfillment option for this group.
    public let selectedOptionID: String?

    public enum CodingKeys: String, CodingKey {
        case id
        case lineItemIDS = "line_item_ids"
        case options
        case selectedOptionID = "selected_option_id"
    }

    public init(id: String, lineItemIDS: [String], options: [OptionElement]?, selectedOptionID: String?) {
        self.id = id
        self.lineItemIDS = lineItemIDS
        self.options = options
        self.selectedOptionID = selectedOptionID
    }
}

// MARK: GroupElement convenience initializers and mutators

public extension GroupElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(GroupElement.self, from: data)
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

    func with(
        id: String? = nil,
        lineItemIDS: [String]? = nil,
        options: [OptionElement]?? = nil,
        selectedOptionID: String?? = nil
    ) -> GroupElement {
        return GroupElement(
            id: id ?? self.id,
            lineItemIDS: lineItemIDS ?? self.lineItemIDS,
            options: options ?? self.options,
            selectedOptionID: selectedOptionID ?? self.selectedOptionID
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A fulfillment option within a group (e.g., Standard Shipping $5, Express $15).
// MARK: - OptionElement
public struct OptionElement: Codable, Sendable {
    /// Carrier name (for shipping).
    public let carrier: String?
    /// Complete context for buyer decision (e.g., 'Arrives Dec 12-15 via FedEx').
    public let description: String?
    /// Earliest fulfillment date.
    public let earliestFulfillmentTime: Date?
    /// Unique fulfillment option identifier.
    public let id: String
    /// Latest fulfillment date.
    public let latestFulfillmentTime: Date?
    /// Short label (e.g., 'Express Shipping', 'Curbside Pickup').
    public let title: String
    /// Fulfillment option totals breakdown.
    public let totals: [LineItemTotal]

    public enum CodingKeys: String, CodingKey {
        case carrier, description
        case earliestFulfillmentTime = "earliest_fulfillment_time"
        case id
        case latestFulfillmentTime = "latest_fulfillment_time"
        case title, totals
    }

    public init(carrier: String?, description: String?, earliestFulfillmentTime: Date?, id: String, latestFulfillmentTime: Date?, title: String, totals: [LineItemTotal]) {
        self.carrier = carrier
        self.description = description
        self.earliestFulfillmentTime = earliestFulfillmentTime
        self.id = id
        self.latestFulfillmentTime = latestFulfillmentTime
        self.title = title
        self.totals = totals
    }
}

// MARK: OptionElement convenience initializers and mutators

public extension OptionElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(OptionElement.self, from: data)
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

    func with(
        carrier: String?? = nil,
        description: String?? = nil,
        earliestFulfillmentTime: Date?? = nil,
        id: String? = nil,
        latestFulfillmentTime: Date?? = nil,
        title: String? = nil,
        totals: [LineItemTotal]? = nil
    ) -> OptionElement {
        return OptionElement(
            carrier: carrier ?? self.carrier,
            description: description ?? self.description,
            earliestFulfillmentTime: earliestFulfillmentTime ?? self.earliestFulfillmentTime,
            id: id ?? self.id,
            latestFulfillmentTime: latestFulfillmentTime ?? self.latestFulfillmentTime,
            title: title ?? self.title,
            totals: totals ?? self.totals
        )
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
    public let description: String?
    /// 'now' for immediate availability, or ISO 8601 date for future (preorders, transfers).
    public let fulfillableOn: String?
    /// Line items available for this fulfillment method.
    public let lineItemIDS: [String]
    /// Fulfillment method type this availability applies to.
    public let type: TypeElement

    public enum CodingKeys: String, CodingKey {
        case description
        case fulfillableOn = "fulfillable_on"
        case lineItemIDS = "line_item_ids"
        case type
    }

    public init(description: String?, fulfillableOn: String?, lineItemIDS: [String], type: TypeElement) {
        self.description = description
        self.fulfillableOn = fulfillableOn
        self.lineItemIDS = lineItemIDS
        self.type = type
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

    func with(
        description: String?? = nil,
        fulfillableOn: String?? = nil,
        lineItemIDS: [String]? = nil,
        type: TypeElement? = nil
    ) -> FulfillmentAvailableMethod {
        return FulfillmentAvailableMethod(
            description: description ?? self.description,
            fulfillableOn: fulfillableOn ?? self.fulfillableOn,
            lineItemIDS: lineItemIDS ?? self.lineItemIDS,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A destination for fulfillment.
///
/// Shipping destination.
///
/// The billing address associated with this payment method.
///
/// Delivery destination address.
///
/// Physical address of the location.
///
/// A pickup location (retail store, locker, etc.).
// MARK: - FulfillmentDestination
public struct FulfillmentDestination: Codable, Sendable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used.
    public let addressCountry: String?
    /// The locality in which the street address is, and which is in the region. For example,
    /// Mountain View.
    public let addressLocality: String?
    /// The region in which the locality is, and which is in the country. Required for applicable
    /// countries (i.e. state in US, province in CA). For example, California or another
    /// appropriate first-level Administrative division.
    public let addressRegion: String?
    /// An address extension such as an apartment number, C/O or alternative name.
    public let extendedAddress: String?
    /// Optional. First name of the contact associated with the address.
    public let firstName: String?
    /// Optional. Last name of the contact associated with the address.
    public let lastName: String?
    /// Optional. Phone number of the contact associated with the address.
    public let phoneNumber: String?
    /// The postal code. For example, 94043.
    public let postalCode: String?
    /// The street address.
    public let streetAddress: String?
    /// ID specific to this shipping destination.
    ///
    /// Unique location identifier.
    public let id: String
    /// Physical address of the location.
    public let address: PostalAddress?
    /// Location name (e.g., store name).
    public let name: String?

    public enum CodingKeys: String, CodingKey {
        case addressCountry = "address_country"
        case addressLocality = "address_locality"
        case addressRegion = "address_region"
        case extendedAddress = "extended_address"
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
        case postalCode = "postal_code"
        case streetAddress = "street_address"
        case id, address, name
    }

    public init(addressCountry: String?, addressLocality: String?, addressRegion: String?, extendedAddress: String?, firstName: String?, lastName: String?, phoneNumber: String?, postalCode: String?, streetAddress: String?, id: String, address: PostalAddress?, name: String?) {
        self.addressCountry = addressCountry
        self.addressLocality = addressLocality
        self.addressRegion = addressRegion
        self.extendedAddress = extendedAddress
        self.firstName = firstName
        self.lastName = lastName
        self.phoneNumber = phoneNumber
        self.postalCode = postalCode
        self.streetAddress = streetAddress
        self.id = id
        self.address = address
        self.name = name
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

    func with(
        addressCountry: String?? = nil,
        addressLocality: String?? = nil,
        addressRegion: String?? = nil,
        extendedAddress: String?? = nil,
        firstName: String?? = nil,
        lastName: String?? = nil,
        phoneNumber: String?? = nil,
        postalCode: String?? = nil,
        streetAddress: String?? = nil,
        id: String? = nil,
        address: PostalAddress?? = nil,
        name: String?? = nil
    ) -> FulfillmentDestination {
        return FulfillmentDestination(
            addressCountry: addressCountry ?? self.addressCountry,
            addressLocality: addressLocality ?? self.addressLocality,
            addressRegion: addressRegion ?? self.addressRegion,
            extendedAddress: extendedAddress ?? self.extendedAddress,
            firstName: firstName ?? self.firstName,
            lastName: lastName ?? self.lastName,
            phoneNumber: phoneNumber ?? self.phoneNumber,
            postalCode: postalCode ?? self.postalCode,
            streetAddress: streetAddress ?? self.streetAddress,
            id: id ?? self.id,
            address: address ?? self.address,
            name: name ?? self.name
        )
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
    public let carrier: String?
    /// Human-readable description of the shipment status or delivery information (e.g.,
    /// 'Delivered to front door', 'Out for delivery').
    public let description: String?
    /// Fulfillment event identifier.
    public let id: String
    /// Which line items and quantities are fulfilled in this event.
    public let lineItems: [FulfillmentEventLineItem]
    /// RFC 3339 timestamp when this fulfillment event occurred.
    public let occurredAt: Date
    /// Carrier tracking number (required if type != processing).
    public let trackingNumber: String?
    /// URL to track this shipment (required if type != processing).
    public let trackingURL: String?
    /// Fulfillment event type. Common values include: processing (preparing to ship), shipped
    /// (handed to carrier), in_transit (in delivery network), delivered (received by buyer),
    /// failed_attempt (delivery attempt failed), canceled (fulfillment canceled), undeliverable
    /// (cannot be delivered), returned_to_sender (returned to merchant).
    public let type: String

    public enum CodingKeys: String, CodingKey {
        case carrier, description, id
        case lineItems = "line_items"
        case occurredAt = "occurred_at"
        case trackingNumber = "tracking_number"
        case trackingURL = "tracking_url"
        case type
    }

    public init(carrier: String?, description: String?, id: String, lineItems: [FulfillmentEventLineItem], occurredAt: Date, trackingNumber: String?, trackingURL: String?, type: String) {
        self.carrier = carrier
        self.description = description
        self.id = id
        self.lineItems = lineItems
        self.occurredAt = occurredAt
        self.trackingNumber = trackingNumber
        self.trackingURL = trackingURL
        self.type = type
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

    func with(
        carrier: String?? = nil,
        description: String?? = nil,
        id: String? = nil,
        lineItems: [FulfillmentEventLineItem]? = nil,
        occurredAt: Date? = nil,
        trackingNumber: String?? = nil,
        trackingURL: String?? = nil,
        type: String? = nil
    ) -> FulfillmentEvent {
        return FulfillmentEvent(
            carrier: carrier ?? self.carrier,
            description: description ?? self.description,
            id: id ?? self.id,
            lineItems: lineItems ?? self.lineItems,
            occurredAt: occurredAt ?? self.occurredAt,
            trackingNumber: trackingNumber ?? self.trackingNumber,
            trackingURL: trackingURL ?? self.trackingURL,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - FulfillmentEventLineItem
public struct FulfillmentEventLineItem: Codable, Sendable {
    /// Line item ID reference.
    public let id: String
    /// Quantity fulfilled in this event.
    public let quantity: Int

    public init(id: String, quantity: Int) {
        self.id = id
        self.quantity = quantity
    }
}

// MARK: FulfillmentEventLineItem convenience initializers and mutators

public extension FulfillmentEventLineItem {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FulfillmentEventLineItem.self, from: data)
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

    func with(
        id: String? = nil,
        quantity: Int? = nil
    ) -> FulfillmentEventLineItem {
        return FulfillmentEventLineItem(
            id: id ?? self.id,
            quantity: quantity ?? self.quantity
        )
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
    public let id: String
    /// Line item IDs included in this group/package.
    public let lineItemIDS: [String]
    /// Available fulfillment options for this group.
    public let options: [OptionElement]?
    /// ID of the selected fulfillment option for this group.
    public let selectedOptionID: String?

    public enum CodingKeys: String, CodingKey {
        case id
        case lineItemIDS = "line_item_ids"
        case options
        case selectedOptionID = "selected_option_id"
    }

    public init(id: String, lineItemIDS: [String], options: [OptionElement]?, selectedOptionID: String?) {
        self.id = id
        self.lineItemIDS = lineItemIDS
        self.options = options
        self.selectedOptionID = selectedOptionID
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

    func with(
        id: String? = nil,
        lineItemIDS: [String]? = nil,
        options: [OptionElement]?? = nil,
        selectedOptionID: String?? = nil
    ) -> FulfillmentGroup {
        return FulfillmentGroup(
            id: id ?? self.id,
            lineItemIDS: lineItemIDS ?? self.lineItemIDS,
            options: options ?? self.options,
            selectedOptionID: selectedOptionID ?? self.selectedOptionID
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A fulfillment method (shipping or pickup) with destinations and groups.
// MARK: - FulfillmentMethod
public struct FulfillmentMethod: Codable, Sendable {
    /// Available destinations. For shipping: addresses. For pickup: retail locations.
    public let destinations: [FulfillmentDestinationElement]?
    /// Fulfillment groups for selecting options. Agent sets selected_option_id on groups to
    /// choose shipping method.
    public let groups: [GroupElement]?
    /// Unique fulfillment method identifier.
    public let id: String
    /// Line item IDs fulfilled via this method.
    public let lineItemIDS: [String]
    /// ID of the selected destination.
    public let selectedDestinationID: String?
    /// Fulfillment method type.
    public let type: TypeElement

    public enum CodingKeys: String, CodingKey {
        case destinations, groups, id
        case lineItemIDS = "line_item_ids"
        case selectedDestinationID = "selected_destination_id"
        case type
    }

    public init(destinations: [FulfillmentDestinationElement]?, groups: [GroupElement]?, id: String, lineItemIDS: [String], selectedDestinationID: String?, type: TypeElement) {
        self.destinations = destinations
        self.groups = groups
        self.id = id
        self.lineItemIDS = lineItemIDS
        self.selectedDestinationID = selectedDestinationID
        self.type = type
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

    func with(
        destinations: [FulfillmentDestinationElement]?? = nil,
        groups: [GroupElement]?? = nil,
        id: String? = nil,
        lineItemIDS: [String]? = nil,
        selectedDestinationID: String?? = nil,
        type: TypeElement? = nil
    ) -> FulfillmentMethod {
        return FulfillmentMethod(
            destinations: destinations ?? self.destinations,
            groups: groups ?? self.groups,
            id: id ?? self.id,
            lineItemIDS: lineItemIDS ?? self.lineItemIDS,
            selectedDestinationID: selectedDestinationID ?? self.selectedDestinationID,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A fulfillment option within a group (e.g., Standard Shipping $5, Express $15).
// MARK: - FulfillmentOption
public struct FulfillmentOption: Codable, Sendable {
    /// Carrier name (for shipping).
    public let carrier: String?
    /// Complete context for buyer decision (e.g., 'Arrives Dec 12-15 via FedEx').
    public let description: String?
    /// Earliest fulfillment date.
    public let earliestFulfillmentTime: Date?
    /// Unique fulfillment option identifier.
    public let id: String
    /// Latest fulfillment date.
    public let latestFulfillmentTime: Date?
    /// Short label (e.g., 'Express Shipping', 'Curbside Pickup').
    public let title: String
    /// Fulfillment option totals breakdown.
    public let totals: [LineItemTotal]

    public enum CodingKeys: String, CodingKey {
        case carrier, description
        case earliestFulfillmentTime = "earliest_fulfillment_time"
        case id
        case latestFulfillmentTime = "latest_fulfillment_time"
        case title, totals
    }

    public init(carrier: String?, description: String?, earliestFulfillmentTime: Date?, id: String, latestFulfillmentTime: Date?, title: String, totals: [LineItemTotal]) {
        self.carrier = carrier
        self.description = description
        self.earliestFulfillmentTime = earliestFulfillmentTime
        self.id = id
        self.latestFulfillmentTime = latestFulfillmentTime
        self.title = title
        self.totals = totals
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

    func with(
        carrier: String?? = nil,
        description: String?? = nil,
        earliestFulfillmentTime: Date?? = nil,
        id: String? = nil,
        latestFulfillmentTime: Date?? = nil,
        title: String? = nil,
        totals: [LineItemTotal]? = nil
    ) -> FulfillmentOption {
        return FulfillmentOption(
            carrier: carrier ?? self.carrier,
            description: description ?? self.description,
            earliestFulfillmentTime: earliestFulfillmentTime ?? self.earliestFulfillmentTime,
            id: id ?? self.id,
            latestFulfillmentTime: latestFulfillmentTime ?? self.latestFulfillmentTime,
            title: title ?? self.title,
            totals: totals ?? self.totals
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Maps a request identifier to the variant it resolved to, with match semantics.
// MARK: - InputCorrelation
public struct InputCorrelation: Codable, Sendable {
    /// The identifier from the lookup request that resolved to this variant.
    public let id: String
    /// How the request identifier resolved to this variant. Well-known values: `exact` (input
    /// directly identifies this variant, e.g., variant ID, SKU), `featured` (server selected
    /// this variant as representative, e.g., product ID resolved to best match). Businesses MAY
    /// implement and provide additional resolution strategies.
    public let match: String?

    public init(id: String, match: String?) {
        self.id = id
        self.match = match
    }
}

// MARK: InputCorrelation convenience initializers and mutators

public extension InputCorrelation {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(InputCorrelation.self, from: data)
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

    func with(
        id: String? = nil,
        match: String?? = nil
    ) -> InputCorrelation {
        return InputCorrelation(
            id: id ?? self.id,
            match: match ?? self.match
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A constraint within an allowed combination that defines which instrument types can fill
/// this group and how many are permitted.
// MARK: - InstrumentGroup
public struct InstrumentGroup: Codable, Sendable {
    /// Maximum number of instruments allowed from this group. Defaults to 1. MUST be greater
    /// than or equal to `min`.
    public let max: Int?
    /// Minimum number of instruments required from this group. Defaults to 0 (optional).
    public let min: Int?
    /// Instrument types accepted by this group (OR logic). Any listed type qualifies.
    public let types: [String]

    public init(max: Int?, min: Int?, types: [String]) {
        self.max = max
        self.min = min
        self.types = types
    }
}

// MARK: InstrumentGroup convenience initializers and mutators

public extension InstrumentGroup {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(InstrumentGroup.self, from: data)
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

    func with(
        max: Int?? = nil,
        min: Int?? = nil,
        types: [String]? = nil
    ) -> InstrumentGroup {
        return InstrumentGroup(
            max: max ?? self.max,
            min: min ?? self.min,
            types: types ?? self.types
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - Item
public struct Item: Codable, Sendable {
    /// The product identifier, often the SKU, required to resolve the product details associated
    /// with this line item. Should be recognized by both the Platform, and the Business.
    public let id: String
    /// Product image URI.
    public let imageURL: String?
    /// Unit price in ISO 4217 minor units.
    public let price: Int
    /// Product title.
    public let title: String

    public enum CodingKeys: String, CodingKey {
        case id
        case imageURL = "image_url"
        case price, title
    }

    public init(id: String, imageURL: String?, price: Int, title: String) {
        self.id = id
        self.imageURL = imageURL
        self.price = price
        self.title = title
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

    func with(
        id: String? = nil,
        imageURL: String?? = nil,
        price: Int? = nil,
        title: String? = nil
    ) -> Item {
        return Item(
            id: id ?? self.id,
            imageURL: imageURL ?? self.imageURL,
            price: price ?? self.price,
            title: title ?? self.title
        )
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
    public let id: String
    public let item: ItemClass
    /// Parent line item identifier for any nested structures.
    public let parentID: String?
    /// Quantity of the item being purchased.
    public let quantity: Int
    /// Line item totals breakdown.
    public let totals: [LineItemTotal]

    public enum CodingKeys: String, CodingKey {
        case id, item
        case parentID = "parent_id"
        case quantity, totals
    }

    public init(id: String, item: ItemClass, parentID: String?, quantity: Int, totals: [LineItemTotal]) {
        self.id = id
        self.item = item
        self.parentID = parentID
        self.quantity = quantity
        self.totals = totals
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

    func with(
        id: String? = nil,
        item: ItemClass? = nil,
        parentID: String?? = nil,
        quantity: Int? = nil,
        totals: [LineItemTotal]? = nil
    ) -> LineItem {
        return LineItem(
            id: id ?? self.id,
            item: item ?? self.item,
            parentID: parentID ?? self.parentID,
            quantity: quantity ?? self.quantity,
            totals: totals ?? self.totals
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Merchant's fulfillment configuration.
// MARK: - MerchantFulfillmentConfig
public struct MerchantFulfillmentConfig: Codable, Sendable {
    /// Allowed method type combinations.
    public let allowsMethodCombinations: [[TypeElement]]?
    /// Permits multiple destinations per method type.
    public let allowsMultiDestination: MerchantFulfillmentConfigAllowsMultiDestination?

    public enum CodingKeys: String, CodingKey {
        case allowsMethodCombinations = "allows_method_combinations"
        case allowsMultiDestination = "allows_multi_destination"
    }

    public init(allowsMethodCombinations: [[TypeElement]]?, allowsMultiDestination: MerchantFulfillmentConfigAllowsMultiDestination?) {
        self.allowsMethodCombinations = allowsMethodCombinations
        self.allowsMultiDestination = allowsMultiDestination
    }
}

// MARK: MerchantFulfillmentConfig convenience initializers and mutators

public extension MerchantFulfillmentConfig {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(MerchantFulfillmentConfig.self, from: data)
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

    func with(
        allowsMethodCombinations: [[TypeElement]]?? = nil,
        allowsMultiDestination: MerchantFulfillmentConfigAllowsMultiDestination?? = nil
    ) -> MerchantFulfillmentConfig {
        return MerchantFulfillmentConfig(
            allowsMethodCombinations: allowsMethodCombinations ?? self.allowsMethodCombinations,
            allowsMultiDestination: allowsMultiDestination ?? self.allowsMultiDestination
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Permits multiple destinations per method type.
// MARK: - MerchantFulfillmentConfigAllowsMultiDestination
public struct MerchantFulfillmentConfigAllowsMultiDestination: Codable, Sendable {
    /// Multiple pickup locations allowed.
    public let pickup: Bool?
    /// Multiple shipping destinations allowed.
    public let shipping: Bool?

    public init(pickup: Bool?, shipping: Bool?) {
        self.pickup = pickup
        self.shipping = shipping
    }
}

// MARK: MerchantFulfillmentConfigAllowsMultiDestination convenience initializers and mutators

public extension MerchantFulfillmentConfigAllowsMultiDestination {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(MerchantFulfillmentConfigAllowsMultiDestination.self, from: data)
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

    func with(
        pickup: Bool?? = nil,
        shipping: Bool?? = nil
    ) -> MerchantFulfillmentConfigAllowsMultiDestination {
        return MerchantFulfillmentConfigAllowsMultiDestination(
            pickup: pickup ?? self.pickup,
            shipping: shipping ?? self.shipping
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A selectable value for a product option.
// MARK: - OptionValue
public struct OptionValue: Codable, Sendable {
    /// Optional server-assigned identifier for this option value. When present in a
    /// selected_option, the server SHOULD use it for matching instead of label.
    public let id: String?
    /// Display text for this option value (e.g., 'Small', 'Blue').
    public let label: String

    public init(id: String?, label: String) {
        self.id = id
        self.label = label
    }
}

// MARK: OptionValue convenience initializers and mutators

public extension OptionValue {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(OptionValue.self, from: data)
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

    func with(
        id: String?? = nil,
        label: String? = nil
    ) -> OptionValue {
        return OptionValue(
            id: id ?? self.id,
            label: label ?? self.label
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Order details available at the time of checkout completion.
// MARK: - OrderConfirmation
public struct OrderConfirmation: Codable, Sendable {
    /// Unique order identifier.
    public let id: String
    /// Human-readable label for identifying the order. MUST only be provided by the business.
    public let label: String?
    /// Permalink to access the order on merchant site.
    public let permalinkURL: String

    public enum CodingKeys: String, CodingKey {
        case id, label
        case permalinkURL = "permalink_url"
    }

    public init(id: String, label: String?, permalinkURL: String) {
        self.id = id
        self.label = label
        self.permalinkURL = permalinkURL
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

    func with(
        id: String? = nil,
        label: String?? = nil,
        permalinkURL: String? = nil
    ) -> OrderConfirmation {
        return OrderConfirmation(
            id: id ?? self.id,
            label: label ?? self.label,
            permalinkURL: permalinkURL ?? self.permalinkURL
        )
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
    public let id: String
    /// Product data (id, title, price, image_url).
    public let item: ItemClass
    /// Parent line item identifier for any nested structures.
    public let parentID: String?
    /// Quantity tracking for the line item.
    public let quantity: OrderLineItemQuantity
    /// Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
    /// quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
    /// quantity.fulfilled > 0, otherwise processing.
    public let status: OrderLineItemStatus
    /// Line item totals breakdown.
    public let totals: [LineItemTotal]

    public enum CodingKeys: String, CodingKey {
        case id, item
        case parentID = "parent_id"
        case quantity, status, totals
    }

    public init(id: String, item: ItemClass, parentID: String?, quantity: OrderLineItemQuantity, status: OrderLineItemStatus, totals: [LineItemTotal]) {
        self.id = id
        self.item = item
        self.parentID = parentID
        self.quantity = quantity
        self.status = status
        self.totals = totals
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

    func with(
        id: String? = nil,
        item: ItemClass? = nil,
        parentID: String?? = nil,
        quantity: OrderLineItemQuantity? = nil,
        status: OrderLineItemStatus? = nil,
        totals: [LineItemTotal]? = nil
    ) -> OrderLineItem {
        return OrderLineItem(
            id: id ?? self.id,
            item: item ?? self.item,
            parentID: parentID ?? self.parentID,
            quantity: quantity ?? self.quantity,
            status: status ?? self.status,
            totals: totals ?? self.totals
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Quantity tracking for the line item.
// MARK: - OrderLineItemQuantity
public struct OrderLineItemQuantity: Codable, Sendable {
    /// Quantity fulfilled so far.
    public let fulfilled: Int
    /// Quantity from the original checkout.
    public let original: Int?
    /// Current total active quantity. May differ from original due to post-order modifications
    /// (e.g., returns or cancellations).
    public let total: Int

    public init(fulfilled: Int, original: Int?, total: Int) {
        self.fulfilled = fulfilled
        self.original = original
        self.total = total
    }
}

// MARK: OrderLineItemQuantity convenience initializers and mutators

public extension OrderLineItemQuantity {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(OrderLineItemQuantity.self, from: data)
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

    func with(
        fulfilled: Int? = nil,
        original: Int?? = nil,
        total: Int? = nil
    ) -> OrderLineItemQuantity {
        return OrderLineItemQuantity(
            fulfilled: fulfilled ?? self.fulfilled,
            original: original ?? self.original,
            total: total ?? self.total
        )
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
public enum OrderLineItemStatus: String, Codable, Sendable {
    case fulfilled = "fulfilled"
    case partial = "partial"
    case processing = "processing"
    case removed = "removed"
}

/// The base definition for any payment credential. Handlers define specific credential types.
// MARK: - PaymentCredential
public struct PaymentCredential: Codable, Sendable {
    /// The credential type discriminator. Specific schemas will constrain this to a constant
    /// value.
    public let type: String

    public init(type: String) {
        self.type = type
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

    func with(
        type: String? = nil
    ) -> PaymentCredential {
        return PaymentCredential(
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Identity of a participant for token binding. The access_token uniquely identifies the
/// participant who tokens should be bound to.
// MARK: - PaymentIdentity
public struct PaymentIdentity: Codable, Sendable {
    /// Unique identifier for this participant, obtained during onboarding with the tokenizer.
    public let accessToken: String

    public enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
    }

    public init(accessToken: String) {
        self.accessToken = accessToken
    }
}

// MARK: PaymentIdentity convenience initializers and mutators

public extension PaymentIdentity {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PaymentIdentity.self, from: data)
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

    func with(
        accessToken: String? = nil
    ) -> PaymentIdentity {
        return PaymentIdentity(
            accessToken: accessToken ?? self.accessToken
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// The base definition for any payment instrument. It links the instrument to a specific
/// payment handler.
// MARK: - PaymentInstrument
public struct PaymentInstrument: Codable, Sendable {
    /// The billing address associated with this payment method.
    public let billingAddress: PostalAddress?
    public let credential: CredentialClass?
    /// Display information for this payment instrument. Each payment instrument schema defines
    /// its specific display properties, as outlined by the payment handler.
    public let display: [String: JSONAny]?
    /// The unique identifier for the handler instance that produced this instrument. This
    /// corresponds to the 'id' field in the Payment Handler definition.
    public let handlerID: String
    /// A unique identifier for this instrument instance, assigned by the platform.
    public let id: String
    /// The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
    /// will constrain this to a constant value.
    public let type: String

    public enum CodingKeys: String, CodingKey {
        case billingAddress = "billing_address"
        case credential, display
        case handlerID = "handler_id"
        case id, type
    }

    public init(billingAddress: PostalAddress?, credential: CredentialClass?, display: [String: JSONAny]?, handlerID: String, id: String, type: String) {
        self.billingAddress = billingAddress
        self.credential = credential
        self.display = display
        self.handlerID = handlerID
        self.id = id
        self.type = type
    }
}

// MARK: PaymentInstrument convenience initializers and mutators

public extension PaymentInstrument {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PaymentInstrument.self, from: data)
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

    func with(
        billingAddress: PostalAddress?? = nil,
        credential: CredentialClass?? = nil,
        display: [String: JSONAny]?? = nil,
        handlerID: String? = nil,
        id: String? = nil,
        type: String? = nil
    ) -> PaymentInstrument {
        return PaymentInstrument(
            billingAddress: billingAddress ?? self.billingAddress,
            credential: credential ?? self.credential,
            display: display ?? self.display,
            handlerID: handlerID ?? self.handlerID,
            id: id ?? self.id,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Platform's fulfillment configuration.
// MARK: - PlatformFulfillmentConfig
public struct PlatformFulfillmentConfig: Codable, Sendable {
    /// Enables multiple groups per method.
    public let supportsMultiGroup: Bool?

    public enum CodingKeys: String, CodingKey {
        case supportsMultiGroup = "supports_multi_group"
    }

    public init(supportsMultiGroup: Bool?) {
        self.supportsMultiGroup = supportsMultiGroup
    }
}

// MARK: PlatformFulfillmentConfig convenience initializers and mutators

public extension PlatformFulfillmentConfig {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PlatformFulfillmentConfig.self, from: data)
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

    func with(
        supportsMultiGroup: Bool?? = nil
    ) -> PlatformFulfillmentConfig {
        return PlatformFulfillmentConfig(
            supportsMultiGroup: supportsMultiGroup ?? self.supportsMultiGroup
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Price range filter denominated in context.currency. When context.currency matches the
/// presentment currency, businesses apply the filter directly. When it differs, businesses
/// SHOULD convert filter values to the presentment currency before applying; if conversion
/// is not supported, businesses MAY ignore the filter and SHOULD indicate this via a
/// message. When context.currency is absent, filter denomination is ambiguous and businesses
/// MAY ignore it.
// MARK: - PriceFilter
public struct PriceFilter: Codable, Sendable {
    /// Maximum price in ISO 4217 minor units.
    public let max: Int?
    /// Minimum price in ISO 4217 minor units.
    public let min: Int?

    public init(max: Int?, min: Int?) {
        self.max = max
        self.min = min
    }
}

// MARK: PriceFilter convenience initializers and mutators

public extension PriceFilter {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PriceFilter.self, from: data)
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

    func with(
        max: Int?? = nil,
        min: Int?? = nil
    ) -> PriceFilter {
        return PriceFilter(
            max: max ?? self.max,
            min: min ?? self.min
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A price range representing minimum and maximum values (e.g., across product variants).
// MARK: - PriceRange
public struct PriceRange: Codable, Sendable {
    /// Maximum price in the range.
    public let max: Price
    /// Minimum price in the range.
    public let min: Price

    public init(max: Price, min: Price) {
        self.max = max
        self.min = min
    }
}

// MARK: PriceRange convenience initializers and mutators

public extension PriceRange {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PriceRange.self, from: data)
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

    func with(
        max: Price? = nil,
        min: Price? = nil
    ) -> PriceRange {
        return PriceRange(
            max: max ?? self.max,
            min: min ?? self.min
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Maximum price in the range.
///
/// Price with explicit currency.
///
/// Minimum price in the range.
///
/// List price before discounts (for strikethrough display).
///
/// Current selling price.
// MARK: - Price
public struct Price: Codable, Sendable {
    /// Amount in ISO 4217 minor units. Use 0 for free items.
    public let amount: Int
    /// ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP').
    public let currency: String

    public init(amount: Int, currency: String) {
        self.amount = amount
        self.currency = currency
    }
}

// MARK: Price convenience initializers and mutators

public extension Price {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Price.self, from: data)
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

    func with(
        amount: Int? = nil,
        currency: String? = nil
    ) -> Price {
        return Price(
            amount: amount ?? self.amount,
            currency: currency ?? self.currency
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A product in the catalog with variants and options.
// MARK: - Product
public struct Product: Codable, Sendable {
    /// Product categories with optional taxonomy identifiers.
    public let categories: [CategoryElement]?
    /// Product description in one or more formats.
    public let description: Description
    /// URL-safe slug for SEO-friendly URLs (e.g., 'blue-runner-pro'). Use id for stable API
    /// references.
    public let handle: String?
    /// Global ID (GID) uniquely identifying this product.
    public let id: String
    /// List price range before discounts (for strikethrough display).
    public let listPriceRange: ListPriceRangeClass?
    /// Product media (images, videos, 3D models). First item is the featured media for listings.
    public let media: [Media]?
    /// Business-defined custom data extending the standard product model.
    public let metadata: [String: JSONAny]?
    /// Product options (Size, Color, etc.).
    public let options: [OptionClass]?
    /// Price range across all variants.
    public let priceRange: ListPriceRangeClass
    /// Aggregate product rating.
    public let rating: RatingClass?
    /// Product tags for categorization and search.
    public let tags: [String]?
    /// Product title.
    public let title: String
    /// Canonical product page URL.
    public let url: String?
    /// Purchasable variants of this product. First item is the featured variant for listings.
    public let variants: [VariantElement]

    public enum CodingKeys: String, CodingKey {
        case categories, description, handle, id
        case listPriceRange = "list_price_range"
        case media, metadata, options
        case priceRange = "price_range"
        case rating, tags, title, url, variants
    }

    public init(categories: [CategoryElement]?, description: Description, handle: String?, id: String, listPriceRange: ListPriceRangeClass?, media: [Media]?, metadata: [String: JSONAny]?, options: [OptionClass]?, priceRange: ListPriceRangeClass, rating: RatingClass?, tags: [String]?, title: String, url: String?, variants: [VariantElement]) {
        self.categories = categories
        self.description = description
        self.handle = handle
        self.id = id
        self.listPriceRange = listPriceRange
        self.media = media
        self.metadata = metadata
        self.options = options
        self.priceRange = priceRange
        self.rating = rating
        self.tags = tags
        self.title = title
        self.url = url
        self.variants = variants
    }
}

// MARK: Product convenience initializers and mutators

public extension Product {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Product.self, from: data)
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

    func with(
        categories: [CategoryElement]?? = nil,
        description: Description? = nil,
        handle: String?? = nil,
        id: String? = nil,
        listPriceRange: ListPriceRangeClass?? = nil,
        media: [Media]?? = nil,
        metadata: [String: JSONAny]?? = nil,
        options: [OptionClass]?? = nil,
        priceRange: ListPriceRangeClass? = nil,
        rating: RatingClass?? = nil,
        tags: [String]?? = nil,
        title: String? = nil,
        url: String?? = nil,
        variants: [VariantElement]? = nil
    ) -> Product {
        return Product(
            categories: categories ?? self.categories,
            description: description ?? self.description,
            handle: handle ?? self.handle,
            id: id ?? self.id,
            listPriceRange: listPriceRange ?? self.listPriceRange,
            media: media ?? self.media,
            metadata: metadata ?? self.metadata,
            options: options ?? self.options,
            priceRange: priceRange ?? self.priceRange,
            rating: rating ?? self.rating,
            tags: tags ?? self.tags,
            title: title ?? self.title,
            url: url ?? self.url,
            variants: variants ?? self.variants
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A product category with optional taxonomy identifier.
// MARK: - CategoryElement
public struct CategoryElement: Codable, Sendable {
    /// Source taxonomy. Well-known values: `google_product_category`, `shopify`, `merchant`.
    public let taxonomy: String?
    /// Category value or path (e.g., 'Apparel > Shirts', '1604').
    public let value: String

    public init(taxonomy: String?, value: String) {
        self.taxonomy = taxonomy
        self.value = value
    }
}

// MARK: CategoryElement convenience initializers and mutators

public extension CategoryElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CategoryElement.self, from: data)
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

    func with(
        taxonomy: String?? = nil,
        value: String? = nil
    ) -> CategoryElement {
        return CategoryElement(
            taxonomy: taxonomy ?? self.taxonomy,
            value: value ?? self.value
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Product description in one or more formats.
///
/// Description content in one or more formats. At least one format must be provided.
///
/// Variant description in one or more formats.
// MARK: - Description
public struct Description: Codable, Sendable {
    /// HTML-formatted content. Security: Platforms MUST sanitize before rendering—strip scripts,
    /// event handlers, and untrusted elements. Treat all rich text as untrusted input.
    public let html: String?
    /// Markdown-formatted content.
    public let markdown: String?
    /// Plain text content.
    public let plain: String?

    public init(html: String?, markdown: String?, plain: String?) {
        self.html = html
        self.markdown = markdown
        self.plain = plain
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

    func with(
        html: String?? = nil,
        markdown: String?? = nil,
        plain: String?? = nil
    ) -> Description {
        return Description(
            html: html ?? self.html,
            markdown: markdown ?? self.markdown,
            plain: plain ?? self.plain
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// List price range before discounts (for strikethrough display).
///
/// A price range representing minimum and maximum values (e.g., across product variants).
///
/// Price range across all variants.
// MARK: - ListPriceRangeClass
public struct ListPriceRangeClass: Codable, Sendable {
    /// Maximum price in the range.
    public let max: Price
    /// Minimum price in the range.
    public let min: Price

    public init(max: Price, min: Price) {
        self.max = max
        self.min = min
    }
}

// MARK: ListPriceRangeClass convenience initializers and mutators

public extension ListPriceRangeClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ListPriceRangeClass.self, from: data)
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

    func with(
        max: Price? = nil,
        min: Price? = nil
    ) -> ListPriceRangeClass {
        return ListPriceRangeClass(
            max: max ?? self.max,
            min: min ?? self.min
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Media item (image, video, etc.).
// MARK: - Media
public struct Media: Codable, Sendable {
    /// Accessibility text describing the media.
    public let altText: String?
    /// Height in pixels (for images/video).
    public let height: Int?
    /// Media type. Well-known values: `image`, `video`, `model_3d`.
    public let type: String
    /// URL to the media resource.
    public let url: String
    /// Width in pixels (for images/video).
    public let width: Int?

    public enum CodingKeys: String, CodingKey {
        case altText = "alt_text"
        case height, type, url, width
    }

    public init(altText: String?, height: Int?, type: String, url: String, width: Int?) {
        self.altText = altText
        self.height = height
        self.type = type
        self.url = url
        self.width = width
    }
}

// MARK: Media convenience initializers and mutators

public extension Media {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Media.self, from: data)
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

    func with(
        altText: String?? = nil,
        height: Int?? = nil,
        type: String? = nil,
        url: String? = nil,
        width: Int?? = nil
    ) -> Media {
        return Media(
            altText: altText ?? self.altText,
            height: height ?? self.height,
            type: type ?? self.type,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A product option such as size, color, or material.
// MARK: - OptionClass
public struct OptionClass: Codable, Sendable {
    /// Option name (e.g., 'Size', 'Color').
    public let name: String
    /// Available values for this option.
    public let values: [ValueElement]

    public init(name: String, values: [ValueElement]) {
        self.name = name
        self.values = values
    }
}

// MARK: OptionClass convenience initializers and mutators

public extension OptionClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(OptionClass.self, from: data)
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

    func with(
        name: String? = nil,
        values: [ValueElement]? = nil
    ) -> OptionClass {
        return OptionClass(
            name: name ?? self.name,
            values: values ?? self.values
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A selectable value for a product option.
// MARK: - ValueElement
public struct ValueElement: Codable, Sendable {
    /// Optional server-assigned identifier for this option value. When present in a
    /// selected_option, the server SHOULD use it for matching instead of label.
    public let id: String?
    /// Display text for this option value (e.g., 'Small', 'Blue').
    public let label: String

    public init(id: String?, label: String) {
        self.id = id
        self.label = label
    }
}

// MARK: ValueElement convenience initializers and mutators

public extension ValueElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ValueElement.self, from: data)
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

    func with(
        id: String?? = nil,
        label: String? = nil
    ) -> ValueElement {
        return ValueElement(
            id: id ?? self.id,
            label: label ?? self.label
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Aggregate product rating.
///
/// Product rating aggregate.
///
/// Variant rating.
// MARK: - RatingClass
public struct RatingClass: Codable, Sendable {
    /// Number of reviews contributing to the rating.
    public let count: Int?
    /// Maximum value on the rating scale (e.g., 5 for 5-star).
    public let scaleMax: Double
    /// Minimum value on the rating scale (e.g., 1 for 1-5 stars).
    public let scaleMin: Double?
    /// Average rating value.
    public let value: Double

    public enum CodingKeys: String, CodingKey {
        case count
        case scaleMax = "scale_max"
        case scaleMin = "scale_min"
        case value
    }

    public init(count: Int?, scaleMax: Double, scaleMin: Double?, value: Double) {
        self.count = count
        self.scaleMax = scaleMax
        self.scaleMin = scaleMin
        self.value = value
    }
}

// MARK: RatingClass convenience initializers and mutators

public extension RatingClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(RatingClass.self, from: data)
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

    func with(
        count: Int?? = nil,
        scaleMax: Double? = nil,
        scaleMin: Double?? = nil,
        value: Double? = nil
    ) -> RatingClass {
        return RatingClass(
            count: count ?? self.count,
            scaleMax: scaleMax ?? self.scaleMax,
            scaleMin: scaleMin ?? self.scaleMin,
            value: value ?? self.value
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A purchasable variant of a product with specific option selections.
// MARK: - VariantElement
public struct VariantElement: Codable, Sendable {
    /// Variant availability for purchase.
    public let availability: VariantAvailability?
    /// Industry-standard product identifiers for cross-reference and correlation.
    public let barcodes: [VariantBarcode]?
    /// Variant categories with optional taxonomy identifiers.
    public let categories: [CategoryElement]?
    /// Variant description in one or more formats.
    public let description: Description
    /// URL-safe variant handle/slug.
    public let handle: String?
    /// Global ID (GID) uniquely identifying this variant. Used as item.id in checkout.
    public let id: String
    /// List price before discounts (for strikethrough display).
    public let listPrice: Price?
    /// Variant media (images, videos, 3D models). First item is the featured media for listings.
    public let media: [Media]?
    /// Business-defined custom data extending the standard variant model.
    public let metadata: [String: JSONAny]?
    /// Option values that define this variant (e.g., Color: Blue, Size: Large).
    public let options: [VariantOption]?
    /// Current selling price.
    public let price: Price
    /// Variant rating.
    public let rating: RatingClass?
    /// Optional seller context for this variant.
    public let seller: VariantSeller?
    /// Business-assigned identifier for inventory and fulfillment.
    public let sku: String?
    /// Variant tags for categorization and search.
    public let tags: [String]?
    /// Variant display title (e.g., 'Blue / Large').
    public let title: String
    /// Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
    public let unitPrice: VariantUnitPrice?
    /// Canonical variant page URL.
    public let url: String?

    public enum CodingKeys: String, CodingKey {
        case availability, barcodes, categories, description, handle, id
        case listPrice = "list_price"
        case media, metadata, options, price, rating, seller, sku, tags, title
        case unitPrice = "unit_price"
        case url
    }

    public init(availability: VariantAvailability?, barcodes: [VariantBarcode]?, categories: [CategoryElement]?, description: Description, handle: String?, id: String, listPrice: Price?, media: [Media]?, metadata: [String: JSONAny]?, options: [VariantOption]?, price: Price, rating: RatingClass?, seller: VariantSeller?, sku: String?, tags: [String]?, title: String, unitPrice: VariantUnitPrice?, url: String?) {
        self.availability = availability
        self.barcodes = barcodes
        self.categories = categories
        self.description = description
        self.handle = handle
        self.id = id
        self.listPrice = listPrice
        self.media = media
        self.metadata = metadata
        self.options = options
        self.price = price
        self.rating = rating
        self.seller = seller
        self.sku = sku
        self.tags = tags
        self.title = title
        self.unitPrice = unitPrice
        self.url = url
    }
}

// MARK: VariantElement convenience initializers and mutators

public extension VariantElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(VariantElement.self, from: data)
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

    func with(
        availability: VariantAvailability?? = nil,
        barcodes: [VariantBarcode]?? = nil,
        categories: [CategoryElement]?? = nil,
        description: Description? = nil,
        handle: String?? = nil,
        id: String? = nil,
        listPrice: Price?? = nil,
        media: [Media]?? = nil,
        metadata: [String: JSONAny]?? = nil,
        options: [VariantOption]?? = nil,
        price: Price? = nil,
        rating: RatingClass?? = nil,
        seller: VariantSeller?? = nil,
        sku: String?? = nil,
        tags: [String]?? = nil,
        title: String? = nil,
        unitPrice: VariantUnitPrice?? = nil,
        url: String?? = nil
    ) -> VariantElement {
        return VariantElement(
            availability: availability ?? self.availability,
            barcodes: barcodes ?? self.barcodes,
            categories: categories ?? self.categories,
            description: description ?? self.description,
            handle: handle ?? self.handle,
            id: id ?? self.id,
            listPrice: listPrice ?? self.listPrice,
            media: media ?? self.media,
            metadata: metadata ?? self.metadata,
            options: options ?? self.options,
            price: price ?? self.price,
            rating: rating ?? self.rating,
            seller: seller ?? self.seller,
            sku: sku ?? self.sku,
            tags: tags ?? self.tags,
            title: title ?? self.title,
            unitPrice: unitPrice ?? self.unitPrice,
            url: url ?? self.url
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Variant availability for purchase.
// MARK: - VariantAvailability
public struct VariantAvailability: Codable, Sendable {
    /// Whether this variant can be purchased. See status for fulfillment details.
    public let available: Bool?
    /// Qualifies available with fulfillment state. Well-known values: `in_stock`, `backorder`,
    /// `preorder`, `out_of_stock`, `discontinued`.
    public let status: String?

    public init(available: Bool?, status: String?) {
        self.available = available
        self.status = status
    }
}

// MARK: VariantAvailability convenience initializers and mutators

public extension VariantAvailability {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(VariantAvailability.self, from: data)
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

    func with(
        available: Bool?? = nil,
        status: String?? = nil
    ) -> VariantAvailability {
        return VariantAvailability(
            available: available ?? self.available,
            status: status ?? self.status
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - VariantBarcode
public struct VariantBarcode: Codable, Sendable {
    /// Barcode standard. Well-known values: UPC, EAN, ISBN, GTIN, JAN.
    public let type: String
    /// Barcode value.
    public let value: String

    public init(type: String, value: String) {
        self.type = type
        self.value = value
    }
}

// MARK: VariantBarcode convenience initializers and mutators

public extension VariantBarcode {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(VariantBarcode.self, from: data)
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

    func with(
        type: String? = nil,
        value: String? = nil
    ) -> VariantBarcode {
        return VariantBarcode(
            type: type ?? self.type,
            value: value ?? self.value
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A specific option selection on a variant (e.g., Size: Large).
// MARK: - VariantOption
public struct VariantOption: Codable, Sendable {
    /// Optional option value identifier from option_value.id. When present, the server SHOULD
    /// use it for matching; name and label remain required for display.
    public let id: String?
    /// Selected option label (e.g., 'Large').
    public let label: String
    /// Option name (e.g., 'Size').
    public let name: String

    public init(id: String?, label: String, name: String) {
        self.id = id
        self.label = label
        self.name = name
    }
}

// MARK: VariantOption convenience initializers and mutators

public extension VariantOption {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(VariantOption.self, from: data)
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

    func with(
        id: String?? = nil,
        label: String? = nil,
        name: String? = nil
    ) -> VariantOption {
        return VariantOption(
            id: id ?? self.id,
            label: label ?? self.label,
            name: name ?? self.name
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Optional seller context for this variant.
// MARK: - VariantSeller
public struct VariantSeller: Codable, Sendable {
    /// Seller policy and information links.
    public let links: [Link]?
    /// Seller display name.
    public let name: String?

    public init(links: [Link]?, name: String?) {
        self.links = links
        self.name = name
    }
}

// MARK: VariantSeller convenience initializers and mutators

public extension VariantSeller {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(VariantSeller.self, from: data)
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

    func with(
        links: [Link]?? = nil,
        name: String?? = nil
    ) -> VariantSeller {
        return VariantSeller(
            links: links ?? self.links,
            name: name ?? self.name
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
// MARK: - VariantUnitPrice
public struct VariantUnitPrice: Codable, Sendable {
    /// Unit price in ISO 4217 minor units. Business MUST return precomputed unit price value:
    /// (variant.price / measure.value) * reference.value.
    public let amount: Int
    /// ISO 4217 currency code.
    public let currency: String
    /// Product quantity in packaging (e.g., 750ml bottle).
    public let measure: PurpleMeasure
    /// Denominator for unit price display (e.g., per 100ml, per 1kg).
    public let reference: PurpleReference

    public init(amount: Int, currency: String, measure: PurpleMeasure, reference: PurpleReference) {
        self.amount = amount
        self.currency = currency
        self.measure = measure
        self.reference = reference
    }
}

// MARK: VariantUnitPrice convenience initializers and mutators

public extension VariantUnitPrice {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(VariantUnitPrice.self, from: data)
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

    func with(
        amount: Int? = nil,
        currency: String? = nil,
        measure: PurpleMeasure? = nil,
        reference: PurpleReference? = nil
    ) -> VariantUnitPrice {
        return VariantUnitPrice(
            amount: amount ?? self.amount,
            currency: currency ?? self.currency,
            measure: measure ?? self.measure,
            reference: reference ?? self.reference
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Product quantity in packaging (e.g., 750ml bottle).
// MARK: - PurpleMeasure
public struct PurpleMeasure: Codable, Sendable {
    /// Unit of measurement.
    public let unit: String
    /// Package quantity.
    public let value: Double

    public init(unit: String, value: Double) {
        self.unit = unit
        self.value = value
    }
}

// MARK: PurpleMeasure convenience initializers and mutators

public extension PurpleMeasure {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PurpleMeasure.self, from: data)
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

    func with(
        unit: String? = nil,
        value: Double? = nil
    ) -> PurpleMeasure {
        return PurpleMeasure(
            unit: unit ?? self.unit,
            value: value ?? self.value
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Denominator for unit price display (e.g., per 100ml, per 1kg).
// MARK: - PurpleReference
public struct PurpleReference: Codable, Sendable {
    /// Unit of measurement.
    public let unit: String
    /// Reference quantity.
    public let value: Int

    public init(unit: String, value: Int) {
        self.unit = unit
        self.value = value
    }
}

// MARK: PurpleReference convenience initializers and mutators

public extension PurpleReference {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PurpleReference.self, from: data)
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

    func with(
        unit: String? = nil,
        value: Int? = nil
    ) -> PurpleReference {
        return PurpleReference(
            unit: unit ?? self.unit,
            value: value ?? self.value
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A product option such as size, color, or material.
// MARK: - ProductOption
public struct ProductOption: Codable, Sendable {
    /// Option name (e.g., 'Size', 'Color').
    public let name: String
    /// Available values for this option.
    public let values: [ValueElement]

    public init(name: String, values: [ValueElement]) {
        self.name = name
        self.values = values
    }
}

// MARK: ProductOption convenience initializers and mutators

public extension ProductOption {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ProductOption.self, from: data)
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

    func with(
        name: String? = nil,
        values: [ValueElement]? = nil
    ) -> ProductOption {
        return ProductOption(
            name: name ?? self.name,
            values: values ?? self.values
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Product rating aggregate.
// MARK: - Rating
public struct Rating: Codable, Sendable {
    /// Number of reviews contributing to the rating.
    public let count: Int?
    /// Maximum value on the rating scale (e.g., 5 for 5-star).
    public let scaleMax: Double
    /// Minimum value on the rating scale (e.g., 1 for 1-5 stars).
    public let scaleMin: Double?
    /// Average rating value.
    public let value: Double

    public enum CodingKeys: String, CodingKey {
        case count
        case scaleMax = "scale_max"
        case scaleMin = "scale_min"
        case value
    }

    public init(count: Int?, scaleMax: Double, scaleMin: Double?, value: Double) {
        self.count = count
        self.scaleMax = scaleMax
        self.scaleMin = scaleMin
        self.value = value
    }
}

// MARK: Rating convenience initializers and mutators

public extension Rating {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Rating.self, from: data)
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

    func with(
        count: Int?? = nil,
        scaleMax: Double? = nil,
        scaleMin: Double?? = nil,
        value: Double? = nil
    ) -> Rating {
        return Rating(
            count: count ?? self.count,
            scaleMax: scaleMax ?? self.scaleMax,
            scaleMin: scaleMin ?? self.scaleMin,
            value: value ?? self.value
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A pickup location (retail store, locker, etc.).
// MARK: - RetailLocation
public struct RetailLocation: Codable, Sendable {
    /// Physical address of the location.
    public let address: PostalAddress?
    /// Unique location identifier.
    public let id: String
    /// Location name (e.g., store name).
    public let name: String

    public init(address: PostalAddress?, id: String, name: String) {
        self.address = address
        self.id = id
        self.name = name
    }
}

// MARK: RetailLocation convenience initializers and mutators

public extension RetailLocation {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(RetailLocation.self, from: data)
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

    func with(
        address: PostalAddress?? = nil,
        id: String? = nil,
        name: String? = nil
    ) -> RetailLocation {
        return RetailLocation(
            address: address ?? self.address,
            id: id ?? self.id,
            name: name ?? self.name
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Filter criteria to narrow search results. All specified filters combine with AND logic.
// MARK: - SearchFilters
public struct SearchFilters: Codable, Sendable {
    /// Filter by product categories (OR logic — matches products in any listed categories).
    /// Values match against the value field in product category entries. Valid values can be
    /// discovered from the categories field in search results, merchant documentation, or
    /// standard taxonomies that businesses may align with.
    public let categories: [String]?
    public let price: PriceClass?

    public init(categories: [String]?, price: PriceClass?) {
        self.categories = categories
        self.price = price
    }
}

// MARK: SearchFilters convenience initializers and mutators

public extension SearchFilters {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SearchFilters.self, from: data)
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

    func with(
        categories: [String]?? = nil,
        price: PriceClass?? = nil
    ) -> SearchFilters {
        return SearchFilters(
            categories: categories ?? self.categories,
            price: price ?? self.price
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Price range filter denominated in context.currency. When context.currency matches the
/// presentment currency, businesses apply the filter directly. When it differs, businesses
/// SHOULD convert filter values to the presentment currency before applying; if conversion
/// is not supported, businesses MAY ignore the filter and SHOULD indicate this via a
/// message. When context.currency is absent, filter denomination is ambiguous and businesses
/// MAY ignore it.
// MARK: - PriceClass
public struct PriceClass: Codable, Sendable {
    /// Maximum price in ISO 4217 minor units.
    public let max: Int?
    /// Minimum price in ISO 4217 minor units.
    public let min: Int?

    public init(max: Int?, min: Int?) {
        self.max = max
        self.min = min
    }
}

// MARK: PriceClass convenience initializers and mutators

public extension PriceClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PriceClass.self, from: data)
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

    func with(
        max: Int?? = nil,
        min: Int?? = nil
    ) -> PriceClass {
        return PriceClass(
            max: max ?? self.max,
            min: min ?? self.min
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A specific option selection on a variant (e.g., Size: Large).
// MARK: - SelectedOption
public struct SelectedOption: Codable, Sendable {
    /// Optional option value identifier from option_value.id. When present, the server SHOULD
    /// use it for matching; name and label remain required for display.
    public let id: String?
    /// Selected option label (e.g., 'Large').
    public let label: String
    /// Option name (e.g., 'Size').
    public let name: String

    public init(id: String?, label: String, name: String) {
        self.id = id
        self.label = label
        self.name = name
    }
}

// MARK: SelectedOption convenience initializers and mutators

public extension SelectedOption {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SelectedOption.self, from: data)
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

    func with(
        id: String?? = nil,
        label: String? = nil,
        name: String? = nil
    ) -> SelectedOption {
        return SelectedOption(
            id: id ?? self.id,
            label: label ?? self.label,
            name: name ?? self.name
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Shipping destination.
///
/// The billing address associated with this payment method.
///
/// Delivery destination address.
///
/// Physical address of the location.
// MARK: - ShippingDestination
public struct ShippingDestination: Codable, Sendable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used.
    public let addressCountry: String?
    /// The locality in which the street address is, and which is in the region. For example,
    /// Mountain View.
    public let addressLocality: String?
    /// The region in which the locality is, and which is in the country. Required for applicable
    /// countries (i.e. state in US, province in CA). For example, California or another
    /// appropriate first-level Administrative division.
    public let addressRegion: String?
    /// An address extension such as an apartment number, C/O or alternative name.
    public let extendedAddress: String?
    /// Optional. First name of the contact associated with the address.
    public let firstName: String?
    /// Optional. Last name of the contact associated with the address.
    public let lastName: String?
    /// Optional. Phone number of the contact associated with the address.
    public let phoneNumber: String?
    /// The postal code. For example, 94043.
    public let postalCode: String?
    /// The street address.
    public let streetAddress: String?
    /// ID specific to this shipping destination.
    public let id: String

    public enum CodingKeys: String, CodingKey {
        case addressCountry = "address_country"
        case addressLocality = "address_locality"
        case addressRegion = "address_region"
        case extendedAddress = "extended_address"
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
        case postalCode = "postal_code"
        case streetAddress = "street_address"
        case id
    }

    public init(addressCountry: String?, addressLocality: String?, addressRegion: String?, extendedAddress: String?, firstName: String?, lastName: String?, phoneNumber: String?, postalCode: String?, streetAddress: String?, id: String) {
        self.addressCountry = addressCountry
        self.addressLocality = addressLocality
        self.addressRegion = addressRegion
        self.extendedAddress = extendedAddress
        self.firstName = firstName
        self.lastName = lastName
        self.phoneNumber = phoneNumber
        self.postalCode = postalCode
        self.streetAddress = streetAddress
        self.id = id
    }
}

// MARK: ShippingDestination convenience initializers and mutators

public extension ShippingDestination {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ShippingDestination.self, from: data)
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

    func with(
        addressCountry: String?? = nil,
        addressLocality: String?? = nil,
        addressRegion: String?? = nil,
        extendedAddress: String?? = nil,
        firstName: String?? = nil,
        lastName: String?? = nil,
        phoneNumber: String?? = nil,
        postalCode: String?? = nil,
        streetAddress: String?? = nil,
        id: String? = nil
    ) -> ShippingDestination {
        return ShippingDestination(
            addressCountry: addressCountry ?? self.addressCountry,
            addressLocality: addressLocality ?? self.addressLocality,
            addressRegion: addressRegion ?? self.addressRegion,
            extendedAddress: extendedAddress ?? self.extendedAddress,
            firstName: firstName ?? self.firstName,
            lastName: lastName ?? self.lastName,
            phoneNumber: phoneNumber ?? self.phoneNumber,
            postalCode: postalCode ?? self.postalCode,
            streetAddress: streetAddress ?? self.streetAddress,
            id: id ?? self.id
        )
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
// MARK: - Signals
public struct Signals: Codable, Sendable {
    /// Client's IP address (IPv4 or IPv6).
    public let devUcpBuyerIP: String?
    /// Client's HTTP User-Agent header or equivalent.
    public let devUcpUserAgent: String?

    public enum CodingKeys: String, CodingKey {
        case devUcpBuyerIP = "dev.ucp.buyer_ip"
        case devUcpUserAgent = "dev.ucp.user_agent"
    }

    public init(devUcpBuyerIP: String?, devUcpUserAgent: String?) {
        self.devUcpBuyerIP = devUcpBuyerIP
        self.devUcpUserAgent = devUcpUserAgent
    }
}

// MARK: Signals convenience initializers and mutators

public extension Signals {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Signals.self, from: data)
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

    func with(
        devUcpBuyerIP: String?? = nil,
        devUcpUserAgent: String?? = nil
    ) -> Signals {
        return Signals(
            devUcpBuyerIP: devUcpBuyerIP ?? self.devUcpBuyerIP,
            devUcpUserAgent: devUcpUserAgent ?? self.devUcpUserAgent
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Base token credential schema. Concrete payment handlers may extend this schema with
/// additional fields and define their own constraints.
///
/// The base definition for any payment credential. Handlers define specific credential types.
// MARK: - TokenCredential
public struct TokenCredential: Codable, Sendable {
    /// The credential type discriminator. Specific schemas will constrain this to a constant
    /// value.
    ///
    /// The specific type of token produced by the handler (e.g., 'stripe_token').
    public let type: String
    /// The token value.
    public let token: String

    public init(type: String, token: String) {
        self.type = type
        self.token = token
    }
}

// MARK: TokenCredential convenience initializers and mutators

public extension TokenCredential {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(TokenCredential.self, from: data)
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

    func with(
        type: String? = nil,
        token: String? = nil
    ) -> TokenCredential {
        return TokenCredential(
            type: type ?? self.type,
            token: token ?? self.token
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A cost breakdown entry with a category, amount, and optional display text.
// MARK: - Total
public struct Total: Codable, Sendable {
    public let amount: Int
    /// Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
    /// 'Delivery').
    public let displayText: String?
    /// Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
    /// fee, total. Businesses MAY use additional values.
    public let type: String

    public enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
        case type
    }

    public init(amount: Int, displayText: String?, type: String) {
        self.amount = amount
        self.displayText = displayText
        self.type = type
    }
}

// MARK: Total convenience initializers and mutators

public extension Total {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Total.self, from: data)
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

    func with(
        amount: Int? = nil,
        displayText: String?? = nil,
        type: String? = nil
    ) -> Total {
        return Total(
            amount: amount ?? self.amount,
            displayText: displayText ?? self.displayText,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Pricing breakdown provided by the business. MUST contain exactly one subtotal and one
/// total entry. Detail types (tax, fee, discount, fulfillment) may appear multiple times for
/// itemization. Platforms MUST render all entries in order using display_text and amount.
///
/// A cost breakdown entry with a category, amount, and optional display text.
// MARK: - TotalElement
public struct TotalElement: Codable, Sendable {
    public let amount: Int
    /// Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
    /// 'Delivery').
    public let displayText: String?
    /// Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
    /// fee, total. Businesses MAY use additional values.
    public let type: String
    /// Optional itemized breakdown. The parent entry is always rendered; lines are
    /// supplementary. Sum of line amounts MUST equal the parent entry amount.
    public let lines: [TotalLineClass]?

    public enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
        case type, lines
    }

    public init(amount: Int, displayText: String?, type: String, lines: [TotalLineClass]?) {
        self.amount = amount
        self.displayText = displayText
        self.type = type
        self.lines = lines
    }
}

// MARK: TotalElement convenience initializers and mutators

public extension TotalElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(TotalElement.self, from: data)
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

    func with(
        amount: Int? = nil,
        displayText: String?? = nil,
        type: String? = nil,
        lines: [TotalLineClass]?? = nil
    ) -> TotalElement {
        return TotalElement(
            amount: amount ?? self.amount,
            displayText: displayText ?? self.displayText,
            type: type ?? self.type,
            lines: lines ?? self.lines
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Sub-line entry. Additional metadata MAY be included.
// MARK: - TotalLineClass
public struct TotalLineClass: Codable, Sendable {
    public let amount: Int
    /// Human-readable label for this sub-line.
    public let displayText: String

    public enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
    }

    public init(amount: Int, displayText: String) {
        self.amount = amount
        self.displayText = displayText
    }
}

// MARK: TotalLineClass convenience initializers and mutators

public extension TotalLineClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(TotalLineClass.self, from: data)
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

    func with(
        amount: Int? = nil,
        displayText: String? = nil
    ) -> TotalLineClass {
        return TotalLineClass(
            amount: amount ?? self.amount,
            displayText: displayText ?? self.displayText
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// A purchasable variant of a product with specific option selections.
// MARK: - Variant
public struct Variant: Codable, Sendable {
    /// Variant availability for purchase.
    public let availability: VariantAvailabilityClass?
    /// Industry-standard product identifiers for cross-reference and correlation.
    public let barcodes: [VariantBarcodeClass]?
    /// Variant categories with optional taxonomy identifiers.
    public let categories: [CategoryElement]?
    /// Variant description in one or more formats.
    public let description: Description
    /// URL-safe variant handle/slug.
    public let handle: String?
    /// Global ID (GID) uniquely identifying this variant. Used as item.id in checkout.
    public let id: String
    /// List price before discounts (for strikethrough display).
    public let listPrice: Price?
    /// Variant media (images, videos, 3D models). First item is the featured media for listings.
    public let media: [Media]?
    /// Business-defined custom data extending the standard variant model.
    public let metadata: [String: JSONAny]?
    /// Option values that define this variant (e.g., Color: Blue, Size: Large).
    public let options: [VariantOption]?
    /// Current selling price.
    public let price: Price
    /// Variant rating.
    public let rating: RatingClass?
    /// Optional seller context for this variant.
    public let seller: VariantSellerClass?
    /// Business-assigned identifier for inventory and fulfillment.
    public let sku: String?
    /// Variant tags for categorization and search.
    public let tags: [String]?
    /// Variant display title (e.g., 'Blue / Large').
    public let title: String
    /// Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
    public let unitPrice: VariantUnitPriceClass?
    /// Canonical variant page URL.
    public let url: String?

    public enum CodingKeys: String, CodingKey {
        case availability, barcodes, categories, description, handle, id
        case listPrice = "list_price"
        case media, metadata, options, price, rating, seller, sku, tags, title
        case unitPrice = "unit_price"
        case url
    }

    public init(availability: VariantAvailabilityClass?, barcodes: [VariantBarcodeClass]?, categories: [CategoryElement]?, description: Description, handle: String?, id: String, listPrice: Price?, media: [Media]?, metadata: [String: JSONAny]?, options: [VariantOption]?, price: Price, rating: RatingClass?, seller: VariantSellerClass?, sku: String?, tags: [String]?, title: String, unitPrice: VariantUnitPriceClass?, url: String?) {
        self.availability = availability
        self.barcodes = barcodes
        self.categories = categories
        self.description = description
        self.handle = handle
        self.id = id
        self.listPrice = listPrice
        self.media = media
        self.metadata = metadata
        self.options = options
        self.price = price
        self.rating = rating
        self.seller = seller
        self.sku = sku
        self.tags = tags
        self.title = title
        self.unitPrice = unitPrice
        self.url = url
    }
}

// MARK: Variant convenience initializers and mutators

public extension Variant {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Variant.self, from: data)
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

    func with(
        availability: VariantAvailabilityClass?? = nil,
        barcodes: [VariantBarcodeClass]?? = nil,
        categories: [CategoryElement]?? = nil,
        description: Description? = nil,
        handle: String?? = nil,
        id: String? = nil,
        listPrice: Price?? = nil,
        media: [Media]?? = nil,
        metadata: [String: JSONAny]?? = nil,
        options: [VariantOption]?? = nil,
        price: Price? = nil,
        rating: RatingClass?? = nil,
        seller: VariantSellerClass?? = nil,
        sku: String?? = nil,
        tags: [String]?? = nil,
        title: String? = nil,
        unitPrice: VariantUnitPriceClass?? = nil,
        url: String?? = nil
    ) -> Variant {
        return Variant(
            availability: availability ?? self.availability,
            barcodes: barcodes ?? self.barcodes,
            categories: categories ?? self.categories,
            description: description ?? self.description,
            handle: handle ?? self.handle,
            id: id ?? self.id,
            listPrice: listPrice ?? self.listPrice,
            media: media ?? self.media,
            metadata: metadata ?? self.metadata,
            options: options ?? self.options,
            price: price ?? self.price,
            rating: rating ?? self.rating,
            seller: seller ?? self.seller,
            sku: sku ?? self.sku,
            tags: tags ?? self.tags,
            title: title ?? self.title,
            unitPrice: unitPrice ?? self.unitPrice,
            url: url ?? self.url
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Variant availability for purchase.
// MARK: - VariantAvailabilityClass
public struct VariantAvailabilityClass: Codable, Sendable {
    /// Whether this variant can be purchased. See status for fulfillment details.
    public let available: Bool?
    /// Qualifies available with fulfillment state. Well-known values: `in_stock`, `backorder`,
    /// `preorder`, `out_of_stock`, `discontinued`.
    public let status: String?

    public init(available: Bool?, status: String?) {
        self.available = available
        self.status = status
    }
}

// MARK: VariantAvailabilityClass convenience initializers and mutators

public extension VariantAvailabilityClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(VariantAvailabilityClass.self, from: data)
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

    func with(
        available: Bool?? = nil,
        status: String?? = nil
    ) -> VariantAvailabilityClass {
        return VariantAvailabilityClass(
            available: available ?? self.available,
            status: status ?? self.status
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - VariantBarcodeClass
public struct VariantBarcodeClass: Codable, Sendable {
    /// Barcode standard. Well-known values: UPC, EAN, ISBN, GTIN, JAN.
    public let type: String
    /// Barcode value.
    public let value: String

    public init(type: String, value: String) {
        self.type = type
        self.value = value
    }
}

// MARK: VariantBarcodeClass convenience initializers and mutators

public extension VariantBarcodeClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(VariantBarcodeClass.self, from: data)
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

    func with(
        type: String? = nil,
        value: String? = nil
    ) -> VariantBarcodeClass {
        return VariantBarcodeClass(
            type: type ?? self.type,
            value: value ?? self.value
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Optional seller context for this variant.
// MARK: - VariantSellerClass
public struct VariantSellerClass: Codable, Sendable {
    /// Seller policy and information links.
    public let links: [Link]?
    /// Seller display name.
    public let name: String?

    public init(links: [Link]?, name: String?) {
        self.links = links
        self.name = name
    }
}

// MARK: VariantSellerClass convenience initializers and mutators

public extension VariantSellerClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(VariantSellerClass.self, from: data)
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

    func with(
        links: [Link]?? = nil,
        name: String?? = nil
    ) -> VariantSellerClass {
        return VariantSellerClass(
            links: links ?? self.links,
            name: name ?? self.name
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.
// MARK: - VariantUnitPriceClass
public struct VariantUnitPriceClass: Codable, Sendable {
    /// Unit price in ISO 4217 minor units. Business MUST return precomputed unit price value:
    /// (variant.price / measure.value) * reference.value.
    public let amount: Int
    /// ISO 4217 currency code.
    public let currency: String
    /// Product quantity in packaging (e.g., 750ml bottle).
    public let measure: FluffyMeasure
    /// Denominator for unit price display (e.g., per 100ml, per 1kg).
    public let reference: FluffyReference

    public init(amount: Int, currency: String, measure: FluffyMeasure, reference: FluffyReference) {
        self.amount = amount
        self.currency = currency
        self.measure = measure
        self.reference = reference
    }
}

// MARK: VariantUnitPriceClass convenience initializers and mutators

public extension VariantUnitPriceClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(VariantUnitPriceClass.self, from: data)
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

    func with(
        amount: Int? = nil,
        currency: String? = nil,
        measure: FluffyMeasure? = nil,
        reference: FluffyReference? = nil
    ) -> VariantUnitPriceClass {
        return VariantUnitPriceClass(
            amount: amount ?? self.amount,
            currency: currency ?? self.currency,
            measure: measure ?? self.measure,
            reference: reference ?? self.reference
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Product quantity in packaging (e.g., 750ml bottle).
// MARK: - FluffyMeasure
public struct FluffyMeasure: Codable, Sendable {
    /// Unit of measurement.
    public let unit: String
    /// Package quantity.
    public let value: Double

    public init(unit: String, value: Double) {
        self.unit = unit
        self.value = value
    }
}

// MARK: FluffyMeasure convenience initializers and mutators

public extension FluffyMeasure {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FluffyMeasure.self, from: data)
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

    func with(
        unit: String? = nil,
        value: Double? = nil
    ) -> FluffyMeasure {
        return FluffyMeasure(
            unit: unit ?? self.unit,
            value: value ?? self.value
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Denominator for unit price display (e.g., per 100ml, per 1kg).
// MARK: - FluffyReference
public struct FluffyReference: Codable, Sendable {
    /// Unit of measurement.
    public let unit: String
    /// Reference quantity.
    public let value: Int

    public init(unit: String, value: Int) {
        self.unit = unit
        self.value = value
    }
}

// MARK: FluffyReference convenience initializers and mutators

public extension FluffyReference {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FluffyReference.self, from: data)
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

    func with(
        unit: String? = nil,
        value: Int? = nil
    ) -> FluffyReference {
        return FluffyReference(
            unit: unit ?? self.unit,
            value: value ?? self.value
        )
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
    public let instruments: [PaymentSelectedPaymentInstrument]?

    public init(instruments: [PaymentSelectedPaymentInstrument]?) {
        self.instruments = instruments
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

    func with(
        instruments: [PaymentSelectedPaymentInstrument]?? = nil
    ) -> Payment {
        return Payment(
            instruments: instruments ?? self.instruments
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Order schema with line items, buyer-facing fulfillment expectations, and event logs.
// MARK: - Order
public struct Order: Codable, Sendable {
    /// Post-order events (refunds, returns, credits, disputes, cancellations, etc.) that exist
    /// independently of fulfillment.
    public let adjustments: [AdjustmentElement]?
    /// Snapshot of the attribution associated with the originating checkout. Read-only on the
    /// order.
    public let attribution: [String: String]?
    /// Associated checkout ID for reconciliation.
    public let checkoutID: String
    /// ISO 4217 currency code. MUST match the currency from the originating checkout session.
    public let currency: String
    /// Fulfillment data: buyer expectations and what actually happened.
    public let fulfillment: FulfillmentClass
    /// Unique order identifier.
    public let id: String
    /// Human-readable label for identifying the order. MUST only be provided by the business.
    public let label: String?
    /// Line items representing what was purchased — can change post-order via edits or exchanges.
    public let lineItems: [LineItemElement]
    /// Business outcome messages (errors, warnings, informational). Present when the business
    /// needs to communicate status or issues to the platform.
    public let messages: [Message]?
    /// Permalink to access the order on merchant site.
    public let permalinkURL: String
    /// Different totals for the order.
    public let totals: [CheckoutTotal]
    public let ucp: UCPOrderResponseSchema

    public enum CodingKeys: String, CodingKey {
        case adjustments, attribution
        case checkoutID = "checkout_id"
        case currency, fulfillment, id, label
        case lineItems = "line_items"
        case messages
        case permalinkURL = "permalink_url"
        case totals, ucp
    }

    public init(adjustments: [AdjustmentElement]?, attribution: [String: String]?, checkoutID: String, currency: String, fulfillment: FulfillmentClass, id: String, label: String?, lineItems: [LineItemElement], messages: [Message]?, permalinkURL: String, totals: [CheckoutTotal], ucp: UCPOrderResponseSchema) {
        self.adjustments = adjustments
        self.attribution = attribution
        self.checkoutID = checkoutID
        self.currency = currency
        self.fulfillment = fulfillment
        self.id = id
        self.label = label
        self.lineItems = lineItems
        self.messages = messages
        self.permalinkURL = permalinkURL
        self.totals = totals
        self.ucp = ucp
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

    func with(
        adjustments: [AdjustmentElement]?? = nil,
        attribution: [String: String]?? = nil,
        checkoutID: String? = nil,
        currency: String? = nil,
        fulfillment: FulfillmentClass? = nil,
        id: String? = nil,
        label: String?? = nil,
        lineItems: [LineItemElement]? = nil,
        messages: [Message]?? = nil,
        permalinkURL: String? = nil,
        totals: [CheckoutTotal]? = nil,
        ucp: UCPOrderResponseSchema? = nil
    ) -> Order {
        return Order(
            adjustments: adjustments ?? self.adjustments,
            attribution: attribution ?? self.attribution,
            checkoutID: checkoutID ?? self.checkoutID,
            currency: currency ?? self.currency,
            fulfillment: fulfillment ?? self.fulfillment,
            id: id ?? self.id,
            label: label ?? self.label,
            lineItems: lineItems ?? self.lineItems,
            messages: messages ?? self.messages,
            permalinkURL: permalinkURL ?? self.permalinkURL,
            totals: totals ?? self.totals,
            ucp: ucp ?? self.ucp
        )
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
// MARK: - AdjustmentElement
public struct AdjustmentElement: Codable, Sendable {
    /// Human-readable reason or description (e.g., 'Defective item', 'Customer requested').
    public let description: String?
    /// Adjustment event identifier.
    public let id: String
    /// Which line items and quantities are affected (optional).
    public let lineItems: [AdjustmentLineItemClass]?
    /// RFC 3339 timestamp when this adjustment occurred.
    public let occurredAt: Date
    /// Adjustment status.
    public let status: AdjustmentStatus
    /// Adjustment totals breakdown. Signed values - negative for money returned to buyer
    /// (refunds, credits), positive for additional charges (exchanges).
    public let totals: [LineItemTotal]?
    /// Type of adjustment (open string). Typically money-related like: refund, return, credit,
    /// price_adjustment, dispute, cancellation. Can be any value that makes sense for the
    /// merchant's business.
    public let type: String

    public enum CodingKeys: String, CodingKey {
        case description, id
        case lineItems = "line_items"
        case occurredAt = "occurred_at"
        case status, totals, type
    }

    public init(description: String?, id: String, lineItems: [AdjustmentLineItemClass]?, occurredAt: Date, status: AdjustmentStatus, totals: [LineItemTotal]?, type: String) {
        self.description = description
        self.id = id
        self.lineItems = lineItems
        self.occurredAt = occurredAt
        self.status = status
        self.totals = totals
        self.type = type
    }
}

// MARK: AdjustmentElement convenience initializers and mutators

public extension AdjustmentElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(AdjustmentElement.self, from: data)
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

    func with(
        description: String?? = nil,
        id: String? = nil,
        lineItems: [AdjustmentLineItemClass]?? = nil,
        occurredAt: Date? = nil,
        status: AdjustmentStatus? = nil,
        totals: [LineItemTotal]?? = nil,
        type: String? = nil
    ) -> AdjustmentElement {
        return AdjustmentElement(
            description: description ?? self.description,
            id: id ?? self.id,
            lineItems: lineItems ?? self.lineItems,
            occurredAt: occurredAt ?? self.occurredAt,
            status: status ?? self.status,
            totals: totals ?? self.totals,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - AdjustmentLineItemClass
public struct AdjustmentLineItemClass: Codable, Sendable {
    /// Line item ID reference.
    public let id: String
    /// Signed quantity affected by this adjustment. Negative values represent reductions (e.g.
    /// returns); positive values represent additions (e.g. exchanges).
    public let quantity: Int

    public init(id: String, quantity: Int) {
        self.id = id
        self.quantity = quantity
    }
}

// MARK: AdjustmentLineItemClass convenience initializers and mutators

public extension AdjustmentLineItemClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(AdjustmentLineItemClass.self, from: data)
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

    func with(
        id: String? = nil,
        quantity: Int? = nil
    ) -> AdjustmentLineItemClass {
        return AdjustmentLineItemClass(
            id: id ?? self.id,
            quantity: quantity ?? self.quantity
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Fulfillment data: buyer expectations and what actually happened.
// MARK: - FulfillmentClass
public struct FulfillmentClass: Codable, Sendable {
    /// Append-only event log of actual shipments. Each event references line items by ID.
    public let events: [EventElement]?
    /// Buyer-facing groups representing when/how items will be delivered. Can be split, merged,
    /// or adjusted post-order.
    public let expectations: [ExpectationElement]?

    public init(events: [EventElement]?, expectations: [ExpectationElement]?) {
        self.events = events
        self.expectations = expectations
    }
}

// MARK: FulfillmentClass convenience initializers and mutators

public extension FulfillmentClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FulfillmentClass.self, from: data)
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

    func with(
        events: [EventElement]?? = nil,
        expectations: [ExpectationElement]?? = nil
    ) -> FulfillmentClass {
        return FulfillmentClass(
            events: events ?? self.events,
            expectations: expectations ?? self.expectations
        )
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
// MARK: - EventElement
public struct EventElement: Codable, Sendable {
    /// Carrier name (e.g., 'FedEx', 'USPS').
    public let carrier: String?
    /// Human-readable description of the shipment status or delivery information (e.g.,
    /// 'Delivered to front door', 'Out for delivery').
    public let description: String?
    /// Fulfillment event identifier.
    public let id: String
    /// Which line items and quantities are fulfilled in this event.
    public let lineItems: [EventLineItem]
    /// RFC 3339 timestamp when this fulfillment event occurred.
    public let occurredAt: Date
    /// Carrier tracking number (required if type != processing).
    public let trackingNumber: String?
    /// URL to track this shipment (required if type != processing).
    public let trackingURL: String?
    /// Fulfillment event type. Common values include: processing (preparing to ship), shipped
    /// (handed to carrier), in_transit (in delivery network), delivered (received by buyer),
    /// failed_attempt (delivery attempt failed), canceled (fulfillment canceled), undeliverable
    /// (cannot be delivered), returned_to_sender (returned to merchant).
    public let type: String

    public enum CodingKeys: String, CodingKey {
        case carrier, description, id
        case lineItems = "line_items"
        case occurredAt = "occurred_at"
        case trackingNumber = "tracking_number"
        case trackingURL = "tracking_url"
        case type
    }

    public init(carrier: String?, description: String?, id: String, lineItems: [EventLineItem], occurredAt: Date, trackingNumber: String?, trackingURL: String?, type: String) {
        self.carrier = carrier
        self.description = description
        self.id = id
        self.lineItems = lineItems
        self.occurredAt = occurredAt
        self.trackingNumber = trackingNumber
        self.trackingURL = trackingURL
        self.type = type
    }
}

// MARK: EventElement convenience initializers and mutators

public extension EventElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EventElement.self, from: data)
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

    func with(
        carrier: String?? = nil,
        description: String?? = nil,
        id: String? = nil,
        lineItems: [EventLineItem]? = nil,
        occurredAt: Date? = nil,
        trackingNumber: String?? = nil,
        trackingURL: String?? = nil,
        type: String? = nil
    ) -> EventElement {
        return EventElement(
            carrier: carrier ?? self.carrier,
            description: description ?? self.description,
            id: id ?? self.id,
            lineItems: lineItems ?? self.lineItems,
            occurredAt: occurredAt ?? self.occurredAt,
            trackingNumber: trackingNumber ?? self.trackingNumber,
            trackingURL: trackingURL ?? self.trackingURL,
            type: type ?? self.type
        )
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
    public let id: String
    /// Quantity fulfilled in this event.
    public let quantity: Int

    public init(id: String, quantity: Int) {
        self.id = id
        self.quantity = quantity
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

    func with(
        id: String? = nil,
        quantity: Int? = nil
    ) -> EventLineItem {
        return EventLineItem(
            id: id ?? self.id,
            quantity: quantity ?? self.quantity
        )
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
// MARK: - ExpectationElement
public struct ExpectationElement: Codable, Sendable {
    /// Human-readable delivery description (e.g., 'Arrives in 5-8 business days').
    public let description: String?
    /// Delivery destination address.
    public let destination: PostalAddress
    /// When this expectation can be fulfilled: 'now' or ISO 8601 timestamp for future date
    /// (backorder, pre-order).
    public let fulfillableOn: String?
    /// Expectation identifier.
    public let id: String
    /// Which line items and quantities are in this expectation.
    public let lineItems: [ExpectationLineItemClass]
    /// Delivery method type (shipping, pickup, digital).
    public let methodType: MethodType

    public enum CodingKeys: String, CodingKey {
        case description, destination
        case fulfillableOn = "fulfillable_on"
        case id
        case lineItems = "line_items"
        case methodType = "method_type"
    }

    public init(description: String?, destination: PostalAddress, fulfillableOn: String?, id: String, lineItems: [ExpectationLineItemClass], methodType: MethodType) {
        self.description = description
        self.destination = destination
        self.fulfillableOn = fulfillableOn
        self.id = id
        self.lineItems = lineItems
        self.methodType = methodType
    }
}

// MARK: ExpectationElement convenience initializers and mutators

public extension ExpectationElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ExpectationElement.self, from: data)
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

    func with(
        description: String?? = nil,
        destination: PostalAddress? = nil,
        fulfillableOn: String?? = nil,
        id: String? = nil,
        lineItems: [ExpectationLineItemClass]? = nil,
        methodType: MethodType? = nil
    ) -> ExpectationElement {
        return ExpectationElement(
            description: description ?? self.description,
            destination: destination ?? self.destination,
            fulfillableOn: fulfillableOn ?? self.fulfillableOn,
            id: id ?? self.id,
            lineItems: lineItems ?? self.lineItems,
            methodType: methodType ?? self.methodType
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - ExpectationLineItemClass
public struct ExpectationLineItemClass: Codable, Sendable {
    /// Line item ID reference.
    public let id: String
    /// Quantity of this item in this expectation.
    public let quantity: Int

    public init(id: String, quantity: Int) {
        self.id = id
        self.quantity = quantity
    }
}

// MARK: ExpectationLineItemClass convenience initializers and mutators

public extension ExpectationLineItemClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ExpectationLineItemClass.self, from: data)
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

    func with(
        id: String? = nil,
        quantity: Int? = nil
    ) -> ExpectationLineItemClass {
        return ExpectationLineItemClass(
            id: id ?? self.id,
            quantity: quantity ?? self.quantity
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - LineItemElement
public struct LineItemElement: Codable, Sendable {
    /// Line item identifier.
    public let id: String
    /// Product data (id, title, price, image_url).
    public let item: ItemClass
    /// Parent line item identifier for any nested structures.
    public let parentID: String?
    /// Quantity tracking for the line item.
    public let quantity: LineItemQuantity
    /// Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
    /// quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
    /// quantity.fulfilled > 0, otherwise processing.
    public let status: OrderLineItemStatus
    /// Line item totals breakdown.
    public let totals: [LineItemTotal]

    public enum CodingKeys: String, CodingKey {
        case id, item
        case parentID = "parent_id"
        case quantity, status, totals
    }

    public init(id: String, item: ItemClass, parentID: String?, quantity: LineItemQuantity, status: OrderLineItemStatus, totals: [LineItemTotal]) {
        self.id = id
        self.item = item
        self.parentID = parentID
        self.quantity = quantity
        self.status = status
        self.totals = totals
    }
}

// MARK: LineItemElement convenience initializers and mutators

public extension LineItemElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(LineItemElement.self, from: data)
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

    func with(
        id: String? = nil,
        item: ItemClass? = nil,
        parentID: String?? = nil,
        quantity: LineItemQuantity? = nil,
        status: OrderLineItemStatus? = nil,
        totals: [LineItemTotal]? = nil
    ) -> LineItemElement {
        return LineItemElement(
            id: id ?? self.id,
            item: item ?? self.item,
            parentID: parentID ?? self.parentID,
            quantity: quantity ?? self.quantity,
            status: status ?? self.status,
            totals: totals ?? self.totals
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Quantity tracking for the line item.
// MARK: - LineItemQuantity
public struct LineItemQuantity: Codable, Sendable {
    /// Quantity fulfilled so far.
    public let fulfilled: Int
    /// Quantity from the original checkout.
    public let original: Int?
    /// Current total active quantity. May differ from original due to post-order modifications
    /// (e.g., returns or cancellations).
    public let total: Int

    public init(fulfilled: Int, original: Int?, total: Int) {
        self.fulfilled = fulfilled
        self.original = original
        self.total = total
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

    func with(
        fulfilled: Int? = nil,
        original: Int?? = nil,
        total: Int? = nil
    ) -> LineItemQuantity {
        return LineItemQuantity(
            fulfilled: fulfilled ?? self.fulfilled,
            original: original ?? self.original,
            total: total ?? self.total
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// UCP metadata for order responses. No payment handlers needed post-purchase.
///
/// Base UCP metadata with shared properties for all schema types.
// MARK: - UCPOrderResponseSchema
public struct UCPOrderResponseSchema: Codable, Sendable {
    /// Capability registry keyed by reverse-domain name.
    public let capabilities: [String: [CapabilityResponseSchema]]?
    /// Payment handler registry keyed by reverse-domain name.
    public let paymentHandlers: [String: [PaymentHandlerResponseSchema]]?
    /// Service registry keyed by reverse-domain name.
    public let services: [String: [UCPOrderResponseSchemaService]]?
    /// Application-level status of the UCP operation.
    public let status: UCPCheckoutResponseSchemaStatus?
    public let version: String

    public enum CodingKeys: String, CodingKey {
        case capabilities
        case paymentHandlers = "payment_handlers"
        case services, status, version
    }

    public init(capabilities: [String: [CapabilityResponseSchema]]?, paymentHandlers: [String: [PaymentHandlerResponseSchema]]?, services: [String: [UCPOrderResponseSchemaService]]?, status: UCPCheckoutResponseSchemaStatus?, version: String) {
        self.capabilities = capabilities
        self.paymentHandlers = paymentHandlers
        self.services = services
        self.status = status
        self.version = version
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

    func with(
        capabilities: [String: [CapabilityResponseSchema]]?? = nil,
        paymentHandlers: [String: [PaymentHandlerResponseSchema]]?? = nil,
        services: [String: [UCPOrderResponseSchemaService]]?? = nil,
        status: UCPCheckoutResponseSchemaStatus?? = nil,
        version: String? = nil
    ) -> UCPOrderResponseSchema {
        return UCPOrderResponseSchema(
            capabilities: capabilities ?? self.capabilities,
            paymentHandlers: paymentHandlers ?? self.paymentHandlers,
            services: services ?? self.services,
            status: status ?? self.status,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Checkout state after instrument selection.
///
/// Generic error response when business logic prevents resource creation or failed to
/// retrieve resource. Used when no valid resource can be established.
// MARK: - InstrumentsChangeResult
public struct InstrumentsChangeResult: Codable, Sendable {
    /// Partial checkout update with payment instrument selection.
    public let checkout: InstrumentsChangeCheckout?
    /// UCP protocol metadata. Status MUST be 'error' for error response.
    public let ucp: InstrumentsChangeResultUcp
    /// URL for buyer handoff or session recovery.
    public let continueURL: String?
    /// Array of messages describing why the operation failed.
    public let messages: [Message]?

    public enum CodingKeys: String, CodingKey {
        case checkout, ucp
        case continueURL = "continue_url"
        case messages
    }

    public init(checkout: InstrumentsChangeCheckout?, ucp: InstrumentsChangeResultUcp, continueURL: String?, messages: [Message]?) {
        self.checkout = checkout
        self.ucp = ucp
        self.continueURL = continueURL
        self.messages = messages
    }
}

// MARK: InstrumentsChangeResult convenience initializers and mutators

public extension InstrumentsChangeResult {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(InstrumentsChangeResult.self, from: data)
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

    func with(
        checkout: InstrumentsChangeCheckout?? = nil,
        ucp: InstrumentsChangeResultUcp? = nil,
        continueURL: String?? = nil,
        messages: [Message]?? = nil
    ) -> InstrumentsChangeResult {
        return InstrumentsChangeResult(
            checkout: checkout ?? self.checkout,
            ucp: ucp ?? self.ucp,
            continueURL: continueURL ?? self.continueURL,
            messages: messages ?? self.messages
        )
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
public struct InstrumentsChangeCheckout: Codable, Sendable {
    public let payment: InstrumentsChangePayment?

    public init(payment: InstrumentsChangePayment?) {
        self.payment = payment
    }
}

// MARK: InstrumentsChangeCheckout convenience initializers and mutators

public extension InstrumentsChangeCheckout {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(InstrumentsChangeCheckout.self, from: data)
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

    func with(
        payment: InstrumentsChangePayment?? = nil
    ) -> InstrumentsChangeCheckout {
        return InstrumentsChangeCheckout(
            payment: payment ?? self.payment
        )
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
/// Payment instruments from host.
// MARK: - InstrumentsChangePayment
public struct InstrumentsChangePayment: Codable, Sendable {
    /// Available payment instruments.
    public let instruments: [PurpleSelectedPaymentInstrument]?
    /// ID of the selected payment instrument.
    public let selectedInstrumentID: String?

    public enum CodingKeys: String, CodingKey {
        case instruments
        case selectedInstrumentID = "selected_instrument_id"
    }

    public init(instruments: [PurpleSelectedPaymentInstrument]?, selectedInstrumentID: String?) {
        self.instruments = instruments
        self.selectedInstrumentID = selectedInstrumentID
    }
}

// MARK: InstrumentsChangePayment convenience initializers and mutators

public extension InstrumentsChangePayment {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(InstrumentsChangePayment.self, from: data)
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

    func with(
        instruments: [PurpleSelectedPaymentInstrument]?? = nil,
        selectedInstrumentID: String?? = nil
    ) -> InstrumentsChangePayment {
        return InstrumentsChangePayment(
            instruments: instruments ?? self.instruments,
            selectedInstrumentID: selectedInstrumentID ?? self.selectedInstrumentID
        )
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
// MARK: - PurpleSelectedPaymentInstrument
public struct PurpleSelectedPaymentInstrument: Codable, Sendable {
    /// The billing address associated with this payment method.
    public let billingAddress: PostalAddress?
    public let credential: CredentialClass?
    /// Display information for this payment instrument. Each payment instrument schema defines
    /// its specific display properties, as outlined by the payment handler.
    public let display: [String: JSONAny]?
    /// The unique identifier for the handler instance that produced this instrument. This
    /// corresponds to the 'id' field in the Payment Handler definition.
    public let handlerID: String
    /// A unique identifier for this instrument instance, assigned by the platform.
    public let id: String
    /// The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
    /// will constrain this to a constant value.
    public let type: String
    /// Whether this instrument is selected by the user.
    public let selected: Bool?

    public enum CodingKeys: String, CodingKey {
        case billingAddress = "billing_address"
        case credential, display
        case handlerID = "handler_id"
        case id, type, selected
    }

    public init(billingAddress: PostalAddress?, credential: CredentialClass?, display: [String: JSONAny]?, handlerID: String, id: String, type: String, selected: Bool?) {
        self.billingAddress = billingAddress
        self.credential = credential
        self.display = display
        self.handlerID = handlerID
        self.id = id
        self.type = type
        self.selected = selected
    }
}

// MARK: PurpleSelectedPaymentInstrument convenience initializers and mutators

public extension PurpleSelectedPaymentInstrument {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PurpleSelectedPaymentInstrument.self, from: data)
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

    func with(
        billingAddress: PostalAddress?? = nil,
        credential: CredentialClass?? = nil,
        display: [String: JSONAny]?? = nil,
        handlerID: String? = nil,
        id: String? = nil,
        type: String? = nil,
        selected: Bool?? = nil
    ) -> PurpleSelectedPaymentInstrument {
        return PurpleSelectedPaymentInstrument(
            billingAddress: billingAddress ?? self.billingAddress,
            credential: credential ?? self.credential,
            display: display ?? self.display,
            handlerID: handlerID ?? self.handlerID,
            id: id ?? self.id,
            type: type ?? self.type,
            selected: selected ?? self.selected
        )
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
public struct InstrumentsChangeResultUcp: Codable, Sendable {
    /// Capability registry keyed by reverse-domain name.
    public let capabilities: [String: [CapabilityElement]]?
    /// Payment handler registry keyed by reverse-domain name.
    public let paymentHandlers: [String: [PaymentHandlerElement]]?
    /// Service registry keyed by reverse-domain name.
    public let services: [String: [PurpleService]]?
    /// Application-level status of the UCP operation.
    public let status: UCPCheckoutResponseSchemaStatus
    public let version: String

    public enum CodingKeys: String, CodingKey {
        case capabilities
        case paymentHandlers = "payment_handlers"
        case services, status, version
    }

    public init(capabilities: [String: [CapabilityElement]]?, paymentHandlers: [String: [PaymentHandlerElement]]?, services: [String: [PurpleService]]?, status: UCPCheckoutResponseSchemaStatus, version: String) {
        self.capabilities = capabilities
        self.paymentHandlers = paymentHandlers
        self.services = services
        self.status = status
        self.version = version
    }
}

// MARK: InstrumentsChangeResultUcp convenience initializers and mutators

public extension InstrumentsChangeResultUcp {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(InstrumentsChangeResultUcp.self, from: data)
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

    func with(
        capabilities: [String: [CapabilityElement]]?? = nil,
        paymentHandlers: [String: [PaymentHandlerElement]]?? = nil,
        services: [String: [PurpleService]]?? = nil,
        status: UCPCheckoutResponseSchemaStatus? = nil,
        version: String? = nil
    ) -> InstrumentsChangeResultUcp {
        return InstrumentsChangeResultUcp(
            capabilities: capabilities ?? self.capabilities,
            paymentHandlers: paymentHandlers ?? self.paymentHandlers,
            services: services ?? self.services,
            status: status ?? self.status,
            version: version ?? self.version
        )
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
public struct CapabilityElement: Codable, Sendable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    public let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    public let id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    public let schema: String?
    /// URL to human-readable specification document.
    public let spec: String?
    /// Entity version in YYYY-MM-DD format.
    public let version: String
    /// Parent capability(s) this extends. Present for extensions, absent for root capabilities.
    /// Use array for multi-parent extensions.
    public let extends: Extends?

    public init(config: [String: JSONAny]?, id: String?, schema: String?, spec: String?, version: String, extends: Extends?) {
        self.config = config
        self.id = id
        self.schema = schema
        self.spec = spec
        self.version = version
        self.extends = extends
    }
}

// MARK: CapabilityElement convenience initializers and mutators

public extension CapabilityElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CapabilityElement.self, from: data)
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

    func with(
        config: [String: JSONAny]?? = nil,
        id: String?? = nil,
        schema: String?? = nil,
        spec: String?? = nil,
        version: String? = nil,
        extends: Extends?? = nil
    ) -> CapabilityElement {
        return CapabilityElement(
            config: config ?? self.config,
            id: id ?? self.id,
            schema: schema ?? self.schema,
            spec: spec ?? self.spec,
            version: version ?? self.version,
            extends: extends ?? self.extends
        )
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
public struct PaymentHandlerElement: Codable, Sendable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    public let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    public let id: String
    /// URL to JSON Schema defining this entity's structure and payloads.
    public let schema: String?
    /// URL to human-readable specification document.
    public let spec: String?
    /// Entity version in YYYY-MM-DD format.
    public let version: String
    /// Instrument types this handler supports, with optional constraints. When absent, every
    /// instrument should be considered available.
    public let availableInstruments: [PaymentHandlerAvailableInstrument]?

    public enum CodingKeys: String, CodingKey {
        case config, id, schema, spec, version
        case availableInstruments = "available_instruments"
    }

    public init(config: [String: JSONAny]?, id: String, schema: String?, spec: String?, version: String, availableInstruments: [PaymentHandlerAvailableInstrument]?) {
        self.config = config
        self.id = id
        self.schema = schema
        self.spec = spec
        self.version = version
        self.availableInstruments = availableInstruments
    }
}

// MARK: PaymentHandlerElement convenience initializers and mutators

public extension PaymentHandlerElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PaymentHandlerElement.self, from: data)
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

    func with(
        config: [String: JSONAny]?? = nil,
        id: String? = nil,
        schema: String?? = nil,
        spec: String?? = nil,
        version: String? = nil,
        availableInstruments: [PaymentHandlerAvailableInstrument]?? = nil
    ) -> PaymentHandlerElement {
        return PaymentHandlerElement(
            config: config ?? self.config,
            id: id ?? self.id,
            schema: schema ?? self.schema,
            spec: spec ?? self.spec,
            version: version ?? self.version,
            availableInstruments: availableInstruments ?? self.availableInstruments
        )
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
public struct PaymentHandlerAvailableInstrument: Codable, Sendable {
    /// Constraints on this instrument type. Structure depends on instrument type and active
    /// capabilities.
    public let constraints: [String: JSONAny]?
    /// The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
    /// schema's type constant.
    public let type: String

    public init(constraints: [String: JSONAny]?, type: String) {
        self.constraints = constraints
        self.type = type
    }
}

// MARK: PaymentHandlerAvailableInstrument convenience initializers and mutators

public extension PaymentHandlerAvailableInstrument {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PaymentHandlerAvailableInstrument.self, from: data)
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

    func with(
        constraints: [String: JSONAny]?? = nil,
        type: String? = nil
    ) -> PaymentHandlerAvailableInstrument {
        return PaymentHandlerAvailableInstrument(
            constraints: constraints ?? self.constraints,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Shared foundation for all UCP entities.
// MARK: - PurpleService
public struct PurpleService: Codable, Sendable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    public let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    public let id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    public let schema: String?
    /// URL to human-readable specification document.
    public let spec: String?
    /// Entity version in YYYY-MM-DD format.
    public let version: String
    /// Endpoint URL for this transport binding.
    public let endpoint: String?
    /// Transport protocol for this service binding.
    public let transport: Transport

    public init(config: [String: JSONAny]?, id: String?, schema: String?, spec: String?, version: String, endpoint: String?, transport: Transport) {
        self.config = config
        self.id = id
        self.schema = schema
        self.spec = spec
        self.version = version
        self.endpoint = endpoint
        self.transport = transport
    }
}

// MARK: PurpleService convenience initializers and mutators

public extension PurpleService {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PurpleService.self, from: data)
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

    func with(
        config: [String: JSONAny]?? = nil,
        id: String?? = nil,
        schema: String?? = nil,
        spec: String?? = nil,
        version: String? = nil,
        endpoint: String?? = nil,
        transport: Transport? = nil
    ) -> PurpleService {
        return PurpleService(
            config: config ?? self.config,
            id: id ?? self.id,
            schema: schema ?? self.schema,
            spec: spec ?? self.spec,
            version: version ?? self.version,
            endpoint: endpoint ?? self.endpoint,
            transport: transport ?? self.transport
        )
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
public struct CredentialResult: Codable, Sendable {
    /// Partial checkout update with payment credential.
    public let checkout: CredentialCheckout?
    /// UCP protocol metadata. Status MUST be 'error' for error response.
    public let ucp: InstrumentsChangeResultUcp
    /// URL for buyer handoff or session recovery.
    public let continueURL: String?
    /// Array of messages describing why the operation failed.
    public let messages: [Message]?

    public enum CodingKeys: String, CodingKey {
        case checkout, ucp
        case continueURL = "continue_url"
        case messages
    }

    public init(checkout: CredentialCheckout?, ucp: InstrumentsChangeResultUcp, continueURL: String?, messages: [Message]?) {
        self.checkout = checkout
        self.ucp = ucp
        self.continueURL = continueURL
        self.messages = messages
    }
}

// MARK: CredentialResult convenience initializers and mutators

public extension CredentialResult {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CredentialResult.self, from: data)
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

    func with(
        checkout: CredentialCheckout?? = nil,
        ucp: InstrumentsChangeResultUcp? = nil,
        continueURL: String?? = nil,
        messages: [Message]?? = nil
    ) -> CredentialResult {
        return CredentialResult(
            checkout: checkout ?? self.checkout,
            ucp: ucp ?? self.ucp,
            continueURL: continueURL ?? self.continueURL,
            messages: messages ?? self.messages
        )
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
public struct CredentialCheckout: Codable, Sendable {
    public let payment: CredentialPayment?

    public init(payment: CredentialPayment?) {
        self.payment = payment
    }
}

// MARK: CredentialCheckout convenience initializers and mutators

public extension CredentialCheckout {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CredentialCheckout.self, from: data)
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

    func with(
        payment: CredentialPayment?? = nil
    ) -> CredentialCheckout {
        return CredentialCheckout(
            payment: payment ?? self.payment
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

/// Payment instruments from host.
// MARK: - CredentialPayment
public struct CredentialPayment: Codable, Sendable {
    /// Available payment instruments.
    public let instruments: [PurpleSelectedPaymentInstrument]?

    public init(instruments: [PurpleSelectedPaymentInstrument]?) {
        self.instruments = instruments
    }
}

// MARK: CredentialPayment convenience initializers and mutators

public extension CredentialPayment {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(CredentialPayment.self, from: data)
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

    func with(
        instruments: [PurpleSelectedPaymentInstrument]?? = nil
    ) -> CredentialPayment {
        return CredentialPayment(
            instruments: instruments ?? self.instruments
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public typealias Attribution = [String: String]
public typealias Totals = [TotalElement]

public extension Dictionary where Key == String, Value == String {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Attribution.self, from: data)
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

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public extension Array where Element == Totals.Element {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Totals.self, from: data)
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

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - Helper functions for creating encoders and decoders

func newJSONDecoder() -> JSONDecoder {
    let decoder = JSONDecoder()
    if #available(iOS 10.0, OSX 10.12, tvOS 10.0, watchOS 3.0, *) {
        decoder.dateDecodingStrategy = .iso8601
    }
    return decoder
}

func newJSONEncoder() -> JSONEncoder {
    let encoder = JSONEncoder()
    if #available(iOS 10.0, OSX 10.12, tvOS 10.0, watchOS 3.0, *) {
        encoder.dateEncodingStrategy = .iso8601
    }
    return encoder
}

// MARK: - Encode/decode helpers

public class JSONNull: Codable, Hashable {

    public static func == (lhs: JSONNull, rhs: JSONNull) -> Bool {
            return true
    }

    public var hashValue: Int {
            return 0
    }

    public func hash(into hasher: inout Hasher) {
            // No-op
    }

    public init() {}

    public required init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if !container.decodeNil() {
                    throw DecodingError.typeMismatch(JSONNull.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for JSONNull"))
            }
    }

    public func encode(to encoder: Encoder) throws {
            var container = encoder.singleValueContainer()
            try container.encodeNil()
    }
}

class JSONCodingKey: CodingKey {
    let key: String

    required init?(intValue: Int) {
            return nil
    }

    required init?(stringValue: String) {
            key = stringValue
    }

    var intValue: Int? {
            return nil
    }

    var stringValue: String {
            return key
    }
}

public class JSONAny: Codable {

    public let value: Any

    static func decodingError(forCodingPath codingPath: [CodingKey]) -> DecodingError {
            let context = DecodingError.Context(codingPath: codingPath, debugDescription: "Cannot decode JSONAny")
            return DecodingError.typeMismatch(JSONAny.self, context)
    }

    static func encodingError(forValue value: Any, codingPath: [CodingKey]) -> EncodingError {
            let context = EncodingError.Context(codingPath: codingPath, debugDescription: "Cannot encode JSONAny")
            return EncodingError.invalidValue(value, context)
    }

    static func decode(from container: SingleValueDecodingContainer) throws -> Any {
            if let value = try? container.decode(Bool.self) {
                    return value
            }
            if let value = try? container.decode(Int64.self) {
                    return value
            }
            if let value = try? container.decode(Double.self) {
                    return value
            }
            if let value = try? container.decode(String.self) {
                    return value
            }
            if container.decodeNil() {
                    return JSONNull()
            }
            throw decodingError(forCodingPath: container.codingPath)
    }

    static func decode(from container: inout UnkeyedDecodingContainer) throws -> Any {
            if let value = try? container.decode(Bool.self) {
                    return value
            }
            if let value = try? container.decode(Int64.self) {
                    return value
            }
            if let value = try? container.decode(Double.self) {
                    return value
            }
            if let value = try? container.decode(String.self) {
                    return value
            }
            if let value = try? container.decodeNil() {
                    if value {
                            return JSONNull()
                    }
            }
            if var container = try? container.nestedUnkeyedContainer() {
                    return try decodeArray(from: &container)
            }
            if var container = try? container.nestedContainer(keyedBy: JSONCodingKey.self) {
                    return try decodeDictionary(from: &container)
            }
            throw decodingError(forCodingPath: container.codingPath)
    }

    static func decode(from container: inout KeyedDecodingContainer<JSONCodingKey>, forKey key: JSONCodingKey) throws -> Any {
            if let value = try? container.decode(Bool.self, forKey: key) {
                    return value
            }
            if let value = try? container.decode(Int64.self, forKey: key) {
                    return value
            }
            if let value = try? container.decode(Double.self, forKey: key) {
                    return value
            }
            if let value = try? container.decode(String.self, forKey: key) {
                    return value
            }
            if let value = try? container.decodeNil(forKey: key) {
                    if value {
                            return JSONNull()
                    }
            }
            if var container = try? container.nestedUnkeyedContainer(forKey: key) {
                    return try decodeArray(from: &container)
            }
            if var container = try? container.nestedContainer(keyedBy: JSONCodingKey.self, forKey: key) {
                    return try decodeDictionary(from: &container)
            }
            throw decodingError(forCodingPath: container.codingPath)
    }

    static func decodeArray(from container: inout UnkeyedDecodingContainer) throws -> [Any] {
            var arr: [Any] = []
            while !container.isAtEnd {
                    let value = try decode(from: &container)
                    arr.append(value)
            }
            return arr
    }

    static func decodeDictionary(from container: inout KeyedDecodingContainer<JSONCodingKey>) throws -> [String: Any] {
            var dict = [String: Any]()
            for key in container.allKeys {
                    let value = try decode(from: &container, forKey: key)
                    dict[key.stringValue] = value
            }
            return dict
    }

    static func encode(to container: inout UnkeyedEncodingContainer, array: [Any]) throws {
            for value in array {
                    if let value = value as? Bool {
                            try container.encode(value)
                    } else if let value = value as? Int64 {
                            try container.encode(value)
                    } else if let value = value as? Double {
                            try container.encode(value)
                    } else if let value = value as? String {
                            try container.encode(value)
                    } else if value is JSONNull {
                            try container.encodeNil()
                    } else if let value = value as? [Any] {
                            var container = container.nestedUnkeyedContainer()
                            try encode(to: &container, array: value)
                    } else if let value = value as? [String: Any] {
                            var container = container.nestedContainer(keyedBy: JSONCodingKey.self)
                            try encode(to: &container, dictionary: value)
                    } else {
                            throw encodingError(forValue: value, codingPath: container.codingPath)
                    }
            }
    }

    static func encode(to container: inout KeyedEncodingContainer<JSONCodingKey>, dictionary: [String: Any]) throws {
            for (key, value) in dictionary {
                    let key = JSONCodingKey(stringValue: key)!
                    if let value = value as? Bool {
                            try container.encode(value, forKey: key)
                    } else if let value = value as? Int64 {
                            try container.encode(value, forKey: key)
                    } else if let value = value as? Double {
                            try container.encode(value, forKey: key)
                    } else if let value = value as? String {
                            try container.encode(value, forKey: key)
                    } else if value is JSONNull {
                            try container.encodeNil(forKey: key)
                    } else if let value = value as? [Any] {
                            var container = container.nestedUnkeyedContainer(forKey: key)
                            try encode(to: &container, array: value)
                    } else if let value = value as? [String: Any] {
                            var container = container.nestedContainer(keyedBy: JSONCodingKey.self, forKey: key)
                            try encode(to: &container, dictionary: value)
                    } else {
                            throw encodingError(forValue: value, codingPath: container.codingPath)
                    }
            }
    }

    static func encode(to container: inout SingleValueEncodingContainer, value: Any) throws {
            if let value = value as? Bool {
                    try container.encode(value)
            } else if let value = value as? Int64 {
                    try container.encode(value)
            } else if let value = value as? Double {
                    try container.encode(value)
            } else if let value = value as? String {
                    try container.encode(value)
            } else if value is JSONNull {
                    try container.encodeNil()
            } else {
                    throw encodingError(forValue: value, codingPath: container.codingPath)
            }
    }

    public required init(from decoder: Decoder) throws {
            if var arrayContainer = try? decoder.unkeyedContainer() {
                    self.value = try JSONAny.decodeArray(from: &arrayContainer)
            } else if var container = try? decoder.container(keyedBy: JSONCodingKey.self) {
                    self.value = try JSONAny.decodeDictionary(from: &container)
            } else {
                    let container = try decoder.singleValueContainer()
                    self.value = try JSONAny.decode(from: container)
            }
    }

    public func encode(to encoder: Encoder) throws {
            if let arr = self.value as? [Any] {
                    var container = encoder.unkeyedContainer()
                    try JSONAny.encode(to: &container, array: arr)
            } else if let dict = self.value as? [String: Any] {
                    var container = encoder.container(keyedBy: JSONCodingKey.self)
                    try JSONAny.encode(to: &container, dictionary: dict)
            } else {
                    var container = encoder.singleValueContainer()
                    try JSONAny.encode(to: &container, value: self.value)
            }
    }
}
