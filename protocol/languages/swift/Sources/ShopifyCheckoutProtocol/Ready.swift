import Foundation

public struct ReadyRequest: EventPayload {
    public let delegate: [String]

    public init(delegate: [String] = []) {
        self.delegate = delegate
    }

    private enum CodingKeys: String, CodingKey {
        case delegate
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        delegate = try container.decodeIfPresent([String].self, forKey: .delegate) ?? []
    }
}

public struct ReadyResult: ResponsePayload {
    public let delegate: [String]
    public let credential: String?

    public init(delegate: [String] = [], credential: String? = nil) {
        self.delegate = delegate
        self.credential = credential
    }

    private enum CodingKeys: String, CodingKey {
        case ucp, delegate, credential
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(UCPSuccess(version: EmbeddedCheckoutProtocol.specVersion), forKey: .ucp)
        if !delegate.isEmpty {
            try container.encode(delegate, forKey: .delegate)
        }
        try container.encodeIfPresent(credential, forKey: .credential)
    }
}

extension EmbeddedCheckoutProtocol {
    public static let ready = RequestDescriptor<ReadyRequest, ReadyResult>(
        method: Event.ready.method,
        delegation: nil,
        decode: { try? JSONDecoder().decode(ReadyRequest.self, from: $0) }
    )
}
