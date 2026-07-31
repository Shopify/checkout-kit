import Foundation

/// Contains all of the values from the `info.plist`
final class InfoDictionary: Sendable {
    static let shared = InfoDictionary()

    /// Required
    let address1, address2, city, country, firstName, lastName, province, zip,
        email, phone, domain, accessToken, version, buildNumber, merchantIdentifier,
        apiVersion: String

    // Customer Account API (optional)
    let customerAccountApiClientId: String?
    let customerAccountApiShopId: String?

    /// User agent suffix the customer account login web view appends. Empty outside CI.
    let customUserAgent: String?

    var customerAccountApiRedirectUri: String? {
        guard let shopId = customerAccountApiShopId, !shopId.isEmpty else {
            return nil
        }
        return "shop.\(shopId).app://callback"
    }

    init() {
        guard
            let infoPlist = Bundle.main.infoDictionary,
            let address1 = infoPlist["Address1"] as? String,
            let address2 = infoPlist["Address2"] as? String,
            let city = infoPlist["City"] as? String,
            let country = infoPlist["Country"] as? String,
            let firstName = infoPlist["FirstName"] as? String,
            let lastName = infoPlist["LastName"] as? String,
            let province = infoPlist["Province"] as? String,
            let zip = infoPlist["Zip"] as? String,
            let email = infoPlist["Email"] as? String,
            let phone = infoPlist["Phone"] as? String,
            let domain = infoPlist["StorefrontDomain"] as? String,
            let accessToken = infoPlist["StorefrontAccessToken"] as? String,
            let merchantIdentifier = infoPlist["StorefrontMerchantIdentifier"] as? String,
            let version = infoPlist["CFBundleShortVersionString"] as? String,
            let buildNumber = infoPlist["CFBundleVersion"] as? String
        else {
            fatalError("Missing required configuration. Check your info.plist.")
        }

        let apiVersion = infoPlist["API_VERSION"] as? String ?? "2026-04"

        self.apiVersion = apiVersion
        self.address1 = address1
        self.address2 = address2
        self.city = city
        self.country = country
        self.firstName = firstName
        self.lastName = lastName
        self.province = province
        self.zip = zip
        self.email = email
        self.phone = phone
        self.domain = domain
        self.accessToken = accessToken
        self.version = version
        self.buildNumber = buildNumber
        self.merchantIdentifier = merchantIdentifier

        // Customer Account API configuration (optional)
        customerAccountApiClientId = infoPlist["CustomerAccountApiClientId"] as? String
        customerAccountApiShopId = infoPlist["CustomerAccountApiShopId"] as? String
        customUserAgent = (infoPlist["CustomUserAgent"] as? String).flatMap { $0.isEmpty ? nil : $0 }
    }
}
