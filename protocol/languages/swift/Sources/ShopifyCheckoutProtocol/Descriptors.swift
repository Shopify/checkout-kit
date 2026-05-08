/// Marker protocol that constrains which types can be used as descriptor payloads.
/// This must be a protocol (not a typealias for `Decodable & Sendable`) so that
/// conformance is explicit — preventing arbitrary types like `[String]` or `Int`
/// from silently matching descriptor generic constraints.
public protocol EventPayload: Decodable, Sendable {}
/// Marker protocol that constrains which types can be used as delegation response payloads.
/// Like `EventPayload`, this must be a protocol (not a typealias) so that conformance
/// is explicit — preventing arbitrary `Encodable & Sendable` types from silently matching.
public protocol ResponsePayload: Encodable, Sendable {}

extension Checkout: EventPayload {}
extension InstrumentsChangeResult: ResponsePayload {}
extension CredentialResult: ResponsePayload {}
public struct ReadyPayload: EventPayload {
    public let delegations: [String]
}

public struct NotificationDescriptor<Payload: EventPayload>: Sendable {
    public let method: String
}

public struct DelegationDescriptor<Payload: EventPayload, Result: ResponsePayload>: Sendable {
    public let method: String
    public let delegation: String
}
