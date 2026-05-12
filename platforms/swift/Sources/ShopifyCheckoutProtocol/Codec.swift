/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import Foundation

extension CheckoutProtocol {
    /// Returns an `ec.ready` response if the given message is an `ec.ready` request,
    /// otherwise `nil`. Lets the kit acknowledge the handshake without surfacing it
    /// to consumers.
    public static func acknowledgeReady(_ message: String) -> String? {
        guard case let .ready(id, _) = decode(jsonRpc: message) else { return nil }
        return encodeReadyResponse(id: id)
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

        guard let checkout = request.params?.checkout else {
            return .unknown(method: request.method, rawParams: jsonRpc)
        }

        if let id = request.id {
            return .request(id: id, method: request.method, checkout: checkout)
        }

        return .notification(method: request.method, payload: checkout)
    }

    static func encodeResponse(id: String, result: some Encodable) -> String {
        let wrapper = JSONRPCResponse(id: id, result: result)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(wrapper) else { return "{}" }
        return String(data: data, encoding: .utf8) ?? "{}"
    }

    static func encodeReadyResponse(id: String) -> String {
        let result = ReadyResult(ucp: UCPSuccess(version: specVersion))
        return encodeResponse(id: id, result: result)
    }
}

private struct JSONRPCResponse<R: Encodable>: Encodable {
    let jsonrpc = "2.0"
    let id: String
    let result: R
}

private struct ReadyResult: Encodable {
    let ucp: UCPSuccess
}

private struct UCPSuccess: Encodable {
    let version: String
    let status = "success"
}
