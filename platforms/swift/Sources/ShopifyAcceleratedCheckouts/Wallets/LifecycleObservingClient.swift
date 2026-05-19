import Foundation
import ShopifyCheckoutKit

/// Wraps a consumer's `CheckoutCommunicationProtocol` client to observe lifecycle events.
/// Peeks at incoming JSON-RPC messages for `ec.complete`, fires the `onComplete` signal
/// for the state machine, then delegates all processing to the underlying `base` client.
struct LifecycleObservingClient: CheckoutCommunicationProtocol {
    let base: (any CheckoutCommunicationProtocol)?
    let onComplete: @Sendable @MainActor () -> Void

    func process(_ message: String) async -> String? {
        if let method = extractMethod(from: message), method == "ec.complete" {
            await onComplete()
        }
        return await base?.process(message)
    }

    private func extractMethod(from message: String) -> String? {
        guard let data = message.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let method = json["method"] as? String
        else {
            return nil
        }
        return method
    }
}
