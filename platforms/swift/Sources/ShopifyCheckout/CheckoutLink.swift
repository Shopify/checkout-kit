import Foundation

/// A link that checkout asked the host app to open.
public struct CheckoutLink: Equatable, Sendable {
    public let url: URL

    public init(url: URL) {
        self.url = url
    }
}

/// The action Checkout Kit should take for a link clicked in checkout.
public enum CheckoutLinkAction: Equatable, Sendable {
    /// Let Checkout Kit open the link using its default system behavior.
    case unhandled

    /// Do not open the link.
    case cancel

    /// The app handled the link itself.
    case handled
}
