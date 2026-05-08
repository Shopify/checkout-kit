public enum CheckoutProtocol {
    public static let specVersion = "2026.01.23"

    public static let start = NotificationDescriptor<Checkout>(method: "ec.start")
    public static let complete = NotificationDescriptor<Checkout>(method: "ec.complete")
    public static let messagesChange = NotificationDescriptor<Checkout>(method: "ec.messages.change")
    public static let lineItemsChange = NotificationDescriptor<Checkout>(method: "ec.line_items.change")
    public static let buyerChange = NotificationDescriptor<Checkout>(method: "ec.buyer.change")
    public static let paymentChange = NotificationDescriptor<Checkout>(method: "ec.payment.change")

    public static let instrumentsChangeRequest = DelegationDescriptor<Checkout, InstrumentsChangeResult>(
        method: "ec.payment.instruments_change_request",
        delegation: "payment.instruments_change"
    )
    public static let credentialRequest = DelegationDescriptor<Checkout, CredentialResult>(
        method: "ec.payment.credential_request",
        delegation: "payment.credential"
    )

    public static let ready = NotificationDescriptor<ReadyPayload>(method: "ec.ready")
}
