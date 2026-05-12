// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let checkout = try Checkout(json)
//   let paymentAccountInfo = try PaymentAccountInfo(json)
//   let adjustment = try Adjustment(json)
//   let amount = try Amount(json)
//   let availablePaymentInstrument = try AvailablePaymentInstrument(json)
//   let binding = try Binding(json)
//   let businessFulfillmentConfig = try BusinessFulfillmentConfig(json)
//   let buyer = try Buyer(json)
//   let cardCredential = try CardCredential(json)
//   let cardPaymentInstrument = try CardPaymentInstrument(json)
//   let context = try Context(json)
//   let errorCode = try ErrorCode(json)
//   let errorResponse = try ErrorResponse(json)
//   let expectation = try Expectation(json)
//   let fulfillmentAvailableMethod = try FulfillmentAvailableMethod(json)
//   let fulfillmentDestination = try FulfillmentDestination(json)
//   let fulfillmentEvent = try FulfillmentEvent(json)
//   let fulfillmentGroup = try FulfillmentGroup(json)
//   let fulfillmentMethod = try FulfillmentMethod(json)
//   let fulfillmentOption = try FulfillmentOption(json)
//   let fulfillment = try Fulfillment(json)
//   let item = try Item(json)
//   let lineItem = try LineItem(json)
//   let link = try Link(json)
//   let merchantFulfillmentConfig = try MerchantFulfillmentConfig(json)
//   let messageError = try MessageError(json)
//   let messageInfo = try MessageInfo(json)
//   let messageWarning = try MessageWarning(json)
//   let message = try Message(json)
//   let orderConfirmation = try OrderConfirmation(json)
//   let orderLineItem = try OrderLineItem(json)
//   let paymentCredential = try PaymentCredential(json)
//   let paymentIdentity = try PaymentIdentity(json)
//   let paymentInstrument = try PaymentInstrument(json)
//   let platformFulfillmentConfig = try PlatformFulfillmentConfig(json)
//   let postalAddress = try PostalAddress(json)
//   let retailLocation = try RetailLocation(json)
//   let reverseDomainName = try ReverseDomainName(json)
//   let shippingDestination = try ShippingDestination(json)
//   let signals = try Signals(json)
//   let signedAmount = try SignedAmount(json)
//   let tokenCredential = try TokenCredential(json)
//   let total = try Total(json)
//   let totals = try Totals(json)
//   let payment = try Payment(json)
//   let order = try Order(json)
//   let instrumentsChangeResult = try InstrumentsChangeResult(json)
//   let credentialResult = try CredentialResult(json)

import Foundation

/// Base checkout schema. Extensions compose onto this using allOf.
// MARK: - Checkout
struct Checkout: Codable {
    /// Representation of the buyer.
    let buyer: BuyerClass?
    let context: ContextClass?
    /// URL for checkout handoff and session recovery. MUST be provided when status is
    /// requires_escalation. See specification for format and availability requirements.
    let continueURL: String?
    /// ISO 4217 currency code reflecting the merchant's market determination. Derived from
    /// address, context, and geo IP—buyers provide signals, merchants determine currency.
    let currency: String
    /// RFC 3339 expiry timestamp. Default TTL is 6 hours from creation if not sent.
    let expiresAt: Date?
    /// Unique identifier of the checkout session.
    let id: String
    /// List of line items being checked out.
    let lineItems: [CheckoutLineItem]
    /// Links to be displayed by the platform (Privacy Policy, TOS). Mandatory for legal
    /// compliance.
    let links: [LinkElement]
    /// List of messages with error and info about the checkout session state.
    let messages: [MessageElement]?
    /// Details about an order created for this checkout session.
    let order: OrderClass?
    let payment: PaymentClass?
    let signals: SignalsClass?
    /// Checkout state indicating the current phase and required action. See Checkout Status
    /// lifecycle documentation for state transition details.
    let status: CheckoutStatus
    /// Different cart totals.
    let totals: [CheckoutTotal]
    let ucp: UCPCheckoutResponseSchema

    enum CodingKeys: String, CodingKey {
        case buyer, context
        case continueURL = "continue_url"
        case currency
        case expiresAt = "expires_at"
        case id
        case lineItems = "line_items"
        case links, messages, order, payment, signals, status, totals, ucp
    }
}

// MARK: Checkout convenience initializers and mutators

