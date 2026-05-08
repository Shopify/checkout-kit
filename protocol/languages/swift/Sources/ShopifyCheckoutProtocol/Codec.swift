import Foundation

extension CheckoutProtocol {
    static func decode(jsonRpc: String) -> UCPMessage {
        guard let data = jsonRpc.data(using: .utf8) else {
            return .unknown(method: "", rawParams: jsonRpc)
        }

        guard let request = try? JSONDecoder().decode(JSONRPCRequest.self, from: data) else {
            return .unknown(method: "", rawParams: jsonRpc)
        }

        // Special case so we may intercept and send expected response to initialise the checkout
        if request.method == "ec.ready", let id = request.id {
            return .ready(id: id, delegations: request.params?.delegate ?? [])
        }

        guard let checkout = request.params?.checkout else {
            return .unknown(method: request.method, rawParams: jsonRpc)
        }

        if let id = request.id {
            return .request(id: id, method: request.method, checkout: checkout)
        }

        return .notification(method: request.method, checkout: checkout)
    }

    static func encodeResponse<R: Encodable>(id: String, result: R) -> String {
        let wrapper = JSONRPCResponse(id: id, result: result)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(wrapper) else { return "{}" }
        return String(data: data, encoding: .utf8) ?? "{}"
    }

    static func encodeReady(delegations: [String]) -> String {
        let wrapper = JSONRPCReady(
            params: ReadyParams(delegate: delegations)
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(wrapper) else { return "{}" }
        return String(data: data, encoding: .utf8) ?? "{}"
    }
}

private struct JSONRPCResponse<R: Encodable>: Encodable {
    let jsonrpc = "2.0"
    let id: String
    let result: R
}

private struct JSONRPCReady: Encodable {
    let jsonrpc = "2.0"
    let method = "ec.ready"
    let params: ReadyParams
}

private struct ReadyParams: Encodable {
    let delegate: [String]
}
