import Foundation

extension ShopifyAcceleratedCheckouts {
    enum Error: LocalizedError {
        case invariant(expected: String)
        case cartAcquisition(identifier: CheckoutIdentifier)

        func toString() -> String {
            return switch self {
            case let .invariant(expected):
                "received nil, expected: \(expected)"
            case let .cartAcquisition(identifier):
                "unable to get cart for CheckoutIdentifier: \(identifier)"
            }
        }
    }
}
