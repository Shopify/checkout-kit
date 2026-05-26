import Foundation

extension Bundle {
    /// Cross-platform bundle accessor for ShopifyAcceleratedCheckouts resources
    package static var acceleratedCheckouts: Bundle {
        #if COCOAPODS
            // For CocoaPods, look for the resource bundle
            if let bundlePath = Bundle.main.path(forResource: "ShopifyAcceleratedCheckouts", ofType: "bundle"),
               let bundle = Bundle(path: bundlePath)
            {
                return bundle
            }
            // Fallback to main bundle if resource bundle not found
            return Bundle.main
        #else
            // For SPM, use Bundle.module
            return Bundle.module
        #endif
    }
}
