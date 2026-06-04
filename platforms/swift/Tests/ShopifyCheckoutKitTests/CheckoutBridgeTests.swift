@testable import ShopifyCheckoutKit
import WebKit
import XCTest

class CheckoutBridgeTests: XCTestCase {
    func testApplicationNameDelegatesToUserAgent() {
        XCTAssertEqual(
            CheckoutBridge.applicationName,
            UserAgent.string(platform: ShopifyCheckoutKit.configuration.platform)
        )
    }

    func testApplicationNameWithEntryPointDelegatesToUserAgent() {
        XCTAssertEqual(
            CheckoutBridge.applicationName(entryPoint: .acceleratedCheckouts),
            UserAgent.string(
                platform: ShopifyCheckoutKit.configuration.platform,
                entryPoint: .acceleratedCheckouts
            )
        )
    }

    @MainActor
    func testSendResponseEvaluatesExpectedJavaScript() async {
        let webView = MockWebView()
        let messageBody = #"{"jsonrpc":"2.0","id":"response-id","result":{}}"#

        let didDispatch = await CheckoutBridge.sendResponse(webView, messageBody: messageBody)

        XCTAssertEqual(webView.evaluatedScript, expectedResponseScript(messageBody: messageBody))
        XCTAssertTrue(didDispatch)
    }

    private func expectedResponseScript(messageBody: String) -> String {
        return """
        (function() {
            try {
                if (window.EmbeddedCheckoutProtocol && typeof window.EmbeddedCheckoutProtocol.postMessage === 'function') {
                    window.EmbeddedCheckoutProtocol.postMessage(\(messageBody));
                } else if (window && window.console && window.console.error) {
                    window.console.error('EmbeddedCheckoutProtocol.postMessage is not available.');
                }
            } catch (error) {
                if (window && window.console && window.console.error) {
                    window.console.error('Failed to post message to checkout', error);
                }
            }
        })();
        """
    }
}

private class MockWebView: WKWebView {
    var evaluatedScript: String?

    override func evaluateJavaScript(_ javaScriptString: String) async throws -> Any {
        evaluatedScript = javaScriptString
        return true
    }
}
