import EmbeddedCheckoutProtocol
import SafariServices
import ShopifyCheckoutKit
import UIKit

extension CheckoutProtocol.Client {
    @MainActor
    static func with(windowOpen: WindowOpenHandlerOption) -> CheckoutProtocol.Client {
        let base = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { checkout in
                print("[UCP] ec.start: \(checkout.id)")
            }
            .on(CheckoutProtocol.complete) { checkout in
                // Do NOT reset the cart here — the cart drives a SwiftUI `if let` in CartView,
                // and nil-ing it auto-collapses the .sheet, hiding the order confirmation page.
                // Reset on user dismiss instead (see CartView .onCancel + isCompleted).
                print("[UCP] ec.complete: \(checkout.order?.id ?? "unknown")")
            }
            .on(CheckoutProtocol.lineItemsChange) { checkout in
                print("[UCP] ec.line_items.change: \(checkout.id)")
            }
            .on(CheckoutProtocol.messagesChange) { checkout in
                print("[UCP] ec.messages.change: \(checkout.id)")
            }
            .on(CheckoutProtocol.totalsChange) { checkout in
                print("[UCP] ec.totals.change: \(checkout.id)")
            }
            .on(CheckoutProtocol.fulfillmentChange) { checkout in
                print("[UCP] ec.fulfillment.change: \(checkout.id)")
            }
            .on(CheckoutProtocol.error) { error in
                print("[UCP] ec.error: \(error.messages.first?.content ?? "(no message)")")
            }

        switch windowOpen {
        case .default:
            return base
        case .safariViewController:
            return base.on(CheckoutProtocol.windowOpen) { request in
                let scheme = request.url.scheme?.lowercased()

                print("[UCP] ec.window_open (\(scheme ?? ""))")

                guard scheme == "http" || scheme == "https" else {
                    return .rejected(reason: "unsupported URL scheme")
                }

                guard let presenter = UIApplication.shared.foregroundActiveWindow?.topMostViewController() else {
                    return .rejected(reason: "no presenter available")
                }

                let safari = SFSafariViewController(url: request.url)

                // By default, the view controller opens full screen from right to left.
                safari.modalPresentationStyle = .pageSheet
                safari.modalTransitionStyle = .coverVertical

                presenter.present(safari, animated: true)
                return .success
            }
        }
    }
}

extension UIApplication {
    fileprivate var foregroundActiveWindow: UIWindow? {
        let activeScenes = connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .filter { $0.activationState == .foregroundActive }

        return activeScenes.compactMap(\.keyWindow).first
    }
}
