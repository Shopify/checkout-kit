import Foundation
@testable import ShopifyCheckoutKit
import Testing

@Suite("Checkout URL Decoration")
struct CheckoutURLDecoratorTests {
    @Test func appendsColorSchemeAndDerivedAppBranding() throws {
        var configuration = Configuration()
        configuration.colorScheme = .dark

        let url = try #require(URL(string: "https://shop.com/cart/c/abc?key=cart_token"))
        let items = queryItems(CheckoutURLDecorator.decorate(url, configuration: configuration))

        #expect(items.first(where: { $0.name == "key" })?.value == "cart_token")
        #expect(items.first(where: { $0.name == "ec_color_scheme" })?.value == "dark")
        #expect(items.first(where: { $0.name == "ck_branding" })?.value == "app")
    }

    @Test func replacesCallerSuppliedBrandingAndIsIdempotent() throws {
        var configuration = Configuration()
        configuration.colorScheme = .light

        let url = try #require(URL(string: "https://shop.com/cart/c/abc?ck_branding=app&ec_color_scheme=dark"))
        let once = CheckoutURLDecorator.decorate(url, configuration: configuration)
        let twice = CheckoutURLDecorator.decorate(once, configuration: configuration)
        let items = queryItems(twice)

        #expect(items.filter { $0.name == "ck_branding" }.map(\.value) == ["app"])
        #expect(items.filter { $0.name == "ec_color_scheme" }.map(\.value) == ["light"])
    }

    @Test func derivesBrandingForEachColorScheme() throws {
        try assertColorSchemeDecoratesWith(.light, colorScheme: "light", branding: "app")
        try assertColorSchemeDecoratesWith(.dark, colorScheme: "dark", branding: "app")
        try assertColorSchemeDecoratesWith(.automatic, colorScheme: "automatic", branding: "app")
        try assertColorSchemeDecoratesWith(.web, colorScheme: "web_default", branding: "shop")
    }

    private func assertColorSchemeDecoratesWith(
        _ colorScheme: Configuration.ColorScheme,
        colorScheme expectedColorScheme: String,
        branding expectedBranding: String
    ) throws {
        var configuration = Configuration()
        configuration.colorScheme = colorScheme

        let url = try #require(URL(string: "https://shop.com/cart/c/abc"))
        let items = queryItems(CheckoutURLDecorator.decorate(url, configuration: configuration))

        #expect(items.first(where: { $0.name == "ec_color_scheme" })?.value == expectedColorScheme)
        #expect(items.first(where: { $0.name == "ck_branding" })?.value == expectedBranding)
    }

    private func queryItems(_ url: URL) -> [URLQueryItem] {
        URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
    }
}
