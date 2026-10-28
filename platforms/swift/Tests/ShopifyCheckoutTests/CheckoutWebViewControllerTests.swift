import CheckoutKitTelemetry
import EmbeddedCheckoutProtocol
@testable import ShopifyCheckoutKit
import WebKit
import XCTest

@MainActor
class TestableCheckoutWebViewController: CheckoutWebViewController {
    var dismissCalled = false
    var dismissAnimated: Bool = false
    var completesDismissalImmediately = true
    var testIsBeingDismissed = false
    private var dismissCompletion: (() -> Void)?

    override func dismiss(animated flag: Bool, completion: (() -> Void)? = nil) {
        dismissCalled = true
        dismissAnimated = flag
        if completesDismissalImmediately {
            completion?()
        } else {
            dismissCompletion = completion
        }
    }

    func completeDismissal() {
        let completion = dismissCompletion
        dismissCompletion = nil
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

    func test_close_invokesDismissalAfterDismissCompletes() {
        var lifecycleEvents: [String] = []
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        viewController.completesDismissalImmediately = false
        viewController.onDismiss = { lifecycleEvents.append("dismiss") }

        viewController.close()

        XCTAssertTrue(viewController.dismissCalled)
        XCTAssertTrue(viewController.dismissAnimated)
        XCTAssertEqual(lifecycleEvents, [])

        viewController.completeDismissal()

        XCTAssertEqual(lifecycleEvents, ["dismiss"])
    }

    func test_checkoutViewDidFailWithError_invokesFailureThenDismissalAndDismisses() {
        var lifecycleEvents: [String] = []
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        viewController.completesDismissalImmediately = false
        viewController.onFail = { _ in lifecycleEvents.append("fail") }
        viewController.onDismiss = { lifecycleEvents.append("dismiss") }

        viewController.checkoutViewDidFailWithError(error: sampleError)

        XCTAssertEqual(lifecycleEvents, ["fail"])
        XCTAssertTrue(viewController.dismissCalled)
        XCTAssertTrue(viewController.dismissAnimated)

        viewController.completeDismissal()

        XCTAssertEqual(lifecycleEvents, ["fail", "dismiss"])
    }

    func test_checkoutViewDidFailWithError_invokesFailureThenDismissalDelegateCallbacks() {
        let delegate = MockCheckoutDelegate()
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, delegate: delegate, entryPoint: nil)

        viewController.checkoutViewDidFailWithError(error: sampleError)

        XCTAssertEqual(delegate.failureEvents.count, 1)
        XCTAssertEqual(delegate.failureEvents.first?.error.code, sampleError.code)
        XCTAssertEqual(delegate.didDismissCount, 1)
    }

    func test_checkoutViewDidFailWithError_notifiesDismissalOnceWhenPresentationAlsoReportsDismissal() {
        let delegate = MockCheckoutDelegate()
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, delegate: delegate, entryPoint: nil)

        viewController.checkoutViewDidFailWithError(error: sampleError)
        viewController.presentationControllerDidDismiss(
            UIPresentationController(presentedViewController: viewController, presenting: nil)
        )

