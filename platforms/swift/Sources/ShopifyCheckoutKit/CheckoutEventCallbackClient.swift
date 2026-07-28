#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Foundation

/// Delivers checkout notifications to the idiomatic callback client before
/// forwarding the same message to an advanced protocol client.
struct CheckoutEventCallbackClient: CheckoutCommunicationProtocol {
    let callbacks: CheckoutProtocol.Client
    let advanced: (any CheckoutCommunicationProtocol)?

    func process(_ message: String) async -> String? {
        if let response = await callbacks.process(message) {
            return response
        }
        return await advanced?.process(message)
    }
}
