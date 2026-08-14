import Foundation

/// An SDK diagnostic that applications may observe for integration telemetry.
///
/// Diagnostics are informational and never replace checkout lifecycle, preload,
/// or protocol events. Applications may safely ignore every diagnostic event.
public enum CheckoutDiagnosticEvent: Equatable, Sendable {
    /// An incoming checkout message was denied before protocol dispatch.
    case messageRejected(CheckoutMessageRejection)
}

/// Details about an incoming checkout message denied by the ingress policy.
///
/// The raw message body is intentionally omitted because rejected input is
/// untrusted and may contain sensitive or arbitrarily large data.
public struct CheckoutMessageRejection: Equatable, Sendable {
    /// The origin the message was received from, for example `https://example.com`.
    public let origin: String

    /// The stable reason the message was denied.
    public let reason: Reason

    package init(origin: String, reason: Reason) {
        self.origin = origin
        self.reason = reason
    }

    public enum Reason: Equatable, Sendable {
        /// The message was sent from a child frame rather than the checkout's main frame.
        case childFrame

        /// The message origin used explicit port zero while origin validation was enabled.
        case unsupportedPort

        /// The message origin did not match the effective allowlist.
        case originNotAllowed
    }
}

/// SDK-wide diagnostic events emitted by Checkout Kit.
///
/// Subscriptions are hot and do not replay earlier events. Subscribe before
/// calling `preload(checkout:)` when preload diagnostics are required. Listeners
/// are called on the main actor so diagnostics follow the same observation model
/// as checkout preload state.
public final class CheckoutDiagnostics: Sendable {
    /// A retained observation of SDK diagnostic events.
    ///
    /// Keep the subscription for as long as diagnostics should be observed.
    /// Observation stops when the subscription is cancelled or released.
    @MainActor
    public final class Subscription {
        private var listener: (@MainActor (CheckoutDiagnosticEvent) -> Void)?

        fileprivate init(listener: @escaping @MainActor (CheckoutDiagnosticEvent) -> Void) {
            self.listener = listener
        }

        /// Stops this listener from receiving future diagnostic events.
        public func cancel() {
            listener = nil
        }

        fileprivate func receive(_ event: CheckoutDiagnosticEvent) {
            listener?(event)
        }
    }

    @MainActor
    private final class WeakSubscription {
        weak var value: Subscription?

        init(_ value: Subscription) {
            self.value = value
        }
    }

    @MainActor private var subscriptions = [UUID: WeakSubscription]()

    package init() {}

    /// Subscribes a listener to future diagnostic events.
    ///
    /// Retain the returned subscription for as long as events should be observed.
    @MainActor
    public func subscribe(
        _ listener: @escaping @MainActor (CheckoutDiagnosticEvent) -> Void
    ) -> Subscription {
        subscriptions = subscriptions.filter { $0.value.value != nil }

        let subscription = Subscription(listener: listener)
        subscriptions[UUID()] = WeakSubscription(subscription)
        return subscription
    }

    @MainActor
    package func emit(_ event: CheckoutDiagnosticEvent) {
        log(event)

        // Retain a snapshot for this delivery so listeners may cancel themselves
        // or release other subscriptions without mutating the traversed collection.
        let currentSubscriptions = subscriptions.compactMap { $0.value.value }
        subscriptions = subscriptions.filter { $0.value.value != nil }
        for subscription in currentSubscriptions {
            subscription.receive(event)
        }
    }

    private func log(_ event: CheckoutDiagnosticEvent) {
        switch event {
        case let .messageRejected(rejection):
            OSLogger.shared.debug(
                "Rejected checkout message from \(rejection.origin): \(rejection.reason.logDescription)"
            )
        }
    }
}

extension CheckoutMessageRejection.Reason {
    fileprivate var logDescription: String {
        switch self {
        case .childFrame:
            return "message was sent from a child frame"
        case .unsupportedPort:
            return "origin uses unsupported port 0"
        case .originNotAllowed:
            return "origin is not in the allowlist"
        }
    }
}
