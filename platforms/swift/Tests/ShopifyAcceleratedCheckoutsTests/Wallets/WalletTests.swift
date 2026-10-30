@testable import ShopifyAcceleratedCheckouts
import XCTest

final class WalletTests: XCTestCase {
    func test_rawValue_preservesExistingWalletNames() {
        XCTAssertEqual(Wallet.applePay.rawValue, "applePay")
        XCTAssertEqual(Wallet.shopPay.rawValue, "shopPay")
        XCTAssertEqual(Wallet(rawValue: "applePay"), .applePay)
        XCTAssertEqual(Wallet(rawValue: "shopPay"), .shopPay)
    }

    func test_rawValue_rejectsUnknownWalletNames() {
        for name in ["", "unknown", "apple_pay", "shop_pay", "ApplePay"] {
            XCTAssertNil(Wallet(rawValue: name))
        }
    }

    func test_hashable_preservesWalletIdentity() {
        XCTAssertEqual(Set([Wallet.applePay, .shopPay, .applePay]).count, 2)
    }

    func test_walletButtonHeight_resolve_defaultsAndClampsHeight() {
        let testCases: [(input: CGFloat?, expected: CGFloat)] = [
            (nil, 48), (0, 48), (-5, 48), (.nan, 48), (.infinity, 48),
            (10, 30), (30, 30), (56, 56), (64, 64), (90, 64)
        ]

        for testCase in testCases {
            XCTAssertEqual(
                WalletButtonHeight.resolve(testCase.input),
                testCase.expected,
                "\(String(describing: testCase.input))"
            )
        }
    }
}
