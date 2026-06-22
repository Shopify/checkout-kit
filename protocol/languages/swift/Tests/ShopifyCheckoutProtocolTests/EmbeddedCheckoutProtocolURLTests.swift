import Foundation
@testable import ShopifyCheckoutProtocol
import Testing

@Suite("EmbeddedCheckoutProtocol URL Tests")
struct CheckoutProtocolURLTests {
    private let baseURL = URL(string: "https://shop.com/cart/c/abc")!

    private func queryItems(_ url: URL) -> [URLQueryItem] {
        URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
    }

    @Test func appendsEcVersion() {
        let items = queryItems(EmbeddedCheckoutProtocol.url(for: baseURL))
        #expect(items.contains(URLQueryItem(name: "ec_version", value: EmbeddedCheckoutProtocol.specVersion)))
    }

    @Test func omitsDelegateByDefault() {
        let items = queryItems(EmbeddedCheckoutProtocol.url(for: baseURL))
        #expect(!items.contains(where: { $0.name == "ec_delegate" }))
    }

    @Test func appendsSuppliedDelegate() {
        let items = queryItems(EmbeddedCheckoutProtocol.url(for: baseURL, delegations: ["window.open"]))
        #expect(items.contains(URLQueryItem(name: "ec_delegate", value: "window.open")))
    }

    @Test func joinsMultipleDelegationsWithComma() {
        let result = EmbeddedCheckoutProtocol.url(
            for: baseURL,
            delegations: ["window.open", "payment.credential"]
        )
        let items = queryItems(result)
        #expect(items.contains(URLQueryItem(name: "ec_delegate", value: "window.open,payment.credential")))
    }

    @Test func omitsDelegateWhenEmpty() {
        let items = queryItems(EmbeddedCheckoutProtocol.url(for: baseURL, delegations: []))
        #expect(!items.contains(where: { $0.name == "ec_delegate" }))
    }

    @Test func preservesExistingQueryItems() throws {
        let url = try #require(URL(string: "https://shop.com/cart/c/abc?key=cart_token&utm_source=email"))
        let items = queryItems(EmbeddedCheckoutProtocol.url(for: url))
        #expect(items.contains(URLQueryItem(name: "key", value: "cart_token")))
        #expect(items.contains(URLQueryItem(name: "utm_source", value: "email")))
        #expect(items.contains(URLQueryItem(name: "ec_version", value: EmbeddedCheckoutProtocol.specVersion)))
    }

    @Test func replacesCallerSuppliedProtocolQueryItems() throws {
        let url = try #require(URL(string: "https://shop.com/cart/c/abc?ec_version=stale&ec_delegate=custom"))
        let items = queryItems(EmbeddedCheckoutProtocol.url(for: url, delegations: ["window.open"]))

        #expect(items.filter { $0.name == "ec_version" }.map(\.value) == [EmbeddedCheckoutProtocol.specVersion])
        #expect(items.filter { $0.name == "ec_delegate" }.map(\.value) == ["window.open"])
    }

    @Test func isIdempotentOnRecall() {
        let once = EmbeddedCheckoutProtocol.url(for: baseURL, delegations: ["window.open"])
        let twice = EmbeddedCheckoutProtocol.url(for: once, delegations: ["window.open"])
        let items = queryItems(twice)

        #expect(items.filter { $0.name == "ec_version" }.count == 1)
        #expect(items.filter { $0.name == "ec_delegate" }.count == 1)
    }

    @Test func removesExistingDelegationWhenDelegationsAreEmpty() throws {
        let url = try #require(URL(string: "https://shop.com/cart/c/abc?ec_delegate=custom"))
        let items = queryItems(EmbeddedCheckoutProtocol.url(for: url, delegations: []))

        #expect(items.contains(URLQueryItem(name: "ec_version", value: EmbeddedCheckoutProtocol.specVersion)))
        #expect(!items.contains { $0.name == "ec_delegate" })
    }
}
