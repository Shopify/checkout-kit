@testable import ShopifyCheckoutKit
import SwiftUI
import XCTest

@MainActor
class CheckoutViewControllerTests: XCTestCase {
    var checkoutURL: URL!
    var checkoutViewController: CheckoutViewController!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckout.configure {
            $0 = Configuration()
            $0.appearance = .app(.dark())
            $0.preloading.enabled = false
        }
        checkoutURL = URL(string: "https://www.shopify.com?key=cart_token")
        checkoutViewController = CheckoutViewController(checkout: checkoutURL)
    }

    override func tearDown() async throws {
        CheckoutWebView.invalidate()
        ShopifyCheckout.configure { $0 = Configuration() }
        try await super.tearDown()
    }

    func testInit() {
        XCTAssertNotNil(checkoutViewController)
    }

    func testInitDecoratesCheckoutURL() throws {
        try assertDecoratedCheckoutURL(loadedCheckoutURL(from: checkoutViewController))
    }

    func testInitWithPreviouslyDecoratedURLDoesNotDuplicateCheckoutParams() throws {
        let viewController = CheckoutViewController(checkout: CheckoutProtocol.url(for: checkoutURL))

        try assertDecoratedCheckoutURL(loadedCheckoutURL(from: viewController))
    }

    func testInitReusesCheckoutPreloadedFromTheSameUndecoratedURL() throws {
        ShopifyCheckout.configure { $0.preloading.enabled = true }
        let preload = ShopifyCheckout.preload(checkout: checkoutURL)
        let preloadedView = try XCTUnwrap(
            CheckoutWebView.preloadCache.view(
                for: PreloadKey(url: CheckoutURLDecorator.decorate(checkoutURL), entryPoint: nil)
            )
        )

        let viewController = CheckoutViewController(checkout: checkoutURL)
        let webViewController = try XCTUnwrap(
            viewController.viewControllers.compactMap { $0 as? CheckoutWebViewController }.first
        )

        XCTAssertTrue(webViewController.checkoutView === preloadedView)
        withExtendedLifetime(preload) {}
    }

    func testEntryPointInitDecoratesCheckoutURL() throws {
        let viewController = CheckoutViewController(
            checkout: checkoutURL,
            entryPoint: .acceleratedCheckouts
        )

        try assertDecoratedCheckoutURL(loadedCheckoutURL(from: viewController))
    }
}

