import Foundation

extension EmbeddedCheckoutProtocol {
    static func decode(jsonRpc: String) -> UCPMessage {
        guard let data = jsonRpc.data(using: .utf8) else {
            return .unknown(method: "", rawParams: jsonRpc)
        }

        guard let envelope = try? JSONDecoder().decode(JSONRPCEnvelope.self, from: data) else {
            return .unknown(method: "", rawParams: jsonRpc)
        }

        if envelope.method == "ec.error",
           let request = try? JSONDecoder().decode(JSONRPCRequest<JSONRPCErrorParams>.self, from: data) {
            return .notification(method: envelope.method, payload: request.params.error)
        }

        // Any id-bearing message is a request. The raw `params` object is lifted
        // verbatim; typed decoding (and invalid-params reporting) is the registered
        // handler's responsibility, so every request method travels the same rail.
        if let id = envelope.id {
            return .request(id: id, method: envelope.method, params: rawParams(from: data))
        }

        if let request = try? JSONDecoder().decode(JSONRPCRequest<JSONRPCCheckoutParams>.self, from: data) {
            return .notification(method: envelope.method, payload: request.params.checkout)
        }

        return .unknown(method: envelope.method, rawParams: jsonRpc)
    }

    /// Lifts the top-level `params` object from a JSON-RPC message as standalone
    /// `Data`. Absent or non-object params yield an empty object so handlers can
    /// decode a defaultable payload; unknown keys are preserved for the handler's
    /// typed decode to strip.
    private static func rawParams(from data: Data) -> Data {
        guard
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let params = object["params"] as? [String: Any],
            let encoded = try? JSONSerialization.data(withJSONObject: params, options: [.sortedKeys])
        else {
            return Data("{}".utf8)
        }
        return encoded
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

    static func encodeErrorResponse(id: JSONRPCID, code: Int, message: String) -> String {
        let wrapper = JSONRPCErrorResponse(id: id, error: JSONRPCError(code: code, message: message))
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(wrapper) else { return "{}" }
        return String(data: data, encoding: .utf8) ?? "{}"
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
