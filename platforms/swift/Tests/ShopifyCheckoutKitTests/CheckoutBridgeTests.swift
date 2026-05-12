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
import WebKit
import XCTest

class CheckoutBridgeTests: XCTestCase {
    func testReturnsStandardUserAgent() {
        let version = ShopifyCheckoutKit.version
        let schemaVersion = MetaData.schemaVersion
        XCTAssertEqual(CheckoutBridge.applicationName, "ShopifyCheckoutKit/\(version) (\(schemaVersion);automatic;standard)")
    }

    func testReturnsRecoveryUserAgent() {
        let version = ShopifyCheckoutKit.version
        XCTAssertEqual(CheckoutBridge.recoveryAgent, "ShopifyCheckoutKit/\(version) (noconnect;automatic;standard_recovery)")
    }

    func testReturnsUserAgentWithCustomPlatformSuffix() {
        let version = ShopifyCheckoutKit.version
        let schemaVersion = MetaData.schemaVersion
        ShopifyCheckoutKit.configuration.platform = Platform.reactNative
        XCTAssertEqual(CheckoutBridge.applicationName, "ShopifyCheckoutKit/\(version) (\(schemaVersion);automatic;standard) ReactNative")
        XCTAssertEqual(CheckoutBridge.recoveryAgent, "ShopifyCheckoutKit/\(version) (noconnect;automatic;standard_recovery) ReactNative")
        ShopifyCheckoutKit.configuration.platform = nil
    }

    func testReturnsUserAgentWithEntryPoint() {
        let version = ShopifyCheckoutKit.version
        let schemaVersion = MetaData.schemaVersion
        let applicationNameWithEntryPoint = CheckoutBridge.applicationName(entryPoint: .acceleratedCheckouts)
        let recoveryAgentWithEntryPoint = CheckoutBridge.recoveryAgent(entryPoint: .acceleratedCheckouts)

        XCTAssertEqual(applicationNameWithEntryPoint, "ShopifyCheckoutKit/\(version) (\(schemaVersion);automatic;standard) AcceleratedCheckouts")
        XCTAssertEqual(recoveryAgentWithEntryPoint, "ShopifyCheckoutKit/\(version) (noconnect;automatic;standard_recovery) AcceleratedCheckouts")
    }

    func testReturnsUserAgentWithEntryPointAndPlatform() {
        let version = ShopifyCheckoutKit.version
        let schemaVersion = MetaData.schemaVersion
        ShopifyCheckoutKit.configuration.platform = Platform.reactNative

        let applicationNameWithEntryPoint = CheckoutBridge.applicationName(entryPoint: .acceleratedCheckouts)
        let recoveryAgentWithEntryPoint = CheckoutBridge.recoveryAgent(entryPoint: .acceleratedCheckouts)

        XCTAssertEqual(applicationNameWithEntryPoint, "ShopifyCheckoutKit/\(version) (\(schemaVersion);automatic;standard) ReactNative AcceleratedCheckouts")
        XCTAssertEqual(recoveryAgentWithEntryPoint, "ShopifyCheckoutKit/\(version) (noconnect;automatic;standard_recovery) ReactNative AcceleratedCheckouts")

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

    func testSendMessageShouldCallEvaluateJavaScriptPresented() {
        let webView = MockWebView()
        webView.expectedScript = expectedPresentedScript()
        let evaluateJavaScriptExpectation = expectation(
            description: "evaluateJavaScript was called"
        )
        webView.evaluateJavaScriptExpectation = evaluateJavaScriptExpectation

        CheckoutBridge.sendMessage(webView, messageName: "presented", messageBody: nil)

        wait(for: [evaluateJavaScriptExpectation], timeout: 2)
    }

    func testSendMessageWithPayloadEvaulatesJavaScript() {
        let webView = MockWebView()
        webView.expectedScript = expectedPayloadScript()
        let evaluateJavaScriptExpectation = expectation(
            description: "evaluateJavaScript was called"
        )
        webView.evaluateJavaScriptExpectation = evaluateJavaScriptExpectation

        CheckoutBridge.sendMessage(webView, messageName: "payload", messageBody: "{\"one\": true}")

        wait(for: [evaluateJavaScriptExpectation], timeout: 2)
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
