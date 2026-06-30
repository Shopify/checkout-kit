import Foundation
@testable import ShopifyCheckoutProtocol
import Testing

@Suite("Result Union Tests")
struct ResultUnionTests {
    private let version = EmbeddedCheckoutProtocol.specVersion

    @Test func decodesSuccessEnvelopeToSuccessBranch() throws {
        let json = """
        {"ucp":{"status":"success","version":"\(version)"},"credential":"tok-success"}
        """
        let result = try JSONDecoder().decode(ReadyResult.self, from: Data(json.utf8))

        guard case let .success(success) = result else {
            Issue.record("Expected .success branch, got \(result)")
            return
        }
        #expect(success.credential == "tok-success")
        #expect(success.ucp.status == .success)
    }

    @Test func decodesErrorEnvelopeToErrorBranch() throws {
        let json = """
        {"ucp":{"status":"error","version":"\(version)"},"messages":[{"content":"boom","type":"error"}],"continue_url":"https://example.test/recover"}
        """
        let result = try JSONDecoder().decode(ReadyResult.self, from: Data(json.utf8))

        guard case let .error(error) = result else {
            Issue.record("Expected .error branch, got \(result)")
            return
        }
        #expect(error.messages.first?.content == "boom")
        #expect(error.continueURL == "https://example.test/recover")
    }

    @Test func encodeRoundTripsSuccessBranch() throws {
        let result = ReadyResult.success(credential: "tok-123")

        let encoded = try JSONEncoder().encode(result)
        let reDecoded = try JSONDecoder().decode(ReadyResult.self, from: encoded)

        guard case let .success(success) = reDecoded else {
            Issue.record("Expected .success branch after round-trip, got \(reDecoded)")
            return
        }
        #expect(success.credential == "tok-123")
    }

    @Test func encodeRoundTripsErrorBranch() throws {
        let json = """
        {"ucp":{"status":"error","version":"\(version)"},"messages":[{"content":"nope","type":"error"}]}
        """
        let decoded = try JSONDecoder().decode(AuthResult.self, from: Data(json.utf8))

        let encoded = try JSONEncoder().encode(decoded)
        let reDecoded = try JSONDecoder().decode(AuthResult.self, from: encoded)

        guard case let .error(error) = reDecoded else {
            Issue.record("Expected .error branch after round-trip, got \(reDecoded)")
            return
        }
        #expect(error.messages.first?.content == "nope")
    }
}
