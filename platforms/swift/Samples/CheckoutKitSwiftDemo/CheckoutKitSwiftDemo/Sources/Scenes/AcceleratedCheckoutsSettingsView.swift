import PassKit
import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import SwiftUI

struct AcceleratedCheckoutsSettingsView: View {
    @AppStorage(AppStorageKeys.acceleratedCheckoutsLogLevel.rawValue)
    private var logLevel: LogLevel = .debug {
        didSet {
            ShopifyAcceleratedCheckouts.logLevel = logLevel
        }
    }

    @AppStorage(AppStorageKeys.applePayStyle.rawValue)
    private var applePayStyle: ApplePayStyleOption = .automatic

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

    private let availableLocales: [(name: String, isoCode: String)] = [
        ("English", "en"),
        ("English (US)", "en-US"),
        ("French", "fr-FR")
    ]

    private var selectedCountries: Set<String> {
        Set(
            supportedCountriesString
                .split(separator: ",")
                .map(String.init)
                .filter { !$0.isEmpty }
        )
    }

    var body: some View {
        List {
            Section {
                Text("These settings apply to new accelerated checkouts and persist between app launches.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Section(
                header: Text("Apple Pay Button"),
                footer: Text("Configures the visual style of the Apple Pay button.")
            ) {
                ForEach(ApplePayStyleOption.allCases, id: \.self) { option in
                    HStack {
                        Text(option.title)
                        Spacer()
                        if option == applePayStyle {
                            Text("\u{2713}")
                        }
                    }
                    .background(Color.clear)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        applePayStyle = option
                    }
                }
            }

            Section(
                header: Text("Accelerated Checkout Language"),
                footer: Text("Configures the locale inherited by accelerated checkout controls.")
            ) {
                Picker("Language", selection: $locale) {
                    ForEach(availableLocales, id: \.isoCode) { localeOption in
                        Text(localeOption.name).tag(localeOption.isoCode)
                    }
                }
                .pickerStyle(.menu)
            }

            Section(
                header: Text("Apple Pay Contact Fields"),
                footer: Text(
                    "Prefilled values override the cart buyer identity for accelerated checkout. When a value is present, Apple Pay does not request that field again."
                )
            ) {
                Toggle("Require Email from Apple Pay", isOn: $requireEmail)

                TextField("Prefill Email (Optional)", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .accessibilityLabel("Prefill Email")

                Toggle("Require Phone from Apple Pay", isOn: $requirePhone)

                TextField("Prefill Phone (Optional)", text: $phone)
                    .textContentType(.telephoneNumber)
                    .keyboardType(.phonePad)
                    .accessibilityLabel("Prefill Phone")
            }

            Section(
                header: Text("Apple Pay Shipping Countries"),
                footer: Text("Leave the selection empty to allow all shipping countries.")
            ) {
                if !selectedCountries.isEmpty {
                    Text("Selected: \(selectedCountries.sorted().joined(separator: ", "))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                NavigationLink("Select Countries (\(selectedCountries.count) selected)") {
                    CountrySelectionView(
                        supportedCountriesString: $supportedCountriesString
                    )
                }
            }

            Section(
                header: Text("Logging"),
                footer: Text("Controls the level of logging for Accelerated Checkouts operations.")
            ) {
                Picker(
                    "Log Level",
                    selection: Binding(
                        get: { logLevel },
                        set: { logLevel = $0 }
                    )
                ) {
                    ForEach(LogLevel.allCases, id: \.self) { level in
                        Text(
                            level.rawValue.capitalized(with: Locale.current)
                        ).tag(level)
                    }
                }
                .pickerStyle(.menu)
            }
        }
        .listStyle(GroupedListStyle())
        .navigationTitle("Accelerated Checkouts")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct CountrySelectionView: View {
    @Binding var supportedCountriesString: String
    @State private var searchText = ""

    private static let allCountries: [(code: String, name: String)] = {
        let locale = Locale(identifier: "en_US")

        return NSLocale.isoCountryCodes.compactMap { code in
            locale.localizedString(forRegionCode: code).map { (code: code, name: $0) }
        }.sorted { $0.name < $1.name }
    }()

    private var selectedCountries: Set<String> {
        Set(
            supportedCountriesString
                .split(separator: ",")
                .map(String.init)
                .filter { !$0.isEmpty }
        )
    }

    private var filteredCountries: [(code: String, name: String)] {
        guard !searchText.isEmpty else { return Self.allCountries }

        return Self.allCountries.filter { country in
            country.name.localizedCaseInsensitiveContains(searchText) ||
                country.code.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        List {
            Section {
                if selectedCountries.isEmpty {
                    Text("No countries selected - All countries allowed")
                        .font(.body.italic())
                        .foregroundStyle(.secondary)
                } else {
                    Button("Clear All", role: .destructive) {
                        supportedCountriesString = ""
                    }
                }
            }

            Section("Countries") {
                ForEach(filteredCountries, id: \.code) { country in
                    Button {
                        toggleCountry(country.code)
                    } label: {
                        HStack {
                            Text("\(country.name) (\(country.code))")
                                .foregroundStyle(.primary)
                            Spacer()
                            if selectedCountries.contains(country.code) {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            }
        }
        .searchable(text: $searchText, prompt: "Search countries")
        .navigationTitle("Select Countries")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func toggleCountry(_ code: String) {
        var countries = selectedCountries
        if countries.contains(code) {
            countries.remove(code)
        } else {
            countries.insert(code)
        }
        supportedCountriesString = countries.sorted().joined(separator: ",")
    }
}

enum ApplePayStyleOption: String, CaseIterable {
    case automatic
    case black
    case white
    case whiteOutline

    var title: String {
        switch self {
        case .automatic: return "Automatic"
        case .black: return "Black"
        case .white: return "White"
        case .whiteOutline: return "White Outline"
        }
    }

    @available(iOS 16.0, *)
    var style: PKPaymentButtonStyle {
        switch self {
        case .automatic: return .automatic
        case .black: return .black
        case .white: return .white
        case .whiteOutline: return .whiteOutline
        }
    }
}

#Preview {
    NavigationView {
        AcceleratedCheckoutsSettingsView()
    }
}
