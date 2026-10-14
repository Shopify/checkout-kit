@testable import CheckoutKitTelemetry
import Foundation
import Testing

struct CheckoutKitTelemetryTests {
    @Test func aggregatesCountersAndUsesClosedAttributes() async throws {
        let recorder = RequestRecorder()
        let times = LockedTimes([1_000_000, 2_000_000])
        let client = CheckoutKitTelemetry(
            configuration: .init(
                sdkVersion: "1.2.3",
                product: .acceleratedCheckouts,
                platform: .reactNativeSwift
            ),
            clock: { times.next() },
            transport: { request in
                recorder.record(request)
                return HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            }
        )

        let metric = TelemetryErrorMetric(
            category: .http,
            stage: .load,
            code: .server,
            retryable: true,
            isRetry: true
        )
        client.recordError(metric)
        client.recordError(metric)

        #expect(await client.flush())
        let request = try #require(recorder.request)
        let body = try #require(request.httpBody)
        let json = try #require(JSONSerialization.jsonObject(with: body) as? [String: Any])
        let resourceMetrics = try #require(json["resourceMetrics"] as? [[String: Any]])
        let resource = try #require(resourceMetrics[0]["resource"] as? [String: Any])
        let resourceAttributes = try #require(resource["attributes"] as? [[String: Any]])
        #expect(stringAttributes(resourceAttributes) == [
            "service.name": "checkout-kit",
            "service.version": "1.2.3",
            "telemetry.sdk.language": "swift",
            "telemetry.sdk.name": "checkout-kit-telemetry",
            "telemetry.sdk.version": "1.2.3"
        ])
        let scopeMetrics = try #require(resourceMetrics[0]["scopeMetrics"] as? [[String: Any]])
        let metrics = try #require(scopeMetrics[0]["metrics"] as? [[String: Any]])
        let sum = try #require(metrics[0]["sum"] as? [String: Any])
        let points = try #require(sum["dataPoints"] as? [[String: Any]])
        let pointAttributes = try #require(points[0]["attributes"] as? [[String: Any]])
        #expect(stringAttributes(pointAttributes)["product"] == "accelerated_checkouts")
        #expect(stringAttributes(pointAttributes)["platform"] == "react-native-swift")
        #expect(stringAttributes(pointAttributes)["integration"] == nil)
        #expect(boolAttributes(pointAttributes)["is_retry"] == true)
        #expect(points[0]["asInt"] as? String == "2")
        #expect(String(data: body, encoding: .utf8)?.contains("checkoutUrl") == false)
    }

    @Test func splitsSeriesByPerMeasurementProductOverride() async throws {
        let recorder = RequestRecorder()
        let client = CheckoutKitTelemetry(
            configuration: .init(sdkVersion: "1.2.3", product: .checkoutKit),
            clock: { 1_000_000 },
            transport: { request in
                recorder.record(request)
                return HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            }
        )

        client.recordError(.init(category: .http, stage: .load, code: .server, retryable: true))
        client.recordError(
            .init(category: .http, stage: .load, code: .server, retryable: true, product: .acceleratedCheckouts)
        )

        #expect(await client.flush())
        let request = try #require(recorder.request)
        let body = try #require(request.httpBody)
        let json = try #require(JSONSerialization.jsonObject(with: body) as? [String: Any])
        let resourceMetrics = try #require(json["resourceMetrics"] as? [[String: Any]])
        let scopeMetrics = try #require(resourceMetrics[0]["scopeMetrics"] as? [[String: Any]])
        let metrics = try #require(scopeMetrics[0]["metrics"] as? [[String: Any]])
        let points = metrics
            .filter { $0["name"] as? String == "checkout_kit_error" }
            .compactMap { $0["sum"] as? [String: Any] }
            .flatMap { ($0["dataPoints"] as? [[String: Any]]) ?? [] }
        #expect(points.count == 2)
        let products = points.compactMap { point in
            (point["attributes"] as? [[String: Any]]).map { stringAttributes($0)["product"] }
        }
        #expect(Set(products.compactMap { $0 }) == ["checkout_kit", "accelerated_checkouts"])
        for point in points {
            #expect(point["asInt"] as? String == "1")
        }
    }

    @Test func isolatesTransportFailure() async {
        let client = CheckoutKitTelemetry(
            configuration: .init(sdkVersion: "1.2.3"),
            clock: { 1 },
            transport: { _ in
                throw TestError.unavailable
            }
        )
        client.recordProtocolDecodeError(.init(method: .init(method: "ec.start"), failureType: .params))
        #expect(await client.flush() == false)
    }

    @Test func boundsPendingMeasurementsAndClampsCapacity() async throws {
        let recorder = RequestRecorder()
        let client = CheckoutKitTelemetry(
            configuration: .init(sdkVersion: "1.2.3", maxPendingMeasurements: 0),
            clock: { 1 },
            transport: successfulTransport(recorder: recorder)
        )
        client.recordNavigationRetry(.init(reason: .timeout, result: .started))
        client.recordNavigationRetry(.init(reason: .dns, result: .failed))

        _ = await client.flush()

        let body = try #require(recorder.request?.httpBody)
        #expect(String(data: body, encoding: .utf8)?.contains("\"asInt\":\"1\"") == true)
    }

    @Test func backsOffAfterExportFailure() async {
        let attempts = LockedInt(0)
        let client = CheckoutKitTelemetry(
            configuration: .init(sdkVersion: "1.2.3", exportInterval: 60),
            clock: { 1 },
            transport: { _ in
                attempts.increment()
                throw TestError.unavailable
            }
        )
        client.recordError(.init(category: .http, stage: .load, code: .server, retryable: true))
        _ = await client.flush()
        client.recordError(.init(category: .http, stage: .load, code: .server, retryable: true))

        #expect(await client.flush() == false)
        #expect(attempts.value == 1)
    }

    @Test func recordsFiniteNonNegativeDurationsOnly() async throws {
        let recorder = RequestRecorder()
        let client = CheckoutKitTelemetry(
            configuration: .init(sdkVersion: "1.2.3"),
            clock: { 1 },
            transport: successfulTransport(recorder: recorder)
        )
        client.recordNavigationDuration(.init(milliseconds: .nan, result: .failure, preloaded: false))
        client.recordNavigationDuration(.init(milliseconds: 450, result: .success, preloaded: false))

        _ = await client.flush()

        let body = try #require(recorder.request?.httpBody)
        let string = try #require(String(data: body, encoding: .utf8))
        #expect(string.contains("\"count\":\"1\""))
        #expect(string.contains("\"sum\":450"))
    }

    @Test func shutdownBypassesExportBackoffAndRetriesFailedMeasurements() async throws {
        let attempts = LockedInt(0)
        let recorder = RequestRecorder()
        let client = CheckoutKitTelemetry(
            configuration: .init(sdkVersion: "1.2.3"),
            clock: { 1 },
            transport: { request in
                recorder.record(request)
                attempts.increment()
                let status = attempts.value == 1 ? 500 : 200
                return HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!
            }
        )
        let metric = TelemetryErrorMetric(category: .http, stage: .load, code: .server, retryable: true)
        client.recordError(metric)
        _ = await client.flush()
        client.recordError(metric)

        #expect(await client.shutdown())
        #expect(attempts.value == 2)
        let body = try #require(recorder.request?.httpBody)
        #expect(String(data: body, encoding: .utf8)?.contains("\"asInt\":\"2\"") == true)
    }

    @Test func acceptsMethodsAddedToTheGeneratedProtocolCatalog() async throws {
        let recorder = RequestRecorder()
        let client = CheckoutKitTelemetry(
            configuration: .init(sdkVersion: "1.2.3"),
            clock: { 1 },
            transport: successfulTransport(recorder: recorder)
        )

        client.recordProtocolDecodeError(
            .init(method: .init(method: "ec.buyer.change"), failureType: .params)
        )

        _ = await client.flush()

        let body = try #require(recorder.request?.httpBody)
        #expect(String(data: body, encoding: .utf8)?.contains("ec.buyer.change") == true)
    }

    @Test func ordersGroupsWithMatchingNamesDeterministically() async throws {
        let recorder = RequestRecorder()
        let client = CheckoutKitTelemetry(
            configuration: .init(sdkVersion: "1.2.3"),
            clock: { 1 },
            transport: successfulTransport(recorder: recorder)
        )
        client.recordError(.init(category: .http, stage: .load, code: .server, retryable: true))
        client.recordError(.init(category: .http, stage: .load, code: .client, retryable: false))

        _ = await client.flush()

        let body = try #require(recorder.request?.httpBody)
        let string = try #require(String(data: body, encoding: .utf8))
        let clientRange = try #require(string.range(of: "4xx"))
        let serverRange = try #require(string.range(of: "5xx"))
        #expect(clientRange.lowerBound < serverRange.lowerBound)
    }

    @Test func discardShutdownCancelsTransportAndMakesLifecycleSafe() async {
        let client = CheckoutKitTelemetry(
            configuration: .init(sdkVersion: "1.2.3"),
            clock: { 1 },
            transport: { _ in
                try await Task.sleep(nanoseconds: 60_000_000_000)
                throw TestError.unavailable
            }
        )
        client.recordError(.init(category: .http, stage: .load, code: .server, retryable: true))
        let flush = Task { await client.flush() }
        await Task.yield()
        #expect(await client.shutdown(discardPending: true))
        client.start()
        #expect(await client.flush() == false)
        #expect(await flush.value == false)
    }
}

