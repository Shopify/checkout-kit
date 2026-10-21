import Foundation
@testable import ShopifyAcceleratedCheckouts
import XCTest

class CheckoutIdentifierTests: XCTestCase {
    // MARK: - Test Data Factory Methods

    private func validCartIDs() -> [String] {
        return [
            "gid://shopify/Cart/test-id",
            "gid://Shopify/Cart/Z2NwLXVzLWV4YW1wbGU6MDEyMzQ1Njc4OTAxMjM0NTY3ODkw?key=example",
            "GID://SHOPIFY/CART/uppercase-test",
            "gid://shopify/Cart/complex-id-123?key=value&param=test",
            "gid://shopify/cart/lowercase-type"
        ]
    }

    private func invalidCartIDs() -> [String] {
        return [
            "",
            "invalid-cart-id",
            "cart/test-id",
            "gid://shopify/Product/test-id",
            "gid://other/Cart/test-id",
            "gid://different/Cart/test-id"
        ]
    }

    // MARK: - 1. Initialization Tests

    func test_cartInit_whenValidID_createsCartCase() {
        let cartID = "gid://shopify/Cart/test-id"
        let identifier = CheckoutIdentifier.cart(cartID: cartID)

        if case let .cart(id) = identifier {
            XCTAssertEqual(id, cartID)
        } else {
            XCTFail("Expected cart case, got \(identifier)")
        }
    }

    func test_cartInit_whenEmptyID_createsCartCase() {
        let cartID = ""
        let identifier = CheckoutIdentifier.cart(cartID: cartID)

        if case let .cart(id) = identifier {
            XCTAssertEqual(id, cartID)
        } else {
            XCTFail("Expected cart case, got \(identifier)")
        }
    }

    func test_invariantInit_whenReasonProvided_createsInvariantCase() {
        let reason = "Test error reason"
        let identifier = CheckoutIdentifier.invariant(reason: reason)

        if case let .invariant(errorReason) = identifier {
            XCTAssertEqual(errorReason, reason)
        } else {
            XCTFail("Expected invariant case, got \(identifier)")
        }
    }

    // MARK: - 2. Parse Method Tests - Cart

    func test_parse_whenValidCartFormats_returnsSelf() {
        for cartID in validCartIDs() {
            let identifier = CheckoutIdentifier.cart(cartID: cartID)
            let parsed = identifier.parse()

            if case let .cart(id) = parsed {
                XCTAssertEqual(id, cartID, "Cart ID '\(cartID)' should parse successfully")
            } else {
                XCTFail("Cart ID '\(cartID)' should parse successfully, got \(parsed)")
            }
        }
    }

    func test_parse_whenInvalidCartFormats_returnsInvariantWithReason() {
        for cartID in invalidCartIDs() {
            let identifier = CheckoutIdentifier.cart(cartID: cartID)
            let parsed = identifier.parse()

            if case let .invariant(reason) = parsed {
                XCTAssertTrue(reason.contains("Invalid 'cartID' format"), "Reason should mention invalid cartID format for '\(cartID)'")

            } else {
                XCTFail("Cart ID '\(cartID)' should return invariant with reason, got \(parsed)")
            }
        }
    }

    func test_parse_whenCartIDCaseInsensitive_returnsSelf() {
        let cartID = "GID://SHOPIFY/CART/test-id"
        let identifier = CheckoutIdentifier.cart(cartID: cartID)
        let parsed = identifier.parse()

        if case let .cart(id) = parsed {
            XCTAssertEqual(id, cartID)
        } else {
            XCTFail("Case insensitive cart ID should parse successfully, got \(parsed)")
        }
    }

    func test_parse_whenInvalidCartID_returnsInvariantWithCorrectErrorMessage() {
        let invalidCartID = "invalid-cart-id"
        let identifier = CheckoutIdentifier.cart(cartID: invalidCartID)
        let parsed = identifier.parse()

        if case let .invariant(reason) = parsed {
            let expectedPrefix = "[invariant_violation] Invalid 'cartID' format. Expected to start with 'gid://Shopify/Cart/'"
            XCTAssertEqual(reason, expectedPrefix)
        } else {
            XCTFail("Invalid cart ID should return invariant with error message")
        }
    }

    // MARK: - 2. Parse Method Tests - Invariant

    func test_parse_whenInvariantCase_returnsSelf() {
        let reason = "Test error reason"
        let identifier = CheckoutIdentifier.invariant(reason: reason)
        let parsed = identifier.parse()

        if case let .invariant(errorReason) = parsed {
            XCTAssertEqual(errorReason, reason)
        } else {
            XCTFail("Invariant case should return self, got \(parsed)")
        }
    }

