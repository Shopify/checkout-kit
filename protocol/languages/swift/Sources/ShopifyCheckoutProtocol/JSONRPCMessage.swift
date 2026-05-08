import Foundation

struct JSONRPCRequest: Decodable, Sendable {
    let jsonrpc: String
    let method: String
    let params: JSONRPCParams?
    let id: String?
}

struct JSONRPCParams: Decodable, Sendable {
    let checkout: Checkout?
    let delegate: [String]?
}
