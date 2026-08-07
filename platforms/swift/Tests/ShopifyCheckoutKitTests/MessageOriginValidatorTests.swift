@testable import ShopifyCheckoutKit
import WebKit
import XCTest

final class MessageOriginValidatorTests: XCTestCase {
    private let checkoutURL = URL(string: "https://checkout.example.com/checkouts/cn/123")!

    // MARK: - effectiveAllowlist

    func testEmptyAllowlistAllowsAllOnNativeSurface() {
        let patterns = MessageOriginValidator.effectiveAllowlist(
            configuredOrigins: [],
            checkoutURL: checkoutURL
        )
        XCTAssertNil(patterns)
    }

    func testStarAllowlistAllowsAll() {
        let patterns = MessageOriginValidator.effectiveAllowlist(
            configuredOrigins: ["*"],
            checkoutURL: checkoutURL
        )
        XCTAssertNil(patterns)
    }

    func testAllowlistAppendsCheckoutOriginAndShopApp() {
        let patterns = MessageOriginValidator.effectiveAllowlist(
            configuredOrigins: ["https://merchant.example.com"],
            checkoutURL: checkoutURL
        )
        XCTAssertEqual(patterns, [
            "https://merchant.example.com",
            "https://checkout.example.com",
            "https://shop.app",
            "https://*.shop.app",
            "https://shop.com",
            "https://*.shop.com"
        ])
    }

    func testAllowlistWithoutCheckoutURLStillIncludesShopApp() {
        let patterns = MessageOriginValidator.effectiveAllowlist(
            configuredOrigins: ["https://merchant.example.com"],
            checkoutURL: nil
        )
        XCTAssertEqual(patterns, [
            "https://merchant.example.com",
            "https://shop.app",
            "https://*.shop.app",
            "https://shop.com",
            "https://*.shop.com"
        ])
    }

    // MARK: - matches (exact origin)

    func testExactOriginMatches() {
        let origin = MessageOrigin(scheme: "https", host: "example.com", port: nil)
        XCTAssertTrue(MessageOriginValidator.matches(pattern: "https://example.com", origin: origin))
    }

    func testExactOriginWithTrailingSlashMatches() {
        let origin = MessageOrigin(scheme: "https", host: "example.com", port: nil)
        XCTAssertTrue(MessageOriginValidator.matches(pattern: "https://example.com/", origin: origin))
    }

    func testExactOriginRejectsURLComponentsBeyondOrigin() {
        let origin = MessageOrigin(scheme: "https", host: "example.com", port: nil)
        let invalidPatterns = [
            "https://user@example.com",
            "https://example.com/path",
            "https://example.com?query=value",
            "https://example.com#fragment"
        ]

        for pattern in invalidPatterns {
            XCTAssertFalse(MessageOriginValidator.matches(pattern: pattern, origin: origin), pattern)
        }
    }

    func testExactOriginRejectsDifferentHost() {
        let origin = MessageOrigin(scheme: "https", host: "evil.com", port: nil)
        XCTAssertFalse(MessageOriginValidator.matches(pattern: "https://example.com", origin: origin))
    }

    func testExactOriginRejectsDifferentScheme() {
        let origin = MessageOrigin(scheme: "http", host: "example.com", port: nil)
        XCTAssertFalse(MessageOriginValidator.matches(pattern: "https://example.com", origin: origin))
    }

    func testExactOriginRejectsSubdomain() {
        let origin = MessageOrigin(scheme: "https", host: "sub.example.com", port: nil)
        XCTAssertFalse(MessageOriginValidator.matches(pattern: "https://example.com", origin: origin))
    }

    // MARK: - matches (default vs explicit port)

    func testDefaultPortMatchesOmittedPort() {
        let origin = MessageOrigin(scheme: "https", host: "example.com", port: 443)
        XCTAssertTrue(MessageOriginValidator.matches(pattern: "https://example.com", origin: origin))
    }

    func testNonDefaultPortMismatchIsRejected() {
        let origin = MessageOrigin(scheme: "https", host: "example.com", port: 8443)
        XCTAssertFalse(MessageOriginValidator.matches(pattern: "https://example.com", origin: origin))
    }

    func testExplicitPortMatches() {
        let origin = MessageOrigin(scheme: "https", host: "example.com", port: 8443)
        XCTAssertTrue(MessageOriginValidator.matches(pattern: "https://example.com:8443", origin: origin))
    }

