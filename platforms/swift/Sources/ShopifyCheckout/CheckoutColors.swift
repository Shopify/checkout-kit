import UIKit

/// The colors of the native elements surrounding checkout.
///
/// Pass a `CheckoutColors` value to a `CheckoutColorScheme` or to
/// `CheckoutAppearance.storefront(colors:)` to override the defaults. Colors that
/// can be overridden are:
/// - The web view background color (`webViewBackgroundColor`),
/// - The native header background color (`headerBackgroundColor`) and header
///   title color (`headerTitleColor`),
/// - The progress indicator color (`progressIndicatorColor`),
/// - The close button icon (`closeIcon`) and its tint color (`closeIconTintColor`),
/// - The header border color (`headerBorderColor`) shown when checkout content
///   scrolls beneath it.
///
/// `UIColor` values can be dynamic colors; they resolve against the presented
/// checkout's trait collection.
public struct CheckoutColors: Equatable, Sendable {
    /// The background color shown behind the checkout web content.
    public var webViewBackgroundColor: UIColor

    /// The background color of the navigation bar. The default is transparent.
    public var headerBackgroundColor: UIColor

    /// The color of the checkout title shown in the navigation bar.
    public var headerTitleColor: UIColor

    /// The color of the progress indicator shown while checkout loads.
    public var progressIndicatorColor: UIColor

    /// A custom image for the close button. When `nil`, the system close button
    /// is used unless `closeIconTintColor` is set.
    public var closeIcon: UIImage?

    /// The tint color of the close button. When `nil`, the system close button
    /// is used unless `closeIcon` is set.
    public var closeIconTintColor: UIColor?

    /// The color of the border shown under the navigation bar when checkout
    /// content scrolls beneath it. When `nil`, Checkout Kit doesn't set a border
    /// color.
    public var headerBorderColor: UIColor?

    /// Creates a set of colors, using the Checkout Kit defaults for any value
    /// that isn't provided.
    public init(
        webViewBackgroundColor: UIColor = .systemBackground,
        headerBackgroundColor: UIColor = .clear,
        headerTitleColor: UIColor = .label,
        progressIndicatorColor: UIColor = CheckoutColors.defaultProgressIndicatorColor,
        closeIcon: UIImage? = nil,
        closeIconTintColor: UIColor? = nil,
        headerBorderColor: UIColor? = nil
    ) {
        self.webViewBackgroundColor = webViewBackgroundColor
        self.headerBackgroundColor = headerBackgroundColor
        self.headerTitleColor = headerTitleColor
        self.progressIndicatorColor = progressIndicatorColor
        self.closeIcon = closeIcon
        self.closeIconTintColor = closeIconTintColor
        self.headerBorderColor = headerBorderColor
    }

    /// Returns a copy of these colors modified by `customizer`.
    public func customize(_ customizer: (inout CheckoutColors) -> Void) -> CheckoutColors {
        var colors = self
        customizer(&colors)
        return colors
    }

    /// The default progress indicator color: #1773B0 in light mode and #1E8CC8 in
    /// dark mode. One shared instance keeps default colors equal to each other.
    @usableFromInline
    static let defaultProgressIndicatorColor = UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 30 / 255, green: 140 / 255, blue: 200 / 255, alpha: 1)
            : UIColor(red: 23 / 255, green: 115 / 255, blue: 176 / 255, alpha: 1)
    }
}
