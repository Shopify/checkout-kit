@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 17.0, *)
final class QueryCacheTests: XCTestCase {
    func testConcurrentMissesShareRequest() async throws {
        let cache = QueryCache()
        let counter = QueryCounter()

        async let first: Int = cache.load(cacheKey: "shop", url: queryCacheTestURL) {
            try await Task.sleep(for: .milliseconds(20))
            return await counter.increment()
        }
        async let second: Int = cache.load(cacheKey: "shop", url: queryCacheTestURL) {
            try await Task.sleep(for: .milliseconds(20))
            return await counter.increment()
        }

        let values = try await [first, second]
        XCTAssertEqual(values, [1, 1])
        let requestCount = await counter.value
        XCTAssertEqual(requestCount, 1)
    }

    func testFreshValueIsReturnedWithoutAnotherRequest() async throws {
        let cache = QueryCache(freshnessInterval: 3600)
        let counter = QueryCounter()
        let initialDate = Date(timeIntervalSinceReferenceDate: 1000)

        let first: Int = try await cache.load(
            cacheKey: "shop",
            url: queryCacheTestURL,
            date: initialDate
        ) {
            await counter.increment()
        }
        let second: Int = try await cache.load(
            cacheKey: "shop",
            url: queryCacheTestURL,
            date: initialDate.addingTimeInterval(3599)
        ) {
            await counter.increment()
        }

        XCTAssertEqual(first, 1)
        XCTAssertEqual(second, 1)
        let requestCount = await counter.value
        XCTAssertEqual(requestCount, 1)
    }

    func testStaleValueReturnsWhileCacheRefreshes() async throws {
        let cache = QueryCache(freshnessInterval: 3600)
        let counter = QueryCounter()
        let initialDate = Date(timeIntervalSinceReferenceDate: 1000)

        let first: Int = try await cache.load(
            cacheKey: "shop",
            url: queryCacheTestURL,
            date: initialDate
        ) {
            await counter.increment()
        }
        let stale: Int = try await cache.load(
            cacheKey: "shop",
            url: queryCacheTestURL,
            date: initialDate.addingTimeInterval(3601)
        ) {
            await counter.increment()
        }

        XCTAssertEqual(first, 1)
        XCTAssertEqual(stale, 1)

        await waitForCount(2, counter: counter)

        let refreshed: Int = try await cache.load(
            cacheKey: "shop",
            url: queryCacheTestURL,
            date: initialDate.addingTimeInterval(3602)
        ) {
            await counter.increment()
        }
        XCTAssertEqual(refreshed, 2)
        let requestCount = await counter.value
        XCTAssertEqual(requestCount, 2)
    }

    func testFailedRefreshKeepsStaleValue() async throws {
        let cache = QueryCache(freshnessInterval: 1)
        let counter = QueryCounter()
        let initialDate = Date(timeIntervalSinceReferenceDate: 1000)

        let first: Int = try await cache.load(
            cacheKey: "shop",
            url: queryCacheTestURL,
            date: initialDate
        ) {
            await counter.increment()
        }
        let stale: Int = try await cache.load(
            cacheKey: "shop",
            url: queryCacheTestURL,
            date: initialDate.addingTimeInterval(2)
        ) {
            _ = await counter.increment()
            throw QueryCacheTestError.refreshFailed
        }

        XCTAssertEqual(first, 1)
        XCTAssertEqual(stale, 1)
        await waitForCount(2, counter: counter)

        let retained: Int = try await cache.load(
            cacheKey: "shop",
            url: queryCacheTestURL,
            date: initialDate.addingTimeInterval(2)
        ) {
            throw QueryCacheTestError.refreshFailed
        }
        XCTAssertEqual(retained, 1)
    }

    private func waitForCount(_ count: Int, counter: QueryCounter) async {
        for _ in 0 ..< 100 {
            if await counter.value >= count { return }
            try? await Task.sleep(for: .milliseconds(1))
        }
        XCTFail("Timed out waiting for query count \(count)")
    }
}

private let queryCacheTestURL = URL(string: "https://example.invalid/api/graphql.json")!

private actor QueryCounter {
    private(set) var value = 0

    func increment() -> Int {
        value += 1
        return value
    }
}

private enum QueryCacheTestError: Error {
    case refreshFailed
}