    func testExplicitDefaultPortMatchesOmittedPort() {
        let origin = MessageOrigin(scheme: "https", host: "example.com", port: nil)
        XCTAssertTrue(MessageOriginValidator.matches(pattern: "https://example.com:443", origin: origin))
        XCTAssertTrue(MessageOriginValidator.matches(pattern: "https://*.example.org:443", origin: MessageOrigin(
            scheme: "https",
            host: "sub.example.org",
            port: nil
        )))
    }

    func testBracketedIPv6OriginsWithDefaultAndExplicitPorts() {
        let defaultPortOrigin = MessageOrigin(scheme: "https", host: "2001:db8::1", port: nil)
        let explicitPortOrigin = MessageOrigin(scheme: "https", host: "2001:db8::2", port: 8443)

        XCTAssertTrue(MessageOriginValidator.matches(pattern: "https://[2001:db8::1]:443", origin: defaultPortOrigin))
        XCTAssertTrue(MessageOriginValidator.matches(pattern: "https://[2001:db8::2]:8443", origin: explicitPortOrigin))
        XCTAssertFalse(MessageOriginValidator.matches(pattern: "https://[2001:db8::2]", origin: explicitPortOrigin))
        XCTAssertEqual(defaultPortOrigin.description, "https://[2001:db8::1]")
    }

    // MARK: - matches (wildcard subdomain)

    func testWildcardMatchesProperSubdomain() {
        let origin = MessageOrigin(scheme: "https", host: "a.example.com", port: nil)
        XCTAssertTrue(MessageOriginValidator.matches(pattern: "https://*.example.com", origin: origin))
    }

    func testWildcardWithTrailingSlashMatchesProperSubdomain() {
        let origin = MessageOrigin(scheme: "https", host: "a.example.com", port: nil)
        XCTAssertTrue(MessageOriginValidator.matches(pattern: "https://*.example.com/", origin: origin))
    }

    func testWildcardMatchesNestedSubdomain() {
        let origin = MessageOrigin(scheme: "https", host: "a.b.example.com", port: nil)
        XCTAssertTrue(MessageOriginValidator.matches(pattern: "https://*.example.com", origin: origin))
    }

    func testWildcardRejectsApex() {
        let origin = MessageOrigin(scheme: "https", host: "example.com", port: nil)
        XCTAssertFalse(MessageOriginValidator.matches(pattern: "https://*.example.com", origin: origin))
    }

    func testWildcardRejectsUnrelatedSuffix() {
        let origin = MessageOrigin(scheme: "https", host: "notexample.com", port: nil)
        XCTAssertFalse(MessageOriginValidator.matches(pattern: "https://*.example.com", origin: origin))
    }

    // MARK: - matches (escape hatch & invalid)

    func testStarPatternMatchesAnything() {
        let origin = MessageOrigin(scheme: "http", host: "anything.test", port: 9999)
        XCTAssertTrue(MessageOriginValidator.matches(pattern: "*", origin: origin))
    }

    func testInvalidPatternIsSkipped() {
        let origin = MessageOrigin(scheme: "https", host: "example.com", port: nil)
        XCTAssertFalse(MessageOriginValidator.matches(pattern: "not-a-valid-origin", origin: origin))
    }

    // MARK: - isAllowed

    func testIsAllowedReturnsTrueWhenPatternsNil() {
        let origin = MessageOrigin(scheme: "https", host: "evil.com", port: nil)
        XCTAssertTrue(MessageOriginValidator.isAllowed(origin: origin, patterns: nil))
    }

    func testIsAllowedMatchesAnyPattern() {
        let origin = MessageOrigin(scheme: "https", host: "sub.shop.app", port: nil)
        XCTAssertTrue(MessageOriginValidator.isAllowed(
            origin: origin,
            patterns: ["https://merchant.example.com", "https://shop.app", "https://*.shop.app"]
        ))
    }

    func testIsAllowedRejectsWhenNoPatternMatches() {
        let origin = MessageOrigin(scheme: "https", host: "evil.com", port: nil)
        XCTAssertFalse(MessageOriginValidator.isAllowed(
            origin: origin,
            patterns: ["https://merchant.example.com", "https://shop.app", "https://*.shop.app"]
        ))
    }

    // MARK: - MessageOrigin

    func testMessageOriginFromURLDropsDefaultPort() throws {
        let origin = try MessageOrigin(url: XCTUnwrap(URL(string: "https://example.com/path?x=1")))
        XCTAssertEqual(origin?.description, "https://example.com")
    }

    func testMessageOriginFromURLKeepsExplicitPort() throws {
        let origin = try MessageOrigin(url: XCTUnwrap(URL(string: "https://example.com:8443/path")))
        XCTAssertEqual(origin?.description, "https://example.com:8443")
    }
}
