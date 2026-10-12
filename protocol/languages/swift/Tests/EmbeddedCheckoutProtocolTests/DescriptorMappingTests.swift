@testable import EmbeddedCheckoutProtocol
import Foundation
import Testing

private struct MappingPayload: EventPayload {
    let name: String
}

private struct MappingResult: ResponsePayload {
    let greeting: String
}

@Suite("Descriptor mapping")
struct DescriptorMappingTests {
    @Test @MainActor func notificationMappingsComposeAfterDecoding() async throws {
        let descriptor = NotificationDescriptor<MappingPayload, NotificationMessage<MappingPayload>>(
            method: "ec.fixture",
            decode: { try JSONDecoder().decode(MappingPayload.self, from: $0) }
        ).map { $0.params.name }.map { "Hello, \($0)!" }
        var received: [String] = []
        let client = EmbeddedCheckoutProtocol.Client().on(descriptor) { received.append($0) }

        #expect(descriptor.method == "ec.fixture")
        #expect(await client.process(#"{"jsonrpc":"2.0","method":"ec.fixture","params":{"name":"Ada"}}"#) == nil)
        #expect(received == ["Hello, Ada!"])
        // A failed wire decode must never reach either the mapping or the handler.
        #expect(await client.process(#"{"jsonrpc":"2.0","method":"ec.fixture","params":{"name":42}}"#) == nil)
        #expect(received == ["Hello, Ada!"])
    }

    @Test(arguments: [nil, "fixture.greeting"])
    @MainActor func requestMappingPreservesIdentityAndWireResult(delegation: String?) async throws {
        let descriptor = RequestDescriptor<MappingPayload, RequestMessage<MappingPayload>, MappingResult>(
            method: "ec.fixture_request",
            delegation: delegation,
            decode: { try JSONDecoder().decode(MappingPayload.self, from: $0) }
        ).map { $0.params.name }.map { "Hello, \($0)!" }
        let client = EmbeddedCheckoutProtocol.Client().on(descriptor) { MappingResult(greeting: $0) }

        #expect(descriptor.method == "ec.fixture_request")
        #expect(descriptor.delegation == delegation)
        #expect(client.delegations == delegation.map { [$0] } ?? [])
        let response = try #require(await client.process(
            #"{"jsonrpc":"2.0","id":7,"method":"ec.fixture_request","params":{"name":"Ada"}}"#
        ))
        let object = try #require(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        #expect(object["jsonrpc"] as? String == "2.0")
        #expect(object["id"] as? Int == 7)
        #expect(object["result"] as? [String: String] == ["greeting": "Hello, Ada!"])

        let invalid = try #require(await client.process(
            #"{"jsonrpc":"2.0","id":7,"method":"ec.fixture_request","params":{}}"#
        ))
        let error = try #require(try JSONSerialization.jsonObject(with: Data(invalid.utf8)) as? [String: Any])
        #expect((error["error"] as? [String: Any])?["code"] as? Int == -32602)
        #expect(error["result"] == nil)
    }
}
