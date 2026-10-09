import UIKit

public enum ColorScheme: Equatable, Sendable {
    case light(colors: Colors = .init())
    case dark(colors: Colors = .init())
    case automatic(lightColors: Colors = .init(), darkColors: Colors = .init())

    public var id: String {
        switch self {
        case .light: return "light"
        case .dark: return "dark"
        case .automatic: return "automatic"
        }
    }

    public func customize(_ customizer: (inout Colors) -> Void) -> ColorScheme {
        customize(light: customizer, dark: customizer)
    }

    public func customize(
        light: (inout Colors) -> Void,
        dark: (inout Colors) -> Void
    ) -> ColorScheme {
        switch self {
        case let .light(colors):
            return .light(colors: colors.customize(light))
        case let .dark(colors):
            return .dark(colors: colors.customize(light))
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

    func color(_ value: @escaping @Sendable (Colors) -> UIColor) -> UIColor {
        UIColor { traits in
            let resolvedTraits = userInterfaceStyle == .unspecified
                ? traits
                : UITraitCollection(traitsFrom: [traits, UITraitCollection(userInterfaceStyle: userInterfaceStyle)])
            let colors = colors(isDark: resolvedTraits.userInterfaceStyle == .dark)
            return value(colors).resolvedColor(with: resolvedTraits)
        }
    }

    func optionalColor(_ value: @escaping @Sendable (Colors) -> UIColor?) -> UIColor? {
        guard value(colors(isDark: false)) != nil || value(colors(isDark: true)) != nil else {
            return nil
        }
        return color { value($0) ?? .clear }
    }

    func colors(isDark: Bool) -> Colors {
        switch self {
        case let .light(colors), let .dark(colors):
            return colors
        case let .automatic(lightColors, darkColors):
            return isDark ? darkColors : lightColors
        }
    }
}
