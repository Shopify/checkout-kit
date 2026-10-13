import Foundation

class ShopifyBundleFinder {}

extension Bundle {
    static var ShopifyCheckoutKit: Bundle {
        #if COCOAPODS
            guard let cocoapodsBundle = Bundle(for: ShopifyBundleFinder.self)
                .url(forResource: "ShopifyCheckoutKit", withExtension: "bundle")
                .flatMap({ Bundle(url: $0) })
            else {
                fatalError("[cocoapods] unable to load resource bundle")
            }
            return cocoapodsBundle
        #else
            return .module // use Swift Package Manager's synthesized helper
        #endif
    }
}
