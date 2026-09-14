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
    public var appearance = CheckoutAppearance.storefront()

    public var confetti = Configuration.Confetti()

    public var preloading = Configuration.Preloading()

    /// Controls anonymous diagnostic metrics sent by Checkout Kit.
    public var telemetry = Configuration.Telemetry()

    public var logger: Logger = NoOpLogger()

    public var title: String = NSLocalizedString("shopify_checkout_kit_title", value: "Checkout", comment: "The title of the checkout sheet.")

    /// Custom enum for identifying traffic from alternative platforms
    public var platform: Platform?

    /// Levels: debug, warn, error, none (ordered threshold, most to least verbose)
    /// Default: .warn - which emits warnings and errors
    public var logLevel: LogLevel = .warn

    /// Origins that are trusted to send incoming checkout messages, in addition
    /// to the loaded checkout origin and Shopify-owned shop.app and shop.com
    /// domains.
    ///
    /// The native surface is open by default: when this is empty, messages from
    /// any origin are accepted. Provide one or more origins to restrict which
    /// origins are trusted; the loaded checkout origin and Shopify-owned shop.app
    /// and shop.com domains are always appended. Use `"*"` to explicitly disable origin validation.
    ///
    /// Entries are origin patterns:
    /// - `"https://example.com"` — an exact origin.
    /// - `"https://*.example.com"` — any subdomain of `example.com`.
    /// - `"*"` — allow all origins (escape hatch).
    ///
    /// An optional trailing slash is accepted. Credentials, paths, queries,
    /// and fragments are not valid in configured origin patterns.
    public var allowedMessageOrigins: [String] = []
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

extension Configuration {
    public struct Telemetry: Sendable {
        /// Set to `false` to prevent Checkout Kit from recording or sending diagnostic metrics.
        public var enabled: Bool = true
    }
}
