@testable import RNShopifyCheckoutKit
import XCTest

extension RCTShopifyCheckoutKit {
    /// Calls `setConfig` on the main thread, where it applies the configuration and resolves before it returns.
    func applyConfig(_ configuration: [AnyHashable: Any], file: StaticString = #filePath, line: UInt = #line) {
        var resolved = false
        setConfig(
            configuration,
            resolve: { _ in resolved = true },
            reject: { code, message, _ in
                XCTFail("setConfig rejected: \(code ?? "") \(message ?? "")", file: file, line: line)
            }
        )
        XCTAssertTrue(resolved, "setConfig did not resolve", file: file, line: line)
    }
}
