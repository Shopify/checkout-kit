@testable import ShopifyCheckoutProtocol
import Foundation
import Testing

@Suite("Descriptor Tests")
struct DescriptorTests {
    @Suite("Spec Version")
    struct SpecVersion {
        @Test func matchesOpenRPCInfoVersion() {
            #expect(CheckoutTransport.specVersion == "2026-04-08")
        }
    }

    @Suite("Generated Catalog")
    struct GeneratedCatalog {
        @Test func bindsNotificationMethods() {
            #expect(GeneratedProtocolCatalog.ecStart.method == "ec.start")
            #expect(GeneratedProtocolCatalog.ecComplete.method == "ec.complete")
            #expect(GeneratedProtocolCatalog.ecMessagesChange.method == "ec.messages.change")
            #expect(GeneratedProtocolCatalog.ecLineItemsChange.method == "ec.line_items.change")
            #expect(GeneratedProtocolCatalog.ecTotalsChange.method == "ec.totals.change")
            #expect(GeneratedProtocolCatalog.ecError.method == "ec.error")
        }

        @Test func exposesEveryOpenRPCMethod() {
            #expect(GeneratedProtocolCatalog.allMethods.contains("ec.start"))
            #expect(GeneratedProtocolCatalog.allMethods.contains("ec.complete"))
            #expect(GeneratedProtocolCatalog.allMethods.contains("ec.window.open_request"))
        }

        @Test func includesMethodsBeyondTheCuratedConsumerSubset() {
            #expect(GeneratedProtocolCatalog.allMethods.contains("ec.payment.credential_request"))
            #expect(GeneratedProtocolCatalog.allMethods.contains("ec.fulfillment.change"))
            #expect(GeneratedProtocolCatalog.allMethods.contains("ep.cart.ready"))
        }

        @Test func methodsAreUnique() {
            #expect(Set(GeneratedProtocolCatalog.allMethods).count == GeneratedProtocolCatalog.allMethods.count)
        }
    }
}
