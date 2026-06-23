import PassKit
@testable import ShopifyAcceleratedCheckouts
import SwiftUI
import XCTest

@available(iOS 16.0, *)
@MainActor
final class ApplePayButtonCustomizationTests: XCTestCase {
    func test_applePayButtonType_withPassKitButtonTypeModifier_shouldStorePassKitButtonType() {
        let view = AcceleratedCheckoutButtons(cartID: "gid://Shopify/Cart/test-cart-id")
            .applePayButtonType(.buy)

        XCTAssertEqual(storedApplePayButtonType(in: view)?.rawValue, PKPaymentButtonType.buy.rawValue)
    }

    func test_applePayButtonStyle_withPassKitButtonStyleModifier_shouldStorePassKitButtonStyle() {
        let view = AcceleratedCheckoutButtons(cartID: "gid://Shopify/Cart/test-cart-id")
            .applePayButtonStyle(.black)

        XCTAssertEqual(storedApplePayButtonStyle(in: view)?.rawValue, PKPaymentButtonStyle.black.rawValue)
    }

    func test_applePayButton_withPassKitValues_shouldPassValuesToInternalButton() {
        let button = ApplePayButton(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart-id"),
            cornerRadius: nil,
            buttonType: .buy,
            buttonStyle: .whiteOutline
        )

        XCTAssertEqual(storedButtonType(in: button)?.rawValue, PKPaymentButtonType.buy.rawValue)
        XCTAssertEqual(storedButtonStyle(in: button)?.rawValue, PKPaymentButtonStyle.whiteOutline.rawValue)
    }

    func test_internalApplePayButton_withPassKitValues_shouldStoreValuesDirectly() {
        let button = Internal_ApplePayButton(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart-id"),
            buttonType: .buy,
            buttonStyle: .whiteOutline,
            configuration: .testConfiguration,
            cornerRadius: nil
        )

        XCTAssertEqual(storedButtonType(in: button)?.rawValue, PKPaymentButtonType.buy.rawValue)
        XCTAssertEqual(storedButtonStyle(in: button)?.rawValue, PKPaymentButtonStyle.whiteOutline.rawValue)
    }

    func test_applePayButtonRepresentable_withPassKitValues_shouldStoreValuesDirectly() {
        let representable = ApplePayButtonRepresentable(
            buttonType: PKPaymentButtonType.buy,
            buttonStyle: PKPaymentButtonStyle.whiteOutline,
            cornerRadius: 8,
            action: {}
        )

        XCTAssertEqual(storedRepresentableButtonType(in: representable)?.rawValue, PKPaymentButtonType.buy.rawValue)
        XCTAssertEqual(storedRepresentableButtonStyle(in: representable)?.rawValue, PKPaymentButtonStyle.whiteOutline.rawValue)
    }

    func test_buttonIdentity_withDifferentButtonTypes_shouldChangeIdentity() {
        let plainButton = Internal_ApplePayButton(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart-id"),
            buttonType: .plain,
            buttonStyle: .automatic,
            configuration: .testConfiguration,
            cornerRadius: nil
        )
        let buyButton = Internal_ApplePayButton(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart-id"),
            buttonType: .buy,
            buttonStyle: .automatic,
            configuration: .testConfiguration,
            cornerRadius: nil
        )

        XCTAssertNotEqual(
            plainButton.buttonIdentity(colorScheme: .light),
            buyButton.buttonIdentity(colorScheme: .light)
        )
    }

    private func storedApplePayButtonType(in view: AcceleratedCheckoutButtons) -> PKPaymentButtonType? {
        return childValue(named: "applePayButtonType", in: view)
    }

    private func storedApplePayButtonStyle(in view: AcceleratedCheckoutButtons) -> PKPaymentButtonStyle? {
        return childValue(named: "applePayButtonStyle", in: view)
    }

    private func storedButtonType(in value: some Any) -> PKPaymentButtonType? {
        return childValue(named: "buttonType", in: value)
    }

    private func storedButtonStyle(in value: some Any) -> PKPaymentButtonStyle? {
        return childValue(named: "buttonStyle", in: value)
    }

    private func storedRepresentableButtonType(in value: some Any) -> PKPaymentButtonType? {
        return childValue(named: "buttonType", in: value)
    }

    private func storedRepresentableButtonStyle(in value: some Any) -> PKPaymentButtonStyle? {
        return childValue(named: "buttonStyle", in: value)
    }

    private func childValue<Value>(named name: String, in value: some Any) -> Value? {
        return Mirror(reflecting: value).children.first { child in
            child.label == name
        }?.value as? Value
    }
}
