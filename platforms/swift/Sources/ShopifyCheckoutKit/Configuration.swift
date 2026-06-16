import UIKit

public struct Platform: Equatable, Sendable {
    public let identifier: String
    public let version: String?

    public static let reactNative = Platform(identifier: "ReactNative", version: nil)

    public static func reactNative(version: String) -> Platform {
        Platform(identifier: "ReactNative", version: version)
    }
}

public struct Configuration: Sendable {
    /// Determines the color scheme used when checkout is presented.
    ///
    /// By default, the color scheme is determined based on the current
    /// `UITraitCollection.userInterfaceStyle`. To force a
    /// particular idiomatic color scheme, use the corresponding `.light`
    /// or `.dark` values.
    ///
    /// Alternatively you can use `.web` to match the look and feel of what your
    /// buyers will see when performing a checkout via a desktop or mobile browser.
    public var colorScheme = ColorScheme.automatic

    public var confetti = Configuration.Confetti()

    public var preloading = Configuration.Preloading()

    public var tintColor: UIColor = .init(red: 0.09, green: 0.45, blue: 0.69, alpha: 1.00)

    @available(*, renamed: "tintColor", message: "spinnerColor has been superseded by tintColor")
    public var spinnerColor: UIColor = .init(red: 0.09, green: 0.45, blue: 0.69, alpha: 1.00)

    public var backgroundColor: UIColor = .systemBackground

    public var logger: Logger = NoOpLogger()

    public var title: String = NSLocalizedString("shopify_checkout_kit_title", value: "Checkout", comment: "The title of the checkout sheet.")

    /// The tint color for the close button. If nil, uses the system default.
    public var closeButtonTintColor: UIColor?

    /// Custom enum for identifying traffic from alternative platforms
    public var platform: Platform?

    /// Levels: all, debug, error, none
    /// Default: .error - which will emit "error" and "fault" logs
    public var logLevel: LogLevel = .error
}

extension Configuration {
    public enum ColorScheme: String, CaseIterable, Sendable {
        /// Uses a light, idiomatic color scheme.
        case light
        /// Uses a dark, idiomatic color scheme.
        case dark
        /// Infers either `.light` or `.dark` based on the current `UIUserInterfaceStyle`.
        case automatic
        /// The color scheme presented to buyers using a desktop or mobile browser.
        case web = "web_default"
    }
}

extension Configuration {
    public struct Confetti: Sendable {
        public var enabled: Bool = false

        public var particles = [UIImage]()
    }
}

extension Configuration {
    public struct Preloading: Sendable {
        public var enabled: Bool = true
    }
}