@MainActor
class ShopifyCheckoutTests: XCTestCase {
    var checkoutURL: URL!
    var shopifyCheckout: ShopifyCheckout!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckout.configure {
            $0 = Configuration()
            $0.appearance = .app(.dark())
            $0.preloading.enabled = false
        }
        checkoutURL = URL(string: "https://www.shopify.com?key=cart_token")
        shopifyCheckout = ShopifyCheckout(checkout: checkoutURL)
    }

    override func tearDown() async throws {
        ShopifyCheckout.configure { $0 = Configuration() }
        try await super.tearDown()
    }

    func testOnDismiss() {
        var dismissActionCalled = false

        let sheet = shopifyCheckout.onDismiss {
            dismissActionCalled = true
        }
        sheet.onDismissAction?()
        XCTAssertTrue(dismissActionCalled)
    }

    func testOnFail() {
        var actionCalled = false
        var actionData: CheckoutFailureEvent?
        let error = CheckoutError(code: .httpError, message: "error", httpStatusCode: 500)

        let sheet = shopifyCheckout.onFail { failure in
            actionCalled = true
            actionData = failure
        }

        sheet.onFailAction?(CheckoutFailureEvent(error: error))
        XCTAssertTrue(actionCalled)
        XCTAssertEqual(actionData?.error.code, error.code)
    }

    func testLifecycleModifiers() {
        let sheet = shopifyCheckout
            .onStart { _ in }
            .onUpdate { _ in }
            .onComplete { _ in }

        XCTAssertNotNil(sheet.onStartAction)
        XCTAssertNotNil(sheet.onUpdateAction)
        XCTAssertNotNil(sheet.onCompleteAction)
    }

    func testOnLinkClick() throws {
        let expectedLink = try CheckoutLink(url: XCTUnwrap(URL(string: "https://example.com/policy")))
        var receivedLink: CheckoutLink?

        let sheet = shopifyCheckout.onLinkClick { link in
            receivedLink = link
            return .handled
        }

        XCTAssertEqual(sheet.onLinkClickAction?(expectedLink), .handled)
        XCTAssertEqual(receivedLink, expectedLink)
    }

    func testCheckoutViewControllerDecoratesCheckoutURLAfterAppearanceModifierRuns() async throws {
        let sheet = shopifyCheckout.appearance(.storefront())
        try await withHostedCheckout(sheet) { checkoutViewController, _ in
            try assertDecoratedCheckoutURL(
                loadedCheckoutURL(from: checkoutViewController),
                colorScheme: "light",
                branding: "shop"
            )
        }
    }

    func test_makeUIViewController_usesSharedDefaultsChangedAfterViewCreation() async throws {
        let sheet = ShopifyCheckout(checkout: checkoutURL)

        ShopifyCheckout.configure {
            $0.appearance = .app(.light())
            $0.title = "Updated shared title"
        }

        try await withHostedCheckout(sheet) { controller, _ in
            XCTAssertEqual(controller.topViewController?.title, "Updated shared title")
            XCTAssertEqual(controller.overrideUserInterfaceStyle, .light)
            try assertDecoratedCheckoutURL(loadedCheckoutURL(from: controller), colorScheme: "light", branding: "app")
        }
    }

    func test_makeUIViewController_modifiersOverrideLaterSharedDefaults() async throws {
        let sheet = ShopifyCheckout(checkout: checkoutURL)
            .appearance(.app(.light()))
            .title("Instance title")

        ShopifyCheckout.configure {
            $0.appearance = .storefront()
            $0.title = "Updated shared title"
        }

        try await withHostedCheckout(sheet) { controller, _ in
            XCTAssertEqual(controller.topViewController?.title, "Instance title")
            XCTAssertEqual(controller.overrideUserInterfaceStyle, .light)
            try assertDecoratedCheckoutURL(loadedCheckoutURL(from: controller), colorScheme: "light", branding: "app")
        }
    }

    func test_updateUIViewController_preservesDefaultsResolvedWhenMounted() async throws {
        ShopifyCheckout.configure { $0.title = "Original title" }
        let sheet = ShopifyCheckout(checkout: checkoutURL)

        try await withHostedCheckout(sheet) { controller, host in
            XCTAssertEqual(controller.topViewController?.title, "Original title")
            XCTAssertEqual(controller.overrideUserInterfaceStyle, .dark)

            ShopifyCheckout.configure {
                $0.appearance = .app(.light())
                $0.title = "Updated shared title"
            }

            // Re-evaluate the SwiftUI content without changing its identity.
            var updatedCallbackCalled = false
            host.rootView = ShopifyCheckout(checkout: checkoutURL)
                .onDismiss { updatedCallbackCalled = true }
            for _ in 0 ..< 10 {
                host.view.layoutIfNeeded()
                await Task.yield()
            }

            XCTAssertTrue(descendantCheckoutViewController(from: host) === controller)
            let content = try XCTUnwrap(controller.topViewController as? CheckoutWebViewController)
            content.onDismiss?()
            XCTAssertTrue(updatedCallbackCalled, "SwiftUI must apply the updated view before checking configuration stability")
            XCTAssertEqual(controller.topViewController?.title, "Original title")
            XCTAssertEqual(controller.overrideUserInterfaceStyle, .dark)
            try assertDecoratedCheckoutURL(loadedCheckoutURL(from: controller), colorScheme: "dark", branding: "app")
        }
    }

    private func withHostedCheckout(
        _ sheet: ShopifyCheckout,
        assertions: @MainActor (CheckoutViewController, UIHostingController<ShopifyCheckout>) async throws -> Void
    ) async throws {
        let hostingController = UIHostingController(rootView: sheet)
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = hostingController
        window.makeKeyAndVisible()
        defer {
            window.isHidden = true
            window.rootViewController = nil
        }
        hostingController.loadViewIfNeeded()

        var descendant: CheckoutViewController?
        for _ in 0 ..< 10 where descendant == nil {
            hostingController.view.layoutIfNeeded()
            descendant = descendantCheckoutViewController(from: hostingController)
            await Task.yield()
        }

        let controller = try XCTUnwrap(descendant)
        try await assertions(controller, hostingController)
    }

    private func descendantCheckoutViewController(from viewController: UIViewController) -> CheckoutViewController? {
        if let checkoutViewController = viewController as? CheckoutViewController {
            return checkoutViewController
        }

        return viewController.children.lazy.compactMap(descendantCheckoutViewController).first
    }
}

