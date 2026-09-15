import ShopifyAcceleratedCheckouts
import SwiftUI

struct AcceleratedCheckoutsConfiguredView<Content: View>: View {
    let content: Content

    @AppStorage(AppStorageKeys.requireEmail.rawValue)
    private var requireEmail = true

    @AppStorage(AppStorageKeys.requirePhone.rawValue)
    private var requirePhone = true

    @AppStorage(AppStorageKeys.locale.rawValue)
    private var locale = "en"

    @AppStorage(AppStorageKeys.email.rawValue)
    private var email = ""

    @AppStorage(AppStorageKeys.phone.rawValue)
    private var phone = ""

    @AppStorage(AppStorageKeys.supportedCountries.rawValue)
    private var supportedCountriesString = ""

    var body: some View {
        if #available(iOS 16.0, *) {
            content
                .environment(
                    \.shopifyAcceleratedCheckoutsConfiguration,
                    ShopifyAcceleratedCheckouts.Configuration(
                        storefrontDomain: InfoDictionary.shared.domain,
                        storefrontAccessToken: InfoDictionary.shared.accessToken,
                        customer: customer
                    )
                )
                .environment(
                    \.shopifyApplePayConfiguration,
                    ShopifyAcceleratedCheckouts.ApplePayConfiguration(
                        merchantIdentifier: InfoDictionary.shared.merchantIdentifier,
                        contactFields: contactFields,
                        supportedShippingCountries: supportedCountries
                    )
                )
                .environment(\.locale, Locale(identifier: locale))
        } else {
            content
        }
    }

    @available(iOS 16.0, *)
    private var customer: ShopifyAcceleratedCheckouts.Customer? {
        guard !email.isEmpty || !phone.isEmpty else { return nil }

        return ShopifyAcceleratedCheckouts.Customer(
            email: email.isEmpty ? nil : email,
            phoneNumber: phone.isEmpty ? nil : phone
        )
    }

    @available(iOS 16.0, *)
    private var contactFields: [ShopifyAcceleratedCheckouts.RequiredContactFields] {
        var fields: [ShopifyAcceleratedCheckouts.RequiredContactFields] = []

        if requireEmail {
            fields.append(.email)
        }
        if requirePhone {
            fields.append(.phone)
        }

        return fields
    }

    @available(iOS 16.0, *)
    private var supportedCountries: Set<String>? {
        let countries = Set(
            supportedCountriesString
                .split(separator: ",")
                .map(String.init)
                .filter { !$0.isEmpty }
        )
        return countries.isEmpty ? nil : countries
    }
}
