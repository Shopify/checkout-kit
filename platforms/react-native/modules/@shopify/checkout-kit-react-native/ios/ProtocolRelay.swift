import Foundation
#if COCOAPODS
    import ShopifyCheckoutKit
#else
    import ShopifyCheckoutProtocol

    enum CheckoutProtocol {
        typealias Client = EmbeddedCheckoutProtocol.Client

        static let complete = EmbeddedCheckoutProtocol.Event.complete
        static let error = EmbeddedCheckoutProtocol.Event.error
        static let lineItemsChange = EmbeddedCheckoutProtocol.Event.lineItemsChange
        static let messagesChange = EmbeddedCheckoutProtocol.Event.messagesChange
        static let start = EmbeddedCheckoutProtocol.Event.start
        static let totalsChange = EmbeddedCheckoutProtocol.Event.totalsChange
    }
#endif

struct DispatchEnvelope<Payload: Encodable>: Encodable {
    let type: String
    let payload: Payload
}

/// Bridges native CheckoutProtocol notifications to the React Native onDispatch
/// event stream. Payloads are emitted in protocol wire casing; JS performs the
/// schema-aware conversion to the public camelCase shape with QuickType.
let supportedProtocolRelayMethods = [
    CheckoutProtocol.complete.method,
    CheckoutProtocol.error.method,
    CheckoutProtocol.fulfillmentChange.method,
    CheckoutProtocol.lineItemsChange.method,
    CheckoutProtocol.messagesChange.method,
    CheckoutProtocol.start.method,
    CheckoutProtocol.totalsChange.method
]

func makeRelayClient(
    subscribedMethods: [String],
    dispatch: @escaping @MainActor @Sendable (String) -> Void
) -> CheckoutProtocol.Client {
    var client = CheckoutProtocol.Client()

    for method in subscribedMethods {
        switch method {
        case CheckoutProtocol.complete.method:
            client = client.on(CheckoutProtocol.complete) { checkout in
                forwardEnvelope(type: method, payload: checkout, dispatch: dispatch)
            }
        case CheckoutProtocol.error.method:
            client = client.on(CheckoutProtocol.error) { error in
                forwardEnvelope(type: method, payload: error, dispatch: dispatch)
            }
        case CheckoutProtocol.fulfillmentChange.method:
            client = client.on(CheckoutProtocol.fulfillmentChange) { checkout in
                forwardEnvelope(type: method, payload: checkout, dispatch: dispatch)
            }
        case CheckoutProtocol.lineItemsChange.method:
            client = client.on(CheckoutProtocol.lineItemsChange) { checkout in
                forwardEnvelope(type: method, payload: checkout, dispatch: dispatch)
            }
        case CheckoutProtocol.messagesChange.method:
            client = client.on(CheckoutProtocol.messagesChange) { checkout in
                forwardEnvelope(type: method, payload: checkout, dispatch: dispatch)
            }
        case CheckoutProtocol.start.method:
            client = client.on(CheckoutProtocol.start) { checkout in
                forwardEnvelope(type: method, payload: checkout, dispatch: dispatch)
            }
        case CheckoutProtocol.totalsChange.method:
            client = client.on(CheckoutProtocol.totalsChange) { checkout in
                forwardEnvelope(type: method, payload: checkout, dispatch: dispatch)
            }
        default:
            continue
        }
    }

    return client
}

@MainActor
private func forwardEnvelope(
    type: String,
    payload: some Encodable,
    dispatch: @MainActor @Sendable (String) -> Void
) {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    guard
        let data = try? encoder.encode(DispatchEnvelope(type: type, payload: payload)),
        let json = String(data: data, encoding: .utf8)
    else {
        return
    }
    dispatch(json)
}
