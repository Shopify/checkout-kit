@testable import ShopifyCheckoutKit
import WebKit
import XCTest

class CheckoutBridgeTests: XCTestCase {
    func testReturnsStandardUserAgent() {
        let version = ShopifyCheckoutKit.version
        XCTAssertEqual(CheckoutBridge.applicationName, "ShopifyCheckoutKit/\(version) (iOS;Swift \(SwiftVersion.current!))")
    }

    func testReturnsUserAgentWithCustomPlatformSuffix() {
        let version = ShopifyCheckoutKit.version
        ShopifyCheckoutKit.configuration.platform = Platform.reactNative
        XCTAssertEqual(CheckoutBridge.applicationName, "ShopifyCheckoutKit/\(version) (iOS;Swift \(SwiftVersion.current!)) ReactNative")
        ShopifyCheckoutKit.configuration.platform = nil
    }

    func testReturnsUserAgentWithPlatformVersion() {
        let version = ShopifyCheckoutKit.version
        ShopifyCheckoutKit.configuration.platform = .reactNative(version: "0.74.5")
        XCTAssertEqual(CheckoutBridge.applicationName, "ShopifyCheckoutKit/\(version) (iOS;Swift \(SwiftVersion.current!)) ReactNative/0.74.5")
        ShopifyCheckoutKit.configuration.platform = nil
    }

    func testReturnsUserAgentWithEntryPoint() {
        let version = ShopifyCheckoutKit.version
        let applicationNameWithEntryPoint = CheckoutBridge.applicationName(entryPoint: .acceleratedCheckouts)

        XCTAssertEqual(applicationNameWithEntryPoint, "ShopifyCheckoutKit/\(version) (iOS;Swift \(SwiftVersion.current!)) AcceleratedCheckouts")
    }

    func testReturnsUserAgentWithEntryPointAndPlatform() {
        let version = ShopifyCheckoutKit.version
        ShopifyCheckoutKit.configuration.platform = Platform.reactNative

        let applicationNameWithEntryPoint = CheckoutBridge.applicationName(entryPoint: .acceleratedCheckouts)

        XCTAssertEqual(applicationNameWithEntryPoint, "ShopifyCheckoutKit/\(version) (iOS;Swift \(SwiftVersion.current!)) ReactNative AcceleratedCheckouts")

        ShopifyCheckoutKit.configuration.platform = nil
    }

    func testInstrumentationPayloadToBridgeEvent() {
        let payload = InstrumentationPayload(name: "test", value: 1, type: .histogram)
        let jsonString = payload.toBridgeEvent()
        XCTAssertNotNil(jsonString)

        if let jsonData = jsonString?.data(using: .utf8) {
            let decodedPayload = try? JSONDecoder().decode(SdkToWebEvent<InstrumentationPayload>.self, from: jsonData)
            XCTAssertNotNil(decodedPayload)
            XCTAssertEqual(decodedPayload?.detail.name, "test")
            XCTAssertEqual(decodedPayload?.detail.value, 1)
            XCTAssertEqual(decodedPayload?.detail.type, .histogram)
        }
    }

    @MainActor
    func testSendMessageShouldCallEvaluateJavaScriptPresented() async {
        let webView = MockWebView()

        let didDispatch = await CheckoutBridge.sendMessage(webView, messageName: "presented", messageBody: nil)

        XCTAssertTrue(didDispatch)
        XCTAssertEqual(webView.evaluatedScript, expectedPresentedScript())
    }

    @MainActor
    func testSendMessageWithPayloadEvaulatesJavaScript() async {
        let webView = MockWebView()

        let didDispatch = await CheckoutBridge.sendMessage(webView, messageName: "payload", messageBody: "{\"one\": true}")

        XCTAssertTrue(didDispatch)
        XCTAssertEqual(webView.evaluatedScript, expectedPayloadScript())
    }

    private func expectedPresentedScript() -> String {
        return """
        if (window.MobileCheckoutSdk && window.MobileCheckoutSdk.dispatchMessage) {
        	window.MobileCheckoutSdk.dispatchMessage('presented');
        } else {
        	window.addEventListener('mobileCheckoutBridgeReady', function () {
        		window.MobileCheckoutSdk.dispatchMessage('presented');
        	}, {passive: true, once: true});
        }
        """
    }

    private func expectedPayloadScript() -> String {
        return """
        if (window.MobileCheckoutSdk && window.MobileCheckoutSdk.dispatchMessage) {
        	window.MobileCheckoutSdk.dispatchMessage('payload', {"one": true});
        } else {
        	window.addEventListener('mobileCheckoutBridgeReady', function () {
        		window.MobileCheckoutSdk.dispatchMessage('payload', {"one": true});
        	}, {passive: true, once: true});
        }
        """
    }
}
