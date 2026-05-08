import Testing
@testable import ShopifyCheckoutProtocol

@Suite("Descriptor Tests")
struct DescriptorTests {
    @Suite("Spec Version")
    struct SpecVersion {
        @Test func matchesOpenRPCInfoVersion() {
            #expect(CheckoutProtocol.specVersion == "2026.01.23")
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

        @Test func buyerChangeMethod() {
            #expect(CheckoutProtocol.buyerChange.method == "ec.buyer.change")
        }

        @Test func paymentChangeMethod() {
            #expect(CheckoutProtocol.paymentChange.method == "ec.payment.change")
        }
    }

    @Suite("Delegations")
    struct Delegations {
        @Test func instrumentsChangeRequestMethod() {
            #expect(CheckoutProtocol.instrumentsChangeRequest.method == "ec.payment.instruments_change_request")
        }

        @Test func instrumentsChangeRequestDelegation() {
            #expect(CheckoutProtocol.instrumentsChangeRequest.delegation == "payment.instruments_change")
        }

        @Test func credentialRequestMethod() {
            #expect(CheckoutProtocol.credentialRequest.method == "ec.payment.credential_request")
        }

        @Test func credentialRequestDelegation() {
            #expect(CheckoutProtocol.credentialRequest.delegation == "payment.credential")
        }
    }
}
