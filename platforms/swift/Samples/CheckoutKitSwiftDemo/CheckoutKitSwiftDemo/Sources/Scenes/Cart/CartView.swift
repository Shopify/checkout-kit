import ApolloAPI
import EmbeddedCheckoutProtocol
import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import SwiftUI

typealias CartLineNode = Storefront.CartFragment.Lines.Node

struct CartView: View {
    @State var cartCompleted: Bool = false
    @State var isBusy: Bool = false
    @State var isCompleted: Bool = false
    @State var showCheckoutSheet: Bool = false
    @State private var checkoutPreload: CheckoutPreload?

    @ObservedObject var cartManager: CartManager = .shared

    @AppStorage(AppStorageKeys.applePayStyle.rawValue)
    var applePayStyle: ApplePayStyleOption = .automatic

    @AppStorage(AppStorageKeys.windowOpenHandler.rawValue)
    var windowOpenHandler: WindowOpenHandlerOption = .default

    @AppStorage(AppStorageKeys.checkoutPreloadingEnabled.rawValue)
    var checkoutPreloadingEnabled = true

    private var client: CheckoutProtocol.Client {
        .with(windowOpen: windowOpenHandler)
    }

    var body: some View {
        if let lines = cartManager.cart?.lines.nodes {
            ZStack(alignment: .bottom) {
                ScrollView {
                    VStack {
                        CartLines(lines: lines, update: preloadCheckoutIfNeeded, isBusy: $isBusy)
                    }
                    .padding(.bottom, 130)
                }

                VStack(spacing: DesignSystem.buttonSpacing) {
                    if let cartID = cartManager.cart?.id {
                        if #available(iOS 16, *) {
                            AcceleratedCheckoutButtons(cartID: cartID)
                                .applePayButtonStyle(applePayStyle.style)
                                .onFail { error in
                                    print("[AcceleratedCheckout] Failed: \(error)")
                                }
                                .onCancel {
                                    print("[AcceleratedCheckout] Cancelled")
                                }
                                .connect(client)
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
                    }

                    Button(
                        action: { showCheckoutSheet = true },
                        label: {
                            HStack {
                                Text("Check out")
                                    .fontWeight(.bold)
                                Spacer()
                                if let amount = cartManager.cart?.cost.totalAmount,
                                   let total = MoneyV2(amount: amount.amount, currencyCode: amount.currencyCode).formattedString()
                                {
                                    Text(total)
                                        .fontWeight(.bold)
                                }
                            }
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(isBusy ? Color.gray : Color(ColorPalette.primaryColor))
                            .cornerRadius(DesignSystem.cornerRadius)
                        }
                    )
                    .disabled(isBusy)
                    .foregroundColor(.white)
                    .accessibilityIdentifier("checkoutSheetButton")
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
            .sheet(isPresented: $showCheckoutSheet) {
                if let url = cartManager.cart?.checkoutURL {
                    ShopifyCheckout(checkout: url)
                        .connect(client.on(CheckoutProtocol.complete) { checkout in
                            // Set the flag here; defer the cart reset until the user dismisses
                            // the sheet (in .onCancel). Resetting now would nil the cart and
                            // SwiftUI would auto-collapse this sheet, hiding the confirmation page.
                            print("[UCP] ec.complete: \(checkout.order?.id ?? "unknown")")
                            isCompleted = true
                        })
                        .appearance(.app(.automatic))
                        .onCancel {
                            print("[ShopifyCheckoutKit] CANCEL")
                            showCheckoutSheet = false

                            if isCompleted {
                                CartManager.shared.resetCart()
                                isCompleted = false
                            }
                        }
                        .onFail { error in
                            showCheckoutSheet = false
                            print("[ShopifyCheckoutKit] FAIL - Checkout failed: \(error)")
                        }
                        .edgesIgnoringSafeArea(.all)
                }
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        cartManager.resetCart()
                        ShopifyCheckoutKit.invalidate()
                    }) {
                        Image(systemName: "trash")
                            .foregroundColor(.red)
                    }
                }
            }
            .onAppear {
                preloadCheckoutIfNeeded()
            }
            .onChange(of: cartManager.cart?.checkoutURL) { _ in
                preloadCheckoutIfNeeded()
            }
            .onChange(of: checkoutPreloadingEnabled) { _ in
                preloadCheckoutIfNeeded()
            }
        } else {
            EmptyState()
        }
    }

    private func presentCheckout() {
        guard let url = CartManager.shared.cart?.checkoutURL else { return }

        CheckoutCoordinator.shared?.present(checkout: url)
    }

    private func preloadCheckoutIfNeeded() {
        guard checkoutPreloadingEnabled, let url = cartManager.cart?.checkoutURL else { return }

        ShopifyCheckoutKit.invalidate()
        checkoutPreload = ShopifyCheckoutKit.preload(checkout: url) { state in
            print("[Preload] state changed to \(state)")
            ShopifyCheckoutKit.configuration.logger.log("Preload state changed to \(state)")
        }
    }
}

