import Foundation
import WebKit

@MainActor
enum ReactNativeCodeQLCanary {
    static func loadRemoteHTML(in webView: WKWebView) throws {
        let remoteHTML = try String(contentsOf: URL(string: "https://example.com")!)
        webView.loadHTMLString(remoteHTML, baseURL: nil)
    }
}
