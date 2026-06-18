import Foundation

enum UCPMessage {
    case notification(method: String, payload: any EventPayload & Sendable)
    case request(id: JSONRPCID, method: String, params: Data)
    case ready(id: JSONRPCID, delegations: [String])
    case error(id: JSONRPCID, code: Int, message: String)
    case unknown(method: String, rawParams: String)
}
