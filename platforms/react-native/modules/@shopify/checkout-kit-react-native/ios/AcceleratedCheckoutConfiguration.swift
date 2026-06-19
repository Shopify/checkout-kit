import Foundation
import ShopifyCheckoutKit

@available(iOS 16.0, *)
class AcceleratedCheckoutConfiguration {
    static let shared = AcceleratedCheckoutConfiguration()
    var configuration: ShopifyAcceleratedCheckouts.Configuration?
    var applePayConfiguration: ShopifyAcceleratedCheckouts.ApplePayConfiguration?

    var available: Bool {
        if #available(iOS 16.0, *) {
            return configuration != nil
        } else {
            return false
        }
    }

    var applePayAvailable: Bool {
        if #available(iOS 16.0, *) {
            return applePayConfiguration != nil
        } else {
            return false
        }
    }
}
