import Foundation
import ShopifyCheckoutKit
import XCTest

@MainActor
final class CheckoutViewControllerPackageInitializerTests: XCTestCase {
    func testInjectedConfigurationIsAppliedToCheckout() throws {
        var configuration = ShopifyCheckoutKit.configuration
        configuration.title = "Instance checkout"

        let viewController = try CheckoutViewController(
            checkout: XCTUnwrap(URL(string: "https://checkout-sdk.myshopify.com")),
            configuration: configuration
        )

        let checkoutViewController = try XCTUnwrap(viewController.viewControllers.first)
        XCTAssertEqual(checkoutViewController.title, "Instance checkout")
    }
}
