@testable import CheckoutKitSwiftDemo
import XCTest

@MainActor
class E2EControllerTests: XCTestCase {
    func testIgnoresLinksThatAreNotControlLinks() async {
        let target = E2ECommandTargetSpy()

        let handled = await E2EController(target: target).handle(url: "https://example.com/cart")

        XCTAssertFalse(handled)
        XCTAssertEqual(target.calls, [])
    }

    func testReportsAParseFailure() async {
        let target = E2ECommandTargetSpy()

        let handled = await handle("/teleport", target)

        XCTAssertTrue(handled)
        XCTAssertEqual(target.calls, ["report(Unsupported e2e command)"])
    }

    func testResetsTheCart() async {
        let target = E2ECommandTargetSpy()

        let handled = await handle("/reset", target)

        XCTAssertTrue(handled)
        XCTAssertEqual(target.calls, ["resetCart"])
    }

    func testSeedsTheCartFromAVariantId() async {
        let target = E2ECommandTargetSpy()

        await handle("/cart?variantId=gid://shopify/ProductVariant/1&quantity=3&buyerIdentityMode=hardcoded", target)

        XCTAssertEqual(target.calls, [
            "selectBuyerIdentityMode(hardcoded)",
            "resetCart",
            "addCartLine(gid://shopify/ProductVariant/1, 3)",
            "showCart"
        ])
    }

    func testSeedsTheCartFromAProductIndex() async {
        let target = E2ECommandTargetSpy()

        await handle("/cart?productIndex=2", target)

        XCTAssertEqual(target.calls, [
            "resetCart",
            "variantId(atProductIndex: 2)",
            "addCartLine(variant-2, 1)",
            "showCart"
        ])
    }

    func testSelectsTheBuyerIdentityModeBeforeSeedingBecauseSelectingItResetsTheCart() async {
        let target = E2ECommandTargetSpy()

        await handle("/cart?productIndex=0&buyerIdentityMode=guest", target)

        XCTAssertEqual(target.calls.first, "selectBuyerIdentityMode(guest)")
    }

    func testReportsASeedFailureAndDoesNotShowTheCart() async {
        let target = E2ECommandTargetSpy()
        target.variantIdError = E2EControllerError.productIndexOutOfRange(9)

        await handle("/cart?productIndex=9", target)

        XCTAssertEqual(target.calls, [
            "resetCart",
            "variantId(atProductIndex: 9)",
            "report(No product at index 9)"
        ])
    }

    func testReportsThatSignInIsNotImplemented() async {
        let target = E2ECommandTargetSpy()

        await handle("/signIn", target)

        XCTAssertEqual(target.calls, ["report(signIn is not implemented yet)"])
    }

    @discardableResult
    private func handle(_ path: String, _ target: E2ECommandTargetSpy) async -> Bool {
        await E2EController(target: target).handle(url: "com.shopify.checkoutkit.swiftdemo://e2e\(path)")
    }
}

@MainActor
private class E2ECommandTargetSpy: E2ECommandTarget {
    var calls: [String] = []
    var variantIdError: Error?
    var addCartLineError: Error?

    func selectBuyerIdentityMode(_ mode: BuyerIdentityMode) async {
        calls.append("selectBuyerIdentityMode(\(mode.rawValue))")
    }

    func resetCart() async {
        calls.append("resetCart")
    }

    func variantId(atProductIndex index: Int) async throws -> String {
        calls.append("variantId(atProductIndex: \(index))")

        if let variantIdError {
            throw variantIdError
        }

        return "variant-\(index)"
    }

    func addCartLine(variantId: String, quantity: Int) async throws {
        calls.append("addCartLine(\(variantId), \(quantity))")

        if let addCartLineError {
            throw addCartLineError
        }
    }

    func showCart() async {
        calls.append("showCart")
    }

    func report(failure message: String) async {
        calls.append("report(\(message))")
    }
}
