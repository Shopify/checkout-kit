import Contacts
import PassKit
@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 17.0, *)
final class ErrorHandlerAddressValidationTests: XCTestCase {
    func testAddressValidationIdentifiesTheEditableFieldAndLocalizedMessage() throws {
        let rules: [(StorefrontAPI.CartErrorCode, String, [String])] = [
            (.addressFieldContainsEmojis, "emojis", ["firstName", "lastName", "address1", "address2", "city", "zip"]),
            (.addressFieldContainsHtmlTags, "html_tags", ["firstName", "lastName", "address1", "address2", "city"]),
            (.addressFieldContainsUrl, "url", ["firstName", "lastName"]),
            (.addressFieldDoesNotMatchExpectedPattern, "invalid", ["firstName", "lastName", "phone"]),
            (.addressFieldIsRequired, "missing", ["firstName", "lastName", "address1", "address2", "city", "zip", "phone"]),
            (.addressFieldIsTooLong, "too_long", ["firstName", "lastName", "address1", "address2", "city"])
        ]
        let suffixes = ["firstName": "first_name", "lastName": "last_name", "zip": "postal_code"]
        let postalKeys = [
            "address1": CNPostalAddressStreetKey,
            "address2": CNPostalAddressStreetKey,
            "city": CNPostalAddressCityKey,
            "zip": CNPostalAddressPostalCodeKey
        ]
        for (code, category, fields) in rules {
            for field in fields {
                let action = ErrorHandler.map(
                    errors: [.init(code: code, message: "Invalid field", field: ["addresses", "0", "address", "deliveryAddress", field])],
                    shippingCountry: "US", cart: .testCart
                )
                guard case let .showError(errors) = action else {
                    XCTFail("Expected an editable error for \(code), \(field)")
                    continue
                }
                XCTAssertEqual(errors.count, 1)
                let error = try XCTUnwrap(errors.first) as NSError
                XCTAssertEqual(error.domain, PKPaymentErrorDomain)
                XCTAssertEqual(error.localizedDescription, "errors.\(category).\(suffixes[field] ?? field)".localizedString)
                if let postalKey = postalKeys[field] {
                    XCTAssertEqual(error.userInfo[PKPaymentErrorKey.postalAddressUserInfoKey.rawValue] as? String, postalKey)
                } else {
                    let contact: PKContactField = field == "phone" ? .phoneNumber : .name
                    XCTAssertEqual(error.userInfo[PKPaymentErrorKey.contactFieldUserInfoKey.rawValue] as? PKContactField, contact)
                }
            }
        }
    }

    func testUnsupportedAddressFieldsFallBackToTheCheckoutURL() {
        let codes: [StorefrontAPI.CartErrorCode] = [
            .addressFieldContainsEmojis,
            .addressFieldContainsHtmlTags,
            .addressFieldContainsUrl,
            .addressFieldDoesNotMatchExpectedPattern,
            .addressFieldIsRequired,
            .addressFieldIsTooLong
        ]
        for code in codes {
            assertInterrupt(code, field: ["unsupported"], reason: .unhandled)
        }
    }

    func testNonEditableErrorsPreserveTheCheckoutURLAndReason() {
        let unhandled: [StorefrontAPI.CartErrorCode] = [
            .invalidMerchandiseLine, .giftCardRecipientInvalid, .invalidPaymentEmptyCart,
            .invalidIncrement, .invalidMetafields, .onlyOneDeliveryAddressCanBeSelected,
            .paymentsCreditCardBaseExpired, .pendingDeliveryGroups, .invalidCompanyLocation,
            .invalidDeliveryAddressId, .variantRequiresSellingPlan, .cartTooLarge, .notApplicable,
            .insufficientBalance, .deliveryAddressSizeExceeded, .unknownValue
        ]
        for code in unhandled {
            assertInterrupt(code, reason: .unhandled)
        }
        for code: StorefrontAPI.CartErrorCode in [.merchandiseLineTransformersRunError, .validationCustom, .paymentMethodUnavailable] {
            assertInterrupt(code, reason: .other)
        }
        assertInterrupt(.tooManyLineItems, reason: .outOfStock)
        assertInterrupt(.notEnoughStock, reason: .notEnoughStock)
        assertInterrupt(.invalid, field: ["input", "lines", "0", "quantity"], reason: .outOfStock)
        assertInterrupt(.invalid, field: ["unknown"], reason: .unhandled)
        assertInterrupt(.invalidPayment, field: ["amount"], reason: .other)
        assertInterrupt(.invalidPayment, field: ["payment", "amount"], reason: .other)
        assertInterrupt(.invalidPayment, field: ["unknown"], reason: .unhandled)
        assertInterrupt(.paymentMethodNotSupported, field: ["payment", "walletPaymentMethod", "applePayWalletContent"], reason: .other)
        assertInterrupt(.paymentMethodNotSupported, field: ["unknown"], reason: .unhandled)
    }

    func testPostalErrorsPointToTheCorrectCountrySpecificField() throws {
        let cases: [(StorefrontAPI.CartErrorCode, String, String)] = [
            (.invalidZipCodeForCountry, "US", CNPostalAddressPostalCodeKey),
            (.invalidZipCodeForProvince, "CA", CNPostalAddressPostalCodeKey),
            (.provinceNotFound, "AE", CNPostalAddressSubLocalityKey),
            (.provinceNotFound, "CA", CNPostalAddressSubAdministrativeAreaKey)
        ]
        for (code, country, key) in cases {
            let action = ErrorHandler.map(errors: [.init(code: code, message: "Invalid address", field: nil)], shippingCountry: country, cart: nil)
            guard case let .showError(errors) = action else { return XCTFail("Expected address correction for \(code)") }
            let error = try XCTUnwrap(errors.first) as NSError
            XCTAssertEqual(error.userInfo[PKPaymentErrorKey.postalAddressUserInfoKey.rawValue] as? String, key)
        }
    }

    private func assertInterrupt(
        _ code: StorefrontAPI.CartErrorCode,
        field: [String]? = nil,
        reason: ErrorHandler.InterruptReason,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        let cart = StorefrontAPI.Cart.testCart
        let result = ErrorHandler.map(errors: [.init(code: code, message: "Cannot complete", field: field)], shippingCountry: "US", cart: cart)
        guard case let .interrupt(actualReason, url) = result else { return XCTFail("Expected fallback for \(code)", file: file, line: line) }
        XCTAssertEqual(actualReason, reason, file: file, line: line)
        XCTAssertEqual(url, cart.checkoutUrl.url, file: file, line: line)
    }
}
