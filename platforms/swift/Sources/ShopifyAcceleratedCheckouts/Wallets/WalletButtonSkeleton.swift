import SwiftUI

@available(iOS 16.0, *)
struct WalletButtonSkeleton: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isPulsing = false

    let cornerRadius: CGFloat?

    var body: some View {
        RoundedRectangle(
            cornerRadius: WalletButtonLayout.resolvedCornerRadius(cornerRadius)
        )
        .fill(Color(uiColor: .tertiarySystemFill))
        .frame(height: WalletButtonLayout.height)
        .opacity(reduceMotion ? 0.7 : (isPulsing ? 0.5 : 1))
        .animation(
            reduceMotion ? nil : .easeInOut(duration: 0.9).repeatForever(autoreverses: true),
            value: isPulsing
        )
        .onAppear {
            isPulsing = true
        }
        .accessibilityHidden(true)
    }
}
