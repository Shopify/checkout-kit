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
}
