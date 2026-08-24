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
        let client = client
        return try await QueryCache.shared.load(
            cacheKey: "shop",
            url: client.url,
            query: {
                let requestStartedAt = AcceleratedCheckoutDebugTiming.now
                ShopifyAcceleratedCheckouts.logger.debug(
                    "Shop settings Storefront API request started."
                )

                do {
                    let response = try await client.query(Operations.getShop())
                    guard let shop = response.data?.shop else {
                        throw StorefrontAPI.Errors.payload(propertyName: "shop")
                    }
                    ShopifyAcceleratedCheckouts.logger.debug(
                        "Shop settings Storefront API request completed in \(AcceleratedCheckoutDebugTiming.elapsedMilliseconds(since: requestStartedAt)) ms."
                    )
                    return shop
                } catch {
                    ShopifyAcceleratedCheckouts.logger.debug(
                        "Shop settings Storefront API request failed after \(AcceleratedCheckoutDebugTiming.elapsedMilliseconds(since: requestStartedAt)) ms."
                    )
                    throw error
                }
            }
        )
    }
}

/// Generic cache manager for StorefrontAPI queries that handles request deduplication and caching
@available(iOS 16.0, *)
actor QueryCache {
    static let shared = QueryCache()

    static let defaultFreshnessInterval: TimeInterval = 60 * 60

    private struct CacheEntry {
        let value: any Sendable
        let cachedAt: Date
    }

    private let freshnessInterval: TimeInterval
    private var cache: [String: CacheEntry] = [:]
    private var inflightRequests: [String: any Sendable] = [:]

    init(freshnessInterval: TimeInterval = defaultFreshnessInterval) {
        self.freshnessInterval = freshnessInterval
    }

    /// Loads data with deduplication and stale-while-revalidate caching.
    ///
    /// Fresh values are returned from memory. Stale values are returned immediately while
    /// one shared refresh runs in the background. Failed refreshes leave the stale value intact.
    func load<T: Sendable>(
        cacheKey: String,
        url: URL,
        date: Date = Date(),
        query: @Sendable @escaping () async throws -> T
    ) async throws -> T {
        let key = buildCacheKey(queryKey: cacheKey, url: url)

        if let entry = cache[key], let cached = entry.value as? T {
            let age = max(0, date.timeIntervalSince(entry.cachedAt))
            let isFresh = age < freshnessInterval
            let freshnessRemaining = max(0, freshnessInterval - age)
            ShopifyAcceleratedCheckouts.logger.debug(
                "Shop settings cache hit: \(isFresh ? "fresh" : "stale") "
                    + "(age: \(AcceleratedCheckoutDebugTiming.seconds(age)) s, "
                    + "freshness: \(AcceleratedCheckoutDebugTiming.seconds(freshnessInterval)) s, "
                    + "remaining: \(AcceleratedCheckoutDebugTiming.seconds(freshnessRemaining)) s)."
            )
            if !isFresh {
                refreshIfNeeded(key: key, date: date, query: query)
            }
            return cached
        }

        if let existingTask = inflightRequests[key] as? Task<T, Error> {
            ShopifyAcceleratedCheckouts.logger.debug(
                "Shop settings cache miss: joining an in-flight request."
            )
            return try await existingTask.value
        }

        let loadStartedAt = AcceleratedCheckoutDebugTiming.now
        ShopifyAcceleratedCheckouts.logger.debug(
            "Shop settings cache miss: starting a request."
        )
        let task = Task<T, Error> {
            try await query()
        }

        inflightRequests[key] = task

        do {
            let result = try await task.value
            cache(result, for: key, date: date)
            inflightRequests.removeValue(forKey: key)
            ShopifyAcceleratedCheckouts.logger.debug(
                "Shop settings cache filled in \(AcceleratedCheckoutDebugTiming.elapsedMilliseconds(since: loadStartedAt)) ms; "
                    + "fresh for \(AcceleratedCheckoutDebugTiming.seconds(freshnessInterval)) s."
            )
            return result
        } catch {
            inflightRequests.removeValue(forKey: key)
            ShopifyAcceleratedCheckouts.logger.debug(
                "Shop settings cache fill failed after \(AcceleratedCheckoutDebugTiming.elapsedMilliseconds(since: loadStartedAt)) ms."
            )
            throw error
        }
    }

    private func refreshIfNeeded<T: Sendable>(
        key: String,
        date: Date,
        query: @Sendable @escaping () async throws -> T
    ) {
        guard inflightRequests[key] == nil else {
            ShopifyAcceleratedCheckouts.logger.debug(
                "Shop settings cache refresh already in flight; serving the stale value."
            )
            return
        }

        let refreshStartedAt = AcceleratedCheckoutDebugTiming.now
        ShopifyAcceleratedCheckouts.logger.debug(
            "Shop settings cache refresh started; serving the stale value."
        )
        let task = Task<T, Error> {
            try await query()
        }
        inflightRequests[key] = task

        Task {
            do {
                let result = try await task.value
                cache(result, for: key, date: date)
                ShopifyAcceleratedCheckouts.logger.debug(
                    "Shop settings cache refresh completed in \(AcceleratedCheckoutDebugTiming.elapsedMilliseconds(since: refreshStartedAt)) ms; "
                        + "fresh for \(AcceleratedCheckoutDebugTiming.seconds(freshnessInterval)) s."
                )
            } catch {
                ShopifyAcceleratedCheckouts.logger.debug(
                    "Shop settings cache refresh failed after \(AcceleratedCheckoutDebugTiming.elapsedMilliseconds(since: refreshStartedAt)) ms; retaining the stale value."
                )
            }
            inflightRequests.removeValue(forKey: key)
        }
    }

    private func cache(_ result: some Sendable, for key: String, date: Date) {
        cache[key] = CacheEntry(value: result, cachedAt: date)
    }

    private func buildCacheKey(queryKey: String, url: URL) -> String {
        return "\(queryKey)-\(url.absoluteString)"
    }
}
