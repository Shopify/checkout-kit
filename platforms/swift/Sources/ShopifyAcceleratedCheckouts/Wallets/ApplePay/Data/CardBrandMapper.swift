import PassKit

@available(iOS 16.0, *)
enum CardBrandMapper {
    /// Maps Shopify's CardBrand enum values to Apple Pay's PKPaymentNetwork values
    /// - Parameter shopifyCardBrand: The card brand from Shopify's acceptedCardBrands
    /// - Returns: The corresponding PKPaymentNetwork, or nil if the brand is not supported by Apple Pay
    static func mapToPKPaymentNetwork(_ shopifyCardBrand: StorefrontAPI.CardBrand) -> PKPaymentNetwork? {
        switch shopifyCardBrand {
        case .americanExpress:
            return .amex
        case .discover:
            return .discover
        case .jcb:
            return .JCB
        case .mastercard:
            return .masterCard
        case .visa:
            return .visa
        case .dinersClub:
            // Diners Club is not supported by Apple Pay
            return nil
        }
    }

    /// Maps an array of Shopify card brands to PKPaymentNetwork values
    /// - Parameter shopifyCardBrands: Array of card brands from Shopify
    /// - Returns: Array of PKPaymentNetwork values, filtering out any unsupported brands
    static func mapToPKPaymentNetworks(_ shopifyCardBrands: [StorefrontAPI.CardBrand]) -> [PKPaymentNetwork] {
        shopifyCardBrands.compactMap { mapToPKPaymentNetwork($0) }
    }
}
