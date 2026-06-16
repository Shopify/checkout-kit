#if !COCOAPODS
    import ShopifyCheckoutProtocol
#endif
import Foundation

package protocol CheckoutCommunicationProtocol: Sendable {
    func process(_ message: String) async -> String?
}

extension EmbeddedCheckoutProtocol.Client: CheckoutCommunicationProtocol {}
