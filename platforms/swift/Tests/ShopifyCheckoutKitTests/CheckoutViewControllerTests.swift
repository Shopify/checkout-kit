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
            XCTAssertNil(appearance?.backgroundColor)
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

    func testCloseButtonUsesSystemDefaultWhenTintColorIsNil() {
        ShopifyCheckoutKit.configuration.closeButtonTintColor = nil
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)

        let closeButton = controller.navigationItem.rightBarButtonItem
        XCTAssertNotNil(closeButton)
        XCTAssertEqual(closeButton?.style, .plain)
        XCTAssertNil(closeButton?.image)
        XCTAssertEqual(closeButton?.accessibilityIdentifier, expectedCloseButtonIdentifier)
    }

    func testCloseButtonUsesCustomImageAndTintWhenColorIsSet() {
        let customColor = UIColor.red
        ShopifyCheckoutKit.configuration.closeButtonTintColor = customColor
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)

        let closeButton = controller.navigationItem.rightBarButtonItem
        XCTAssertNotNil(closeButton)
        XCTAssertEqual(closeButton?.style, .plain)
        XCTAssertNotNil(closeButton?.image)
        XCTAssertEqual(closeButton?.tintColor, customColor)
        XCTAssertEqual(closeButton?.accessibilityIdentifier, expectedCloseButtonIdentifier)
    }

    func testCloseButtonImageIsXMarkCircleFill() {
        ShopifyCheckoutKit.configuration.closeButtonTintColor = .blue
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)

        let closeButton = controller.navigationItem.rightBarButtonItem
        XCTAssertNotNil(closeButton?.image)
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