private func stringAttributes(_ attributes: [[String: Any]]) -> [String: String] {
    Dictionary(uniqueKeysWithValues: attributes.compactMap { attribute in
        guard
            let key = attribute["key"] as? String,
            let value = attribute["value"] as? [String: Any],
            let stringValue = value["stringValue"] as? String
        else { return nil }
        return (key, stringValue)
    })
}

private func boolAttributes(_ attributes: [[String: Any]]) -> [String: Bool] {
    Dictionary(uniqueKeysWithValues: attributes.compactMap { attribute in
        guard
            let key = attribute["key"] as? String,
            let value = attribute["value"] as? [String: Any],
            let boolValue = value["boolValue"] as? Bool
        else { return nil }
        return (key, boolValue)
    })
}

private func successfulTransport(recorder: RequestRecorder) -> CheckoutKitTelemetry.Transport {
    { request in
        recorder.record(request)
        return HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
    }
}

private enum TestError: Error {
    case unavailable
}

private final class RequestRecorder: @unchecked Sendable {
    private let lock = NSLock()
    private var storedRequest: URLRequest?

    var request: URLRequest? {
        lock.lock()
        defer { lock.unlock() }
        return storedRequest
    }

    func record(_ request: URLRequest) {
        lock.lock()
        storedRequest = request
        lock.unlock()
    }
}

private final class LockedTimes: @unchecked Sendable {
    private let lock = NSLock()
    private var values: [UInt64]

    init(_ values: [UInt64]) {
        self.values = values
    }

    func next() -> UInt64 {
        lock.lock()
        defer { lock.unlock() }
        return values.removeFirst()
    }
}

private final class LockedBool: @unchecked Sendable {
    private let lock = NSLock()
    private var storedValue: Bool

    init(_ value: Bool) {
        storedValue = value
    }

    var value: Bool {
        lock.lock()
        defer { lock.unlock() }
        return storedValue
    }

    func set(_ value: Bool) {
        lock.lock()
        storedValue = value
        lock.unlock()
    }
}

private final class LockedInt: @unchecked Sendable {
    private let lock = NSLock()
    private var storedValue: Int

    init(_ value: Int) {
        storedValue = value
    }

    var value: Int {
        lock.lock()
        defer { lock.unlock() }
        return storedValue
    }

    func increment() {
        lock.lock()
        storedValue += 1
        lock.unlock()
    }
}
