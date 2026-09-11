#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Foundation

@MainActor
protocol CheckoutEventSink: AnyObject {
    func checkoutDidStart(_ checkout: Checkout)
    func checkoutDidUpdate(_ checkout: Checkout)
    func checkoutDidComplete(_ checkout: Checkout)
}

/// Translates protocol notifications into the stable lifecycle exposed by Checkout Kit.
struct CheckoutEventAdapter: CheckoutCommunicationProtocol {
    private let base: (any CheckoutCommunicationProtocol)?
    private let eventClient: EmbeddedCheckoutProtocol.Client

    @MainActor
    init(base: (any CheckoutCommunicationProtocol)? = nil, sink: any CheckoutEventSink) {
        self.base = base
        let state = CheckoutEventState(sink: sink)
        eventClient = EmbeddedCheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { state.start($0) }
            .on(CheckoutProtocol.lineItemsChange) { state.update($0) }
            .on(CheckoutProtocol.messagesChange) { state.update($0) }
            .on(CheckoutProtocol.totalsChange) { state.update($0) }
            .on(CheckoutProtocol.fulfillmentChange) { state.update($0) }
            .on(CheckoutProtocol.complete) { state.complete($0) }
    }

    func process(_ message: String) async -> String? {
        let response = await base?.process(message)
        let eventResponse = await eventClient.process(message)
        return response ?? eventResponse
    }
}

@MainActor
private final class CheckoutEventState {
    weak var sink: (any CheckoutEventSink)?
    private var latestCheckout: Checkout?

    init(sink: any CheckoutEventSink) {
        self.sink = sink
    }

    func start(_ checkout: some Encodable) {
        guard let snapshot = Checkout(protocolCheckout: checkout) else { return }
        latestCheckout = snapshot
        sink?.checkoutDidStart(snapshot)
    }

    func update(_ checkout: some Encodable) {
        guard let snapshot = Checkout(protocolCheckout: checkout) else { return }
        guard snapshot != latestCheckout else { return }
        latestCheckout = snapshot
        sink?.checkoutDidUpdate(snapshot)
    }

    func complete(_ checkout: some Encodable) {
        guard let snapshot = Checkout(protocolCheckout: checkout) else { return }
        latestCheckout = snapshot
        sink?.checkoutDidComplete(snapshot)
    }
}
