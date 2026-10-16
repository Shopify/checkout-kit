import UIKit

/// The colors of the native elements surrounding checkout.
///
/// Pass a `CheckoutColors` value to a `CheckoutColorScheme` or to
/// `CheckoutAppearance.storefront(colors:)` to override the defaults. Colors that
/// can be overridden are:
/// - The web view background,
/// - The native header background and font color,
/// - The progress indicator,
/// - The close button icon and its tint,
/// - The header border shown when checkout content scrolls beneath it.
///
/// `UIColor` values can be dynamic colors; they resolve against the presented
/// checkout's trait collection.
public struct CheckoutColors: Equatable, Sendable {
    /// The background color shown behind the checkout web content.
    public var webViewBackground: UIColor

    /// The background color of the navigation bar. The default is transparent.
    public var headerBackground: UIColor

    /// The color of the checkout title shown in the navigation bar.
    public var headerFont: UIColor

    /// The color of the progress indicator shown while checkout loads.
    public var progressIndicator: UIColor

    /// A custom image for the close button. When `nil`, the system close button
    /// is used unless `closeIconTint` is set.
    public var closeIcon: UIImage?

    /// The tint of the close button. When `nil`, the system close button is used
    /// unless `closeIcon` is set.
    public var closeIconTint: UIColor?

    /// The color of the border shown under the navigation bar when checkout
    /// content scrolls beneath it. When `nil`, Checkout Kit doesn't set a border
    /// color.
    public var headerBorderColor: UIColor?

    /// Creates a set of colors, using the Checkout Kit defaults for any value
    /// that isn't provided.
    public init(
        webViewBackground: UIColor = .systemBackground,
        headerBackground: UIColor = .clear,
        headerFont: UIColor = .label,
        progressIndicator: UIColor = .init(red: 0.09, green: 0.45, blue: 0.69, alpha: 1),
        closeIcon: UIImage? = nil,
        closeIconTint: UIColor? = nil,
        headerBorderColor: UIColor? = nil
    ) {
        self.webViewBackground = webViewBackground
        self.headerBackground = headerBackground
        self.headerFont = headerFont
        self.progressIndicator = progressIndicator
        self.closeIcon = closeIcon
        self.closeIconTint = closeIconTint
        self.headerBorderColor = headerBorderColor
    }

    /// Returns a copy of these colors modified by `customizer`.
    public func customize(_ customizer: (inout CheckoutColors) -> Void) -> CheckoutColors {
        var colors = self
        customizer(&colors)
        return colors
    }
}
