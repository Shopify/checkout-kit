import Foundation

enum UCPMessage {
    case notification(method: String, params: Data)
    case request(id: JSONRPCID, method: String, params: Data)
    case unknown(method: String, rawParams: String)
}
