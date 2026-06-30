import Foundation

extension WindowOpenRequest {
    public var parsedURL: URL? {
        url.isEmpty ? nil : URL(string: url)
    }
}

extension WindowOpenResult {
    public static func success(version: String = EmbeddedCheckoutProtocol.specVersion) -> WindowOpenResult {
        WindowOpenResult(ucp: .success(version: version), continueURL: nil, messages: nil)
    }

    public static func rejected(
        reason: String? = nil,
        version: String = EmbeddedCheckoutProtocol.specVersion
    ) -> WindowOpenResult {
        WindowOpenResult(
            ucp: InstrumentsChangeResultUcp(
                capabilities: nil,
                paymentHandlers: nil,
                services: nil,
                status: .error,
                version: version
            ),
            continueURL: nil,
            messages: [
                Message(
                    code: "window_open_rejected_error",
                    content: reason ?? "Window open rejected",
                    contentType: nil,
                    path: nil,
                    severity: .unrecoverable,
                    type: .error,
                    imageURL: nil,
                    presentation: nil,
                    url: nil
                ),
            ]
        )
    }
}
