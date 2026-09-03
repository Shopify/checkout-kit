import ApolloAPI
import SwiftUI

struct ProductGridView: View {
    @StateObject private var productCache = ProductCache.shared
    @State private var selectedProduct: Product?
    @State private var showProductSheet = false

    let columns = [
        GridItem(.fixed(UIScreen.main.bounds.width / 2 - 10)),
        GridItem(.fixed(UIScreen.main.bounds.width / 2 - 10))
    ]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 2) {
                if let products = productCache.collection, !products.isEmpty {
                    ForEach(products, id: \.id) { product in
                        ProductGridItem(product: product)
                            .onTapGesture {
                                selectProductAndShowSheet(for: product)
                            }
                    }
                } else {
                    Text("Loading products...")
                        .padding()
                }
            }
            .padding(.horizontal, 5)
            .padding(.top, 10)
        }
        .task {
            if productCache.collection == nil {
                await productCache.fetchCollection()
            }
        }
        .refreshable {
            await productCache.refreshCollection()
        }
        .sheet(isPresented: $showProductSheet) {
            ProductSheetView(product: $selectedProduct, isPresented: $showProductSheet)
        }
    }

    private func selectProductAndShowSheet(for product: Product) {
        selectedProduct = product
        if selectedProduct != nil {
            showProductSheet = true
        }
    }
}

struct ProductSheetView: View {
    @Binding var product: Product?
    @Binding var isPresented: Bool

    var body: some View {
        ZStack(alignment: .topTrailing) {
            if let product {
                ProductView(product: product)
            }

            Button(action: {
                isPresented = false
            }) {
                Image(systemName: "xmark")
                    .font(.system(size: 14))
                    .padding()
                    .foregroundStyle(.white)
            }
            .padding([.top, .trailing], 16)
        }
        .edgesIgnoringSafeArea(.top)
    }
}

struct ProductGridItem: View {
    let product: Product
    let maxWidth = UIScreen.main.bounds.width / 2 - 20

    var body: some View {
        VStack {
            ZStack {
                if let imageURLString = product.featuredImage?.url, let imageURL = URL(string: imageURLString) {
                    AsyncImage(url: thumbnailURL(from: imageURL)) { phase in
                        switch phase {
                        case .empty:
                            Rectangle()
                                .fill(Color.gray.opacity(0.1))
                                .overlay(
                                    ProgressView()
                                        .scaleEffect(0.8)
                                        .tint(.gray)
                                )
                        case let .success(image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure:
                            Rectangle()
                                .fill(Color.gray.opacity(0.1))
                                .overlay(
                                    Image(systemName: "photo")
                                        .font(.system(size: 32))
                                        .foregroundColor(.gray.opacity(0.6))
                                )
                        @unknown default:
                            Rectangle()
                                .fill(Color.gray.opacity(0.1))
                        }
                    }
                } else {
                    Rectangle()
                        .fill(Color.gray.opacity(0.1))
                        .overlay(
                            Image(systemName: "photo.badge.exclamationmark")
                                .font(.system(size: 40))
                                .foregroundStyle(.gray.opacity(0.6))
                        )
                }
            }
            .frame(maxWidth: maxWidth)
            .frame(height: 180)
            .background(Color.gray.opacity(0.05))
            .cornerRadius(12)
            .clipped()

            VStack(spacing: 4) {
                Text(product.title)
                    .font(.headline)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .padding(.top, 8)

                if let price = product.variants.nodes.first?.price {
                    Text(MoneyV2(amount: price.amount, currencyCode: price.currencyCode).formattedString() ?? "")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                }
            }
            .frame(alignment: .leading)
            .padding(.bottom, 16)
        }
    }

    private func thumbnailURL(from originalURL: URL) -> URL {
        let urlString = originalURL.absoluteString

        if urlString.contains("cdn.shopify.com") || urlString.contains("shopify.com") {
            if let lastDotIndex = urlString.lastIndex(of: ".") {
                let baseURL = String(urlString[..<lastDotIndex])
                let fileExtension = String(urlString[lastDotIndex...])
                let thumbnailURLString = "\(baseURL)_300x300\(fileExtension)"
                return URL(string: thumbnailURLString) ?? originalURL
            }
        }

        return originalURL
    }
}

struct ProductGrid_Previews: PreviewProvider {
    static var previews: some View {
        ProductGridView()
    }
}
