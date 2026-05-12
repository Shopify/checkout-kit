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

import ShopifyCheckoutProtocol
import SwiftUI
import UIKit

public class CheckoutViewController: UINavigationController {
    public init(checkout url: URL, client: (any CheckoutCommunicationProtocol)? = nil) {
        let rootViewController = CheckoutWebViewController(checkoutURL: url, client: client, entryPoint: nil)
        rootViewController.notifyPresented()
        super.init(rootViewController: rootViewController)
        presentationController?.delegate = rootViewController
    }

    package init(checkout url: URL, client: (any CheckoutCommunicationProtocol)? = nil, entryPoint: MetaData.EntryPoint? = nil) {
        let rootViewController = CheckoutWebViewController(checkoutURL: url, client: client, entryPoint: entryPoint)
        rootViewController.notifyPresented()
        super.init(rootViewController: rootViewController)
        presentationController?.delegate = rootViewController
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

public struct CheckoutSheet: UIViewControllerRepresentable, CheckoutConfigurable {
    public typealias UIViewControllerType = CheckoutViewController

    var checkoutURL: URL
    var client: (any CheckoutCommunicationProtocol)?
    var onCancelAction: (() -> Void)?
    var onFailAction: ((CheckoutError) -> Void)?

    public init(checkout url: URL) {
        checkoutURL = CheckoutProtocol.url(for: url, colorScheme: ShopifyCheckoutKit.configuration.colorScheme.rawValue)

        ShopifyCheckoutKit.invalidateOnConfigurationChange = false
    }

    public func makeUIViewController(context _: Self.Context) -> CheckoutViewController {
        let viewController = CheckoutViewController(checkout: checkoutURL, client: client)
        configureWebViewController(viewController)
        return viewController
    }

    public func updateUIViewController(_ uiViewController: CheckoutViewController, context _: Self.Context) {
        configureWebViewController(uiViewController)
    }

    private func configureWebViewController(_ navigationController: CheckoutViewController) {
        guard
            let webViewController = navigationController
            .viewControllers
            .compactMap({ $0 as? CheckoutWebViewController })
            .first
        else {
            return
        }

        webViewController.client = client
        webViewController.checkoutView.client = client
        webViewController.onCancel = onCancelAction
        webViewController.onFail = onFailAction
    }

    @discardableResult public func connect(_ handler: any CheckoutCommunicationProtocol) -> Self {
        var copy = self
        copy.client = handler
        return copy
    }

    @discardableResult public func onCancel(_ action: @escaping () -> Void) -> Self {
        var copy = self
        copy.onCancelAction = action
        return copy
    }

    @discardableResult public func onFail(_ action: @escaping (CheckoutError) -> Void) -> Self {
        var copy = self
        copy.onFailAction = action
        return copy
    }
}

public protocol CheckoutConfigurable {
    func backgroundColor(_ color: UIColor) -> Self
    func colorScheme(_ colorScheme: ShopifyCheckoutKit.Configuration.ColorScheme) -> Self
    func tintColor(_ color: UIColor) -> Self
    func title(_ title: String) -> Self
    func closeButtonTintColor(_ color: UIColor?) -> Self
}

extension CheckoutConfigurable {
    @discardableResult public func backgroundColor(_ color: UIColor) -> Self {
        ShopifyCheckoutKit.configuration.backgroundColor = color
        return self
    }

    @discardableResult public func colorScheme(_ colorScheme: ShopifyCheckoutKit.Configuration.ColorScheme) -> Self {
        ShopifyCheckoutKit.configuration.colorScheme = colorScheme
        return self
    }

    @discardableResult public func tintColor(_ color: UIColor) -> Self {
        ShopifyCheckoutKit.configuration.tintColor = color
        return self
    }

    @discardableResult public func title(_ title: String) -> Self {
        ShopifyCheckoutKit.configuration.title = title
        return self
    }

    @discardableResult public func closeButtonTintColor(_ color: UIColor?) -> Self {
        ShopifyCheckoutKit.configuration.closeButtonTintColor = color
        return self
    }
}
