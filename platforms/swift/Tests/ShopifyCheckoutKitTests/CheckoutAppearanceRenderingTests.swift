@testable import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class CheckoutAppearanceRenderingTests: XCTestCase {
    private let checkoutURL = URL(string: "https://example.myshopify.com/checkouts/test")!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configure { $0 = Configuration() }
        ShopifyCheckoutKit.invalidate()
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configure { $0 = Configuration() }
        ShopifyCheckoutKit.invalidate()
        try await super.tearDown()
    }

    func testExplicitAppearancesSetTheCheckoutInterfaceStyle() {
        let appearances: [(CheckoutAppearance, UIUserInterfaceStyle)] = [
            (.app(.light()), .light),
            (.app(.dark()), .dark),
            (.app(.automatic()), .unspecified),
            (.storefront(), .light)
        ]

        for (appearance, style) in appearances {
            let controller = makeViewController(appearance: appearance)

            XCTAssertEqual(controller.overrideUserInterfaceStyle, style)
        }
    }

    func testExplicitAppearanceAppliesAllNativeColorOverrides() throws {
        let colors = makeColors(background: .red, closeIconTint: .blue)
        let controller = makeViewController(appearance: .app(.dark(colors: colors)))
        let checkoutController = try checkoutController(of: controller)
        let checkoutView = try XCTUnwrap(checkoutController.checkoutView)

        assertColor(checkoutView.backgroundColor, equals: colors.webViewBackground)
        assertColor(checkoutView.underPageBackgroundColor, equals: colors.webViewBackground)
        assertColor(checkoutController.view.backgroundColor, equals: colors.webViewBackground)
        assertColor(checkoutController.progressBar.progressBar.tintColor, equals: colors.progressIndicator)
        try assertColor(checkoutController.navigationItem.rightBarButtonItem?.tintColor, equals: XCTUnwrap(colors.closeIconTint))
        assertColor(controller.navigationBar.standardAppearance.backgroundColor, equals: colors.headerBackground)
        assertColor(controller.navigationBar.standardAppearance.titleTextAttributes[.foregroundColor] as? UIColor, equals: colors.headerFont)
        try assertColor(controller.navigationBar.standardAppearance.shadowColor, equals: XCTUnwrap(colors.headerBorderColor))
    }

    func testAutomaticAppearanceKeepsIndependentDynamicPalettesOnNativeViews() throws {
        let lightColors = makeColors(background: .red)
        let darkColors = makeColors(background: .blue)
        let controller = makeViewController(appearance: .app(.automatic(lightColors: lightColors, darkColors: darkColors)))
        let checkoutController = try checkoutController(of: controller)
        let checkoutView = try XCTUnwrap(checkoutController.checkoutView)

        for (style, colors) in [(UIUserInterfaceStyle.light, lightColors), (.dark, darkColors)] {
            assertColor(checkoutView.backgroundColor, equals: colors.webViewBackground, style: style)
            assertColor(checkoutController.view.backgroundColor, equals: colors.webViewBackground, style: style)
            assertColor(checkoutController.progressBar.progressBar.tintColor, equals: colors.progressIndicator, style: style)
            assertColor(controller.navigationBar.standardAppearance.backgroundColor, equals: colors.headerBackground, style: style)
            assertColor(controller.navigationBar.standardAppearance.titleTextAttributes[.foregroundColor] as? UIColor, equals: colors.headerFont, style: style)
            try assertColor(controller.navigationBar.standardAppearance.shadowColor, equals: XCTUnwrap(colors.headerBorderColor), style: style)
        }
    }

    func testAutomaticWebViewBackgroundChangesWithTheSystemAppearance() async throws {
        let controller = makeViewController(appearance: .app(.automatic(
            lightColors: Colors(webViewBackground: .red),
            darkColors: Colors(webViewBackground: .blue)
        )))
        let window = makeWindow(controller: controller, style: .light)
        defer { window.isHidden = true }
        let checkoutView = try XCTUnwrap(checkoutController(of: controller).checkoutView)
        controller.view.layoutIfNeeded()

        assertColor(checkoutView.underPageBackgroundColor, equals: .red)

        window.overrideUserInterfaceStyle = .dark
        controller.view.layoutIfNeeded()
        await Task.yield()

        assertColor(checkoutView.backgroundColor, equals: .blue, style: .dark)
        assertColor(checkoutView.underPageBackgroundColor, equals: .blue, style: .dark)

        window.overrideUserInterfaceStyle = .light
        controller.view.layoutIfNeeded()
        await Task.yield()

        assertColor(checkoutView.backgroundColor, equals: .red)
        assertColor(checkoutView.underPageBackgroundColor, equals: .red)
    }

    func testAutomaticWebViewUsesDarkColorsWhenFirstAttachedToADarkWindow() throws {
        let controller = makeViewController(appearance: .app(.automatic(
            lightColors: Colors(webViewBackground: .red),
            darkColors: Colors(webViewBackground: .blue)
        )))
        let window = makeWindow(controller: controller, style: .dark)
        defer { window.isHidden = true }
        controller.view.layoutIfNeeded()
        let checkoutView = try XCTUnwrap(checkoutController(of: controller).checkoutView)

        assertColor(checkoutView.underPageBackgroundColor, equals: .blue, style: .dark)
    }

    func testWebViewBackgroundPreservesDynamicColorAccessibilityChanges() async throws {
        guard #available(iOS 17.0, *) else {
            throw XCTSkip("Trait overrides require iOS 17")
        }
        let backgroundColor = UIColor { traits in
            traits.accessibilityContrast == .high ? .green : .red
        }
        let controller = makeViewController(appearance: .app(.light(colors: Colors(webViewBackground: backgroundColor))))
        let window = makeWindow(controller: controller, style: .light)
        defer { window.isHidden = true }
        window.traitOverrides.accessibilityContrast = .normal
        controller.view.layoutIfNeeded()
        let checkoutView = try XCTUnwrap(checkoutController(of: controller).checkoutView)

        assertColor(checkoutView.underPageBackgroundColor, equals: .red)

        window.traitOverrides.accessibilityContrast = .high
        controller.view.layoutIfNeeded()
        await Task.yield()

        assertColor(checkoutView.underPageBackgroundColor, equals: .green)
    }

    func testStorefrontCanCustomizeNativeColorsAndPreserveTheTitle() throws {
        ShopifyCheckoutKit.configure { $0.title = "Complete your order" }
        let colors = makeColors(background: .purple)
        let controller = makeViewController(appearance: .storefront(colors: colors))
        let checkoutController = try checkoutController(of: controller)

        XCTAssertEqual(checkoutController.title, "Complete your order")
        XCTAssertEqual(controller.overrideUserInterfaceStyle, .light)
        assertColor(checkoutController.checkoutView?.backgroundColor, equals: colors.webViewBackground)
        assertColor(checkoutController.progressBar.progressBar.tintColor, equals: colors.progressIndicator)
    }

    func testDefaultAppearancePreservesTransparentNavigationAndTheSystemCloseButton() throws {
        let controller = makeViewController(appearance: .storefront())
        let checkoutController = try checkoutController(of: controller)
        let closeButton = try XCTUnwrap(checkoutController.navigationItem.rightBarButtonItem)

        assertColor(controller.navigationBar.standardAppearance.backgroundColor, equals: .clear)
        XCTAssertNil(controller.navigationBar.standardAppearance.backgroundEffect)
        XCTAssertNil(controller.navigationBar.standardAppearance.shadowColor)
        XCTAssertNil(closeButton.image)
        XCTAssertEqual(closeButton.accessibilityIdentifier, "shopify_checkout_kit_close_button")
    }

    func testCloseIconCanBeCustomizedIndependentlyOfItsTint() throws {
        let icon = try XCTUnwrap(UIImage(systemName: "multiply"))
        let controller = makeViewController(appearance: .storefront(colors: Colors(closeIcon: icon)))
        let checkoutController = try checkoutController(of: controller)
        let closeButton = try XCTUnwrap(checkoutController.navigationItem.rightBarButtonItem)

        XCTAssertEqual(closeButton.image, icon)
        XCTAssertEqual(closeButton.accessibilityIdentifier, "shopify_checkout_kit_close_button")
    }

    func testAutomaticCloseButtonSwitchesBetweenSystemAndCustomAppearance() async throws {
        let icon = try XCTUnwrap(UIImage(systemName: "multiply"))
        let controller = makeViewController(appearance: .app(.automatic(
            darkColors: Colors(closeIcon: icon, closeIconTint: .red)
        )))
        let window = makeWindow(controller: controller, style: .light)
        defer { window.isHidden = true }
        let checkoutController = try checkoutController(of: controller)
        controller.view.layoutIfNeeded()

        XCTAssertNil(checkoutController.navigationItem.rightBarButtonItem?.image)

        window.overrideUserInterfaceStyle = .dark
        controller.view.layoutIfNeeded()
        await Task.yield()

        XCTAssertEqual(checkoutController.navigationItem.rightBarButtonItem?.image, icon)
        assertColor(checkoutController.navigationItem.rightBarButtonItem?.tintColor, equals: .red, style: .dark)

        window.overrideUserInterfaceStyle = .light
        controller.view.layoutIfNeeded()
        await Task.yield()

        XCTAssertNil(checkoutController.navigationItem.rightBarButtonItem?.image)
    }

    func testPresentedPreloadedWebViewUsesThePresentingConfigurationColors() throws {
        ShopifyCheckoutKit.configure { $0.appearance = .app(.automatic(lightColors: Colors(webViewBackground: .red))) }
        ShopifyCheckoutKit.preload(checkout: checkoutURL)
        var configuration = ShopifyCheckoutKit.configuration
        configuration.appearance = .app(.automatic(lightColors: Colors(webViewBackground: .blue)))
        let decoratedURL = CheckoutURLDecorator.decorate(checkoutURL, configuration: configuration)

        let controller = CheckoutViewController(checkout: decoratedURL, configuration: configuration)
        let checkoutView = try XCTUnwrap(checkoutController(of: controller).checkoutView)

        XCTAssertTrue(checkoutView === CheckoutWebView.preloadCache.view(for: PreloadKey(url: decoratedURL, entryPoint: nil)))
        assertColor(checkoutView.backgroundColor, equals: .blue)
        assertColor(checkoutView.underPageBackgroundColor, equals: .blue)
    }

    private func makeViewController(appearance: CheckoutAppearance) -> CheckoutViewController {
        ShopifyCheckoutKit.configure { $0.appearance = appearance }
        return CheckoutViewController(checkout: checkoutURL)
    }

    private func makeWindow(controller: CheckoutViewController, style: UIUserInterfaceStyle) -> UIWindow {
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
        window.overrideUserInterfaceStyle = style
        window.rootViewController = controller
        window.makeKeyAndVisible()
        return window
    }

    private func checkoutController(of controller: CheckoutViewController) throws -> CheckoutWebViewController {
        try XCTUnwrap(controller.viewControllers.first as? CheckoutWebViewController)
    }

    private func makeColors(background: UIColor, closeIconTint: UIColor? = nil) -> Colors {
        Colors(
            webViewBackground: background.withAlphaComponent(0.7),
            headerBackground: background.withAlphaComponent(0.4),
            headerFont: background,
            progressIndicator: background,
            closeIconTint: closeIconTint,
            headerBorderColor: background
        )
    }

    private func assertColor(
        _ actual: UIColor?,
        equals expected: UIColor,
        style: UIUserInterfaceStyle = .light,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        guard let actual else {
            XCTFail("Expected a color", file: file, line: line)
            return
        }
        let traits = UITraitCollection(userInterfaceStyle: style)
        let actualComponents = components(of: actual.resolvedColor(with: traits))
        let expectedComponents = components(of: expected.resolvedColor(with: traits))
        for (actualComponent, expectedComponent) in zip(actualComponents, expectedComponents) {
            XCTAssertEqual(actualComponent, expectedComponent, accuracy: 1.0 / 255.0, file: file, line: line)
        }
    }

    private func components(of color: UIColor) -> [CGFloat] {
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        XCTAssertTrue(color.getRed(&red, green: &green, blue: &blue, alpha: &alpha))
        return [red, green, blue, alpha]
    }
}
