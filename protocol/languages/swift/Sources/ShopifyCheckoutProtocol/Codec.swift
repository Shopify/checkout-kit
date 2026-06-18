import Foundation

extension CheckoutProtocol {
    /// Returns an `ec.ready` response if the given message is an `ec.ready` request,
    /// otherwise `nil`. The response echoes the intersection of the merchant's
    /// requested delegations with `supportedDelegations` under a `delegate` array.
    public static func acknowledgeReady(
        _ message: String,
        supportedDelegations: [String] = CheckoutProtocol.defaultDelegations
    ) -> String? {
        switch decode(jsonRpc: message) {
        case let .ready(id, requested):
            let accepted = requested.filter(Set(supportedDelegations).contains)
            return encodeReadyResponse(id: id, acceptedDelegations: accepted)

        case let .error(id, code, message):
            return encodeErrorResponse(id: id, code: code, message: message)

        default:
            return nil
        }
    }
}

extension CheckoutProtocol {
    static func decode(jsonRpc: String) -> UCPMessage {
        guard let data = jsonRpc.data(using: .utf8) else {
            return .unknown(method: "", rawParams: jsonRpc)
        }

        guard let envelope = try? JSONDecoder().decode(JSONRPCEnvelope.self, from: data) else {
            return .unknown(method: "", rawParams: jsonRpc)
        }

        // Special case so we may intercept and send expected response to initialise the checkout
        if envelope.method == "ec.ready", let id = envelope.id {
            guard let request = try? JSONDecoder().decode(JSONRPCReadyRequest.self, from: data) else {
                return .error(id: id, code: parseErrorCode, message: parseErrorMessage)
            }
            return .ready(id: id, delegations: request.params.delegate)
        }

        if envelope.method == "ec.error",
           let request = try? JSONDecoder().decode(JSONRPCRequest<JSONRPCErrorParams>.self, from: data) {
            return .notification(method: envelope.method, payload: request.params.error)
        }

        if let id = envelope.id,
           let params = requestParamsData(for: envelope.method, from: data) {
            return .request(id: id, method: envelope.method, params: params)
        }

        if let id = envelope.id,
           envelope.method == "ec.window.open_request" {
            return .error(id: id, code: invalidParamsCode, message: invalidParamsMessage)
        }

        if let request = try? JSONDecoder().decode(JSONRPCRequest<JSONRPCCheckoutParams>.self, from: data) {
            return .notification(method: envelope.method, payload: request.params.checkout)
        }

        return .unknown(method: envelope.method, rawParams: jsonRpc)
    }

    private static func requestParamsData(for method: String, from data: Data) -> Data? {
        switch method {
        case "ec.window.open_request":
            return try? encodeParams(JSONDecoder().decode(JSONRPCRequest<JSONRPCWindowOpenParams>.self, from: data).params)
        default:
            return try? encodeParams(JSONDecoder().decode(JSONRPCRequest<JSONRPCCheckoutParams>.self, from: data).params)
        }
    }

    private static func encodeParams(_ params: some Encodable) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return try encoder.encode(params)
    }

    static func encodeResponse(id: String, result: some Encodable) -> String {
        encodeResponse(id: .string(id), result: result)
    }

    static func encodeResponse(id: JSONRPCID, result: some Encodable) -> String {
        let wrapper = JSONRPCResponse(id: id, result: result)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(wrapper) else { return "{}" }
        return String(data: data, encoding: .utf8) ?? "{}"
    }

    static func encodeReadyResponse(id: String, acceptedDelegations: [String]) -> String {
        encodeReadyResponse(id: .string(id), acceptedDelegations: acceptedDelegations)
    }

    static func encodeReadyResponse(id: JSONRPCID, acceptedDelegations: [String]) -> String {
        let result = UCPSuccessResult(
            ucp: UCPSuccess(version: specVersion),
            delegate: acceptedDelegations.isEmpty ? nil : acceptedDelegations
        )
        return encodeResponse(id: id, result: result)
    }

    static func encodeErrorResponse(id: JSONRPCID, code: Int, message: String) -> String {
        let wrapper = JSONRPCErrorResponse(id: id, error: JSONRPCError(code: code, message: message))
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(wrapper) else { return "{}" }
        return String(data: data, encoding: .utf8) ?? "{}"
    }
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

private let invalidParamsCode = -32602
private let invalidParamsMessage = "Invalid params"
