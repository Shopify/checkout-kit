import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import SwiftUI

@main
struct ShopifyAcceleratedCheckoutsApp: App {
    @AppStorage(AppStorageKeys.requireEmail.rawValue) var requireEmail: Bool = true
    @AppStorage(AppStorageKeys.requirePhone.rawValue) var requirePhone: Bool = true
    @AppStorage(AppStorageKeys.locale.rawValue) var locale: String = "en"
    @AppStorage(AppStorageKeys.logLevel.rawValue) var logLevel: LogLevel = .all
    @AppStorage(AppStorageKeys.email.rawValue) var email: String = ""
    @AppStorage(AppStorageKeys.phone.rawValue) var phone: String = ""
    @AppStorage(AppStorageKeys.supportedCountries.rawValue) var supportedCountriesString: String = ""

    var configuration: ShopifyAcceleratedCheckouts.Configuration {
        .init(
            storefrontDomain: EnvironmentVariables.storefrontDomain,
            storefrontAccessToken: EnvironmentVariables.storefrontAccessToken,
            customer: ShopifyAcceleratedCheckouts.Customer(
                email: email.isEmpty ? nil : email,
                phoneNumber: phone.isEmpty ? nil : phone
            )
        )
    }

    var applePayConfiguration: ShopifyAcceleratedCheckouts.ApplePayConfiguration {
        let countries = supportedCountriesString.isEmpty ? nil : Set(supportedCountriesString.split(separator: ",").map { String($0) })
        return createApplePayConfiguration(
            requireEmail: requireEmail,
            requirePhone: requirePhone,
            supportedCountries: countries
        )
    }

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                CartBuilderView(configuration: configuration)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            SettingsButton()
                        }
                    }
                    .id("\(requireEmail)-\(requirePhone)-\(supportedCountriesString)")
                    .onChange(of: email) { _ in updateConfiguration() }
                    .onChange(of: phone) { _ in updateConfiguration() }
            }
            .onAppear {
                ShopifyAcceleratedCheckouts.logLevel = logLevel
            }
            .environmentObject(configuration)
            .environmentObject(applePayConfiguration)
        }
        .environment(\.locale, Locale(identifier: locale))
    }

    private func updateConfiguration() {
        configuration.customer = ShopifyAcceleratedCheckouts.Customer(
            email: email.isEmpty ? nil : email,
            phoneNumber: phone.isEmpty ? nil : phone
        )
    }
}

private func createApplePayConfiguration(
    requireEmail: Bool,
    requirePhone: Bool,
    supportedCountries: Set<String>?
) -> ShopifyAcceleratedCheckouts.ApplePayConfiguration {
    var fields: [ShopifyAcceleratedCheckouts.RequiredContactFields] = []

    if requireEmail { fields.append(.email) }
    if requirePhone { fields.append(.phone) }

    return ShopifyAcceleratedCheckouts.ApplePayConfiguration(
        merchantIdentifier: "merchant.com.shopify.example.ShopifyAcceleratedCheckoutsApp",
        contactFields: fields,
        supportedShippingCountries: supportedCountries
    )
}
