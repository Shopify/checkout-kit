import Combine
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

/// Returned by `preload(checkout:)` to expose the current preload state for the
/// checkout it was created for.
///
/// Retain the returned instance for as long as you want to observe state
/// changes; the cache holds it weakly.
@MainActor
public final class CheckoutPreload: ObservableObject {
    /// The latest observed preload state.
    private let key: PreloadKey
    @Published public private(set) var state: PreloadState = .idle

    init(key: PreloadKey, cache: PreloadCache) {
        self.key = key
        cache.register(self, for: key)
    }

    /// Called immediately with the current state and whenever it changes.
    public var onStateChange: ((PreloadState) -> Void)? {
        didSet {
            onStateChange?(state)
        }
    }

    func receive(_ state: PreloadState) {
        self.state = state
        onStateChange?(state)
    }
}
