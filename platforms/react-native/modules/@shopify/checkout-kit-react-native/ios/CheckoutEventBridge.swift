import Foundation
import ShopifyCheckoutKit

/// Serializes native Kit snapshots in wire casing; JS decodes known fields using
/// the shared schema and preserves extension keys unchanged.
struct DispatchEnvelope<Payload: Encodable>: Encodable {
    let type: String
    let requestId: String?
    let payload: Payload
}

struct CheckoutEventPayload: Encodable {
    let checkout: Checkout
}

func checkoutEventJSON(type: DispatchEventType, checkout: Checkout, requestId: String? = nil) -> String? {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .custom { date, encoder in
        var container = encoder.singleValueContainer()
        try container.encode(date.ISO8601Format(Date.ISO8601FormatStyle(includingFractionalSeconds: true)))
    }
    do {
        let data = try encoder.encode(DispatchEnvelope(type: type.rawValue, requestId: requestId, payload: CheckoutEventPayload(checkout: checkout)))
        return String(data: data, encoding: .utf8)
    } catch {
        NSLog("[ShopifyCheckoutKit] Failed to serialize checkout event")
        return nil
    }
}

func checkoutLinkAction(_ value: String) -> CheckoutLinkAction {
    switch value {
    case "handled": return .handled
    case "cancel": return .cancel
    default: return .open
    }
}

/// A presentation retains its own delegate so queued events cannot cross sessions.
@MainActor
final class CheckoutEventBridge: CheckoutDelegate {
    var requestId: String
    var linkAction: CheckoutLinkAction
    private var dispatch: ((String) -> Void)?
    private let onTerminal: () -> Void

    init(requestId: String, linkAction: String, dispatch: @escaping (String) -> Void, onTerminal: @escaping () -> Void) {
        self.requestId = requestId
        self.linkAction = checkoutLinkAction(linkAction)
        self.dispatch = dispatch
        self.onTerminal = onTerminal
    }

    func checkoutDidStart(_ event: CheckoutStartEvent) {
        emit(.start, checkout: event.checkout)
    }

    func checkoutDidUpdate(_ event: CheckoutUpdateEvent) {
        emit(.update, checkout: event.checkout)
    }

    func checkoutDidComplete(_ event: CheckoutCompleteEvent) {
        emit(.complete, checkout: event.checkout)
    }

    func checkoutDidFail(_ event: CheckoutFailureEvent) {
        finish(.fail, payload: ["error": ShopifyEventSerialization.serialize(checkoutError: event.error)])
    }

    func checkoutDidDismiss() {
        finish(.dismiss)
    }

    func checkoutAction(for link: CheckoutLink) -> CheckoutLinkAction {
        guard dispatch != nil else { return .cancel }
        emit(.linkClick, payload: ShopifyEventSerialization.serialize(clickEvent: link.url))
        return linkAction
    }

    private func emit(_ type: DispatchEventType, checkout: Checkout) {
        guard let json = checkoutEventJSON(type: type, checkout: checkout, requestId: requestId) else { return }
        dispatch?(json)
    }

    private func emit(_ type: DispatchEventType, payload: [String: Any] = [:]) {
        let envelope: [String: Any] = ["type": type.rawValue, "requestId": requestId, "payload": payload]
        guard let data = try? JSONSerialization.data(withJSONObject: envelope), let json = String(data: data, encoding: .utf8) else { return }
        dispatch?(json)
    }

    private func finish(_ type: DispatchEventType, payload: [String: Any] = [:]) {
        guard dispatch != nil else { return }
        onTerminal()
        emit(type, payload: payload)
        dispatch = nil
    }
}
