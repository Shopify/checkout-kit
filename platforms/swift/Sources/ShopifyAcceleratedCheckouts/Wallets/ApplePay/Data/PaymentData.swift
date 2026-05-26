import PassKit

@available(iOS 16.0, *)
struct PaymentData: Codable {
    let data, signature: String
    let header: Header
    let version: String
}

@available(iOS 16.0, *)
struct Header: Codable {
    let transactionId: String
    let ephemeralPublicKey, publicKeyHash: String
}

@available(iOS 16.0, *)
func decodePaymentData(payment: PKPayment) -> PaymentData? {
    try? JSONDecoder().decode(
        PaymentData.self,
        from: payment.token.paymentData
    )
}
