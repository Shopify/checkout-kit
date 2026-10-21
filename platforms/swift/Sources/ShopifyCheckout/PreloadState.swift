import Combine
import Foundation

/// Observable state of a preloaded checkout.
///
/// Preload is a performance hint, not a presentation lifecycle. Its failure never calls
/// ``CheckoutDelegate/checkoutDidFail(_:)``; a later presentation can load checkout normally.
public enum PreloadState: Equatable {
    /// No checkout is currently cached for preload.
    ///
    /// A reason is present when a previously cached checkout became unavailable through an
    /// expected lifecycle transition. The initial state has no reason.
    /// Invalidating an empty cache preserves its last state and reason.
    case idle(reason: IdleReason? = nil)

    /// The cached checkout is loading in the background.
    case loading

    /// The cached checkout is ready for a matching presentation.
    case ready

    /// The cached checkout could not be retained for the associated reason.
    ///
    /// The message contains best-effort diagnostic context. It is not a stable, machine-readable
    /// value; use ``FailureReason`` to determine how to handle the failure.
    case failed(reason: FailureReason, message: String)

    /// Reason no checkout is currently cached for preload.
    ///
    /// New reasons may be added without changing the state cases. Compare the known constants
    /// or include a `default` branch when switching over reasons to handle future values.
    public struct IdleReason: RawRepresentable, Hashable, Sendable {
        /// Stable identifier for this reason, including values introduced by future releases.
        public let rawValue: String

        /// Creates a reason from its stable identifier, preserving unknown values.
        public init(rawValue: String) {
            self.rawValue = rawValue
        }

        /// The preload was explicitly invalidated or became inapplicable.
        ///
        /// This includes configuration changes, a checkout URL or entry point mismatch,
        /// checkout completion, and clearing unusable content after presentation.
        public static let invalidated = IdleReason(rawValue: "invalidated")

        /// The cached preload passed its time-to-live.
        public static let expired = IdleReason(rawValue: "expired")
    }

    /// Reason a preload cache entry was not available.
    public enum FailureReason: Equatable {
        /// The preload received an HTTP response that prevented it from loading.
        case httpError(statusCode: Int)

        /// Preload navigation failed.
        case navigationFailed

        /// Cached web content became unavailable before the preload could be reused.
        case webContentUnavailable

        /// Checkout sent a terminal protocol error while preloading.
        case protocolError
    }
}

/// Returned by `preload(checkout:)` to expose the current preload state.
///
/// Retain the returned instance for as long as you want to observe state changes; the cache holds
/// it weakly. When presentation reuses a cached preload, this handle stops receiving updates and
/// retains its last observed state, which may be `.loading`.
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
