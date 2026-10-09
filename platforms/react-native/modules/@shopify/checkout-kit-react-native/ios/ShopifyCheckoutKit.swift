import Foundation
import PassKit
import React
import ShopifyCheckoutKit
import SwiftUI
import UIKit

/// Canonical list of SDK lifecycle event types emitted by the
/// per-`present()` dispatcher.
///
/// Mirrors `SDK_LIFECYCLE_EVENT_TYPES` in the JS package and
/// `DispatchEventTypes` on Android. Exposed to JS via
/// `constantsToExport()` so the JS layer can verify the two sides
/// agree at construction time.
enum DispatchEventType: String, CaseIterable {
    case start
    case update
    case complete
    case dismiss
    case linkClick
    case fail
    case geolocationRequest
}

@objc(RCTShopifyCheckoutKit)
class RCTShopifyCheckoutKit: NSObject {
    internal var checkoutSheet: UIViewController?
    private var checkoutEvents: CheckoutEventBridge?
    private weak var closingCheckoutSheet: UIViewController?
    private var checkoutPreload: CheckoutPreload?
    private var acceleratedCheckoutsConfiguration: Any?
    private var acceleratedCheckoutsApplePayConfiguration: Any?

    @objc var methodQueue: DispatchQueue {
        return DispatchQueue.main
    }

    @objc static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override init() {
        // The new architecture can create modules off the main thread.
        Self.performOnMainActor {
            configure {
                $0.platform = Platform.reactNative
            }
        }

        super.init()
    }

    /// Runs `work` immediately on the main thread, otherwise enqueues it on the main queue so calls keep their order.
    private static func performOnMainActor(_ work: @escaping @MainActor () -> Void) {
        if Thread.isMainThread {
            MainActor.assumeIsolated(work)
        } else {
            DispatchQueue.main.async {
                MainActor.assumeIsolated(work)
            }
        }
    }

    @objc func constantsToExport() -> [AnyHashable: Any]! {
        return [
            "version": ShopifyCheckoutKit.version,
            // Surfaced so the JS layer can verify the SDK lifecycle event set
            // it was built against matches what this native module emits.
            "dispatchEventTypes": DispatchEventType.allCases.map { $0.rawValue }
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
            let sheet = self.checkoutSheet
            let events = self.checkoutEvents
            // Keep the closing session separate until UIKit completes dismissal.
            self.checkoutSheet = nil
            self.checkoutEvents = nil
            guard let sheet else {
                events?.checkoutDidDismiss()
                return
            }
            self.closingCheckoutSheet = sheet
            sheet.dismiss(animated: true) { [weak self] in
                if self?.closingCheckoutSheet === sheet { self?.closingCheckoutSheet = nil }
                events?.checkoutDidDismiss()
            }
        }
    }

    @objc func invalidateCache() {
        DispatchQueue.main.async {
            ShopifyCheckoutKit.invalidate()
            self.checkoutPreload = nil
        }
    }

    @objc func present(_ checkoutURL: String, linkAction: String, onResult: @escaping RCTResponseSenderBlock) {
        DispatchQueue.main.async {
            // Preserve the active session and ignore attempts during dismissal.
            guard self.checkoutEvents == nil else {
                onResult([false])
                return
            }
            if let closing = self.closingCheckoutSheet,
               closing.presentingViewController != nil || closing.isBeingDismissed || closing.isBeingPresented
            {
                onResult([false])
                return
            }
            self.closingCheckoutSheet = nil
            let events = CheckoutEventBridge(linkAction: linkAction, dispatch: { [weak self] json in
                self?.emitDispatchEvent(json)
            }, onTerminal: { [weak self] ended in
                guard let self, self.checkoutEvents === ended else { return }
                // Native dismissal/failure can arrive before UIKit starts animating.
                if let sheet = self.checkoutSheet { self.closingCheckoutSheet = sheet }
                self.checkoutEvents = nil
                self.checkoutSheet = nil
            })
            self.checkoutEvents = events
            guard let url = URL(string: checkoutURL), let viewController = self.getCurrentViewController() else {
                events.checkoutDidDismiss()
                onResult([true])
                return
            }
            self.checkoutSheet = self.presentCheckout(url, from: viewController, delegate: events)
            onResult([true])
        }
    }

    @MainActor
    func presentCheckout(_ url: URL, from viewController: UIViewController, delegate: CheckoutEventBridge) -> UIViewController {
        ShopifyCheckoutKit.present(checkout: url, from: viewController, delegate: delegate)
    }

