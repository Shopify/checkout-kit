@testable import CustomerAccountsOAuth
import Foundation
import XCTest

final class TokenClientTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 2_000_000_000)

    func testExchangesAuthorizationCodeAndValidatesIDToken() async throws {
        let idToken = try makeIDToken(
            expiration: now.addingTimeInterval(3600),
            issuedAt: now.addingTimeInterval(-60)
        )
        let httpClient = try StubHTTPClient(stubs: [
            .init(data: tokenResponse(idToken: idToken), statusCode: 200)
        ])
        let client = TokenClient(
            configuration: makeOAuthConfiguration(),
            httpClient: httpClient,
            clock: { [now] in now }
        )

        let credentials = try await client.exchangeAuthorizationCode(
            "code with spaces",
            codeVerifier: "verifier/value",
            expectedNonce: "expected-nonce"
        )

        XCTAssertEqual(credentials.accessToken, "access-token")
        XCTAssertEqual(credentials.refreshToken, "refresh-token")
        XCTAssertEqual(credentials.email, "customer@example.com")
        XCTAssertEqual(credentials.accessTokenExpiresAt, now.addingTimeInterval(3600))

        let requests = await httpClient.requests
        let request = try XCTUnwrap(requests.first)
        XCTAssertEqual(request.url?.path, "/authentication/123456789/oauth/token")
        XCTAssertEqual(request.httpMethod, "POST")
        let body = try String(data: XCTUnwrap(request.httpBody), encoding: .utf8)
        XCTAssertTrue(try XCTUnwrap(body).contains("code=code%20with%20spaces"))
        XCTAssertTrue(try XCTUnwrap(body).contains("code_verifier=verifier%2Fvalue"))
    }

    func testRefreshPreservesRotatingValuesWhenOmitted() async throws {
        let existing = try existingCredentials()
        let httpClient = try StubHTTPClient(stubs: [
            .init(data: tokenResponse(refreshToken: nil, idToken: nil), statusCode: 200)
        ])
        let client = TokenClient(
            configuration: makeOAuthConfiguration(),
            httpClient: httpClient,
            clock: { [now] in now }
        )

        let refreshed = try await client.refresh(existing)

        XCTAssertEqual(refreshed.refreshToken, existing.refreshToken)
        XCTAssertEqual(refreshed.idToken, existing.idToken)
        XCTAssertEqual(refreshed.email, existing.email)
    }

    func testReturnsStructuredOAuthError() async throws {
        let errorData = try JSONSerialization.data(withJSONObject: [
            "error": "invalid_grant",
            "error_description": "The refresh token is invalid."
        ])
        let httpClient = StubHTTPClient(stubs: [.init(data: errorData, statusCode: 400)])
        let client = TokenClient(
            configuration: makeOAuthConfiguration(),
            httpClient: httpClient,
            clock: { [now] in now }
        )

        do {
            _ = try await client.refresh(existingCredentials())
            XCTFail("Expected refresh to fail")
        } catch {
            XCTAssertEqual(
                error as? OAuthError,
                .tokenRequestFailed(code: "invalid_grant", description: "The refresh token is invalid.")
            )
        }
    }

    func testMapsTransportErrorsWithoutExposingUnderlyingDetails() async throws {
        let client = TokenClient(
            configuration: makeOAuthConfiguration(),
            httpClient: FailingHTTPClient(),
            clock: { [now] in now }
        )

        do {
            _ = try await client.refresh(existingCredentials())
            XCTFail("Expected refresh to fail")
        } catch {
            XCTAssertEqual(error as? OAuthError, .networkRequestFailed)
        }
    }

    private func existingCredentials() throws -> StoredCredentials {
        try StoredCredentials(
            accessToken: "old-access-token",
            refreshToken: "old-refresh-token",
            idToken: makeIDToken(
                expiration: now.addingTimeInterval(3600),
                issuedAt: now.addingTimeInterval(-60)
            ),
            tokenType: "Bearer",
            accessTokenExpiresAt: now.addingTimeInterval(-1),
            email: "customer@example.com"
        )
    }

    private func tokenResponse(
        refreshToken: String? = "refresh-token",
        idToken: String?
    ) throws -> Data {
        var response: [String: Any] = [
            "access_token": "access-token",
            "expires_in": 3600,
            "token_type": "Bearer"
        ]
        response["refresh_token"] = refreshToken
        response["id_token"] = idToken
        return try JSONSerialization.data(withJSONObject: response)
    }
}
