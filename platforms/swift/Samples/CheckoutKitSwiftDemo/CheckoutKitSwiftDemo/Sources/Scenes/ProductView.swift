import Apollo
import ApolloAPI
import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import SwiftUI
import UIKit

typealias Product = Storefront.GetProductsQuery.Data.Products.Node

struct ProductView: View {
    // MARK: Properties

    @State private var product: Product
    @State private var loading = false
    @State private var imageLoaded: Bool = false
    @State private var showingCart = false
    @State private var descriptionExpanded: Bool = false
    @State private var addedToCart: Bool = false
    @State private var selectedSellingPlanID: String?
    @State private var addToCartError: String?

    @AppStorage(AppStorageKeys.applePayStyle.rawValue)
    var applePayStyle: ApplePayStyleOption = .automatic

    init(product: Product) {
        _product = State(initialValue: product)

        let variant = product.variants.nodes.first
        let requiredSellingPlanID = product.requiresSellingPlan
            ? variant?.sellingPlanAllocations.nodes.first?.sellingPlan.id
            : nil
        _selectedSellingPlanID = State(initialValue: requiredSellingPlanID)
    }

    // MARK: Body

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let imageURL = product.featuredImage?.url, let url = URL(string: imageURL) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .empty:
                            Rectangle()
                                .fill(Color.gray.opacity(0.1))
                                .frame(width: UIScreen.main.bounds.width, height: 400)
                                .overlay(
                                    ProgressView()
                                        .scaleEffect(1.2)
                                        .tint(.gray)
                                )
                        case let .success(image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: UIScreen.main.bounds.width, height: 400)
                                .clipped()
                                .opacity(imageLoaded ? 1 : 0)
                                .onAppear {
                                    withAnimation(.easeIn(duration: 0.3)) {
                                        imageLoaded = true
                                    }
                                }
                        case .failure:
                            Rectangle()
                                .fill(Color.gray.opacity(0.1))
                                .frame(width: UIScreen.main.bounds.width, height: 400)
                                .overlay(
                                    Image(systemName: "photo")
                                        .font(.system(size: 48))
                                        .foregroundColor(.gray.opacity(0.6))
                                )
                        @unknown default:
                            Rectangle()
                                .fill(Color.gray.opacity(0.1))
                                .frame(width: UIScreen.main.bounds.width, height: 400)
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text(product.vendor)
                        .font(.body)
                        .fontWeight(.semibold)
                        .padding(.vertical)
                        .foregroundColor(Color(ColorPalette.primaryColor))

                    Text(product.title)
                        .font(.title)

