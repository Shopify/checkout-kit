@testable import RNShopifyCheckoutKit
import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
final class CheckoutAppearanceConfigurationTests: XCTestCase {
    private var module: RCTShopifyCheckoutKit!
    private var originalConfiguration: Configuration!

    private var customAppearance: CheckoutAppearance {
        .app(.dark(colors: CheckoutColors(progressIndicatorColor: .red, closeIconTintColor: .blue)))
    }

    override func setUp() async throws {
        try await super.setUp()
        originalConfiguration = ShopifyCheckout.configuration
        ShopifyCheckout.configure {
            $0.appearance = .storefront()
            $0.preloading.enabled = true
            $0.logLevel = .warn
        }
        module = RCTShopifyCheckoutKit()
    }

    override func tearDown() async throws {
        ShopifyCheckout.configure { configuration in configuration = originalConfiguration }
        module = nil
        try await super.tearDown()
    }

    func testEveryAppearanceMapsToTheNativeAppearance() {
        let appearances: [([AnyHashable: Any], CheckoutAppearance)] = [
            (makeConfiguration(type: "app", colorScheme: "light"), .app(.light())),
            (makeConfiguration(type: "app", colorScheme: "dark"), .app(.dark())),
            (makeConfiguration(type: "app", colorScheme: "automatic"), .app(.automatic())),
            (makeConfiguration(type: "storefront"), .storefront())
        ]

        for (configuration, appearance) in appearances {
            module.applyConfig(configuration)

            XCTAssertEqual(ShopifyCheckout.configuration.appearance, appearance)
        }
    }

