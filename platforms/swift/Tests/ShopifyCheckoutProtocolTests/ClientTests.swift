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

@Suite("Client Tests")
struct ClientTests {
    private func notificationFixture() throws -> String {
        let url = Bundle.module.url(forResource: "notification", withExtension: "json", subdirectory: "Fixtures")!
        return try String(contentsOf: url, encoding: .utf8)
    }

    private func readyFixture() throws -> String {
        let url = Bundle.module.url(forResource: "ready_response", withExtension: "json", subdirectory: "Fixtures")!
        return try String(contentsOf: url, encoding: .utf8)
    }

    @Test @MainActor func notificationDispatchesToRegisteredHandler() async throws {
        var receivedCheckout: Checkout?
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { checkout in
                receivedCheckout = checkout
            }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
        #expect(receivedCheckout != nil)
        #expect(receivedCheckout?.id == "checkout-123")
    }

    @Test @MainActor func notificationDoesNotFireUnregisteredHandler() async throws {
        var completeFired = false
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.complete) { (_: Checkout) in
                completeFired = true
            }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
        #expect(completeFired == false)
    }

    @Test @MainActor func notificationReturnsNil() async throws {
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { (_: Checkout) in }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
    }

    @Test @MainActor func multipleNotificationHandlersOnDifferentEvents() async throws {
        var startFired = false
        var completeFired = false
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { (_: Checkout) in startFired = true }
            .on(CheckoutProtocol.complete) { (_: Checkout) in completeFired = true }

        _ = try await client.process(notificationFixture())

        #expect(startFired == true)
        #expect(completeFired == false)
    }

    @Test @MainActor func unknownMessageReturnsNil() async {
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { (_: Checkout) in }

        let response = await client.process("not valid json")

        #expect(response == nil)
    }

    @Test @MainActor func readyReturnsResponse() async throws {
        let client = CheckoutProtocol.Client()

        let response = try await client.process(readyFixture())

        let data = try #require(response?.data(using: .utf8))
        let parsed = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(parsed["id"] as? String == "ready-1")
        #expect(parsed["method"] == nil)
        #expect(parsed["params"] == nil)
        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["version"] as? String == CheckoutProtocol.specVersion)
        #expect(ucp["status"] as? String == "success")
    }
}
