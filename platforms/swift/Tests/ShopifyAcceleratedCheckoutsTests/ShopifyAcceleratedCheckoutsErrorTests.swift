@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 16.0, *)
final class ShopifyAcceleratedCheckoutsErrorTests: XCTestCase {
    // MARK: - cartAcquisition Error Tests

    func test_cartAcquisitionError_withoutCartID_shouldGenerateFallbackMessage() {
        let error = ShopifyAcceleratedCheckouts.Error.cartAcquisition(cartID: nil)
        XCTAssertEqual(error.toString(), "unable to get cart for the supplied cart identifier")
    }

    func test_cartAcquisitionError_withDiagnosticCartID_shouldIncludeCartID() {
        let error = ShopifyAcceleratedCheckouts.Error.cartAcquisition(cartID: "gid://shopify/Cart/test-cart")
        XCTAssertEqual(error.toString(), "unable to get cart for gid://shopify/Cart/test-cart")
    }

    // MARK: - invariant Error Tests

    func test_invariantError_withExpectedValue_shouldGenerateCorrectErrorMessage() {
        let error = ShopifyAcceleratedCheckouts.Error.invariant(expected: "valid cart")

        let errorString = error.toString()
        XCTAssertEqual(errorString, "received nil, expected: valid cart")
    }
}
