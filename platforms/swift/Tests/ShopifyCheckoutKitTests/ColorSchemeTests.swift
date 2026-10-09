@testable import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class ColorSchemeTests: XCTestCase {
    func testExplicitSchemesKeepTheirPaletteRegardlessOfSystemPreference() {
        let colors = makeColors(background: .red)

        for scheme in [ColorScheme.light(colors: colors), .dark(colors: colors)] {
            XCTAssertEqual(scheme.colors(isDark: false), colors)
            XCTAssertEqual(scheme.colors(isDark: true), colors)
        }
    }

    func testAutomaticSelectsIndependentLightAndDarkPalettes() {
        let lightColors = makeColors(background: .white)
        let darkColors = makeColors(background: .black)
        let scheme = ColorScheme.automatic(lightColors: lightColors, darkColors: darkColors)

        XCTAssertEqual(scheme.colors(isDark: false), lightColors)
        XCTAssertEqual(scheme.colors(isDark: true), darkColors)
    }

    func testDefaultPalettesPreserveNativeIosColors() {
        XCTAssertEqual(ColorScheme.light().colors(isDark: false), Colors())
        XCTAssertEqual(ColorScheme.dark().colors(isDark: true), Colors())
        XCTAssertEqual(ColorScheme.automatic().colors(isDark: false), Colors())
        XCTAssertEqual(ColorScheme.automatic().colors(isDark: true), Colors())
    }

    func testIdentifiersDoNotDependOnCustomColors() {
        let colors = makeColors(background: .red)

        XCTAssertEqual(ColorScheme.light(colors: colors).id, "light")
        XCTAssertEqual(ColorScheme.dark(colors: colors).id, "dark")
        XCTAssertEqual(ColorScheme.automatic(lightColors: colors, darkColors: colors).id, "automatic")
    }

    func testCustomizePreservesExplicitSchemeAndOriginalPalette() {
        let original = ColorScheme.dark()

        let customized = original.customize {
            $0.closeIconTint = .red
        }

        XCTAssertEqual(customized.id, original.id)
        XCTAssertNil(original.colors(isDark: true).closeIconTint)
        XCTAssertEqual(customized.colors(isDark: true).closeIconTint, .red)
        XCTAssertEqual(customized.colors(isDark: true).webViewBackground, original.colors(isDark: true).webViewBackground)
    }

    func testCustomizeAppliesSharedOverridesToBothAutomaticPalettes() {
        let original = ColorScheme.automatic(
            lightColors: makeColors(background: .white),
            darkColors: makeColors(background: .black)
        )

        let customized = original.customize {
            $0.closeIconTint = .red
        }

        XCTAssertNil(original.colors(isDark: false).closeIconTint)
        XCTAssertNil(original.colors(isDark: true).closeIconTint)
        XCTAssertEqual(customized.colors(isDark: false).closeIconTint, .red)
        XCTAssertEqual(customized.colors(isDark: true).closeIconTint, .red)
        XCTAssertEqual(customized.colors(isDark: false).webViewBackground, .white)
        XCTAssertEqual(customized.colors(isDark: true).webViewBackground, .black)
    }

    func testCustomizeSupportsIndependentAutomaticOverrides() {
        let original = ColorScheme.automatic()

        let customized = original.customize(
            light: { $0.closeIconTint = .red },
            dark: { $0.closeIconTint = .blue }
        )

        XCTAssertEqual(customized.colors(isDark: false).closeIconTint, .red)
        XCTAssertEqual(customized.colors(isDark: true).closeIconTint, .blue)
        XCTAssertEqual(original, .automatic())
    }

    func testAutomaticColorsResolveUsingTheCurrentSystemStyle() {
        let scheme = ColorScheme.automatic(
            lightColors: makeColors(background: .red),
            darkColors: makeColors(background: .blue)
        )
        let color = scheme.color { $0.webViewBackground }

        XCTAssertEqual(color.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)), .red)
        XCTAssertEqual(color.resolvedColor(with: UITraitCollection(userInterfaceStyle: .dark)), .blue)
    }

    func testExplicitSchemesResolveDynamicColorsUsingTheirOwnStyle() {
        let dynamicColor = UIColor { traits in
            traits.userInterfaceStyle == .dark ? .blue : .red
        }
        let colors = makeColors(background: dynamicColor)
        let lightColor = ColorScheme.light(colors: colors).color { $0.webViewBackground }
        let darkColor = ColorScheme.dark(colors: colors).color { $0.webViewBackground }

        XCTAssertEqual(lightColor.resolvedColor(with: UITraitCollection(userInterfaceStyle: .dark)), .red)
        XCTAssertEqual(darkColor.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)), .blue)
    }

    func testExplicitSchemesPreserveAccessibilityTraitsWhenResolvingColors() {
        let dynamicColor = UIColor { traits in
            traits.accessibilityContrast == .high ? .green : .red
        }
        let scheme = ColorScheme.dark(colors: makeColors(background: dynamicColor))
        let color = scheme.color { $0.webViewBackground }
        let traits = UITraitCollection(traitsFrom: [
            UITraitCollection(userInterfaceStyle: .light),
            UITraitCollection(accessibilityContrast: .high)
        ])

        XCTAssertEqual(color.resolvedColor(with: traits), .green)
    }

    func testOptionalColorsRemainNilWhenBothPalettesUseTheSystemDefault() {
        let scheme = ColorScheme.automatic()

        XCTAssertNil(scheme.optionalColor { $0.headerBorderColor })
    }

    func testOptionalColorsCanDifferBetweenAutomaticPalettes() throws {
        let scheme = ColorScheme.automatic(darkColors: Colors(headerBorderColor: .blue))
        let color = try XCTUnwrap(scheme.optionalColor { $0.headerBorderColor })

        XCTAssertEqual(color.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)), .clear)
        XCTAssertEqual(color.resolvedColor(with: UITraitCollection(userInterfaceStyle: .dark)), .blue)
    }

    private func makeColors(background: UIColor) -> Colors {
        Colors(webViewBackground: background)
    }
}
