import Foundation

enum UCPMessage {
    case notification(method: String, payload: any EventPayload & Sendable)
    case request(id: String, method: String, params: Data)
    case ready(id: String, delegations: [String])
    case unknown(method: String, rawParams: String)
}
