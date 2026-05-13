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
import XCTest

class UserAgentTests: XCTestCase {
    func test_string_withAcceleratedCheckoutsEntryPoint_shouldReturnCorrectUserAgent() {
        let acceleratedCheckoutsUA = UserAgent.string(
            entryPoint: .acceleratedCheckouts
        )
        XCTAssertEqual(
            acceleratedCheckoutsUA,
            "ShopifyCheckoutKit/3.8.0 (iOS;Swift \(SwiftVersion.current!)) AcceleratedCheckouts"
        )
    }

    func test_string_withAcceleratedCheckoutsAndReactNativePlatform_shouldReturnUserAgentWithPlatform() {
        let acceleratedCheckoutsUA = UserAgent.string(
            platform: .reactNative,
            entryPoint: .acceleratedCheckouts
        )
        XCTAssertEqual(
            acceleratedCheckoutsUA,
            "ShopifyCheckoutKit/3.8.0 (iOS;Swift \(SwiftVersion.current!)) ReactNative AcceleratedCheckouts"
        )
    }

    func test_string_withReactNativePlatformAndVersion_shouldReturnUserAgentWithPlatformVersion() {
        let acceleratedCheckoutsUA = UserAgent.string(
            platform: .reactNative(version: "0.74.5"),
            entryPoint: .acceleratedCheckouts
        )
        XCTAssertEqual(
            acceleratedCheckoutsUA,
            "ShopifyCheckoutKit/3.8.0 (iOS;Swift \(SwiftVersion.current!)) ReactNative/0.74.5 AcceleratedCheckouts"
        )
    }

    func test_string_withoutEntryPoint_shouldReturnBasicUserAgent() {
        let checkoutKitUA = UserAgent.string()
        XCTAssertEqual(
            checkoutKitUA, "ShopifyCheckoutKit/3.8.0 (iOS;Swift \(SwiftVersion.current!))"
        )
    }

    func test_string_withRecovery_shouldAppendRecoverySuffix() {
        let recoveryUA = UserAgent.string(
            entryPoint: .acceleratedCheckouts,
            recovery: true
        )
        XCTAssertEqual(
            recoveryUA, "ShopifyCheckoutKit/3.8.0 (iOS;Swift \(SwiftVersion.current!)) AcceleratedCheckouts recovery"
        )
    }
}
