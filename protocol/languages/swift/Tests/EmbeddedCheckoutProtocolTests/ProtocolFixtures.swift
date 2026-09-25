import Foundation
@testable import EmbeddedCheckoutProtocol
import Testing

func protocolFixture(_ name: String) throws -> String {
    let url = try #require(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures"))
    return try String(contentsOf: url, encoding: .utf8)
        .replacingOccurrences(of: "{{SPEC_VERSION}}", with: EmbeddedCheckoutProtocol.specVersion)
}