                    Text(product.description)
                        .font(.body)
                        .foregroundColor(.gray)
                        .lineLimit(descriptionExpanded ? 10 : 3)
                        .onTapGesture {
                            descriptionExpanded.toggle()
                        }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)

                if let variant = product.variants.nodes.first {
                    VStack(spacing: DesignSystem.buttonSpacing) {
                        if !variant.sellingPlanAllocations.nodes.isEmpty {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Purchase option")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)

                                Picker("Purchase option", selection: $selectedSellingPlanID) {
                                    if !product.requiresSellingPlan {
                                        Text("One-time purchase")
                                            .tag(nil as String?)
                                    }

                                    ForEach(
                                        variant.sellingPlanAllocations.nodes,
                                        id: \.sellingPlan.id
                                    ) { allocation in
                                        Text(allocation.sellingPlan.name)
                                            .tag(allocation.sellingPlan.id as String?)
                                    }
                                }
                                .pickerStyle(.menu)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        if let errorMessage = purchaseErrorMessage(for: variant) {
                            Label {
                                Text(errorMessage)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            } icon: {
                                Image(systemName: "exclamationmark.triangle.fill")
                            }
                            .font(.subheadline)
                            .foregroundStyle(.red)
                            .padding(12)
                            .background(Color.red.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: DesignSystem.cornerRadius))
                            .accessibilityElement(children: .combine)
                        }

                        Button(action: addToCart) {
                            HStack {
                                Text(loading ? "Adding..." : (addedToCart ? "Added" : "Add to Cart"))
                                    .font(.headline)

                                if loading {
                                    ProgressView()
                                        .colorInvert()
                                }
                                Spacer()

                                Text(formattedVariantPrice(variant))
                            }.padding()
                        }
                        .background(addedToCart ? Color(ColorPalette.successColor) : Color(ColorPalette.primaryColor))
                        .foregroundStyle(.white)
                        .cornerRadius(DesignSystem.cornerRadius)
                        .disabled(!canPurchase(variant) || loading)

                        if canPurchase(variant), selectedSellingPlanID == nil {
                            if #available(iOS 16, *) {
                                acceleratedCheckoutButton(for: variant)
                            }
                        }
                    }.padding([.leading, .trailing], 15)
                }
            }
        }
        .navigationTitle(product.collections.nodes.first?.title ?? product.title)
        .frame(idealWidth: 200)
    }

    // MARK: Methods

    private func formattedVariantPrice(_ variant: Product.Variants.Node) -> String {
        if !variant.availableForSale {
            return "Out of stock"
        }
        if addedToCart {
            return "✓"
        }
        return MoneyV2(amount: variant.price.amount, currencyCode: variant.price.currencyCode).formattedString() ?? ""
    }

    private func canPurchase(_ variant: Product.Variants.Node) -> Bool {
        variant.availableForSale && (!product.requiresSellingPlan || selectedSellingPlanID != nil)
    }

    private func purchaseErrorMessage(for _: Product.Variants.Node) -> String? {
        if let addToCartError {
            return addToCartError
        }
        if product.requiresSellingPlan, selectedSellingPlanID == nil {
            return "This subscription doesn't have an available purchase option."
        }
        return nil
    }

    @available(iOS 16, *)
    private func acceleratedCheckoutButton(
        for variant: Product.Variants.Node
    ) -> some View {
        AcceleratedCheckoutButtons(variantID: variant.id, quantity: 1)
            .wallets([.applePay])
            .applePayButtonStyle(applePayStyle.style)
            .onFail { error in
                addToCartError = "We couldn't start accelerated checkout. Please try again."
                print("[AcceleratedCheckout] Failed: \(error)")
            }
            .onDismiss {
                print("[AcceleratedCheckout] Dismissed")
            }
            .environment(
                \.shopifyAcceleratedCheckoutsConfiguration,
                ShopifyAcceleratedCheckouts.Configuration(
                    storefrontDomain: InfoDictionary.shared.domain,
                    storefrontAccessToken: InfoDictionary.shared.accessToken
                )
            )
            .environment(
                \.shopifyApplePayConfiguration,
                ShopifyAcceleratedCheckouts.ApplePayConfiguration(
                    merchantIdentifier: InfoDictionary.shared.merchantIdentifier,
                    contactFields: [.email, .phone]
                )
            )
    }

    private func addToCart() {
        _Concurrency.Task {
            guard let variant = product.variants.nodes.first else { return }

            loading = true
            addToCartError = nil
            defer { loading = false }
            let start = Date()

            do {
                _ = try await CartManager.shared.performCartLinesAdd(
                    variant: variant.id,
                    sellingPlanID: selectedSellingPlanID
                )

                let diff = Date().timeIntervalSince(start)
                let message = "Added item to cart in \(String(format: "%.0f", diff * 1000))ms"
                ShopifyCheckoutKit.configuration.logger.log(message)
                addedToCart = true

                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    addedToCart = false
                }
            } catch {
                addedToCart = false
                addToCartError = "We couldn't add this item to your cart. Please try again."
                ShopifyCheckoutKit.configuration.logger.log(
                    "Failed to add item to cart: \(error.localizedDescription)"
                )
            }
        }
    }

    private func setProduct(_ product: Product?) {
        if let product {
            self.product = product
        }
    }
}

@MainActor
class ProductCache: ObservableObject {
    static let shared = ProductCache()
    @Published public var cachedProduct: Product?
    @Published public var isFetching: Bool = false
    @Published public var collection: [Product]?

    func getProduct(handle: String?, completion: @escaping (Product?) -> Void) {
        if let product = cachedProduct {
            completion(product)
        } else {
            Task {
                let product = await fetchProduct(by: handle)
                self.cachedProduct = product
                completion(product)
            }
        }
    }

    private func fetchProduct(by _: String?) async -> Product? {
        let network = Network.shared

        let query = Storefront.GetProductsQuery(
            first: .some(1),
            country: network.countryCode,
            language: network.languageCode
        )

        do {
            let response = try await network.apollo.fetch(query: query)
            return response.data?.products.nodes.first
        } catch {
            return nil
        }
    }

    public func fetchCollection(limit: Int = 20) async {
        await fetchCollection(limit: limit, cachePolicy: .cacheFirst)
    }

    public func refreshCollection(limit: Int = 20) async {
        await fetchCollection(limit: limit, cachePolicy: .networkOnly)
    }

    private func fetchCollection(limit: Int, cachePolicy: CachePolicy.Query.SingleResponse) async {
        guard !isFetching else { return }

        isFetching = true
        defer { isFetching = false }

        let network = Network.shared
        let query = Storefront.GetProductsQuery(
            first: .some(Int32(limit)),
            country: network.countryCode,
            language: network.languageCode
        )

        do {
            let response = try await network.apollo.fetch(query: query, cachePolicy: cachePolicy)
            collection = response.data?.products.nodes
            cachedProduct = response.data?.products.nodes.first
        } catch {
            // Fetch failed silently
        }
    }
}

struct ProductGalleryView: View {
    @StateObject private var productCache = ProductCache.shared

    var body: some View {
        TabView {
            if productCache.collection?.isEmpty ?? true {
                Text("Loading products...").padding()
            } else {
                ForEach(productCache.collection!, id: \.id) { product in
                    ProductView(product: product)
                        .onAppear {
                            ProductCache.shared.cachedProduct = product
                        }
                }
            }
        }
        .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
        .task {
            await productCache.fetchCollection()
        }
    }
}

struct ProductGalleryView_Previews: PreviewProvider {
    static var previews: some View {
        ProductGalleryView()
    }
}
