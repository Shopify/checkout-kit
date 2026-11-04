import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 16.0, *)
class CustomerTests: XCTestCase {
    typealias Customer = ShopifyAcceleratedCheckouts.Customer

    func test_init_withCustomerAccessToken_keepsContactsUnset() {
        let makeCustomer: (String) -> Customer = Customer.init(customerAccessToken:)
        let customer = makeCustomer("customer-access-token")

        XCTAssertEqual(customer.customerAccessToken, "customer-access-token")
        XCTAssertNil(customer.email)
        XCTAssertNil(customer.phoneNumber)
    }

    func test_init_withContacts_keepsAccessTokenUnset() {
        let makeCustomer: (String?, String?) -> Customer = Customer.init(email:phoneNumber:)
        let customer = makeCustomer("buyer@example.com", "+15555555555")

        XCTAssertEqual(customer.email, "buyer@example.com")
        XCTAssertEqual(customer.phoneNumber, "+15555555555")
        XCTAssertNil(customer.customerAccessToken)
    }

    func test_init_withEmailOnly_keepsPhoneAndAccessTokenUnset() {
        let customer = Customer(email: "buyer@example.com")

        XCTAssertEqual(customer.email, "buyer@example.com")
        XCTAssertNil(customer.phoneNumber)
        XCTAssertNil(customer.customerAccessToken)
    }

    func test_init_withPhoneOnly_keepsEmailAndAccessTokenUnset() {
        let customer = Customer(phoneNumber: "+15555555555")

        XCTAssertEqual(customer.phoneNumber, "+15555555555")
        XCTAssertNil(customer.email)
        XCTAssertNil(customer.customerAccessToken)
    }

    func test_init_withoutIdentity_keepsAllFieldsUnset() {
        let customer = Customer()

        XCTAssertNil(customer.email)
        XCTAssertNil(customer.phoneNumber)
        XCTAssertNil(customer.customerAccessToken)
    }

    @available(*, deprecated)
    func test_init_withCombinedIdentity_preservesLegacyValues() {
        let customer = Customer(
            email: "buyer@example.com",
            phoneNumber: "+15555555555",
            customerAccessToken: "customer-access-token"
        )

        XCTAssertEqual(customer.email, "buyer@example.com")
        XCTAssertEqual(customer.phoneNumber, "+15555555555")
        XCTAssertEqual(customer.customerAccessToken, "customer-access-token")
    }

    @available(*, deprecated)
    func test_init_withOptionalAccessToken_preservesLegacyDefaults() {
        let accessToken: String? = "customer-access-token"
        let customer = Customer(customerAccessToken: accessToken)

        XCTAssertEqual(customer.customerAccessToken, accessToken)
        XCTAssertNil(customer.email)
        XCTAssertNil(customer.phoneNumber)
    }
}
