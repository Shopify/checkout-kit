@testable import ShopifyCheckoutKit
import UIKit
import XCTest

class ConfigurationTests: XCTestCase {
    override func setUp() {
        super.setUp()
        resetConfigurationState()
    }

    override func tearDown() {
        resetConfigurationState()
        super.tearDown()
    }

    private func resetConfigurationState() {
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

    func testColorSchemeCanBeSetDirectly() {
        ShopifyCheckoutKit.configuration.colorScheme = .light

        XCTAssertEqual(ShopifyCheckoutKit.configuration.colorScheme, .light)
    }

    func testConfigureCanBatchConfigurationChanges() {
        ShopifyCheckoutKit.configure {
            $0.colorScheme = .dark
            $0.closeButtonTintColor = .blue
        }

        XCTAssertEqual(ShopifyCheckoutKit.configuration.colorScheme, .dark)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, .blue)
    }

    func testDirectConfigurationMutationUpdatesLogger() {
        ShopifyCheckoutKit.configuration.logLevel = .all

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, .all)
        XCTAssertEqual(OSLogger.shared.logLevel, .all)
    }
}
