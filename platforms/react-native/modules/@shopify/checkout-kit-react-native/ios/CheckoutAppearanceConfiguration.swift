import ShopifyCheckoutKit
import UIKit

enum CheckoutAppearanceConfiguration {
    private enum AppearanceType {
        static let app = "app"
        static let storefront = "storefront"
    }

    static func update(_ appearance: CheckoutAppearance, configuration: [AnyHashable: Any]) -> CheckoutAppearance {
        guard let appearanceConfiguration = configuration["appearance"] as? [String: Any] else {
            return appearance
        }
        return appearanceFor(appearanceConfiguration) ?? appearance
    }

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
            return .storefront(colors: Colors().customize { applyColors(colors, to: &$0) })
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
    private static func colorSchemeFor(_ value: Any?, colors: [String: Any]?) -> ColorScheme? {
        let id: String
        if let value {
            guard let value = value as? String else { return nil }
            id = value
        } else {
            id = "automatic"
        }

        switch id {
        case "light":
            return .light().customize { applyColors(colors, to: &$0) }
        case "dark":
            return .dark().customize { applyColors(colors, to: &$0) }
        case "automatic":
            return .automatic().customize(
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

    private static func applyColors(_ configuration: [String: Any]?, to colors: inout Colors) {
        if let color = parseColor(configuration?["webViewBackground"] as? String) {
            colors.webViewBackground = color
        }
        if let color = parseColor(configuration?["headerBackground"] as? String) {
            colors.headerBackground = color
        }
        if let color = parseColor(configuration?["headerFont"] as? String) {
            colors.headerFont = color
        }
        if let color = parseColor(configuration?["progressIndicator"] as? String) {
            colors.progressIndicator = color
        }
        applyOptionalColor(configuration, key: "closeIconTint") { colors.closeIconTint = $0 }
        applyOptionalColor(configuration, key: "headerBorderColor") { colors.headerBorderColor = $0 }
    }

    private static func applyOptionalColor(_ configuration: [String: Any]?, key: String, setColor: (UIColor?) -> Void) {
        if configuration?[key] is NSNull {
            setColor(nil)
        } else if let color = parseColor(configuration?[key] as? String) {
            setColor(color)
        }
    }

    private static func parseColor(_ value: String?) -> UIColor? {
        guard var hex = value?.trimmingCharacters(in: .whitespacesAndNewlines) else { return nil }
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
