@testable import CustomerAccountsOAuth
import Foundation
import XCTest

@MainActor
final class OAuthClientTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 2_000_000_000)

    func testConcurrentAccessTokenRequestsShareOneRefresh() async throws {
        let credentials = StoredCredentials(
            accessToken: "expired-access-token",
            refreshToken: "refresh-token",
            idToken: "header.payload.signature",
            tokenType: "Bearer",
            accessTokenExpiresAt: now.addingTimeInterval(-1),
            email: "customer@example.com"
        )
        let store = MemoryCredentialStore(credentials: credentials)
        let response = try JSONSerialization.data(withJSONObject: [
            "access_token": "fresh-access-token",
            "expires_in": 3600,
            "token_type": "Bearer"
        ])
        let httpClient = StubHTTPClient(
            stubs: [.init(data: response, statusCode: 200)],
            delayNanoseconds: 20_000_000
        )
        let client = OAuthClient(
            configuration: makeOAuthConfiguration(),
            httpClient: httpClient,
            credentialStore: store,
            clock: { [now] in now }
        )

        async let first = client.accessToken()
        async let second = client.accessToken()
        let tokens = try await [first, second]
        let requestCount = await httpClient.requests.count

        XCTAssertEqual(tokens, ["fresh-access-token", "fresh-access-token"])
        XCTAssertEqual(requestCount, 1)
        XCTAssertEqual(store.saveCount, 1)
    }

    func testRestoreRemovesExpiredSessionWithoutRefreshToken() async throws {
        let store = MemoryCredentialStore(credentials: StoredCredentials(
            accessToken: "expired-access-token",
            refreshToken: nil,
            idToken: "header.payload.signature",
            tokenType: "Bearer",
            accessTokenExpiresAt: now.addingTimeInterval(-1),
            email: nil
        ))
        let client = OAuthClient(
            configuration: makeOAuthConfiguration(),
            httpClient: StubHTTPClient(stubs: []),
            credentialStore: store,
            clock: { [now] in now }
        )

        let session = try await client.restoreSession()
        XCTAssertNil(session)
        XCTAssertNil(store.credentials)
        XCTAssertEqual(store.removeCount, 1)
    }

    func testInvalidGrantClearsStoredSession() async throws {
        let store = MemoryCredentialStore(credentials: StoredCredentials(
            accessToken: "expired-access-token",
            refreshToken: "refresh-token",
            idToken: "header.payload.signature",
            tokenType: "Bearer",
            accessTokenExpiresAt: now.addingTimeInterval(-1),
            email: nil
        ))
        let response = try JSONSerialization.data(withJSONObject: ["error": "invalid_grant"])
        let client = OAuthClient(
            configuration: makeOAuthConfiguration(),
            httpClient: StubHTTPClient(stubs: [.init(data: response, statusCode: 400)]),
            credentialStore: store,
            clock: { [now] in now }
        )

        do {
            _ = try await client.accessToken()
            XCTFail("Expected access token refresh to fail")
        } catch {}
        XCTAssertNil(store.credentials)
    }
}
