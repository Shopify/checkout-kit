@testable import EmbeddedCheckoutProtocol
import Foundation
import Testing

@Suite("Generated model wire contracts")
struct ModelContractTests {
    @Test func buyerPreservesNamesAndExtensions() throws {
        let buyer = try roundTrip(Buyer.self, fixture: "buyer", required: []) {
            $0.additionalProperties["email"] = $1
        }
        #expect(buyer.email == "buyer@example.com")
        #expect(buyer.firstName == "Ada")
        #expect(buyer.lastName == "Example")
        #expect(buyer.phoneNumber == "+12025550123")
        #expect(buyer.additionalProperties.keys.sorted() == ["com.example.extension"])
    }

    @Test func contextPreservesLocalizationAndPaymentPreferences() throws {
        let context = try roundTrip(Context.self, fixture: "context", required: []) {
            $0.additionalProperties["currency"] = $1
        }
        #expect(context.addressCountry == "IE")
        #expect(context.addressRegion == "Dublin")
        #expect(context.postalCode == "D02 TEST")
        #expect(context.currency == "EUR")
        #expect(context.eligibility == ["com.example.member"])
        #expect(context.intent == "gift")
        #expect(context.language == "en-IE")
        #expect(context.location == "Dublin")
        #expect(context.payment?.first?.handler == "com.example.payment")
        #expect(context.payment?.first?.types == ["card"])
        #expect(context.additionalProperties.keys.sorted() == ["com.example.extension"])
    }

    @Test func credentialPreservesOpaqueHandlerData() throws {
        let credential = try roundTrip(PaymentCredential.self, fixture: "credential", required: ["type"]) {
            $0.additionalProperties["type"] = $1
        }
        #expect(credential.type == "token")
        #expect(credential.additionalProperties["com.example.token"]?.value as? String == "synthetic-test-token")
        #expect(credential.additionalProperties["type"] == nil)
    }

    @Test func instrumentPreservesNestedCredentialAndBillingAddress() throws {
        let instrument = try roundTrip(
            SelectedPaymentInstrument.self, fixture: "instrument", required: ["handler_id", "id", "type"]
        ) { $0.additionalProperties["handler_id"] = $1 }
        #expect(instrument.handlerID == "example-handler")
        #expect(instrument.id == "example-instrument")
        #expect(instrument.type == "card")
        #expect(instrument.selected == true)
        #expect(instrument.billingAddress?.streetAddress == "1 Example Street")
        #expect(instrument.credential?.type == "token")
        #expect(instrument.credential?.additionalProperties["com.example.extension"] != nil)
        #expect(instrument.display?["last_digits"]?.value as? String == "1234")
    }

    @Test func policyPreservesDescriptionFormatsAndOpenType() throws {
        let policy = try roundTrip(Policy.self, fixture: "policy", required: ["description", "type"]) {
            $0.additionalProperties["type"] = $1
        }
        #expect(policy.type == "com.example.return")
        #expect(policy.appliesTo == ["$.line_items[0]"])
        #expect(policy.description.plain == "Return within 30 days")
        #expect(policy.description.markdown == "Return within **30 days**")
        #expect(policy.description.html == "Return within <b>30 days</b>")
        #expect(policy.url == "https://example.com/returns")
    }

    private func roundTrip<Model: Codable>(
        _ type: Model.Type,
        fixture: String,
        required: Set<String>,
        injectCollision: (inout Model, JSONAny) -> Void
    ) throws -> Model {
        let fixtures = try #require(try JSONSerialization.jsonObject(
            with: Data(protocolFixture("model-contracts").utf8)
        ) as? [String: [String: Any]])
        let full = try #require(fixtures[fixture])
        let encoder = newJSONEncoder()
        let decoder = newJSONDecoder()
        let data = try JSONSerialization.data(withJSONObject: full)
        let decoded = try decoder.decode(type, from: data)
        let encoded = try #require(try JSONSerialization.jsonObject(with: encoder.encode(decoded)) as? NSDictionary)
        #expect(encoded == full as NSDictionary)

        // Extension data cannot replace schema-owned fields during serialization.
        var colliding = decoded
        injectCollision(&colliding, try decoder.decode(JSONAny.self, from: Data(#""forged""#.utf8)))
        let collision = try #require(try JSONSerialization.jsonObject(with: encoder.encode(colliding)) as? NSDictionary)
        #expect(collision == full as NSDictionary)

        // Optional fields may be absent; each required field must independently fail.
        let minimal = full.filter { required.contains($0.key) }
        let minimalModel = try decoder.decode(type, from: JSONSerialization.data(withJSONObject: minimal))
        let minimalEncoded = try #require(try JSONSerialization.jsonObject(with: encoder.encode(minimalModel)) as? NSDictionary)
        #expect(minimalEncoded == minimal as NSDictionary)
        for key in required {
            let missing = full.filter { $0.key != key }
            #expect(throws: DecodingError.self) {
                try decoder.decode(type, from: JSONSerialization.data(withJSONObject: missing))
            }
        }
        return decoded
    }
}
