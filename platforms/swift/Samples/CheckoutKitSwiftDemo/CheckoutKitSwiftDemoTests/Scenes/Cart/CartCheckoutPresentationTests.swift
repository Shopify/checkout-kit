@testable import CheckoutKitSwiftDemo
import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class CartCheckoutPresentationTests: XCTestCase {
    private var originalConfiguration: Configuration!

    override func setUp() async throws {
        try await super.setUp()
        originalConfiguration = ShopifyCheckoutKit.configuration
        ShopifyCheckoutKit.configure { $0.preloading.enabled = false }
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configure { $0 = originalConfiguration }
        try await super.tearDown()
    }

    func testSwiftUIPresentationOpensTheSheetWithoutPresentingUIKit() {
        let presentation = makePresentation()
        let presenter = CheckoutPresenterSpy()

        presentation.present(checkout: makeCheckoutURL(), using: .swiftUI, from: presenter)

        XCTAssertTrue(presentation.showCheckoutSheet)
        XCTAssertNil(presenter.checkoutViewController)
    }

    func testUIKitPresentationPresentsTheControllerWithoutOpeningTheSheet() {
        let presentation = makePresentation()
        let presenter = CheckoutPresenterSpy()

        presentation.present(checkout: makeCheckoutURL(), using: .uiKit, from: presenter)

        XCTAssertTrue(presenter.checkoutViewController is CheckoutViewController)
        XCTAssertTrue(presenter.animated)
        XCTAssertFalse(presentation.showCheckoutSheet)
    }

    func testUIKitPresentationDoesNotOpenTheSheetWithoutAPresenter() {
        let presentation = makePresentation()

        presentation.present(checkout: makeCheckoutURL(), using: .uiKit, from: nil)

        XCTAssertFalse(presentation.showCheckoutSheet)
    }

    func testDismissingCheckoutBeforeCompletionKeepsTheCart() {
        var cartResetCount = 0
        let presentation = makePresentation { cartResetCount += 1 }
        presentation.present(checkout: makeCheckoutURL(), using: .swiftUI, from: nil)

        presentation.checkoutDidDismiss()

        XCTAssertFalse(presentation.showCheckoutSheet)
        XCTAssertEqual(cartResetCount, 0)
    }

    func testCompletionKeepsTheConfirmationVisibleUntilDismissalAndResetsTheCartOnce() {
        var cartResetCount = 0
        let presentation = makePresentation { cartResetCount += 1 }
        presentation.present(checkout: makeCheckoutURL(), using: .swiftUI, from: nil)

        presentation.checkoutDidComplete(CheckoutCompleteEvent(checkout: makeCheckout()))

        XCTAssertTrue(presentation.showCheckoutSheet)
        XCTAssertEqual(cartResetCount, 0)

        presentation.checkoutDidDismiss()

        XCTAssertFalse(presentation.showCheckoutSheet)
        XCTAssertEqual(cartResetCount, 1)

        presentation.checkoutDidDismiss()

        XCTAssertEqual(cartResetCount, 1)
    }

    func testFailureClosesTheSheetWithoutResettingTheCart() {
        var cartResetCount = 0
        let presentation = makePresentation { cartResetCount += 1 }
        presentation.present(checkout: makeCheckoutURL(), using: .swiftUI, from: nil)

        presentation.checkoutDidFail(
            CheckoutFailureEvent(error: CheckoutError(code: .networkError, message: "Network unavailable"))
        )

        XCTAssertFalse(presentation.showCheckoutSheet)
        XCTAssertEqual(cartResetCount, 0)
    }

    private func makePresentation(resetCart: @escaping @MainActor () -> Void = {}) -> CartCheckoutPresentation {
        CartCheckoutPresentation(resetCart: resetCart)
    }

    private func makeCheckoutURL() -> URL {
        URL(string: "https://example.com/checkouts/cn/test")!
    }

    private func makeCheckout() -> ShopifyCheckoutKit.Checkout {
        ShopifyCheckoutKit.Checkout(id: "test-checkout", status: .completed, currency: "USD", lineItems: [], totals: [])
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
