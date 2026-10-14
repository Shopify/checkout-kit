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
///
/// `Payload` is the decoded JSON-RPC `params` (the spec envelope shape, e.g.
/// `{checkout}`); `Handler` is what the registered handler receives. By default
/// `Handler` is the full `NotificationMessage<Payload>`; `map` collapses it to a
/// narrower value (a kit facade uses this to hand consumers a bare payload).
public struct NotificationDescriptor<Payload: EventPayload, Handler>: Sendable {
    public let method: String
    let decode: @Sendable (Data) throws -> Payload
    let project: @Sendable (NotificationMessage<Payload>) -> Handler

    /// Returns a descriptor that transforms the handler input, leaving the wire
    /// decode untouched. Used by kits to narrow the full message to a bare payload.
    public func map<Mapped>(
        _ transform: @escaping @Sendable (Handler) -> Mapped
    ) -> NotificationDescriptor<Payload, Mapped> {
        let project = self.project
        return NotificationDescriptor<Payload, Mapped>(
            method: method,
            decode: decode,
            project: { transform(project($0)) }
        )
    }
}

extension NotificationDescriptor where Handler == NotificationMessage<Payload> {
    public init(
        method: String,
        decode: @escaping @Sendable (Data) throws -> Payload
    ) {
        self.init(method: method, decode: decode, project: { $0 })
    }
}

/// A request/response event: the web sends a correlated JSON-RPC request, the
/// consumer's handler produces a typed result, and the client encodes the response.
///
/// This is the single responder model for every id-bearing method — core protocol
/// requests (`ec.ready`, `ec.auth`) and negotiable delegations alike. `delegation`
/// is `nil` for core requests and carries the delegation string for negotiable ones;
/// only the latter contribute to `Client.delegations`.
///
/// As with `NotificationDescriptor`, `Payload` is the decoded `params` and `Handler`
/// is the handler input (the full `RequestMessage<Payload>` by default). `map`
/// narrows the handler input without altering the encoded `Result`.
public struct RequestDescriptor<Payload: EventPayload, Handler, Result: ResponsePayload>: Sendable {
    public let method: String
    public let delegation: String?
    let decode: @Sendable (Data) throws -> Payload
    let project: @Sendable (RequestMessage<Payload>) -> Handler

    /// Returns a descriptor that transforms the handler input, leaving the wire
    /// decode and the response `Result` untouched.
    public func map<Mapped>(
        _ transform: @escaping @Sendable (Handler) -> Mapped
    ) -> RequestDescriptor<Payload, Mapped, Result> {
        let project = self.project
        return RequestDescriptor<Payload, Mapped, Result>(
            method: method,
            delegation: delegation,
            decode: decode,
            project: { transform(project($0)) }
        )
    }
}

extension RequestDescriptor where Handler == RequestMessage<Payload> {
    public init(
        method: String,
        delegation: String? = nil,
        decode: @escaping @Sendable (Data) throws -> Payload
    ) {
        self.init(method: method, delegation: delegation, decode: decode, project: { $0 })
    }
}
