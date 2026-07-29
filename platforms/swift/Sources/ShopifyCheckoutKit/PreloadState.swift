import Combine
import Foundation

/// Observable state of a preloaded checkout.
///
/// Preload is a performance hint, not a presentation lifecycle. Its failure never calls
/// ``CheckoutDelegate/checkoutDidFail(error:)``; a later presentation can load checkout normally.
public enum PreloadState: Equatable {
    /// No checkout is currently cached for preload.
    case idle

    /// The cached checkout is loading in the background.
    case loading

    /// The cached checkout is ready for a matching presentation.
    case ready

    /// The cached checkout passed its time-to-live and was evicted.
    case expired

    /// The cached checkout could not be retained for the associated reason.
    case failed(reason: FailureReason)

    /// Reason a preload cache entry was not available.
    public enum FailureReason: Equatable {
        /// The preload received an HTTP response that prevented it from loading.
        case httpError(statusCode: Int)

        /// Preload navigation failed.
        case navigationFailed

        /// The background WebView was no longer available, including process termination.
        case keepAliveLost

        /// Checkout sent a terminal protocol error while preloading.
        case protocolError
    }
}

/// Returned by `preload(checkout:)` to expose the current preload state.
///
/// Retain the returned instance for as long as you want to observe state changes; the cache holds
/// it weakly. Preload state is independent of presentation lifecycle callbacks.
@MainActor
public final class CheckoutPreload: ObservableObject {
    /// The latest observed preload state.
    @Published public private(set) var state: PreloadState

    init(cache: PreloadCache) {
        state = cache.state
        cache.setObserver(self)
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
