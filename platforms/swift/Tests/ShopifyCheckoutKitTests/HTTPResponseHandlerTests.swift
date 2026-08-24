@testable import ShopifyCheckoutKit
import WebKit
import XCTest

final class HTTPResponseHandlerTests: XCTestCase {
    private let handler = HTTPResponseHandler()
    private let url = URL(string: "https://shopify1.shopify.com/checkouts/cn/123")!

    func testHandlesResponseNormallyWithoutManagedChallengeHeader() throws {
        let response = try response(headers: nil)

        XCTAssertEqual(
            handler.disposition(
                for: response,
                isForMainFrame: true,
                isBackgroundedPreload: true
            ),
            .handleNormally
        )
    }

    func testHandlesResponseNormallyForDifferentMitigationValue() throws {
        let response = try response(headers: ["cf-mitigated": "block"])

        XCTAssertEqual(
            handler.disposition(
                for: response,
                isForMainFrame: true,
                isBackgroundedPreload: true
            ),
            .handleNormally
        )
    }

    func testManagedChallengeHeaderNameAndValueMatchingIsCaseInsensitiveAndTrimsWhitespace() throws {
        let response = try response(headers: ["CF-MITIGATED": "  ChAlLeNgE\t"])

        XCTAssertEqual(
            handler.disposition(
                for: response,
                isForMainFrame: true,
                isBackgroundedPreload: true
            ),
            .discardPreload
        )
    }

    func testPresentedManagedChallengeRenders() throws {
        let response = try response(headers: ["cf-mitigated": "challenge"])

        XCTAssertEqual(
            handler.disposition(
                for: response,
                isForMainFrame: true,
                isBackgroundedPreload: false
            ),
            .render
        )
    }

    func testSubframeManagedChallengeDoesNotDiscardBackgroundedPreload() throws {
        let response = try response(headers: ["cf-mitigated": "challenge"])

        XCTAssertEqual(
            handler.disposition(
                for: response,
                isForMainFrame: false,
                isBackgroundedPreload: true
            ),
            .render
        )
    }

    private func response(headers: [String: String]?) throws -> HTTPURLResponse {
        try XCTUnwrap(
            HTTPURLResponse(
                url: url,
                statusCode: 403,
                httpVersion: nil,
                headerFields: headers
            )
        )
    }
}
