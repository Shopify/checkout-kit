/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import Foundation
@testable import ShopifyCheckoutProtocol
import Testing

@Suite("Codec Encode Tests")
struct CodecEncodeTests {
    @Test func encodesResponse() throws {
        let result = CredentialResult(
            checkout: CredentialCheckout(
                payment: CredentialPayment(instruments: nil)
            ),
            ucp: InstrumentsChangeResultUcp(
                capabilities: nil,
                paymentHandlers: nil,
                services: nil,
                status: .success,
                version: CheckoutProtocol.specVersion
            ),
            continueURL: nil,
            messages: nil
        )
        let json = CheckoutProtocol.encodeResponse(id: "req-456", result: result)
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        #expect(parsed["jsonrpc"] as? String == "2.0")
        #expect(parsed["id"] as? String == "req-456")
        #expect(parsed["result"] != nil)
    }

    @Test func encodesReadyResponseWithResultEnvelope() throws {
        let json = CheckoutProtocol.encodeReadyResponse(id: "ready-1")
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        #expect(parsed["jsonrpc"] as? String == "2.0")
        #expect(parsed["id"] as? String == "ready-1")
        #expect(parsed["method"] == nil, "JSON-RPC responses must not carry a method field")
        #expect(parsed["params"] == nil, "JSON-RPC responses must not carry a params field")

        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["version"] as? String == CheckoutProtocol.specVersion)
        #expect(ucp["status"] as? String == "success")
    }

    @Test func acknowledgeReadyReturnsResponseForReadyMessage() throws {
        let message = #"""
        {"jsonrpc":"2.0","id":"ready-1","method":"ec.ready","params":{"delegate":["payment.credential"]}}
        """#

        let response = try #require(CheckoutProtocol.acknowledgeReady(message))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "ready-1")
        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["version"] as? String == CheckoutProtocol.specVersion)
        #expect(ucp["status"] as? String == "success")
    }

    @Test func acknowledgeReadyReturnsNilForNonReadyMessage() {
        let message = #"""
        {"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{"id":"c"}}}
        """#

        #expect(CheckoutProtocol.acknowledgeReady(message) == nil)
    }

    @Test func acknowledgeReadyReturnsNilForMalformedJSON() {
        #expect(CheckoutProtocol.acknowledgeReady("not json") == nil)
    }
}
