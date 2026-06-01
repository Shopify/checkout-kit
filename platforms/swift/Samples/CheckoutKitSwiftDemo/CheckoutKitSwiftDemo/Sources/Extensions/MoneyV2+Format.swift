import ApolloAPI
import Foundation

struct MoneyV2 {
    let amount: String
    let currencyCode: String

    func formattedString() -> String? {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currencyCode
        guard let decimal = Decimal(string: amount) else { return nil }
        return decimal == 0 ? "Free" : formatter.string(from: NSDecimalNumber(decimal: decimal))
    }
}

extension MoneyV2 {
    init(amount: String, currencyCode: GraphQLEnum<Storefront.CurrencyCode>) {
        self.amount = amount
        self.currencyCode = currencyCode.rawValue
    }
}

extension Storefront.CartFragment {
    var checkoutURL: URL? {
        URL(string: checkoutUrl)
    }
}
