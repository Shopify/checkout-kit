import Foundation
import PassKit
import ShopifyCheckoutKit

// MARK: - PaymentAuthorizationController Protocol

/// Protocol to abstract PKPaymentAuthorizationController for testing
@available(iOS 16.0, *)
@MainActor
protocol PaymentAuthorizationController {
    var delegate: (any PKPaymentAuthorizationControllerDelegate)? { get set }
    func present() async -> Bool
    func dismiss(completion: (@Sendable () -> Void)?)
}

extension PKPaymentAuthorizationController: PaymentAuthorizationController {}

@available(iOS 16.0, *)
typealias PKAuthorizationControllerFactory = @MainActor @Sendable (PKPaymentRequest) -> any PaymentAuthorizationController

@available(iOS 16.0, *)
@MainActor
class ApplePayAuthorizationDelegate: NSObject, ObservableObject {
    let configuration: ApplePayConfigurationWrapper
    let abortError = ShopifyAcceleratedCheckouts.Error.invariant(expected: "cart")
    var controller: PayController

    /// Factory for creating PaymentAuthorizationController instances - injectable for testing
    var paymentControllerFactory: PKAuthorizationControllerFactory

    /// Clock dependency for controlling time-based operations - injectable for testing
    let clock: Clock

    /// A URL that will render checkout for the cart contents
    var checkoutURL: URL?

    /// Computes URL for a given state
    func createCheckoutKitURL(for state: ApplePayState) -> URL? {
        if case let .cartSubmittedForCompletion(redirectURL) = state {
            return redirectURL
        }

        guard let checkoutURL else { return nil }
        guard case let .interrupt(reason) = state else {
            return checkoutURL
        }

        // If there's no query param to add, just return the checkout URL
        guard let queryParam = reason.queryParam else {
            return checkoutURL
        }

        // Try to append the query param, fall back to checkout URL if it fails
        return checkoutURL.appendQueryParam(name: queryParam, value: "true") ?? checkoutURL
    }

    var selectedShippingAddressID: StorefrontAPI.Types.ID?

    var pkEncoder: PKEncoder
    var pkDecoder: PKDecoder

    init(
        configuration: ApplePayConfigurationWrapper,
        controller: PayController,
        paymentControllerFactory: @escaping PKAuthorizationControllerFactory = {
            PKPaymentAuthorizationController(paymentRequest: $0)
        },
        clock: Clock = SystemClock()
    ) {
        self.configuration = configuration
        self.controller = controller
        self.paymentControllerFactory = paymentControllerFactory
        self.clock = clock

        pkEncoder = PKEncoder(configuration: configuration, cart: { controller.cart })
        pkDecoder = PKDecoder(configuration: configuration, cart: { controller.cart })
    }

    private(set) var state: ApplePayState = .idle {
        didSet {
            ShopifyAcceleratedCheckouts.logger.debug(
                "ApplePayState: \(String(describing: oldValue)) -> \(String(describing: state))"
            )
        }
    }

    private func startPaymentRequest() async throws {
        guard let cart = controller.cart else { return }
        try setCart(to: cart)
        let paymentRequest = try pkDecoder.createPaymentRequest()

        var paymentController = paymentControllerFactory(paymentRequest)
        paymentController.delegate = self
        let presented = await paymentController.present()

        guard presented else {
            try await transition(to: .reset)
            throw ShopifyAcceleratedCheckouts.Error.invariant(expected: "payment sheet")
        }

        try await transition(to: .appleSheetPresented)
    }

    func transition(to nextState: ApplePayState) async throws {
        guard state.canTransition(to: nextState) else {
            ShopifyAcceleratedCheckouts.logger.error(
                "InvalidStateTransitionError: \(String(describing: state)) -> \(String(describing: nextState))"
            )
            throw InvalidStateTransitionError(fromState: state, toState: nextState)
        }

        let previousState = state
        state = nextState

        switch state {
        case .startPaymentRequest:
            try await startPaymentRequest()

        case .reset:
            try await onReset()

        case let .presentingCheckoutKit(url):
            try await onPresentingCheckoutKit(to: url)

        // As a "terminal" state, acts as a decision point to either:
        // - present TYP (redirectUrl)
        // - present Checkout to resolve errors (checkoutUrl, possibly with interrupt query params)
        // - transition to .reset e.g. if user is dismissing/cancelling the payment sheets
        case .completed:
            try await onCompleted(previousState: previousState)

        default:
            break
        }
    }

