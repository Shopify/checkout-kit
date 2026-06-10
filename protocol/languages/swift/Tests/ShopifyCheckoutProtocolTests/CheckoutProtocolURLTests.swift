import Foundation
@testable import ShopifyCheckoutProtocol
import Testing

@Suite("CheckoutProtocol URL Tests")
struct CheckoutProtocolURLTests {
    private let baseURL = URL(string: "https://shop.com/cart/c/abc")!

    private func queryItems(_ url: URL) -> [URLQueryItem] {
        URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
    }

    @Test func appendsEcVersion() {
        let items = queryItems(CheckoutProtocol.url(for: baseURL))
        #expect(items.contains(URLQueryItem(name: "ec_version", value: CheckoutProtocol.specVersion)))
    }

    @Test func appendsDefaultDelegate() {
        let items = queryItems(CheckoutProtocol.url(for: baseURL))
        #expect(items.contains(URLQueryItem(name: "ec_delegate", value: "window.open")))
    }

    @Test func joinsMultipleDelegationsWithComma() {
        let result = CheckoutProtocol.url(
            for: baseURL,
            delegations: ["window.open", "payment.credential"]
        )
        let items = queryItems(result)
        #expect(items.contains(URLQueryItem(name: "ec_delegate", value: "window.open,payment.credential")))
    }

    @Test func omitsDelegateWhenEmpty() {
        let items = queryItems(CheckoutProtocol.url(for: baseURL, delegations: []))
        #expect(!items.contains(where: { $0.name == "ec_delegate" }))
    }

    @Test func preservesExistingQueryItems() throws {
        let url = try #require(URL(string: "https://shop.com/cart/c/abc?key=cart_token&utm_source=email"))
        let items = queryItems(CheckoutProtocol.url(for: url))
        #expect(items.contains(URLQueryItem(name: "key", value: "cart_token")))
        #expect(items.contains(URLQueryItem(name: "utm_source", value: "email")))
        #expect(items.contains(URLQueryItem(name: "ec_version", value: CheckoutProtocol.specVersion)))
    }

    @Test func replacesCallerSuppliedProtocolQueryItems() throws {
        let url = try #require(URL(string: "https://shop.com/cart/c/abc?ec_version=stale&ec_delegate=custom"))
        let items = queryItems(CheckoutProtocol.url(for: url))

        #expect(items.filter { $0.name == "ec_version" }.map(\.value) == [CheckoutProtocol.specVersion])
        #expect(items.filter { $0.name == "ec_delegate" }.map(\.value) == ["window.open"])
    }

    @Test func isIdempotentOnRecall() {
        let once = CheckoutProtocol.url(for: baseURL)
        let twice = CheckoutProtocol.url(for: once)
        let items = queryItems(twice)

        #expect(items.filter { $0.name == "ec_version" }.count == 1)
        #expect(items.filter { $0.name == "ec_delegate" }.count == 1)
    }

    @Test func removesExistingDelegationWhenDelegationsAreEmpty() throws {
        let url = try #require(URL(string: "https://shop.com/cart/c/abc?ec_delegate=custom"))
        let items = queryItems(CheckoutProtocol.url(for: url, delegations: []))

        #expect(items.contains(URLQueryItem(name: "ec_version", value: CheckoutProtocol.specVersion)))
        #expect(!items.contains { $0.name == "ec_delegate" })
    }
}
