import Foundation
@testable import ShopifyCustomerAccounts
import XCTest

final class CustomerAccountConfigurationTests: XCTestCase {
    func testSharedBrowserSessionIsTheDefault() throws {
        let configuration = try CustomerAccountConfiguration(
            shopID: "123456789",
            clientID: "test-client",
            redirectURI: XCTUnwrap(URL(string: "shop.123456789.app://callback"))
        )

        XCTAssertEqual(configuration.browserSession, .shared)
    }
}
