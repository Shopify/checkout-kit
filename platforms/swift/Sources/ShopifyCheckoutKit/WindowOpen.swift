#if !COCOAPODS
    import ShopifyCheckoutProtocol
#endif
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
            try WindowOpenSuccessBody(
                ucp: WindowOpenUCP(version: EmbeddedCheckoutProtocol.specVersion, status: "success")
            ).encode(to: encoder)
        case let .rejected(reason):
            try WindowOpenRejectedBody(
                ucp: WindowOpenUCP(version: EmbeddedCheckoutProtocol.specVersion, status: "error"),
                messages: [
                    WindowOpenRejectedMessage(content: reason ?? "Window open rejected")
                ]
            ).encode(to: encoder)
        }
    }
}

extension CheckoutProtocol {
    public static let windowOpen = RequestDescriptor<WindowOpenRequest, WindowOpenResult>(
        method: EmbeddedCheckoutProtocol.Event.windowOpenRequest,
        delegation: "window.open",
        decode: { params in
            try? JSONDecoder().decode(WindowOpenRequest.self, from: params)
        }
    )
}

private struct WindowOpenUCP: Encodable {
    let version: String
    let status: String
}

private struct WindowOpenSuccessBody: Encodable {
    let ucp: WindowOpenUCP
}

private struct WindowOpenRejectedBody: Encodable {
    let ucp: WindowOpenUCP
    let messages: [WindowOpenRejectedMessage]
}

private struct WindowOpenRejectedMessage: Encodable {
    let type = "error"
    let code = "window_open_rejected_error"
    let content: String
    let severity = "unrecoverable"
}
