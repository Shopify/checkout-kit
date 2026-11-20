import Foundation
#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
@testable import ShopifyCheckoutKit
import Testing

@Suite("Checkout URL Decoration")
struct CheckoutURLDecoratorTests {
    @Test func appendsAppAppearanceAndBranding() throws {
        var configuration = Configuration()
        configuration.appearance = .app(.dark())

        let url = try #require(URL(string: "https://shop.com/cart/c/abc?key=cart_token"))
        let items = queryItems(CheckoutURLDecorator.decorate(url, configuration: configuration))

        #expect(items.filter { $0.name == "key" }.map(\.value) == ["cart_token"])
        #expect(items.filter { $0.name == "ec_version" }.map(\.value) == [EmbeddedCheckoutProtocol.specVersion])
        #expect(items.filter { $0.name == "ec_delegate" }.map(\.value) == ["window.open"])
        #expect(items.filter { $0.name == "ec_color_scheme" }.map(\.value) == ["dark"])
        #expect(items.filter { $0.name == "ck_branding" }.map(\.value) == ["app"])
    }

    @Test func replacesCallerSuppliedVersionAndBrandingAndIsIdempotent() throws {
        var configuration = Configuration()
        configuration.appearance = .app(.light())

        let url = try #require(URL(string: "https://shop.com/cart/c/abc?ec_version=caller-supplied&ec_delegate=custom&ck_branding=shop&ec_color_scheme=dark"))
        let once = CheckoutURLDecorator.decorate(url, configuration: configuration)
        let twice = CheckoutURLDecorator.decorate(once, configuration: configuration)
        let items = queryItems(twice)

        #expect(twice == once)
        #expect(items.filter { $0.name == "ec_version" }.map(\.value) == [EmbeddedCheckoutProtocol.specVersion])
        #expect(items.filter { $0.name == "ec_delegate" }.map(\.value) == ["window.open"])
        #expect(items.filter { $0.name == "ec_color_scheme" }.map(\.value) == ["light"])
        #expect(items.filter { $0.name == "ck_branding" }.map(\.value) == ["app"])
    }

    @Test(arguments: [
        "https://shop.example/cart/c/abc#payment",
        "https://shop.example:8443/cart/c/a%2Fb?key=a%2Bb&repeat=one&repeat=two#shipping%20address",
        "https://shop.example/cart/c/abc?flag&empty=&name=%F0%9F%9B%92&ec_version=stale&ck_branding=shop#",
        "https://shop.example/cart/c/abc?ec_color_scheme=dark&ec_delegate=custom&ck_branding=shop&ck_branding=app#review"
    ])
    func preservesUnrelatedURLComponentsAndUsesLatestAppearance(input: String) throws {
        let url = try #require(URL(string: input))
        let original = try #require(URLComponents(url: url, resolvingAgainstBaseURL: false))
        let controlled = Set(["ec_version", "ec_delegate", "ec_color_scheme", "ck_branding"])
        let unrelated = (original.queryItems ?? []).filter { !controlled.contains($0.name) }
        var firstConfiguration = Configuration()
        firstConfiguration.appearance = .app(.dark())
        let first = CheckoutURLDecorator.decorate(url, configuration: firstConfiguration)

        let appearances: [CheckoutAppearance] = [.app(.light()), .app(.automatic()), .storefront()]
        for appearance in appearances {
            var latestConfiguration = Configuration()
            latestConfiguration.appearance = appearance
            let latest = CheckoutURLDecorator.decorate(first, configuration: latestConfiguration)
            let direct = CheckoutURLDecorator.decorate(url, configuration: latestConfiguration)
            let components = try #require(URLComponents(url: latest, resolvingAgainstBaseURL: false))

            #expect(latest == direct)
            #expect(CheckoutURLDecorator.decorate(latest, configuration: latestConfiguration) == latest)
            #expect(components.scheme == original.scheme)
            #expect(components.host == original.host)
            #expect(components.port == original.port)
            #expect(components.percentEncodedPath == original.percentEncodedPath)
            #expect(components.percentEncodedFragment == original.percentEncodedFragment)
            #expect((components.queryItems ?? []).filter { !controlled.contains($0.name) } == unrelated)
        }
    }

    @Test func derivesCheckoutParamsForEachAppearance() throws {
        try assertAppearanceDecoratesWith(.app(.light()), colorScheme: "light", branding: "app")
        try assertAppearanceDecoratesWith(.app(.dark()), colorScheme: "dark", branding: "app")
        try assertAppearanceDecoratesWith(.app(.automatic()), colorScheme: "automatic", branding: "app")
        try assertAppearanceDecoratesWith(.storefront(), colorScheme: "light", branding: "shop")
    }

    @Test func nativeColorOverridesDoNotChangeCheckoutBranding() throws {
        try assertAppearanceDecoratesWith(.app(.automatic().customize { $0.webViewBackgroundColor = .red }), colorScheme: "automatic", branding: "app")
        try assertAppearanceDecoratesWith(.storefront(colors: CheckoutColors(webViewBackgroundColor: .red)), colorScheme: "light", branding: "shop")
    }

    private func assertAppearanceDecoratesWith(
        _ appearance: CheckoutAppearance,
        colorScheme expectedColorScheme: String,
        branding expectedBranding: String
    ) throws {
        var configuration = Configuration()
        configuration.appearance = appearance

        let url = try #require(URL(string: "https://shop.com/cart/c/abc"))
        let items = queryItems(CheckoutURLDecorator.decorate(url, configuration: configuration))

        #expect(items.first(where: { $0.name == "ec_color_scheme" })?.value == expectedColorScheme)
        #expect(items.first(where: { $0.name == "ck_branding" })?.value == expectedBranding)
    }

    private func queryItems(_ url: URL) -> [URLQueryItem] {
        URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
    }
}
