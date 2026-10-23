import ShopifyCheckoutKit
import UIKit

/// Maps the JavaScript `appearance` configuration to a native `CheckoutAppearance`.
enum CheckoutAppearanceConfiguration {
    private enum AppearanceType {
        static let app = "app"
        static let storefront = "storefront"
    }

    /// Returns the appearance described by `configuration["appearance"]`, built from the native defaults.
    ///
    /// Returns `appearance` unchanged when the key is missing or invalid.
    static func update(_ appearance: CheckoutAppearance, configuration: [AnyHashable: Any]) -> CheckoutAppearance {
        guard let appearanceConfiguration = configuration["appearance"] as? [String: Any] else {
            return appearance
        }
        return appearanceFor(appearanceConfiguration) ?? appearance
    }

    /// The JavaScript representation of `appearance`, without colors.
    static func appearanceResultFor(_ appearance: CheckoutAppearance) -> [String: String] {
        switch appearance {
        case let .app(colorScheme):
            return ["type": AppearanceType.app, "colorScheme": colorScheme.id]
        case .storefront:
            return ["type": AppearanceType.storefront]
        }
    }

    private static func appearanceFor(_ configuration: [String: Any]) -> CheckoutAppearance? {
        let colorsConfiguration = configuration["colors"] as? [String: Any]
        let colors = colorsConfiguration?["ios"] as? [String: Any]

        switch configuration["type"] as? String {
        case AppearanceType.storefront:
            return .storefront(colors: CheckoutColors().customize { applyColors(colors, to: &$0) })
        case AppearanceType.app:
            guard let colorScheme = colorSchemeFor(configuration["colorScheme"], colors: colors) else {
                return nil
            }
            return .app(colorScheme)
        default:
            return nil
        }
    }

    /// An omitted `colorScheme` defaults to automatic, matching `CheckoutAppearance.app()`.
    private static func colorSchemeFor(_ value: Any?, colors: [String: Any]?) -> CheckoutColorScheme? {
        let id: String
        if let value {
            guard let value = value as? String else { return nil }
            id = value
        } else {
            id = "automatic"
        }

        switch id {
        case "light":
            return CheckoutColorScheme.light().customize { applyColors(colors, to: &$0) }
        case "dark":
            return CheckoutColorScheme.dark().customize { applyColors(colors, to: &$0) }
        case "automatic":
            return CheckoutColorScheme.automatic().customize(
                light: {
                    applyColors(colors, to: &$0)
                    applyColors(colors?["light"] as? [String: Any], to: &$0)
                },
                dark: {
                    applyColors(colors, to: &$0)
                    applyColors(colors?["dark"] as? [String: Any], to: &$0)
                }
            )
        default:
            return nil
        }
    }

    private static func applyColors(_ configuration: [String: Any]?, to colors: inout CheckoutColors) {
        if let color = parseColor(configuration?["webViewBackgroundColor"]) {
            colors.webViewBackgroundColor = color
        }
        if let color = parseColor(configuration?["headerBackgroundColor"]) {
            colors.headerBackgroundColor = color
        }
        if let color = parseColor(configuration?["headerTitleColor"]) {
            colors.headerTitleColor = color
        }
        if let color = parseColor(configuration?["progressIndicatorColor"]) {
            colors.progressIndicatorColor = color
        }
        applyOptionalColor(configuration, key: "closeIconTintColor") { colors.closeIconTintColor = $0 }
        applyOptionalColor(configuration, key: "headerBorderColor") { colors.headerBorderColor = $0 }
    }

    /// React Native drops `null` properties, so JavaScript lists each `null` color in `resetColors`.
    /// A listed color resets to its default of `nil`.
    private static func applyOptionalColor(_ configuration: [String: Any]?, key: String, setColor: (UIColor?) -> Void) {
        if let resetColors = configuration?["resetColors"] as? [String], resetColors.contains(key) {
            setColor(nil)
        } else if let color = parseColor(configuration?[key]) {
            setColor(color)
        }
    }

    /// Parses `RRGGBB` or `AARRGGBB`, with an optional leading `#` and surrounding whitespace.
    private static func parseColor(_ value: Any?) -> UIColor? {
        guard var hex = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) else { return nil }
        if hex.hasPrefix("#") {
            hex.removeFirst()
        }
        guard hex.count == 6 || hex.count == 8,
              hex.allSatisfy(\.isHexDigit),
              let value = UInt32(hex, radix: 16)
        else { return nil }

        let argb = hex.count == 6 ? value | 0xFF00_0000 : value
        return UIColor(
            red: CGFloat((argb >> 16) & 0xFF) / 255,
            green: CGFloat((argb >> 8) & 0xFF) / 255,
            blue: CGFloat(argb & 0xFF) / 255,
            alpha: CGFloat((argb >> 24) & 0xFF) / 255
        )
    }
}
