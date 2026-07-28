import EmbeddedCheckoutProtocol
import SafariServices
import ShopifyCheckoutKit
import UIKit

extension CheckoutProtocol.Client {
    @MainActor
    static func handling(windowOpen: WindowOpenHandlerOption) -> CheckoutProtocol.Client {
        switch windowOpen {
        case .default:
            return CheckoutProtocol.Client()
        case .safariViewController:
            return CheckoutProtocol.Client().on(CheckoutProtocol.windowOpen) { request in
                guard let target = request.parsedURL else {
                    return .rejected(reason: "invalid URL")
                }

                let scheme = target.scheme?.lowercased()

                print("[UCP] ec.window_open (\(scheme ?? ""))")

                guard scheme == "http" || scheme == "https" else {
                    return .rejected(reason: "unsupported URL scheme")
                }

                guard let presenter = UIApplication.shared.foregroundActiveWindow?.topMostViewController() else {
                    return .rejected(reason: "no presenter available")
                }

                let safari = SFSafariViewController(url: target)

                // By default, the view controller opens full screen from right to left.
                safari.modalPresentationStyle = .pageSheet
                safari.modalTransitionStyle = .coverVertical

                presenter.present(safari, animated: true)
                return .success()
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
