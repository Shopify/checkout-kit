import Foundation

public struct AuthRequest: EventPayload {
    public let type: String?

    public init(type: String? = nil) {
        self.type = type
    }
}

public struct AuthResult: ResponsePayload {
    public let credential: String

    public init(credential: String) {
        self.credential = credential
    }

    private enum CodingKeys: String, CodingKey {
        case ucp, credential
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(UCPSuccess(version: EmbeddedCheckoutProtocol.specVersion), forKey: .ucp)
        try container.encode(credential, forKey: .credential)
    }
}

extension EmbeddedCheckoutProtocol {
    public static let auth = RequestDescriptor<AuthRequest, AuthResult>(
        method: Event.auth.method,
        delegation: nil,
        decode: { try? JSONDecoder().decode(AuthRequest.self, from: $0) }
    )
}
