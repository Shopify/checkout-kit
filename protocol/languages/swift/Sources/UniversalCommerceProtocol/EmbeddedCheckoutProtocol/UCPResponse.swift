import Foundation

extension EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp {
    public static func success(version: String = EmbeddedCheckoutProtocol.specVersion) -> Self {
        EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp(
            capabilities: nil,
            paymentHandlers: nil,
            services: nil,
            status: .success,
            version: version
        )
    }
}
