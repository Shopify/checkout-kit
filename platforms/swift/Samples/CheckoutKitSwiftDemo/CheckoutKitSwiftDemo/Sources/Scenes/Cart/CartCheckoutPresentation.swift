import Combine
import ShopifyCheckoutKit
import SwiftUI
import UIKit

@MainActor
final class CartCheckoutPresentation: ObservableObject, CheckoutDelegate {
    @Published var showCheckoutSheet = false

    @AppStorage(AppStorageKeys.windowOpenHandler.rawValue)
    private var windowOpenHandler: WindowOpenHandlerOption = .default

    private var isCompleted = false
    private var selectedAddressIDs: [String: String] = [:]
    private var selectedDeliveryMethodIDs: [String: String] = [:]
    private let resetCart: @MainActor () -> Void

    init(resetCart: @escaping @MainActor () -> Void = { CartManager.shared.resetCart() }) {
        self.resetCart = resetCart
    }

    func present(
        checkout url: URL,
        using option: CheckoutPresentationOption,
        from presenter: UIViewController?
    ) {
        switch option {
        case .swiftUI:
            showCheckoutSheet = true
        case .uiKit:
            guard let presenter else { return }
            let checkoutViewController = CheckoutViewController(checkout: url, delegate: self)
            presenter.present(checkoutViewController, animated: true)
        }
    }

    /// Records a completed checkout. The cart is reset on dismissal so the confirmation page stays visible:
    /// resetting now would nil the cart and SwiftUI would auto-collapse the sheet.
    func recordCompletion() {
        isCompleted = true
    }

    func resetCompletedCart() {
        if isCompleted {
            isCompleted = false
            resetCart()
        }
        selectedAddressIDs = [:]
        selectedDeliveryMethodIDs = [:]
    }

    func checkoutDidStart(_ event: CheckoutStartEvent) {
        print("[CheckoutKitSwiftDemo] Started: \(event.checkout.id)")
    }

    func checkoutDidUpdate(_ event: CheckoutUpdateEvent) {
        let updatedAddressIDs = Self.selectedAddressIDs(in: event.checkout)
        if updatedAddressIDs != selectedAddressIDs {
            print("[CheckoutKitSwiftDemo] Selected address changed")
            selectedAddressIDs = updatedAddressIDs
        }

        let updatedDeliveryMethodIDs = Self.selectedDeliveryMethodIDs(in: event.checkout)
        if updatedDeliveryMethodIDs != selectedDeliveryMethodIDs {
            print("[CheckoutKitSwiftDemo] Selected delivery method changed")
            selectedDeliveryMethodIDs = updatedDeliveryMethodIDs
        }

        print("[CheckoutKitSwiftDemo] Updated: \(event.checkout.id)")
    }

    func checkoutDidComplete(_ event: CheckoutCompleteEvent) {
        print("[CheckoutKitSwiftDemo] Completed: \(event.checkout.order?.id ?? "unknown")")
        recordCompletion()
    }

    func checkoutAction(for link: CheckoutLink) -> CheckoutLinkAction {
        print("[CheckoutKitSwiftDemo] Checkout link clicked: \(link.url)")
        switch windowOpenHandler {
        case .default:
            print("[CheckoutKitSwiftDemo] Checkout link delegated to Checkout Kit: \(link.url)")
            return .open
        case .externalApp:
            print("[CheckoutKitSwiftDemo] Checkout link handled by sample: \(link.url)")
            UIApplication.shared.open(link.url)
            return .handled
        }
    }

    func checkoutDidDismiss() {
        print("[CheckoutKitSwiftDemo] Dismissed")
        showCheckoutSheet = false
        resetCompletedCart()
    }

    func checkoutDidFail(_ event: CheckoutFailureEvent) {
        showCheckoutSheet = false
        print("[CheckoutKitSwiftDemo] Failed: \(event.error)")
    }

    private static func selectedAddressIDs(in checkout: ShopifyCheckoutKit.Checkout) -> [String: String] {
        (checkout.fulfillment?.methods ?? []).reduce(into: [:]) { selections, method in
            guard method.type == "shipping", let destinationID = method.selectedDestinationID else { return }
            selections[method.id] = destinationID
        }
    }

    private static func selectedDeliveryMethodIDs(in checkout: ShopifyCheckoutKit.Checkout) -> [String: String] {
        (checkout.fulfillment?.methods ?? []).reduce(into: [:]) { selections, method in
            for group in method.groups ?? [] {
                guard let optionID = group.selectedOptionID else { continue }
                selections["\(method.id):\(group.id)"] = optionID
            }
        }
    }
}