    private func onReset() async throws {
        pkEncoder = PKEncoder(configuration: configuration, cart: { self.controller.cart })
        pkDecoder = PKDecoder(configuration: configuration, cart: { self.controller.cart })
        selectedShippingAddressID = nil
        checkoutURL = nil
        try await transition(to: .idle)
    }

    private func prepareCartForRecovery() async throws {
        let cartID = try pkEncoder.cartID.get()
        do {
            try await _Concurrency.Task.retrying(maxRetryCount: 1, clock: clock) { @MainActor in
                try await self.controller.storefront.cartRemovePersonalData(id: cartID)
            }.value
            ShopifyAcceleratedCheckouts.logger.debug("Cleared PII from cart")
        } catch {
            ShopifyAcceleratedCheckouts.logger.error("Failed to clear personal data from cart; continuing to checkout")
        }

        do {
            if let customer = configuration.common.customer,
               customer.email != nil || customer.phoneNumber != nil || customer.customerAccessToken != nil
            {
                try await controller.storefront.cartBuyerIdentityUpdate(
                    id: cartID,
                    input: .init(
                        email: customer.email,
                        phoneNumber: customer.phoneNumber,
                        customerAccessToken: customer.customerAccessToken
                    )
                )
            }
        } catch {
            ShopifyAcceleratedCheckouts.logger.error("Failed to update cart buyer identity: \(error)")
        }
    }

    private func onPresentingCheckoutKit(to url: URL?) async throws {
        guard let url else {
            try await transition(to: .terminalError(error: ShopifyAcceleratedCheckouts.Error.invariant(expected: "url")))
            return
        }
        try? await controller.present(url: url)
    }

    /// Completion is a routing state and does not necessarily mean the buyer dismissed checkout.
    private func onCompleted(previousState: ApplePayState) async throws {
        switch previousState {
        case .paymentAuthorizationFailed,
             .unexpectedError,
             .interrupt:
            // These states leave Apple Pay and recover in Checkout Kit, so the experience remains open.
            guard let url = createCheckoutKitURL(for: previousState) else {
                try await transition(to: .presentingCheckoutKit(url: nil))
                return
            }
            try await prepareCartForRecovery()
            try await transition(to: .presentingCheckoutKit(url: url))

        case let .cartSubmittedForCompletion(redirectURL):
            // Continue to the thank-you page or checkout fallback, so the experience remains open.
            try await transition(to: .presentingCheckoutKit(url: redirectURL))

        case .appleSheetPresented:
            // PassKit finishing before the state advances uniquely identifies native Apple Pay dismissal.
            controller.onCheckoutDismiss?()
            try await transition(to: .reset)

        default:
            // Setup, error, and Checkout Kit lifecycle completion do not imply dismissal.
            // Checkout Kit forwards actual dismissal through ApplePayViewController.checkoutDidDismiss().
            try await transition(to: .reset)
        }
    }

    func setCart(to cart: StorefrontAPI.Types.Cart?) throws {
        controller.cart = cart
        checkoutURL = cart?.checkoutUrl.url

        try ensureCurrencyNotChanged()
    }

    func ensureCurrencyNotChanged() throws {
        guard let initialCurrencyCode = pkDecoder.initialCurrencyCode else {
            return
        }
        let currentCurrencyCode = controller.cart?.cost.totalAmount.currencyCode

        guard initialCurrencyCode == currentCurrencyCode else {
            throw StorefrontAPI.Errors.currencyChanged
        }
    }

    @discardableResult func upsertShippingAddress(to address: StorefrontAPI.Types.Address, validate: Bool = false)
        async throws -> StorefrontAPI.Types.Cart
    {
        let cartID = try pkEncoder.cartID.get()

        let cart = try await controller.storefront.cartDeliveryAddressesReplace(
            id: cartID,
            address: address,
            validate: validate
        )

        selectedShippingAddressID = cart.delivery?.addresses.first { $0.selected }?.id

        return cart
    }
}

// MARK: - InvalidStateTransitionError

/// Error thrown when an invalid state transition is attempted
@available(iOS 16.0, *)
struct InvalidStateTransitionError: Error {
    let fromState: ApplePayState
    let toState: ApplePayState

    var localizedDescription: String {
        return
            "Invalid state transition attempted: \(String(describing: fromState)) -> \(String(describing: toState))"
    }
}
