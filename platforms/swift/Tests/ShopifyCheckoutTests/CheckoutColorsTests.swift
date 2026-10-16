@testable import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class CheckoutColorsTests: XCTestCase {
    func testDefaultsPreserveNativeIosColorsAndControls() {
        let colors = CheckoutColors()

        XCTAssertEqual(colors.webViewBackground, .systemBackground)
        XCTAssertEqual(colors.headerBackground, .clear)
        XCTAssertEqual(colors.headerFont, .label)
        XCTAssertEqual(colors.progressIndicator, UIColor(red: 0.09, green: 0.45, blue: 0.69, alpha: 1))
        XCTAssertNil(colors.closeIcon)
        XCTAssertNil(colors.closeIconTint)
        XCTAssertNil(colors.headerBorderColor)
    }
}
