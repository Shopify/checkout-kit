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

import Testing
import Foundation
@testable import ShopifyCheckoutProtocol

@Suite("Client Tests")
struct ClientTests {
    private func notificationFixture() throws -> String {
        let url = Bundle.module.url(forResource: "notification", withExtension: "json", subdirectory: "Fixtures")!
        return try String(contentsOf: url, encoding: .utf8)
    }

    private func requestFixture() throws -> String {
        let url = Bundle.module.url(forResource: "request", withExtension: "json", subdirectory: "Fixtures")!
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

        let response = await client.process(try notificationFixture())

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

        let response = await client.process(try notificationFixture())

        #expect(response == nil)
        #expect(completeFired == false)
    }

    @Test @MainActor func delegationDispatchesAndReturnsResponse() async throws {
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.credentialRequest) { (_: Checkout) in
                CredentialResult(
                    checkout: CredentialCheckout(
                        payment: CredentialPayment(instruments: nil)
                    )
                )
            }

        let response = await client.process(try requestFixture())

        #expect(response != nil)
        let data = try #require(response?.data(using: .utf8))
        let parsed = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        #expect(parsed["jsonrpc"] as? String == "2.0")
        #expect(parsed["id"] as? String == "req-456")
        #expect(parsed["result"] != nil)
    }

    @Test @MainActor func notificationReturnsNil() async throws {
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { (_: Checkout) in }

        let response = await client.process(try notificationFixture())

        #expect(response == nil)
    }

    @Test func delegationsReturnsRegisteredDelegationStrings() {
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.instrumentsChangeRequest) { (_: Checkout) in
                InstrumentsChangeResult(
                    checkout: InstrumentsChangeCheckout(
                        payment: InstrumentsChangePayment(instruments: nil, selectedInstrumentID: nil)
                    )
                )
            }
            .on(CheckoutProtocol.credentialRequest) { (_: Checkout) in
                CredentialResult(
                    checkout: CredentialCheckout(
                        payment: CredentialPayment(instruments: nil)
                    )
                )
            }

        #expect(client.delegations.sorted() == ["payment.credential", "payment.instruments_change"])
    }

    @Test func builderChainingCompiles() {
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { (_: Checkout) in }
            .on(CheckoutProtocol.complete) { (_: Checkout) in }
            .on(CheckoutProtocol.credentialRequest) { (_: Checkout) in
                CredentialResult(
                    checkout: CredentialCheckout(
                        payment: CredentialPayment(instruments: nil)
                    )
                )
            }

        #expect(client.delegations.count == 1)
    }

    @Test @MainActor func multipleNotificationHandlersOnDifferentEvents() async throws {
        var startFired = false
        var completeFired = false
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { (_: Checkout) in startFired = true }
            .on(CheckoutProtocol.complete) { (_: Checkout) in completeFired = true }

        _ = await client.process(try notificationFixture())

        #expect(startFired == true)
        #expect(completeFired == false)
    }

    @Test @MainActor func unknownMessageReturnsNil() async {
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { (_: Checkout) in }

        let response = await client.process("not valid json")

        #expect(response == nil)
    }

    @Test @MainActor func readyNotificationFiresHandler() async throws {
        var receivedPayload: ReadyPayload?
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.ready) { payload in
                receivedPayload = payload
            }

        let response = await client.process(try readyFixture())

        #expect(receivedPayload?.delegations == ["payment.instruments_change", "payment.credential"])
        let data = try #require(response?.data(using: .utf8))
        let parsed = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        #expect(parsed["jsonrpc"] as? String == "2.0")
        #expect(parsed["id"] as? String == "ready-1")
        #expect(parsed["method"] as? String == "ec.ready")
        let params = try #require(parsed["params"] as? [String: Any])
        #expect(params["delegate"] as? [String] == [])
    }

    @Test @MainActor func readyWithNoHandlerStillReturnsResponse() async throws {
        let client = CheckoutProtocol.Client()

        let response = await client.process(try readyFixture())

        let data = try #require(response?.data(using: .utf8))
        let parsed = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        #expect(parsed["id"] as? String == "ready-1")
        #expect(parsed["method"] as? String == "ec.ready")
        let params = try #require(parsed["params"] as? [String: Any])
        #expect(params["delegate"] as? [String] == [])
    }

    @Test @MainActor func readyResponseAdvertisesRegisteredDelegations() async throws {
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.credentialRequest) { (_: Checkout) in
                CredentialResult(
                    checkout: CredentialCheckout(
                        payment: CredentialPayment(instruments: nil)
                    )
                )
            }
            .on(CheckoutProtocol.instrumentsChangeRequest) { (_: Checkout) in
                InstrumentsChangeResult(
                    checkout: InstrumentsChangeCheckout(
                        payment: InstrumentsChangePayment(instruments: nil, selectedInstrumentID: nil)
                    )
                )
            }

        let response = await client.process(try readyFixture())

        let data = try #require(response?.data(using: .utf8))
        let parsed = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let params = try #require(parsed["params"] as? [String: Any])
        let delegate = try #require(params["delegate"] as? [String])
        #expect(delegate.sorted() == ["payment.credential", "payment.instruments_change"])
    }
}
