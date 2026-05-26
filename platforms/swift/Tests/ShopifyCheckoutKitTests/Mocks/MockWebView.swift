@testable import ShopifyCheckoutKit
import WebKit
import XCTest

class MockWebView: CheckoutWebView {
    var expectedScript = ""

    var evaluateJavaScriptExpectation: XCTestExpectation?

    override func evaluateJavaScript(_ javaScriptString: String) async throws -> Any {
        if javaScriptString == expectedScript {
            evaluateJavaScriptExpectation?.fulfill()
        }
        return true
    }
}
