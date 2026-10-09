@testable import RNShopifyCheckoutKit
import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
final class CheckoutAppearanceConfigurationTests: XCTestCase {
    private var module: RCTShopifyCheckoutKit!
    private var originalConfiguration: Configuration!

    private var customAppearance: CheckoutAppearance {
        .app(.dark(colors: Colors(progressIndicator: .red, closeIconTint: .blue)))
    }

    override func setUp() async throws {
        try await super.setUp()
        originalConfiguration = ShopifyCheckoutKit.configuration
        ShopifyCheckoutKit.configure {
            $0.appearance = .storefront()
            $0.preloading.enabled = true
            $0.logLevel = .warn
        }
        module = makeModule()
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configure { configuration in configuration = originalConfiguration }
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
            module.setConfig(configuration)

            XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, appearance)
        }
    }

    func testAppWithoutColorSchemeDefaultsToAutomatic() {
        module.setConfig(makeConfiguration(type: "app"))

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.automatic()))
    }

    func testAppWithoutColorSchemeAppliesAutomaticPalettes() {
        module.setConfig(makeConfiguration(type: "app", colors: [
            "progressIndicator": "#FF0000",
            "dark": ["progressIndicator": "#0000FF"]
        ]))

        let expected = CheckoutAppearance.app(.automatic(
            lightColors: Colors(progressIndicator: makeColor(rgb: 0xFF0000)),
            darkColors: Colors(progressIndicator: makeColor(rgb: 0x0000FF))
        ))
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, expected)
    }

    func testModuleInitializationPreservesHostAppearance() {
        ShopifyCheckoutKit.configure { configuration in configuration.appearance = customAppearance }

        module = makeModule()

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, customAppearance)
    }

    func testExplicitSchemesApplySharedColorFields() {
        let appearances: [(String, CheckoutAppearance)] = [
            ("light", .app(.light(colors: makeExpectedColors()))),
            ("dark", .app(.dark(colors: makeExpectedColors())))
        ]

        for (colorScheme, appearance) in appearances {
            module.setConfig(makeConfiguration(type: "app", colorScheme: colorScheme, colors: makeColorsConfiguration()))

            XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, appearance)
        }
    }

    func testStorefrontAppliesSharedColorFields() {
        module.setConfig(makeConfiguration(type: "storefront", colors: makeColorsConfiguration()))

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .storefront(colors: makeExpectedColors()))
    }

    func testAutomaticAppliesIndependentPalettes() {
        module.setConfig(makeConfiguration(type: "app", colorScheme: "automatic", colors: [
            "light": ["webViewBackground": "#FFFFFF", "progressIndicator": "#FF0000"],
            "dark": ["webViewBackground": "#000000", "progressIndicator": "#0000FF"]
        ]))

        XCTAssertEqual(colors(isDark: false).webViewBackground, makeColor(rgb: 0xFFFFFF))
        XCTAssertEqual(colors(isDark: false).progressIndicator, makeColor(rgb: 0xFF0000))
        XCTAssertEqual(colors(isDark: true).webViewBackground, makeColor(rgb: 0x000000))
        XCTAssertEqual(colors(isDark: true).progressIndicator, makeColor(rgb: 0x0000FF))
    }

    func testAutomaticPreservesDefaultsForAnOmittedPalette() {
        module.setConfig(makeConfiguration(type: "app", colorScheme: "automatic", colors: [
            "light": ["webViewBackground": "#FF0000"]
        ]))

        XCTAssertEqual(colors(isDark: false).webViewBackground, makeColor(rgb: 0xFF0000))
        XCTAssertEqual(colors(isDark: false).progressIndicator, Colors().progressIndicator)
        XCTAssertEqual(colors(isDark: true), Colors())
    }

    func testAutomaticAppliesSharedOverridesToBothPalettes() {
        module.setConfig(makeConfiguration(type: "app", colorScheme: "automatic", colors: ["progressIndicator": "#FF0000"]))

        for isDark in [false, true] {
            XCTAssertEqual(colors(isDark: isDark).progressIndicator, makeColor(rgb: 0xFF0000))
            XCTAssertEqual(colors(isDark: isDark).webViewBackground, Colors().webViewBackground)
        }
    }

    func testAutomaticPaletteOverridesTakePrecedenceOverSharedOverrides() {
        module.setConfig(makeConfiguration(type: "app", colorScheme: "automatic", colors: [
            "progressIndicator": "#FF0000",
            "light": ["progressIndicator": "#00FF00"]
        ]))

        XCTAssertEqual(colors(isDark: false).progressIndicator, makeColor(rgb: 0x00FF00))
        XCTAssertEqual(colors(isDark: true).progressIndicator, makeColor(rgb: 0xFF0000))
    }

    func testNullOptionalColorsDoNotDiscardValidOverrides() {
        module.setConfig(makeConfiguration(type: "app", colorScheme: "light", colors: [
            "webViewBackground": "#0000FF",
            "closeIconTint": NSNull(),
            "headerBorderColor": NSNull()
        ]))

        XCTAssertEqual(colors().webViewBackground, makeColor(rgb: 0x0000FF))
        XCTAssertNil(colors().closeIconTint)
        XCTAssertEqual(colors().headerBorderColor, Colors().headerBorderColor)
    }

    func testAutomaticPaletteCanResetSharedOptionalOverrides() {
        module.setConfig(makeConfiguration(type: "app", colorScheme: "automatic", colors: [
            "closeIconTint": "#FF0000",
            "headerBorderColor": "#FF0000",
            "light": ["closeIconTint": NSNull(), "headerBorderColor": NSNull()]
        ]))

        XCTAssertNil(colors(isDark: false).closeIconTint)
        XCTAssertEqual(colors(isDark: false).headerBorderColor, Colors().headerBorderColor)
        XCTAssertEqual(colors(isDark: true).closeIconTint, makeColor(rgb: 0xFF0000))
        XCTAssertEqual(colors(isDark: true).headerBorderColor, makeColor(rgb: 0xFF0000))
    }

    func testUnrelatedConfigurationUpdatesPreserveAppearance() {
        ShopifyCheckoutKit.configure { configuration in configuration.appearance = customAppearance }

        module.setConfig(["logLevel": "debug", "preloading": false, "title": "Custom Checkout"])

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, customAppearance)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, .debug)
        XCTAssertFalse(ShopifyCheckoutKit.configuration.preloading.enabled)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, "Custom Checkout")
    }

    func testEmptyConfigurationPreservesAppearance() {
        ShopifyCheckoutKit.configure { configuration in configuration.appearance = customAppearance }

        module.setConfig([:])

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, customAppearance)
    }

    func testReplacingTheAppearanceRestoresNativeDefaults() {
        ShopifyCheckoutKit.configure { configuration in configuration.appearance = customAppearance }

        module.setConfig(makeConfiguration(type: "app", colorScheme: "automatic"))

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.automatic()))
    }

    func testNullColorsRestoreNativeDefaults() {
        ShopifyCheckoutKit.configure { configuration in configuration.appearance = customAppearance }

        module.setConfig(["appearance": ["type": "app", "colorScheme": "dark", "colors": NSNull()]])

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.dark()))
    }

    func testEmptyColorsRestoreNativeDefaults() {
        ShopifyCheckoutKit.configure { configuration in configuration.appearance = customAppearance }

        module.setConfig(["appearance": ["type": "app", "colorScheme": "dark", "colors": [String: Any]()]])

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.dark()))
    }

    func testColorsForTheOtherPlatformRestoreNativeDefaults() {
        ShopifyCheckoutKit.configure { configuration in configuration.appearance = customAppearance }

        module.setConfig(["appearance": [
            "type": "app",
            "colorScheme": "dark",
            "colors": ["android": ["progressIndicator": "#FF0000"]]
        ]])

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.dark()))
    }

    func testInvalidAppearancesPreserveTheCurrentAppearance() {
        ShopifyCheckoutKit.configure { configuration in configuration.appearance = customAppearance }

        for appearance: Any in [NSNull(), "storefront", 42, ["light"]] {
            module.setConfig(["appearance": appearance])

            XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, customAppearance)
        }
    }

    func testInvalidAppearanceTypesPreserveTheCurrentAppearance() {
        ShopifyCheckoutKit.configure { configuration in configuration.appearance = customAppearance }
        let appearances: [[String: Any]] = [
            ["colorScheme": "light"],
            ["type": NSNull(), "colorScheme": "light"],
            ["type": 42, "colorScheme": "light"],
            ["type": "light"],
            ["type": "automatic"],
            ["type": "sepia"]
        ]

        for appearance in appearances {
            module.setConfig(["appearance": appearance])

            XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, customAppearance)
        }
    }

    func testInvalidColorSchemesPreserveTheCurrentAppearance() {
        ShopifyCheckoutKit.configure { configuration in configuration.appearance = customAppearance }

        for colorScheme: Any in ["storefront", "sepia", NSNull(), 42] {
            module.setConfig(["appearance": [
                "type": "app",
                "colorScheme": colorScheme,
                "colors": ["ios": makeColorsConfiguration()]
            ]])

            XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, customAppearance)
        }
    }

    func testInvalidColorsDoNotDiscardValidOverrides() {
        let invalidColors: [Any] = ["", "red", "#12345", "#123456789", "##112233", "#GG0000", 42, NSNull()]
        for invalidColor in invalidColors {
            module.setConfig(makeConfiguration(type: "app", colorScheme: "light", colors: [
                "webViewBackground": "#AABBCC",
                "progressIndicator": invalidColor,
                "headerFont": 42
            ]))

            XCTAssertEqual(colors().webViewBackground, makeColor(rgb: 0xAABBCC))
            XCTAssertEqual(colors().progressIndicator, Colors().progressIndicator)
            XCTAssertEqual(colors().headerFont, Colors().headerFont)
        }
    }

    func testHexColorsSupportOpacityAndSurroundingWhitespace() {
        module.setConfig(makeConfiguration(type: "app", colorScheme: "light", colors: [
            "webViewBackground": "  #80112233  ",
            "progressIndicator": "aabbcc"
        ]))

        XCTAssertEqual(colors().webViewBackground, makeColor(rgb: 0x112233, alpha: 0x80))
        XCTAssertEqual(colors().progressIndicator, makeColor(rgb: 0xAABBCC))
    }

    func testAndroidOnlyColorFieldsDoNotChangeIosColors() {
        module.setConfig(makeConfiguration(type: "app", colorScheme: "light", colors: ["dragHandleColor": "#FF0000"]))

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.light()))
    }

    func testGetConfigReturnsOnlyJsonCompatibleCommonSettings() {
        ShopifyCheckoutKit.configure { configuration in configuration.appearance = customAppearance }

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
            ShopifyCheckoutKit.configure { configuration in configuration.appearance = appearance }

            XCTAssertEqual(module.getConfig()["appearance"] as? [String: String], expected)
        }
    }

    private func makeModule() -> RCTShopifyCheckoutKit {
        RCTShopifyCheckoutKit()
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
            "webViewBackground": "#112233",
            "headerBackground": "#445566",
            "headerFont": "#778899",
            "progressIndicator": "#AABBCC",
            "closeIconTint": "#DDEEFF",
            "headerBorderColor": "#123456"
        ]
    }

    private func makeExpectedColors() -> Colors {
        Colors(
            webViewBackground: makeColor(rgb: 0x112233),
            headerBackground: makeColor(rgb: 0x445566),
            headerFont: makeColor(rgb: 0x778899),
            progressIndicator: makeColor(rgb: 0xAABBCC),
            closeIconTint: makeColor(rgb: 0xDDEEFF),
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

    private func colors(isDark: Bool = false) -> Colors {
        switch ShopifyCheckoutKit.configuration.appearance {
        case let .storefront(colors), let .app(.light(colors)), let .app(.dark(colors)):
            return colors
        case let .app(.automatic(lightColors, darkColors)):
            return isDark ? darkColors : lightColors
        }
    }
}
