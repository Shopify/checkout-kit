#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Combine
import Foundation

/// Observable, consumer-oriented state derived from Embedded Checkout Protocol events.
@MainActor
public final class CheckoutState: ObservableObject {
    public enum Phase: Equatable, Sendable {
        case idle
        case active
        case unavailable(reason: UnavailableReason)
        case completed
        case failed
    }

    public enum UnavailableReason: Equatable, Sendable {
        case allItemsOutOfStock
    }

    @Published public private(set) var phase: Phase = .idle
    @Published public private(set) var checkout: Checkout?
    @Published public private(set) var error: ErrorResponse?

    private lazy var observer = CheckoutProtocol.Client()
        .on(CheckoutProtocol.start) { [weak self] checkout in
            self?.receive(checkout)
        }
        .on(CheckoutProtocol.lineItemsChange) { [weak self] checkout in
            self?.receive(checkout)
        }
        .on(CheckoutProtocol.fulfillmentChange) { [weak self] checkout in
            self?.receive(checkout)
        }
        .on(CheckoutProtocol.messagesChange) { [weak self] checkout in
            self?.receive(checkout)
        }
        .on(CheckoutProtocol.totalsChange) { [weak self] checkout in
            self?.receive(checkout)
        }
        .on(CheckoutProtocol.complete) { [weak self] checkout in
            self?.checkout = checkout
            self?.error = nil
            self?.transition(to: .completed)
        }
        .on(CheckoutProtocol.error) { [weak self] error in
            self?.error = error
            self?.transition(to: .failed)
        }

    public init() {}

    /// Returns a protocol client that updates this state before forwarding each
    /// message to the consumer's client.
    public func observing(
        _ client: (any CheckoutCommunicationProtocol)? = nil
    ) -> any CheckoutCommunicationProtocol {
        CheckoutStateObservingClient(state: self, client: client)
    }

    fileprivate func process(_ message: String) async -> String? {
        await observer.process(message)
    }

    private func receive(_ checkout: Checkout) {
        self.checkout = checkout
        error = nil

        if checkout.isFullyOutOfStock {
            transition(to: .unavailable(reason: .allItemsOutOfStock))
        } else {
            transition(to: .active)
        }
    }

    private func transition(to phase: Phase) {
        guard self.phase != phase else { return }
        self.phase = phase
    }
}

private extension Checkout {
    var isFullyOutOfStock: Bool {
        lineItems.isEmpty && messages?.contains {
            $0.type == .error && $0.code == "out_of_stock"
        } == true
    }
}

private struct CheckoutStateObservingClient: CheckoutCommunicationProtocol {
    let state: CheckoutState
    let client: (any CheckoutCommunicationProtocol)?

    func process(_ message: String) async -> String? {
        let observedResponse = await state.process(message)
        let clientResponse = await client?.process(message)
        return clientResponse ?? observedResponse
    }
}