    func test_diagnosticCartID_shouldStripQueryAndFragmentWithoutChangingRequestID() {
        let cartID = "gid://shopify/Cart/test-cart"
        for suffix in [
            "",
            "?key=synthetic-secret",
            "?KEY=synthetic-secret&token=synthetic-token",
            "#synthetic-fragment",
            "?key=synthetic-secret#synthetic-fragment",
            "#fragment?key=synthetic-secret"
        ] {
            let identifier = CheckoutIdentifier.cart(cartID: cartID + suffix)
            XCTAssertEqual(identifier.diagnosticCartID, cartID)
            guard case let .cart(requestID) = identifier.parse() else {
                XCTFail("Expected valid cart")
                continue
            }
            XCTAssertEqual(requestID, cartID + suffix)
        }
    }

    func test_diagnosticCartID_whenInvalid_shouldOmitInput() {
        XCTAssertNil(CheckoutIdentifier.cart(cartID: "invalid?key=synthetic-secret").diagnosticCartID)
        XCTAssertNil(CheckoutIdentifier.invariant(reason: "Invalid cart").diagnosticCartID)
    }

    // MARK: - 3. Helper Method Tests - isValid

    func test_isValid_whenValidCartID_returnsTrue() {
        for cartID in validCartIDs() {
            let identifier = CheckoutIdentifier.cart(cartID: cartID)
            XCTAssertTrue(identifier.isValid(), "Cart ID '\(cartID)' should be valid")
        }
    }

    func test_isValid_whenInvalidCartID_returnsFalse() {
        for cartID in invalidCartIDs() {
            let identifier = CheckoutIdentifier.cart(cartID: cartID)
            XCTAssertFalse(identifier.isValid(), "Cart ID '\(cartID)' should be invalid")
        }
    }

    func test_isValid_whenInvariantCase_returnsFalse() {
        let identifier = CheckoutIdentifier.invariant(reason: "Test error")
        XCTAssertFalse(identifier.isValid())
    }

    // MARK: - 4. Edge Cases Tests

    func test_parse_whenEmptyStrings_returnsInvariantWithReason() {
        let cartIdentifier = CheckoutIdentifier.cart(cartID: "")
        let cartParsed = cartIdentifier.parse()

        if case let .invariant(reason) = cartParsed {
            XCTAssertTrue(reason.contains("Invalid 'cartID' format"))
        } else {
            XCTFail("Empty cart ID should return invariant")
        }
    }

    func test_parse_whenWhitespaceOnlyStrings_returnsInvariantWithReason() {
        let cartIdentifier = CheckoutIdentifier.cart(cartID: "   ")
        let cartParsed = cartIdentifier.parse()

        if case let .invariant(reason) = cartParsed {
            XCTAssertTrue(reason.contains("Invalid 'cartID' format"))
        } else {
            XCTFail("Whitespace-only cart ID should return invariant")
        }
    }

    func test_parse_whenExtremelyLongIDs_handlesGracefully() {
        let longValidCartID = "gid://shopify/Cart/" + String(repeating: "a", count: 1000)
        let cartIdentifier = CheckoutIdentifier.cart(cartID: longValidCartID)
        let cartParsed = cartIdentifier.parse()

        if case let .cart(id) = cartParsed {
            XCTAssertEqual(id, longValidCartID)
        } else {
            XCTFail("Long valid cart ID should parse successfully")
        }
    }

    func test_parse_whenSpecialCharactersInIDs_handlesCorrectly() {
        let specialCharsCartID = "gid://shopify/Cart/test-id_123%20with%20special&chars=true"
        let cartIdentifier = CheckoutIdentifier.cart(cartID: specialCharsCartID)
        let cartParsed = cartIdentifier.parse()

        if case let .cart(id) = cartParsed {
            XCTAssertEqual(id, specialCharsCartID)
        } else {
            XCTFail("Cart ID with special characters should parse successfully")
        }
    }

    // MARK: - 5. Error Message Validation Tests

