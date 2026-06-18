public enum CheckoutProtocol {
    public static let specVersion = "2026-04-08"

    public static let defaultDelegations: [String] = ["window.open"]

    public static let complete = NotificationDescriptor<Checkout>(method: "ec.complete")
    public static let error = NotificationDescriptor<ErrorResponse>(method: "ec.error")
    public static let lineItemsChange = NotificationDescriptor<Checkout>(
        method: "ec.line_items.change"
    )
    public static let messagesChange = NotificationDescriptor<Checkout>(
        method: "ec.messages.change"
    )
    public static let start = NotificationDescriptor<Checkout>(method: "ec.start")
    public static let totalsChange = NotificationDescriptor<Checkout>(method: "ec.totals.change")
}
