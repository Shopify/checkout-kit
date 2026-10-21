@testable import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class CheckoutColorsTests: XCTestCase {
    func testDefaultsPreserveNativeIosColorsAndControls() {
        let colors = CheckoutColors()

        XCTAssertEqual(colors.webViewBackgroundColor, .systemBackground)
        XCTAssertEqual(colors.headerBackgroundColor, .clear)
        XCTAssertEqual(colors.headerTitleColor, .label)
        let lightComponents = components(of: colors.progressIndicatorColor, style: .light)
        let unspecifiedComponents = components(of: colors.progressIndicatorColor, style: .unspecified)
        let darkComponents = components(of: colors.progressIndicatorColor, style: .dark)
        assertComponents(lightComponents, equal: [0x17, 0x73, 0xB0])
        assertComponents(unspecifiedComponents, equal: [0x17, 0x73, 0xB0])
        assertComponents(darkComponents, equal: [0x1E, 0x8C, 0xC8])
        XCTAssertNil(colors.closeIcon)
        XCTAssertNil(colors.closeIconTintColor)
        XCTAssertNil(colors.headerBorderColor)
    }

    func testDefaultColorsAreEqual() {
        XCTAssertEqual(CheckoutColors(), CheckoutColors())
    }

    private func components(of color: UIColor, style: UIUserInterfaceStyle) -> [CGFloat] {
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        XCTAssertTrue(color.resolvedColor(with: UITraitCollection(userInterfaceStyle: style)).getRed(&red, green: &green, blue: &blue, alpha: &alpha))
        return [red, green, blue, alpha]
    }

    private func assertComponents(_ actual: [CGFloat], equal hex: [CGFloat], file: StaticString = #filePath, line: UInt = #line) {
        for (actualComponent, expectedComponent) in zip(actual, hex.map { $0 / 255 } + [1]) {
            XCTAssertEqual(actualComponent, expectedComponent, accuracy: 1.0 / 255.0, file: file, line: line)
        }
    }
}
