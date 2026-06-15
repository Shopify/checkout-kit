import WebKit

@MainActor
protocol CheckoutBridgeProtocol {
    @discardableResult @MainActor static func sendResponse(_ webView: WKWebView, messageBody: String) async -> Bool
}

enum CheckoutBridge: CheckoutBridgeProtocol {
    static let messageHandler = "EmbeddedCheckoutProtocolConsumer"

    static var applicationName: String {
        return applicationName(entryPoint: nil)
    }

    static func applicationName(entryPoint: MetaData.EntryPoint?) -> String {
        return UserAgent.string(
            platform: ShopifyCheckoutKit.configuration.platform,
            entryPoint: entryPoint
        )
    }

    @discardableResult @MainActor static func sendResponse(_ webView: WKWebView, messageBody: String) async -> Bool {
        do {
            try await webView.evaluateJavaScript(responseScript(messageBody: messageBody))
            return true
        } catch {
            OSLogger.shared.error("Failed to dispatch bridge response: \(error.localizedDescription)")
            return false
        }
    }

    static func responseScript(messageBody: String) -> String {
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
