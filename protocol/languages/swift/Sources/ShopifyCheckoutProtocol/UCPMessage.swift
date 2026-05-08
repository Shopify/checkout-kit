enum UCPMessage: Sendable {
    case notification(method: String, checkout: Checkout)
    case request(id: String, method: String, checkout: Checkout)
    case ready(id: String, delegations: [String])
    case unknown(method: String, rawParams: String)
}