extension Checkout {
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
        buyer: BuyerClass?? = nil,
        context: ContextClass?? = nil,
        continueURL: String?? = nil,
        currency: String? = nil,
        expiresAt: Date?? = nil,
        id: String? = nil,
        lineItems: [CheckoutLineItem]? = nil,
        links: [LinkElement]? = nil,
        messages: [MessageElement]?? = nil,
        order: OrderClass?? = nil,
        payment: PaymentClass?? = nil,
        signals: SignalsClass?? = nil,
        status: CheckoutStatus? = nil,
        totals: [CheckoutTotal]? = nil,
        ucp: UCPCheckoutResponseSchema? = nil
    ) -> Checkout {
        return Checkout(
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
struct BuyerClass: Codable {
    /// Email of the buyer.
    let email: String?
    /// First name of the buyer.
    let firstName: String?
    /// Last name of the buyer.
    let lastName: String?
    /// E.164 standard.
    let phoneNumber: String?

    enum CodingKeys: String, CodingKey {
        case email
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
    }
}

// MARK: BuyerClass convenience initializers and mutators

extension BuyerClass {
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
struct ContextClass: Codable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used. Optional hint for market context
    /// (currency, availability, pricing)—higher-resolution data (e.g., shipping address)
    /// supersedes this value.
    let addressCountry: String?
    /// The region in which the locality is, and which is in the country. For example, California
    /// or another appropriate first-level Administrative division. Optional hint for progressive
    /// localization—higher-resolution data (e.g., shipping address) supersedes this value.
    let addressRegion: String?
    /// Preferred currency (ISO 4217, e.g., 'EUR', 'USD'). Businesses determine presentment
    /// currency from context and authoritative signals; this hint MAY inform selection in
    /// multi-currency markets. Also serves as the denomination for price filter values —
    /// platforms SHOULD include this field when sending price filters. Response prices include
    /// explicit currency confirming the resolution.
    let currency: String?
    /// Buyer claims about eligible benefits such as loyalty membership, payment instrument
    /// perks, and similar. Recognized claims MAY inform the Business response (e.g., member-only
    /// product availability, adjusted pricing in catalog, provisional discounts at cart or
    /// checkout). Businesses MUST ignore unrecognized values without error. Values MUST use
    /// reverse-domain naming (e.g., 'com.example.loyalty_gold', 'org.school.student') and MUST
    /// be non-identifying.
    let eligibility: [String]?
    /// Background context describing buyer's intent (e.g., 'looking for a gift under $50', 'need
    /// something durable for outdoor use'). Informs relevance, recommendations, and
    /// personalization.
    let intent: String?
    /// Preferred language for content. Use IETF BCP 47 language tags (e.g., 'en', 'fr-CA',
    /// 'zh-Hans'). For REST, equivalent to Accept-Language header—platforms SHOULD fall back to
    /// Accept-Language when this field is absent; when provided, overrides Accept-Language.
    /// Businesses MAY return content in a different language if unavailable.
    let language: String?
    /// The postal code. For example, 94043. Optional hint for regional
    /// refinement—higher-resolution data (e.g., shipping address) supersedes this value.
    let postalCode: String?

    enum CodingKeys: String, CodingKey {
        case addressCountry = "address_country"
        case addressRegion = "address_region"
        case currency, eligibility, intent, language
        case postalCode = "postal_code"
    }
}

// MARK: ContextClass convenience initializers and mutators

extension ContextClass {
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
struct CheckoutLineItem: Codable {
    let id: String
    let item: ItemClass
    /// Parent line item identifier for any nested structures.
    let parentID: String?
    /// Quantity of the item being purchased.
    let quantity: Int
    /// Line item totals breakdown.
    let totals: [LineItemTotal]

    enum CodingKeys: String, CodingKey {
        case id, item
        case parentID = "parent_id"
        case quantity, totals
    }
}

// MARK: CheckoutLineItem convenience initializers and mutators

extension CheckoutLineItem {
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
struct ItemClass: Codable {
    /// The product identifier, often the SKU, required to resolve the product details associated
    /// with this line item. Should be recognized by both the Platform, and the Business.
    let id: String
    /// Product image URI.
    let imageURL: String?
    /// Unit price in ISO 4217 minor units.
    let price: Int
    /// Product title.
    let title: String

    enum CodingKeys: String, CodingKey {
        case id
        case imageURL = "image_url"
        case price, title
    }
}

// MARK: ItemClass convenience initializers and mutators

extension ItemClass {
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
struct LineItemTotal: Codable {
    let amount: Int
    /// Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
    /// 'Delivery').
    let displayText: String?
    /// Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
    /// fee, total. Businesses MAY use additional values.
    let type: String

    enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
        case type
    }
}

// MARK: LineItemTotal convenience initializers and mutators

extension LineItemTotal {
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

// MARK: - LinkElement
struct LinkElement: Codable {
    /// Optional display text for the link. When provided, use this instead of generating from
    /// type.
    let title: String?
    /// Type of link. Well-known values: `privacy_policy`, `terms_of_service`, `refund_policy`,
    /// `shipping_policy`, `faq`. Consumers SHOULD handle unknown values gracefully by displaying
    /// them using the `title` field or omitting the link.
    let type: String
    /// The actual URL pointing to the content to be displayed.
    let url: String
}

// MARK: LinkElement convenience initializers and mutators

extension LinkElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(LinkElement.self, from: data)
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
    ) -> LinkElement {
        return LinkElement(
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
// MARK: - MessageElement
struct MessageElement: Codable {
    /// Warning code. Machine-readable identifier for the warning type (e.g., final_sale, prop65,
    /// fulfillment_changed, age_restricted, etc.).
    ///
    /// Info code for programmatic handling.
    let code: String?
    /// Human-readable message.
    ///
    /// Human-readable warning message that MUST be displayed.
    let content: String
    /// Content format, default = plain.
    let contentType: ContentType?
    /// RFC 9535 JSONPath to the component the message refers to (e.g., $.items[1]).
    ///
    /// JSONPath (RFC 9535) to related field (e.g., $.line_items[0]).
    ///
    /// RFC 9535 JSONPath to the component the message refers to.
    let path: String?
    /// Reflects the resource state and recommended action. 'recoverable': platform can resolve
    /// by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires
    /// information their API doesn't support collecting programmatically (checkout incomplete).
    /// 'requires_buyer_review': buyer must authorize before order placement due to policy,
    /// regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
    /// retry with new resource or inputs. Errors with 'requires_*' severity contribute to
    /// 'status: requires_escalation'.
    let severity: Severity?
    /// Message type discriminator.
    let type: MessageType
    /// URL to a required visual element (e.g., warning symbol, energy class label).
    let imageURL: String?
    /// Rendering contract for this warning. 'notice' (default): platform MUST display, MAY
    /// dismiss. 'disclosure': platform MUST display in proximity to the path-referenced
    /// component, MUST NOT hide or auto-dismiss. See specification for full contract.
    let presentation: String?
    /// Reference URL for more information (e.g., regulatory site, registry entry, policy page).
    let url: String?

    enum CodingKeys: String, CodingKey {
        case code, content
        case contentType = "content_type"
        case path, severity, type
        case imageURL = "image_url"
        case presentation, url
    }
}

// MARK: MessageElement convenience initializers and mutators

extension MessageElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(MessageElement.self, from: data)
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
    ) -> MessageElement {
        return MessageElement(
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
enum ContentType: String, Codable {
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
enum Severity: String, Codable {
    case recoverable = "recoverable"
    case requiresBuyerInput = "requires_buyer_input"
    case requiresBuyerReview = "requires_buyer_review"
    case unrecoverable = "unrecoverable"
}

enum MessageType: String, Codable {
    case error = "error"
    case info = "info"
    case warning = "warning"
}

/// Details about an order created for this checkout session.
///
/// Order details available at the time of checkout completion.
// MARK: - OrderClass
struct OrderClass: Codable {
    /// Unique order identifier.
    let id: String
    /// Human-readable label for identifying the order. MUST only be provided by the business.
    let label: String?
    /// Permalink to access the order on merchant site.
    let permalinkURL: String

    enum CodingKeys: String, CodingKey {
        case id, label
        case permalinkURL = "permalink_url"
    }
}

// MARK: OrderClass convenience initializers and mutators

extension OrderClass {
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
struct PaymentClass: Codable {
    /// The payment instruments available for this payment. Each instrument is associated with a
    /// specific handler via the handler_id field. Handlers can extend the base
    /// payment_instrument schema to add handler-specific fields.
    let instruments: [PaymentSelectedPaymentInstrument]?
}

// MARK: PaymentClass convenience initializers and mutators

extension PaymentClass {
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
struct PaymentSelectedPaymentInstrument: Codable {
    /// The billing address associated with this payment method.
    let billingAddress: BillingAddressClass?
    let credential: CredentialClass?
    /// Display information for this payment instrument. Each payment instrument schema defines
    /// its specific display properties, as outlined by the payment handler.
    let display: [String: JSONAny]?
    /// The unique identifier for the handler instance that produced this instrument. This
    /// corresponds to the 'id' field in the Payment Handler definition.
    let handlerID: String
    /// A unique identifier for this instrument instance, assigned by the platform.
    let id: String
    /// The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
    /// will constrain this to a constant value.
    let type: String
    /// Whether this instrument is selected by the user.
    let selected: Bool?

    enum CodingKeys: String, CodingKey {
        case billingAddress = "billing_address"
        case credential, display
        case handlerID = "handler_id"
        case id, type, selected
    }
}

// MARK: PaymentSelectedPaymentInstrument convenience initializers and mutators

extension PaymentSelectedPaymentInstrument {
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
        billingAddress: BillingAddressClass?? = nil,
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
// MARK: - BillingAddressClass
struct BillingAddressClass: Codable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used.
    let addressCountry: String?
    /// The locality in which the street address is, and which is in the region. For example,
    /// Mountain View.
    let addressLocality: String?
    /// The region in which the locality is, and which is in the country. Required for applicable
    /// countries (i.e. state in US, province in CA). For example, California or another
    /// appropriate first-level Administrative division.
    let addressRegion: String?
    /// An address extension such as an apartment number, C/O or alternative name.
    let extendedAddress: String?
    /// Optional. First name of the contact associated with the address.
    let firstName: String?
    /// Optional. Last name of the contact associated with the address.
    let lastName: String?
    /// Optional. Phone number of the contact associated with the address.
    let phoneNumber: String?
    /// The postal code. For example, 94043.
    let postalCode: String?
    /// The street address.
    let streetAddress: String?

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
}

// MARK: BillingAddressClass convenience initializers and mutators

extension BillingAddressClass {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BillingAddressClass.self, from: data)
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
    ) -> BillingAddressClass {
        return BillingAddressClass(
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
struct CredentialClass: Codable {
    /// The credential type discriminator. Specific schemas will constrain this to a constant
    /// value.
    let type: String
}

// MARK: CredentialClass convenience initializers and mutators

extension CredentialClass {
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
struct SignalsClass: Codable {
    /// Client's IP address (IPv4 or IPv6).
    let devUcpBuyerIP: String?
    /// Client's HTTP User-Agent header or equivalent.
    let devUcpUserAgent: String?

    enum CodingKeys: String, CodingKey {
        case devUcpBuyerIP = "dev.ucp.buyer_ip"
        case devUcpUserAgent = "dev.ucp.user_agent"
    }
}

// MARK: SignalsClass convenience initializers and mutators

extension SignalsClass {
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
enum CheckoutStatus: String, Codable {
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
struct CheckoutTotal: Codable {
    let amount: Int
    /// Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
    /// 'Delivery').
    let displayText: String?
    /// Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
    /// fee, total. Businesses MAY use additional values.
    let type: String
    /// Optional itemized breakdown. The parent entry is always rendered; lines are
    /// supplementary. Sum of line amounts MUST equal the parent entry amount.
    let lines: [TotalLine]?

    enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
        case type, lines
    }
}

// MARK: CheckoutTotal convenience initializers and mutators

extension CheckoutTotal {
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
struct TotalLine: Codable {
    let amount: Int
    /// Human-readable label for this sub-line.
    let displayText: String

    enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
    }
}

// MARK: TotalLine convenience initializers and mutators

extension TotalLine {
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
struct UCPCheckoutResponseSchema: Codable {
    /// Capability registry keyed by reverse-domain name.
    let capabilities: [String: [CapabilityResponseSchema]]?
    /// Payment handler registry keyed by reverse-domain name.
    let paymentHandlers: [String: [PaymentHandlerResponseSchema]]
    /// Service registry keyed by reverse-domain name.
    let services: [String: [ServiceResponseSchema]]?
    /// Application-level status of the UCP operation.
    let status: UCPCheckoutResponseSchemaStatus?
    let version: String

    enum CodingKeys: String, CodingKey {
        case capabilities
        case paymentHandlers = "payment_handlers"
        case services, status, version
    }
}

// MARK: UCPCheckoutResponseSchema convenience initializers and mutators

extension UCPCheckoutResponseSchema {
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
struct CapabilityResponseSchema: Codable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    let id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    let schema: String?
    /// URL to human-readable specification document.
    let spec: String?
    /// Entity version in YYYY-MM-DD format.
    let version: String
    /// Parent capability(s) this extends. Present for extensions, absent for root capabilities.
    /// Use array for multi-parent extensions.
    let extends: Extends?
}

// MARK: CapabilityResponseSchema convenience initializers and mutators

extension CapabilityResponseSchema {
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
enum Extends: Codable {
    case string(String)
    case stringArray([String])

    init(from decoder: Decoder) throws {
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

    func encode(to encoder: Encoder) throws {
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
struct PaymentHandlerResponseSchema: Codable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    let id: String
    /// URL to JSON Schema defining this entity's structure and payloads.
    let schema: String?
    /// URL to human-readable specification document.
    let spec: String?
    /// Entity version in YYYY-MM-DD format.
    let version: String
    /// Instrument types this handler supports, with optional constraints. When absent, every
    /// instrument should be considered available.
    let availableInstruments: [PaymentHandlerResponseSchemaAvailableInstrument]?

    enum CodingKeys: String, CodingKey {
        case config, id, schema, spec, version
        case availableInstruments = "available_instruments"
    }
}

// MARK: PaymentHandlerResponseSchema convenience initializers and mutators

extension PaymentHandlerResponseSchema {
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
struct PaymentHandlerResponseSchemaAvailableInstrument: Codable {
    /// Constraints on this instrument type. Structure depends on instrument type and active
    /// capabilities.
    let constraints: [String: JSONAny]?
    /// The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
    /// schema's type constant.
    let type: String
}

// MARK: PaymentHandlerResponseSchemaAvailableInstrument convenience initializers and mutators

extension PaymentHandlerResponseSchemaAvailableInstrument {
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
struct ServiceResponseSchema: Codable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    let config: EmbeddedTransportConfig?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    let id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    let schema: String?
    /// URL to human-readable specification document.
    let spec: String?
    /// Entity version in YYYY-MM-DD format.
    let version: String
    /// Endpoint URL for this transport binding.
    let endpoint: String?
    /// Transport protocol for this service binding.
    let transport: Transport
}

// MARK: ServiceResponseSchema convenience initializers and mutators

extension ServiceResponseSchema {
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
struct EmbeddedTransportConfig: Codable {
    /// Color schemes the business supports. Hosts use ec_color_scheme query parameter to request
    /// a scheme from this list.
    let colorScheme: [ColorScheme]?
    /// Delegations the business allows. At service-level, declares available delegations. In UCP
    /// responses, confirms accepted delegations for this session.
    let delegate: [String]?

    enum CodingKeys: String, CodingKey {
        case colorScheme = "color_scheme"
        case delegate
    }
}

// MARK: EmbeddedTransportConfig convenience initializers and mutators

extension EmbeddedTransportConfig {
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
        colorScheme: [ColorScheme]?? = nil,
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

enum ColorScheme: String, Codable {
    case dark = "dark"
    case light = "light"
}

/// Transport protocol for this service binding.
enum Transport: String, Codable {
    case a2A = "a2a"
    case embedded = "embedded"
    case mcp = "mcp"
    case rest = "rest"
}

/// Application-level status of the UCP operation.
enum UCPCheckoutResponseSchemaStatus: String, Codable {
    case error = "error"
    case success = "success"
}

/// Non-sensitive backend identifiers for linking.
// MARK: - PaymentAccountInfo
struct PaymentAccountInfo: Codable {
    /// EMVCo PAR. A unique identifier linking a payment card to a specific account, enabling
    /// tracking across tokens (Apple Pay, physical card, etc).
    let paymentAccountReference: String?

    enum CodingKeys: String, CodingKey {
        case paymentAccountReference = "payment_account_reference"
    }
}

// MARK: PaymentAccountInfo convenience initializers and mutators

extension PaymentAccountInfo {
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
struct Adjustment: Codable {
    /// Human-readable reason or description (e.g., 'Defective item', 'Customer requested').
    let description: String?
    /// Adjustment event identifier.
    let id: String
    /// Which line items and quantities are affected (optional).
    let lineItems: [AdjustmentLineItem]?
    /// RFC 3339 timestamp when this adjustment occurred.
    let occurredAt: Date
    /// Adjustment status.
    let status: AdjustmentStatus
    /// Adjustment totals breakdown. Signed values - negative for money returned to buyer
    /// (refunds, credits), positive for additional charges (exchanges).
    let totals: [LineItemTotal]?
    /// Type of adjustment (open string). Typically money-related like: refund, return, credit,
    /// price_adjustment, dispute, cancellation. Can be any value that makes sense for the
    /// merchant's business.
    let type: String

    enum CodingKeys: String, CodingKey {
        case description, id
        case lineItems = "line_items"
        case occurredAt = "occurred_at"
        case status, totals, type
    }
}

// MARK: Adjustment convenience initializers and mutators

extension Adjustment {
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
struct AdjustmentLineItem: Codable {
    /// Line item ID reference.
    let id: String
    /// Signed quantity affected by this adjustment. Negative values represent reductions (e.g.
    /// returns); positive values represent additions (e.g. exchanges).
    let quantity: Int
}

// MARK: AdjustmentLineItem convenience initializers and mutators

extension AdjustmentLineItem {
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
enum AdjustmentStatus: String, Codable {
    case completed = "completed"
    case failed = "failed"
    case pending = "pending"
}

/// An instrument type available from a payment handler with optional constraints.
// MARK: - AvailablePaymentInstrument
struct AvailablePaymentInstrument: Codable {
    /// Constraints on this instrument type. Structure depends on instrument type and active
    /// capabilities.
    let constraints: [String: JSONAny]?
    /// The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
    /// schema's type constant.
    let type: String
}

// MARK: AvailablePaymentInstrument convenience initializers and mutators

extension AvailablePaymentInstrument {
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
// MARK: - Binding
struct Binding: Codable {
    /// The checkout session identifier this token is bound to.
    let checkoutID: String
    /// The participant this token is bound to. Required when acting on behalf of another
    /// participant (e.g., agent tokenizing for merchant). Omit when the authenticated caller is
    /// the binding target.
    let identity: IdentityClass?

    enum CodingKeys: String, CodingKey {
        case checkoutID = "checkout_id"
        case identity
    }
}

// MARK: Binding convenience initializers and mutators

extension Binding {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Binding.self, from: data)
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
    ) -> Binding {
        return Binding(
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
struct IdentityClass: Codable {
    /// Unique identifier for this participant, obtained during onboarding with the tokenizer.
    let accessToken: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
    }
}

// MARK: IdentityClass convenience initializers and mutators

extension IdentityClass {
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
struct BusinessFulfillmentConfig: Codable {
    /// Allowed method type combinations.
    let allowsMethodCombinations: [[TypeElement]]?
    /// Permits multiple destinations per method type.
    let allowsMultiDestination: BusinessFulfillmentConfigAllowsMultiDestination?

    enum CodingKeys: String, CodingKey {
        case allowsMethodCombinations = "allows_method_combinations"
        case allowsMultiDestination = "allows_multi_destination"
    }
}

// MARK: BusinessFulfillmentConfig convenience initializers and mutators

extension BusinessFulfillmentConfig {
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
enum TypeElement: String, Codable {
    case pickup = "pickup"
    case shipping = "shipping"
}

/// Permits multiple destinations per method type.
// MARK: - BusinessFulfillmentConfigAllowsMultiDestination
struct BusinessFulfillmentConfigAllowsMultiDestination: Codable {
    /// Multiple pickup locations allowed.
    let pickup: Bool?
    /// Multiple shipping destinations allowed.
    let shipping: Bool?
}

// MARK: BusinessFulfillmentConfigAllowsMultiDestination convenience initializers and mutators

extension BusinessFulfillmentConfigAllowsMultiDestination {
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

// MARK: - Buyer
struct Buyer: Codable {
    /// Email of the buyer.
    let email: String?
    /// First name of the buyer.
    let firstName: String?
    /// Last name of the buyer.
    let lastName: String?
    /// E.164 standard.
    let phoneNumber: String?

    enum CodingKeys: String, CodingKey {
        case email
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
    }
}

// MARK: Buyer convenience initializers and mutators

extension Buyer {
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
struct CardCredential: Codable {
    /// The credential type discriminator. Specific schemas will constrain this to a constant
    /// value.
    ///
    /// The credential type identifier for card credentials.
    let type: TypeEnum
    /// The type of card number. Network tokens are preferred with fallback to FPAN. See PCI
    /// Scope for more details.
    let cardNumberType: CardNumberType
    /// Cryptogram provided with network tokens.
    let cryptogram: String?
    /// Card CVC number.
    let cvc: String?
    /// Electronic Commerce Indicator / Security Level Indicator provided with network tokens.
    let eciValue: String?
    /// The month of the card's expiration date (1-12).
    let expiryMonth: Int?
    /// The year of the card's expiration date.
    let expiryYear: Int?
    /// Cardholder name.
    let name: String?
    /// Card number.
    let number: String?

    enum CodingKeys: String, CodingKey {
        case type
        case cardNumberType = "card_number_type"
        case cryptogram, cvc
        case eciValue = "eci_value"
        case expiryMonth = "expiry_month"
        case expiryYear = "expiry_year"
        case name, number
    }
}

// MARK: CardCredential convenience initializers and mutators

extension CardCredential {
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
        type: TypeEnum? = nil,
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
enum CardNumberType: String, Codable {
    case dpan = "dpan"
    case fpan = "fpan"
    case networkToken = "network_token"
}

/// Error code identifying the type of error. Standard errors are defined in specification
/// (see examples), and have standardized semantics; freeform codes are permitted.
enum TypeEnum: String, Codable {
    case card = "card"
}

/// A basic card payment instrument with visible card details. Can be inherited by a
/// handler's instrument schema to define handler-specific display details or more complex
/// credential structures.
///
/// The base definition for any payment instrument. It links the instrument to a specific
/// payment handler.
// MARK: - CardPaymentInstrument
struct CardPaymentInstrument: Codable {
    /// The billing address associated with this payment method.
    let billingAddress: BillingAddressClass?
    let credential: CredentialClass?
    /// Display information for this payment instrument. Each payment instrument schema defines
    /// its specific display properties, as outlined by the payment handler.
    ///
    /// Display information for this card payment instrument.
    let display: Display?
    /// The unique identifier for the handler instance that produced this instrument. This
    /// corresponds to the 'id' field in the Payment Handler definition.
    let handlerID: String
    /// A unique identifier for this instrument instance, assigned by the platform.
    let id: String
    /// The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
    /// will constrain this to a constant value.
    ///
    /// Indicates this is a card payment instrument.
    let type: TypeEnum

    enum CodingKeys: String, CodingKey {
        case billingAddress = "billing_address"
        case credential, display
        case handlerID = "handler_id"
        case id, type
    }
}

// MARK: CardPaymentInstrument convenience initializers and mutators

extension CardPaymentInstrument {
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
        billingAddress: BillingAddressClass?? = nil,
        credential: CredentialClass?? = nil,
        display: Display?? = nil,
        handlerID: String? = nil,
        id: String? = nil,
        type: TypeEnum? = nil
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
struct Display: Codable {
    /// The card brand/network (e.g., visa, mastercard, amex).
    let brand: String?
    /// An optional URI to a rich image representing the card (e.g., card art provided by the
    /// issuer).
    let cardArt: String?
    /// An optional rich text description of the card to display to the user (e.g., 'Visa ending
    /// in 1234, expires 12/2025').
    let description: String?
    /// The month of the card's expiration date (1-12).
    let expiryMonth: Int?
    /// The year of the card's expiration date.
    let expiryYear: Int?
    /// Last 4 digits of the card number.
    let lastDigits: String?

    enum CodingKeys: String, CodingKey {
        case brand
        case cardArt = "card_art"
        case description
        case expiryMonth = "expiry_month"
        case expiryYear = "expiry_year"
        case lastDigits = "last_digits"
    }
}

// MARK: Display convenience initializers and mutators

extension Display {
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

/// Provisional buyer signals for relevance and localization—not authoritative data.
/// Businesses SHOULD use these values when verified inputs (e.g., shipping address) are
/// absent, and MAY ignore or down-rank them if inconsistent with higher-confidence signals
/// (authenticated account, risk detection) or regulatory constraints (export controls).
/// Eligibility and policy enforcement MUST occur at checkout time using binding transaction
/// data. Context SHOULD be non-identifying and can be disclosed progressively—coarse signals
/// early, finer resolution as the session progresses. Higher-resolution data (shipping
/// address, billing address) supersedes context.
// MARK: - Context
struct Context: Codable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used. Optional hint for market context
    /// (currency, availability, pricing)—higher-resolution data (e.g., shipping address)
    /// supersedes this value.
    let addressCountry: String?
    /// The region in which the locality is, and which is in the country. For example, California
    /// or another appropriate first-level Administrative division. Optional hint for progressive
    /// localization—higher-resolution data (e.g., shipping address) supersedes this value.
    let addressRegion: String?
    /// Preferred currency (ISO 4217, e.g., 'EUR', 'USD'). Businesses determine presentment
    /// currency from context and authoritative signals; this hint MAY inform selection in
    /// multi-currency markets. Also serves as the denomination for price filter values —
    /// platforms SHOULD include this field when sending price filters. Response prices include
    /// explicit currency confirming the resolution.
    let currency: String?
    /// Buyer claims about eligible benefits such as loyalty membership, payment instrument
    /// perks, and similar. Recognized claims MAY inform the Business response (e.g., member-only
    /// product availability, adjusted pricing in catalog, provisional discounts at cart or
    /// checkout). Businesses MUST ignore unrecognized values without error. Values MUST use
    /// reverse-domain naming (e.g., 'com.example.loyalty_gold', 'org.school.student') and MUST
    /// be non-identifying.
    let eligibility: [String]?
    /// Background context describing buyer's intent (e.g., 'looking for a gift under $50', 'need
    /// something durable for outdoor use'). Informs relevance, recommendations, and
    /// personalization.
    let intent: String?
    /// Preferred language for content. Use IETF BCP 47 language tags (e.g., 'en', 'fr-CA',
    /// 'zh-Hans'). For REST, equivalent to Accept-Language header—platforms SHOULD fall back to
    /// Accept-Language when this field is absent; when provided, overrides Accept-Language.
    /// Businesses MAY return content in a different language if unavailable.
    let language: String?
    /// The postal code. For example, 94043. Optional hint for regional
    /// refinement—higher-resolution data (e.g., shipping address) supersedes this value.
    let postalCode: String?

    enum CodingKeys: String, CodingKey {
        case addressCountry = "address_country"
        case addressRegion = "address_region"
        case currency, eligibility, intent, language
        case postalCode = "postal_code"
    }
}

// MARK: Context convenience initializers and mutators

extension Context {
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

/// Generic error response when business logic prevents resource creation or failed to
/// retrieve resource. Used when no valid resource can be established.
// MARK: - ErrorResponse
struct ErrorResponse: Codable {
    /// URL for buyer handoff or session recovery.
    let continueURL: String?
    /// Array of messages describing why the operation failed.
    let messages: [MessageElement]
    /// UCP protocol metadata. Status MUST be 'error' for error response.
    let ucp: ErrorResponseUcp

    enum CodingKeys: String, CodingKey {
        case continueURL = "continue_url"
        case messages, ucp
    }
}

// MARK: ErrorResponse convenience initializers and mutators

extension ErrorResponse {
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
        messages: [MessageElement]? = nil,
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
struct ErrorResponseUcp: Codable {
    /// Capability registry keyed by reverse-domain name.
    let capabilities: [String: [CapabilityResponseSchema]]?
    /// Payment handler registry keyed by reverse-domain name.
    let paymentHandlers: [String: [PaymentHandlerResponseSchema]]?
    /// Service registry keyed by reverse-domain name.
    let services: [String: [UCPOrderResponseSchemaService]]?
    /// Application-level status of the UCP operation.
    let status: StatusEnum
    let version: String

    enum CodingKeys: String, CodingKey {
        case capabilities
        case paymentHandlers = "payment_handlers"
        case services, status, version
    }
}

// MARK: ErrorResponseUcp convenience initializers and mutators

extension ErrorResponseUcp {
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
struct UCPOrderResponseSchemaService: Codable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    let id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    let schema: String?
    /// URL to human-readable specification document.
    let spec: String?
    /// Entity version in YYYY-MM-DD format.
    let version: String
    /// Endpoint URL for this transport binding.
    let endpoint: String?
    /// Transport protocol for this service binding.
    let transport: Transport
}

// MARK: UCPOrderResponseSchemaService convenience initializers and mutators

extension UCPOrderResponseSchemaService {
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
enum StatusEnum: String, Codable {
    case error = "error"
}

/// Buyer-facing fulfillment expectation representing logical groupings of items (e.g.,
/// 'package'). Can be split, merged, or adjusted post-order to set buyer expectations for
/// when/how items arrive.
// MARK: - Expectation
struct Expectation: Codable {
    /// Human-readable delivery description (e.g., 'Arrives in 5-8 business days').
    let description: String?
    /// Delivery destination address.
    let destination: BillingAddressClass
    /// When this expectation can be fulfilled: 'now' or ISO 8601 timestamp for future date
    /// (backorder, pre-order).
    let fulfillableOn: String?
    /// Expectation identifier.
    let id: String
    /// Which line items and quantities are in this expectation.
    let lineItems: [ExpectationLineItem]
    /// Delivery method type (shipping, pickup, digital).
    let methodType: MethodType

    enum CodingKeys: String, CodingKey {
        case description, destination
        case fulfillableOn = "fulfillable_on"
        case id
        case lineItems = "line_items"
        case methodType = "method_type"
    }
}

// MARK: Expectation convenience initializers and mutators

extension Expectation {
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
        destination: BillingAddressClass? = nil,
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
struct ExpectationLineItem: Codable {
    /// Line item ID reference.
    let id: String
    /// Quantity of this item in this expectation.
    let quantity: Int
}

// MARK: ExpectationLineItem convenience initializers and mutators

extension ExpectationLineItem {
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
enum MethodType: String, Codable {
    case digital = "digital"
    case pickup = "pickup"
    case shipping = "shipping"
}

/// Inventory availability hint for a fulfillment method type.
// MARK: - FulfillmentAvailableMethod
struct FulfillmentAvailableMethod: Codable {
    /// Human-readable availability info (e.g., 'Available for pickup at Downtown Store today').
    let description: String?
    /// 'now' for immediate availability, or ISO 8601 date for future (preorders, transfers).
    let fulfillableOn: String?
    /// Line items available for this fulfillment method.
    let lineItemIDS: [String]
    /// Fulfillment method type this availability applies to.
    let type: TypeElement

    enum CodingKeys: String, CodingKey {
        case description
        case fulfillableOn = "fulfillable_on"
        case lineItemIDS = "line_item_ids"
        case type
    }
}

// MARK: FulfillmentAvailableMethod convenience initializers and mutators

extension FulfillmentAvailableMethod {
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
struct FulfillmentDestination: Codable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used.
    let addressCountry: String?
    /// The locality in which the street address is, and which is in the region. For example,
    /// Mountain View.
    let addressLocality: String?
    /// The region in which the locality is, and which is in the country. Required for applicable
    /// countries (i.e. state in US, province in CA). For example, California or another
    /// appropriate first-level Administrative division.
    let addressRegion: String?
    /// An address extension such as an apartment number, C/O or alternative name.
    let extendedAddress: String?
    /// Optional. First name of the contact associated with the address.
    let firstName: String?
    /// Optional. Last name of the contact associated with the address.
    let lastName: String?
    /// Optional. Phone number of the contact associated with the address.
    let phoneNumber: String?
    /// The postal code. For example, 94043.
    let postalCode: String?
    /// The street address.
    let streetAddress: String?
    /// ID specific to this shipping destination.
    ///
    /// Unique location identifier.
    let id: String
    /// Physical address of the location.
    let address: BillingAddressClass?
    /// Location name (e.g., store name).
    let name: String?

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
        case id, address, name
    }
}

// MARK: FulfillmentDestination convenience initializers and mutators

extension FulfillmentDestination {
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
        address: BillingAddressClass?? = nil,
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
struct FulfillmentEvent: Codable {
    /// Carrier name (e.g., 'FedEx', 'USPS').
    let carrier: String?
    /// Human-readable description of the shipment status or delivery information (e.g.,
    /// 'Delivered to front door', 'Out for delivery').
    let description: String?
    /// Fulfillment event identifier.
    let id: String
    /// Which line items and quantities are fulfilled in this event.
    let lineItems: [FulfillmentEventLineItem]
    /// RFC 3339 timestamp when this fulfillment event occurred.
    let occurredAt: Date
    /// Carrier tracking number (required if type != processing).
    let trackingNumber: String?
    /// URL to track this shipment (required if type != processing).
    let trackingURL: String?
    /// Fulfillment event type. Common values include: processing (preparing to ship), shipped
    /// (handed to carrier), in_transit (in delivery network), delivered (received by buyer),
    /// failed_attempt (delivery attempt failed), canceled (fulfillment canceled), undeliverable
    /// (cannot be delivered), returned_to_sender (returned to merchant).
    let type: String

    enum CodingKeys: String, CodingKey {
        case carrier, description, id
        case lineItems = "line_items"
        case occurredAt = "occurred_at"
        case trackingNumber = "tracking_number"
        case trackingURL = "tracking_url"
        case type
    }
}

// MARK: FulfillmentEvent convenience initializers and mutators

extension FulfillmentEvent {
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
struct FulfillmentEventLineItem: Codable {
    /// Line item ID reference.
    let id: String
    /// Quantity fulfilled in this event.
    let quantity: Int
}

// MARK: FulfillmentEventLineItem convenience initializers and mutators

extension FulfillmentEventLineItem {
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
struct FulfillmentGroup: Codable {
    /// Group identifier for referencing merchant-generated groups in updates.
    let id: String
    /// Line item IDs included in this group/package.
    let lineItemIDS: [String]
    /// Available fulfillment options for this group.
    let options: [OptionElement]?
    /// ID of the selected fulfillment option for this group.
    let selectedOptionID: String?

    enum CodingKeys: String, CodingKey {
        case id
        case lineItemIDS = "line_item_ids"
        case options
        case selectedOptionID = "selected_option_id"
    }
}

// MARK: FulfillmentGroup convenience initializers and mutators

extension FulfillmentGroup {
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

/// A fulfillment option within a group (e.g., Standard Shipping $5, Express $15).
// MARK: - OptionElement
struct OptionElement: Codable {
    /// Carrier name (for shipping).
    let carrier: String?
    /// Complete context for buyer decision (e.g., 'Arrives Dec 12-15 via FedEx').
    let description: String?
    /// Earliest fulfillment date.
    let earliestFulfillmentTime: Date?
    /// Unique fulfillment option identifier.
    let id: String
    /// Latest fulfillment date.
    let latestFulfillmentTime: Date?
    /// Short label (e.g., 'Express Shipping', 'Curbside Pickup').
    let title: String
    /// Fulfillment option totals breakdown.
    let totals: [LineItemTotal]

    enum CodingKeys: String, CodingKey {
        case carrier, description
        case earliestFulfillmentTime = "earliest_fulfillment_time"
        case id
        case latestFulfillmentTime = "latest_fulfillment_time"
        case title, totals
    }
}

// MARK: OptionElement convenience initializers and mutators

extension OptionElement {
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

/// A fulfillment method (shipping or pickup) with destinations and groups.
// MARK: - FulfillmentMethod
struct FulfillmentMethod: Codable {
    /// Available destinations. For shipping: addresses. For pickup: retail locations.
    let destinations: [FulfillmentDestinationElement]?
    /// Fulfillment groups for selecting options. Agent sets selected_option_id on groups to
    /// choose shipping method.
    let groups: [GroupElement]?
    /// Unique fulfillment method identifier.
    let id: String
    /// Line item IDs fulfilled via this method.
    let lineItemIDS: [String]
    /// ID of the selected destination.
    let selectedDestinationID: String?
    /// Fulfillment method type.
    let type: TypeElement

    enum CodingKeys: String, CodingKey {
        case destinations, groups, id
        case lineItemIDS = "line_item_ids"
        case selectedDestinationID = "selected_destination_id"
        case type
    }
}

// MARK: FulfillmentMethod convenience initializers and mutators

extension FulfillmentMethod {
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
struct FulfillmentDestinationElement: Codable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used.
    let addressCountry: String?
    /// The locality in which the street address is, and which is in the region. For example,
    /// Mountain View.
    let addressLocality: String?
    /// The region in which the locality is, and which is in the country. Required for applicable
    /// countries (i.e. state in US, province in CA). For example, California or another
    /// appropriate first-level Administrative division.
    let addressRegion: String?
    /// An address extension such as an apartment number, C/O or alternative name.
    let extendedAddress: String?
    /// Optional. First name of the contact associated with the address.
    let firstName: String?
    /// Optional. Last name of the contact associated with the address.
    let lastName: String?
    /// Optional. Phone number of the contact associated with the address.
    let phoneNumber: String?
    /// The postal code. For example, 94043.
    let postalCode: String?
    /// The street address.
    let streetAddress: String?
    /// ID specific to this shipping destination.
    ///
    /// Unique location identifier.
    let id: String
    /// Physical address of the location.
    let address: BillingAddressClass?
    /// Location name (e.g., store name).
    let name: String?

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
        case id, address, name
    }
}

// MARK: FulfillmentDestinationElement convenience initializers and mutators

extension FulfillmentDestinationElement {
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
        address: BillingAddressClass?? = nil,
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
struct GroupElement: Codable {
    /// Group identifier for referencing merchant-generated groups in updates.
    let id: String
    /// Line item IDs included in this group/package.
    let lineItemIDS: [String]
    /// Available fulfillment options for this group.
    let options: [OptionElement]?
    /// ID of the selected fulfillment option for this group.
    let selectedOptionID: String?

    enum CodingKeys: String, CodingKey {
        case id
        case lineItemIDS = "line_item_ids"
        case options
        case selectedOptionID = "selected_option_id"
    }
}

// MARK: GroupElement convenience initializers and mutators

extension GroupElement {
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
// MARK: - FulfillmentOption
struct FulfillmentOption: Codable {
    /// Carrier name (for shipping).
    let carrier: String?
    /// Complete context for buyer decision (e.g., 'Arrives Dec 12-15 via FedEx').
    let description: String?
    /// Earliest fulfillment date.
    let earliestFulfillmentTime: Date?
    /// Unique fulfillment option identifier.
    let id: String
    /// Latest fulfillment date.
    let latestFulfillmentTime: Date?
    /// Short label (e.g., 'Express Shipping', 'Curbside Pickup').
    let title: String
    /// Fulfillment option totals breakdown.
    let totals: [LineItemTotal]

    enum CodingKeys: String, CodingKey {
        case carrier, description
        case earliestFulfillmentTime = "earliest_fulfillment_time"
        case id
        case latestFulfillmentTime = "latest_fulfillment_time"
        case title, totals
    }
}

// MARK: FulfillmentOption convenience initializers and mutators

extension FulfillmentOption {
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

/// Container for fulfillment methods and availability.
// MARK: - Fulfillment
struct Fulfillment: Codable {
    /// Inventory availability hints.
    let availableMethods: [AvailableMethodElement]?
    /// Fulfillment methods for cart items.
    let methods: [MethodElement]?

    enum CodingKeys: String, CodingKey {
        case availableMethods = "available_methods"
        case methods
    }
}

// MARK: Fulfillment convenience initializers and mutators

extension Fulfillment {
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
struct AvailableMethodElement: Codable {
    /// Human-readable availability info (e.g., 'Available for pickup at Downtown Store today').
    let description: String?
    /// 'now' for immediate availability, or ISO 8601 date for future (preorders, transfers).
    let fulfillableOn: String?
    /// Line items available for this fulfillment method.
    let lineItemIDS: [String]
    /// Fulfillment method type this availability applies to.
    let type: TypeElement

    enum CodingKeys: String, CodingKey {
        case description
        case fulfillableOn = "fulfillable_on"
        case lineItemIDS = "line_item_ids"
        case type
    }
}

// MARK: AvailableMethodElement convenience initializers and mutators

extension AvailableMethodElement {
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
struct MethodElement: Codable {
    /// Available destinations. For shipping: addresses. For pickup: retail locations.
    let destinations: [FulfillmentDestinationElement]?
    /// Fulfillment groups for selecting options. Agent sets selected_option_id on groups to
    /// choose shipping method.
    let groups: [GroupElement]?
    /// Unique fulfillment method identifier.
    let id: String
    /// Line item IDs fulfilled via this method.
    let lineItemIDS: [String]
    /// ID of the selected destination.
    let selectedDestinationID: String?
    /// Fulfillment method type.
    let type: TypeElement

    enum CodingKeys: String, CodingKey {
        case destinations, groups, id
        case lineItemIDS = "line_item_ids"
        case selectedDestinationID = "selected_destination_id"
        case type
    }
}

// MARK: MethodElement convenience initializers and mutators

extension MethodElement {
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

// MARK: - Item
struct Item: Codable {
    /// The product identifier, often the SKU, required to resolve the product details associated
    /// with this line item. Should be recognized by both the Platform, and the Business.
    let id: String
    /// Product image URI.
    let imageURL: String?
    /// Unit price in ISO 4217 minor units.
    let price: Int
    /// Product title.
    let title: String

    enum CodingKeys: String, CodingKey {
        case id
        case imageURL = "image_url"
        case price, title
    }
}

// MARK: Item convenience initializers and mutators

extension Item {
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
struct LineItem: Codable {
    let id: String
    let item: ItemClass
    /// Parent line item identifier for any nested structures.
    let parentID: String?
    /// Quantity of the item being purchased.
    let quantity: Int
    /// Line item totals breakdown.
    let totals: [LineItemTotal]

    enum CodingKeys: String, CodingKey {
        case id, item
        case parentID = "parent_id"
        case quantity, totals
    }
}

// MARK: LineItem convenience initializers and mutators

extension LineItem {
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

// MARK: - Link
struct Link: Codable {
    /// Optional display text for the link. When provided, use this instead of generating from
    /// type.
    let title: String?
    /// Type of link. Well-known values: `privacy_policy`, `terms_of_service`, `refund_policy`,
    /// `shipping_policy`, `faq`. Consumers SHOULD handle unknown values gracefully by displaying
    /// them using the `title` field or omitting the link.
    let type: String
    /// The actual URL pointing to the content to be displayed.
    let url: String
}

// MARK: Link convenience initializers and mutators

extension Link {
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

/// Merchant's fulfillment configuration.
// MARK: - MerchantFulfillmentConfig
struct MerchantFulfillmentConfig: Codable {
    /// Allowed method type combinations.
    let allowsMethodCombinations: [[TypeElement]]?
    /// Permits multiple destinations per method type.
    let allowsMultiDestination: MerchantFulfillmentConfigAllowsMultiDestination?

    enum CodingKeys: String, CodingKey {
        case allowsMethodCombinations = "allows_method_combinations"
        case allowsMultiDestination = "allows_multi_destination"
    }
}

// MARK: MerchantFulfillmentConfig convenience initializers and mutators

extension MerchantFulfillmentConfig {
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
struct MerchantFulfillmentConfigAllowsMultiDestination: Codable {
    /// Multiple pickup locations allowed.
    let pickup: Bool?
    /// Multiple shipping destinations allowed.
    let shipping: Bool?
}

// MARK: MerchantFulfillmentConfigAllowsMultiDestination convenience initializers and mutators

extension MerchantFulfillmentConfigAllowsMultiDestination {
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

// MARK: - MessageError
struct MessageError: Codable {
    let code: String
    /// Human-readable message.
    let content: String
    /// Content format, default = plain.
    let contentType: ContentType?
    /// RFC 9535 JSONPath to the component the message refers to (e.g., $.items[1]).
    let path: String?
    /// Reflects the resource state and recommended action. 'recoverable': platform can resolve
    /// by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires
    /// information their API doesn't support collecting programmatically (checkout incomplete).
    /// 'requires_buyer_review': buyer must authorize before order placement due to policy,
    /// regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
    /// retry with new resource or inputs. Errors with 'requires_*' severity contribute to
    /// 'status: requires_escalation'.
    let severity: Severity
    /// Message type discriminator.
    let type: StatusEnum

    enum CodingKeys: String, CodingKey {
        case code, content
        case contentType = "content_type"
        case path, severity, type
    }
}

// MARK: MessageError convenience initializers and mutators

extension MessageError {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(MessageError.self, from: data)
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
        code: String? = nil,
        content: String? = nil,
        contentType: ContentType?? = nil,
        path: String?? = nil,
        severity: Severity? = nil,
        type: StatusEnum? = nil
    ) -> MessageError {
        return MessageError(
            code: code ?? self.code,
            content: content ?? self.content,
            contentType: contentType ?? self.contentType,
            path: path ?? self.path,
            severity: severity ?? self.severity,
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

// MARK: - MessageInfo
struct MessageInfo: Codable {
    /// Info code for programmatic handling.
    let code: String?
    /// Human-readable message.
    let content: String
    /// Content format, default = plain.
    let contentType: ContentType?
    /// RFC 9535 JSONPath to the component the message refers to.
    let path: String?
    /// Message type discriminator.
    let type: MessageInfoType

    enum CodingKeys: String, CodingKey {
        case code, content
        case contentType = "content_type"
        case path, type
    }
}

// MARK: MessageInfo convenience initializers and mutators

extension MessageInfo {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(MessageInfo.self, from: data)
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
        type: MessageInfoType? = nil
    ) -> MessageInfo {
        return MessageInfo(
            code: code ?? self.code,
            content: content ?? self.content,
            contentType: contentType ?? self.contentType,
            path: path ?? self.path,
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

enum MessageInfoType: String, Codable {
    case info = "info"
}

// MARK: - MessageWarning
struct MessageWarning: Codable {
    /// Warning code. Machine-readable identifier for the warning type (e.g., final_sale, prop65,
    /// fulfillment_changed, age_restricted, etc.).
    let code: String
    /// Human-readable warning message that MUST be displayed.
    let content: String
    /// Content format, default = plain.
    let contentType: ContentType?
    /// URL to a required visual element (e.g., warning symbol, energy class label).
    let imageURL: String?
    /// JSONPath (RFC 9535) to related field (e.g., $.line_items[0]).
    let path: String?
    /// Rendering contract for this warning. 'notice' (default): platform MUST display, MAY
    /// dismiss. 'disclosure': platform MUST display in proximity to the path-referenced
    /// component, MUST NOT hide or auto-dismiss. See specification for full contract.
    let presentation: String?
    /// Message type discriminator.
    let type: MessageWarningType
    /// Reference URL for more information (e.g., regulatory site, registry entry, policy page).
    let url: String?

    enum CodingKeys: String, CodingKey {
        case code, content
        case contentType = "content_type"
        case imageURL = "image_url"
        case path, presentation, type, url
    }
}

// MARK: MessageWarning convenience initializers and mutators

extension MessageWarning {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(MessageWarning.self, from: data)
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
        code: String? = nil,
        content: String? = nil,
        contentType: ContentType?? = nil,
        imageURL: String?? = nil,
        path: String?? = nil,
        presentation: String?? = nil,
        type: MessageWarningType? = nil,
        url: String?? = nil
    ) -> MessageWarning {
        return MessageWarning(
            code: code ?? self.code,
            content: content ?? self.content,
            contentType: contentType ?? self.contentType,
            imageURL: imageURL ?? self.imageURL,
            path: path ?? self.path,
            presentation: presentation ?? self.presentation,
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

enum MessageWarningType: String, Codable {
    case warning = "warning"
}

/// Container for error, warning, or info messages.
// MARK: - Message
struct Message: Codable {
    /// Warning code. Machine-readable identifier for the warning type (e.g., final_sale, prop65,
    /// fulfillment_changed, age_restricted, etc.).
    ///
    /// Info code for programmatic handling.
    let code: String?
    /// Human-readable message.
    ///
    /// Human-readable warning message that MUST be displayed.
    let content: String
    /// Content format, default = plain.
    let contentType: ContentType?
    /// RFC 9535 JSONPath to the component the message refers to (e.g., $.items[1]).
    ///
    /// JSONPath (RFC 9535) to related field (e.g., $.line_items[0]).
    ///
    /// RFC 9535 JSONPath to the component the message refers to.
    let path: String?
    /// Reflects the resource state and recommended action. 'recoverable': platform can resolve
    /// by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires
    /// information their API doesn't support collecting programmatically (checkout incomplete).
    /// 'requires_buyer_review': buyer must authorize before order placement due to policy,
    /// regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on,
    /// retry with new resource or inputs. Errors with 'requires_*' severity contribute to
    /// 'status: requires_escalation'.
    let severity: Severity?
    /// Message type discriminator.
    let type: MessageType
    /// URL to a required visual element (e.g., warning symbol, energy class label).
    let imageURL: String?
    /// Rendering contract for this warning. 'notice' (default): platform MUST display, MAY
    /// dismiss. 'disclosure': platform MUST display in proximity to the path-referenced
    /// component, MUST NOT hide or auto-dismiss. See specification for full contract.
    let presentation: String?
    /// Reference URL for more information (e.g., regulatory site, registry entry, policy page).
    let url: String?

    enum CodingKeys: String, CodingKey {
        case code, content
        case contentType = "content_type"
        case path, severity, type
        case imageURL = "image_url"
        case presentation, url
    }
}

// MARK: Message convenience initializers and mutators

extension Message {
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

/// Order details available at the time of checkout completion.
// MARK: - OrderConfirmation
struct OrderConfirmation: Codable {
    /// Unique order identifier.
    let id: String
    /// Human-readable label for identifying the order. MUST only be provided by the business.
    let label: String?
    /// Permalink to access the order on merchant site.
    let permalinkURL: String

    enum CodingKeys: String, CodingKey {
        case id, label
        case permalinkURL = "permalink_url"
    }
}

// MARK: OrderConfirmation convenience initializers and mutators

extension OrderConfirmation {
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
struct OrderLineItem: Codable {
    /// Line item identifier.
    let id: String
    /// Product data (id, title, price, image_url).
    let item: ItemClass
    /// Parent line item identifier for any nested structures.
    let parentID: String?
    /// Quantity tracking for the line item.
    let quantity: OrderLineItemQuantity
    /// Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
    /// quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
    /// quantity.fulfilled > 0, otherwise processing.
    let status: OrderLineItemStatus
    /// Line item totals breakdown.
    let totals: [LineItemTotal]

    enum CodingKeys: String, CodingKey {
        case id, item
        case parentID = "parent_id"
        case quantity, status, totals
    }
}

// MARK: OrderLineItem convenience initializers and mutators

extension OrderLineItem {
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
struct OrderLineItemQuantity: Codable {
    /// Quantity fulfilled so far.
    let fulfilled: Int
    /// Quantity from the original checkout.
    let original: Int?
    /// Current total active quantity. May differ from original due to post-order modifications
    /// (e.g., returns or cancellations).
    let total: Int
}

// MARK: OrderLineItemQuantity convenience initializers and mutators

extension OrderLineItemQuantity {
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
enum OrderLineItemStatus: String, Codable {
    case fulfilled = "fulfilled"
    case partial = "partial"
    case processing = "processing"
    case removed = "removed"
}

/// The base definition for any payment credential. Handlers define specific credential types.
// MARK: - PaymentCredential
struct PaymentCredential: Codable {
    /// The credential type discriminator. Specific schemas will constrain this to a constant
    /// value.
    let type: String
}

// MARK: PaymentCredential convenience initializers and mutators

extension PaymentCredential {
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
struct PaymentIdentity: Codable {
    /// Unique identifier for this participant, obtained during onboarding with the tokenizer.
    let accessToken: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
    }
}

// MARK: PaymentIdentity convenience initializers and mutators

extension PaymentIdentity {
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
struct PaymentInstrument: Codable {
    /// The billing address associated with this payment method.
    let billingAddress: BillingAddressClass?
    let credential: CredentialClass?
    /// Display information for this payment instrument. Each payment instrument schema defines
    /// its specific display properties, as outlined by the payment handler.
    let display: [String: JSONAny]?
    /// The unique identifier for the handler instance that produced this instrument. This
    /// corresponds to the 'id' field in the Payment Handler definition.
    let handlerID: String
    /// A unique identifier for this instrument instance, assigned by the platform.
    let id: String
    /// The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
    /// will constrain this to a constant value.
    let type: String

    enum CodingKeys: String, CodingKey {
        case billingAddress = "billing_address"
        case credential, display
        case handlerID = "handler_id"
        case id, type
    }
}

// MARK: PaymentInstrument convenience initializers and mutators

extension PaymentInstrument {
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
        billingAddress: BillingAddressClass?? = nil,
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
struct PlatformFulfillmentConfig: Codable {
    /// Enables multiple groups per method.
    let supportsMultiGroup: Bool?

    enum CodingKeys: String, CodingKey {
        case supportsMultiGroup = "supports_multi_group"
    }
}

// MARK: PlatformFulfillmentConfig convenience initializers and mutators

extension PlatformFulfillmentConfig {
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

// MARK: - PostalAddress
struct PostalAddress: Codable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used.
    let addressCountry: String?
    /// The locality in which the street address is, and which is in the region. For example,
    /// Mountain View.
    let addressLocality: String?
    /// The region in which the locality is, and which is in the country. Required for applicable
    /// countries (i.e. state in US, province in CA). For example, California or another
    /// appropriate first-level Administrative division.
    let addressRegion: String?
    /// An address extension such as an apartment number, C/O or alternative name.
    let extendedAddress: String?
    /// Optional. First name of the contact associated with the address.
    let firstName: String?
    /// Optional. Last name of the contact associated with the address.
    let lastName: String?
    /// Optional. Phone number of the contact associated with the address.
    let phoneNumber: String?
    /// The postal code. For example, 94043.
    let postalCode: String?
    /// The street address.
    let streetAddress: String?

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
}

// MARK: PostalAddress convenience initializers and mutators

extension PostalAddress {
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

/// A pickup location (retail store, locker, etc.).
// MARK: - RetailLocation
struct RetailLocation: Codable {
    /// Physical address of the location.
    let address: BillingAddressClass?
    /// Unique location identifier.
    let id: String
    /// Location name (e.g., store name).
    let name: String
}

// MARK: RetailLocation convenience initializers and mutators

extension RetailLocation {
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
        address: BillingAddressClass?? = nil,
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

/// Shipping destination.
///
/// The billing address associated with this payment method.
///
/// Delivery destination address.
///
/// Physical address of the location.
// MARK: - ShippingDestination
struct ShippingDestination: Codable {
    /// The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US".
    /// For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a
    /// full country name such as "Singapore" can also be used.
    let addressCountry: String?
    /// The locality in which the street address is, and which is in the region. For example,
    /// Mountain View.
    let addressLocality: String?
    /// The region in which the locality is, and which is in the country. Required for applicable
    /// countries (i.e. state in US, province in CA). For example, California or another
    /// appropriate first-level Administrative division.
    let addressRegion: String?
    /// An address extension such as an apartment number, C/O or alternative name.
    let extendedAddress: String?
    /// Optional. First name of the contact associated with the address.
    let firstName: String?
    /// Optional. Last name of the contact associated with the address.
    let lastName: String?
    /// Optional. Phone number of the contact associated with the address.
    let phoneNumber: String?
    /// The postal code. For example, 94043.
    let postalCode: String?
    /// The street address.
    let streetAddress: String?
    /// ID specific to this shipping destination.
    let id: String

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
        case id
    }
}

// MARK: ShippingDestination convenience initializers and mutators

extension ShippingDestination {
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
struct Signals: Codable {
    /// Client's IP address (IPv4 or IPv6).
    let devUcpBuyerIP: String?
    /// Client's HTTP User-Agent header or equivalent.
    let devUcpUserAgent: String?

    enum CodingKeys: String, CodingKey {
        case devUcpBuyerIP = "dev.ucp.buyer_ip"
        case devUcpUserAgent = "dev.ucp.user_agent"
    }
}

// MARK: Signals convenience initializers and mutators

extension Signals {
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
struct TokenCredential: Codable {
    /// The credential type discriminator. Specific schemas will constrain this to a constant
    /// value.
    ///
    /// The specific type of token produced by the handler (e.g., 'stripe_token').
    let type: String
    /// The token value.
    let token: String
}

// MARK: TokenCredential convenience initializers and mutators

extension TokenCredential {
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
struct Total: Codable {
    let amount: Int
    /// Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
    /// 'Delivery').
    let displayText: String?
    /// Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
    /// fee, total. Businesses MAY use additional values.
    let type: String

    enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
        case type
    }
}

// MARK: Total convenience initializers and mutators

extension Total {
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
struct TotalElement: Codable {
    let amount: Int
    /// Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping',
    /// 'Delivery').
    let displayText: String?
    /// Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax,
    /// fee, total. Businesses MAY use additional values.
    let type: String
    /// Optional itemized breakdown. The parent entry is always rendered; lines are
    /// supplementary. Sum of line amounts MUST equal the parent entry amount.
    let lines: [TotalLineClass]?

    enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
        case type, lines
    }
}

// MARK: TotalElement convenience initializers and mutators

extension TotalElement {
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
struct TotalLineClass: Codable {
    let amount: Int
    /// Human-readable label for this sub-line.
    let displayText: String

    enum CodingKeys: String, CodingKey {
        case amount
        case displayText = "display_text"
    }
}

// MARK: TotalLineClass convenience initializers and mutators

extension TotalLineClass {
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

/// Payment configuration containing handlers.
// MARK: - Payment
struct Payment: Codable {
    /// The payment instruments available for this payment. Each instrument is associated with a
    /// specific handler via the handler_id field. Handlers can extend the base
    /// payment_instrument schema to add handler-specific fields.
    let instruments: [PaymentSelectedPaymentInstrument]?
}

// MARK: Payment convenience initializers and mutators

extension Payment {
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
struct Order: Codable {
    /// Post-order events (refunds, returns, credits, disputes, cancellations, etc.) that exist
    /// independently of fulfillment.
    let adjustments: [AdjustmentElement]?
    /// Associated checkout ID for reconciliation.
    let checkoutID: String
    /// ISO 4217 currency code. MUST match the currency from the originating checkout session.
    let currency: String
    /// Fulfillment data: buyer expectations and what actually happened.
    let fulfillment: FulfillmentClass
    /// Unique order identifier.
    let id: String
    /// Human-readable label for identifying the order. MUST only be provided by the business.
    let label: String?
    /// Line items representing what was purchased — can change post-order via edits or exchanges.
    let lineItems: [LineItemElement]
    /// Business outcome messages (errors, warnings, informational). Present when the business
    /// needs to communicate status or issues to the platform.
    let messages: [MessageElement]?
    /// Permalink to access the order on merchant site.
    let permalinkURL: String
    /// Different totals for the order.
    let totals: [CheckoutTotal]
    let ucp: UCPOrderResponseSchema

    enum CodingKeys: String, CodingKey {
        case adjustments
        case checkoutID = "checkout_id"
        case currency, fulfillment, id, label
        case lineItems = "line_items"
        case messages
        case permalinkURL = "permalink_url"
        case totals, ucp
    }
}

// MARK: Order convenience initializers and mutators

extension Order {
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
        checkoutID: String? = nil,
        currency: String? = nil,
        fulfillment: FulfillmentClass? = nil,
        id: String? = nil,
        label: String?? = nil,
        lineItems: [LineItemElement]? = nil,
        messages: [MessageElement]?? = nil,
        permalinkURL: String? = nil,
        totals: [CheckoutTotal]? = nil,
        ucp: UCPOrderResponseSchema? = nil
    ) -> Order {
        return Order(
            adjustments: adjustments ?? self.adjustments,
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
struct AdjustmentElement: Codable {
    /// Human-readable reason or description (e.g., 'Defective item', 'Customer requested').
    let description: String?
    /// Adjustment event identifier.
    let id: String
    /// Which line items and quantities are affected (optional).
    let lineItems: [AdjustmentLineItemClass]?
    /// RFC 3339 timestamp when this adjustment occurred.
    let occurredAt: Date
    /// Adjustment status.
    let status: AdjustmentStatus
    /// Adjustment totals breakdown. Signed values - negative for money returned to buyer
    /// (refunds, credits), positive for additional charges (exchanges).
    let totals: [LineItemTotal]?
    /// Type of adjustment (open string). Typically money-related like: refund, return, credit,
    /// price_adjustment, dispute, cancellation. Can be any value that makes sense for the
    /// merchant's business.
    let type: String

    enum CodingKeys: String, CodingKey {
        case description, id
        case lineItems = "line_items"
        case occurredAt = "occurred_at"
        case status, totals, type
    }
}

// MARK: AdjustmentElement convenience initializers and mutators

extension AdjustmentElement {
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
struct AdjustmentLineItemClass: Codable {
    /// Line item ID reference.
    let id: String
    /// Signed quantity affected by this adjustment. Negative values represent reductions (e.g.
    /// returns); positive values represent additions (e.g. exchanges).
    let quantity: Int
}

// MARK: AdjustmentLineItemClass convenience initializers and mutators

extension AdjustmentLineItemClass {
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
struct FulfillmentClass: Codable {
    /// Append-only event log of actual shipments. Each event references line items by ID.
    let events: [EventElement]?
    /// Buyer-facing groups representing when/how items will be delivered. Can be split, merged,
    /// or adjusted post-order.
    let expectations: [ExpectationElement]?
}

// MARK: FulfillmentClass convenience initializers and mutators

extension FulfillmentClass {
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
struct EventElement: Codable {
    /// Carrier name (e.g., 'FedEx', 'USPS').
    let carrier: String?
    /// Human-readable description of the shipment status or delivery information (e.g.,
    /// 'Delivered to front door', 'Out for delivery').
    let description: String?
    /// Fulfillment event identifier.
    let id: String
    /// Which line items and quantities are fulfilled in this event.
    let lineItems: [EventLineItem]
    /// RFC 3339 timestamp when this fulfillment event occurred.
    let occurredAt: Date
    /// Carrier tracking number (required if type != processing).
    let trackingNumber: String?
    /// URL to track this shipment (required if type != processing).
    let trackingURL: String?
    /// Fulfillment event type. Common values include: processing (preparing to ship), shipped
    /// (handed to carrier), in_transit (in delivery network), delivered (received by buyer),
    /// failed_attempt (delivery attempt failed), canceled (fulfillment canceled), undeliverable
    /// (cannot be delivered), returned_to_sender (returned to merchant).
    let type: String

    enum CodingKeys: String, CodingKey {
        case carrier, description, id
        case lineItems = "line_items"
        case occurredAt = "occurred_at"
        case trackingNumber = "tracking_number"
        case trackingURL = "tracking_url"
        case type
    }
}

// MARK: EventElement convenience initializers and mutators

extension EventElement {
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
struct EventLineItem: Codable {
    /// Line item ID reference.
    let id: String
    /// Quantity fulfilled in this event.
    let quantity: Int
}

// MARK: EventLineItem convenience initializers and mutators

extension EventLineItem {
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
struct ExpectationElement: Codable {
    /// Human-readable delivery description (e.g., 'Arrives in 5-8 business days').
    let description: String?
    /// Delivery destination address.
    let destination: BillingAddressClass
    /// When this expectation can be fulfilled: 'now' or ISO 8601 timestamp for future date
    /// (backorder, pre-order).
    let fulfillableOn: String?
    /// Expectation identifier.
    let id: String
    /// Which line items and quantities are in this expectation.
    let lineItems: [ExpectationLineItemClass]
    /// Delivery method type (shipping, pickup, digital).
    let methodType: MethodType

    enum CodingKeys: String, CodingKey {
        case description, destination
        case fulfillableOn = "fulfillable_on"
        case id
        case lineItems = "line_items"
        case methodType = "method_type"
    }
}

// MARK: ExpectationElement convenience initializers and mutators

extension ExpectationElement {
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
        destination: BillingAddressClass? = nil,
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
struct ExpectationLineItemClass: Codable {
    /// Line item ID reference.
    let id: String
    /// Quantity of this item in this expectation.
    let quantity: Int
}

// MARK: ExpectationLineItemClass convenience initializers and mutators

extension ExpectationLineItemClass {
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
struct LineItemElement: Codable {
    /// Line item identifier.
    let id: String
    /// Product data (id, title, price, image_url).
    let item: ItemClass
    /// Parent line item identifier for any nested structures.
    let parentID: String?
    /// Quantity tracking for the line item.
    let quantity: LineItemQuantity
    /// Derived status: removed if quantity.total == 0, fulfilled if quantity.total > 0 and
    /// quantity.fulfilled == quantity.total, partial if quantity.total > 0 and
    /// quantity.fulfilled > 0, otherwise processing.
    let status: OrderLineItemStatus
    /// Line item totals breakdown.
    let totals: [LineItemTotal]

    enum CodingKeys: String, CodingKey {
        case id, item
        case parentID = "parent_id"
        case quantity, status, totals
    }
}

// MARK: LineItemElement convenience initializers and mutators

extension LineItemElement {
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
struct LineItemQuantity: Codable {
    /// Quantity fulfilled so far.
    let fulfilled: Int
    /// Quantity from the original checkout.
    let original: Int?
    /// Current total active quantity. May differ from original due to post-order modifications
    /// (e.g., returns or cancellations).
    let total: Int
}

// MARK: LineItemQuantity convenience initializers and mutators

extension LineItemQuantity {
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
struct UCPOrderResponseSchema: Codable {
    /// Capability registry keyed by reverse-domain name.
    let capabilities: [String: [CapabilityResponseSchema]]?
    /// Payment handler registry keyed by reverse-domain name.
    let paymentHandlers: [String: [PaymentHandlerResponseSchema]]?
    /// Service registry keyed by reverse-domain name.
    let services: [String: [UCPOrderResponseSchemaService]]?
    /// Application-level status of the UCP operation.
    let status: UCPCheckoutResponseSchemaStatus?
    let version: String

    enum CodingKeys: String, CodingKey {
        case capabilities
        case paymentHandlers = "payment_handlers"
        case services, status, version
    }
}

// MARK: UCPOrderResponseSchema convenience initializers and mutators

extension UCPOrderResponseSchema {
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
struct InstrumentsChangeResult: Codable {
    /// Partial checkout update with payment instrument selection.
    let checkout: InstrumentsChangeCheckout?
    /// UCP protocol metadata. Status MUST be 'error' for error response.
    let ucp: InstrumentsChangeResultUcp
    /// URL for buyer handoff or session recovery.
    let continueURL: String?
    /// Array of messages describing why the operation failed.
    let messages: [MessageElement]?

    enum CodingKeys: String, CodingKey {
        case checkout, ucp
        case continueURL = "continue_url"
        case messages
    }
}

// MARK: InstrumentsChangeResult convenience initializers and mutators

extension InstrumentsChangeResult {
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
        messages: [MessageElement]?? = nil
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
struct InstrumentsChangeCheckout: Codable {
    let payment: InstrumentsChangePayment?
}

// MARK: InstrumentsChangeCheckout convenience initializers and mutators

extension InstrumentsChangeCheckout {
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
struct InstrumentsChangePayment: Codable {
    /// Available payment instruments.
    let instruments: [PurpleSelectedPaymentInstrument]?
    /// ID of the selected payment instrument.
    let selectedInstrumentID: String?

    enum CodingKeys: String, CodingKey {
        case instruments
        case selectedInstrumentID = "selected_instrument_id"
    }
}

// MARK: InstrumentsChangePayment convenience initializers and mutators

extension InstrumentsChangePayment {
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
struct PurpleSelectedPaymentInstrument: Codable {
    /// The billing address associated with this payment method.
    let billingAddress: BillingAddressClass?
    let credential: CredentialClass?
    /// Display information for this payment instrument. Each payment instrument schema defines
    /// its specific display properties, as outlined by the payment handler.
    let display: [String: JSONAny]?
    /// The unique identifier for the handler instance that produced this instrument. This
    /// corresponds to the 'id' field in the Payment Handler definition.
    let handlerID: String
    /// A unique identifier for this instrument instance, assigned by the platform.
    let id: String
    /// The broad category of the instrument (e.g., 'card', 'tokenized_card'). Specific schemas
    /// will constrain this to a constant value.
    let type: String
    /// Whether this instrument is selected by the user.
    let selected: Bool?

    enum CodingKeys: String, CodingKey {
        case billingAddress = "billing_address"
        case credential, display
        case handlerID = "handler_id"
        case id, type, selected
    }
}

// MARK: PurpleSelectedPaymentInstrument convenience initializers and mutators

extension PurpleSelectedPaymentInstrument {
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
        billingAddress: BillingAddressClass?? = nil,
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
struct InstrumentsChangeResultUcp: Codable {
    /// Capability registry keyed by reverse-domain name.
    let capabilities: [String: [CapabilityElement]]?
    /// Payment handler registry keyed by reverse-domain name.
    let paymentHandlers: [String: [PaymentHandlerElement]]?
    /// Service registry keyed by reverse-domain name.
    let services: [String: [PurpleService]]?
    /// Application-level status of the UCP operation.
    let status: UCPCheckoutResponseSchemaStatus
    let version: String

    enum CodingKeys: String, CodingKey {
        case capabilities
        case paymentHandlers = "payment_handlers"
        case services, status, version
    }
}

// MARK: InstrumentsChangeResultUcp convenience initializers and mutators

extension InstrumentsChangeResultUcp {
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
struct CapabilityElement: Codable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    let id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    let schema: String?
    /// URL to human-readable specification document.
    let spec: String?
    /// Entity version in YYYY-MM-DD format.
    let version: String
    /// Parent capability(s) this extends. Present for extensions, absent for root capabilities.
    /// Use array for multi-parent extensions.
    let extends: Extends?
}

// MARK: CapabilityElement convenience initializers and mutators

extension CapabilityElement {
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
struct PaymentHandlerElement: Codable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    let id: String
    /// URL to JSON Schema defining this entity's structure and payloads.
    let schema: String?
    /// URL to human-readable specification document.
    let spec: String?
    /// Entity version in YYYY-MM-DD format.
    let version: String
    /// Instrument types this handler supports, with optional constraints. When absent, every
    /// instrument should be considered available.
    let availableInstruments: [PaymentHandlerAvailableInstrument]?

    enum CodingKeys: String, CodingKey {
        case config, id, schema, spec, version
        case availableInstruments = "available_instruments"
    }
}

// MARK: PaymentHandlerElement convenience initializers and mutators

extension PaymentHandlerElement {
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
struct PaymentHandlerAvailableInstrument: Codable {
    /// Constraints on this instrument type. Structure depends on instrument type and active
    /// capabilities.
    let constraints: [String: JSONAny]?
    /// The instrument type identifier (e.g., 'card', 'gift_card'). References an instrument
    /// schema's type constant.
    let type: String
}

// MARK: PaymentHandlerAvailableInstrument convenience initializers and mutators

extension PaymentHandlerAvailableInstrument {
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
struct PurpleService: Codable {
    /// Entity-specific configuration. Structure defined by each entity's schema.
    let config: [String: JSONAny]?
    /// Unique identifier for this entity instance. Used to disambiguate when multiple instances
    /// exist.
    let id: String?
    /// URL to JSON Schema defining this entity's structure and payloads.
    let schema: String?
    /// URL to human-readable specification document.
    let spec: String?
    /// Entity version in YYYY-MM-DD format.
    let version: String
    /// Endpoint URL for this transport binding.
    let endpoint: String?
    /// Transport protocol for this service binding.
    let transport: Transport
}

// MARK: PurpleService convenience initializers and mutators

extension PurpleService {
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
struct CredentialResult: Codable {
    /// Partial checkout update with payment credential.
    let checkout: CredentialCheckout?
    /// UCP protocol metadata. Status MUST be 'error' for error response.
    let ucp: InstrumentsChangeResultUcp
    /// URL for buyer handoff or session recovery.
    let continueURL: String?
    /// Array of messages describing why the operation failed.
    let messages: [MessageElement]?

    enum CodingKeys: String, CodingKey {
        case checkout, ucp
        case continueURL = "continue_url"
        case messages
    }
}

// MARK: CredentialResult convenience initializers and mutators

extension CredentialResult {
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
        messages: [MessageElement]?? = nil
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
struct CredentialCheckout: Codable {
    let payment: CredentialPayment?
}

// MARK: CredentialCheckout convenience initializers and mutators

extension CredentialCheckout {
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
struct CredentialPayment: Codable {
    /// Available payment instruments.
    let instruments: [PurpleSelectedPaymentInstrument]?
}

// MARK: CredentialPayment convenience initializers and mutators

extension CredentialPayment {
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

typealias Amount = Int
typealias ErrorCode = String
typealias ReverseDomainName = String
typealias SignedAmount = Int
typealias Totals = [TotalElement]

extension Array where Element == Totals.Element {
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

class JSONNull: Codable, Hashable {

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

class JSONAny: Codable {

    let value: Any

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
