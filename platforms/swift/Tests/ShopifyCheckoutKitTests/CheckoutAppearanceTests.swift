@testable import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class CheckoutAppearanceTests: XCTestCase {
    func testAppDefaultsToAutomatic() {
        XCTAssertEqual(CheckoutAppearance.app().effectiveColorScheme, .automatic())
    }

    func testAppPreservesTheConfiguredSchemeAndColors() {
        let scheme = ColorScheme.dark(colors: Colors(webViewBackground: .red))

        XCTAssertEqual(CheckoutAppearance.app(scheme).effectiveColorScheme, scheme)
    }

    func testStorefrontUsesLightNativeColors() {
        XCTAssertEqual(CheckoutAppearance.storefront().effectiveColorScheme, .light())
    }

    func testStorefrontCanCustomizeNativeColorsWithoutBecomingAnAppAppearance() {
        let colors = Colors().customize {
            $0.progressIndicator = .red
            $0.closeIconTint = .blue
        }
        let appearance = CheckoutAppearance.storefront(colors: colors)

        XCTAssertEqual(appearance.effectiveColorScheme, .light(colors: colors))
        XCTAssertNotEqual(appearance, .app(.light(colors: colors)))
    }
}
