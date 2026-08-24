import Apollo
import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import SwiftUI

struct ButtonSet: View {
    @Binding var cart: Cart?
    let firstVariantQuantity: Int
    let onComplete: () -> Void

    @State private var cartRenderState: RenderState = .loading
    @State private var variantRenderState: RenderState = .loading

    var body: some View {
        VStack(spacing: 16) {
            if let cartID = cart?.id {
                CheckoutSection(
                    title: "AcceleratedCheckoutButtons(cartID:)",
                    renderState: $cartRenderState
                ) {
                    AcceleratedCheckoutButtons(cartID: cartID)
                        .applePayButtonType(.plain)
                        .onFail { error in
                            print("❌ Checkout failed: \(error)")
                        }
                        .onDismiss {
                            print("🚫 Checkout dismissed")
                        }
                        .onRenderStateChange {
                            cartRenderState = $0
                        }
                }
            }

            if let merchandise = cart?.lines.nodes.first?.merchandise,
               let productVariant = merchandise.asProductVariant
            {
                CheckoutSection(
                    title: "AcceleratedCheckoutButtons(variantID: quantity:)",
                    renderState: $variantRenderState
                ) {
                    AcceleratedCheckoutButtons(
                        variantID: productVariant.id,
                        quantity: firstVariantQuantity
                    )
                    .applePayButtonStyle(.whiteOutline)
                    .applePayButtonType(.buy)
                    .cornerRadius(24)
                    .wallets([.applePay, .shopPay])
                    .onFail { error in
                        print("❌ Variant checkout failed: \(error)")
                    }
                    .onDismiss {
                        print("🚫 Variant checkout dismissed")
                    }
                    .onRenderStateChange {
                        variantRenderState = $0
                    }
                }
            }
        }
    }
}

// MARK: - Local Components

private struct CheckoutSection<Content: View>: View {
    let title: String
    @Binding var renderState: RenderState
    @ViewBuilder let content: () -> Content

    var body: some View {
        Section {
            VStack {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)

                if case .error = renderState {
                    VStack {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundColor(.orange)
                            .font(.title2)
                        Text("Unable to load checkout buttons")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(height: 44)
                }

                content()
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(8)
        .padding(.horizontal)
    }
}
