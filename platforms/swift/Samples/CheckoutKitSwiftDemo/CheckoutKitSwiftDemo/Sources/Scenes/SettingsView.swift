import Combine
import PassKit
import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import SwiftUI

enum AppStorageKeys: String {
    case acceleratedCheckoutsLogLevel
    case checkoutKitLogLevel
    case checkoutPreloadingEnabled
    case preloadObservabilityEnabled
    case buyerIdentityMode
    case applePayStyle
    case windowOpenHandler
}

enum WindowOpenHandlerOption: String, CaseIterable {
    case `default`
    case externalApp

    var title: String {
        switch self {
        case .default: return "Default (SFSafariViewController)"
        case .externalApp: return "External app"
        }
    }
}

struct SettingsView: View {
    @ObservedObject var config: AppConfiguration = appConfiguration

    @AppStorage(AppStorageKeys.checkoutKitLogLevel.rawValue)
    var checkoutKitLogLevel: LogLevel = .debug {
        didSet {
            ShopifyCheckoutKit.configure {
                $0.logLevel = checkoutKitLogLevel
            }
        }
    }

    @AppStorage(AppStorageKeys.acceleratedCheckoutsLogLevel.rawValue)
    var acceleratedCheckoutsLogLevel: LogLevel = .debug {
        didSet {
            ShopifyAcceleratedCheckouts.logLevel = acceleratedCheckoutsLogLevel
        }
    }

    @AppStorage(AppStorageKeys.applePayStyle.rawValue)
    var applePayStyle: ApplePayStyleOption = .automatic

    @AppStorage(AppStorageKeys.checkoutPreloadingEnabled.rawValue)
    var checkoutPreloadingEnabled = true

    @AppStorage(AppStorageKeys.windowOpenHandler.rawValue)
    var windowOpenHandler: WindowOpenHandlerOption = .default

    @State private var logs: [String?] = LogReader.shared.readLogs() ?? []
    @State private var selectedAppearance = ShopifyCheckoutKit.configuration.appearance

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Features")) {
                    Toggle("Checkout preloading", isOn: $checkoutPreloadingEnabled)
                        .onChange(of: checkoutPreloadingEnabled) { _ in
                            ShopifyCheckoutKit.configure {
                                $0.preloading.enabled = checkoutPreloadingEnabled
                            }
                        }

                    Picker("Window open handler", selection: $windowOpenHandler) {
                        ForEach(WindowOpenHandlerOption.allCases, id: \.self) { option in
                            Text(option.title).tag(option)
                        }
                    }
                    .pickerStyle(.menu)
                }

                Section(
                    content: {
                        Picker("Buyer Identity", selection: $config.buyerIdentityMode) {
                            ForEach(BuyerIdentityMode.allCases, id: \.self) { mode in
                                Text(mode.displayName).tag(mode)
                            }
                        }
                        .pickerStyle(.menu)

                        BuyerIdentityDetails(mode: config.buyerIdentityMode)
                    },
                    header: {
                        Text("Authentication")
                    },
                    footer: {
                        Text(
                            "Prefills buyer identity at checkout.\nChanging this setting will clear your cart."
                        )
                    }
                )

                Section(header: Text("Universal Links")) {
                    Toggle("Handle Checkout URLs", isOn: $config.universalLinks.checkout)
                    Toggle("Handle Cart URLs", isOn: $config.universalLinks.cart)
                    Toggle("Handle Product URLs", isOn: $config.universalLinks.products)
                    Toggle(
                        "Handle all Universal Links",
                        isOn: $config.universalLinks.handleAllURLsInApp
                    )

                    Text(
                        "By default, the app will only handle the selections above and route everything else to Safari. Enabling the \"Handle all Universal Links\" setting will route all Universal Links to this app."
                    )
                    .font(.caption)
                }

                Section(header: Text("Theme")) {
                    ForEach(AppearanceOption.allCases) { option in
                        AppearanceOptionView(
                            title: option.title,
                            isSelected: option.appearance == selectedAppearance
                        )
                        .background(Color.clear)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            selectedAppearance = option.appearance
                            ShopifyCheckoutKit.configuration.appearance = option.appearance
                            ShopifyCheckoutKit.configuration.tintColor = option.appearance.colorScheme.tintColor
                            ShopifyCheckoutKit.configuration.backgroundColor =
                                option.appearance.colorScheme.backgroundColor
                            NotificationCenter.default.post(
                                name: .colorSchemeChanged, object: nil
                            )
                        }
                    }
                }

                Section(
                    header: Text("Apple Pay"),
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

                Section(header: Text("Logging")) {
                    Picker(
                        "Checkout Kit",
                        selection: Binding(
                            get: { checkoutKitLogLevel },
                            set: { checkoutKitLogLevel = $0 }
                        )
                    ) {
                        ForEach(LogLevel.allCases, id: \.self) { level in
                            Text(
                                level.rawValue.capitalized(with: Locale.current)
                            ).tag(level)
                        }
                    }
                    .pickerStyle(.menu)

                    Picker(
                        "Accelerated Checkouts",
                        selection: Binding(
                            get: { acceleratedCheckoutsLogLevel },
                            set: { acceleratedCheckoutsLogLevel = $0 }
                        )
                    ) {
                        ForEach(LogLevel.allCases, id: \.self) { level in
                            Text(
                                level.rawValue.capitalized(with: Locale.current)
                            ).tag(level)
                        }
                    }
                    .pickerStyle(.menu)

                    NavigationLink(destination: LogsView()) {
                        Text("Logs")
                    }
                }

                Section(header: Text("Version")) {
                    HStack {
                        Text("Sample app version")
                        Spacer()
                        Text(currentVersion())
                            .font(.system(size: 14))
                            .foregroundStyle(.gray)
                    }
                    HStack {
                        Text("Checkout Kit version")
                        Spacer()
                        Text(ShopifyCheckoutKit.version)
                            .font(.system(size: 14))
                            .foregroundStyle(.gray)
                    }
                }
            }
            .listStyle(GroupedListStyle())
            .navigationTitle("Settings")
            .onAppear {
                logs = LogReader.shared.readLogs() ?? []
            }
        }
        .navigationBarHidden(true)
        .preferredColorScheme(.dark)
    }

    private func currentVersion() -> String {
        return "\(InfoDictionary.shared.version) (\(InfoDictionary.shared.buildNumber))"
    }
}

