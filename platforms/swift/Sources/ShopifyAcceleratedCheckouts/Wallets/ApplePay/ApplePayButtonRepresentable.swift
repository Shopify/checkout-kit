import PassKit
import SwiftUI
import UIKit

@available(iOS 16.0, *)
struct ApplePayButtonRepresentable: UIViewRepresentable {
    typealias UIViewType = PKPaymentButton

    let buttonType: PKPaymentButtonType
    let buttonStyle: PKPaymentButtonStyle
    let cornerRadius: CGFloat
    let action: @Sendable () -> Void

    func makeUIView(context _: UIViewRepresentableContext<ApplePayButtonRepresentable>) -> PKPaymentButton {
        let button = PKPaymentButton(paymentButtonType: buttonType, paymentButtonStyle: buttonStyle)
        button.accessibilityIdentifier = "apple-pay-button"
        button.cornerRadius = cornerRadius
        button.addAction(UIAction { _ in action() }, for: .touchUpInside)
        return button
    }

    func updateUIView(_ button: PKPaymentButton, context _: UIViewRepresentableContext<ApplePayButtonRepresentable>) {
        button.cornerRadius = cornerRadius
    }
}
