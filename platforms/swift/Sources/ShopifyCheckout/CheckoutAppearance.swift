/// The appearance to use when presenting checkout.
public enum CheckoutAppearance: Equatable, Sendable {
    /// Uses an app appearance with the provided color scheme.
    ///
    /// Checkout Kit's own branding is used for the web content, and the color
    /// scheme controls both the web content and the native sheet (navigation bar,
    /// title, close button, progress indicator and web view background).
    case app(CheckoutColorScheme = .automatic())

    /// Uses the storefront's web checkout branding.
    ///
    /// Storefront checkout currently uses a light color scheme. The surrounding
    /// native sheet colors can be customized through `colors` to match the
    /// merchant's branding. The storefront's web content keeps the merchant's
    /// checkout branding.
    case storefront(colors: CheckoutColors = .init())

    var effectiveColorScheme: CheckoutColorScheme {
        switch self {
        case let .app(colorScheme):
            return colorScheme
        case let .storefront(colors):
            return .light(colors: colors)
        }
    }
}
