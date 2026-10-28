import Foundation
import PassKit
import React
@testable import RNShopifyCheckoutKit
@testable import ShopifyCheckoutKit
import SwiftUI
import XCTest

enum WalletButtons {
    static let zero = Double(0)
    static let one = Double(48)
    static let two = Double(104)
}

@available(iOS 16.0, *)
class AcceleratedCheckouts_SupportedTests: XCTestCase {
    private var shopifyCheckoutKit: RCTShopifyCheckoutKit!

    override func setUp() {
        super.setUp()
        shopifyCheckoutKit = RCTShopifyCheckoutKit()
        resetSharedConfigurations()
        resetCheckoutKitDefaults()
    }

    override func tearDown() {
        resetSharedConfigurations()
        shopifyCheckoutKit = nil
        super.tearDown()
    }

    private func resetSharedConfigurations() {
        AcceleratedCheckoutConfiguration.shared.configuration = nil
        AcceleratedCheckoutConfiguration.shared.applePayConfiguration = nil
    }

    private func resetCheckoutKitDefaults() {
        // XCTest runs these synchronous tests on the main thread, which is what `configure` requires.
        MainActor.assumeIsolated {
            ShopifyCheckout.configure {
                $0.appearance = .storefront()
            }
        }
    }

    @discardableResult
    private func configureAcceleratedCheckouts(includeApplePay: Bool, customerAccessToken: String? = nil) -> Bool {
        let storefrontDomain = "example.myshopify.com"
        let accessToken = "shpat_test_token"
        let email = "buyer@example.com"
        let phone = "+12223334444"
        let merchantIdentifier: String? = includeApplePay ? "merchant.com.shopify.reactnative.tests" : nil
        let contactFields: [String]? = includeApplePay ? ["email", "phone"] : nil
        let supportedShippingCountries: [String]? = includeApplePay ? ["IE", "CA"] : nil

        return shopifyCheckoutKit.configureAcceleratedCheckouts(
            storefrontDomain,
            storefrontAccessToken: accessToken,
            customerEmail: email,
            customerPhoneNumber: phone,
            customerAccessToken: customerAccessToken,
            applePayMerchantIdentifier: merchantIdentifier,
            applyPayContactFields: contactFields,
            supportedShippingCountries: supportedShippingCountries
        ).boolValue
    }

    func testDismissIsRegisteredAsDirectEvent() throws {
        let viewConfig = RCTComponentData.viewConfig(forViewMangerClass: RCTAcceleratedCheckoutButtonsManager.self)
        let directEvents = try XCTUnwrap(viewConfig["directEvents"] as? [String])
        let bubblingEvents = try XCTUnwrap(viewConfig["bubblingEvents"] as? [String])

        XCTAssertTrue(directEvents.contains("topDismiss"))
        XCTAssertFalse(bubblingEvents.contains("topDismiss"))
    }

    func testConfigureAcceleratedCheckoutsSetsSharedConfigsOnIOS16() {
        let notificationExpectation = expectation(forNotification: Notification.Name("AcceleratedCheckoutConfigurationUpdated"), object: nil, handler: nil)
        configureAcceleratedCheckouts(includeApplePay: true)
        wait(for: [notificationExpectation], timeout: 2)
        XCTAssertNotNil(AcceleratedCheckoutConfiguration.shared.configuration)
        XCTAssertNotNil(AcceleratedCheckoutConfiguration.shared.applePayConfiguration)
    }

    func testIsAcceleratedCheckoutAvailableBeforeAndAfterConfig() {
        XCTAssertEqual(shopifyCheckoutKit.isAcceleratedCheckoutAvailable().boolValue, false)

        configureAcceleratedCheckouts(includeApplePay: false)

        XCTAssertEqual(shopifyCheckoutKit.isAcceleratedCheckoutAvailable().boolValue, true)
    }

    func testIsApplePayAvailableRequiresApplePayConfig() {
        XCTAssertEqual(shopifyCheckoutKit.isApplePayAvailable().boolValue, false)

        configureAcceleratedCheckouts(includeApplePay: false)

        XCTAssertEqual(shopifyCheckoutKit.isApplePayAvailable().boolValue, false)

        configureAcceleratedCheckouts(includeApplePay: true)

        XCTAssertEqual(shopifyCheckoutKit.isApplePayAvailable().boolValue, true)
    }

    func testConfigureAcceleratedCheckoutsStoresCustomerAccessToken() {
        let token = "customer-access-token-123"
        configureAcceleratedCheckouts(includeApplePay: false, customerAccessToken: token)
        guard let config = AcceleratedCheckoutConfiguration.shared.configuration else {
            return XCTFail("configuration missing")
        }
        XCTAssertEqual(config.customer?.customerAccessToken, token)
    }

