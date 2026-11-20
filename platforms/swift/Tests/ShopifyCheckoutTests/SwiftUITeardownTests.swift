@testable import ShopifyCheckoutKit
import SwiftUI
import UIKit
import XCTest

/// Exercises actual SwiftUI removal, without manually driving UIKit disappearance callbacks.
@MainActor
final class SwiftUITeardownTests: XCTestCase {
    private var originalConfiguration: Configuration!

    override func setUp() async throws {
        try await super.setUp()
        originalConfiguration = ShopifyCheckout.configuration
        ShopifyCheckout.configure {
            $0.preloading.enabled = true
            $0.telemetry.enabled = false
        }
    }

    override func tearDown() async throws {
        CheckoutWebView.invalidate()
        ShopifyCheckout.configure { $0 = originalConfiguration }
        try await super.tearDown()
    }

    func test_removingInlineCheckout_deliversHeldInvalidation() async throws {
        try await withRemovedCheckout { content, preload, states in
            XCTAssertFalse(
                content.checkoutView?.isPresented ?? false,
                "A removed checkout must no longer be marked presented"
            )
            XCTAssertEqual(
                preload.state,
                .idle(reason: .invalidated),
                "SwiftUI removal must deliver the state held by clearPreload"
            )
            XCTAssertEqual(states.values, [.ready, .idle(reason: .invalidated)])
        }
    }

    func test_repeatedCleanupAfterInlineRemoval_doesNotDuplicateInvalidation() async throws {
        try await withRemovedCheckout { content, preload, states in
            // UIKit cleanup and SwiftUI dismantling may both run for the same presentation.
            content.cleanUpCheckoutView()
            content.cleanUpCheckoutView()
            XCTAssertEqual(preload.state, .idle(reason: .invalidated))
            XCTAssertEqual(states.values, [.ready, .idle(reason: .invalidated)])
        }
    }

    func test_releasingRemovedInlineCheckout_deliversHeldInvalidation() async throws {
        weak var removedController: CheckoutWebViewController?
        weak var removedWebView: CheckoutWebView?
        var retainedPreload: CheckoutPreload?
        try await withRemovedCheckout(performCleanup: false) { content, preload, _ in
            removedController = content
            removedWebView = content.checkoutView
            retainedPreload = preload
        }
        try await waitUntil { removedController == nil && removedWebView == nil }
        let preload = try XCTUnwrap(retainedPreload)
        XCTAssertEqual(
            preload.state,
            .idle(reason: .invalidated),
            "Deallocating the removed controller and WebView must not strand the handle"
        )
    }

    func test_removingInlineCheckout_retainsFreshPreloadAndRestartsExpiry() async throws {
        try await withRemovedCheckout(clearBeforeRemoval: false) { content, preload, states in
            let cache = CheckoutWebView.preloadCache
            XCTAssertNil(content.checkoutView)
            XCTAssertTrue(cache.hasEntry())
            XCTAssertTrue(cache.hasActiveExpiryTimer())
            XCTAssertEqual(preload.state, .ready)
            XCTAssertEqual(states.values, [.ready])
            cache.expire()
            XCTAssertEqual(states.values, [.ready, .idle(reason: .expired)])
        }
    }

    private func withRemovedCheckout(
        clearBeforeRemoval: Bool = true,
        performCleanup: Bool = true,
        assertions: (CheckoutWebViewController, CheckoutPreload, StateLog) -> Void
    ) async throws {
        let url = try XCTUnwrap(URL(string: "https://checkout.example/checkouts/cn/test"))
        let cache = CheckoutWebView.preloadCache
        let preload = CheckoutPreload(cache: cache)
        let webView = OfflineCheckoutWebView(entryPoint: nil)
        XCTAssertTrue(cache.store(webView, for: PreloadKey(
            url: CheckoutURLDecorator.decorate(url), entryPoint: nil
        )))
        cache.transition(to: .ready)
        let states = StateLog()
        preload.onStateChange = { states.values.append($0) }
        var dismissals = 0
        let visibility = CheckoutVisibility()
        let host = UIHostingController(rootView: ConditionalCheckout(
            visibility: visibility, url: url, onDismiss: { dismissals += 1 }
        ))
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = host
        window.makeKeyAndVisible()
        defer {
            window.isHidden = true
            window.rootViewController = nil
        }

        try await waitUntil {
            host.view.layoutIfNeeded()
            return self.checkout(in: host)?.viewIfLoaded?.window != nil
        }
        let navigation = try XCTUnwrap(checkout(in: host))
        let content = try XCTUnwrap(navigation.topViewController as? CheckoutWebViewController)
        defer {
            if performCleanup { content.cleanUpCheckoutView() }
        }
        XCTAssertTrue(content.checkoutView === webView, "Must actually reuse the seeded preload")
        XCTAssertTrue(webView.isPresented)

        XCTAssertFalse(cache.hasActiveExpiryTimer(), "Presentation pauses preload expiry")
        if clearBeforeRemoval {
            ShopifyCheckout.clearPreload()
            XCTAssertFalse(cache.hasEntry())
        }
        XCTAssertEqual(preload.state, .ready, "Invalidation must be held while mounted")

        visibility.isVisible = false
        try await waitUntil {
            host.view.layoutIfNeeded()
            return self.checkout(in: host) == nil && navigation.parent == nil && webView.window == nil
        }
        // Allow trailing SwiftUI/UIKit teardown callbacks, not just hierarchy removal.
        try await Task.sleep(nanoseconds: 500_000_000)
        XCTAssertFalse(webView.isPresented, "Removal must release presentation ownership")
        XCTAssertEqual(dismissals, 0, "Host removal is not a buyer dismissal")
        assertions(content, preload, states)
    }

    private func checkout(in controller: UIViewController) -> CheckoutViewController? {
        if let checkout = controller as? CheckoutViewController { return checkout }
        return controller.children.lazy.compactMap { self.checkout(in: $0) }.first
    }

    private func waitUntil(_ condition: () -> Bool) async throws {
        let deadline = Date().addingTimeInterval(5)
        while !condition() {
            guard Date() < deadline else {
                XCTFail("SwiftUI did not reach the expected mounted/removed hierarchy")
                throw CancellationError()
            }
            try await Task.sleep(nanoseconds: 20_000_000)
        }
    }
}

@MainActor
private final class StateLog {
    var values: [PreloadState] = []
}

@MainActor
private final class CheckoutVisibility: ObservableObject {
    @Published var isVisible = true
}

private struct ConditionalCheckout: View {
    @ObservedObject var visibility: CheckoutVisibility
    let url: URL
    let onDismiss: () -> Void

    var body: some View {
        if visibility.isVisible {
            ShopifyCheckout(checkout: url).onDismiss(onDismiss)
        } else {
            Color.clear
        }
    }
}

/// Only navigation is stubbed. SwiftUI, UIKit containment, the preload cache, and cleanup are real.
private final class OfflineCheckoutWebView: CheckoutWebView {
    override func load(checkout _: URL, isPreload _: Bool = false) {}
}
