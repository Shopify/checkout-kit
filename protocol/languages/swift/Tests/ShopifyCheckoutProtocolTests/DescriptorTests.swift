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
        @Test func publicNotificationMethods() {
            #expect([
                CheckoutProtocol.start.method,
                CheckoutProtocol.complete.method,
                CheckoutProtocol.error.method,
                CheckoutProtocol.lineItemsChange.method,
                CheckoutProtocol.totalsChange.method,
                CheckoutProtocol.messagesChange.method,
            ] == [
                "ec.start",
                "ec.complete",
                "ec.error",
                "ec.line_items.change",
                "ec.totals.change",
                "ec.messages.change",
            ])
        }

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

        @Test func totalsChangeMethod() {
            #expect(CheckoutProtocol.totalsChange.method == "ec.totals.change")
        }

        @Test func errorMethod() {
            #expect(CheckoutProtocol.error.method == "ec.error")
        }
    }

    @Suite("Delegations")
    struct Delegations {
        @Test func defaultDelegations() {
            #expect(CheckoutProtocol.defaultDelegations == ["window.open"])
        }

        @Test func windowOpenDescriptor() {
            #expect(CheckoutProtocol.windowOpen.method == "ec.window.open_request")
            #expect(CheckoutProtocol.windowOpen.delegation == "window.open")
        }
    }
}
