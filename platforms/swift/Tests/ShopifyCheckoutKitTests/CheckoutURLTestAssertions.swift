import EmbeddedCheckoutProtocol
import Foundation
@testable import ShopifyCheckoutKit
import XCTest

func assertDecoratedCheckoutURL(
    _ url: URL?,
    colorScheme: String = "dark",
    branding: String = "app",
    file: StaticString = #filePath,
    line: UInt = #line
) throws {
    let url = try XCTUnwrap(url, file: file, line: line)
    let queryItems = try XCTUnwrap(
        URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems,
        file: file,
        line: line
    )

    XCTAssertEqual(queryItems.filter { $0.name == "ec_version" }.map(\.value), [EmbeddedCheckoutProtocol.specVersion], file: file, line: line)
    XCTAssertEqual(queryItems.filter { $0.name == "ec_delegate" }.map(\.value), ["window.open"], file: file, line: line)
    XCTAssertEqual(queryItems.filter { $0.name == "ec_color_scheme" }.map(\.value), [colorScheme], file: file, line: line)
    XCTAssertEqual(queryItems.filter { $0.name == "ck_branding" }.map(\.value), [branding], file: file, line: line)
    XCTAssertEqual(queryItems.filter { $0.name == "key" }.map(\.value), ["cart_token"], file: file, line: line)
}

@MainActor
func loadedCheckoutURL(from viewController: CheckoutViewController) throws -> URL {
    let webViewController = try XCTUnwrap(
        viewController.viewControllers.compactMap { $0 as? CheckoutWebViewController }.first
    )
    webViewController.loadViewIfNeeded()
    return try XCTUnwrap(webViewController.checkoutView?.loadedCheckoutURL)
}
