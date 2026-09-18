import Foundation
@testable import EmbeddedCheckoutProtocol
import Testing

@Suite("Wire version compatibility")
struct VersionCompatibilityTests {
    @Test(arguments: ["2026-08-25", "2026-04-08"])
    func checkoutPayload(version: String) throws {
        let data = try fixture("checkout-" + version)
        let envelope = try JSONDecoder().decode(JSONRPCRequest<JSONRPCCheckoutParams>.self, from: data)
        let checkout = envelope.params.checkout
        #expect(checkout.ucp.version == version)
        #expect(checkout.fulfillment?.methods?.first?.type == (version == "2026-08-25" ? "drone_delivery" : "shipping"))
        let option = try #require(checkout.fulfillment?.methods?.first?.groups?.first?.options?.first)
        #expect(option.description?.plain == "Arrives in 3-5 business days")
        #expect(option.description?.markdown == (version == "2026-08-25" ? "Arrives in **3-5 business days**" : nil))
        #expect(option.description?.html == (version == "2026-08-25" ? "<p>Arrives in <strong>3-5 business days</strong></p>" : nil))
        let pickup = try #require(checkout.fulfillment?.methods?.first { $0.id == "pickup-1" })
        let location = try #require(pickup.destinations?.first)
        #expect(location.id == "location-1")
        #expect(location.name == "Example Pickup Store")
        // April retail locations predate the August destination discriminator.
        #expect(location.type == (version == "2026-08-25" ? "business_location" : nil))
        let address = try #require(location.address)
        #expect(address.streetAddress == "456 Example Avenue")
        #expect(address.extendedAddress == "Suite 2")
        #expect(address.addressLocality == "Example City")
        #expect(address.addressRegion == "NY")
        #expect(address.addressCountry == "US")
        #expect(address.postalCode == "10002")
        if version == "2026-08-25" {
            #expect(checkout.ucp.mapOrder == ["payment_handlers": ["com.example.wallet"]])
            #expect(checkout.fulfillment?.availableMethods?.first?.type == "drone_delivery")
        }
        let original = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        let params = try #require(original["params"] as? [String: Any])
        var expected = try canonicalizedLegacyDescription(try #require(params["checkout"] as? [String: Any]))
        // Native UCP metadata ignores unknown members; Checkout and signals
        // are the existing extension-preservation surfaces.
        var metadata = try #require(expected["ucp"] as? [String: Any])
        metadata.removeValue(forKey: "future_metadata")
        expected["ucp"] = metadata
        let encoded = try JSONEncoder().encode(checkout)
        let actual = try #require(try JSONSerialization.jsonObject(with: encoded) as? NSDictionary)
        #expect(actual == expected as NSDictionary)
    }

    @Test func aprilErrorPayload() throws {
        let data = try fixture("error-2026-04-08")
        let object = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        let params = try #require(object["params"] as? [String: Any])
        let wire = try #require(params["error"] as? [String: Any])
        let error = try JSONDecoder().decode(ErrorResponse.self, from: JSONSerialization.data(withJSONObject: wire))
        #expect(error.ucp.version == "2026-04-08")
        #expect(error.messages.first?.content == "Try again.")
    }

    private func fixture(_ name: String) throws -> Data {
        let url = try #require(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures"))
        return try Data(contentsOf: url)
    }

    private func canonicalizedLegacyDescription(_ checkout: [String: Any]) throws -> [String: Any] {
        var checkout = checkout
        var fulfillment = try #require(checkout["fulfillment"] as? [String: Any])
        var methods = try #require(fulfillment["methods"] as? [[String: Any]])
        var method = try #require(methods.first)
        var groups = try #require(method["groups"] as? [[String: Any]])
        var group = try #require(groups.first)
        var options = try #require(group["options"] as? [[String: Any]])
        var option = try #require(options.first)
        if let description = option["description"] as? String {
            option["description"] = ["plain": description]
        }
        options[0] = option
        group["options"] = options
        groups[0] = group
        method["groups"] = groups
        methods[0] = method
        fulfillment["methods"] = methods
        checkout["fulfillment"] = fulfillment
        return checkout
    }
}
