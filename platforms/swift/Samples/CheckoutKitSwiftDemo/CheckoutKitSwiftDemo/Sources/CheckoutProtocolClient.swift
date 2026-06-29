import ShopifyCheckoutKit
import ShopifyCheckoutProtocol
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
        case .externalApp:
            return base.on(CheckoutProtocol.windowOpen) { request in
                print("[UCP] ec.window_open (\(request.url.scheme ?? "")) → external app")

                let didOpen = await UIApplication.shared.open(request.url)
                return didOpen ? .success : .rejected(reason: "failed to open URL")
            }
        }
    }
}
