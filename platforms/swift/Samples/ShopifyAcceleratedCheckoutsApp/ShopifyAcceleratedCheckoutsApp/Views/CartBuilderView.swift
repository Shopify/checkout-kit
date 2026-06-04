import Apollo
import Foundation
import ShopifyAcceleratedCheckouts
import SwiftUI

typealias MerchandiseID = String
typealias Quantity = Int

struct CartBuilderView: View {
    var configuration: ShopifyAcceleratedCheckouts.Configuration
    @State var cart: Cart?
    @State var allProducts: [Product] = []
    /// Products picked with the QuantityPicker, prior to Cart creation
    @State var selectedVariants: [MerchandiseID: Quantity] = [:]
    @State var isLoadingProducts: Bool = false
    @State var isCreatingCart: Bool = false
    @State private var scrollViewProxy: ScrollViewProxy?

    var body: some View {
        VStack {
            ScrollView {
                ScrollViewReader { scrollProxy in
                    VStack(spacing: 20) {
                        // Invisible anchor for scrolling to top
                        Color.clear
                            .frame(height: 1)
                            .id(ScrollableElement.top)

                        // Products Section
                        ProductsSection(
                            products: allProducts,
                            selectedVariants: $selectedVariants,
                            isLoadingProducts: isLoadingProducts,
                            onRetry: { Task { await onLoad() } }
                        )

                        if let cart {
                            CartDetailsSection(
                                cart: Binding(get: { cart }, set: { self.cart = $0 })
                            )
                            .id(ScrollableElement.cartDetails) // Add ID for scrolling to cart

                            ButtonSet(
                                cart: $cart,
                                firstVariantQuantity: cart.lines.nodes.first?.quantity ?? 1,
                                onComplete: clearCart
                            )
                        }

                        // Bottom padding to ensure content isn't hidden behind sticky buttons
                        Spacer()
                            .frame(height: 100)
                    }
                    .onAppear {
                        scrollViewProxy = scrollProxy
                    }
                }
            }

            // Sticky Cart Creation Buttons
            VStack {
                Divider()
                CartCreationButtons(
                    customCart: cart,
                    selectedVariants: selectedVariants,
                    isCreatingCart: isCreatingCart,
                    isLoadingProducts: isLoadingProducts,
                    hasProducts: !allProducts.isEmpty,
                    onCreateCart: createCustomCart,
                    onClearCart: clearCart
                )
                .padding(.vertical, 12)
                .background(Color(UIColor.systemBackground))
                .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: -2)
            }
        }
        .task {
            await onLoad()
        }
    }

    private enum ScrollableElement: String {
        case cartDetails
        case top
    }

    private func scrollTo(element: ScrollableElement) {
        withAnimation(.easeInOut) {
            scrollViewProxy?.scrollTo(element, anchor: .top)
        }
    }

    private func createCustomCart() {
        isCreatingCart = true

        Task {
            let cart = await Network.shared.createCart(
                merchandiseQuantities: selectedVariants,
                configuration: configuration
            )
            withAnimation {
                self.cart = cart
                isCreatingCart = false
                selectedVariants.removeAll()
            }
            try? await Task.sleep(nanoseconds: 100_000_000)
            scrollTo(element: .cartDetails)
        }
    }

    private func clearCart() {
        withAnimation {
            cart = nil
            selectedVariants.removeAll()
        }
        // Trigger scroll using state change
        scrollTo(element: .top)
    }

    func onLoad() async {
        // Prevent multiple simultaneous loads
        guard !isLoadingProducts else {
            print("[accelerated_checkouts_app:cart_builder] Already loading products, skipping...")
            return
        }

        print("[accelerated_checkouts_app:cart_builder] Starting to load products...")
        isLoadingProducts = true

        // Ensure products load regardless of any configuration issues
        defer {
            isLoadingProducts = false
        }

        let products = await Network.shared.getProducts()
        if let products {
            print("[accelerated_checkouts_app:cart_builder] Loaded \(products.nodes.count) products")
            withAnimation {
                allProducts = products.nodes
            }
        } else {
            print("[accelerated_checkouts_app:cart_builder] Warning: No products returned from API")
        }
    }
}

#Preview {
    let configuration = ShopifyAcceleratedCheckouts.Configuration(
        storefrontDomain: EnvironmentVariables.storefrontDomain,
        storefrontAccessToken: EnvironmentVariables.storefrontAccessToken
    )

    CartBuilderView(configuration: configuration)
}
