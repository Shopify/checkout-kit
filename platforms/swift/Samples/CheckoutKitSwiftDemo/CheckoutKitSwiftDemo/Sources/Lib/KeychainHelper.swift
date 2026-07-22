import Foundation
import Security
import ShopifyCheckoutKit

struct OAuthTokenResult: Codable {
    let accessToken: String
    let refreshToken: String?
    let expiresIn: Int
    let expiresAt: Date
    let idToken: String?
    let tokenType: String

    init(accessToken: String, refreshToken: String?, expiresIn: Int, idToken: String?, tokenType: String = "Bearer") {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresIn = expiresIn
        expiresAt = Date().addingTimeInterval(TimeInterval(expiresIn))
        self.idToken = idToken
        self.tokenType = tokenType
    }

    var isExpired: Bool {
        Date() >= expiresAt
    }

    var isExpiringSoon: Bool {
        Date().addingTimeInterval(5 * 60) >= expiresAt
    }
}

@MainActor
final class KeychainHelper {
    static let shared = KeychainHelper()

    private let logger = OSLogger(prefix: "Keychain", logLevel: ShopifyCheckoutKit.configuration.logLevel)
    private let service = "com.shopify.mobilebuyintegration"
    private let tokensKey = "customer_account_tokens"
    private let emailKey = "customer_account_email"

    private init() {}

    @discardableResult
    func save(key: String, data: Data) -> Bool {
        delete(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    func read(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else {
            return nil
        }

        return result as? Data
    }

    @discardableResult
    func delete(key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    func saveTokens(_ tokens: OAuthTokenResult) {
        guard let data = try? JSONEncoder().encode(tokens) else {
            return
        }
        save(key: tokensKey, data: data)
    }

    func getTokens() -> OAuthTokenResult? {
        guard let data = read(key: tokensKey) else {
            return nil
        }
        return try? JSONDecoder().decode(OAuthTokenResult.self, from: data)
    }

    func clearTokens() {
        delete(key: tokensKey)
        delete(key: emailKey)
        logger.debug("Cleared tokens and email from keychain")
    }

    func saveEmail(_ email: String?) {
        guard let email, let data = email.data(using: .utf8) else {
            delete(key: emailKey)
            logger.debug("Cleared email from keychain (nil provided)")
            return
        }
        save(key: emailKey, data: data)
        logger.debug("Saved email to keychain")
    }

    func getEmail() -> String? {
        guard let data = read(key: emailKey) else {
            logger.debug("No email found in keychain")
            return nil
        }
        return String(data: data, encoding: .utf8)
    }
}