struct EmptyState: View {
    var body: some View {
        VStack(alignment: .center) {
            SwiftUI.Image(systemName: "cart")
                .resizable()
                .frame(width: 30, height: 30)
                .foregroundColor(.gray)
                .padding(.bottom, 6)
            Text("Your cart is empty.")
                .font(.caption)
        }
    }
}

struct CartLines: View {
    var lines: [CartLineNode]
    var update: () -> Void
    @State var updating: String? {
        didSet {
            isBusy = updating != nil
        }
    }

    @Binding var isBusy: Bool

    var body: some View {
        ForEach(lines, id: \.id) { node in
            let variant = node.merchandise.asProductVariant

            HStack {
                if let imageUrl = variant?.product.featuredImage?.url, let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .empty:
                            ProgressView()
                                .frame(width: 80, height: 140)
                        case let .success(image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .transition(.opacity.animation(.easeIn))
                        case .failure:
                            Image(systemName: "photo")
                                .frame(width: 80, height: 140)
                        @unknown default:
                            EmptyView()
                        }
                    }
                    .frame(width: 80, height: 140)
                    .padding(.trailing, 5)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text(variant?.product.title ?? "")
                        .font(.body)
                        .bold()
                        .lineLimit(2)
                        .truncationMode(.tail)

                    Text(variant?.product.vendor ?? "")
                        .font(.body)
                        .foregroundColor(Color(ColorPalette.primaryColor))

                    if let variant, let price = MoneyV2(amount: variant.price.amount, currencyCode: variant.price.currencyCode).formattedString() {
                        HStack {
                            Text("\(price)")
                                .foregroundColor(.gray)

                            Spacer()

                            HStack(spacing: 20) {
                                Button(action: {
                                    guard node.quantity > 1, updating != node.id else {
                                        return
                                    }
                                    updating = node.id

                                    _Concurrency.Task {
                                        let cart = try await CartManager.shared.performCartLinesUpdate(id: node.id, quantity: node.quantity - 1)
                                        CartManager.shared.cart = cart
                                        updating = nil
                                        update()
                                    }
                                }, label: {
                                    Image(systemName: "minus")
                                        .font(.system(size: 12))
                                        .frame(width: 32, height: 32)
                                        .background(Color.gray.opacity(0.1))
                                        .clipShape(Circle())
                                })

                                VStack {
                                    if updating == node.id {
                                        ProgressView().progressViewStyle(CircularProgressViewStyle())
                                            .scaleEffect(0.8)
                                    } else {
                                        Text("\(node.quantity)")
                                            .frame(width: 20)
                                    }
                                }.frame(width: 20)

                                Button(
                                    action: {
                                        guard updating != node.id else {
                                            return
                                        }

                                        updating = node.id

                                        _Concurrency.Task {
                                            let cart = try await CartManager.shared.performCartLinesUpdate(
                                                id: node.id,
                                                quantity: node.quantity + 1
                                            )
                                            CartManager.shared.cart = cart
                                            updating = nil
                                            update()
                                        }
                                    },
                                    label: {
                                        Image(systemName: "plus")
                                            .font(.system(size: 12))
                                            .frame(width: 32, height: 32)
                                            .background(Color.gray.opacity(0.1))
                                            .clipShape(Circle())
                                    }
                                )
                            }
                            .padding(.trailing, 10)
                        }
                    }
                }.padding(.leading, 5)
            }
            .padding([.leading, .trailing], 20)
            .frame(maxWidth: .infinity, alignment: .leading)

            Divider()
                .background(Color.gray.opacity(0.3))
                .padding(.vertical, 2)
        }
    }
}
