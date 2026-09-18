import Combine
import EmbeddedCheckoutProtocol
import ShopifyCheckoutKit
import UIKit

@MainActor
final class CartCheckoutPresentation: ObservableObject, CheckoutDelegate {
    @Published var showCheckoutSheet = false

    private var isCompleted = false
    private let resetCart: @MainActor () -> Void

    init(resetCart: @escaping @MainActor () -> Void = { CartManager.shared.resetCart() }) {
        self.resetCart = resetCart
    }

    func present(
        checkout url: URL,
        using option: CheckoutPresentationOption,
        from presenter: UIViewController?,
        client: CheckoutProtocol.Client
    ) {
        switch option {
        case .swiftUI:
            showCheckoutSheet = true
        case .uiKit:
            guard let presenter else { return }
            ShopifyCheckoutKit.configuration.appearance = .app(.automatic)
            let checkoutViewController = CheckoutViewController(
                checkout: url,
                delegate: self,
                client: observingCompletion(on: client)
            )
            presenter.present(checkoutViewController, animated: true)
        }
    }

    func observingCompletion(on client: CheckoutProtocol.Client) -> CheckoutProtocol.Client {
        client.on(CheckoutProtocol.complete) { [weak self] checkout in
            print("[UCP] ec.complete: \(checkout.order?.id ?? "unknown")")
            self?.isCompleted = true
        }
    }

    nonisolated func checkoutDidDismiss() {
        MainActor.assumeIsolated {
            print("[CheckoutKitSwiftDemo] DISMISSED")
            showCheckoutSheet = false

            if isCompleted {
                isCompleted = false
                resetCart()
            }
        }
    }

    nonisolated func checkoutDidFail(error: CheckoutError) {
        MainActor.assumeIsolated {
            showCheckoutSheet = false
            print("[CheckoutKitSwiftDemo] FAIL - Checkout failed: \(error)")
        }
    }
}
