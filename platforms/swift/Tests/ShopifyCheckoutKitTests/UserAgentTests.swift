@testable import ShopifyCheckoutKit
import UIKit
import XCTest

class UserAgentTests: XCTestCase {
    private var expectedParameters: String {
        "iOS;Swift \(SwiftVersion.current!);iOSVersion/\(UIDevice.current.systemVersion)"
    }

    func test_string_withAcceleratedCheckoutsEntryPoint_shouldReturnCorrectUserAgent() {
        let acceleratedCheckoutsUA = UserAgent.string(
            entryPoint: .acceleratedCheckouts
        )
        XCTAssertEqual(
            acceleratedCheckoutsUA,
            "ShopifyCheckoutKit/4.0.0-alpha.1 (\(expectedParameters)) AcceleratedCheckouts"
        )
    }

    func test_string_withAcceleratedCheckoutsAndReactNativePlatform_shouldReturnUserAgentWithPlatform() {
        let acceleratedCheckoutsUA = UserAgent.string(
            platform: .reactNative,
            entryPoint: .acceleratedCheckouts
        )
        XCTAssertEqual(
            acceleratedCheckoutsUA,
            "ShopifyCheckoutKit/4.0.0-alpha.1 (\(expectedParameters)) ReactNative AcceleratedCheckouts"
        )
    }

    func test_string_withReactNativePlatformAndVersion_shouldReturnUserAgentWithPlatformVersion() {
        let acceleratedCheckoutsUA = UserAgent.string(
            platform: .reactNative(version: "0.74.5"),
            entryPoint: .acceleratedCheckouts
        )
        XCTAssertEqual(
            acceleratedCheckoutsUA,
            "ShopifyCheckoutKit/4.0.0-alpha.1 (\(expectedParameters)) ReactNative/0.74.5 AcceleratedCheckouts"
        )
    }

    func test_string_withoutEntryPoint_shouldReturnBasicUserAgent() {
        let checkoutKitUA = UserAgent.string()
        XCTAssertEqual(
            checkoutKitUA, "ShopifyCheckoutKit/4.0.0-alpha.1 (\(expectedParameters))"
        )
    }

    func test_string_shouldIncludeRuntimeIOSVersion() {
        let checkoutKitUA = UserAgent.string()
        XCTAssertTrue(checkoutKitUA.contains("iOSVersion/\(UIDevice.current.systemVersion)"))
    }
}
