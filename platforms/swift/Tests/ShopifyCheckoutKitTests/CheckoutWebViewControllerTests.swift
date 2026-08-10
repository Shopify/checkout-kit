import EmbeddedCheckoutProtocol
@testable import ShopifyCheckoutKit
import WebKit
import XCTest

@MainActor
class TestableCheckoutWebViewController: CheckoutWebViewController {
    var dismissCalled = false
    var dismissAnimated: Bool = false
    var testIsBeingDismissed = false

    override func dismiss(animated flag: Bool, completion: (() -> Void)? = nil) {
        dismissCalled = true
        dismissAnimated = flag
        completion?()
    }

    override var isBeingDismissed: Bool {
        testIsBeingDismissed
    }
}

@MainActor
class CheckoutWebViewControllerTests: XCTestCase {
    private let url = URL(string: "https://shopify1.shopify.com/checkouts/cn/123")!

    private let sampleError = CheckoutError(code: .cartExpired, message: "Test")

    func test_init_withNilEntryPoint_shouldSetCorrectUserAgent() {
        let viewController = CheckoutWebViewController(checkoutURL: url, entryPoint: nil)

        let expectedUserAgent = CheckoutBridge.applicationName(entryPoint: nil)

        XCTAssertEqual(viewController.checkoutView?.configuration.applicationNameForUserAgent, expectedUserAgent)
    }

    func test_init_withAcceleratedCheckoutsEntryPoint_shouldSetCorrectUserAgent() {
        let viewController = CheckoutWebViewController(checkoutURL: url, entryPoint: .acceleratedCheckouts)

        let expectedUserAgent = CheckoutBridge.applicationName(entryPoint: .acceleratedCheckouts)

        XCTAssertEqual(viewController.checkoutView?.configuration.applicationNameForUserAgent, expectedUserAgent)
    }

    func test_init_adjustsCheckoutContentForSafeArea() {
        let viewController = CheckoutWebViewController(checkoutURL: url, entryPoint: nil)

        XCTAssertEqual(viewController.checkoutView?.scrollView.contentInsetAdjustmentBehavior, .automatic)
    }

    func test_viewDidLoad_extendsCheckoutViewBehindNavigationBar() throws {
        let viewController = CheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        viewController.loadViewIfNeeded()

        let checkoutView = try XCTUnwrap(viewController.checkoutView)
        let topConstraint = try XCTUnwrap(
            viewController.view.constraints.first {
                $0.firstItem === checkoutView && $0.firstAttribute == .top
            }
        )

        XCTAssertTrue(topConstraint.secondItem === viewController.view)
        XCTAssertEqual(topConstraint.secondAttribute, .top)
    }

    func test_viewDidLoad_keepsProgressBarBelowNavigationBar() throws {
        let viewController = CheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        viewController.loadViewIfNeeded()

        let topConstraint = try XCTUnwrap(
            viewController.view.constraints.first {
                $0.firstItem === viewController.progressBar && $0.firstAttribute == .top
            }
        )

        XCTAssertTrue(topConstraint.secondItem === viewController.view.safeAreaLayoutGuide)
        XCTAssertEqual(topConstraint.secondAttribute, .top)
    }

    func test_checkoutViewDidFailWithError_dismissesAndInvokesOnFail() {
        var failCalled = false
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        viewController.onFail = { _ in failCalled = true }

        viewController.checkoutViewDidFailWithError(error: sampleError)

        XCTAssertTrue(failCalled)
        XCTAssertTrue(viewController.dismissCalled)
        XCTAssertTrue(viewController.dismissAnimated)
    }

    func test_checkoutViewDidFailWithError_invokesDelegate() {
        let delegate = MockCheckoutDelegate()
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, delegate: delegate, entryPoint: nil)

        viewController.checkoutViewDidFailWithError(error: sampleError)

        XCTAssertEqual(delegate.didFailErrors.count, 1)
    }

    func test_presentationControllerDidDismiss_invokesDelegateCancel() {
        let delegate = MockCheckoutDelegate()
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, delegate: delegate, entryPoint: nil)

        viewController.presentationControllerDidDismiss(UIPresentationController(presentedViewController: viewController, presenting: nil))

        XCTAssertEqual(delegate.didDismissCount, 1)
    }

    func test_presentationControllerDidDismiss_doesNotCleanUpBeforeViewDisappears() throws {
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        ShopifyCheckoutKit.preload(checkout: url)
        let viewController = TestableCheckoutWebViewController(checkoutURL: CheckoutURLDecorator.decorate(url), entryPoint: nil)
        viewController.loadViewIfNeeded()

        let checkoutView = try XCTUnwrap(viewController.checkoutView)
        XCTAssertTrue(checkoutView.isBridgeAttached)
        XCTAssertNotNil(checkoutView.superview)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())

        viewController.presentationControllerDidDismiss(UIPresentationController(presentedViewController: viewController, presenting: nil))

        XCTAssertNotNil(viewController.checkoutView)
        XCTAssertNotNil(checkoutView.superview)
        XCTAssertTrue(checkoutView.isBridgeAttached)
    }

    func test_viewDidDisappear_cleansUpConsumedPreloadedWebViewWhenDismissed() throws {
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        ShopifyCheckoutKit.preload(checkout: url)
        let viewController = TestableCheckoutWebViewController(checkoutURL: CheckoutURLDecorator.decorate(url), entryPoint: nil)
        viewController.loadViewIfNeeded()

        let checkoutView = try XCTUnwrap(viewController.checkoutView)
        XCTAssertTrue(checkoutView.isBridgeAttached)
        XCTAssertNotNil(checkoutView.superview)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())

        viewController.testIsBeingDismissed = true
        viewController.viewDidDisappear(false)

        XCTAssertNil(viewController.checkoutView)
        XCTAssertNil(checkoutView.superview)
        XCTAssertNil(checkoutView.viewDelegate)
        XCTAssertNil(checkoutView.client)
        XCTAssertTrue(checkoutView.isBridgeAttached)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
    }

    func test_checkoutViewDidFailWithError_doesNotCleanUpBeforeViewDisappears() throws {
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        viewController.loadViewIfNeeded()
        let checkoutView = try XCTUnwrap(viewController.checkoutView)

        viewController.checkoutViewDidFailWithError(error: sampleError)

        XCTAssertNotNil(viewController.checkoutView)
        XCTAssertNotNil(checkoutView.superview)
        XCTAssertTrue(checkoutView.isBridgeAttached)
    }

    func test_viewDidDisappear_cleansUpPresentedWebViewWhenDismissed() throws {
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        viewController.loadViewIfNeeded()
        let checkoutView = try XCTUnwrap(viewController.checkoutView)

        viewController.testIsBeingDismissed = true
        viewController.viewDidDisappear(false)

        XCTAssertNil(viewController.checkoutView)
        XCTAssertNil(checkoutView.superview)
        XCTAssertFalse(checkoutView.isBridgeAttached)
    }
}
