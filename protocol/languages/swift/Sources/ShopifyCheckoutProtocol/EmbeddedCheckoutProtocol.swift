import Foundation

public enum EmbeddedCheckoutProtocol {
    public static let specVersion = "2026-04-08"

    package static let readyMethod = "ec.ready"
    package static let parseErrorCode = -32700
    package static let parseErrorMessage = "Parse error"
}
