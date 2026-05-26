import Foundation

public struct CheckoutURL {
    public let url: URL

    init(from url: URL) {
        self.url = url
    }

    public func isMultipassURL() -> Bool {
        return url.absoluteString.contains("multipass")
    }

    public func isBlank() -> Bool {
        return url.scheme == "about" || url.absoluteString == "about:blank"
    }

    public func isDeepLink() -> Bool {
        guard let scheme = url.scheme, !isBlank() else {
            return false
        }

        return !["http", "https"].contains(scheme)
    }
}
