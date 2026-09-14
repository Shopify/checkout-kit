public enum CheckoutAppearance: Equatable, Sendable {
    case app(ColorScheme = .automatic())
    case storefront(colors: Colors = .init())

    var effectiveColorScheme: ColorScheme {
        switch self {
        case let .app(colorScheme):
            return colorScheme
        case let .storefront(colors):
            return .light(colors: colors)
        }
    }
}
