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

import Foundation
import PassKit
import React
import ShopifyCheckoutKit
import SwiftUI
import UIKit

@objc(RCTShopifyCheckoutKit)
class RCTShopifyCheckoutKit: RCTEventEmitter {
    private var hasListeners = false

    internal var checkoutSheet: UIViewController?
    private var acceleratedCheckoutsConfiguration: Any?
    private var acceleratedCheckoutsApplePayConfiguration: Any?
    private var defaultLogLevel: LogLevel = .error

    override var methodQueue: DispatchQueue! {
        return DispatchQueue.main
    }

    @objc override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override init() {
        configure {
            $0.platform = Platform.reactNative
        }

        super.init()
    }

    override func supportedEvents() -> [String]! {
        return ["close", "error"]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    // TODO: re-enable when iOS CheckoutDelegate (or equivalent) lands upstream —
    // parallels Android's DefaultCheckoutEventProcessor.onCheckoutCanceled / onCheckoutFailed.
    // Until then, the JS "error" and "close" events stay declared in supportedEvents()
    // but native never emits them.
    /*

    func shouldRecoverFromError(error: CheckoutError) -> Bool {
        return error.isRecoverable
    }

    func checkoutDidFail(error: CheckoutError) {
        guard hasListeners else { return }

        sendEvent(withName: "error", body: ShopifyEventSerialization.serialize(checkoutError: error))
    }

    func checkoutDidCancel() {
        DispatchQueue.main.async {
            if self.hasListeners {
                self.sendEvent(withName: "close", body: nil)
            }

            self.checkoutSheet?.dismiss(animated: true)
        }
    }

    func checkoutDidEmitWebPixelEvent(event _: PixelEvent) {}
    */

    @objc override func constantsToExport() -> [AnyHashable: Any]! {
        return [
            "version": ShopifyCheckoutKit.version
        ]
    }

    @objc func getConstants() -> [AnyHashable: Any]! {
        return constantsToExport()
    }

    static func getRootViewController() -> UIViewController? {
        return (
            UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene
        )?.windows
            .first(where: { $0.isKeyWindow })?.rootViewController
    }

    func getCurrentViewController(_ controller: UIViewController? = getRootViewController()) -> UIViewController? {
        if let presentedViewController = controller?.presentedViewController {
            return getCurrentViewController(presentedViewController)
        }

        if let navigationController = controller as? UINavigationController {
            return getCurrentViewController(navigationController.visibleViewController)
        }

        if let tabBarController = controller as? UITabBarController {
            if let selectedViewController = tabBarController.selectedViewController {
                return getCurrentViewController(selectedViewController)
            }
        }

        return controller
    }

    @objc func dismiss() {
        DispatchQueue.main.async {
            self.checkoutSheet?.dismiss(animated: true)
        }
    }

    @objc func invalidateCache() {
        invalidate()
    }

    @objc func present(_ checkoutURL: String) {
        DispatchQueue.main.async {
            if let url = URL(string: checkoutURL), let viewController = self.getCurrentViewController() {
                let view = CheckoutViewController(checkout: url)
                viewController.present(view, animated: true)
                self.checkoutSheet = view
            }
        }
    }

    @objc func preload(_ checkoutURL: String) {
        // Public native preload support is not exposed by the local iOS SDK.
    }

    private func getColorScheme(_ colorScheme: String) -> Configuration.ColorScheme {
        switch colorScheme {
        case "web_default":
            return Configuration.ColorScheme.web
        case "automatic":
            return Configuration.ColorScheme.automatic
        case "light":
            return Configuration.ColorScheme.light
        case "dark":
            return Configuration.ColorScheme.dark
        default:
            return Configuration.ColorScheme.automatic
        }
    }

    @objc func setConfig(_ configuration: [AnyHashable: Any]) {
        let colorConfig = configuration["colors"] as? [AnyHashable: Any]
        let iosConfig = colorConfig?["ios"] as? [String: String]

        if let title = configuration["title"] as? String {
            ShopifyCheckoutKit.configuration.title = title
        }

        if let preloading = configuration["preloading"] as? Bool {
            ShopifyCheckoutKit.configuration.preloading.enabled = preloading
        }

        if let colorScheme = configuration["colorScheme"] as? String {
            ShopifyCheckoutKit.configuration.colorScheme = getColorScheme(colorScheme)
        }

        if let tintColorHex = iosConfig?["tintColor"] as? String {
            ShopifyCheckoutKit.configuration.tintColor = UIColor(hex: tintColorHex)
        }

        if let backgroundColorHex = iosConfig?["backgroundColor"] as? String {
            ShopifyCheckoutKit.configuration.backgroundColor = UIColor(hex: backgroundColorHex)
        }

        if let closeButtonColorHex = iosConfig?["closeButtonColor"] as? String {
            ShopifyCheckoutKit.configuration.closeButtonTintColor = UIColor(hex: closeButtonColorHex)
        }

        if let logLevel = configuration["logLevel"] as? String {
            ShopifyCheckoutKit.configuration.logLevel = LogLevel(rawValue: logLevel.lowercased()) ?? defaultLogLevel
        } else {
            ShopifyCheckoutKit.configuration.logLevel = defaultLogLevel
        }

        NotificationCenter.default.post(name: Notification.Name("CheckoutKitConfigurationUpdated"), object: nil)
    }

    @objc func getConfig() -> NSDictionary {
        return [
            "title": ShopifyCheckoutKit.configuration.title,
            "preloading": ShopifyCheckoutKit.configuration.preloading.enabled,
            "colorScheme": ShopifyCheckoutKit.configuration.colorScheme.rawValue,
            "tintColor": ShopifyCheckoutKit.configuration.tintColor,
            "backgroundColor": ShopifyCheckoutKit.configuration.backgroundColor,
            "closeButtonColor": ShopifyCheckoutKit.configuration.closeButtonTintColor,
            "logLevel": logLevelToString(ShopifyCheckoutKit.configuration.logLevel)
        ]
    }

    @objc func configureAcceleratedCheckouts(
        _ storefrontDomain: String,
        storefrontAccessToken: String,
        customerEmail: String?,
        customerPhoneNumber: String?,
        customerAccessToken: String?,
        applePayMerchantIdentifier: String?,
        applyPayContactFields: [String]?,
        supportedShippingCountries: [String]?
    ) -> NSNumber {
        guard #available(iOS 16.0, *) else {
            return NSNumber(value: false)
        }

        let customer = ShopifyAcceleratedCheckouts.Customer(
            email: customerEmail,
            phoneNumber: customerPhoneNumber,
            customerAccessToken: customerAccessToken
        )

        acceleratedCheckoutsConfiguration = ShopifyAcceleratedCheckouts.Configuration(
            storefrontDomain: storefrontDomain,
            storefrontAccessToken: storefrontAccessToken,
            customer: customer
        )

        if let merchantIdentifier = applePayMerchantIdentifier, let contactFields = applyPayContactFields {
            do {
                let fields = try contactFieldsToRequiredContactFields(contactFields)

                acceleratedCheckoutsApplePayConfiguration = ShopifyAcceleratedCheckouts.ApplePayConfiguration(
                    merchantIdentifier: merchantIdentifier,
                    contactFields: fields,
                    supportedShippingCountries: Set(supportedShippingCountries ?? [])
                )

                AcceleratedCheckoutConfiguration.shared.applePayConfiguration = acceleratedCheckoutsApplePayConfiguration as? ShopifyAcceleratedCheckouts.ApplePayConfiguration
            } catch {
                return NSNumber(value: false)
            }
        }

        AcceleratedCheckoutConfiguration.shared.configuration = acceleratedCheckoutsConfiguration as? ShopifyAcceleratedCheckouts.Configuration

        NotificationCenter.default.post(name: Notification.Name("AcceleratedCheckoutConfigurationUpdated"), object: nil)

        return NSNumber(value: true)
    }

