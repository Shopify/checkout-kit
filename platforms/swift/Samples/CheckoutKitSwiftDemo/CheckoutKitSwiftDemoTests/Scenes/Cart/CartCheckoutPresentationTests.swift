@testable import CheckoutKitSwiftDemo
import EmbeddedCheckoutProtocol
import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class CartCheckoutPresentationTests: XCTestCase {
    private var originalConfiguration: Configuration!

    override func setUp() async throws {
        try await super.setUp()
        originalConfiguration = ShopifyCheckoutKit.configuration
        ShopifyCheckoutKit.configuration.preloading.enabled = false
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configuration = originalConfiguration
        try await super.tearDown()
    }

    func testSwiftUIPresentationOpensTheSheetWithoutPresentingUIKit() {
        let presentation = makePresentation()
        let presenter = CheckoutPresenterSpy()

        presentation.present(checkout: makeCheckoutURL(), using: .swiftUI, from: presenter, client: .init())

        XCTAssertTrue(presentation.showCheckoutSheet)
        XCTAssertNil(presenter.checkoutViewController)
    }

    func testUIKitPresentationPresentsTheControllerWithoutOpeningTheSheet() {
        let presentation = makePresentation()
        let presenter = CheckoutPresenterSpy()

        presentation.present(checkout: makeCheckoutURL(), using: .uiKit, from: presenter, client: .init())

        XCTAssertTrue(presenter.checkoutViewController is CheckoutViewController)
        XCTAssertTrue(presenter.animated)
        XCTAssertFalse(presentation.showCheckoutSheet)
    }

    func testUIKitPresentationUsesTheSameAppearanceAsTheSwiftUISheet() {
        let presentation = makePresentation()
        ShopifyCheckoutKit.configuration.appearance = .storefront

        presentation.present(checkout: makeCheckoutURL(), using: .uiKit, from: CheckoutPresenterSpy(), client: .init())

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.automatic))
    }

    func testUIKitPresentationDoesNotOpenTheSheetWithoutAPresenter() {
        let presentation = makePresentation()

        presentation.present(checkout: makeCheckoutURL(), using: .uiKit, from: nil, client: .init())

        XCTAssertFalse(presentation.showCheckoutSheet)
    }

    func testDismissingCheckoutBeforeCompletionKeepsTheCart() {
        var cartResetCount = 0
        let presentation = makePresentation { cartResetCount += 1 }
        presentation.present(checkout: makeCheckoutURL(), using: .swiftUI, from: nil, client: .init())

        presentation.checkoutDidDismiss()

        XCTAssertFalse(presentation.showCheckoutSheet)
        XCTAssertEqual(cartResetCount, 0)
    }

    func testCompletionKeepsTheConfirmationVisibleUntilDismissalAndResetsTheCartOnce() async {
        var cartResetCount = 0
        let presentation = makePresentation { cartResetCount += 1 }
        let client = presentation.observingCompletion(on: CheckoutProtocol.Client())
        presentation.present(checkout: makeCheckoutURL(), using: .swiftUI, from: nil, client: client)

        _ = await client.process(makeCheckoutNotification(method: "ec.complete"))

        XCTAssertTrue(presentation.showCheckoutSheet)
        XCTAssertEqual(cartResetCount, 0)

        presentation.checkoutDidDismiss()

        XCTAssertFalse(presentation.showCheckoutSheet)
        XCTAssertEqual(cartResetCount, 1)

        presentation.checkoutDidDismiss()

        XCTAssertEqual(cartResetCount, 1)
    }

    func testObservingCompletionPreservesOtherProtocolHandlers() async {
        let presentation = makePresentation()
        var checkoutStarted = false
        let client = CheckoutProtocol.Client().on(CheckoutProtocol.start) { _ in
            checkoutStarted = true
        }

        _ = await presentation.observingCompletion(on: client).process(makeCheckoutNotification(method: "ec.start"))

        XCTAssertTrue(checkoutStarted)
    }

    func testFailureClosesTheSheetWithoutResettingTheCart() {
        var cartResetCount = 0
        let presentation = makePresentation { cartResetCount += 1 }
        presentation.present(checkout: makeCheckoutURL(), using: .swiftUI, from: nil, client: .init())

        presentation.checkoutDidFail(error: CheckoutError(code: .networkError, message: "Network unavailable"))

        XCTAssertFalse(presentation.showCheckoutSheet)
        XCTAssertEqual(cartResetCount, 0)
    }

    private func makePresentation(resetCart: @escaping @MainActor () -> Void = {}) -> CartCheckoutPresentation {
        CartCheckoutPresentation(resetCart: resetCart)
    }

    private func makeCheckoutURL() -> URL {
        URL(string: "https://example.com/checkouts/cn/test")!
    }

    private func makeCheckoutNotification(method: String) -> String {
        """
        {"jsonrpc":"2.0","method":"\(method)","params":{"checkout":{"currency":"USD","id":"test-checkout","line_items":[],"links":[],"status":"completed","totals":[],"ucp":{"payment_handlers":{},"version":"\(EmbeddedCheckoutProtocol.specVersion)"}}}}
        """
    }
}

@MainActor
private class CheckoutPresenterSpy: UIViewController {
    var checkoutViewController: UIViewController?
    var animated = false

    override func present(_ viewControllerToPresent: UIViewController, animated: Bool, completion: (() -> Void)? = nil) {
        checkoutViewController = viewControllerToPresent
        self.animated = animated
        completion?()
    }
}
