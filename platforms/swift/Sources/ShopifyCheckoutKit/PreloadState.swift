import Foundation

/// Observable lifecycle state of a preloaded checkout.
public enum PreloadState: Equatable {
    case idle
    case loading
    case ready
    case expired
    case failed(reason: FailureReason)

    public enum FailureReason: Equatable {
        case httpError(statusCode: Int)
        case navigationFailed
        case keepAliveLost
    }
}

/// Returned by `preload(checkout:onStateChange:)` exposing the current preload
/// state. Because the preload cache is single-slot, every instance reflects the
/// same shared state.
///
/// Retain the returned instance for as long as you want to observe state
/// changes; the cache holds it weakly.
@MainActor
public final class CheckoutPreload {
    private let cache: PreloadCache

    init(cache: PreloadCache) {
        self.cache = cache
        cache.setObserver(self)
    }

    /// Called on the main actor whenever the preload state changes.
    public var onStateChange: ((PreloadState) -> Void)?

    public var state: PreloadState {
        cache.state
    }

    func receive(_ state: PreloadState) {
        onStateChange?(state)
    }
}
