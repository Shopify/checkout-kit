@testable import ShopifyCheckoutKit
import UIKit
import XCTest

class ConfigurationTests: XCTestCase {
    override func setUp() {
        super.setUp()
        // Reset configuration to defaults
        ShopifyCheckoutKit.configuration = Configuration()
    }

    func testCloseButtonTintColorDefaultsToNil() {
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }

    func testCloseButtonTintColorCanBeSet() {
        let customColor = UIColor.red
        ShopifyCheckoutKit.configuration.closeButtonTintColor = customColor

        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, customColor)
    }

    func testCloseButtonTintColorCanBeReset() {
        ShopifyCheckoutKit.configuration.closeButtonTintColor = .blue
        XCTAssertNotNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)

        ShopifyCheckoutKit.configuration.closeButtonTintColor = nil
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }
}
