import EmbeddedCheckoutProtocol
@testable import ShopifyCheckoutKit
import WebKit
import XCTest

@MainActor
class CheckoutViewDelegateTests: XCTestCase {
    private var customTitle: String?
    private let checkoutURL = URL(string: "https://checkout-sdk.myshopify.com")!
    private let expectedCloseButtonIdentifier = "shopify_checkout_kit_close_button"
    private var viewController: MockCheckoutWebViewController!
    private var navigationController: UINavigationController!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configure { $0 = Configuration() }
        ShopifyCheckoutKit.configure {
            $0.title = customTitle ?? "Checkout"
        }
        viewController = MockCheckoutWebViewController(
            checkoutURL: checkoutURL
        )

        navigationController = UINavigationController(rootViewController: viewController)
    }

    override func tearDown() async throws {
        customTitle = nil
        ShopifyCheckoutKit.configure { $0 = Configuration() }
        try await super.tearDown()
    }

    func testTitleIsSetToCheckout() {
        XCTAssertEqual(viewController.title, "Checkout")
    }

    func testCheckoutNavigationBarIsTransparent() {
        let checkoutViewController = CheckoutViewController(checkout: checkoutURL)
        let appearances = [
            checkoutViewController.navigationBar.standardAppearance,
            checkoutViewController.navigationBar.scrollEdgeAppearance,
            checkoutViewController.navigationBar.compactAppearance,
            checkoutViewController.navigationBar.compactScrollEdgeAppearance
        ]

        for appearance in appearances {
            XCTAssertEqual(appearance?.backgroundColor?.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)), .clear)
            XCTAssertNil(appearance?.backgroundEffect)
        }
    }

    func testTitleCanBeCustomized() {
        customTitle = "Custom title"
        ShopifyCheckoutKit.configure { $0.title = customTitle ?? "Checkout" }
        viewController = MockCheckoutWebViewController(
            checkoutURL: checkoutURL
        )
        XCTAssertEqual(viewController.title, "Custom title")
    }

    func testInstanceConfigurationIsAppliedToCheckoutChrome() throws {
        var configuration = Configuration()
        configuration.appearance = .app(.light(colors: Colors(
            webViewBackground: .red,
            progressIndicator: .blue,
            closeIconTint: .green
        )))
        configuration.title = "Instance checkout"

        let controller = MockCheckoutWebViewController(
            checkoutURL: checkoutURL,
            configuration: configuration
        )
        controller.loadViewIfNeeded()

        XCTAssertEqual(controller.title, "Instance checkout")
        assertColor(controller.view.backgroundColor, equals: .red)
        assertColor(controller.checkoutView?.backgroundColor, equals: .red)
        assertColor(controller.checkoutView?.underPageBackgroundColor, equals: .red)
        assertColor(controller.progressBar.progressBar.tintColor, equals: .blue)
        let closeButton = try XCTUnwrap(controller.navigationItem.rightBarButtonItem)
        assertColor(closeButton.tintColor, equals: .green)
        XCTAssertNotNil(closeButton.image)
    }

    func testCheckoutViewDidFailWithErrorDismissesViewController() {
        viewController.checkoutViewDidFailWithError(error: CheckoutError(code: .httpError, message: "error", httpStatusCode: 500))

        XCTAssertTrue(viewController.dismissCalled)
    }

    func testCloseInvokesDismissDelegate() {
        var didDismiss = false
        viewController.onDismiss = {
            didDismiss = true
        }

        viewController.close()

        XCTAssertTrue(didDismiss)
    }

    func testLifecycleEventsInvokeDelegate() {
        let delegate = MockCheckoutDelegate()
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL, delegate: delegate)
        let checkout = Checkout(
            id: "checkout-1",
            status: .incomplete,
            currency: "USD",
            lineItems: [],
            totals: []
        )

        controller.checkoutDidStart(checkout)
        controller.checkoutDidUpdate(checkout)
        controller.checkoutDidComplete(checkout)

        XCTAssertEqual(delegate.startEvents.map(\.checkout), [checkout])
        XCTAssertEqual(delegate.updateEvents.map(\.checkout), [checkout])
        XCTAssertEqual(delegate.completeEvents.map(\.checkout), [checkout])
    }

    func testPresentationControllerDidDismissInvokesDismissDelegate() throws {
        var didDismiss = false
        viewController.onDismiss = {
            didDismiss = true
        }

        let presentationController = try XCTUnwrap(UIViewController().presentationController)
        viewController.presentationControllerDidDismiss(presentationController)

        XCTAssertTrue(didDismiss)
    }

    func testCheckoutViewDidStartNavigationShowsProgressBar() {
        XCTAssertFalse(viewController.progressBar.isHidden)
        XCTAssertTrue(viewController.initialNavigation)

        viewController.checkoutViewDidStartNavigation()
        viewController.checkoutViewDidFinishNavigation()
        XCTAssertFalse(viewController.progressBar.isHidden)
    }

    func testCloseButtonUsesSystemDefaultWhenCloseIconTintIsNil() {
        ShopifyCheckoutKit.configure { $0.appearance = .storefront() }
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)

        let closeButton = controller.navigationItem.rightBarButtonItem
        XCTAssertNotNil(closeButton)
        XCTAssertEqual(closeButton?.style, .plain)
        XCTAssertNil(closeButton?.image)
        XCTAssertEqual(closeButton?.accessibilityIdentifier, expectedCloseButtonIdentifier)
    }

    func testCloseButtonUsesCustomImageAndTintWhenCloseIconTintIsSet() {
        let customColor = UIColor.red
        ShopifyCheckoutKit.configure { $0.appearance = .storefront(colors: Colors(closeIconTint: customColor)) }
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)

        let closeButton = controller.navigationItem.rightBarButtonItem
        XCTAssertNotNil(closeButton)
        XCTAssertEqual(closeButton?.style, .plain)
        XCTAssertNotNil(closeButton?.image)
        XCTAssertEqual(closeButton?.tintColor, customColor)
        XCTAssertEqual(closeButton?.accessibilityIdentifier, expectedCloseButtonIdentifier)
    }

    func testCloseButtonHasAnImageWhenCloseIconTintIsSet() {
        ShopifyCheckoutKit.configure { $0.appearance = .storefront(colors: Colors(closeIconTint: .blue)) }
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)

        let closeButton = controller.navigationItem.rightBarButtonItem
        XCTAssertNotNil(closeButton?.image)
    }

    private func assertColor(_ actual: UIColor?, equals expected: UIColor, file: StaticString = #filePath, line: UInt = #line) {
        let actualComponents = actual?.cgColor.components
        let expectedComponents = expected.cgColor.components

        XCTAssertEqual(actualComponents, expectedComponents, file: file, line: line)
    }
}

@MainActor
protocol Dismissible: AnyObject {
    func dismiss(animated flag: Bool, completion: (() -> Void)?)
}

extension CheckoutWebViewController: Dismissible {}

class MockCheckoutWebViewController: CheckoutWebViewController {
    private(set) var dismissCalled = false

    override func dismiss(animated flag: Bool, completion: (() -> Void)? = nil) {
        dismissCalled = true
        super.dismiss(animated: flag, completion: completion)
    }
}
