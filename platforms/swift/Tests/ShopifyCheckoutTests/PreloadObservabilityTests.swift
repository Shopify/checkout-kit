import CheckoutKitTelemetry
import Combine
import EmbeddedCheckoutProtocol
@testable import ShopifyCheckoutKit
import WebKit
import XCTest

@MainActor
class PreloadObservabilityTests: XCTestCase {
    private var url = URL(string: "https://shopify1.shopify.com/checkouts/cn/123")!
    private var telemetryRecorder: PreloadTelemetryRecorder!

    override func setUp() async throws {
        try await super.setUp()
        telemetryRecorder = PreloadTelemetryRecorder()
        CheckoutTelemetry.overrideRecorderForTesting(telemetryRecorder)
        ShopifyCheckout.configure { $0.preloading.enabled = true }
        CheckoutWebView.invalidate()
    }

    override func tearDown() async throws {
        CheckoutWebView.invalidate()
        ShopifyCheckout.configure { $0.preloading.enabled = true }
        CheckoutTelemetry.overrideRecorderForTesting(nil)
        try await super.tearDown()
    }

    func testCloseButtonReportsTheHeldStateBeforeTheAppHearsDismissal() throws {
        let (controller, states) = try presentPreloadedCheckout()
        controller.completesDismissalImmediately = false
        var dismissals = 0
        controller.onDismiss = { dismissals += 1 }

        CheckoutWebView.preloadCache.evict(with: .idle(reason: .invalidated))
        XCTAssertEqual(states.values, [.loading])

        controller.close()
        controller.testIsBeingDismissed = true
        controller.viewDidDisappear(true)
        XCTAssertEqual(states.values, [.loading, .idle(reason: .invalidated)])
        XCTAssertEqual(dismissals, 0)

        controller.completeDismissal()
        XCTAssertEqual(dismissals, 1)
    }

    func testSwipeDismissalReportsTheHeldState() throws {
        let (controller, states) = try presentPreloadedCheckout()

        CheckoutWebView.preloadCache.evict(with: .failed(reason: .webContentUnavailable, message: "Web content went away."))
        XCTAssertEqual(states.values, [.loading])

        controller.testIsBeingDismissed = true
        controller.viewDidDisappear(true)
        controller.presentationControllerDidDismiss(
            UIPresentationController(presentedViewController: controller, presenting: nil)
        )

        XCTAssertEqual(states.values, [
            .loading,
            .failed(reason: .webContentUnavailable, message: "Web content went away.")
        ])
    }

    func testDismissingTheAppsSheetReportsTheHeldStateForNestedCheckout() throws {
        let (controller, states) = try presentPreloadedCheckout()
        let sheet = DismissingViewController()
        sheet.addChild(controller)
        controller.didMove(toParent: sheet)

        CheckoutWebView.preloadCache.evict(with: .idle(reason: .invalidated))
        XCTAssertEqual(states.values, [.loading])

        controller.viewDidDisappear(true)

        XCTAssertEqual(states.values, [.loading, .idle(reason: .invalidated)])
    }

    func testCheckoutCoveredWithoutDismissalKeepsHoldingItsState() throws {
        let (controller, states) = try presentPreloadedCheckout()
        defer { controller.cleanUpCheckoutView() }

        CheckoutWebView.preloadCache.evict(with: .idle(reason: .invalidated))
        controller.viewDidDisappear(true)

        XCTAssertEqual(states.values, [.loading])
    }

    func testClearingThePreloadWhilePresentedReportsInvalidatedAtDismissal() throws {
        let (controller, states) = try presentPreloadedCheckout()

        ShopifyCheckout.clearPreload()
        XCTAssertEqual(states.values, [.loading])
        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())

        controller.testIsBeingDismissed = true
        controller.viewDidDisappear(true)

