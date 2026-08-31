import Foundation
@testable import ShopifyCheckoutKit
import XCTest

final class RetryAfterTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 784_111_897)

    func testParsesDelaySeconds() {
        XCTAssertEqual(RetryAfter.seconds(from: " 120 ", now: now), 120)
    }

    func testParsesHTTPDate() {
        XCTAssertEqual(
            RetryAfter.seconds(from: "Sun, 06 Nov 1994 08:51:47 GMT", now: now),
            10
        )
    }

    func testPastHTTPDateReturnsZero() {
        XCTAssertEqual(
            RetryAfter.seconds(from: "Sun, 06 Nov 1994 08:51:27 GMT", now: now),
            0
        )
    }

    func testMissingOrInvalidValueReturnsNil() {
        XCTAssertNil(RetryAfter.seconds(from: nil, now: now))
        XCTAssertNil(RetryAfter.seconds(from: "invalid", now: now))
        XCTAssertNil(RetryAfter.seconds(from: "-1", now: now))
    }
}
