@testable import ShopifyCheckoutKit
import WebKit

class MockWebView: CheckoutWebView {
    var evaluatedScript: String?

    override func evaluateJavaScript(_ javaScriptString: String) async throws -> Any {
        evaluatedScript = javaScriptString
        return true
    }
}
