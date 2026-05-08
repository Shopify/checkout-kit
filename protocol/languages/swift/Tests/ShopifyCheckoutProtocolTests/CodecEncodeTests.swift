import Testing
import Foundation
@testable import ShopifyCheckoutProtocol

@Suite("Codec Encode Tests")
struct CodecEncodeTests {
    @Test func encodesResponse() throws {
        let result = CredentialResult(
            checkout: CredentialCheckout(
                payment: CredentialPayment(instruments: nil)
            )
        )
        let json = CheckoutProtocol.encodeResponse(id: "req-456", result: result)
        let parsed = try JSONSerialization.jsonObject(with: Data(json.utf8)) as! [String: Any]

        #expect(parsed["jsonrpc"] as? String == "2.0")
        #expect(parsed["id"] as? String == "req-456")
        #expect(parsed["result"] != nil)
    }
}
