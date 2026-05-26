@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 17.0, *)
class ShopSettingsTests: XCTestCase {
    func testBasicInitialization() {
        let domain = Domain(host: "test-shop.myshopify.com", url: "https://test-shop.myshopify.com")
        let paymentSettings = PaymentSettings(countryCode: "US")

        let shopSettings = ShopSettings(
            name: "Test Shop",
            primaryDomain: domain,
            paymentSettings: paymentSettings
        )

        XCTAssertEqual(shopSettings.name, "Test Shop")
        XCTAssertEqual(shopSettings.primaryDomain.host, "test-shop.myshopify.com")
        XCTAssertEqual(shopSettings.primaryDomain.url, "https://test-shop.myshopify.com")
        XCTAssertEqual(shopSettings.paymentSettings.countryCode, "US")
    }

    func testConvenienceInitFromApiShop() throws {
        let mockShop = try createMockApiShop(
            name: "Mock Shop",
            host: "mock-shop.myshopify.com",
            url: "https://mock-shop.myshopify.com",
            countryCode: "CA"
        )

        let shopSettings = ShopSettings(from: mockShop)

        XCTAssertEqual(shopSettings.name, "Mock Shop")
        XCTAssertEqual(shopSettings.primaryDomain.host, "mock-shop.myshopify.com")
        XCTAssertEqual(shopSettings.primaryDomain.url, "https://mock-shop.myshopify.com")
        XCTAssertEqual(shopSettings.paymentSettings.countryCode, "CA")
    }

    private func createMockApiShop(
        name: String = "Test Shop",
        host: String = "test-shop.myshopify.com",
        url: String = "https://test-shop.myshopify.com",
        countryCode: String = "US"
    ) throws -> StorefrontAPI.Shop {
        // Create mock data with proper structure
        return StorefrontAPI.Shop(
            name: name,
            description: "Mock shop description",
            primaryDomain: StorefrontAPI.ShopDomain(
                host: host,
                sslEnabled: true,
                url: GraphQLScalars.URL(Foundation.URL(string: url)!)
            ),
            shipsToCountries: ["US", "CA"],
            paymentSettings: StorefrontAPI.ShopPaymentSettings(
                supportedDigitalWallets: ["APPLE_PAY", "SHOP_PAY"],
                acceptedCardBrands: [.visa, .mastercard],
                countryCode: countryCode
            ),
            moneyFormat: "${{amount}}"
        )
    }
}
