@testable import ShopifyCheckoutKit
import WebKit
import XCTest

class TestableCheckoutWebViewController: CheckoutWebViewController {
    var dismissCalled = false
    var dismissAnimated: Bool = false

    override func dismiss(animated flag: Bool, completion: (() -> Void)? = nil) {
        dismissCalled = true
        dismissAnimated = flag
        completion?()
    }
}

class CheckoutWebViewControllerTests: XCTestCase {
    private let url = URL(string: "http://shopify1.shopify.com/checkouts/cn/123")!

    private let sampleError = CheckoutError.checkoutExpired(message: "Test", code: .cartExpired)

    func test_init_withNilEntryPoint_shouldSetCorrectUserAgent() {
        let viewController = CheckoutWebViewController(checkoutURL: url, entryPoint: nil)

        let expectedUserAgent = CheckoutBridge.applicationName(entryPoint: nil)

        XCTAssertEqual(viewController.checkoutView.configuration.applicationNameForUserAgent, expectedUserAgent)
    }

    func test_init_withAcceleratedCheckoutsEntryPoint_shouldSetCorrectUserAgent() {
        let viewController = CheckoutWebViewController(checkoutURL: url, entryPoint: .acceleratedCheckouts)

        let expectedUserAgent = CheckoutBridge.applicationName(entryPoint: .acceleratedCheckouts)

        XCTAssertEqual(viewController.checkoutView.configuration.applicationNameForUserAgent, expectedUserAgent)
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

        XCTAssertEqual(delegate.didCancelCount, 1)
    }
}
