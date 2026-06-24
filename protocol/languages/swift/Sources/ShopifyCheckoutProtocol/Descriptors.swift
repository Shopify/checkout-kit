import Foundation

/// Marker protocol that constrains which types can be used as descriptor payloads.
/// This must be a protocol (not a typealias for `Decodable & Sendable`) so that
/// conformance is explicit — preventing arbitrary types like `[String]` or `Int`
/// from silently matching descriptor generic constraints.
public protocol EventPayload: Decodable, Sendable {}
/// Marker protocol that constrains which types can be used as request response payloads.
/// Like `EventPayload`, this must be a protocol (not a typealias) so that conformance
/// is explicit — preventing arbitrary `Encodable & Sendable` types from silently matching.
public protocol ResponsePayload: Encodable, Sendable {}

/// A fire-and-forget event: the host pushes state, the consumer reacts, nothing is
/// returned to the web.
public struct NotificationDescriptor<Payload: EventPayload>: Sendable {
    public let method: String
}

/// A request/response event: the web sends a correlated JSON-RPC request, the
/// consumer's handler produces a typed result, and the client encodes the response.
///
/// This is the single responder model for every id-bearing method — core protocol
/// requests (`ec.ready`, `ec.auth`) and negotiable delegations alike. `delegation`
/// is `nil` for core requests and carries the delegation string for negotiable ones;
/// only the latter contribute to `Client.delegations`.
public struct RequestDescriptor<Payload: EventPayload, Result: ResponsePayload>: Sendable {
    public let method: String
    public let delegation: String?
    let decode: @Sendable (Data) -> Payload?

    public init(
        method: String,
        delegation: String? = nil,
        decode: @escaping @Sendable (Data) -> Payload?
    ) {
        self.method = method
        self.delegation = delegation
        self.decode = decode
    }
}

/// Metadata-only descriptor emitted by the generated catalog for result-bearing
/// methods. The code generator cannot know the hand-authored Swift payload/result
/// types, so it supplies the method-name constant only; typed responder behavior
/// comes from the hand-authored `RequestDescriptor` values.
public struct MethodDescriptor: Sendable {
    public let method: String

    public init(method: String) {
        self.method = method
    }
}
