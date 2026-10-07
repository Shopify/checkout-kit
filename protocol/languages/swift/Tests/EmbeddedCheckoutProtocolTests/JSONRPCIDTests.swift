@testable import EmbeddedCheckoutProtocol
import Foundation
import Testing

@Suite("JSON-RPC IDs")
struct JSONRPCIDTests {
    @Test(arguments: [#""request-1""#, "0", "-1", "9223372036854775807", "-9223372036854775808", "null"])
    func roundTripsWireIdentity(json: String) throws {
        let value = try JSONDecoder().decode(JSONRPCID.self, from: Data(json.utf8))
        #expect(String(decoding: try JSONEncoder().encode(value), as: UTF8.self) == json)
    }

    @Test(arguments: ["true", "1.5", "9223372036854775808", "[]", "{}"])
    func rejectsUnsupportedIDs(json: String) {
        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(JSONRPCID.self, from: Data(json.utf8))
        }
    }

    @Test func literalsPreserveStringAndIntegerIdentity() {
        let string: JSONRPCID = "request-1"
        let integer: JSONRPCID = 42
        #expect(string == .string("request-1"))
        #expect(integer == .int(42))
        #expect(string.stringValue == "request-1")
        #expect(integer.stringValue == nil)
        #expect(JSONRPCID.null.stringValue == nil)
    }
}
