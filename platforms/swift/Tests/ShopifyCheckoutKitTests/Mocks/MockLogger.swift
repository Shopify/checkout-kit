@testable import ShopifyCheckoutKit

class MockLogger: NoOpLogger {
    var loggedError: Error?
    var loggedMessage: String?

    func logError(_ error: Error, _ message: String) {
        loggedError = error
        loggedMessage = message
    }
}
