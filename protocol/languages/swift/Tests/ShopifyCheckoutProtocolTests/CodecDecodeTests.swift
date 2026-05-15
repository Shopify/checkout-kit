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

@Suite("Codec Decode Tests")
struct CodecDecodeTests {
    @Test func decodesNotification() throws {
        let json = try fixtureString("notification")
        let message = CheckoutProtocol.decode(jsonRpc: json)

        guard case let .notification(method, payload) = message else {
            Issue.record("Expected .notification, got \(message)")
            return
        }
        let checkout = try #require(payload as? Checkout)

        #expect(method == "ec.start")
        #expect(checkout.id == "checkout-123")
        #expect(checkout.currency == "USD")
        #expect(checkout.lineItems.count == 1)
        #expect(checkout.lineItems[0].item.title == "Test Product")
    }

    @Test func decodesErrorNotification() throws {
        let json = #"""
        {"jsonrpc":"2.0","method":"ec.error","params":{"error":{"ucp":{"version":"2026-04-08","status":"error"},"messages":[{"type":"error","code":"unrecoverable","content":"Boom.","severity":"recoverable"}]}}}
        """#
        let message = CheckoutProtocol.decode(jsonRpc: json)

        guard case let .notification(method, payload) = message else {
            Issue.record("Expected .notification, got \(message)")
            return
        }
        let error = try #require(payload as? ErrorResponse)

        #expect(method == "ec.error")
        #expect(error.ucp.version == "2026-04-08")
        #expect(error.ucp.status == .error)
        #expect(error.messages.first?.content == "Boom.")
    }

    @Test func decodesRequestCarriesRawParams() throws {
        let json = try fixtureString("request")
        let message = CheckoutProtocol.decode(jsonRpc: json)

        guard case let .request(id, method, params) = message else {
            Issue.record("Expected .request, got \(message)")
            return
        }

        #expect(id == "req-456")
        #expect(method == "ec.payment.credential_request")

        let parsed = try #require(
            JSONSerialization.jsonObject(with: params) as? [String: Any]
        )
        let checkout = try #require(parsed["checkout"] as? [String: Any])
        #expect(checkout["id"] as? String == "checkout-789")
        #expect(checkout["currency"] as? String == "CAD")
    }

    @Test func decodesWindowOpenRequest() throws {
        let json = try fixtureString("window_open_request")
        let message = CheckoutProtocol.decode(jsonRpc: json)

        guard case let .request(id, method, params) = message else {
            Issue.record("Expected .request, got \(message)")
            return
        }

        #expect(id == "req-window-1")
        #expect(method == "ec.window.open_request")

        let payload = try #require(CheckoutProtocol.windowOpen.decode(params))
        #expect(payload.url == URL(string: "https://example.com/terms"))
    }

    @Test func windowOpenDescriptorRejectsEmptyURL() {
        let params = Data(#"{"url":""}"#.utf8)
        #expect(CheckoutProtocol.windowOpen.decode(params) == nil)
    }

    @Test func windowOpenDescriptorRejectsMissingURL() {
        let params = Data("{}".utf8)
        #expect(CheckoutProtocol.windowOpen.decode(params) == nil)
    }

    @Test func decodesUnknownMethod() {
        let json = """
        {"jsonrpc":"2.0","method":"ec.unknown","params":{"something":"else"}}
        """
        let message = CheckoutProtocol.decode(jsonRpc: json)

        guard case let .unknown(method, _) = message else {
            Issue.record("Expected .unknown, got \(message)")
            return
        }

        #expect(method == "ec.unknown")
    }

    @Test func handlesMalformedJSON() {
        let json = "not valid json at all"
        let message = CheckoutProtocol.decode(jsonRpc: json)

        guard case let .unknown(method, _) = message else {
            Issue.record("Expected .unknown for malformed JSON, got \(message)")
            return
        }

        #expect(method == "")
    }
}

private func fixtureString(_ name: String) throws -> String {
    let url = Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures")!
    return try String(contentsOf: url, encoding: .utf8)
}