struct BuyerIdentityDetails: View {
    let mode: BuyerIdentityMode
    @ObservedObject var customerAccountManager = CustomerAccountManager.shared

    private var expiresAtFormatted: String? {
        guard let expiresAt = customerAccountManager.tokenExpiresAt else { return nil }
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: expiresAt)
    }

    var body: some View {
        switch mode {
        case .guest:
            EmptyView()
        case .hardcoded:
            Text("Populates the Cart Buyer Identity with values from Storefront.xcconfig")
                .font(.caption)
                .foregroundStyle(.secondary)
        case .customerAccount:
            if customerAccountManager.isAuthenticated {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Changing Buyer Identity will log you out.")
                        .foregroundStyle(.yellow)
                        .padding(.bottom, 4)

                    HStack {
                        Text("User: \(customerAccountManager.customerEmail ?? "Unknown")")
                            .foregroundStyle(.secondary)

                        Button("Change user") {
                            NotificationCenter.default.post(name: .navigateToAccount, object: nil)
                        }
                        .foregroundStyle(.tint)
                    }

                    if let expiresAt = expiresAtFormatted {
                        Text("Expires: \(expiresAt)").foregroundStyle(.secondary)
                    }
                }
                .font(.caption)

            } else {
                HStack(spacing: 4) {
                    Text("Sign in on the")
                        .foregroundStyle(.secondary)
                    Button("Account tab") {
                        NotificationCenter.default.post(name: .navigateToAccount, object: nil)
                    }
                    .foregroundStyle(.tint)
                }
                .font(.caption)
            }
        }
    }
}

struct AppearanceOptionView: View {
    let title: String
    let isSelected: Bool

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            if isSelected {
                Text("✓")
            }
        }
    }
}

enum AppearanceOption: CaseIterable, Identifiable {
    case storefront
    case appAutomatic
    case appLight
    case appDark

    var id: Self {
        self
    }

    var title: String {
        switch self {
        case .storefront:
            return "Storefront"
        case .appAutomatic:
            return "App automatic"
        case .appLight:
            return "App light"
        case .appDark:
            return "App dark"
        }
    }

    var appearance: Configuration.Appearance {
        switch self {
        case .storefront:
            return .storefront
        case .appAutomatic:
            return .app(.automatic)
        case .appLight:
            return .app(.light)
        case .appDark:
            return .app(.dark)
        }
    }
}

extension Configuration.ColorScheme {
    var tintColor: UIColor {
        return UIColor(red: 0.09, green: 0.45, blue: 0.69, alpha: 1.00)
    }

    var backgroundColor: UIColor {
        return .systemBackground
    }
}

extension Configuration.Appearance {
    var colorScheme: Configuration.ColorScheme {
        switch self {
        case let .app(colorScheme):
            return colorScheme
        case .storefront:
            return .light
        }
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
    SettingsView()
}
