@testable import CheckoutKitSwiftDemo
import XCTest

@MainActor
final class StorefrontInputFactoryTests: XCTestCase {
    func testHardcodedCartUsesASelectedReusableDeliveryAddress() {
        let originalBuyerIdentityMode = appConfiguration.buyerIdentityMode
        defer { appConfiguration.buyerIdentityMode = originalBuyerIdentityMode }
        appConfiguration.buyerIdentityMode = .hardcoded

        let input = StorefrontInputFactory.shared.createCartInput()

        guard case let .some(delivery) = input.delivery,
              case let .some(addresses) = delivery.addresses,
              let address = addresses.first
        else {
            return XCTFail("Expected a delivery address")
        }
        XCTAssertEqual(addresses.count, 1)
        guard case .some(true) = address.selected else {
            return XCTFail("Expected the delivery address to be selected")
        }
        guard case .none = address.oneTimeUse else {
            return XCTFail("Expected one-time use to be omitted")
        }
    }
}