        XCTAssertEqual(delegate.didDismissCount, 1)
    }

    func test_close_notifiesDismissalOnceWhenPresentationAlsoReportsDismissal() {
        let delegate = MockCheckoutDelegate()
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, delegate: delegate, entryPoint: nil)
        viewController.completesDismissalImmediately = false

        viewController.close()
        viewController.presentationControllerDidDismiss(
            UIPresentationController(presentedViewController: viewController, presenting: nil)
        )
        viewController.completeDismissal()

        XCTAssertEqual(delegate.didDismissCount, 1)
    }

    func test_programmaticDismissDoesNotNotifyDismissal() async {
        let delegate = MockCheckoutDelegate()
        let checkoutViewController = CheckoutViewController(checkout: url, delegate: delegate)
        let dismissed = expectation(description: "Programmatic dismissal should complete")

        checkoutViewController.dismiss(animated: true) { dismissed.fulfill() }

        await fulfillment(of: [dismissed], timeout: 1.0)
        XCTAssertEqual(delegate.didDismissCount, 0)
    }

    func test_presentationControllerDidDismiss_invokesDelegateCancel() {
        let delegate = MockCheckoutDelegate()
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, delegate: delegate, entryPoint: nil)

        viewController.presentationControllerDidDismiss(UIPresentationController(presentedViewController: viewController, presenting: nil))

        XCTAssertEqual(delegate.didDismissCount, 1)
    }

    func test_linkClickUsesDelegateAction() async throws {
        let delegate = MockCheckoutDelegate()
        delegate.linkAction = .handled
        let viewController = TestableCheckoutWebViewController(checkoutURL: url, delegate: delegate, entryPoint: nil)
        let body = #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"link-1","params":{"url":"https://example.com/policy"}}"#

        let rawResponse = await viewController.checkoutView?.defaultsClient.process(body)
        let response = try XCTUnwrap(rawResponse)
        let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        let result = try XCTUnwrap(parsed["result"] as? [String: Any])
        let ucp = try XCTUnwrap(result["ucp"] as? [String: Any])

        XCTAssertEqual(ucp["status"] as? String, "success")
        XCTAssertEqual(delegate.clickedLinks, try [CheckoutLink(url: XCTUnwrap(URL(string: "https://example.com/policy")))])
    }

    func test_presentationControllerDidDismiss_doesNotCleanUpBeforeViewDisappears() throws {
        ShopifyCheckout.configure { $0.preloading.enabled = true }
        ShopifyCheckout.preload(checkout: url)
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
        ShopifyCheckout.configure { $0.preloading.enabled = true }
        ShopifyCheckout.preload(checkout: url)
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

    func test_viewDidDisappear_preservesReplacementPreloadWhenPresentedCheckoutIsDismissed() throws {
        ShopifyCheckout.clearPreload()
        defer { ShopifyCheckout.clearPreload() }
        ShopifyCheckout.configure { $0.preloading.enabled = true }
        ShopifyCheckout.preload(checkout: url)
        let checkoutURL = CheckoutURLDecorator.decorate(url)
        let viewController = TestableCheckoutWebViewController(checkoutURL: checkoutURL, entryPoint: nil)
        viewController.loadViewIfNeeded()
        let presentedView = try XCTUnwrap(viewController.checkoutView)

        ShopifyCheckout.preload(checkout: url)
        let replacementView = CheckoutWebView.for(checkout: checkoutURL)

        XCTAssertFalse(replacementView === presentedView)
        XCTAssertTrue(CheckoutWebView.preloadCache.contains(replacementView))
        XCTAssertTrue(presentedView.isBridgeAttached)

        viewController.testIsBeingDismissed = true
        viewController.viewDidDisappear(false)

        XCTAssertFalse(presentedView.isBridgeAttached)
        XCTAssertTrue(replacementView.isBridgeAttached)
        XCTAssertTrue(CheckoutWebView.preloadCache.contains(replacementView))
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

    func test_cleanUp_recordsConfirmationReachedWithoutCompletion() {
        let recorder = ConfirmationTelemetryRecorder()
        CheckoutTelemetry.overrideRecorderForTesting(recorder)
        defer { CheckoutTelemetry.overrideRecorderForTesting(nil) }
        let viewController = CheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        viewController.checkoutView = StubURLCheckoutWebView(currentURL: confirmationURL)

        viewController.cleanUpCheckoutView()

        XCTAssertEqual(recorder.completionReceived, [false])
    }

    func test_cleanUp_recordsConfirmationReachedAfterCompletion() {
        let recorder = ConfirmationTelemetryRecorder()
        CheckoutTelemetry.overrideRecorderForTesting(recorder)
        defer { CheckoutTelemetry.overrideRecorderForTesting(nil) }
        let viewController = CheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        viewController.checkoutView = StubURLCheckoutWebView(currentURL: confirmationURL)

        viewController.checkoutDidComplete(
            Checkout(id: "checkout-1", status: .completed, currency: "USD", lineItems: [], totals: [])
        )
        viewController.cleanUpCheckoutView()

        XCTAssertEqual(recorder.completionReceived, [true])
    }

    func test_cleanUp_recordsConfirmationReachedOncePerViewWhenPresentedAgain() {
        let recorder = ConfirmationTelemetryRecorder()
        CheckoutTelemetry.overrideRecorderForTesting(recorder)
        defer { CheckoutTelemetry.overrideRecorderForTesting(nil) }
        let checkoutView = StubURLCheckoutWebView(currentURL: confirmationURL)
        let firstPresentation = CheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        firstPresentation.checkoutView = checkoutView
        firstPresentation.cleanUpCheckoutView()

        let secondPresentation = CheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        secondPresentation.checkoutView = checkoutView
        secondPresentation.cleanUpCheckoutView()

        XCTAssertEqual(recorder.completionReceived, [false])
    }

    func test_cleanUp_recordsCompletionDismissedBeforeConfirmationPage() {
        let recorder = ConfirmationTelemetryRecorder()
        CheckoutTelemetry.overrideRecorderForTesting(recorder)
        defer { CheckoutTelemetry.overrideRecorderForTesting(nil) }
        let viewController = CheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        viewController.checkoutView = StubURLCheckoutWebView(currentURL: url)

        viewController.checkoutDidComplete(
            Checkout(id: "checkout-1", status: .completed, currency: "USD", lineItems: [], totals: [])
        )
        viewController.cleanUpCheckoutView()

        XCTAssertEqual(recorder.completionReceived, [true])
    }

    func test_cleanUp_doesNotRecordConfirmationReachedBeforeConfirmationPage() {
        let recorder = ConfirmationTelemetryRecorder()
        CheckoutTelemetry.overrideRecorderForTesting(recorder)
        defer { CheckoutTelemetry.overrideRecorderForTesting(nil) }
        let viewController = CheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        viewController.checkoutView = StubURLCheckoutWebView(currentURL: url)

        viewController.cleanUpCheckoutView()

        XCTAssertEqual(recorder.completionReceived, [])
    }

    private let confirmationURL = URL(string: "https://shopify1.shopify.com/checkouts/cn/123/thank-you")!
}

@MainActor
private final class StubURLCheckoutWebView: CheckoutWebView {
    private var currentURL: URL?

    convenience init(currentURL: URL) {
        self.init()
        self.currentURL = currentURL
    }

    override var url: URL? {
        currentURL
    }
}

private final class ConfirmationTelemetryRecorder: CheckoutTelemetryRecording, @unchecked Sendable {
    private(set) var completionReceived: [Bool] = []

    func recordError(_: TelemetryErrorMetric) {}
    func recordProtocolDecodeError(_: TelemetryProtocolDecodeErrorMetric) {}
    func recordConfirmationReached(_ metric: TelemetryConfirmationReachedMetric) {
        completionReceived.append(metric.completionReceived)
    }

    func recordNavigationRetry(_: TelemetryNavigationRetryMetric) {}
    func recordNavigationDuration(_: TelemetryNavigationDurationMetric) {}
    func recordReadyDuration(_: TelemetryReadyDurationMetric) {}
}
