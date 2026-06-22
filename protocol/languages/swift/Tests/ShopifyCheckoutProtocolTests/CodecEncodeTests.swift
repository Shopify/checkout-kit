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

    @Test func encodesReadyResponseWithResultEnvelope() throws {
        let json = EmbeddedCheckoutProtocol.encodeReadyResponse(id: "ready-1", acceptedDelegations: [])
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        #expect(parsed["jsonrpc"] as? String == "2.0")
        #expect(parsed["id"] as? String == "ready-1")
        #expect(parsed["method"] == nil, "JSON-RPC responses must not carry a method field")
        #expect(parsed["params"] == nil, "JSON-RPC responses must not carry a params field")

        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["version"] as? String == EmbeddedCheckoutProtocol.specVersion)
        #expect(ucp["status"] as? String == "success")
        #expect(result["delegate"] == nil, "Empty delegate list must be omitted")
    }

    @Test func encodesReadyResponseEchoesAcceptedDelegations() throws {
        let json = EmbeddedCheckoutProtocol.encodeReadyResponse(id: "ready-1", acceptedDelegations: ["window.open"])
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        let result = try #require(parsed["result"] as? [String: Any])
        let delegate = try #require(result["delegate"] as? [String])
        #expect(delegate == ["window.open"])
    }

    @Test func encodesReadyResponseWithNumericID() throws {
        let json = EmbeddedCheckoutProtocol.encodeReadyResponse(id: 7, acceptedDelegations: [])
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        #expect(parsed["id"] as? Int == 7)
    }

    @Test func encodesReadyResponseWithNullID() throws {
        let json = EmbeddedCheckoutProtocol.encodeReadyResponse(id: .null, acceptedDelegations: [])
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        #expect(parsed["id"] is NSNull)
    }

    @Test func acknowledgeReadyReturnsResponseForReadyMessage() throws {
        let message = #"""
        {"jsonrpc":"2.0","id":"ready-1","method":"ec.ready","params":{"delegate":["payment.credential"]}}
        """#

        let response = try #require(EmbeddedCheckoutProtocol.acknowledgeReady(message))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "ready-1")
        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["version"] as? String == EmbeddedCheckoutProtocol.specVersion)
        #expect(ucp["status"] as? String == "success")
    }

    @Test func acknowledgeReadyEchoesIntersectionWithSupportedDelegations() throws {
        let message = #"""
        {"jsonrpc":"2.0","id":"ready-1","method":"ec.ready","params":{"delegate":["payment.credential","window.open","fulfillment.address_change"]}}
        """#

        let response = try #require(EmbeddedCheckoutProtocol.acknowledgeReady(message, supportedDelegations: ["window.open"]))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        let result = try #require(parsed["result"] as? [String: Any])
        let delegate = try #require(result["delegate"] as? [String])
        #expect(delegate == ["window.open"])
    }

    @Test func acknowledgeReadyOmitsDelegateWhenNoIntersection() throws {
        let message = #"""
        {"jsonrpc":"2.0","id":"ready-1","method":"ec.ready","params":{"delegate":["payment.credential"]}}
        """#

        let response = try #require(EmbeddedCheckoutProtocol.acknowledgeReady(message, supportedDelegations: ["window.open"]))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        let result = try #require(parsed["result"] as? [String: Any])
        #expect(result["delegate"] == nil)
    }

    @Test func acknowledgeReadyAcceptsMissingParamsAsEmptyDelegations() throws {
        let message = #"""
        {"jsonrpc":"2.0","id":"ready-no-params","method":"ec.ready"}
        """#

        let response = try #require(EmbeddedCheckoutProtocol.acknowledgeReady(message))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "ready-no-params")
        let result = try #require(parsed["result"] as? [String: Any])
        #expect(result["delegate"] == nil)
    }

    @Test func acknowledgeReadyReturnsParseErrorForMalformedParams() throws {
        let message = #"""
        {"jsonrpc":"2.0","id":"ready-bad","method":"ec.ready","params":{"delegate":[null]}}
        """#

        let response = try #require(EmbeddedCheckoutProtocol.acknowledgeReady(message))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "ready-bad")
        let error = try #require(parsed["error"] as? [String: Any])
        #expect(error["code"] as? Int == EmbeddedCheckoutProtocol.parseErrorCode)
        #expect(error["message"] as? String == EmbeddedCheckoutProtocol.parseErrorMessage)
    }

    @Test func acknowledgeReadyReturnsParseErrorForNullParams() throws {
        let message = #"""
        {"jsonrpc":"2.0","id":"ready-null","method":"ec.ready","params":null}
        """#

        let response = try #require(EmbeddedCheckoutProtocol.acknowledgeReady(message))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "ready-null")
        let error = try #require(parsed["error"] as? [String: Any])
        #expect(error["code"] as? Int == EmbeddedCheckoutProtocol.parseErrorCode)
        #expect(error["message"] as? String == EmbeddedCheckoutProtocol.parseErrorMessage)
    }

    @Test func acknowledgeReadyReturnsNilForNonReadyMessage() {
        let message = #"""
        {"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{"id":"c"}}}
        """#

        #expect(EmbeddedCheckoutProtocol.acknowledgeReady(message) == nil)
    }

    @Test func acknowledgeReadyReturnsNilForMalformedJSON() {
        #expect(EmbeddedCheckoutProtocol.acknowledgeReady("not json") == nil)
    }
}