    func testAppWithoutColorSchemeDefaultsToAutomatic() {
        module.applyConfig(makeConfiguration(type: "app"))

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .app(.automatic()))
    }

    func testAppWithoutColorSchemeAppliesAutomaticPalettes() {
        module.applyConfig(makeConfiguration(type: "app", colors: [
            "progressIndicatorColor": "#FF0000",
            "dark": ["progressIndicatorColor": "#0000FF"]
        ]))

        let expected = CheckoutAppearance.app(.automatic(
            lightColors: CheckoutColors(progressIndicatorColor: makeColor(rgb: 0xFF0000)),
            darkColors: CheckoutColors(progressIndicatorColor: makeColor(rgb: 0x0000FF))
        ))
        XCTAssertEqual(ShopifyCheckout.configuration.appearance, expected)
    }

    func testModuleInitializationPreservesHostAppearance() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        module = RCTShopifyCheckoutKit()

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, customAppearance)
    }

    func testExplicitSchemesApplySharedColorFields() {
        let appearances: [(String, CheckoutAppearance)] = [
            ("light", .app(.light(colors: makeExpectedColors()))),
            ("dark", .app(.dark(colors: makeExpectedColors())))
        ]

        for (colorScheme, appearance) in appearances {
            module.applyConfig(makeConfiguration(type: "app", colorScheme: colorScheme, colors: makeColorsConfiguration()))

            XCTAssertEqual(ShopifyCheckout.configuration.appearance, appearance)
        }
    }

    func testStorefrontAppliesSharedColorFields() {
        module.applyConfig(makeConfiguration(type: "storefront", colors: makeColorsConfiguration()))

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .storefront(colors: makeExpectedColors()))
    }

    func testAutomaticAppliesIndependentPalettes() {
        module.applyConfig(makeConfiguration(type: "app", colorScheme: "automatic", colors: [
            "light": ["webViewBackgroundColor": "#FFFFFF", "progressIndicatorColor": "#FF0000"],
            "dark": ["webViewBackgroundColor": "#000000", "progressIndicatorColor": "#0000FF"]
        ]))

        XCTAssertEqual(colors(isDark: false).webViewBackgroundColor, makeColor(rgb: 0xFFFFFF))
        XCTAssertEqual(colors(isDark: false).progressIndicatorColor, makeColor(rgb: 0xFF0000))
        XCTAssertEqual(colors(isDark: true).webViewBackgroundColor, makeColor(rgb: 0x000000))
        XCTAssertEqual(colors(isDark: true).progressIndicatorColor, makeColor(rgb: 0x0000FF))
    }

    func testAutomaticPreservesDefaultsForAnOmittedPalette() {
        module.applyConfig(makeConfiguration(type: "app", colorScheme: "automatic", colors: [
            "light": ["webViewBackgroundColor": "#FF0000"]
        ]))

        XCTAssertEqual(colors(isDark: false).webViewBackgroundColor, makeColor(rgb: 0xFF0000))
        XCTAssertEqual(colors(isDark: false).progressIndicatorColor, CheckoutColors().progressIndicatorColor)
        XCTAssertEqual(colors(isDark: true), CheckoutColors())
    }

    func testAutomaticAppliesSharedOverridesToBothPalettes() {
        module.applyConfig(makeConfiguration(type: "app", colorScheme: "automatic", colors: ["progressIndicatorColor": "#FF0000"]))

        for isDark in [false, true] {
            XCTAssertEqual(colors(isDark: isDark).progressIndicatorColor, makeColor(rgb: 0xFF0000))
            XCTAssertEqual(colors(isDark: isDark).webViewBackgroundColor, CheckoutColors().webViewBackgroundColor)
        }
    }

    func testAutomaticPaletteOverridesTakePrecedenceOverSharedOverrides() {
        module.applyConfig(makeConfiguration(type: "app", colorScheme: "automatic", colors: [
            "progressIndicatorColor": "#FF0000",
            "light": ["progressIndicatorColor": "#00FF00"]
        ]))

        XCTAssertEqual(colors(isDark: false).progressIndicatorColor, makeColor(rgb: 0x00FF00))
        XCTAssertEqual(colors(isDark: true).progressIndicatorColor, makeColor(rgb: 0xFF0000))
    }

    func testResetColorsDoNotDiscardValidOverrides() {
        module.applyConfig(makeConfiguration(type: "app", colorScheme: "light", colors: [
            "webViewBackgroundColor": "#0000FF",
            "resetColors": ["closeIconTintColor", "headerBorderColor"]
        ]))

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .app(.light(colors: CheckoutColors(
            webViewBackgroundColor: makeColor(rgb: 0x0000FF)
        ))))
    }

    func testAutomaticPaletteCanResetSharedOptionalOverrides() {
        module.applyConfig(makeConfiguration(type: "app", colorScheme: "automatic", colors: [
            "closeIconTintColor": "#FF0000",
            "headerBorderColor": "#FF0000",
            "light": ["resetColors": ["closeIconTintColor", "headerBorderColor"]]
        ]))

        XCTAssertNil(colors(isDark: false).closeIconTintColor)
        XCTAssertNil(colors(isDark: false).headerBorderColor)
        XCTAssertEqual(colors(isDark: true).closeIconTintColor, makeColor(rgb: 0xFF0000))
        XCTAssertEqual(colors(isDark: true).headerBorderColor, makeColor(rgb: 0xFF0000))
    }

    func testUnrelatedConfigurationUpdatesPreserveAppearance() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        module.applyConfig(["logLevel": "debug", "preloading": false, "title": "Custom Checkout"])

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, customAppearance)
        XCTAssertEqual(ShopifyCheckout.configuration.logLevel, .debug)
        XCTAssertFalse(ShopifyCheckout.configuration.preloading.enabled)
        XCTAssertEqual(ShopifyCheckout.configuration.title, "Custom Checkout")
    }

    func testEmptyConfigurationPreservesAppearance() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        module.applyConfig([:])

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, customAppearance)
    }

    func testRemovedTopLevelColorKeysAreIgnored() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        module.applyConfig([
            "colorScheme": "light",
            "colors": ["ios": ["progressIndicatorColor": "#00FF00", "tintColor": "#00FF00"]]
        ])

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, customAppearance)
    }

    func testReplacingTheAppearanceRestoresNativeDefaults() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        module.applyConfig(makeConfiguration(type: "app", colorScheme: "automatic"))

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .app(.automatic()))
    }

    func testADifferentAppearanceWithoutColorsDropsEarlierColors() {
        module.applyConfig(makeConfiguration(type: "app", colorScheme: "dark", colors: makeColorsConfiguration()))
        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .app(.dark(colors: makeExpectedColors())))

        module.applyConfig(makeConfiguration(type: "app", colorScheme: "light"))

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .app(.light()))
    }

    func testTheSameAppearanceWithoutColorsDropsEarlierColors() {
        let appearances: [((type: String, colorScheme: String?), CheckoutAppearance)] = [
            (("app", "light"), .app(.light())),
            (("app", "dark"), .app(.dark())),
            (("app", "automatic"), .app(.automatic())),
            (("storefront", nil), .storefront())
        ]

        for ((type, colorScheme), defaultAppearance) in appearances {
            module.applyConfig(makeConfiguration(type: type, colorScheme: colorScheme, colors: makeColorsConfiguration()))
            XCTAssertNotEqual(ShopifyCheckout.configuration.appearance, defaultAppearance)

            module.applyConfig(makeConfiguration(type: type, colorScheme: colorScheme))

            XCTAssertEqual(ShopifyCheckout.configuration.appearance, defaultAppearance)
        }
    }

    func testStorefrontAfterAutomaticPalettesDropsEarlierColors() {
        module.applyConfig(makeConfiguration(type: "app", colorScheme: "automatic", colors: [
            "progressIndicatorColor": "#FF0000",
            "closeIconTintColor": "#FF0000",
            "light": ["webViewBackgroundColor": "#FFFFFF"],
            "dark": ["webViewBackgroundColor": "#000000", "headerBorderColor": "#00FF00"]
        ]))
        XCTAssertNotEqual(ShopifyCheckout.configuration.appearance, .app(.automatic()))

        module.applyConfig(makeConfiguration(type: "storefront"))

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .storefront())
    }

    func testNullColorsRestoreNativeDefaults() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        module.applyConfig(["appearance": ["type": "app", "colorScheme": "dark", "colors": NSNull()]])

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .app(.dark()))
    }

    func testNullIosColorsRestoreNativeDefaults() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        module.applyConfig(["appearance": ["type": "app", "colorScheme": "dark", "colors": ["ios": NSNull()]]])

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .app(.dark()))
    }

    func testEmptyColorsRestoreNativeDefaults() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        module.applyConfig(["appearance": ["type": "app", "colorScheme": "dark", "colors": [String: Any]()]])

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .app(.dark()))
    }

    func testColorsForTheOtherPlatformRestoreNativeDefaults() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        module.applyConfig(["appearance": [
            "type": "app",
            "colorScheme": "dark",
            "colors": ["android": ["progressIndicatorColor": "#FF0000"]]
        ]])

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .app(.dark()))
    }

    func testInvalidAppearancesPreserveTheCurrentAppearance() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        for appearance: Any in [NSNull(), "storefront", 42, ["light"]] {
            module.applyConfig(["appearance": appearance])

            XCTAssertEqual(ShopifyCheckout.configuration.appearance, customAppearance)
        }
    }

    func testInvalidAppearanceTypesPreserveTheCurrentAppearance() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }
        let appearances: [[String: Any]] = [
            ["colorScheme": "light"],
            ["type": NSNull(), "colorScheme": "light"],
            ["type": 42, "colorScheme": "light"],
            ["type": "light"],
            ["type": "automatic"],
            ["type": "sepia"]
        ]

        for appearance in appearances {
            module.applyConfig(["appearance": appearance])

            XCTAssertEqual(ShopifyCheckout.configuration.appearance, customAppearance)
        }
    }

    func testInvalidColorSchemesPreserveTheCurrentAppearance() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        for colorScheme: Any in ["storefront", "sepia", NSNull(), 42] {
            module.applyConfig(["appearance": [
                "type": "app",
                "colorScheme": colorScheme,
                "colors": ["ios": makeColorsConfiguration()]
            ]])

            XCTAssertEqual(ShopifyCheckout.configuration.appearance, customAppearance)
        }
    }

    func testInvalidColorsDoNotDiscardValidOverrides() {
        let invalidColors: [Any] = ["", "red", "#12345", "#123456789", "##112233", "#GG0000", "0x112233", 42, NSNull()]
        for invalidColor in invalidColors {
            module.applyConfig(makeConfiguration(type: "app", colorScheme: "light", colors: [
                "webViewBackgroundColor": "#AABBCC",
                "progressIndicatorColor": invalidColor,
                "headerTitleColor": 42
            ]))

            XCTAssertEqual(colors().webViewBackgroundColor, makeColor(rgb: 0xAABBCC))
            XCTAssertEqual(colors().progressIndicatorColor, CheckoutColors().progressIndicatorColor)
            XCTAssertEqual(colors().headerTitleColor, CheckoutColors().headerTitleColor)
        }
    }

    func testInvalidOptionalColorsKeepTheirDefaults() {
        module.applyConfig(makeConfiguration(type: "app", colorScheme: "light", colors: [
            "closeIconTintColor": "red",
            "headerBorderColor": 42
        ]))

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .app(.light()))
    }

    func testHexColorsSupportOpacityAndSurroundingWhitespace() {
        module.applyConfig(makeConfiguration(type: "app", colorScheme: "light", colors: [
            "webViewBackgroundColor": "  #80112233  ",
            "progressIndicatorColor": "aabbcc"
        ]))

        XCTAssertEqual(colors().webViewBackgroundColor, makeColor(rgb: 0x112233, alpha: 0x80))
        XCTAssertEqual(colors().progressIndicatorColor, makeColor(rgb: 0xAABBCC))
    }

    func testAndroidOnlyColorFieldsDoNotChangeIosColors() {
        module.applyConfig(makeConfiguration(type: "app", colorScheme: "light", colors: ["dragHandleColor": "#FF0000"]))

        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .app(.light()))
    }

    func testGetConfigReturnsOnlyJsonCompatibleCommonSettings() {
        ShopifyCheckout.configure { configuration in configuration.appearance = customAppearance }

        let configuration = module.getConfig()

        XCTAssertTrue(JSONSerialization.isValidJSONObject(configuration))
        XCTAssertEqual(Set(configuration.allKeys.compactMap { $0 as? String }), [
            "title", "appearance", "preloading", "telemetry", "allowedMessageOrigins", "logLevel"
        ])
    }

    func testGetConfigReturnsTheAppearanceWithoutColors() {
        let appearances: [(CheckoutAppearance, [String: String])] = [
            (.app(.light(colors: makeExpectedColors())), ["type": "app", "colorScheme": "light"]),
            (.app(.dark(colors: makeExpectedColors())), ["type": "app", "colorScheme": "dark"]),
            (
                .app(.automatic(lightColors: makeExpectedColors(), darkColors: makeExpectedColors())),
                ["type": "app", "colorScheme": "automatic"]
            ),
            (.storefront(colors: makeExpectedColors()), ["type": "storefront"])
        ]

        for (appearance, expected) in appearances {
            ShopifyCheckout.configure { configuration in configuration.appearance = appearance }

            XCTAssertEqual(module.getConfig()["appearance"] as? [String: String], expected)
        }
    }

    private func makeConfiguration(
        type: String,
        colorScheme: String? = nil,
        colors: [String: Any]? = nil
    ) -> [AnyHashable: Any] {
        var appearance: [String: Any] = ["type": type]
        if let colorScheme {
            appearance["colorScheme"] = colorScheme
        }
        if let colors {
            appearance["colors"] = ["ios": colors]
        }
        return ["appearance": appearance]
    }

    private func makeColorsConfiguration() -> [String: Any] {
        [
            "webViewBackgroundColor": "#112233",
            "headerBackgroundColor": "#445566",
            "headerTitleColor": "#778899",
            "progressIndicatorColor": "#AABBCC",
            "closeIconTintColor": "#DDEEFF",
            "headerBorderColor": "#123456"
        ]
    }

    private func makeExpectedColors() -> CheckoutColors {
        CheckoutColors(
            webViewBackgroundColor: makeColor(rgb: 0x112233),
            headerBackgroundColor: makeColor(rgb: 0x445566),
            headerTitleColor: makeColor(rgb: 0x778899),
            progressIndicatorColor: makeColor(rgb: 0xAABBCC),
            closeIconTintColor: makeColor(rgb: 0xDDEEFF),
            headerBorderColor: makeColor(rgb: 0x123456)
        )
    }

    private func makeColor(rgb: Int, alpha: Int = 0xFF) -> UIColor {
        UIColor(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: CGFloat(alpha) / 255
        )
    }

    private func colors(isDark: Bool = false) -> CheckoutColors {
        switch ShopifyCheckout.configuration.appearance {
        case let .storefront(colors), let .app(.light(colors)), let .app(.dark(colors)):
            return colors
        case let .app(.automatic(lightColors, darkColors)):
            return isDark ? darkColors : lightColors
        }
    }
}
