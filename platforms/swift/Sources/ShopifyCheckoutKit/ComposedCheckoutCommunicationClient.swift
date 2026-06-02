#if !COCOAPODS
    import ShopifyCheckoutProtocol
#endif
import Foundation

/// Composes a merchant-supplied protocol client with kit-owned default handlers.
///
/// The default bindings make the dispatch policy explicit in one place:
/// request delegations such as `CheckoutProtocol.windowOpen` only fall back to the
/// kit default when the merchant does not return a response, while mandatory kit
/// notifications such as `CheckoutProtocol.error` always run after the merchant client.
struct ComposedCheckoutCommunicationClient: CheckoutCommunicationProtocol {
    let merchant: (any CheckoutCommunicationProtocol)?
    let defaults: [String: DefaultClientBinding]

    func process(_ message: String) async -> String? {
        guard let method = Self.method(message) else {
            return await merchant?.process(message)
        }

        var response = await merchant?.process(message)

        if let binding = defaults[method] {
            switch binding.policy {
            case .alwaysRunAfterMerchant:
                let defaultResponse = await binding.client.process(message)
                response = response ?? defaultResponse

            case .runIfUnhandled:
                if response == nil {
                    response = await binding.client.process(message)
                }
            }
        }

        return response
    }

    private static func method(_ message: String) -> String? {
        guard
            let object = try? JSONSerialization.jsonObject(with: Data(message.utf8)) as? [String: Any]
        else {
            return nil
        }
        return object["method"] as? String
    }
}

struct DefaultClientBinding {
    let client: any CheckoutCommunicationProtocol
    let policy: DefaultClientPolicy
}

enum DefaultClientPolicy {
    case alwaysRunAfterMerchant
    case runIfUnhandled
}
