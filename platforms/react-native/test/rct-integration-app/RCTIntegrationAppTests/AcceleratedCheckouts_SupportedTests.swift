import Foundation
import PassKit
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
        ShopifyCheckoutKit.configuration.appearance = .storefront
        ShopifyCheckoutKit.configuration.closeButtonTintColor = nil
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
        invalid.checkoutIdentifier = ["variantId": "gid://shopify/ProductVariant/1", "quantity": 0]

        wait(for: [invalidExpectation], timeout: 2)
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

    func testButtonsViewAcceptsVariantAndQuantity_withDefaultWallets() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let viewExpectation = expectation(description: "variant + quantity renders non-zero height")
        var fulfilledVariant = false

        let view = RCTAcceleratedCheckoutButtonsView()
        view.onSizeChange = { payload in
            if fulfilledVariant { return }
            guard let payload else { return }

            let height = (payload["height"] as? NSNumber)?.doubleValue ?? -1

            // "Wallets" prop is nil, so default rendered (2 buttons)
            if height == WalletButtons.two {
                fulfilledVariant = true
                viewExpectation.fulfill()
            }
        }
        view.checkoutIdentifier = [
            "variantId": "gid://shopify/ProductVariant/123",
            "quantity": NSNumber(value: 2)
        ]

        wait(for: [viewExpectation], timeout: 2)
        XCTAssertNotNil(view.instance)
    }

    func testButtonsViewAcceptsVariantAndQuantity_withExplicitWallets() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let viewExpectation = expectation(description: "variant + quantity renders non-zero height")
        var fulfilledVariant = false

        let view = RCTAcceleratedCheckoutButtonsView()
        view.wallets = ["shopPay"]
        view.onSizeChange = { payload in
            if fulfilledVariant { return }
            guard let payload else { return }

            let height = (payload["height"] as? NSNumber)?.doubleValue ?? -1

            // Wallets prop is explicitly set, so must be respected
            if height == WalletButtons.one {
                fulfilledVariant = true
                viewExpectation.fulfill()
            }
        }
        view.checkoutIdentifier = [
            "variantId": "gid://shopify/ProductVariant/123",
            "quantity": NSNumber(value: 2)
        ]

        wait(for: [viewExpectation], timeout: 2)
        XCTAssertNotNil(view.instance)
    }

    func testButtonsViewRendersEmptyWhenWalletsArrayIsEmpty() {
        configureAcceleratedCheckouts(includeApplePay: false)

        let viewExpectation = expectation(description: "variant + quantity renders non-zero height")
        var fulfilledVariant = false

        let view = RCTAcceleratedCheckoutButtonsView()
        view.wallets = []
        view.onSizeChange = { payload in
            if fulfilledVariant { return }
            guard let payload else { return }

            let height = (payload["height"] as? NSNumber)?.doubleValue ?? -1

            // Wallets prop is explicitly set, so must be respected
            if height == WalletButtons.zero {
                fulfilledVariant = true
                viewExpectation.fulfill()
            }
        }
        view.checkoutIdentifier = [
            "variantId": "gid://shopify/ProductVariant/123",
            "quantity": NSNumber(value: 2)
        ]

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
        for action in ["open", "handled", "cancel"] {
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
