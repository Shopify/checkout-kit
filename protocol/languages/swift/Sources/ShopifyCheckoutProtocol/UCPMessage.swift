import Foundation

enum UCPMessage {
    case notification(method: String, payload: any EventPayload & Sendable)
    case request(id: JSONRPCID, method: String, params: Data)
    case unknown(method: String, rawParams: String)
}
