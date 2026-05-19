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
}
