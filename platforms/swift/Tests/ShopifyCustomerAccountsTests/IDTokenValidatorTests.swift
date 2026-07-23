@testable import CustomerAccountsOAuth
import Foundation
import XCTest

final class IDTokenValidatorTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 2_000_000_000)

    func testValidatesExpectedClaimsAndReturnsEmail() throws {
        let token = try makeToken()
        let validator = IDTokenValidator(configuration: makeOAuthConfiguration(), clock: { [now] in now })

        XCTAssertEqual(try validator.validate(token, expectedNonce: "expected-nonce"), "customer@example.com")
    }

    func testAcceptsNumericSubjectFromShopify() throws {
        let token = try makeIDToken(
            subject: 1_234_567_890,
            expiration: now.addingTimeInterval(3600),
            issuedAt: now.addingTimeInterval(-60)
        )
        let validator = IDTokenValidator(configuration: makeOAuthConfiguration(), clock: { [now] in now })

        XCTAssertEqual(try validator.validate(token, expectedNonce: "expected-nonce"), "customer@example.com")
    }

    func testRejectsWrongNonce() throws {
        let validator = IDTokenValidator(configuration: makeOAuthConfiguration(), clock: { [now] in now })

        XCTAssertThrowsError(try validator.validate(makeToken(), expectedNonce: "other-nonce")) {
            XCTAssertEqual($0 as? OAuthError, .invalidNonce)
        }
    }

    func testRejectsWrongIssuer() throws {
        let validator = IDTokenValidator(configuration: makeOAuthConfiguration(), clock: { [now] in now })
        let token = try makeToken(issuer: "https://example.com")

        XCTAssertThrowsError(try validator.validate(token, expectedNonce: "expected-nonce")) {
            XCTAssertEqual($0 as? OAuthError, .invalidIssuer)
        }
    }

    func testRejectsWrongAudience() throws {
        let validator = IDTokenValidator(configuration: makeOAuthConfiguration(), clock: { [now] in now })
        let token = try makeToken(audience: "another-client")

        XCTAssertThrowsError(try validator.validate(token, expectedNonce: "expected-nonce")) {
            XCTAssertEqual($0 as? OAuthError, .invalidAudience)
        }
    }

    func testRejectsExpiredToken() throws {
        let validator = IDTokenValidator(configuration: makeOAuthConfiguration(), clock: { [now] in now })
        let token = try makeIDToken(
            expiration: now.addingTimeInterval(-120),
            issuedAt: now.addingTimeInterval(-600)
        )

        XCTAssertThrowsError(try validator.validate(token, expectedNonce: "expected-nonce")) {
            XCTAssertEqual($0 as? OAuthError, .expiredIDToken)
        }
    }

    func testRequiresAuthorizedPartyForMultipleAudiences() throws {
        let validator = IDTokenValidator(configuration: makeOAuthConfiguration(), clock: { [now] in now })
        let token = try makeToken(audience: ["test-client", "another-client"])

        XCTAssertThrowsError(try validator.validate(token, expectedNonce: "expected-nonce")) {
            XCTAssertEqual($0 as? OAuthError, .invalidAudience)
        }
    }

    private func makeToken(
        issuer: String = "https://shopify.com/authentication/123456789",
        audience: Any = "test-client"
    ) throws -> String {
        try makeIDToken(
            issuer: issuer,
            audience: audience,
            expiration: now.addingTimeInterval(3600),
            issuedAt: now.addingTimeInterval(-60)
        )
    }
}