    func testConfigureAcceleratedCheckoutsWithNilCustomerAccessToken() {
        configureAcceleratedCheckouts(includeApplePay: false, customerAccessToken: nil)
        guard let config = AcceleratedCheckoutConfiguration.shared.configuration else {
            return XCTFail("configuration missing")
        }
        XCTAssertNil(config.customer?.customerAccessToken)
    }

    func testButtonsViewHeightZeroWhenWalletsExplicitEmpty() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let viewExpectation = expectation(description: "onSizeChange height 0 for empty wallets")

        let view = RCTAcceleratedCheckoutButtonsView()
        view.checkoutIdentifier = ["cartId": "gid://shopify/Cart/1"]
        view.onSizeChange = { payload in
            guard let payload else { return }
            let height = (payload["height"] as? NSNumber)?.doubleValue ?? 0
            if height == WalletButtons.zero {
                viewExpectation.fulfill()
            }
        }
        view.wallets = []

        wait(for: [viewExpectation], timeout: 2)
    }

    func testButtonsViewHeightReflectsWalletCountWhenWalletsProvided() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let viewExpectation = expectation(description: "onSizeChange height for two wallets")
        var fulfilled = false

        let view = RCTAcceleratedCheckoutButtonsView()
        view.checkoutIdentifier = ["cartId": "gid://shopify/Cart/1"]
        view.onSizeChange = { payload in
            if fulfilled { return }
            guard let payload else { return }

            let height = (payload["height"] as? NSNumber)?.doubleValue ?? -1

            if height == WalletButtons.two {
                fulfilled = true
                viewExpectation.fulfill()
            }
        }
        view.wallets = ["applePay", "shopPay"]

        wait(for: [viewExpectation], timeout: 2)
    }

    func testButtonsViewEmptyWhenContainingUnknownWallets() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let viewExpectation = expectation(description: "onSizeChange height 0 when contains unknown wallet")
        var fulfilled = false

        let view = RCTAcceleratedCheckoutButtonsView()
        view.checkoutIdentifier = ["cartId": "gid://shopify/Cart/1"]
        view.onSizeChange = { payload in
            if fulfilled { return }
            guard let payload else { return }

            let height = (payload["height"] as? NSNumber)?.doubleValue ?? -1

            if height == WalletButtons.zero {
                fulfilled = true
                viewExpectation.fulfill()
            }
        }
        view.wallets = ["applePay", "bogus", "shopPay"]

        wait(for: [viewExpectation], timeout: 2)
        XCTAssertNil(view.instance)
    }

    func testButtonsViewEmptyWhenCheckoutIdentifierMissingOrInvalid() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let missingExpectation = expectation(description: "height 0 when identifier missing")
        let missing = RCTAcceleratedCheckoutButtonsView()
        missing.onSizeChange = { payload in
            guard let payload else { return }
            let height = (payload["height"] as? NSNumber)?.doubleValue ?? -1
            if height == 0 { missingExpectation.fulfill() }
        }
        _ = missing
        NotificationCenter.default.post(name: Notification.Name("AcceleratedCheckoutConfigurationUpdated"), object: nil)

        wait(for: [missingExpectation], timeout: 2)

        let invalidExpectation = expectation(description: "height 0 when identifier invalid")
        let invalid = RCTAcceleratedCheckoutButtonsView()
        invalid.onSizeChange = { payload in
            guard let payload else { return }
            let height = (payload["height"] as? NSNumber)?.doubleValue ?? -1
            if height == 0 {
                invalidExpectation.fulfill()
            }
        }
        invalid.checkoutIdentifier = ["variantId": "   "]

        wait(for: [invalidExpectation], timeout: 2)
    }

    func testButtonsViewAcceptsBuyNowVariant() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let viewExpectation = expectation(description: "Buy Now variant renders non-zero height")
        var fulfilled = false
        let view = RCTAcceleratedCheckoutButtonsView()
        view.onSizeChange = { payload in
            if fulfilled { return }

            let height = (payload?["height"] as? NSNumber)?.doubleValue ?? 0
            if height > 0 {
                fulfilled = true
                viewExpectation.fulfill()
            }
        }
        view.checkoutIdentifier = ["variantId": "gid://shopify/ProductVariant/1"]

        wait(for: [viewExpectation], timeout: 2)
        XCTAssertNotNil(view.instance)
    }

    @MainActor
    func testBuyNowCartRequestForwardsTheWalletAndResumesWithTheJavaScriptCart() async throws {
        let cartRequested = expectation(description: "requests a cart after an accepted wallet tap")
        let view = RCTAcceleratedCheckoutButtonsView()
        view.onCartRequest = { payload in
            guard
                let payload,
                let requestId = payload["requestId"] as? String,
                let wallet = payload["wallet"] as? String
            else {
                return XCTFail("Expected a Buy Now cart request")
            }
            XCTAssertEqual(wallet, Wallet.applePay.rawValue)
            view.cartRequestResponses = [[
                "requestId": requestId,
                "cartId": "gid://shopify/Cart/buy-now"
            ]]
            cartRequested.fulfill()
        }

        let result = try await view.requestCart(for: .applePay)

        await fulfillment(of: [cartRequested], timeout: 2)
        XCTAssertEqual(result.resolvedCartID, "gid://shopify/Cart/buy-now")
    }

    @MainActor
    func testConcurrentBuyNowCartRequestsResumeEveryWallet() async throws {
        let view = RCTAcceleratedCheckoutButtonsView()
        var requests: [(requestId: String, wallet: String)] = []
        view.onCartRequest = { payload in
            guard
                let payload,
                let requestId = payload["requestId"] as? String,
                let wallet = payload["wallet"] as? String
            else {
                return XCTFail("Expected a Buy Now cart request")
            }

            requests.append((requestId, wallet))
            guard requests.count == 2 else { return }

            view.cartRequestResponses = requests.map {
                [
                    "requestId": $0.requestId,
                    "cartId": "gid://shopify/Cart/\($0.wallet)"
                ]
            } as NSArray
        }

        async let applePayResult = view.requestCart(for: .applePay)
        async let shopPayResult = view.requestCart(for: .shopPay)
        let (applePay, shopPay) = try await (applePayResult, shopPayResult)

        XCTAssertEqual(applePay.resolvedCartID, "gid://shopify/Cart/applePay")
        XCTAssertEqual(shopPay.resolvedCartID, "gid://shopify/Cart/shopPay")
    }

    func testButtonsViewAcceptsCartIdWithWhitespace() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let viewExpectation = expectation(description: "trimmed cartId renders non-zero height")
        var fulfilledCart = false

        let view = RCTAcceleratedCheckoutButtonsView()
        view.wallets = ["applePay", "shopPay"]
        view.onSizeChange = { payload in
            if fulfilledCart { return }
            guard let payload else { return }
            let height = (payload["height"] as? NSNumber)?.doubleValue ?? -1
            if height == WalletButtons.two {
                fulfilledCart = true
                viewExpectation.fulfill()
            }
        }
        view.checkoutIdentifier = ["cartId": "  gid://shopify/Cart/1  "]

        wait(for: [viewExpectation], timeout: 2)
        XCTAssertNotNil(view.instance)
    }

    func testButtonsViewAcceptsCartId_withDefaultWallets() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let viewExpectation = expectation(description: "cartId renders the expected height")
        var fulfilledCart = false

        let view = RCTAcceleratedCheckoutButtonsView()
        view.onSizeChange = { payload in
            if fulfilledCart { return }
            guard let payload else { return }

            let height = (payload["height"] as? NSNumber)?.doubleValue ?? -1

            // "Wallets" prop is nil, so default rendered (2 buttons)
            if height == WalletButtons.two {
                fulfilledCart = true
                viewExpectation.fulfill()
            }
        }
        view.checkoutIdentifier = ["cartId": "gid://shopify/Cart/123"]

        wait(for: [viewExpectation], timeout: 2)
        XCTAssertNotNil(view.instance)
    }

    func testButtonsViewAcceptsCartId_withExplicitWallets() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let viewExpectation = expectation(description: "cartId renders the expected height")
        var fulfilledCart = false

        let view = RCTAcceleratedCheckoutButtonsView()
        view.wallets = ["shopPay"]
        view.onSizeChange = { payload in
            if fulfilledCart { return }
            guard let payload else { return }

            let height = (payload["height"] as? NSNumber)?.doubleValue ?? -1

            // Wallets prop is explicitly set, so must be respected
            if height == WalletButtons.one {
                fulfilledCart = true
                viewExpectation.fulfill()
            }
        }
        view.checkoutIdentifier = ["cartId": "gid://shopify/Cart/123"]

        wait(for: [viewExpectation], timeout: 2)
        XCTAssertNotNil(view.instance)
    }

    func testButtonsViewRendersEmptyWhenWalletsArrayIsEmpty() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let viewExpectation = expectation(description: "cartId renders the expected height")
        var fulfilledCart = false

        let view = RCTAcceleratedCheckoutButtonsView()
        view.wallets = []
        view.onSizeChange = { payload in
            if fulfilledCart { return }
            guard let payload else { return }

            let height = (payload["height"] as? NSNumber)?.doubleValue ?? -1

            // Wallets prop is explicitly set, so must be respected
            if height == WalletButtons.zero {
                fulfilledCart = true
                viewExpectation.fulfill()
            }
        }
        view.checkoutIdentifier = ["cartId": "gid://shopify/Cart/123"]

        wait(for: [viewExpectation], timeout: 2)
        XCTAssertNil(view.instance)
    }

    func testButtonsViewHeightZeroWhenWalletsMapToEmptyUnknowns() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let view = RCTAcceleratedCheckoutButtonsView()
        view.wallets = ["bogus", "unknown", "invalid"]

        let height = view.intrinsicContentSize.height
        XCTAssertEqual(height, WalletButtons.zero)
        XCTAssertNil(view.instance)
    }

    func testApplePayLabelMapping_knownAndUnknownKeys() {
        XCTAssertTrue(PKPaymentButtonType.from("buy") == .buy)
        XCTAssertTrue(PKPaymentButtonType.from("checkout") == .checkout)
        XCTAssertTrue(PKPaymentButtonType.from("continue") == .continue)
        XCTAssertTrue(PKPaymentButtonType.from("plain") == .plain)
        XCTAssertTrue(PKPaymentButtonType.from("unknown") == .plain)
        XCTAssertTrue(PKPaymentButtonType.from("unknown", fallback: .buy) == .buy)
    }

    @MainActor
    func testLinkHandlingStopsAfterDismissal() throws {
        try assertLinkHandlingStops(fail: false)
    }

    @MainActor
    func testLinkHandlingStopsAfterFailure() throws {
        try assertLinkHandlingStops(fail: true)
    }

    @MainActor
    private func assertLinkHandlingStops(fail: Bool) throws {
        configureAcceleratedCheckouts(includeApplePay: false)
        let checkout = try JSONDecoder().decode(Checkout.self, from: Data(#"{"id":"checkout-1","currency":"USD","status":"incomplete","line_items":[],"links":[],"totals":[]}"#.utf8))
        let link = try CheckoutLink(url: XCTUnwrap(URL(string: "https://example.test/policy")))
        for action in ["default", "handled", "cancel"] {
            let view = RCTAcceleratedCheckoutButtonsView()
            view.checkoutIdentifier = ["cartId": "gid://shopify/Cart/1"]
            view.linkAction = action
            let handlers = try XCTUnwrap(view.instance).eventHandlers
            let handleLink = try XCTUnwrap(handlers.checkoutAction)
            var links = 0
            view.onDispatch = { payload in
                if (payload?["value"] as? String)?.contains("\"type\":\"linkClick\"") == true { links += 1 }
            }
            XCTAssertEqual(handleLink(link), .cancel)
            XCTAssertEqual(links, 0)
            handlers.checkoutDidStart?(CheckoutStartEvent(checkout: checkout))
            XCTAssertEqual(handleLink(link), checkoutLinkAction(action))
            handlers.checkoutDidComplete?(CheckoutCompleteEvent(checkout: checkout))
            XCTAssertEqual(handleLink(link), checkoutLinkAction(action))
            XCTAssertEqual(links, 2)
            if fail {
                handlers.checkoutDidFail?(CheckoutError(code: .sdkError, message: "Failed"))
            } else {
                handlers.checkoutDidDismiss?()
            }
            XCTAssertEqual(handleLink(link), .cancel)
            XCTAssertEqual(links, 2)
            handlers.checkoutDidStart?(CheckoutStartEvent(checkout: checkout))
            XCTAssertEqual(handleLink(link), checkoutLinkAction(action))
            XCTAssertEqual(links, 3)
        }
    }

    func testConfigureAcceleratedCheckoutsReturnsFalseForInvalidApplePayContactField() {
        let storefrontDomain = "example.myshopify.com"
        let accessToken = "shpat_test_token"

        let resolved = shopifyCheckoutKit.configureAcceleratedCheckouts(
            storefrontDomain,
            storefrontAccessToken: accessToken,
            customerEmail: nil,
            customerPhoneNumber: nil,
            customerAccessToken: nil,
            applePayMerchantIdentifier: "merchant.com.shopify.reactnative.tests",
            applyPayContactFields: ["email", "not_a_field"],
            supportedShippingCountries: []
        ).boolValue

        XCTAssertEqual(resolved, false)
    }
}

extension BinaryInteger {
    fileprivate var doubleValue: Double {
        Double(self)
    }
}