    func test_parse_whenCartValidationFails_returnsExpectedErrorMessage() {
        let testCases = [
            ("invalid-cart", "[invariant_violation] Invalid 'cartID' format. Expected to start with 'gid://Shopify/Cart/'"),
            ("", "[invariant_violation] Invalid 'cartID' format. Expected to start with 'gid://Shopify/Cart/'"),
            ("gid://shopify/Product/123?key=synthetic-secret", "[invariant_violation] Invalid 'cartID' format. Expected to start with 'gid://Shopify/Cart/'")
        ]

        for (cartID, expectedMessage) in testCases {
            let identifier = CheckoutIdentifier.cart(cartID: cartID)
            let parsed = identifier.parse()

            if case let .invariant(reason) = parsed {
                XCTAssertEqual(reason, expectedMessage, "Error message mismatch for cart ID '\(cartID)'")
            } else {
                XCTFail("Invalid cart ID '\(cartID)' should return invariant with error message")
            }
        }
    }

    // MARK: - 6. Integration Tests

    func test_parse_whenCalledMultipleTimes_remainsConsistent() {
        let cartID = "gid://shopify/Cart/test-id"
        let identifier = CheckoutIdentifier.cart(cartID: cartID)

        let firstParse = identifier.parse()
        let secondParse = identifier.parse()
        let thirdParse = identifier.parse()

        if case let .cart(firstID) = firstParse,
           case let .cart(secondID) = secondParse,
           case let .cart(thirdID) = thirdParse
        {
            XCTAssertEqual(firstID, secondID)
            XCTAssertEqual(secondID, thirdID)
            XCTAssertEqual(firstID, cartID)
        } else {
            XCTFail("Multiple parse calls should return consistent results")
        }

        let invalidCartID = "invalid-cart"
        let invalidIdentifier = CheckoutIdentifier.cart(cartID: invalidCartID)

        let firstInvalidParse = invalidIdentifier.parse()
        let secondInvalidParse = invalidIdentifier.parse()

        if case let .invariant(firstReason) = firstInvalidParse,
           case let .invariant(secondReason) = secondInvalidParse
        {
            XCTAssertEqual(firstReason, secondReason)
        } else {
            XCTFail("Multiple parse calls on invalid identifier should return consistent results")
        }
    }

    // MARK: - 7. Cart Provider Tests

    @MainActor
    func test_resolve_whenCartProviderReturnsValidCartID_returnsCartAndCallsProviderOnce() async throws {
        var calls = 0
        let source = CartSource.provider { _ in
            calls += 1
            return .cart("gid://shopify/Cart/provided?key=synthetic")
        }

        XCTAssertTrue(source.isValid(), "A provider is validated when it is resolved")
        XCTAssertEqual(calls, 0, "Validation must not call the provider")

        let resolved = try await source.resolve(for: CartRequest(wallet: .applePay))
        guard case let .cart(id) = resolved else { return XCTFail("Expected cart case, got \(resolved)") }
        XCTAssertEqual(id, "gid://shopify/Cart/provided?key=synthetic")
        XCTAssertEqual(calls, 1)
    }

    @MainActor
    func test_resolve_whenCartProviderHandlesFailure_endsTheAttemptQuietly() async {
        let source = CartSource.provider { _ in .failed }

        await XCTAssertThrowsErrorAsync(try await source.resolve(for: CartRequest(wallet: .applePay))) { error in
            XCTAssertTrue(error is HandledCartRequestFailure)
        }
    }

    @MainActor
    func test_resolve_whenCartProviderReturnsInvalidID_returnsInvariant() async throws {
        let source = CartSource.provider { _ in .cart("gid://shopify/ProductVariant/123") }

        let resolved = try await source.resolve(for: CartRequest(wallet: .applePay))
        guard case let .invariant(reason) = resolved else { return XCTFail("Expected invariant, got \(resolved)") }
        XCTAssertTrue(reason.contains("Invalid 'cartID' format"))
    }

    @MainActor
    func test_resolve_whenCartProviderThrows_rethrows() async {
        struct ProviderError: Error {}
        let source = CartSource.provider { _ in throw ProviderError() }

        do {
            _ = try await source.resolve(for: CartRequest(wallet: .applePay))
            XCTFail("Expected the provider error")
        } catch {
            XCTAssertTrue(error is ProviderError)
        }
    }

    @MainActor
    func test_resolve_whenFixedCart_parsesWithoutProvider() async throws {
        let valid = try await CartSource.cart(.cart(cartID: "gid://shopify/Cart/test-id")).resolve(for: CartRequest(wallet: .applePay))
        guard case .cart = valid else { return XCTFail("Expected cart case, got \(valid)") }

        let invalid = try await CartSource.cart(.cart(cartID: "invalid-cart")).resolve(for: CartRequest(wallet: .applePay))
        guard case .invariant = invalid else { return XCTFail("Expected invariant, got \(invalid)") }
    }
}
