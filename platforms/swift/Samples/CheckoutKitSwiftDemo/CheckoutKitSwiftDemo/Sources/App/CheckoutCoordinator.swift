import ShopifyCheckoutKit
import UIKit

class CheckoutCoordinator: UIViewController {
    var window: UIWindow?
    var root: UIViewController?

    private let checkoutDelegate = CartResettingCheckoutDelegate()
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
            ShopifyCheckoutKit.present(checkout: url, from: rootViewController, delegate: checkoutDelegate)
            root = rootViewController
        }
    }
}
