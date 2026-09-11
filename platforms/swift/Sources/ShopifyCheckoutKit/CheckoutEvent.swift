import Foundation

/// The payload delivered when checkout starts.
public struct CheckoutStartEvent: Equatable, Sendable {
    public let checkout: Checkout

    public init(checkout: Checkout) {
        self.checkout = checkout
    }
}

/// The payload delivered when the buyer-visible checkout state changes.
public struct CheckoutUpdateEvent: Equatable, Sendable {
    public let checkout: Checkout

    public init(checkout: Checkout) {
        self.checkout = checkout
    }
}

/// The payload delivered when checkout completes.
public struct CheckoutCompleteEvent: Equatable, Sendable {
    public let checkout: Checkout

    public init(checkout: Checkout) {
        self.checkout = checkout
    }
}

/// The payload delivered when checkout cannot continue.
public struct CheckoutFailureEvent {
    public let error: CheckoutError

    public init(error: CheckoutError) {
        self.error = error
    }
}
