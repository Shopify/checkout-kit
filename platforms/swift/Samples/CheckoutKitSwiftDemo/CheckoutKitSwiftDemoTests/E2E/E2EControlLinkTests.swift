@testable import CheckoutKitSwiftDemo
import XCTest

class E2EControlLinkTests: XCTestCase {
    func testReturnsNilWhenTheLinkIsNotAControlLink() throws {
        XCTAssertNil(try E2EControlLink.parse("https://example.com/cart"))
        XCTAssertNil(try E2EControlLink.parse("com.shopify.checkoutkit.swiftdemo://products/1"))
        XCTAssertNil(try E2EControlLink.parse("not a url"))
    }

    func testParsesEveryAppScheme() throws {
        let expected = E2EControlLink.cart(.init(productIndex: 0, quantity: 1))
        let schemes = [
            "com.shopify.checkoutkit.swiftdemo",
            "com.shopify.checkoutkit.androiddemo",
            "com.shopify.checkoutkit.reactnativedemo"
        ]

        for scheme in schemes {
            XCTAssertEqual(try E2EControlLink.parse("\(scheme)://e2e/cart?productIndex=0"), expected)
        }
    }

    func testParsesASchemeTheMatrixDoesNotDeclare() throws {
        let expected = E2EControlLink.cart(.init(productIndex: 0, quantity: 1))

        XCTAssertEqual(try E2EControlLink.parse("com.example.anything://e2e/cart?productIndex=0"), expected)
    }

    func testParsesTheResetCommand() throws {
        XCTAssertEqual(try parse("/reset"), .reset)
    }

    func testRejectsParametersOnTheResetCommand() {
        assertThrows(.unexpectedParameters(command: "reset"), "/reset?productIndex=0")
    }

    func testRejectsUnknownCommands() {
        assertThrows(.unsupportedCommand, "")
        assertThrows(.unsupportedCommand, "/")
        assertThrows(.unsupportedCommand, "/teleport?productIndex=0")
        assertThrows(.unsupportedCommand, "/cart/extra?productIndex=0")
    }

    func testRejectsCartCommandsWithoutAProductSelector() {
        assertThrows(.missingProductSelector, "/cart")
        assertThrows(.missingProductSelector, "/cart?")
        assertThrows(.missingProductSelector, "/cart?quantity=2")
    }

    func testRejectsCartCommandsWithBothProductSelectors() {
        assertThrows(.ambiguousProductSelector, "/cart?variantId=gid://shopify/ProductVariant/1&productIndex=0")
    }

    func testRejectsABlankVariantId() {
        assertThrows(.blankVariantId, "/cart?variantId=")
        assertThrows(.blankVariantId, "/cart?variantId=%20")
    }

    func testRejectsInvalidQuantities() {
        for quantity in ["", "0", "-1", "1.5", "abc"] {
            assertThrows(.invalidQuantity, "/cart?productIndex=0&quantity=\(quantity)")
        }
    }

    func testRejectsInvalidProductIndexes() {
        for productIndex in ["", "-1", "1.5", "abc"] {
            assertThrows(.invalidProductIndex, "/cart?productIndex=\(productIndex)")
        }
    }

    func testRejectsInvalidBuyerIdentityModes() {
        for buyerIdentityMode in ["", "member"] {
            assertThrows(.invalidBuyerIdentityMode, "/cart?productIndex=0&buyerIdentityMode=\(buyerIdentityMode)")
        }
    }

    func testParsesACartCommandWithAVariantId() throws {
        let link = try parse("/cart?variantId=gid://shopify/ProductVariant/1&quantity=2&buyerIdentityMode=guest")

        XCTAssertEqual(link, .cart(.init(variantId: "gid://shopify/ProductVariant/1", quantity: 2, buyerIdentityMode: .guest)))
    }

    func testParsesACartCommandWithAProductIndexAndTheDefaultQuantity() throws {
        let link = try parse("/cart?productIndex=3&buyerIdentityMode=hardcoded")

        XCTAssertEqual(link, .cart(.init(productIndex: 3, quantity: 1, buyerIdentityMode: .hardcoded)))
    }

    func testParsesACartCommandWithATrailingSlash() throws {
        XCTAssertEqual(try parse("/cart/?productIndex=3"), .cart(.init(productIndex: 3, quantity: 1)))
    }

    func testParsesASignInCommandWithoutAnEmail() throws {
        XCTAssertEqual(try parse("/signIn"), .signIn(email: nil))
    }

    func testParsesASignInCommandWithAnEmail() throws {
        XCTAssertEqual(try parse("/signIn?email=shopper%2Be2e@example.com"), .signIn(email: "shopper+e2e@example.com"))
    }

    func testRejectsABlankSignInEmail() {
        assertThrows(.blankEmail, "/signIn?email=")
        assertThrows(.blankEmail, "/signIn?email=%20")
    }

    func testErrorMessagesMatchTheOtherPlatforms() {
        let messages = [
            E2EControlLinkError.unsupportedCommand: "Unsupported e2e command",
            E2EControlLinkError.unexpectedParameters(command: "reset"): "reset takes no parameters",
            E2EControlLinkError.missingProductSelector: "Missing variantId or productIndex",
            E2EControlLinkError.ambiguousProductSelector: "Use variantId or productIndex, not both",
            E2EControlLinkError.blankVariantId: "variantId must not be blank",
            E2EControlLinkError.invalidQuantity: "quantity must be a positive integer",
            E2EControlLinkError.invalidProductIndex: "productIndex must be a non-negative integer",
            E2EControlLinkError.invalidBuyerIdentityMode: "buyerIdentityMode must be guest, hardcoded, or customerAccount",
            E2EControlLinkError.blankEmail: "email must not be blank"
        ]

        for (error, message) in messages {
            XCTAssertEqual(error.errorDescription, message)
        }
    }

    private func parse(_ path: String) throws -> E2EControlLink? {
        try E2EControlLink.parse("com.shopify.checkoutkit.swiftdemo://e2e\(path)")
    }

    private func assertThrows(
        _ expected: E2EControlLinkError,
        _ path: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        XCTAssertThrowsError(try parse(path), path, file: file, line: line) { error in
            XCTAssertEqual(error as? E2EControlLinkError, expected, path, file: file, line: line)
        }
    }
}