    @objc func isAcceleratedCheckoutAvailable() -> NSNumber {
        guard #available(iOS 16.0, *) else {
            return NSNumber(value: false)
        }

        return NSNumber(value: AcceleratedCheckoutConfiguration.shared.available)
    }

    @objc func isApplePayAvailable() -> NSNumber {
        guard #available(iOS 16.0, *) else {
            return NSNumber(value: false)
        }

        let available = AcceleratedCheckoutConfiguration.shared.available && AcceleratedCheckoutConfiguration.shared.applePayAvailable

        return NSNumber(value: available)
    }

    @objc func initiateGeolocationRequest(_ allow: Bool) {
        // No-op on iOS — geolocation permission is handled natively
    }

    // MARK: - Private

    @available(iOS 16.0, *)
    private func contactFieldsToRequiredContactFields(_ contactFields: [String]) throws -> [ShopifyAcceleratedCheckouts.RequiredContactFields] {
        return try contactFields.compactMap {
            guard let field = ShopifyAcceleratedCheckouts.RequiredContactFields(rawValue: $0), field != nil else {
                let message = "Unknown contactField option: \(String(describing: $0))"
                print("[ShopifyCheckoutKit] \(message)")
                throw NSError(domain: "ShopifyCheckoutKit", code: 1, userInfo: ["message": message])
            }
            return field
        }
    }

    private func logLevelToString(_ logLevel: LogLevel) -> String {
        switch logLevel {
        case .all, .debug:
            return "debug"
        case .error:
            return "error"
        default:
            return "error"
        }
    }
}