        XCTAssertEqual(states.values, [.loading, .idle(reason: .invalidated)])
    }

    func testInvalidPreloadWhileAnotherIsPresentedReportsItsFailureImmediately() throws {
        let (controller, firstStates) = try presentPreloadedCheckout()
        let insecureURL = try XCTUnwrap(URL(string: "http://shopify.com/checkouts/cn/123"))

        let secondStates = StateLog()
        let second = try XCTUnwrap(ShopifyCheckout.preload(checkout: insecureURL))
        second.onStateChange = { secondStates.values.append($0) }
        secondStates.preload = second

        XCTAssertEqual(secondStates.values.count, 1)
        guard case .failed(reason: .navigationFailed, _) = secondStates.values.first else {
            return XCTFail("Expected an immediate navigation failure, got \(secondStates.values)")
        }

        controller.testIsBeingDismissed = true
        controller.viewDidDisappear(true)

        XCTAssertEqual(secondStates.values.count, 1)
        XCTAssertEqual(firstStates.values, [.loading])
    }

    /// Presents a controller that reuses a background preload, and records the preload's states.
    private func presentPreloadedCheckout() throws -> (TestableCheckoutWebViewController, StateLog) {
        let states = StateLog()
        let preload = try XCTUnwrap(ShopifyCheckout.preload(checkout: url))
        preload.onStateChange = { states.values.append($0) }
        states.preload = preload
        let controller = TestableCheckoutWebViewController(
            checkoutURL: CheckoutURLDecorator.decorate(url),
            entryPoint: nil
        )
        controller.loadViewIfNeeded()
        let view = try XCTUnwrap(controller.checkoutView)
        XCTAssertTrue(view.isPresented)
        XCTAssertTrue(CheckoutWebView.preloadCache.contains(view))
        return (controller, states)
    }

    func testNewCacheStartsIdleWithoutReason() {
        let cache = PreloadCache()
        let preload = CheckoutPreload(cache: cache)
        var states: [PreloadState] = []
        preload.onStateChange = { states.append($0) }

        XCTAssertEqual(preload.state, .idle())
        XCTAssertEqual(states, [.idle()])
    }

    func testPreloadReturnsHandleInLoadingState() {
        let preload = ShopifyCheckout.preload(checkout: url)

        guard case .loading = preload?.state else {
            return XCTFail("expected .loading, got \(String(describing: preload?.state))")
        }
    }

    func test_idleReason_unknownValue_reachesObserverAndUsesFallback() {
        let preload = ShopifyCheckout.preload(checkout: url)
        let reason = PreloadState.IdleReason(rawValue: "futureReason")
        var observedReason: PreloadState.IdleReason?
        var usedFallback = false
        preload?.onStateChange = { state in
            guard case let .idle(reason?) = state else { return }
            observedReason = reason
            switch reason {
            case .invalidated, .expired:
                XCTFail("Unexpected known reason")
            default:
                usedFallback = true
            }
        }

        CheckoutWebView.preloadCache.evict(with: .idle(reason: reason))

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .idle(reason: reason))
            XCTAssertEqual(observedReason?.rawValue, "futureReason")
            XCTAssertTrue(usedFallback)
        }
    }

    func testClearPreloadEmptyCachePreservesInitialStateWithoutNotifying() {
        let cache = PreloadCache()
        let preload = CheckoutPreload(cache: cache)
        var states: [PreloadState] = []
        preload.onStateChange = { states.append($0) }

        cache.evict(with: .idle(reason: .invalidated))

        XCTAssertEqual(preload.state, .idle())
        XCTAssertEqual(states, [.idle()])
    }

    func testClearPreloadEmptyCachePreservesExpiredStateWithoutNotifying() {
        let preload = ShopifyCheckout.preload(checkout: url)
        CheckoutWebView.preloadCache.expire()
        var states: [PreloadState] = []
        preload?.onStateChange = { states.append($0) }

        ShopifyCheckout.clearPreload()

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .idle(reason: .expired))
            XCTAssertEqual(states, [.idle(reason: .expired)])
        }
    }

    func testClearPreloadEmptyCachePreservesFailureWithoutNotifying() {
        let preload = ShopifyCheckout.preload(checkout: url)
        CheckoutWebView.preloadCache.keepAliveDidFail()
        let failure = PreloadState.failed(reason: .webContentUnavailable, message: "Preload keep-alive failed.")
        var states: [PreloadState] = []
        preload?.onStateChange = { states.append($0) }

        ShopifyCheckout.clearPreload()

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, failure)
            XCTAssertEqual(states, [failure])
        }
    }

    func testHTTPPreloadTransitionsToNavigationFailure() throws {
        let insecureURL = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123"))

        let preload = ShopifyCheckout.preload(checkout: insecureURL)

        XCTAssertEqual(
            preload?.state,
            .failed(reason: .navigationFailed, message: "Checkout URL must use HTTPS.")
        )
    }

    func testClearPreloadTransitionsToIdle() {
        let preload = ShopifyCheckout.preload(checkout: url)

        ShopifyCheckout.clearPreload()

        guard case .idle(reason: .invalidated) = preload?.state else {
            return XCTFail("expected .idle, got \(String(describing: preload?.state))")
        }
    }

    func testClearPreloadDoesNotDetachPresentedCheckout() {
        let view = CheckoutWebView(entryPoint: nil)
        view.isPresented = true
        _ = CheckoutWebView.preloadCache.store(
            view,
            for: PreloadKey(url: url, entryPoint: nil)
        )

        ShopifyCheckout.clearPreload()

        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertTrue(view.isBridgeAttached)
    }

    func testOnStateChangeReceivesTransitions() {
        var states: [PreloadState] = []

        let preload = ShopifyCheckout.preload(checkout: url)
        preload?.onStateChange = { states.append($0) }
        ShopifyCheckout.clearPreload()

        withExtendedLifetime(preload) {
            XCTAssertEqual(states, [.loading, .idle(reason: .invalidated)])
        }
    }

    func testNewObserverReplacesPrevious() {
        var firstStates: [PreloadState] = []
        var secondStates: [PreloadState] = []

        let first = ShopifyCheckout.preload(checkout: url)
        first?.onStateChange = { firstStates.append($0) }
        let second = ShopifyCheckout.preload(checkout: url)
        second?.onStateChange = { secondStates.append($0) }

        ShopifyCheckout.clearPreload()

        withExtendedLifetime((first, second)) {
            XCTAssertEqual(firstStates, [.loading])
            XCTAssertEqual(secondStates, [.loading, .idle(reason: .invalidated)])
        }
    }

    func testPublishedStateReceivesTransitions() {
        let preload = ShopifyCheckout.preload(checkout: url)
        var states: [PreloadState] = []
        let cancellable = preload?.$state.sink { states.append($0) }

        ShopifyCheckout.clearPreload()

        withExtendedLifetime((preload, cancellable)) {
            XCTAssertEqual(states, [.loading, .idle(reason: .invalidated)])
        }
    }

    func testReadyTransitionOnEcReady() {
        let preload = ShopifyCheckout.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        acceptMessagesFromCheckout(view)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: Self.readyBody))

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .ready)
        }
    }

    func testDidFinishAloneDoesNotReportReady() {
        let preload = ShopifyCheckout.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        view.webView(view, didFinish: nil)

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .loading)
        }
    }

    func testEcReadyBeforePresentationIsKeptWhenNavigationFinishesAfterPresentation() {
        let preload = ShopifyCheckout.preload(checkout: url)
        var states: [PreloadState] = []
        preload?.onStateChange = { states.append($0) }
        let view = CheckoutWebView(entryPoint: nil)
        acceptMessagesFromCheckout(view)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: Self.readyBody))
        XCTAssertTrue(CheckoutWebView.for(checkout: url) === view)
        view.webView(view, didFinish: nil)

        withExtendedLifetime(preload) {
            XCTAssertEqual(states, [.loading, .ready])
        }
    }

    func testPreloadPresentedWhileLoadingReportsReadyWhenCheckoutSendsReady() {
        let preload = ShopifyCheckout.preload(checkout: url)
        var states: [PreloadState] = []
        preload?.onStateChange = { states.append($0) }
        let view = CheckoutWebView(entryPoint: nil)
        acceptMessagesFromCheckout(view)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        let presented = CheckoutWebView.for(checkout: url)
        XCTAssertTrue(presented === view)
        view.webView(view, didFinish: nil)
        XCTAssertEqual(states, [.loading])

        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: Self.readyBody))
        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: Self.readyBody))

        withExtendedLifetime(preload) {
            XCTAssertEqual(states, [.loading, .ready])
        }
    }

    func testPresentedCloudflareChallengeDoesNotReportReadyWhenItFinishes() throws {
        let preload = ShopifyCheckout.preload(checkout: url)
        var states: [PreloadState] = []
        preload?.onStateChange = { states.append($0) }
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))
        XCTAssertTrue(CheckoutWebView.for(checkout: url) === view)
        view.isPresented = true
        defer { view.isPresented = false }
        let response = try XCTUnwrap(
            HTTPURLResponse(url: url, statusCode: 403, httpVersion: nil, headerFields: ["cf-mitigated": "challenge"])
        )

        XCTAssertEqual(view.handleResponse(response), .allow)
        view.webView(view, didFinish: nil)

        withExtendedLifetime(preload) {
            XCTAssertEqual(states, [.loading])
        }
        XCTAssertTrue(CheckoutWebView.preloadCache.contains(view))
    }

    func testPresentedViewPastItsTTLIsStillCachedUntilDismissed() {
        var now = Date(timeIntervalSince1970: 1000)
        let cache = PreloadCache(now: { now })
        defer { cache.invalidate() }
        let key = PreloadKey(url: url, entryPoint: nil)
        let view = CheckoutWebView(entryPoint: nil)
        XCTAssertTrue(cache.store(view, for: key))
        XCTAssertTrue(cache.view(for: key) === view)
        view.isPresented = true

        now.addTimeInterval(10 * 60)

        XCTAssertTrue(cache.contains(view))
        view.isPresented = false
        XCTAssertFalse(cache.contains(view))
    }

    private static let readyBody = #"{"jsonrpc":"2.0","method":"ec.ready","id":"r1","params":{"delegate":[]}}"#

    private func acceptMessagesFromCheckout(_ view: CheckoutWebView) {
        view.messageIsMainFrame = { _ in true }
        view.messageRequestURL = { _ in nil }
        view.messageOrigin = { _ in MessageOrigin(scheme: "https", host: "shopify1.shopify.com", port: nil) }
    }

    func testRepeatEcReadyDoesNotReNotifyReadyState() {
        let preload = ShopifyCheckout.preload(checkout: url)
        var states: [PreloadState] = []
        preload?.onStateChange = { states.append($0) }

        let view = CheckoutWebView(entryPoint: nil)
        acceptMessagesFromCheckout(view)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: Self.readyBody))
        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: Self.readyBody))

        withExtendedLifetime(preload) {
            XCTAssertEqual(states, [.loading, .ready])
        }
    }

    func testExpiryTransitionsToIdleWithExpiredReason() {
        let preload = ShopifyCheckout.preload(checkout: url)

        CheckoutWebView.preloadCache.expire()

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .idle(reason: .expired))
        }
    }

    func testViewLookupAfterTTLExpiresTransitionsToIdleWithExpiredReason() {
        var now = Date(timeIntervalSince1970: 1000)
        let cache = PreloadCache(now: { now })
        defer { cache.invalidate() }
        let preload = CheckoutPreload(cache: cache)
        let key = PreloadKey(url: url, entryPoint: nil)
        let view = CheckoutWebView(entryPoint: nil)
        XCTAssertTrue(cache.store(view, for: key))
        var states: [PreloadState] = []
        preload.onStateChange = { states.append($0) }

        // Advance the cache clock without firing the scheduled expiry timer.
        now.addTimeInterval(5 * 60)

        XCTAssertNil(cache.view(for: key))
        XCTAssertEqual(preload.state, .idle(reason: .expired))
        XCTAssertEqual(states, [.loading, .idle(reason: .expired)])
        XCTAssertFalse(cache.hasEntry())
        XCTAssertFalse(cache.hasActiveKeepAlive())
        XCTAssertFalse(cache.hasActiveExpiryTimer())
    }

    func testWebContentUnavailableTransitionsToFailed() {
        let preload = ShopifyCheckout.preload(checkout: url)

        CheckoutWebView.preloadCache.keepAliveDidFail()

        withExtendedLifetime(preload) {
            XCTAssertEqual(
                preload?.state,
                .failed(reason: .webContentUnavailable, message: "Preload keep-alive failed.")
            )
        }
        XCTAssertEqual(telemetryRecorder.errors.count, 1)
        XCTAssertEqual(telemetryRecorder.errors.first?.category, .navigation)
        XCTAssertEqual(telemetryRecorder.errors.first?.stage, .load)
        XCTAssertEqual(telemetryRecorder.errors.first?.code, .connectionLost)
        XCTAssertEqual(telemetryRecorder.errors.first?.retryable, false)
        XCTAssertEqual(telemetryRecorder.errors.first?.isRetry, false)
    }

    func testHTTPErrorTransitionsToFailed() throws {
        let preload = ShopifyCheckout.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))
        view.load(checkout: url)
        let link = view.url ?? url

        let response = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 500, httpVersion: nil, headerFields: nil))
        _ = view.handleResponse(response)

        withExtendedLifetime(preload) {
            XCTAssertEqual(
                preload?.state,
                .failed(
                    reason: .httpError(statusCode: 500),
                    message: "HTTP response returned status code 500."
                )
            )
        }
    }

    func testCloudflareManagedChallengeDiscardsBackgroundedPreloadWithoutCheckoutFailure() throws {
        let preload = ShopifyCheckout.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))
        view.load(checkout: url, isPreload: true)
        let delegate = MockCheckoutWebViewDelegate()
        view.viewDelegate = delegate
        let response = try XCTUnwrap(
            HTTPURLResponse(
                url: url,
                statusCode: 403,
                httpVersion: nil,
                headerFields: ["CF-MITIGATED": "  ChAlLeNgE\t"]
            )
        )

        let navigation = try XCTUnwrap(view.checkoutNavigation)
        XCTAssertEqual(view.handleResponse(response), .cancel)
        // WebKit reports policy cancellation after the response handler returns.
        view.webView(
            view,
            didFailProvisionalNavigation: navigation,
            withError: NSError(domain: WKError.errorDomain, code: 102)
        )

        withExtendedLifetime(preload) {
            XCTAssertEqual(
                preload?.state,
                .failed(
                    reason: .httpError(statusCode: 403),
                    message: "HTTP response returned status code 403."
                )
            )
        }
        XCTAssertFalse(CheckoutWebView.preloadCache.contains(view))
        XCTAssertNil(delegate.errorReceived)
        XCTAssertEqual(delegate.failureCount, 0)
        XCTAssertTrue(telemetryRecorder.errors.isEmpty)
    }

    func testCloudflareManagedChallengeRendersBeforeAppearanceAndWhilePresentationIsCovered() throws {
        let preload = ShopifyCheckout.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))
        view.load(checkout: url, isPreload: true)
        let controller = TestableCheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        defer {
            controller.cleanUpCheckoutView()
            view.cleanUpForDismissal()
        }
        XCTAssertTrue(controller.checkoutView === view)
        var failures = 0
        controller.onFail = { _ in failures += 1 }
        let response = try XCTUnwrap(
            HTTPURLResponse(
                url: url,
                statusCode: 403,
                httpVersion: nil,
                headerFields: ["cf-mitigated": "challenge"]
            )
        )

        XCTAssertTrue(view.isPresented)
        XCTAssertEqual(view.handleResponse(response), .allow)

        controller.viewWillAppear(false)
        controller.viewDidDisappear(false)
        XCTAssertFalse(controller.isBeingDismissed)
        XCTAssertTrue(view.isPresented)
        XCTAssertEqual(view.handleResponse(response), .allow)

        controller.viewWillAppear(false)
        XCTAssertEqual(view.handleResponse(response), .allow)

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .loading)
        }
        XCTAssertTrue(CheckoutWebView.preloadCache.contains(view))
        XCTAssertEqual(failures, 0)
        XCTAssertTrue(telemetryRecorder.errors.isEmpty)
    }

    func testCloudflareSubframeChallengeDoesNotDiscardBackgroundedPreload() throws {
        let preload = ShopifyCheckout.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))
        view.load(checkout: url, isPreload: true)
        let delegate = MockCheckoutWebViewDelegate()
        view.viewDelegate = delegate
        let response = try XCTUnwrap(
            HTTPURLResponse(
                url: url,
                statusCode: 403,
                httpVersion: nil,
                headerFields: ["cf-mitigated": "challenge"]
            )
        )

        XCTAssertEqual(view.handleResponse(response, isForMainFrame: false), .allow)

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .loading)
        }
        XCTAssertTrue(CheckoutWebView.preloadCache.contains(view))
        XCTAssertNil(delegate.errorReceived)
        XCTAssertEqual(delegate.failureCount, 0)
    }

    func testCloudflareManagedChallengeDiscardsDismissedCachedViewWithoutCheckoutFailure() throws {
        let preload = ShopifyCheckout.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))
        view.load(checkout: url, isPreload: true)
        let controller = TestableCheckoutWebViewController(checkoutURL: url, entryPoint: nil)
        let presentedView = try XCTUnwrap(controller.checkoutView)
        defer { presentedView.cleanUpForDismissal() }
        controller.viewWillAppear(false)
        controller.testIsBeingDismissed = true
        controller.viewDidDisappear(false)
        XCTAssertNil(controller.checkoutView)
        XCTAssertFalse(presentedView.isPresented)
        XCTAssertTrue(CheckoutWebView.preloadCache.contains(presentedView))
        let delegate = MockCheckoutWebViewDelegate()
        presentedView.viewDelegate = delegate
        let response = try XCTUnwrap(
            HTTPURLResponse(
                url: url,
                statusCode: 403,
                httpVersion: nil,
                headerFields: ["cf-mitigated": "challenge"]
            )
        )

        let navigation = try XCTUnwrap(presentedView.checkoutNavigation)
        XCTAssertEqual(presentedView.handleResponse(response), .cancel)
        presentedView.webView(
            presentedView,
            didFail: navigation,
            withError: NSError(domain: WKError.errorDomain, code: 102)
        )

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .idle(reason: .invalidated))
        }
        XCTAssertFalse(CheckoutWebView.preloadCache.contains(presentedView))
        XCTAssertNil(delegate.errorReceived)
        XCTAssertEqual(delegate.failureCount, 0)
        XCTAssertTrue(telemetryRecorder.errors.isEmpty)
    }

    func testNavigationFailureTransitionsToFailed() {
        let preload = ShopifyCheckout.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
        view.webView(view, didFail: nil, withError: error)

        withExtendedLifetime(preload) {
            XCTAssertEqual(
                preload?.state,
                .failed(reason: .navigationFailed, message: "Navigation failed (error code: -1001).")
            )
        }
    }

    func testProvisionalNavigationFailureTransitionsToFailed() {
        let preload = ShopifyCheckout.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
        view.webView(view, didFailProvisionalNavigation: nil, withError: error)

        withExtendedLifetime(preload) {
            XCTAssertEqual(
                preload?.state,
                .failed(reason: .navigationFailed, message: "Navigation failed (error code: -1001).")
            )
        }
    }

    func testProvisionalNavigationCancelledDoesNotTransition() {
        let preload = ShopifyCheckout.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorCancelled)
        view.webView(view, didFailProvisionalNavigation: nil, withError: error)

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .loading)
        }
    }

    func testViewLookupWithDifferentKeyTransitionsHandleToIdle() throws {
        let preload = ShopifyCheckout.preload(checkout: url)
        _ = CheckoutWebView.preloadCache.store(
            CheckoutWebView(entryPoint: nil),
            for: PreloadKey(url: url, entryPoint: nil)
        )

        let otherURL = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/other"))
        _ = CheckoutWebView.preloadCache.view(for: PreloadKey(url: otherURL, entryPoint: nil))

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .idle(reason: .invalidated))
        }
    }

    func testExpireClearsCacheBeforeNotifyingSoReentrantPreloadSurvives() {
        let preload = ShopifyCheckout.preload(checkout: url)
        preload?.onStateChange = { state in
            if case .idle(reason: .expired) = state {
                _ = CheckoutWebView.preloadCache.store(
                    CheckoutWebView(entryPoint: nil),
                    for: PreloadKey(url: self.url, entryPoint: nil)
                )
            }
        }

        CheckoutWebView.preloadCache.expire()

        withExtendedLifetime(preload) {
            XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
        }
    }

    func testDisablingPreloadViaConfigTransitionsToIdle() async {
        let preload = ShopifyCheckout.preload(checkout: url)

        ShopifyCheckout.configure { $0.preloading.enabled = false }

        for _ in 0 ..< 20 where preload?.state != .idle(reason: .invalidated) {
            await Task.yield()
        }

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .idle(reason: .invalidated))
        }
    }
}

