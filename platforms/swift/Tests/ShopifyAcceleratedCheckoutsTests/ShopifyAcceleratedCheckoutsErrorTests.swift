@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 16.0, *)
final class ShopifyAcceleratedCheckoutsErrorTests: XCTestCase {
    // MARK: - cartAcquisition Error Tests

    func test_cartAcquisitionError_withAllIdentifierTypes_shouldGenerateCorrectErrorMessages() {
        struct TestCase {
            let identifier: CheckoutIdentifier
            let expectedError: String
            let description: String
        }

        let testCases: [TestCase] = [
            TestCase(
                identifier: .cart(cartID: "gid://Shopify/Cart/test-id"),
                expectedError: "unable to get cart for CheckoutIdentifier: cart(cartID: \"gid://Shopify/Cart/test-id\")",
                description: "cart identifier"
            ),
            TestCase(
                identifier: .variant(variantID: "gid://Shopify/ProductVariant/test-id", quantity: 2),
                expectedError: "unable to get cart for CheckoutIdentifier: variant(variantID: \"gid://Shopify/ProductVariant/test-id\", quantity: 2)",
                description: "variant identifier"
            ),
            TestCase(
                identifier: .invariant(reason: "Invalid checkout data"),
                expectedError: "unable to get cart for CheckoutIdentifier: invariant(reason: \"Invalid checkout data\")",
                description: "invariant identifier"
            )
        ]

        for testCase in testCases {
            let error = ShopifyAcceleratedCheckouts.Error.cartAcquisition(identifier: testCase.identifier)
            let errorString = error.toString()
            XCTAssertEqual(errorString, testCase.expectedError, "Failed for \(testCase.description)")
        }
    }

    // MARK: - invariant Error Tests

    func test_invariantError_withExpectedValue_shouldGenerateCorrectErrorMessage() {
        let error = ShopifyAcceleratedCheckouts.Error.invariant(expected: "valid cart")

        let errorString = error.toString()
        XCTAssertEqual(errorString, "received nil, expected: valid cart")
    }
}
