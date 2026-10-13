@testable import ShopifyCheckoutKit

struct MockLogger: Logger {
    func log(_: String) {}

    func clearLogs() {}
}
