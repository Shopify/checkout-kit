import Foundation
import WebKit

/// Controls the cookie/website-data store backing the checkout web view.
///
/// By default checkout uses the process-wide persistent store shared by every
/// `WKWebView` (`.shared`). Provide a different case to isolate checkout
/// cookies, seed a known session, or hand the SDK a store you fully control.
public enum CheckoutCookieStore: @unchecked Sendable {
    /// The default persistent store shared across the app's web views.
    case shared

    /// An in-memory store that is discarded when checkout is dismissed.
    case ephemeral

    /// A store you construct and own. Pre-seed it (or, on iOS 17+, build it
    /// with `WKWebsiteDataStore(forIdentifier:)`) before handing it over.
    case custom(WKWebsiteDataStore)

    /// An isolated, in-memory store seeded with the given cookies before the
    /// first checkout request is made.
    case seeded([HTTPCookie])

    @MainActor
    func makeDataStore() -> WKWebsiteDataStore {
        switch self {
        case .shared:
            return .default()
        case .ephemeral, .seeded:
            return .nonPersistent()
        case let .custom(store):
            return store
        }
    }

    var cookiesToSeed: [HTTPCookie] {
        guard case let .seeded(cookies) = self else { return [] }
        return cookies
    }

    /// A coarse identity used to decide whether a configuration change should
    /// invalidate a preloaded web view built with a previous store.
    var invalidationToken: String {
        switch self {
        case .shared:
            return "shared"
        case .ephemeral:
            return "ephemeral"
        case let .custom(store):
            return "custom-\(ObjectIdentifier(store).hashValue)"
        case let .seeded(cookies):
            return "seeded-" + cookies.map { "\($0.domain)\($0.name)" }.sorted().joined(separator: "|")
        }
    }
}
