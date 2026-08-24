import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import SwiftUI

@main
struct ShopifyAcceleratedCheckoutsApp: App {
    @AppStorage(AppStorageKeys.requireEmail.rawValue) var requireEmail: Bool = true
    @AppStorage(AppStorageKeys.requirePhone.rawValue) var requirePhone: Bool = true
    @AppStorage(AppStorageKeys.locale.rawValue) var locale: String = "en"
    @AppStorage(AppStorageKeys.logLevel.rawValue) var logLevel: LogLevel = .debug
    @AppStorage(AppStorageKeys.email.rawValue) var email: String = ""
    @AppStorage(AppStorageKeys.phone.rawValue) var phone: String = ""
    @AppStorage(AppStorageKeys.supportedCountries.rawValue) var supportedCountriesString: String = ""
    @State private var configuration: ShopifyAcceleratedCheckouts.Configuration

    init() {
        let email = UserDefaults.standard.string(forKey: AppStorageKeys.email.rawValue) ?? ""
        let phone = UserDefaults.standard.string(forKey: AppStorageKeys.phone.rawValue) ?? ""
        _configuration = State(
            initialValue: ShopifyAcceleratedCheckouts.Configuration(
                storefrontDomain: EnvironmentVariables.storefrontDomain,
                storefrontAccessToken: EnvironmentVariables.storefrontAccessToken,
                customer: Self.customer(email: email, phone: phone)
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
                updateConfiguration()
            }
            .shopifyAcceleratedCheckouts(configuration)
            .environment(\.shopifyApplePayConfiguration, applePayConfiguration)
        }
        .environment(\.locale, Locale(identifier: locale))
    }

    private static func customer(email: String, phone: String) -> ShopifyAcceleratedCheckouts.Customer {
        ShopifyAcceleratedCheckouts.Customer(
            email: email.isEmpty ? nil : email,
            phoneNumber: phone.isEmpty ? nil : phone
        )
    }

    private func updateConfiguration() {
        configuration.customer = Self.customer(email: email, phone: phone)
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
