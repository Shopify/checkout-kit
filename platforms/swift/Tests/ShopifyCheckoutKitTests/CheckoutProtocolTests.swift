import Foundation
#if !COCOAPODS
    import ShopifyCheckoutProtocol
#endif
@testable import ShopifyCheckoutKit
import Testing

@Suite("Embedded Checkout Protocol Curation")
struct CheckoutProtocolTests {
    @Test func defaultDelegationsAdvertiseWindowOpen() {
        #expect(CheckoutProtocol.defaultDelegations == ["window.open"])
    }

    @Test func supportedProtocolMethodsCoverReadyCuratedNotificationsAndWindowOpen() {
        #expect(CheckoutProtocol.supportedProtocolMethods == [
            CheckoutTransport.readyMethod,
            "ec.start",
            "ec.complete",
            "ec.error",
            "ec.line_items.change",
            "ec.messages.change",
            "ec.totals.change",
            "ec.window.open_request"
        ])
    }

    @Test func supportedProtocolMethodsExcludeUncuratedCatalogMethods() {
        #expect(!CheckoutProtocol.supportedProtocolMethods.contains("ec.payment.credential_request"))
        #expect(!CheckoutProtocol.supportedProtocolMethods.contains("ec.fulfillment.change"))
        #expect(!CheckoutProtocol.supportedProtocolMethods.contains("ep.cart.ready"))
    }

    @Test func supportedProtocolMethodParsesValidSupportedMessage() {
        let message = #"{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{}}}"#
        #expect(CheckoutProtocol.supportedProtocolMethod(message) == "ec.start")
    }

    @Test func supportedProtocolMethodRejectsUnsupportedOrInvalidMessage() {
        #expect(CheckoutProtocol.supportedProtocolMethod(#"{"jsonrpc":"2.0","method":"custom"}"#) == nil)
        #expect(CheckoutProtocol.supportedProtocolMethod(#"{"jsonrpc":"1.0","method":"ec.start"}"#) == nil)
        #expect(CheckoutProtocol.supportedProtocolMethod("not json") == nil)
    }

    @Test func methodNotFoundResponseEncodesUnsupportedRequests() throws {
        let response = try #require(
            CheckoutProtocol.methodNotFoundResponse(
                forUnsupportedProtocolRequest: #"{"jsonrpc":"2.0","method":"custom","id":"unsupported","params":{}}"#
            )
        )
        let object = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(object["jsonrpc"] as? String == "2.0")
        #expect(object["id"] as? String == "unsupported")
        let error = try #require(object["error"] as? [String: Any])
        #expect(error["code"] as? Int == CheckoutProtocol.methodNotFoundCode)
        #expect(error["message"] as? String == CheckoutProtocol.methodNotFoundMessage)
    }

    @Test func methodNotFoundResponsePreservesNumericRequestID() throws {
        let response = try #require(
            CheckoutProtocol.methodNotFoundResponse(
                forUnsupportedProtocolRequest: #"{"jsonrpc":"2.0","method":"custom","id":7,"params":{}}"#
            )
        )
        let object = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        #expect(object["id"] as? Int == 7)
    }

    @Test func methodNotFoundResponsePreservesNullRequestID() throws {
        let response = try #require(
            CheckoutProtocol.methodNotFoundResponse(
                forUnsupportedProtocolRequest: #"{"jsonrpc":"2.0","method":"custom","id":null,"params":{}}"#
            )
        )
        let object = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        #expect(object["id"] is NSNull)
    }

    @Test func methodNotFoundResponseRejectsInvalidRequestIDs() {
        #expect(CheckoutProtocol.methodNotFoundResponse(forUnsupportedProtocolRequest: #"{"jsonrpc":"2.0","method":"custom","id":true,"params":{}}"#) == nil)
        #expect(CheckoutProtocol.methodNotFoundResponse(forUnsupportedProtocolRequest: #"{"jsonrpc":"2.0","method":"custom","id":{},"params":{}}"#) == nil)
        #expect(CheckoutProtocol.methodNotFoundResponse(forUnsupportedProtocolRequest: #"{"jsonrpc":"2.0","method":"custom","id":1.5,"params":{}}"#) == nil)
    }

    @Test func methodNotFoundResponseRejectsSupportedNotificationsOrInvalidMessages() {
        #expect(CheckoutProtocol.methodNotFoundResponse(forUnsupportedProtocolRequest: #"{"jsonrpc":"2.0","method":"custom"}"#) == nil)
        #expect(CheckoutProtocol.methodNotFoundResponse(forUnsupportedProtocolRequest: #"{"jsonrpc":"2.0","method":"ec.start","id":"supported"}"#) == nil)
        #expect(CheckoutProtocol.methodNotFoundResponse(forUnsupportedProtocolRequest: #"{"jsonrpc":"1.0","method":"custom","id":"unsupported"}"#) == nil)
        #expect(CheckoutProtocol.methodNotFoundResponse(forUnsupportedProtocolRequest: "not json") == nil)
    }
}

@Suite("Window Open Delegation")
struct WindowOpenDelegationTests {
    @Test func descriptorBindsWindowOpenMethodAndDelegation() {
        #expect(CheckoutProtocol.windowOpen.method == "ec.window.open_request")
        #expect(CheckoutProtocol.windowOpen.delegation == "window.open")
    }

    @Test func requestPayloadDecodesValidURL() throws {
        let payload = try JSONDecoder().decode(
            WindowOpenRequest.self,
            from: Data(#"{"url":"https://example.com/terms"}"#.utf8)
        )
        #expect(payload.url == URL(string: "https://example.com/terms"))
    }

    @Test func requestPayloadRejectsEmptyURL() {
        #expect((try? JSONDecoder().decode(WindowOpenRequest.self, from: Data(#"{"url":""}"#.utf8))) == nil)
    }

    @Test func requestPayloadRejectsMissingURL() {
        #expect((try? JSONDecoder().decode(WindowOpenRequest.self, from: Data("{}".utf8))) == nil)
    }

    @Test func requestPayloadRejectsNullURL() {
        #expect((try? JSONDecoder().decode(WindowOpenRequest.self, from: Data(#"{"url":null}"#.utf8))) == nil)
    }

    private struct EncodingFailure: Error {}

    private func encode(_ result: WindowOpenResult) throws -> [String: Any] {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        let data = try encoder.encode(result)
        guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw EncodingFailure()
        }
        return object
    }

    @Test func resultEncodesSuccessBody() throws {
        let body = try encode(.success)
        let ucp = try #require(body["ucp"] as? [String: Any])
        #expect(ucp["status"] as? String == "success")
        #expect(ucp["version"] as? String == CheckoutTransport.specVersion)
    }

    @Test func resultEncodesRejectedBody() throws {
        let body = try encode(.rejected(reason: "canOpenURL returned false"))
        let ucp = try #require(body["ucp"] as? [String: Any])
        #expect(ucp["status"] as? String == "error")

        let messages = try #require(body["messages"] as? [[String: Any]])
        #expect(messages.count == 1)
        #expect(messages[0]["type"] as? String == "error")
        #expect(messages[0]["code"] as? String == "window_open_rejected_error")
        #expect(messages[0]["severity"] as? String == "unrecoverable")
        #expect(messages[0]["content"] as? String == "canOpenURL returned false")
    }

    @Test func resultEncodesRejectedWithNilReason() throws {
        let body = try encode(.rejected(reason: nil))
        let messages = try #require(body["messages"] as? [[String: Any]])
        #expect(messages[0]["content"] as? String != "")
    }
}
