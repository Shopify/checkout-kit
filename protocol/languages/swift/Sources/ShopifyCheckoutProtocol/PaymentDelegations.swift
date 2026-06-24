import Foundation

extension InstrumentsChangeResult: ResponsePayload {}
extension CredentialResult: ResponsePayload {}

extension EmbeddedCheckoutProtocol {
    public static let paymentInstrumentsChange = RequestDescriptor<Checkout, InstrumentsChangeResult>(
        method: Event.paymentInstrumentsChangeRequest.method,
        delegation: Delegation.paymentInstrumentsChange.rawValue,
        decode: { try? JSONDecoder().decode(JSONRPCCheckoutParams.self, from: $0).checkout }
    )

    public static let paymentCredential = RequestDescriptor<Checkout, CredentialResult>(
        method: Event.paymentCredentialRequest.method,
        delegation: Delegation.paymentCredential.rawValue,
        decode: { try? JSONDecoder().decode(JSONRPCCheckoutParams.self, from: $0).checkout }
    )
}
