import UIKit

public struct Colors: Equatable, Sendable {
    public var webViewBackground: UIColor
    public var headerBackground: UIColor
    public var headerFont: UIColor
    public var progressIndicator: UIColor
    public var closeIcon: UIImage?
    public var closeIconTint: UIColor?
    public var headerBorderColor: UIColor?

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

    public func customize(_ customizer: (inout Colors) -> Void) -> Colors {
        var colors = self
        customizer(&colors)
        return colors
    }
}
