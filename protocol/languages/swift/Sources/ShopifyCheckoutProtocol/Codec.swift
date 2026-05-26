import Foundation

extension CheckoutProtocol {
    /// Returns an `ec.ready` response if the given message is an `ec.ready` request,
    /// otherwise `nil`. The response echoes the intersection of the merchant's
    /// requested delegations with `supportedDelegations` under a `delegate` array.
    public static func acknowledgeReady(
        _ message: String,
        supportedDelegations: [String] = CheckoutProtocol.defaultDelegations
    ) -> String? {
        guard case let .ready(id, requested) = decode(jsonRpc: message) else { return nil }
        let accepted = requested.filter(Set(supportedDelegations).contains)
        return encodeReadyResponse(id: id, acceptedDelegations: accepted)
    }
}

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

        if request.method == "ec.error", let error = request.params?.error {
            return .notification(method: request.method, payload: error)
        }

        if let id = request.id {
            return .request(
                id: id,
                method: request.method,
                params: extractParamsData(from: data)
            )
        }

        if let checkout = request.params?.checkout {
            return .notification(method: request.method, payload: checkout)
        }

        return .unknown(method: request.method, rawParams: jsonRpc)
    }

    private static func extractParamsData(from envelope: Data) -> Data {
        guard
            let object = try? JSONSerialization.jsonObject(with: envelope) as? [String: Any],
            let params = object["params"],
            let data = try? JSONSerialization.data(withJSONObject: params)
        else {
            return Data("{}".utf8)
        }
        return data
    }

    static func encodeResponse(id: String, result: some Encodable) -> String {
        let wrapper = JSONRPCResponse(id: id, result: result)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(wrapper) else { return "{}" }
        return String(data: data, encoding: .utf8) ?? "{}"
    }

    static func encodeReadyResponse(id: String, acceptedDelegations: [String]) -> String {
        let result = UCPSuccessResult(
            ucp: UCPSuccess(version: specVersion),
            delegate: acceptedDelegations.isEmpty ? nil : acceptedDelegations
        )
        return encodeResponse(id: id, result: result)
    }
}

private struct JSONRPCResponse<R: Encodable>: Encodable {
    let jsonrpc = "2.0"
    let id: String
    let result: R
}

struct UCPSuccessResult: Encodable {
    let ucp: UCPSuccess
    let delegate: [String]?

    init(ucp: UCPSuccess, delegate: [String]? = nil) {
        self.ucp = ucp
        self.delegate = delegate
    }
}

struct UCPSuccess: Encodable {
    let version: String
    let status = "success"
}

struct UCPError: Encodable {
    let version: String
    let status = "error"
}
