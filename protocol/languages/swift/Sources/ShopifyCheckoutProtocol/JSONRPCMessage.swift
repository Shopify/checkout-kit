import Foundation

struct JSONRPCRequest: Decodable {
    let jsonrpc: String
    let method: String
    let params: JSONRPCParams?
    let id: String?
}

struct JSONRPCParams: Decodable {
    let checkout: Checkout?
    let delegate: [String]?
    let error: ErrorResponse?
    let url: String?
}
