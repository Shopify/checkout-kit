#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Foundation

/// A protocol-independent snapshot of the checkout visible to the buyer.
///
/// Checkout Kit derives this value from its internal communication protocol. Raw protocol
/// messages, links, and transport metadata are intentionally not exposed.
public struct Checkout: Equatable, Sendable {
    public let id: String
    public let status: CheckoutStatus
    public let currency: String
    public let buyer: CheckoutBuyer?
    public let lineItems: CheckoutLineItems
    public let totals: [CheckoutTotal]
    public let fulfillment: CheckoutFulfillment?
    public let discounts: [CheckoutDiscount]
    public let paymentInstruments: [CheckoutPaymentInstrument]
    public let order: CheckoutOrder?

    public init(
        id: String,
        status: CheckoutStatus,
        currency: String,
        buyer: CheckoutBuyer? = nil,
        lineItems: CheckoutLineItems,
        totals: [CheckoutTotal],
        fulfillment: CheckoutFulfillment? = nil,
        discounts: [CheckoutDiscount] = [],
        paymentInstruments: [CheckoutPaymentInstrument] = [],
        order: CheckoutOrder? = nil
    ) {
        self.id = id
        self.status = status
        self.currency = currency
        self.buyer = buyer
        self.lineItems = lineItems
        self.totals = totals
        self.fulfillment = fulfillment
        self.discounts = discounts
        self.paymentInstruments = paymentInstruments
        self.order = order
    }
}

public enum CheckoutStatus: String, Equatable, Sendable {
    case incomplete
    case readyForComplete = "ready_for_complete"
    case completeInProgress = "complete_in_progress"
    case completed
    case canceled
    case requiresEscalation = "requires_escalation"
}

public struct CheckoutBuyer: Equatable, Sendable {
    public let email: String?
    public let firstName: String?
    public let lastName: String?
    public let phoneNumber: String?
}

public struct CheckoutLineItems: RandomAccessCollection, Equatable, Sendable {
    public typealias Index = Int

    private let items: [CheckoutLineItem]

    /// Whether Checkout Kit determined that every item was removed because it is out of stock.
    public let allOutOfStock: Bool

    public init(_ items: [CheckoutLineItem], allOutOfStock: Bool = false) {
        self.items = items
        self.allOutOfStock = allOutOfStock
    }

    public var startIndex: Int {
        items.startIndex
    }

    public var endIndex: Int {
        items.endIndex
    }

    public subscript(position: Int) -> CheckoutLineItem {
        items[position]
    }
}

public struct CheckoutLineItem: Identifiable, Equatable, Sendable {
    public let id: String
    public let merchandiseID: String
    public let title: String
    public let quantity: Int
    public let unitPrice: Int
    public let totals: [CheckoutLineItemTotal]
    public let availability: CheckoutLineItemAvailability
}

public enum CheckoutLineItemAvailability: Equatable, Sendable {
    case available
    case outOfStock
}

public struct CheckoutLineItemTotal: Equatable, Sendable {
    public let type: String
    public let amount: Int
    public let displayText: String?
}

public struct CheckoutTotal: Equatable, Sendable {
    public let type: String
    public let amount: Int
    public let displayText: String?
}

public struct CheckoutFulfillment: Equatable, Sendable {
    public let availableMethods: [CheckoutFulfillmentAvailability]
    public let methods: [CheckoutFulfillmentMethod]
}

public struct CheckoutFulfillmentAvailability: Equatable, Sendable {
    public let type: CheckoutFulfillmentMethodType
    public let lineItemIDs: [String]
    public let description: String?
    public let fulfillableOn: String?
}

public struct CheckoutFulfillmentMethod: Identifiable, Equatable, Sendable {
    public let id: String
    public let type: CheckoutFulfillmentMethodType
    public let lineItemIDs: [String]
    public let selectedDestinationID: String?
}

public enum CheckoutFulfillmentMethodType: String, Equatable, Sendable {
    case shipping
    case pickup
}

public struct CheckoutDiscount: Equatable, Sendable {
    public let title: String
    public let code: String?
    public let amount: Int
    public let automatic: Bool
    public let provisional: Bool
}

public struct CheckoutPaymentInstrument: Identifiable, Equatable, Sendable {
    public let id: String
    public let type: String
    public let handlerID: String
    public let selected: Bool
}

public struct CheckoutOrder: Identifiable, Equatable, Sendable {
    public let id: String
    public let label: String?
    public let permalink: URL?
}

extension Checkout {
    init?(protocolCheckout: some Encodable) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        guard
            let data = try? encoder.encode(protocolCheckout),
            let checkout = try? decoder.decode(ProtocolCheckoutProjection.self, from: data)
        else {
            return nil
        }

        let outOfStockIndexes = Set((checkout.messages ?? []).compactMap(Self.outOfStockLineItemIndex))
        let items = checkout.lineItems.enumerated().map { index, lineItem in
            CheckoutLineItem(
                id: lineItem.id,
                merchandiseID: lineItem.item.id,
                title: lineItem.item.title,
                quantity: lineItem.quantity,
                unitPrice: lineItem.item.price,
                totals: lineItem.totals.map {
                    CheckoutLineItemTotal(type: $0.type, amount: $0.amount, displayText: $0.displayText)
                },
                availability: outOfStockIndexes.contains(index) ? .outOfStock : .available
            )
        }
        let hasOutOfStockMessage = (checkout.messages ?? []).contains { $0.code == "out_of_stock" }
        let allOutOfStock = (items.isEmpty && hasOutOfStockMessage)
            || (!items.isEmpty && items.allSatisfy { $0.availability == .outOfStock })