    func emitDispatchEvent(_ json: String) {
        perform(NSSelectorFromString("emitOnDispatchFromSwift:"), with: json)
    }

    @objc func preload(_ checkoutURL: String, requestId: String) {
        DispatchQueue.main.async {
            self.checkoutPreload?.onStateChange = nil
            self.checkoutPreload = nil

            guard let url = URL(string: checkoutURL) else {
                self.emitPreloadStateChange(requestId: requestId, state: .idle)
                return
            }

            guard let checkoutPreload = ShopifyCheckoutKit.preload(checkout: url) else {
                self.emitPreloadStateChange(requestId: requestId, state: .idle)
                return
            }

            self.checkoutPreload = checkoutPreload
            checkoutPreload.onStateChange = { [weak self] state in
                self?.emitPreloadStateChange(requestId: requestId, state: state)
            }
        }
    }

    @objc func setConfig(_ configuration: [AnyHashable: Any]) {
        Self.performOnMainActor { [self] in
            applyConfiguration(configuration)
            NotificationCenter.default.post(name: Notification.Name("CheckoutKitConfigurationUpdated"), object: nil)
        }
    }

    @MainActor
    private func applyConfiguration(_ configuration: [AnyHashable: Any]) {
        ShopifyCheckoutKit.configure { config in
            if let title = configuration["title"] as? String {
                config.title = title
            }

            if let preloading = configuration["preloading"] as? Bool {
                config.preloading.enabled = preloading
            }

            if let allowedMessageOrigins = configuration["allowedMessageOrigins"] as? [String] {
                config.allowedMessageOrigins = allowedMessageOrigins
            }

            if let telemetry = configuration["telemetry"] as? Bool {
                config.telemetry.enabled = telemetry
            }

            if let logLevel = configuration["logLevel"] as? String,
               let parsedLogLevel = LogLevel(rawValue: logLevel.lowercased())
            {
                config.logLevel = parsedLogLevel
            }

            config.appearance = CheckoutAppearanceConfiguration.update(config.appearance, configuration: configuration)
        }
    }

    @objc func getConfig() -> NSDictionary {
        return [
            "title": ShopifyCheckoutKit.configuration.title,
            "appearance": CheckoutAppearanceConfiguration.appearanceResultFor(ShopifyCheckoutKit.configuration.appearance),
            "preloading": ShopifyCheckoutKit.configuration.preloading.enabled,
            "telemetry": ShopifyCheckoutKit.configuration.telemetry.enabled,
            "allowedMessageOrigins": ShopifyCheckoutKit.configuration.allowedMessageOrigins,
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

        let customer: ShopifyAcceleratedCheckouts.Customer? = if let customerAccessToken {
            .init(customerAccessToken: customerAccessToken)
        } else if let customerEmail, let customerPhoneNumber {
            .init(email: customerEmail, phoneNumber: customerPhoneNumber)
        } else {
            nil
        }

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

    @objc func respondToGeolocationRequest(_: Bool) {
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
        return logLevel.rawValue
    }
}

// MARK: - Dispatch envelope helpers

extension RCTShopifyCheckoutKit {
    private func emitPreloadStateChange(requestId: String, state: PreloadState) {
        var event: [String: Any] = ["requestId": requestId]

        switch state {
        case .idle:
            event["type"] = "idle"
        case .loading:
            event["type"] = "loading"
        case .ready:
            event["type"] = "ready"
        case .expired:
            event["type"] = "expired"
        case let .failed(reason, _):
            event["type"] = "failed"
            event.merge(serializePreloadFailure(reason)) { _, new in new }
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: event, options: [])
            guard let json = String(data: data, encoding: .utf8) else { return }
            perform(NSSelectorFromString("emitOnPreloadStateChangeFromSwift:"), with: json)
        } catch {
            NSLog("[ShopifyCheckoutKit] Failed to serialize preload state: \(error)")
        }
    }

    func serializePreloadFailure(_ reason: PreloadState.FailureReason) -> [String: Any] {
        switch reason {
        case let .httpError(statusCode):
            return ["reason": "httpError", "statusCode": statusCode]
        case .navigationFailed:
            return ["reason": "navigationFailed"]
        case .webContentUnavailable:
            return ["reason": "webContentUnavailable"]
        case .protocolError:
            return ["reason": "protocolError"]
        }
    }
}
