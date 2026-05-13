/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import SafariServices
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
                print("[UCP] ec.complete: \(checkout.order?.id ?? "unknown")")
                CartManager.shared.resetCart()
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
                presenter.present(safari, animated: true)
                return .success
            }
        }
    }
}

private extension UIApplication {
    var foregroundActiveWindow: UIWindow? {
        let activeScenes = connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .filter { $0.activationState == .foregroundActive }

        if #available(iOS 15.0, *) {
            return activeScenes.compactMap(\.keyWindow).first
        } else {
            return activeScenes.flatMap(\.windows).first { $0.isKeyWindow }
        }
    }
}
