/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

@testable import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class ConfigurationTests: XCTestCase {
    override func setUp() async throws {
        try await super.setUp()
        resetConfigurationState()
    }

    override func tearDown() async throws {
        resetConfigurationState()
        try await super.tearDown()
    }

    private func resetConfigurationState() {
        ShopifyCheckoutKit.invalidateOnConfigurationChange = true
        CheckoutWebView.invalidate()
        ShopifyCheckoutKit.setConfiguration(Configuration())
    }

    func testCloseButtonTintColorDefaultsToNil() {
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }

    func testCloseButtonTintColorCanBeSet() {
        let customColor = UIColor.red
        ShopifyCheckoutKit.configuration.closeButtonTintColor = customColor

        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, customColor)
    }

    func testCloseButtonTintColorCanBeReset() {
        ShopifyCheckoutKit.configuration.closeButtonTintColor = .blue
        XCTAssertNotNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)

        ShopifyCheckoutKit.configuration.closeButtonTintColor = nil
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }

    func testColorSchemeCanBeSetDirectly() {
        ShopifyCheckoutKit.configuration.colorScheme = .light

        XCTAssertEqual(ShopifyCheckoutKit.configuration.colorScheme, .light)
    }

    func testConfigureCanBatchConfigurationChanges() {
        ShopifyCheckoutKit.configure {
            $0.colorScheme = .dark
            $0.closeButtonTintColor = .blue
        }

        XCTAssertEqual(ShopifyCheckoutKit.configuration.colorScheme, .dark)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, .blue)
    }

    func testDirectConfigurationMutationUpdatesLogger() {
        ShopifyCheckoutKit.configuration.logLevel = .all

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, .all)
        XCTAssertEqual(OSLogger.shared.logLevel, .all)
    }

    func testDirectConfigurationMutationInvalidatesCheckoutCache() throws {
        ShopifyCheckoutKit.invalidateOnConfigurationChange = true

        let url = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123"))
        _ = CheckoutWebView.for(checkout: url)
        XCTAssertTrue(CheckoutWebView.hasCacheEntry())

        ShopifyCheckoutKit.configuration.title = "Updated title"

        XCTAssertFalse(CheckoutWebView.hasCacheEntry())
    }

    func testDirectConfigurationMutationDisablesPreloadingActivatedByClient() {
        CheckoutWebView.preloadingActivatedByClient = true

        ShopifyCheckoutKit.configuration.preloading.enabled = false

        XCTAssertFalse(CheckoutWebView.preloadingActivatedByClient)
    }
}
