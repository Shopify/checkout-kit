import Foundation

extension ShopifyAcceleratedCheckouts {
    enum Error: LocalizedError {
        case invariant(expected: String)
        case cartAcquisition(cartID: String?)

        func toString() -> String {
            return switch self {
            case let .invariant(expected):
                "received nil, expected: \(expected)"
            case let .cartAcquisition(cartID):
                "unable to get cart for \(cartID ?? "the supplied cart identifier")"
            }
        }
    }
}
