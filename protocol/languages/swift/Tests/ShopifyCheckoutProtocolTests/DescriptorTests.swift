@testable import ShopifyCheckoutProtocol
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
    }
}
