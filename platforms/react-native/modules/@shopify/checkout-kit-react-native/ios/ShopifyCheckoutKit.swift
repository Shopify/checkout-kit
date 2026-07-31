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
    case close
    case fail
    case geolocationRequest
}

@objc(RCTShopifyCheckoutKit)
class RCTShopifyCheckoutKit: NSObject {
    internal var checkoutSheet: UIViewController?
    private var acceleratedCheckoutsConfiguration: Any?
    private var acceleratedCheckoutsApplePayConfiguration: Any?
    private var defaultLogLevel: LogLevel = .error

    @objc var methodQueue: DispatchQueue {
        return DispatchQueue.main
    }

    @objc static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override init() {
        configure {
            $0.platform = Platform.reactNative
        }

        super.init()
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
            self.checkoutSheet?.dismiss(animated: true)
            self.checkoutSheet = nil
        }
    }

    @objc func invalidateCache() {
        DispatchQueue.main.async {
            ShopifyCheckoutKit.invalidate()
        }
    }

    @objc func present(_ checkoutURL: String, subscribedMethods: [String]) {
        DispatchQueue.main.async {
            guard let url = URL(string: checkoutURL),
                  let viewController = self.getCurrentViewController() else { return }

            // Protocol relay: forwards UCP messages from native to the JS
            // dispatch event stream.
            let client = makeRelayClient(
                subscribedMethods: subscribedMethods,
                dispatch: { [weak self] json in
                    self?.emitDispatchEvent(json)
                }
            )

            // `delegate: self` wires the SDK lifecycle events (close/fail)
            // into the same JS dispatcher; `client:` wires the UCP
            // protocol event stream. They are independent inputs feeding
            // the same outbound envelope channel.
            let view = ShopifyCheckoutKit.present(
                checkout: url,
                from: viewController,
                delegate: self,
                client: client
            )
            self.checkoutSheet = view
        }
    }

    @objc func preload(_ checkoutURL: String) {
        DispatchQueue.main.async {
            guard let url = URL(string: checkoutURL) else { return }

            ShopifyCheckoutKit.preload(checkout: url)
        }
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

        if let allowedMessageOrigins = configuration["allowedMessageOrigins"] as? [String] {
            ShopifyCheckoutKit.configuration.allowedMessageOrigins = allowedMessageOrigins
        }

        if configuration["hasMessageRejectedCallback"] as? Bool == true {
            ShopifyCheckoutKit.configuration.onMessageRejected = { [weak self] rejection in
                self?.emitMessageRejected(rejection)
            }
        } else {
            ShopifyCheckoutKit.configuration.onMessageRejected = nil
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
            "colorScheme": ShopifyCheckoutKit.configuration.colorScheme.rawValue,
            "preloading": ShopifyCheckoutKit.configuration.preloading.enabled,
            "tintColor": ShopifyCheckoutKit.configuration.tintColor,
            "backgroundColor": ShopifyCheckoutKit.configuration.backgroundColor,
            "closeButtonColor": ShopifyCheckoutKit.configuration.closeButtonTintColor,
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

// MARK: - CheckoutDelegate

extension RCTShopifyCheckoutKit: CheckoutDelegate {
    /// Fired by the iOS SDK when the buyer dismisses the checkout sheet
    /// without a terminal error. Mirrors
    /// `CustomCheckoutListener.onCheckoutCanceled()` on Android.
    ///
    /// The iOS SDK dismisses the presented checkout when the buyer taps
    /// the close button; this wrapper also clears its local reference so
    /// future presentations start from a clean state.
    func checkoutDidCancel() {
        emitDispatchEnvelope(type: .close, payload: nil)
        dismissCheckoutSheet()
    }

    /// Fired by the iOS SDK when checkout terminates with an error.
    /// Mirrors `CustomCheckoutListener.onCheckoutFailed()` on Android.
    /// The error is serialised into the JS-side `CheckoutNativeError`
    /// shape (`__typename` / `message` / `code` / optional
    /// `statusCode`) so it can be coerced into the matching
    /// `CheckoutException` subclass on the JS side.
    ///
    /// The sheet is left visible — consumers may want to render a
    /// recovery UI on top of the still-presented checkout, or decide to
    /// dismiss it explicitly via `ShopifyCheckoutKit.dismiss()` from
    /// their `onFail` handler. Mirrors the Android behaviour where
    /// `onCheckoutFailed` also does not auto-dismiss the dialog.
    func checkoutDidFail(error: CheckoutError) {
        emitDispatchEnvelope(type: .fail, payload: Self.errorPayload(from: error))
    }

    /// Dismisses the currently-presented checkout sheet on the main
    /// queue and releases our reference to it. Safe to call when no
    /// sheet is presented — `checkoutSheet` will simply be `nil`.
    private func dismissCheckoutSheet() {
        DispatchQueue.main.async { [weak self] in
            self?.checkoutSheet?.dismiss(animated: true)
            self?.checkoutSheet = nil
        }
    }
}

// MARK: - Dispatch envelope helpers

extension RCTShopifyCheckoutKit {
    private func emitDispatchEvent(_ json: String) {
        perform(NSSelectorFromString("emitOnDispatchFromSwift:"), with: json)
    }

    private func emitMessageRejected(_ rejection: MessageRejection) {
        perform(
            NSSelectorFromString("emitOnMessageRejectedFromSwift:"),
            with: [
                "origin": rejection.origin,
                "message": rejection.message,
                "reason": rejection.reason
            ]
        )
    }

    /// Builds a `{ "type": ..., "payload": ... }` envelope and forwards
    /// it to the JS dispatch event stream.
    private func emitDispatchEnvelope(type: DispatchEventType, payload: [String: Any]?) {
        var envelope: [String: Any] = ["type": type.rawValue]
        if let payload {
            envelope["payload"] = payload
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: envelope, options: [])
            guard let json = String(data: data, encoding: .utf8) else {
                NSLog("[ShopifyCheckoutKit] Failed to encode dispatch envelope for \(type.rawValue): non-UTF8 result")
                return
            }
            emitDispatchEvent(json)
        } catch {
            NSLog("[ShopifyCheckoutKit] Failed to serialize dispatch envelope for \(type.rawValue): \(error)")
        }
    }

    /// Maps an iOS `CheckoutError` into the JSON-friendly dictionary
    /// shape the JS dispatcher expects. Field names match Android's
    /// `CustomCheckoutListener.populateErrorDetails` so the JS-side
    /// `parseCheckoutError` works identically on both platforms.
    fileprivate static func errorPayload(from error: CheckoutError) -> [String: Any] {
        switch error {
        case let .sdkError(underlying):
            return [
                "__typename": "InternalError",
                "message": underlying.localizedDescription,
                "code": CheckoutErrorCode.unknown.rawValue
            ]

        case let .checkoutUnavailable(message, code):
            switch code {
            case let .clientError(clientCode):
                return [
                    "__typename": "CheckoutClientError",
                    "message": message,
                    "code": clientCode.rawValue
                ]
            case let .httpError(statusCode):
                return [
                    "__typename": "CheckoutHTTPError",
                    "message": message,
                    // Matches the JS-side `CheckoutErrorCode.httpError`
                    // string and Android's HttpException code value.
                    "code": "http_error",
                    "statusCode": statusCode
                ]
            }

        case let .checkoutExpired(message, code):
            return [
                "__typename": "CheckoutExpiredError",
                "message": message,
                "code": code.rawValue
            ]
        }
    }
}
