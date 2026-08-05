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
    /// Determines the appearance used when checkout is presented.
    ///
    /// By default, checkout uses the storefront's web checkout branding.
    /// Use `.app(.automatic)`, `.app(.light)`, or `.app(.dark)` to use the
    /// Checkout Kit style instead.
    public var appearance = Appearance.storefront

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

    /// Levels: debug, warn, error, none (ordered threshold, most to least verbose)
    /// Default: .warn - which emits warnings and errors
    public var logLevel: LogLevel = .warn

    /// Origins that are trusted to send incoming checkout messages, in addition
    /// to the loaded checkout origin and shop.app.
    ///
    /// The native surface is open by default: when this is empty, messages from
    /// any origin are accepted. Provide one or more origins to restrict which
    /// origins are trusted; the loaded checkout origin and shop.app are always
    /// appended. Use `"*"` to explicitly disable origin validation.
    ///
    /// Entries are origin patterns:
    /// - `"https://example.com"` — an exact origin.
    /// - `"https://*.example.com"` — any subdomain of `example.com`.
    /// - `"*"` — allow all origins (escape hatch).
    ///
    /// An optional trailing slash is accepted. Credentials, paths, queries,
    /// and fragments are not valid in configured origin patterns.
    public var allowedMessageOrigins: [String] = []

    /// Invoked when an incoming checkout message is rejected during origin
    /// validation. Defaults to logging a debug message; rejected messages are
    /// never silently dropped.
    public var onMessageRejected: (@Sendable (MessageRejection) -> Void)?
}

extension Configuration {
    public enum ColorScheme: String, CaseIterable, Sendable {
        /// Uses a light, idiomatic color scheme.
        case light
        /// Uses a dark, idiomatic color scheme.
        case dark
        /// Infers either `.light` or `.dark` based on the current `UIUserInterfaceStyle`.
        case automatic
    }
}

extension Configuration {
    public enum Appearance: Equatable, Sendable {
        /// Uses the Checkout Kit style with the provided color scheme.
        case app(ColorScheme = .automatic)
        /// Uses the storefront's web checkout branding with a light color scheme.
        case storefront
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
