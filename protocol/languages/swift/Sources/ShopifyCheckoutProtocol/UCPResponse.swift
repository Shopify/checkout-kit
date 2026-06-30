import Foundation

extension SuccessUcp {
    public static func success(version: String = EmbeddedCheckoutProtocol.specVersion) -> Self {
        SuccessUcp(
            capabilities: nil,
            paymentHandlers: nil,
            services: nil,
            status: .success,
            version: version
        )
    }
}
