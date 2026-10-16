@testable import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class CheckoutColorSchemeTests: XCTestCase {
    func testExplicitSchemesKeepTheirPaletteRegardlessOfSystemPreference() {
        let colors = makeColors(background: .red)

        for scheme in [CheckoutColorScheme.light(colors: colors), .dark(colors: colors)] {
            XCTAssertEqual(scheme.colors(isDark: false), colors)
            XCTAssertEqual(scheme.colors(isDark: true), colors)
        }
    }

    func testAutomaticSelectsIndependentLightAndDarkPalettes() {
        let lightColors = makeColors(background: .white)
        let darkColors = makeColors(background: .black)
        let scheme = CheckoutColorScheme.automatic(lightColors: lightColors, darkColors: darkColors)

        XCTAssertEqual(scheme.colors(isDark: false), lightColors)
        XCTAssertEqual(scheme.colors(isDark: true), darkColors)
    }

    func testDefaultPalettesPreserveNativeIosColors() {
        XCTAssertEqual(CheckoutColorScheme.light().colors(isDark: false), CheckoutColors())
        XCTAssertEqual(CheckoutColorScheme.dark().colors(isDark: true), CheckoutColors())
        XCTAssertEqual(CheckoutColorScheme.automatic().colors(isDark: false), CheckoutColors())
        XCTAssertEqual(CheckoutColorScheme.automatic().colors(isDark: true), CheckoutColors())
    }

    func testIdentifiersDoNotDependOnCustomColors() {
        let colors = makeColors(background: .red)

        XCTAssertEqual(CheckoutColorScheme.light(colors: colors).id, "light")
        XCTAssertEqual(CheckoutColorScheme.dark(colors: colors).id, "dark")
        XCTAssertEqual(CheckoutColorScheme.automatic(lightColors: colors, darkColors: colors).id, "automatic")
    }

    func testCustomizePreservesExplicitSchemeAndOriginalPalette() {
        let original = CheckoutColorScheme.dark()

        let customized = original.customize {
            $0.closeIconTint = .red
        }

        XCTAssertEqual(customized.id, original.id)
        XCTAssertNil(original.colors(isDark: true).closeIconTint)
        XCTAssertEqual(customized.colors(isDark: true).closeIconTint, .red)
        XCTAssertEqual(customized.colors(isDark: true).webViewBackground, original.colors(isDark: true).webViewBackground)
    }

    func testCustomizeAppliesSharedOverridesToBothAutomaticPalettes() {
        let original = CheckoutColorScheme.automatic(
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
        let original = CheckoutColorScheme.automatic()

        let customized = original.customize(
            light: { $0.closeIconTint = .red },
            dark: { $0.closeIconTint = .blue }
        )

        XCTAssertEqual(customized.colors(isDark: false).closeIconTint, .red)
        XCTAssertEqual(customized.colors(isDark: true).closeIconTint, .blue)
        XCTAssertEqual(original, .automatic())
    }

    func testCustomizeWithSeparateClosuresAppliesOnlyTheDarkClosureToDark() {
        let customized = CheckoutColorScheme.dark().customize(
            light: { $0.closeIconTint = .red },
            dark: { $0.closeIconTint = .blue }
        )

        XCTAssertEqual(customized.colors(isDark: true).closeIconTint, .blue)
        XCTAssertEqual(customized.id, "dark")
    }

    func testCustomizeWithSeparateClosuresAppliesOnlyTheLightClosureToLight() {
        let customized = CheckoutColorScheme.light().customize(
            light: { $0.closeIconTint = .red },
            dark: { $0.closeIconTint = .blue }
        )

        XCTAssertEqual(customized.colors(isDark: false).closeIconTint, .red)
        XCTAssertEqual(customized.id, "light")
    }

    func testAutomaticColorsResolveUsingTheCurrentSystemStyle() {
        let scheme = CheckoutColorScheme.automatic(
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
        let lightColor = CheckoutColorScheme.light(colors: colors).color { $0.webViewBackground }
        let darkColor = CheckoutColorScheme.dark(colors: colors).color { $0.webViewBackground }

        XCTAssertEqual(lightColor.resolvedColor(with: UITraitCollection(userInterfaceStyle: .dark)), .red)
        XCTAssertEqual(darkColor.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)), .blue)
    }

    func testExplicitSchemesPreserveAccessibilityTraitsWhenResolvingColors() {
        let dynamicColor = UIColor { traits in
            traits.accessibilityContrast == .high ? .green : .red
        }
        let scheme = CheckoutColorScheme.dark(colors: makeColors(background: dynamicColor))
        let color = scheme.color { $0.webViewBackground }
        let traits = UITraitCollection(traitsFrom: [
            UITraitCollection(userInterfaceStyle: .light),
            UITraitCollection(accessibilityContrast: .high)
        ])

        XCTAssertEqual(color.resolvedColor(with: traits), .green)
    }

    func testOptionalColorsRemainNilWhenBothPalettesUseTheSystemDefault() {
        let scheme = CheckoutColorScheme.automatic()

        XCTAssertNil(scheme.optionalColor { $0.headerBorderColor })
    }

    func testOptionalColorsCanDifferBetweenAutomaticPalettes() throws {
        let scheme = CheckoutColorScheme.automatic(darkColors: CheckoutColors(headerBorderColor: .blue))
        let color = try XCTUnwrap(scheme.optionalColor { $0.headerBorderColor })

        XCTAssertEqual(color.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)), .clear)
        XCTAssertEqual(color.resolvedColor(with: UITraitCollection(userInterfaceStyle: .dark)), .blue)
    }

    private func makeColors(background: UIColor) -> CheckoutColors {
        CheckoutColors(webViewBackground: background)
    }
}
