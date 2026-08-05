@testable import ShopifyCheckoutKit
import XCTest

final class CheckoutErrorCodeTests: XCTestCase {
    func testAllCasesEnumeratesTheErrorCodes() {
        XCTAssertFalse(CheckoutErrorCode.allCases.isEmpty)
        XCTAssertTrue(CheckoutErrorCode.allCases.contains(.unknown))
    }

    func testEveryRawValueUsesTheLowerSnakeCaseWireFormat() {
        for code in CheckoutErrorCode.allCases {
            XCTAssertTrue(
                isLowerSnakeCase(code.rawValue),
                "\(code) sends \"\(code.rawValue)\", which Android cannot produce from an enum constant name"
            )
        }
    }

    func testEveryErrorCodeHasADistinctRawValue() {
        let rawValues = Set(CheckoutErrorCode.allCases.map(\.rawValue))

        XCTAssertEqual(rawValues.count, CheckoutErrorCode.allCases.count)
    }

    func testEveryRawValueDecodesBackToItsCase() {
        for code in CheckoutErrorCode.allCases {
            XCTAssertEqual(CheckoutErrorCode(rawValue: code.rawValue), code)
        }
    }

    private func isLowerSnakeCase(_ value: String) -> Bool {
        guard let first = value.first, first.isLowercase, first.isASCII else {
            return false
        }

        guard !value.hasSuffix("_"), !value.contains("__") else {
            return false
        }

        return value.allSatisfy { character in
            (character.isLowercase && character.isASCII) || character.isNumber || character == "_"
        }
    }
}
