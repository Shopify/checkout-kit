@testable import CustomerAccountsOAuth
import Foundation

func makeOAuthConfiguration(browserSession: OAuthConfiguration.BrowserSession = .shared) -> OAuthConfiguration {
    OAuthConfiguration(
        shopID: "123456789",
        clientID: "test-client",
        redirectURI: URL(string: "shop.123456789.app://callback")!,
        browserSession: browserSession
    )
}

func makeIDToken(
    issuer: String = "https://shopify.com/authentication/123456789",
    audience: Any = "test-client",
    authorizedParty: String? = nil,
    subject: Any = "customer-1",
    expiration: Date,
    issuedAt: Date,
    nonce: String? = "expected-nonce",
    email: String? = "customer@example.com"
) throws -> String {
    var claims: [String: Any] = [
        "iss": issuer,
        "aud": audience,
        "sub": subject,
        "exp": expiration.timeIntervalSince1970,
        "iat": issuedAt.timeIntervalSince1970
    ]
    claims["azp"] = authorizedParty
    claims["nonce"] = nonce
    claims["email"] = email

    let header = try JSONSerialization.data(withJSONObject: ["alg": "RS256", "typ": "JWT"])
    let payload = try JSONSerialization.data(withJSONObject: claims)
    return "\(header.base64URLEncoded).\(payload.base64URLEncoded).signature"
}

actor StubHTTPClient: HTTPClient {
    struct Stub {
        let data: Data
        let statusCode: Int
    }

    private var stubs: [Stub]
    private(set) var requests: [URLRequest] = []
    private let delayNanoseconds: UInt64?

    init(stubs: [Stub], delayNanoseconds: UInt64? = nil) {
        self.stubs = stubs
        self.delayNanoseconds = delayNanoseconds
    }

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        requests.append(request)
        if let delayNanoseconds {
            try await Task.sleep(nanoseconds: delayNanoseconds)
        }
        let stub = stubs.removeFirst()
        let response = HTTPURLResponse(
            url: request.url!,
            statusCode: stub.statusCode,
            httpVersion: nil,
            headerFields: nil
        )!
        return (stub.data, response)
    }
}

struct FailingHTTPClient: HTTPClient {
    func data(for _: URLRequest) async throws -> (Data, HTTPURLResponse) {
        throw URLError(.notConnectedToInternet)
    }
}

final class MemoryCredentialStore: CredentialStore, @unchecked Sendable {
    var credentials: StoredCredentials?
    private(set) var saveCount = 0
    private(set) var removeCount = 0

    init(credentials: StoredCredentials? = nil) {
        self.credentials = credentials
    }

    func load() throws -> StoredCredentials? {
        credentials
    }

    func save(_ credentials: StoredCredentials) throws {
        self.credentials = credentials
        saveCount += 1
    }

    func remove() throws {
        credentials = nil
        removeCount += 1
    }
}

extension Data {
    var base64URLEncoded: String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
