@testable import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class CheckoutAppearanceTests: XCTestCase {
    func testAppDefaultsToAutomatic() {
        XCTAssertEqual(CheckoutAppearance.app().effectiveColorScheme, .automatic())
    }

    func testStorefrontUsesLightNativeColors() {
        XCTAssertEqual(CheckoutAppearance.storefront().effectiveColorScheme, .light())
    }

    func testStorefrontAppliesCustomNativeColorsToTheLightScheme() {
        let colors = CheckoutColors(progressIndicatorColor: .red, closeIconTintColor: .blue)

        XCTAssertEqual(CheckoutAppearance.storefront(colors: colors).effectiveColorScheme, .light(colors: colors))
    }
}
