import UIKit

/// The color scheme to use when presenting checkout.
///
/// This determines the color of both the web content displayed in the web view and
/// the native elements around it, such as the header background and header font.
public enum CheckoutColorScheme: Equatable, Sendable {
    /// Always show checkout in a light color scheme, using the provided colors for
    /// native elements.
    case light(colors: CheckoutColors = .init())

    /// Always show checkout in a dark color scheme, using the provided colors for
    /// native elements.
    case dark(colors: CheckoutColors = .init())

    /// Follow the device's light or dark appearance, switching live while
    /// checkout is presented.
    ///
    /// - Parameters:
    ///   - lightColors: The colors to use when the device is in light mode.
    ///   - darkColors: The colors to use when the device is in dark mode.
    case automatic(lightColors: CheckoutColors = .init(), darkColors: CheckoutColors = .init())

    /// A stable identifier for the scheme: `"light"`, `"dark"` or `"automatic"`.
    public var id: String {
        switch self {
        case .light: return "light"
        case .dark: return "dark"
        case .automatic: return "automatic"
        }
    }

    /// Returns a copy of this color scheme with `customizer` applied to its colors.
    ///
    /// For `.automatic`, `customizer` is applied to both the light and dark colors.
    public func customize(_ customizer: (inout CheckoutColors) -> Void) -> CheckoutColorScheme {
        customize(light: customizer, dark: customizer)
    }

    /// Returns a copy of this color scheme with separate customizations for light
    /// and dark colors.
    ///
    /// - `.light`: only `light` is applied.
    /// - `.dark`: only `dark` is applied.
    /// - `.automatic`: `light` is applied to the light colors and `dark` to the dark colors.
    ///
    /// - Parameters:
    ///   - light: Customizes the colors used in light mode.
    ///   - dark: Customizes the colors used in dark mode.
    public func customize(
        light: (inout CheckoutColors) -> Void,
        dark: (inout CheckoutColors) -> Void
    ) -> CheckoutColorScheme {
        switch self {
        case let .light(colors):
            return .light(colors: colors.customize(light))
        case let .dark(colors):
            return .dark(colors: colors.customize(dark))
        case let .automatic(lightColors, darkColors):
            return .automatic(
                lightColors: lightColors.customize(light),
                darkColors: darkColors.customize(dark)
            )
        }
    }

    var userInterfaceStyle: UIUserInterfaceStyle {
        switch self {
        case .light: return .light
        case .dark: return .dark
        case .automatic: return .unspecified
        }
    }

    func color(_ value: @escaping @Sendable (CheckoutColors) -> UIColor) -> UIColor {
        UIColor { traits in
            let resolvedTraits = userInterfaceStyle == .unspecified
                ? traits
                : UITraitCollection(traitsFrom: [traits, UITraitCollection(userInterfaceStyle: userInterfaceStyle)])
            let colors = colors(isDark: resolvedTraits.userInterfaceStyle == .dark)
            return value(colors).resolvedColor(with: resolvedTraits)
        }
    }

    func optionalColor(_ value: @escaping @Sendable (CheckoutColors) -> UIColor?) -> UIColor? {
        guard value(colors(isDark: false)) != nil || value(colors(isDark: true)) != nil else {
            return nil
        }
        return color { value($0) ?? .clear }
    }

    func colors(isDark: Bool) -> CheckoutColors {
        switch self {
        case let .light(colors), let .dark(colors):
            return colors
        case let .automatic(lightColors, darkColors):
            return isDark ? darkColors : lightColors
        }
    }
}
