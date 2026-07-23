import CryptoKit
import Foundation
import Security

protocol CredentialStore: Sendable {
    func load() throws -> StoredCredentials?
    func save(_ credentials: StoredCredentials) throws
    func remove() throws
}

struct KeychainCredentialStore: CredentialStore {
    private let service = "com.shopify.ShopifyCustomerAccounts"
    private let account: String

    init(configuration: OAuthConfiguration) {
        let namespace = "\(configuration.shopID):\(configuration.clientID)"
        account = SHA256.hash(data: Data(namespace.utf8))
            .map { String(format: "%02x", $0) }
            .joined()
    }

    func load() throws -> StoredCredentials? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound {
            return nil
        }
        guard status == errSecSuccess, let data = result as? Data else {
            throw OAuthError.storageFailed(status: status)
        }

        guard let credentials = try? JSONDecoder().decode(StoredCredentials.self, from: data) else {
            throw OAuthError.storageFailed(status: errSecDecode)
        }
        return credentials
    }

    func save(_ credentials: StoredCredentials) throws {
        guard let data = try? JSONEncoder().encode(credentials) else {
            throw OAuthError.storageFailed(status: errSecInternalError)
        }
        let updateStatus = SecItemUpdate(
            baseQuery as CFDictionary,
            [kSecValueData as String: data] as CFDictionary
        )

        if updateStatus == errSecSuccess {
            return
        }
        guard updateStatus == errSecItemNotFound else {
            throw OAuthError.storageFailed(status: updateStatus)
        }

        var query = baseQuery
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let addStatus = SecItemAdd(query as CFDictionary, nil)
        guard addStatus == errSecSuccess else {
            throw OAuthError.storageFailed(status: addStatus)
        }
    }

    func remove() throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw OAuthError.storageFailed(status: status)
        }
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }
}
