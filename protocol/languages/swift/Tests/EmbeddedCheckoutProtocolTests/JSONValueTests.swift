@testable import EmbeddedCheckoutProtocol
import Foundation
import Testing

@Suite("JSON value contracts")
struct JSONValueTests {
    @Test(arguments: [
        "true", "false", "42", "-42", "1.5", #""hello""#, "null", "[]", "{}",
        #"[true,false,42,-42,1.5,"hello",null,[1],{"nested":true}]"#,
        #"{"bool":true,"int":42,"double":1.5,"string":"hello","null":null,"array":[1],"object":{"nested":false}}"#
    ])
    func preservesEveryJSONShape(json: String) throws {
        let input = Data(json.utf8)
        let value = try JSONDecoder().decode(JSONAny.self, from: input)
        let encoded = try JSONEncoder().encode(value)
        let expected = try JSONSerialization.jsonObject(with: input, options: .fragmentsAllowed) as AnyObject
        let actual = try JSONSerialization.jsonObject(with: encoded, options: .fragmentsAllowed) as AnyObject
        #expect(actual.isEqual(expected))
    }

    @Test func exposesNestedValuesWithoutLosingTheirTypes() throws {
        let json = #"{"values":[true,42,1.5,"hello",null,{"nested":[false]}]}"#
        let value = try JSONDecoder().decode(JSONAny.self, from: Data(json.utf8))
        let object = try #require(value.value as? [String: Any])
        let values = try #require(object["values"] as? [Any])
        #expect(values[0] as? Bool == true)
        #expect(values[1] as? Int64 == 42)
        #expect(values[2] as? Double == 1.5)
        #expect(values[3] as? String == "hello")
        #expect(values[4] is JSONNull)
        let nested = try #require(values[5] as? [String: Any])
        #expect(nested["nested"] as? [Bool] == [false])
    }

    @Test func nullRoundTripsAndHasStableEquality() throws {
        let first = try JSONDecoder().decode(JSONNull.self, from: Data("null".utf8))
        let second = JSONNull()
        #expect(first == second)
        #expect(Set([first, second]).count == 1)
        #expect(String(decoding: try JSONEncoder().encode(first), as: UTF8.self) == "null")
        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(JSONNull.self, from: Data("false".utf8))
        }
    }
}
