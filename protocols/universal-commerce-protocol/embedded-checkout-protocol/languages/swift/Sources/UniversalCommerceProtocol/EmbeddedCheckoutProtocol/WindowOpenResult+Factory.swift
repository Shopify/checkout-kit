import Foundation

extension EmbeddedCheckoutProtocol.WindowOpenRequest {
    public var parsedURL: URL? {
        url.isEmpty ? nil : URL(string: url)
    }
}

extension EmbeddedCheckoutProtocol.WindowOpenResult {
    public static func success(version: String = EmbeddedCheckoutProtocol.specVersion) -> EmbeddedCheckoutProtocol.WindowOpenResult {
        EmbeddedCheckoutProtocol.WindowOpenResult(ucp: .success(version: version))
    }

    public static func rejected(
        reason: String? = nil,
        version: String = EmbeddedCheckoutProtocol.specVersion
    ) -> EmbeddedCheckoutProtocol.WindowOpenResult {
        EmbeddedCheckoutProtocol.WindowOpenResult(
            ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp(status: .error, version: version)
        ) {
            $0.messages = [
                Message(content: reason ?? "Window open rejected", type: .error) {
                    $0.code = "window_open_rejected_error"
                    $0.severity = .unrecoverable
                },
            ]
        }
    }
}
