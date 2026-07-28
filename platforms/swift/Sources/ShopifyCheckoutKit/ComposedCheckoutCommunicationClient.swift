#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Foundation

/// Composes a merchant-supplied protocol client with kit-owned default handlers.
///
/// The default bindings make the dispatch policy explicit in one place:
/// requests such as `CheckoutProtocol.ready` and `CheckoutProtocol.windowOpen` fall
/// back to kit defaults when the merchant does not return a response, while mandatory
/// kit notifications such as `CheckoutProtocol.error` always run after the merchant
/// client.
struct ComposedCheckoutCommunicationClient: CheckoutCommunicationProtocol {
    let merchant: (any CheckoutCommunicationProtocol)?
    let defaults: [String: DefaultClientBinding]

    func process(_ message: String) async -> String? {
        guard let method = Self.method(message), let binding = defaults[method] else {
            return await merchant?.process(message)
        }

        switch binding.policy {
        case .kitOwned:
            return await binding.client.process(message)

        case .alwaysRunAfterMerchant:
            let response = await merchant?.process(message)
            let defaultResponse = await binding.client.process(message)
            return response ?? defaultResponse

        case .runIfUnhandled:
            if let response = await merchant?.process(message) {
                return response
            }
            return await binding.client.process(message)
        }
    }

    private static func method(_ message: String) -> String? {
        guard let request = try? JSONDecoder().decode(MethodEnvelope.self, from: Data(message.utf8)) else { return nil }
        return request.method
    }
}

private struct MethodEnvelope: Decodable {
    let method: String
}

struct DefaultClientBinding {
    let client: any CheckoutCommunicationProtocol
    let policy: DefaultClientPolicy
}

enum DefaultClientPolicy {
    case kitOwned
    case alwaysRunAfterMerchant
    case runIfUnhandled
}
