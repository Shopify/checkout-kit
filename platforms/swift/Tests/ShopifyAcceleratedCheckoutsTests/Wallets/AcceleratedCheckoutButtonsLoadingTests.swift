@testable import ShopifyAcceleratedCheckouts
import ViewInspector
import XCTest

@available(iOS 17.0, *)
@MainActor
final class AcceleratedCheckoutButtonsLoadingTests: XCTestCase {
    private let validCartID = "gid://shopify/Cart/test-cart-id"

    func testLoadingSkeletonCountMatchesWallets() throws {
        let buttons = AcceleratedCheckoutButtons(cartID: validCartID)
            .wallets([.shopPay, .applePay])

        let skeletons = try buttons.inspect().findAll(WalletButtonSkeleton.self)

        XCTAssertEqual(skeletons.count, 2)
    }

    func testLoadingPresentationHiddenRemovesSkeletons() throws {
        let buttons = AcceleratedCheckoutButtons(cartID: validCartID)
            .wallets([.shopPay, .applePay])
            .loadingPresentation(.hidden)

        let skeletons = try buttons.inspect().findAll(WalletButtonSkeleton.self)

        XCTAssertTrue(skeletons.isEmpty)
        XCTAssertEqual(buttons.loadingPresentation, .hidden)
    }

    func testInvalidIdentifierDoesNotRenderSkeletons() throws {
        let buttons = AcceleratedCheckoutButtons(cartID: "invalid")

        let skeletons = try buttons.inspect().findAll(WalletButtonSkeleton.self)

        XCTAssertTrue(skeletons.isEmpty)
    }

    func testSkeletonLayoutMatchesWalletButtons() {
        XCTAssertEqual(WalletButtonLayout.height, 48)
        XCTAssertEqual(WalletButtonLayout.spacing, 8)
        XCTAssertEqual(WalletButtonLayout.resolvedCornerRadius(nil), 8)
        XCTAssertEqual(WalletButtonLayout.resolvedCornerRadius(-1), 8)
        XCTAssertEqual(WalletButtonLayout.resolvedCornerRadius(0), 0)
        XCTAssertEqual(WalletButtonLayout.resolvedCornerRadius(24), 24)
    }
}
