/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import Foundation
import ShopifyCheckoutKit

public enum BuyerIdentityMode: String, CaseIterable {
    case guest
    case hardcoded
    case customerAccount

    var displayName: String {
        switch self {
        case .guest: return "Guest"
        case .hardcoded: return "Hardcoded"
        case .customerAccount: return "Customer Account"
        }
    }
}

@MainActor
public final class AppConfiguration: ObservableObject {
    public var storefrontDomain: String = InfoDictionary.shared.domain

    @Published public var universalLinks = UniversalLinks()

    @Published public var buyerIdentityMode: BuyerIdentityMode = .guest {
        didSet {
            if oldValue == .customerAccount, buyerIdentityMode != .customerAccount {
                Task { @MainActor in
                    CustomerAccountManager.shared.logout()
                }
            }
            UserDefaults.standard.set(buyerIdentityMode.rawValue, forKey: AppStorageKeys.buyerIdentityMode.rawValue)
            Task { @MainActor in
                CartManager.shared.resetCart()
            }
        }
    }

    init() {
        if let savedMode = UserDefaults.standard.string(forKey: AppStorageKeys.buyerIdentityMode.rawValue),
           let mode = BuyerIdentityMode(rawValue: savedMode)
        {
            buyerIdentityMode = mode
        }
    }
}

@MainActor
public var appConfiguration = AppConfiguration() {
    didSet {
        Task { @MainActor in
            CartManager.shared.resetCart()
        }
    }
}

public struct UniversalLinks {
    public var checkout: Bool = true
    public var cart: Bool = true
    public var products: Bool = true

    public var handleAllURLsInApp: Bool = true {
        didSet {
            if handleAllURLsInApp {
                enableAllURLs()
            }
        }
    }

    private mutating func enableAllURLs() {
        checkout = true
        products = true
        cart = true
    }
}
