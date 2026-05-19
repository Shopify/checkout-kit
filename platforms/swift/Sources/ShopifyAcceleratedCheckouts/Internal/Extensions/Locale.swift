import Foundation

/// Reference the LanguageCode enum from Models to avoid namespace conflict
typealias ShopifyLanguageCode = LanguageCode

/// Extension to detect device locale and map to Shopify types
@available(iOS 16.0, *)
extension Locale {
    private static let defaultCountryCode: CountryCode = .US
    private static let defaultLanguageCode: ShopifyLanguageCode = .EN

    /// Returns the device's current country code mapped to CountryCode enum
    static var deviceCountryCode: CountryCode {
        guard let regionCode = Locale.current.region?.identifier,
              let countryCode = CountryCode(rawValue: regionCode)
        else {
            return defaultCountryCode
        }
        return countryCode
    }

    /// Returns the device's current language code mapped to LanguageCode enum
    static var deviceLanguageCode: ShopifyLanguageCode {
        guard let languageCode = Locale.current.language.languageCode?.identifier else {
            return defaultLanguageCode
        }

        // Handle special cases for language codes that need mapping
        switch languageCode {
        case "zh-Hans", "zh-CN":
            return ShopifyLanguageCode.ZH_CN
        case "zh-Hant", "zh-TW":
            return ShopifyLanguageCode.ZH_TW
        case "pt-BR":
            return ShopifyLanguageCode.PT_BR
        case "pt-PT":
            return ShopifyLanguageCode.PT_PT
        default:
            // Try to map the language code directly
            if let mappedCode = ShopifyLanguageCode(rawValue: languageCode.uppercased()) {
                return mappedCode
            }

            // Handle cases where we need to extract the base language
            let baseLanguage = String(languageCode.prefix(2))
            if let mappedCode = ShopifyLanguageCode(rawValue: baseLanguage.uppercased()) {
                return mappedCode
            }

            return defaultLanguageCode
        }
    }
}
