import Foundation

package enum MetaData {
    /// The version of the `ShopifyCheckoutKit` library.
    package static let version = "4.0.0-alpha.7"

    /// In time this will be used to track the top level package that is
    /// making API calls or is the initiator of Checkout Kit.
    /// For now this is exclusive to AcceleratedCheckouts to ensure backwards
    /// compatibility.
    package enum EntryPoint: String {
        case acceleratedCheckouts = "AcceleratedCheckouts"
    }
}
