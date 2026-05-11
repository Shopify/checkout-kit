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

import WebKit

enum BridgeError: Swift.Error {
    case invalidBridgeEvent(Swift.Error? = nil)
    case unencodableInstrumentation(Swift.Error? = nil)
}

protocol CheckoutBridgeProtocol {
    static func instrument(_ webView: WKWebView, _ instrumentation: InstrumentationPayload)
    static func sendMessage(_ webView: WKWebView, messageName: String, messageBody: String?)
}

enum CheckoutBridge: CheckoutBridgeProtocol {
    static let messageHandler = "EmbeddedCheckoutProtocolConsumer"

    static var applicationName: String {
        return applicationName(entryPoint: nil)
    }

    static func applicationName(entryPoint: MetaData.EntryPoint?) -> String {
        let colorScheme = ShopifyCheckoutKit.configuration.colorScheme
        let platform = mapPlatform(ShopifyCheckoutKit.configuration.platform)

        return UserAgent.string(
            type: .standard,
            colorScheme: colorScheme,
            platform: platform,
            entryPoint: entryPoint
        )
    }

    static var recoveryAgent: String {
        return recoveryAgent(entryPoint: nil)
    }

    static func recoveryAgent(entryPoint: MetaData.EntryPoint?) -> String {
        let colorScheme = ShopifyCheckoutKit.configuration.colorScheme
        let platform = mapPlatform(ShopifyCheckoutKit.configuration.platform)

        return UserAgent.string(
            type: .recovery,
            colorScheme: colorScheme,
            platform: platform,
            entryPoint: entryPoint
        )
    }

    private static func mapPlatform(_ platform: Platform?) -> MetaData.Platform? {
        guard let platform else { return nil }
        switch platform {
        case .reactNative:
            return .reactNative
        }
    }

    static func instrument(_ webView: WKWebView, _ instrumentation: InstrumentationPayload) {
        if let payload = instrumentation.toBridgeEvent() {
            sendMessage(webView, messageName: "instrumentation", messageBody: payload)
        }
    }

    static func sendMessage(_ webView: WKWebView, messageName: String, messageBody: String?) {
        let dispatchMessageBody: String
        if let body = messageBody {
            dispatchMessageBody = "'\(messageName)', \(body)"
        } else {
            dispatchMessageBody = "'\(messageName)'"
        }
        let script = dispatchMessageTemplate(body: dispatchMessageBody)
        webView.evaluateJavaScript(script)
    }

    static func sendResponse(_ webView: WKWebView, messageBody: String) {
        DispatchQueue.main.async {
            let script = """
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

            webView.evaluateJavaScript(script)
        }
    }

    static func dispatchMessageTemplate(body: String) -> String {
        return """
        if (window.MobileCheckoutSdk && window.MobileCheckoutSdk.dispatchMessage) {
        	window.MobileCheckoutSdk.dispatchMessage(\(body));
        } else {
        	window.addEventListener('mobileCheckoutBridgeReady', function () {
        		window.MobileCheckoutSdk.dispatchMessage(\(body));
        	}, {passive: true, once: true});
        }
        """
    }
}

struct InstrumentationPayload: Codable {
    var name: String
    var value: Int
    var type: InstrumentationType
    var tags: [String: String] = [:]
}

enum InstrumentationType: String, Codable {
    case histogram
}

extension InstrumentationPayload {
    func toBridgeEvent() -> String? {
        SdkToWebEvent(detail: self).toJson()
    }
}

struct SdkToWebEvent<T: Codable>: Codable {
    var detail: T
}

extension SdkToWebEvent {
    func toJson() -> String? {
        do {
            let jsonData = try JSONEncoder().encode(self)
            return String(data: jsonData, encoding: .utf8)
        } catch {
            print(#function, BridgeError.unencodableInstrumentation(error))
        }

        return nil
    }
}
