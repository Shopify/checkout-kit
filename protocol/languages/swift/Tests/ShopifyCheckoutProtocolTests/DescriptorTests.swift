@testable import ShopifyCheckoutProtocol
import Foundation
import Testing

@Suite("Descriptor Tests")
struct DescriptorTests {
    @Suite("Spec Version")
    struct SpecVersion {
        @Test func matchesOpenRPCInfoVersion() {
            #expect(CheckoutProtocol.specVersion == "2026-04-08")
        }
    }

    @Suite("Notifications")
    struct Notifications {
        @Test func startMethod() {
            #expect(CheckoutProtocol.start.method == "ec.start")
        }

        @Test func completeMethod() {
            #expect(CheckoutProtocol.complete.method == "ec.complete")
        }

        @Test func messagesChangeMethod() {
            #expect(CheckoutProtocol.messagesChange.method == "ec.messages.change")
        }

        @Test func lineItemsChangeMethod() {
            #expect(CheckoutProtocol.lineItemsChange.method == "ec.line_items.change")
        }

        @Test func totalsChangeMethod() {
            #expect(CheckoutProtocol.totalsChange.method == "ec.totals.change")
        }

        @Test func errorMethod() {
            #expect(CheckoutProtocol.error.method == "ec.error")
        }
    }

    @Suite("Supported Protocol Methods")
    struct SupportedProtocolMethods {
        @Test func includesReadyNotificationsAndDelegations() {
            #expect(CheckoutProtocol.supportedProtocolMethods == [
                CheckoutProtocol.readyMethod,
                CheckoutProtocol.start.method,
                CheckoutProtocol.complete.method,
                CheckoutProtocol.error.method,
                CheckoutProtocol.lineItemsChange.method,
                CheckoutProtocol.messagesChange.method,
                CheckoutProtocol.totalsChange.method,
                CheckoutProtocol.windowOpen.method
            ])
        }

        @Test func excludesInternalOrUnsupportedMethods() {
            #expect(!CheckoutProtocol.supportedProtocolMethods.contains("ec.buyer.change"))
            #expect(!CheckoutProtocol.supportedProtocolMethods.contains("ec.payment.credential_request"))
            #expect(!CheckoutProtocol.supportedProtocolMethods.contains("ep.cart.ready"))
        }

        @Test func supportedProtocolMethodParsesValidSupportedMessage() {
            let message = #"{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{}}}"#

            #expect(CheckoutProtocol.supportedProtocolMethod(message) == CheckoutProtocol.start.method)
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
            let data = try #require(response.data(using: .utf8))
            let object = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])

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
            let data = try #require(response.data(using: .utf8))
            let object = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])

            #expect(object["id"] as? Int == 7)
        }

        @Test func methodNotFoundResponsePreservesNullRequestID() throws {
            let response = try #require(
                CheckoutProtocol.methodNotFoundResponse(
                    forUnsupportedProtocolRequest: #"{"jsonrpc":"2.0","method":"custom","id":null,"params":{}}"#
                )
            )
            let data = try #require(response.data(using: .utf8))
            let object = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])

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
}