@MainActor
class CheckoutConfigurableTests: XCTestCase {
    var checkoutURL: URL!
    var shopifyCheckout: ShopifyCheckout!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckout.configure { $0 = Configuration() }
        checkoutURL = URL(string: "https://www.shopify.com")
        shopifyCheckout = ShopifyCheckout(checkout: checkoutURL)
    }

    override func tearDown() async throws {
        ShopifyCheckout.configure { $0 = Configuration() }
        try await super.tearDown()
    }

    func testAppearanceIsCapturedWithoutChangingGlobalConfiguration() {
        let globalAppearance = ShopifyCheckout.configuration.appearance
        let appearance = CheckoutAppearance.app(.light())

        let sheet = shopifyCheckout.appearance(appearance)

        XCTAssertEqual(sheet.resolvedConfiguration().appearance, appearance)
        XCTAssertEqual(shopifyCheckout.resolvedConfiguration().appearance, globalAppearance)
        XCTAssertEqual(ShopifyCheckout.configuration.appearance, globalAppearance)
    }

    func testAppearanceDecoratesCheckoutURLFromCapturedConfiguration() throws {
        let sheet = shopifyCheckout.appearance(.app(.dark()))
        let decoratedURL = CheckoutURLDecorator.decorate(checkoutURL, configuration: sheet.resolvedConfiguration())
        let items = try XCTUnwrap(URLComponents(url: decoratedURL, resolvingAgainstBaseURL: false)?.queryItems)

        XCTAssertEqual(items.first(where: { $0.name == "ec_color_scheme" })?.value, "dark")
        XCTAssertEqual(items.first(where: { $0.name == "ck_branding" })?.value, "app")
    }

    func testAppearanceColorsAreCapturedWithoutChangingGlobalConfiguration() {
        let globalAppearance = ShopifyCheckout.configuration.appearance
        let colors = CheckoutColors(webViewBackgroundColor: .red, progressIndicatorColor: .blue, closeIconTintColor: .green)

        let sheet = shopifyCheckout.appearance(.app(.light(colors: colors)))

        XCTAssertEqual(sheet.resolvedConfiguration().appearance.effectiveColorScheme.colors(isDark: false), colors)
        XCTAssertEqual(ShopifyCheckout.configuration.appearance, globalAppearance)
    }

    func testTitleIsCapturedWithoutChangingGlobalConfiguration() {
        let globalTitle = ShopifyCheckout.configuration.title
        let title = "Test Title"

        let sheet = shopifyCheckout.title(title)

        XCTAssertEqual(sheet.resolvedConfiguration().title, title)
        XCTAssertEqual(shopifyCheckout.resolvedConfiguration().title, globalTitle)
        XCTAssertEqual(ShopifyCheckout.configuration.title, globalTitle)
    }

    func testNonOverriddenSettingsFollowSharedConfiguration() {
        let sheet = shopifyCheckout.title("Instance title")

        ShopifyCheckout.configure { $0.appearance = .app(.dark()) }

        let resolved = sheet.resolvedConfiguration()
        XCTAssertEqual(resolved.title, "Instance title")
        XCTAssertEqual(resolved.appearance, .app(.dark()))
    }

    func testOverridesTakePrecedenceOverLaterSharedConfiguration() {
        let sheet = shopifyCheckout.appearance(.app(.light())).title("Instance title")

        ShopifyCheckout.configure {
            $0.appearance = .app(.dark())
            $0.title = "Shared title"
        }

        let resolved = sheet.resolvedConfiguration()
        XCTAssertEqual(resolved.appearance, .app(.light()))
        XCTAssertEqual(resolved.title, "Instance title")
    }

    func testModifiersDoNotInvalidatePreload() {
        ShopifyCheckout.preload(checkout: checkoutURL)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())

        _ = shopifyCheckout
            .appearance(.app(.dark(colors: CheckoutColors(webViewBackgroundColor: .red))))
            .title("Instance checkout")

        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
    }
}