        id = checkout.id
        status = CheckoutStatus(rawValue: checkout.status) ?? .incomplete
        currency = checkout.currency
        buyer = checkout.buyer.map {
            CheckoutBuyer(
                email: $0.email,
                firstName: $0.firstName,
                lastName: $0.lastName,
                phoneNumber: $0.phoneNumber
            )
        }
        lineItems = CheckoutLineItems(items, allOutOfStock: allOutOfStock)
        totals = checkout.totals.map {
            CheckoutTotal(type: $0.type, amount: $0.amount, displayText: $0.displayText)
        }
        fulfillment = checkout.fulfillment.map { fulfillment in
            CheckoutFulfillment(
                availableMethods: (fulfillment.availableMethods ?? []).map { availability in
                    CheckoutFulfillmentAvailability(
                        type: CheckoutFulfillmentMethodType(rawValue: availability.type) ?? .shipping,
                        lineItemIDs: availability.lineItemIDs,
                        description: availability.description,
                        fulfillableOn: availability.fulfillableOn
                    )
                },
                methods: (fulfillment.methods ?? []).map { method in
                    CheckoutFulfillmentMethod(
                        id: method.id,
                        type: CheckoutFulfillmentMethodType(rawValue: method.type) ?? .shipping,
                        lineItemIDs: method.lineItemIDs,
                        selectedDestinationID: method.selectedDestinationID
                    )
                }
            )
        }
        discounts = (checkout.discounts?.applied ?? []).map {
            CheckoutDiscount(
                title: $0.title,
                code: $0.code,
                amount: $0.amount,
                automatic: $0.automatic ?? false,
                provisional: $0.provisional ?? false
            )
        }
        paymentInstruments = (checkout.payment?.instruments ?? []).map {
            CheckoutPaymentInstrument(
                id: $0.id,
                type: $0.type,
                handlerID: $0.handlerID,
                selected: $0.selected ?? false
            )
        }
        order = checkout.order.map {
            CheckoutOrder(id: $0.id, label: $0.label, permalink: URL(string: $0.permalinkURL))
        }
    }

    private static func outOfStockLineItemIndex(_ message: ProtocolCheckoutProjection.Message) -> Int? {
        guard message.code == "out_of_stock", let path = message.path else { return nil }
        let prefix = "$.line_items["
        guard path.hasPrefix(prefix), let closingBracket = path[prefix.endIndex...].firstIndex(of: "]") else {
            return nil
        }
        return Int(path[prefix.endIndex ..< closingBracket])
    }
}

private struct ProtocolCheckoutProjection: Decodable {
    let buyer: Buyer?
    let currency: String
    let discounts: Discounts?
    let fulfillment: Fulfillment?
    let id: String
    let lineItems: [LineItem]
    let messages: [Message]?
    let order: Order?
    let payment: Payment?
    let status: String
    let totals: [Total]

    enum CodingKeys: String, CodingKey {
        case buyer, currency, discounts, fulfillment, id
        case lineItems = "line_items"
        case messages, order, payment, status, totals
    }

    struct Buyer: Decodable {
        let email: String?
        let firstName: String?
        let lastName: String?
        let phoneNumber: String?

        enum CodingKeys: String, CodingKey {
            case email
            case firstName = "first_name"
            case lastName = "last_name"
            case phoneNumber = "phone_number"
        }
    }

    struct LineItem: Decodable {
        let id: String
        let item: Item
        let quantity: Int
        let totals: [LineItemTotal]
    }

    struct Item: Decodable {
        let id: String
        let price: Int
        let title: String
    }

    struct LineItemTotal: Decodable {
        let amount: Int
        let displayText: String?
        let type: String

        enum CodingKeys: String, CodingKey {
            case amount
            case displayText = "display_text"
            case type
        }
    }

    struct Total: Decodable {
        let amount: Int
        let displayText: String?
        let type: String

        enum CodingKeys: String, CodingKey {
            case amount
            case displayText = "display_text"
            case type
        }
    }

    struct Message: Decodable {
        let code: String?
        let path: String?
    }

    struct Fulfillment: Decodable {
        let availableMethods: [AvailableMethod]?
        let methods: [Method]?

        enum CodingKeys: String, CodingKey {
            case availableMethods = "available_methods"
            case methods
        }
    }

    struct AvailableMethod: Decodable {
        let description: String?
        let fulfillableOn: String?
        let lineItemIDs: [String]
        let type: String

        enum CodingKeys: String, CodingKey {
            case description
            case fulfillableOn = "fulfillable_on"
            case lineItemIDs = "line_item_ids"
            case type
        }
    }

    struct Method: Decodable {
        let id: String
        let lineItemIDs: [String]
        let selectedDestinationID: String?
        let type: String

        enum CodingKeys: String, CodingKey {
            case id
            case lineItemIDs = "line_item_ids"
            case selectedDestinationID = "selected_destination_id"
            case type
        }
    }

    struct Discounts: Decodable {
        let applied: [Discount]?
    }

    struct Discount: Decodable {
        let amount: Int
        let automatic: Bool?
        let code: String?
        let provisional: Bool?
        let title: String
    }

    struct Payment: Decodable {
        let instruments: [Instrument]?
    }

    struct Instrument: Decodable {
        let handlerID: String
        let id: String
        let selected: Bool?
        let type: String

        enum CodingKeys: String, CodingKey {
            case handlerID = "handler_id"
            case id, selected, type
        }
    }

    struct Order: Decodable {
        let id: String
        let label: String?
        let permalinkURL: String

        enum CodingKeys: String, CodingKey {
            case id, label
            case permalinkURL = "permalink_url"
        }
    }
}
