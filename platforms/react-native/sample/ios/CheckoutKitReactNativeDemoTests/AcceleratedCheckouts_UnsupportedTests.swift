import Foundation
@testable import RNShopifyCheckoutKit
import XCTest

class AcceleratedCheckouts_UnsupportedTests: XCTestCase {
    private var module: RCTShopifyCheckoutKit!
    private var manager: RCTAcceleratedCheckoutButtonsManager!

    override func setUp() {
        super.setUp()
        module = RCTShopifyCheckoutKit()
        manager = RCTAcceleratedCheckoutButtonsManager()
        manager.supported = false
    }

    override func tearDown() {
        module = nil
        manager = nil
        super.tearDown()
    }

    func testManagerReturnsFallbackViewOnPreIOS16() throws {
        let view = manager.view()
        XCTAssertEqual(String(describing: type(of: view!)), "UIView")
    }

    func testAvailabilityAPIsReturnFalseOnPreIOS16() throws {
        XCTAssertEqual(module.isAcceleratedCheckoutAvailable().boolValue, false)
        XCTAssertEqual(module.isApplePayAvailable().boolValue, false)
    }
}
