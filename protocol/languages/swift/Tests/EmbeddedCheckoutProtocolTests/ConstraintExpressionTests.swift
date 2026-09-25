@testable import EmbeddedCheckoutProtocol
import Foundation
import Testing

@Suite("Payment constraints")
struct ConstraintExpressionTests {
    @Test func preservesNullConstantsAndMissingConstants() throws {
        let data = Data(#"""
        {
          "type": "card",
          "constraints": {
            "required": ["billing_address"],
            "properties": {
              "billing_address": {"const": null},
              "network": {"enum": [null, "visa"]},
              "metadata": {"const": {"optional": null}},
              "values": {"const": [null, false, 0, ""]}
            },
            "anyOf": [{"properties": {"token": {"const": null}}}]
          }
        }
        """#.utf8)
        let instrument = try JSONDecoder().decode(PaymentHandlerResponseSchemaAvailableInstrument.self, from: data)
        let constraints = try #require(instrument.constraints)
        let properties = try #require(constraints.properties)
        #expect(properties["billing_address"]?.const?.value is JSONNull)
        #expect(properties["network"]?.const == nil)
        #expect(constraints.anyOf?.first?.properties?["token"]?.const?.value is JSONNull)

        let encoded = try JSONEncoder().encode(instrument)
        let expected = try #require(try JSONSerialization.jsonObject(with: data) as? NSDictionary)
        let actual = try #require(try JSONSerialization.jsonObject(with: encoded) as? NSDictionary)
        #expect(actual == expected)
    }
}
