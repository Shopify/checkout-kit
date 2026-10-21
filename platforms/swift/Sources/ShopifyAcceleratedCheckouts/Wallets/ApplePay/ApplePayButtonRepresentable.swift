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

    @MainActor
    final class Coordinator {
        var action: @Sendable () -> Void

        init(action: @escaping @Sendable () -> Void) {
            self.action = action
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(action: action)
    }

    func makeUIView(context: UIViewRepresentableContext<ApplePayButtonRepresentable>) -> PKPaymentButton {
        let button = PKPaymentButton(paymentButtonType: buttonType, paymentButtonStyle: buttonStyle)
        button.accessibilityIdentifier = "apple-pay-button"
        button.cornerRadius = cornerRadius
        button.addAction(UIAction { [coordinator = context.coordinator] _ in coordinator.action() }, for: .touchUpInside)
        return button
    }

    func updateUIView(_ button: PKPaymentButton, context: UIViewRepresentableContext<ApplePayButtonRepresentable>) {
        // The UIKit button survives SwiftUI updates, but the cart provider and event handlers can change.
        context.coordinator.action = action
        button.cornerRadius = cornerRadius
    }
}
