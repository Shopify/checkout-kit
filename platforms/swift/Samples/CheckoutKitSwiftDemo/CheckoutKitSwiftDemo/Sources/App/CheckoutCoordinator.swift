import OSLog
import ShopifyCheckoutKit
import ShopifyCheckoutProtocol
import UIKit

class CheckoutCoordinator: UIViewController {
    var window: UIWindow?
    var root: UIViewController?

    private let checkoutDelegate = CartResettingCheckoutDelegate()
    private lazy var client = CheckoutProtocol.Client()
        .on(CheckoutProtocol.start) { checkout in
            OSLogger.shared.debug("[UCP] Checkout started: \(checkout.id)")
        }
        .on(CheckoutProtocol.complete) { [checkoutDelegate] checkout in
            OSLogger.shared.debug("[UCP] Checkout completed: \(checkout.order?.id ?? "unknown")")
            checkoutDelegate.markCompleted()
        }

    init(window: UIWindow?) {
        self.window = window
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    public static var shared: CheckoutCoordinator?

    public func present(checkout url: URL) {
        if let rootViewController = window?.topMostViewController() {
            ShopifyCheckoutKit.present(checkout: url, from: rootViewController, delegate: checkoutDelegate, client: client)
            root = rootViewController
        }
    }
}
