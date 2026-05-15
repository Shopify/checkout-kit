/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import Foundation
@testable import ShopifyCheckoutProtocol
import Testing

@Suite("CheckoutProtocol URL Tests")
struct CheckoutProtocolURLTests {
    @Test func appendsVersionAndColorScheme() throws {
        let input = try #require(URL(string: "https://shop.example.com/checkout"))
        let result = CheckoutProtocol.url(for: input, colorScheme: "automatic")

        let components = try #require(URLComponents(url: result, resolvingAgainstBaseURL: false))
        let items = try #require(components.queryItems)
        #expect(items.contains(URLQueryItem(name: "ec_version", value: CheckoutProtocol.specVersion)))
        #expect(items.contains(URLQueryItem(name: "ec_color_scheme", value: "automatic")))
    }

    @Test func appendsDefaultDelegate() throws {
        let input = try #require(URL(string: "https://shop.example.com/checkout"))
        let result = CheckoutProtocol.url(for: input, colorScheme: "light")

        let components = try #require(URLComponents(url: result, resolvingAgainstBaseURL: false))
        let items = try #require(components.queryItems)
        #expect(items.contains(URLQueryItem(name: "ec_delegate", value: "window.open")))
    }

    @Test func joinsMultipleDelegationsWithComma() throws {
        let input = try #require(URL(string: "https://shop.example.com/checkout"))
        let result = CheckoutProtocol.url(
            for: input,
            colorScheme: "light",
            delegations: ["window.open", "payment.credential"]
        )

        let components = try #require(URLComponents(url: result, resolvingAgainstBaseURL: false))
        let items = try #require(components.queryItems)
        #expect(items.contains(URLQueryItem(name: "ec_delegate", value: "window.open,payment.credential")))
    }

    @Test func omitsDelegateWhenEmpty() throws {
        let input = try #require(URL(string: "https://shop.example.com/checkout"))
        let result = CheckoutProtocol.url(for: input, colorScheme: "light", delegations: [])

        let components = try #require(URLComponents(url: result, resolvingAgainstBaseURL: false))
        let items = try #require(components.queryItems)
        #expect(!items.contains(where: { $0.name == "ec_delegate" }))
    }

    @Test func preservesExistingQueryItems() throws {
        let input = try #require(URL(string: "https://shop.example.com/checkout?cart=abc"))
        let result = CheckoutProtocol.url(for: input, colorScheme: "light")

        let components = try #require(URLComponents(url: result, resolvingAgainstBaseURL: false))
        let items = try #require(components.queryItems)
        #expect(items.contains(URLQueryItem(name: "cart", value: "abc")))
    }
}
