@testable import CheckoutKitSwiftDemo
import ShopifyCheckoutKit
import XCTest

@MainActor
final class AppearanceOptionTests: XCTestCase {
    func testDefaultAppearancesSelectTheMatchingOption() {
        for (appearance, option) in defaultAppearances() {
            XCTAssertEqual(AppearanceOption(appearance: appearance), option)
        }
    }

    func testCustomNativeColorsDoNotChangeTheSelectedAppearanceOption() {
        let colors = Colors(webViewBackground: .red, progressIndicator: .green, closeIconTint: .blue)
        let appearances: [(CheckoutAppearance, AppearanceOption)] = [
            (.storefront(colors: colors), .storefront),
            (.app(.light(colors: colors)), .appLight),
            (.app(.dark(colors: colors)), .appDark),
            (.app(.automatic(lightColors: colors, darkColors: Colors(progressIndicator: .purple))), .appAutomatic)
        ]

        for (appearance, option) in appearances {
            XCTAssertEqual(AppearanceOption(appearance: appearance), option)
        }
    }

    func testAppearanceOptionsCreateFreshDefaultPalettes() {
        for (appearance, option) in defaultAppearances() {
            XCTAssertEqual(option.appearance, appearance)
        }
    }

    private func defaultAppearances() -> [(CheckoutAppearance, AppearanceOption)] {
        [
            (.storefront(), .storefront),
            (.app(.automatic()), .appAutomatic),
            (.app(.light()), .appLight),
            (.app(.dark()), .appDark)
        ]
    }
}
