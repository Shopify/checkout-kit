import Foundation
@testable import EmbeddedCheckoutProtocol
import Testing

@Suite("Pinned protocol payloads")
struct ProtocolPayloadTests {
    @Test(arguments: ["checkout-shipping", "checkout-custom-fulfillment"])
    func checkoutPayload(name: String) throws {
        let customFulfillment = name == "checkout-custom-fulfillment"
        let data = Data(try protocolFixture(name).utf8)
        let envelope = try JSONDecoder().decode(JSONRPCRequest<EmbeddedCheckoutProtocol.JSONRPCCheckoutParams>.self, from: data)
        let checkout = envelope.params.checkout
        #expect(checkout.ucp.version == EmbeddedCheckoutProtocol.specVersion)
        #expect(checkout.fulfillment?.methods?.first?.type == (customFulfillment ? "drone_delivery" : "shipping"))
        let option = try #require(checkout.fulfillment?.methods?.first?.groups?.first?.options?.first)
        #expect(option.description?.plain == "Arrives in 3-5 business days")
        #expect(option.description?.markdown == (customFulfillment ? "Arrives in **3-5 business days**" : nil))
        #expect(option.description?.html == (customFulfillment ? "<p>Arrives in <strong>3-5 business days</strong></p>" : nil))
        let pickup = try #require(checkout.fulfillment?.methods?.first { $0.id == "pickup-1" })
        let location = try #require(pickup.destinations?.first)
        #expect(location.id == "location-1")
        #expect(location.name == "Example Pickup Store")
        #expect(location.type == "business_location")
        let address = try #require(location.address)
        #expect(address.streetAddress == "456 Example Avenue")
        #expect(address.extendedAddress == "Suite 2")
        #expect(address.addressLocality == "Example City")
        #expect(address.addressRegion == "NY")
        #expect(address.addressCountry == "US")
        #expect(address.postalCode == "10002")
        #expect(checkout.fulfillment?.methods?.first?.destinations?.first?.type == "shipping_address")
        #expect(checkout.ucp.mapOrder == (customFulfillment ? ["payment_handlers": ["com.example.wallet"]] : nil))
        #expect(checkout.fulfillment?.availableMethods?.first?.type == (customFulfillment ? "drone_delivery" : "shipping"))
        let original = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        let params = try #require(original["params"] as? [String: Any])
        var expected = try #require(params["checkout"] as? [String: Any])
        // Native UCP metadata ignores unknown members; Checkout and signals
        // are the existing extension-preservation surfaces.
        var metadata = try #require(expected["ucp"] as? [String: Any])
        metadata.removeValue(forKey: "future_metadata")
        expected["ucp"] = metadata
        let encoded = try JSONEncoder().encode(checkout)
        let actual = try #require(try JSONSerialization.jsonObject(with: encoded) as? NSDictionary)
        #expect(actual == expected as NSDictionary)
    }

    @Test func errorPayload() throws {
        let data = Data(try protocolFixture("error").utf8)
        let object = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        let params = try #require(object["params"] as? [String: Any])
        let wire = try #require(params["error"] as? [String: Any])
        let error = try JSONDecoder().decode(EmbeddedCheckoutProtocol.ErrorResponse.self, from: JSONSerialization.data(withJSONObject: wire))
        #expect(error.ucp.version == EmbeddedCheckoutProtocol.specVersion)
        #expect(error.messages.first?.content == "Try again.")
        #expect(error.messages.first?.severity == .unrecoverable)
    }
}
