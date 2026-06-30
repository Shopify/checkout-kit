import Foundation

extension InstrumentsChangeResultUcp {
    public static func success(version: String = EmbeddedCheckoutProtocol.specVersion) -> Self {
        InstrumentsChangeResultUcp(
            capabilities: nil,
            paymentHandlers: nil,
            services: nil,
            status: .success,
            version: version
        )
    }
}
