import Foundation

// MARK: - Query Operations

@available(iOS 16.0, *)
extension StorefrontAPI {
    /// Get a cart by ID
    /// - Parameter id: Cart ID
    /// - Returns: The cart or nil if not found
    func cart(by id: GraphQLScalars.ID) async throws -> Cart? {
        let variables: [String: Any] = [
            "id": id.rawValue
        ]

        let response = try await client.query(
            Operations.getCart(variables: variables)
        )

        return response.data?.cart
    }

    /// Get shop information
    /// - Returns: Shop details
    func shop() async throws -> Shop {
        try await QueryCache.shared.load(
            cacheKey: "shop",
            url: client.url,
            query: {
                let response = try await self.client.query(Operations.getShop())
                guard let shop = response.data?.shop else {
                    throw StorefrontAPI.Errors.payload(propertyName: "shop")
                }
                return shop
            }
        )
    }
}

/// Generic cache manager for StorefrontAPI queries that handles request deduplication and caching
@available(iOS 16.0, *)
actor QueryCache {
    static let shared = QueryCache()

    private var cache: [String: Any] = [:]
    private var inflightRequests: [String: Any] = [:]

    private init() {}

    /// Loads data with deduplication - multiple simultaneous calls will share the same request
    func load<T>(
        cacheKey: String,
        url: URL,
        query: @escaping () async throws -> T
    ) async throws -> T {
        let key = buildCacheKey(queryKey: cacheKey, url: url)

        if let cached = cache[key] as? T {
            return cached
        }

        if let existingTask = inflightRequests[key] as? Task<T, Error> {
            return try await existingTask.value
        }

        let task = Task<T, Error> {
            let result = try await query()
            self.cache(result, for: key)
            return result
        }

        inflightRequests[key] = task

        do {
            let result = try await task.value
            inflightRequests.removeValue(forKey: key)
            return result
        } catch {
            inflightRequests.removeValue(forKey: key)
            throw error
        }
    }

    private func cache(_ result: some Any, for key: String) {
        cache[key] = result
    }

    private func buildCacheKey(queryKey: String, url: URL) -> String {
        return "\(queryKey)-\(url.absoluteString)"
    }
}
