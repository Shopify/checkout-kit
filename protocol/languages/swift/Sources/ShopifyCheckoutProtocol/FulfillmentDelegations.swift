import Foundation

public struct AddressChangeCheckout: Codable, Sendable {
    public let fulfillment: Fulfillment?

    public init(fulfillment: Fulfillment?) {
        self.fulfillment = fulfillment
    }
}

public struct AddressChangeResult: ResponsePayload {
    public let checkout: AddressChangeCheckout?
    public let ucp: InstrumentsChangeResultUcp

    public init(checkout: AddressChangeCheckout?, ucp: InstrumentsChangeResultUcp) {
        self.checkout = checkout
        self.ucp = ucp
    }
}
