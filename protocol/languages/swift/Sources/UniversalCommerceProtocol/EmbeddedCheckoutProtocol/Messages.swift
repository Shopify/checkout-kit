import Foundation

/// The full JSON-RPC notification envelope handed to a notification handler:
/// `{jsonrpc, method, params}`. Mirrors the UCP wire shape exactly; kits narrow
/// to a bare payload via `NotificationDescriptor.map` where an ergonomic API is
/// preferred.
public struct NotificationMessage<Payload: EventPayload>: Sendable {
    public let jsonrpc: String
    public let method: String
    public let params: Payload

    public init(jsonrpc: String = "2.0", method: String, params: Payload) {
        self.jsonrpc = jsonrpc
        self.method = method
        self.params = params
    }
}

/// The full JSON-RPC request envelope handed to a request handler:
/// `{jsonrpc, method, id, params}`. Mirrors the UCP wire shape exactly; kits
/// narrow to a bare payload via `RequestDescriptor.map` where an ergonomic API is
/// preferred.
public struct RequestMessage<Payload: EventPayload>: Sendable {
    public let jsonrpc: String
    public let method: String
    public let id: JSONRPCID
    public let params: Payload

    public init(jsonrpc: String = "2.0", method: String, id: JSONRPCID, params: Payload) {
        self.jsonrpc = jsonrpc
        self.method = method
        self.id = id
        self.params = params
    }
}
