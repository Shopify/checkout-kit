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
}