final class PreloadTelemetryRecorder: CheckoutTelemetryRecording, @unchecked Sendable {
    private(set) var errors: [TelemetryErrorMetric] = []

    func recordError(_ metric: TelemetryErrorMetric) {
        errors.append(metric)
    }

    func recordProtocolDecodeError(_: TelemetryProtocolDecodeErrorMetric) {}
    func recordConfirmationReached(_: TelemetryConfirmationReachedMetric) {}
    func recordNavigationRetry(_: TelemetryNavigationRetryMetric) {}
    func recordNavigationDuration(_: TelemetryNavigationDurationMetric) {}
    func recordReadyDuration(_: TelemetryReadyDurationMetric) {}
}

struct NoOpTestTelemetryRecorder: CheckoutTelemetryRecording {
    func recordError(_: TelemetryErrorMetric) {}
    func recordProtocolDecodeError(_: TelemetryProtocolDecodeErrorMetric) {}
    func recordConfirmationReached(_: TelemetryConfirmationReachedMetric) {}
    func recordNavigationRetry(_: TelemetryNavigationRetryMetric) {}
    func recordNavigationDuration(_: TelemetryNavigationDurationMetric) {}
    func recordReadyDuration(_: TelemetryReadyDurationMetric) {}
}

/// Keeps a preload handle alive and records its states.
@MainActor
private final class StateLog {
    var values: [PreloadState] = []
    var preload: CheckoutPreload?
}

/// Stands in for an app's sheet that hosts checkout as a child, as SwiftUI's `.sheet` does.
private final class DismissingViewController: UIViewController {
    override var isBeingDismissed: Bool {
        true
    }
}
