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
            $0.closeButtonTintColor = nil
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

    func testTitleCanBeCustomized() {
        customTitle = "Custom title"
        ShopifyCheckoutKit.configure { $0.title = customTitle ?? "Checkout" }
        viewController = MockCheckoutWebViewController(
            checkoutURL: checkoutURL
        )
        XCTAssertEqual(viewController.title, "Custom title")
    }

    func testCheckoutViewDidFailWithErrorDismissesViewController() {
        viewController.checkoutViewDidFailWithError(error: .checkoutUnavailable(message: "error", code: CheckoutUnavailable.httpError(statusCode: 500)))

        XCTAssertTrue(viewController.dismissCalled)
    }

    func testCloseInvokesCancelDelegate() {
        var didCancel = false
        viewController.onCancel = {
            didCancel = true
        }

        viewController.close()

        XCTAssertTrue(didCancel)
    }

    func testPresentationControllerDidDismissInvokesCancelDelegate() throws {
        var didCancel = false
        viewController.onCancel = {
            didCancel = true
        }

        let presentationController = try XCTUnwrap(UIViewController().presentationController)
        viewController.presentationControllerDidDismiss(presentationController)

        XCTAssertTrue(didCancel)
    }

    func testCheckoutViewDidStartNavigationShowsProgressBar() {
        XCTAssertFalse(viewController.progressBar.isHidden)
        XCTAssertTrue(viewController.initialNavigation)

        viewController.checkoutViewDidStartNavigation()
        viewController.checkoutViewDidFinishNavigation()
        XCTAssertFalse(viewController.progressBar.isHidden)
    }

    func testCloseButtonUsesInheritedTintWhenTintColorIsNil() throws {
        ShopifyCheckoutKit.configuration.closeButtonTintColor = nil
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)

        let closeButton = controller.navigationItem.rightBarButtonItem
        XCTAssertNotNil(closeButton)
        XCTAssertEqual(closeButton?.style, .plain)
        XCTAssertNil(closeButton?.tintColor)
        XCTAssertEqual(closeButton?.accessibilityIdentifier, expectedCloseButtonIdentifier)

        if #available(iOS 26.0, *) {
            let button = try customButton(from: closeButton)
            XCTAssertNil(button.configuration?.baseForegroundColor)
            XCTAssertEqual(button.accessibilityIdentifier, expectedCloseButtonIdentifier)
        } else {
            XCTAssertNil(closeButton?.customView)
        }
    }

    func testCloseButtonUsesCustomImageAndTintWhenColorIsSet() throws {
        let customColor = UIColor.red
        ShopifyCheckoutKit.configuration.closeButtonTintColor = customColor
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)

        let closeButton = controller.navigationItem.rightBarButtonItem
        XCTAssertNotNil(closeButton)
        XCTAssertEqual(closeButton?.style, .plain)
        XCTAssertEqual(closeButton?.tintColor, customColor)
        XCTAssertEqual(closeButton?.accessibilityIdentifier, expectedCloseButtonIdentifier)

        if #available(iOS 26.0, *) {
            let button = try customButton(from: closeButton)
            XCTAssertNotNil(button.configuration?.image)
            XCTAssertEqual(button.configuration?.baseForegroundColor, customColor)
            XCTAssertEqual(button.accessibilityIdentifier, expectedCloseButtonIdentifier)
        } else {
            XCTAssertNotNil(closeButton?.image)
            XCTAssertNil(closeButton?.customView)
        }
    }

    func test_closeButton_withNilTintOnIOS26_shouldUseCompactXMark() throws {
        guard #available(iOS 26.0, *) else {
            throw XCTSkip("Compact close glyph is only used on iOS 26 and newer")
        }

        ShopifyCheckoutKit.configuration.closeButtonTintColor = nil
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)

        try assertUsesCompactXMark(controller.navigationItem.rightBarButtonItem)
    }

    func test_closeButton_withCustomTintOnIOS26_shouldUseCompactXMark() throws {
        guard #available(iOS 26.0, *) else {
            throw XCTSkip("Compact close glyph is only used on iOS 26 and newer")
        }

        ShopifyCheckoutKit.configuration.closeButtonTintColor = .blue
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)

        try assertUsesCompactXMark(controller.navigationItem.rightBarButtonItem)
    }

    func test_closeButton_whenRenderedOnIOS26_shouldKeep44PointHitTarget() throws {
        guard #available(iOS 26.0, *) else {
            throw XCTSkip("Compact close button is only used on iOS 26 and newer")
        }

        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)
        controller.checkoutView = nil
        let navigationController = UINavigationController(rootViewController: controller)
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
        window.rootViewController = navigationController
        window.makeKeyAndVisible()
        navigationController.view.layoutIfNeeded()

        let closeButton = try XCTUnwrap(controller.navigationItem.rightBarButtonItem)
        let button = try customButton(from: closeButton)
        closeButton.customView?.layoutIfNeeded()
        let hitTargetFrame = button.convert(button.bounds, to: window)

        XCTAssertEqual(hitTargetFrame.width, 44, accuracy: 0.01)
        XCTAssertEqual(hitTargetFrame.height, 44, accuracy: 0.01)
        XCTAssertTrue(button.isEnabled)
        XCTAssertTrue(button.isUserInteractionEnabled)

        window.isHidden = true
    }

    func test_closeButton_withCustomTintBeforeIOS26_shouldUseCircleFill() throws {
        if #available(iOS 26.0, *) {
            throw XCTSkip("Legacy close glyph is only used before iOS 26")
        }

        ShopifyCheckoutKit.configuration.closeButtonTintColor = .blue
        let controller = MockCheckoutWebViewController(checkoutURL: checkoutURL)
        let closeButtonImage = try XCTUnwrap(controller.navigationItem.rightBarButtonItem?.image)
        let expectedImage = try XCTUnwrap(UIImage(systemName: "xmark.circle.fill"))

        XCTAssertEqual(closeButtonImage.pngData(), expectedImage.pngData())
    }

    @available(iOS 26.0, *)
    private func assertUsesCompactXMark(
        _ closeButton: UIBarButtonItem?,
        file: StaticString = #filePath,
        line: UInt = #line
    ) throws {
        let button = try customButton(from: closeButton, file: file, line: line)
        let closeButtonImage = try XCTUnwrap(button.configuration?.image, file: file, line: line)
        let symbolConfiguration = UIImage.SymbolConfiguration(pointSize: 14)
        let expectedImage = try XCTUnwrap(
            UIImage(systemName: "xmark", withConfiguration: symbolConfiguration),
            file: file,
            line: line
        )

        XCTAssertEqual(closeButton?.customView?.bounds.size, CGSize(width: 44, height: 44), file: file, line: line)
        XCTAssertEqual(closeButton?.customView?.intrinsicContentSize, CGSize(width: 44, height: 44), file: file, line: line)
        XCTAssertEqual(button.bounds.size, CGSize(width: 44, height: 44), file: file, line: line)
        XCTAssertEqual(closeButtonImage.size, expectedImage.size, file: file, line: line)
        XCTAssertEqual(closeButtonImage.pngData(), expectedImage.pngData(), file: file, line: line)
        XCTAssertTrue(button.accessibilityTraits.contains(.button), file: file, line: line)
        XCTAssertTrue(closeButton?.hidesSharedBackground == true, file: file, line: line)
    }

    @available(iOS 26.0, *)
    private func customButton(
        from closeButton: UIBarButtonItem?,
        file: StaticString = #filePath,
        line: UInt = #line
    ) throws -> UIButton {
        let container = try XCTUnwrap(closeButton?.customView, file: file, line: line)
        container.layoutIfNeeded()
        return try XCTUnwrap(
            container.subviews.compactMap { $0 as? UIButton }.first,
            file: file,
            line: line
        )
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
