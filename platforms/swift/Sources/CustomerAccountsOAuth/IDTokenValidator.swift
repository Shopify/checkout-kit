import Foundation

/// Validates the OIDC claims that bind an ID token to the authorization request.
///
/// Customer Account ID tokens are received directly from Shopify's TLS-protected
/// token endpoint. As with AppAuth's code flow, this client relies on that channel
/// rather than performing local JWT signature verification. Claims from this token
/// must not be used as authorization decisions for other services.
struct IDTokenValidator {
    private let configuration: OAuthConfiguration
    private let clock: @Sendable () -> Date
    private let clockSkew: TimeInterval

    init(
        configuration: OAuthConfiguration,
        clockSkew: TimeInterval = 60,
        clock: @escaping @Sendable () -> Date = Date.init
    ) {
        self.configuration = configuration
        self.clockSkew = clockSkew
        self.clock = clock
    }

    func validate(_ idToken: String, expectedNonce: String?) throws -> String? {
        let sections = idToken.split(separator: ".", omittingEmptySubsequences: false)
        guard sections.count == 3,
              let payload = Data(base64URLEncoded: String(sections[1])),
              let claims = try? JSONDecoder().decode(IDTokenClaims.self, from: payload),
              !claims.subject.value.isEmpty
        else {
            throw OAuthError.invalidIDToken
        }

        guard claims.issuer == configuration.issuer?.absoluteString else {
            throw OAuthError.invalidIssuer
        }

        guard claims.audience.values.contains(configuration.clientID) else {
            throw OAuthError.invalidAudience
        }

        if claims.audience.values.count > 1 || claims.authorizedParty != nil {
            guard claims.authorizedParty == configuration.clientID else {
                throw OAuthError.invalidAudience
            }
        }

        let now = clock()
        guard Date(timeIntervalSince1970: claims.expiration).addingTimeInterval(clockSkew) >= now else {
            throw OAuthError.expiredIDToken
        }

        guard Date(timeIntervalSince1970: claims.issuedAt).addingTimeInterval(-clockSkew) <= now else {
            throw OAuthError.invalidIssuedAt
        }

        if let expectedNonce {
            guard claims.nonce == expectedNonce else {
                throw OAuthError.invalidNonce
            }
        }

        return claims.email
    }
}

private struct IDTokenClaims: Decodable {
    let issuer: String
    let subject: Subject
    let audience: Audience
    let expiration: TimeInterval
    let issuedAt: TimeInterval
    let nonce: String?
    let authorizedParty: String?
    let email: String?

    enum CodingKeys: String, CodingKey {
        case issuer = "iss"
        case subject = "sub"
        case audience = "aud"
        case expiration = "exp"
        case issuedAt = "iat"
        case nonce
        case authorizedParty = "azp"
        case email
    }
}

/// Shopify currently serializes the subject as a JSON number, while OIDC defines
/// it as a string. Accept both representations without accepting other JSON types.
private struct Subject: Decodable {
    let value: String

    init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let value = try? container.decode(String.self) {
            self.value = value
        } else if let value = try? container.decode(UInt64.self) {
            self.value = String(value)
        } else {
            throw DecodingError.typeMismatch(
                Subject.self,
                .init(codingPath: decoder.codingPath, debugDescription: "Expected a string or unsigned integer")
            )
        }
    }
}

private enum Audience: Decodable {
    case one(String)
    case many([String])

    init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let value = try? container.decode(String.self) {
            self = .one(value)
        } else {
            self = try .many(container.decode([String].self))
        }
    }

    var values: [String] {
        switch self {
        case let .one(value): [value]
        case let .many(values): values
        }
    }
}

extension Data {
    fileprivate init?(base64URLEncoded value: String) {
        var base64 = value
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        base64.append(String(repeating: "=", count: (4 - base64.count % 4) % 4))
        self.init(base64Encoded: base64)
    }
}
