import Foundation
import ShopifyCheckoutKit
import ShopifyCustomerAccounts
import UIKit

enum DemoCustomerAccountError: LocalizedError {
    case missingConfiguration

    var errorDescription: String? {
        "Missing Customer Account API configuration"
    }
}

@MainActor
final class CustomerAccountManager: ObservableObject {
    static let shared = CustomerAccountManager()

    @Published private(set) var isAuthenticated = false
    @Published private(set) var isLoading = false
    @Published private(set) var customerEmail: String?
    @Published private(set) var tokenExpiresAt: Date?

    private let client: CustomerAccountClient?

    private init() {
        client = Self.makeClient()

        Task {
            try? await restoreSession()
        }
    }

    private static func makeClient() -> CustomerAccountClient? {
        guard let shopID = InfoDictionary.shared.customerAccountApiShopId else { return nil }
        guard let clientID = InfoDictionary.shared.customerAccountApiClientId else { return nil }
        guard let redirectURIString = InfoDictionary.shared.customerAccountApiRedirectUri else { return nil }
        guard let redirectURI = URL(string: redirectURIString) else { return nil }

        return CustomerAccountClient(configuration: CustomerAccountConfiguration(
            shopID: shopID,
            clientID: clientID,
            redirectURI: redirectURI
        ))
    }

    func restoreSession() async throws {
        guard let client else {
            throw DemoCustomerAccountError.missingConfiguration
        }

        let session = try await client.restoreSession()
        updateState(from: session)
    }

    func signIn(from viewController: UIViewController) async throws {
        guard let client else {
            throw DemoCustomerAccountError.missingConfiguration
        }

        isLoading = true
        defer { isLoading = false }

        let session = try await client.signIn(from: viewController)
        updateState(from: session)
        resetCheckoutState()
    }

    func getValidAccessToken() async throws -> String {
        guard let client else {
            throw DemoCustomerAccountError.missingConfiguration
        }

        let accessToken = try await client.accessToken()
        updateState(from: client.session)
        return accessToken
    }

    func logout(from viewController: UIViewController) async throws {
        guard let client else {
            clearPublishedState()
            throw DemoCustomerAccountError.missingConfiguration
        }

        isLoading = true
        defer {
            isLoading = false
            updateState(from: client.session)
            resetCheckoutState()
        }

        try await client.signOut(from: viewController)
    }

    func logout() {
        try? client?.clearSession()
        clearPublishedState()
        resetCheckoutState()
    }

    private func updateState(from session: CustomerAccountSession?) {
        isAuthenticated = session != nil
        customerEmail = session?.email
        tokenExpiresAt = session?.accessTokenExpiresAt
    }

    private func clearPublishedState() {
        isAuthenticated = false
        customerEmail = nil
        tokenExpiresAt = nil
    }

    private func resetCheckoutState() {
        CartManager.shared.resetCart()
        ShopifyCheckoutKit.invalidate()
    }
}
