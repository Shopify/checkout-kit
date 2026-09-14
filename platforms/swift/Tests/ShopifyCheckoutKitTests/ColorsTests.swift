@testable import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class ColorsTests: XCTestCase {
    func testDefaultsPreserveNativeIosColorsAndControls() {
        let colors = Colors()

        XCTAssertEqual(colors.webViewBackground, .systemBackground)
        XCTAssertEqual(colors.headerBackground, .clear)
        XCTAssertEqual(colors.headerFont, .label)
        XCTAssertEqual(colors.progressIndicator, UIColor(red: 0.09, green: 0.45, blue: 0.69, alpha: 1))
        XCTAssertNil(colors.closeIcon)
        XCTAssertNil(colors.closeIconTint)
        XCTAssertNil(colors.headerBorderColor)
    }

    func testCustomizeReturnsACopyAndPreservesUnspecifiedColors() {
        let original = Colors()

        let customized = original.customize {
            $0.webViewBackground = .red
        }

        XCTAssertEqual(original.webViewBackground, .systemBackground)
        XCTAssertEqual(customized.webViewBackground, .red)
        XCTAssertEqual(customized.headerBackground, original.headerBackground)
        XCTAssertEqual(customized.headerFont, original.headerFont)
        XCTAssertEqual(customized.progressIndicator, original.progressIndicator)
    }

    func testCustomizeCanRestoreSystemCloseButtonAndBorderDefaults() {
        let original = Colors(
            closeIcon: UIImage(systemName: "multiply"),
            closeIconTint: .red,
            headerBorderColor: .blue
        )

        let customized = original.customize {
            $0.closeIcon = nil
            $0.closeIconTint = nil
            $0.headerBorderColor = nil
        }

        XCTAssertNotNil(original.closeIcon)
        XCTAssertEqual(original.closeIconTint, .red)
        XCTAssertNil(customized.closeIcon)
        XCTAssertNil(customized.closeIconTint)
        XCTAssertNil(customized.headerBorderColor)
    }

    func testColorsPreserveUIKitDynamicColorsAndTransparency() {
        let lightColor = UIColor.red.withAlphaComponent(0.4)
        let darkColor = UIColor.blue.withAlphaComponent(0.7)
        let dynamicColor = UIColor { traits in
            traits.userInterfaceStyle == .dark ? darkColor : lightColor
        }
        let colors = Colors(webViewBackground: dynamicColor)

        XCTAssertEqual(colors.webViewBackground, dynamicColor)
        XCTAssertEqual(colors.webViewBackground.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)), lightColor)
        XCTAssertEqual(colors.webViewBackground.resolvedColor(with: UITraitCollection(userInterfaceStyle: .dark)), darkColor)
    }
}
