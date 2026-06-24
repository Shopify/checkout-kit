import Foundation
@testable import ShopifyCheckoutProtocol
import Testing

@Suite("Codec Encode Tests")
struct CodecEncodeTests {
    @Test func encodesResponse() throws {
        let result = CredentialResult(
            checkout: CredentialCheckout(
                payment: Payment(instruments: nil)
            ),
            ucp: InstrumentsChangeResultUcp(
                capabilities: nil,
                paymentHandlers: nil,
                services: nil,
                status: .success,
                version: EmbeddedCheckoutProtocol.specVersion
            ),
            continueURL: nil,
            messages: nil
        )
        let json = EmbeddedCheckoutProtocol.encodeResponse(id: "req-456", result: result)
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        #expect(parsed["jsonrpc"] as? String == "2.0")
        #expect(parsed["id"] as? String == "req-456")
        #expect(parsed["result"] != nil)
    }

    @Test func encodesReadyResultOmittingEmptyDelegate() throws {
        let json = EmbeddedCheckoutProtocol.encodeResponse(id: "ready-1", result: ReadyResult())
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "ready-1")
        #expect(parsed["method"] == nil, "JSON-RPC responses must not carry a method field")
        #expect(parsed["params"] == nil, "JSON-RPC responses must not carry a params field")

        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["version"] as? String == EmbeddedCheckoutProtocol.specVersion)
        #expect(ucp["status"] as? String == "success")
        #expect(result["delegate"] == nil, "Empty delegate list must be omitted")
        #expect(result["credential"] == nil, "Absent credential must be omitted")
    }

    @Test func encodesReadyResultEchoingDelegate() throws {
        let json = EmbeddedCheckoutProtocol.encodeResponse(
            id: 7,
            result: ReadyResult(delegate: ["window.open"])
        )
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        #expect(parsed["id"] as? Int == 7)
        let result = try #require(parsed["result"] as? [String: Any])
        let delegate = try #require(result["delegate"] as? [String])
        #expect(delegate == ["window.open"])
    }

    @Test func encodesReadyResultIncludingCredential() throws {
        let json = EmbeddedCheckoutProtocol.encodeResponse(
            id: .null,
            result: ReadyResult(credential: "tok-123")
        )
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        #expect(parsed["id"] is NSNull)
        let result = try #require(parsed["result"] as? [String: Any])
        #expect(result["credential"] as? String == "tok-123")
    }

    @Test func encodesAuthResult() throws {
        let json = EmbeddedCheckoutProtocol.encodeResponse(
            id: "auth-1",
            result: AuthResult(credential: "tok-abc")
        )
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        let result = try #require(parsed["result"] as? [String: Any])
        #expect(result["credential"] as? String == "tok-abc")
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["status"] as? String == "success")
        #expect(ucp["version"] as? String == EmbeddedCheckoutProtocol.specVersion)
    }

    @Test func encodesErrorResponse() throws {
        let json = EmbeddedCheckoutProtocol.encodeErrorResponse(
            id: .string("err-1"),
            code: EmbeddedCheckoutProtocol.invalidParamsCode,
            message: EmbeddedCheckoutProtocol.invalidParamsMessage
        )
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "err-1")
        let error = try #require(parsed["error"] as? [String: Any])
        #expect(error["code"] as? Int == EmbeddedCheckoutProtocol.invalidParamsCode)
        #expect(error["message"] as? String == EmbeddedCheckoutProtocol.invalidParamsMessage)
    }
}
