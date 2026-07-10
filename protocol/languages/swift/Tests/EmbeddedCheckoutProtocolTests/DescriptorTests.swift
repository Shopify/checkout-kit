@testable import EmbeddedCheckoutProtocol
import Foundation
import Testing

@Suite("Descriptor Tests")
struct DescriptorTests {
    @Suite("Spec Version")
    struct SpecVersion {
        @Test func matchesOpenRPCInfoVersion() {
            #expect(EmbeddedCheckoutProtocol.specVersion == "2026-04-08")
        }
    }

    @Suite("Event Catalog")
    struct EventCatalog {
        @Test func bindsNotificationMethods() {
            #expect(EmbeddedCheckoutProtocol.Event.start.method == "ec.start")
            #expect(EmbeddedCheckoutProtocol.Event.complete.method == "ec.complete")
            #expect(EmbeddedCheckoutProtocol.Event.messagesChange.method == "ec.messages.change")
            #expect(EmbeddedCheckoutProtocol.Event.lineItemsChange.method == "ec.line_items.change")
            #expect(EmbeddedCheckoutProtocol.Event.totalsChange.method == "ec.totals.change")
            #expect(EmbeddedCheckoutProtocol.Event.error.method == "ec.error")
        }

        @Test func exposesEveryOpenRPCMethod() {
            #expect(EmbeddedCheckoutProtocol.Event.all.contains("ec.start"))
            #expect(EmbeddedCheckoutProtocol.Event.all.contains("ec.complete"))
        }

        @Test func includesMethodsBeyondTheCuratedConsumerSubset() {
            #expect(EmbeddedCheckoutProtocol.Event.all.contains("ec.payment.credential_request"))
            #expect(EmbeddedCheckoutProtocol.Event.all.contains("ec.fulfillment.change"))
            #expect(EmbeddedCheckoutProtocol.Event.all.contains("ec.buyer.change"))
        }

        @Test func requestMethodsBindAsTypedDescriptors() {
            func method<Payload, Handler, Result>(of descriptor: RequestDescriptor<Payload, Handler, Result>) -> String {
                descriptor.method
            }

            #expect(method(of: EmbeddedCheckoutProtocol.Event.ready) == "ec.ready")
            #expect(method(of: EmbeddedCheckoutProtocol.Event.auth) == "ec.auth")
            #expect(method(of: EmbeddedCheckoutProtocol.Event.paymentCredential) == "ec.payment.credential_request")
            #expect(
                method(of: EmbeddedCheckoutProtocol.Event.paymentInstrumentsChange)
                    == "ec.payment.instruments_change_request"
            )
            #expect(
                method(of: EmbeddedCheckoutProtocol.Event.fulfillmentAddressChange)
                    == "ec.fulfillment.address_change_request"
            )
        }

        @Test func methodsAreUnique() {
            #expect(Set(EmbeddedCheckoutProtocol.Event.all).count == EmbeddedCheckoutProtocol.Event.all.count)
        }
    }
}
