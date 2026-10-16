import EmbeddedCheckoutProtocol
import Foundation
import Testing

/// Consumer-facing contract for generated string values: named constants, pattern matching
/// with a default, and lossless pass-through of unknown strings.
///
/// Imports the module without SPI, as an app would.
@Suite("Evolvable model shapes")
struct EvolvableModelShapeTests {
    private struct Payload: Codable {
        let status: CheckoutStatus
    }

    @Test func decodesKnownValuesToNamedConstants() throws {
        let payload = try JSONDecoder().decode(Payload.self, from: Data(#"{"status":"ready_for_complete"}"#.utf8))

        #expect(payload.status == .readyForComplete)
        #expect(payload.status.rawValue == "ready_for_complete")
    }

    @Test func supportsPatternMatchingWithADefault() {
        func describe(_ status: CheckoutStatus) -> String {
            switch status {
            case .completed: "completed"
            case .canceled: "canceled"
            default: "in progress"
            }
        }

        #expect(describe(.completed) == "completed")
        #expect(describe(.incomplete) == "in progress")
    }

    @Test func roundTripsValuesThePinnedVersionDoesNotDefine() throws {
        let payload = try JSONDecoder().decode(Payload.self, from: Data(#"{"status":"on_hold"}"#.utf8))

        #expect(payload.status.rawValue == "on_hold")
        #expect(payload.status != .completed)
        let encoded = try JSONEncoder().encode(payload)
        #expect(String(data: encoded, encoding: .utf8) == #"{"status":"on_hold"}"#)
        let decoded = try JSONDecoder().decode(Payload.self, from: encoded)
        #expect(Set([payload.status, decoded.status]).count == 1)
    }

    @Test(arguments: ["null", "42", "true", "{}", "[]"])
    func rejectsNonStringValues(value: String) {
        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(Payload.self, from: Data("{\"status\":\(value)}".utf8))
        }
    }

    @Test func stillRequiresTheStatusField() {
        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(Payload.self, from: Data("{}".utf8))
        }
    }

    @Test func rawValueInitializerAcceptsKnownValues() {
        #expect(CheckoutStatus(rawValue: "completed") == .completed)
        #expect(CheckoutStatus.completed.isKnown)
    }

    @Test(arguments: ["on_hold", "", "future_status"])
    func rawValueInitializerPreservesUnknownValues(rawValue: String) throws {
        let status = try #require(CheckoutStatus(rawValue: rawValue))

        #expect(status.rawValue == rawValue)
        #expect(!status.isKnown)
    }

    @Test func reconstructsAnUnknownDecodedValueFromItsRawValue() throws {
        let payload = try JSONDecoder().decode(Payload.self, from: Data(#"{"status":"on_hold"}"#.utf8))
        let status = payload.status

        #expect(CheckoutStatus(rawValue: status.rawValue) == status)
        #expect(!status.isKnown)
    }

    @Test func encodesTheRawValue() throws {
        let data = try JSONEncoder().encode([CheckoutStatus.completeInProgress])

        #expect(String(data: data, encoding: .utf8) == #"["complete_in_progress"]"#)
    }

    @Test func valuesAreHashable() {
        let statuses: Set<CheckoutStatus> = [.completed, .completed, .canceled]

        #expect(statuses.count == 2)
    }
}
