import Foundation

extension AuthRequest: EventPayload {}
extension AuthResult: ResponsePayload {}

extension EmbeddedCheckoutProtocol {
    public static let auth = RequestDescriptor<AuthRequest, AuthResult>(
        method: Event.auth.method,
        delegation: nil,
        decode: { try? JSONDecoder().decode(AuthRequest.self, from: $0) }
    )
}
