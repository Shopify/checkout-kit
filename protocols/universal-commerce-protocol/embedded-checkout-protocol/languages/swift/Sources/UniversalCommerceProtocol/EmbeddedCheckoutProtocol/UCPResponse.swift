import Foundation

extension EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp {
    public static func success(version: String = EmbeddedCheckoutProtocol.specVersion) -> Self {
        Self(status: .success, version: version)
    }
}
