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

public struct WindowOpenRequest: EventPayload {
    public let url: URL

    public init(url: URL) {
        self.url = url
    }

    private enum CodingKeys: String, CodingKey {
        case url
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let raw = try container.decode(String.self, forKey: .url)
        guard !raw.isEmpty, let parsed = URL(string: raw) else {
            throw DecodingError.dataCorruptedError(
                forKey: .url,
                in: container,
                debugDescription: "Invalid URL string: '\(raw)'"
            )
        }
        url = parsed
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(url.absoluteString, forKey: .url)
    }
}

public enum WindowOpenResult: ResponsePayload {
    case success
    case rejected(reason: String?)

    public func encode(to encoder: Encoder) throws {
        switch self {
        case .success:
            try UCPSuccessResult(
                ucp: UCPSuccess(version: CheckoutProtocol.specVersion)
            ).encode(to: encoder)
        case let .rejected(reason):
            try WindowOpenRejectedBody(
                ucp: UCPError(version: CheckoutProtocol.specVersion),
                messages: [
                    WindowOpenRejectedMessage(content: reason ?? "Window open rejected")
                ]
            ).encode(to: encoder)
        }
    }
}

extension CheckoutProtocol {
    public static let windowOpen = DelegationDescriptor<WindowOpenRequest, WindowOpenResult>(
        method: "ec.window.open_request",
        delegation: "window.open",
        decode: { params in
            try? JSONDecoder().decode(WindowOpenRequest.self, from: params)
        }
    )
}

private struct WindowOpenRejectedBody: Encodable {
    let ucp: UCPError
    let messages: [WindowOpenRejectedMessage]
}

private struct WindowOpenRejectedMessage: Encodable {
    let type = "error"
    let code = "window_open_rejected_error"
    let content: String
    let severity = "unrecoverable"
}
