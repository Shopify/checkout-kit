import SwiftUI
#if CHECKOUT_KIT
    import ShopifyCheckoutKit
#endif
#if ACCELERATED_CHECKOUTS
    import ShopifyAcceleratedCheckouts
#endif

/// Compile the same app shell for all three variants. Keep API usage fixed so
/// changes in this fixture are deliberate changes to the measurement contract.
@main
struct SizeFixtureApp: App {
    @State private var checkoutPresented = false

    var body: some Scene {
        WindowGroup {
            VStack {
                Text("Checkout Kit size fixture")
                #if CHECKOUT_KIT
                    Button("Checkout") {
                        checkoutPresented = true
                    }
                    .sheet(isPresented: $checkoutPresented) {
                        ShopifyCheckout(checkout: URL(string: "https://example.com/checkout")!)
                    }
                    Button("Preload") {
                        ShopifyCheckoutKit.preload(checkout: URL(string: "https://example.com/checkout")!)
                    }
                    Button("Invalidate") {
                        ShopifyCheckoutKit.invalidate()
                    }
                #endif
                #if ACCELERATED_CHECKOUTS
                    AcceleratedCheckoutButtons(cartID: "gid://shopify/Cart/size-fixture")
                        .wallets([.shopPay, .applePay])
                        .environment(\.shopifyAcceleratedCheckoutsConfiguration, .init(
                            storefrontDomain: "example.myshopify.com",
                            storefrontAccessToken: "synthetic-size-fixture-token"
                        ))
                #endif
            }
        }
    }
}
