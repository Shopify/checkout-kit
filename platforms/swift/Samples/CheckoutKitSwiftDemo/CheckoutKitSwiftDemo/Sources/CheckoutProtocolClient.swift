import EmbeddedCheckoutProtocol
import SafariServices
import ShopifyCheckoutKit
import UIKit

extension WindowOpenHandlerOption {
    @MainActor
    func handle(_ request: WindowOpenRequest) -> WindowOpenResult {
        switch self {
        case .default:
            guard let target = request.parsedURL, UIApplication.shared.canOpenURL(target) else {
                return .rejected(reason: "canOpenURL returned false")
            }
            UIApplication.shared.open(target)
            return .success()
        case .safariViewController:
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

extension UIApplication {
    fileprivate var foregroundActiveWindow: UIWindow? {
        let activeScenes = connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .filter { $0.activationState == .foregroundActive }

        return activeScenes.compactMap(\.keyWindow).first
    }
}
