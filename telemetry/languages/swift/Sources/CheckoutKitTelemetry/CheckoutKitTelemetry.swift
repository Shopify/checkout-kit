#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Foundation

package enum TelemetryErrorCategory: String, Sendable {
    case http
    case navigation
    case `protocol`
    case renderProcess = "render_process"
    case unknown
}

package enum TelemetryErrorStage: String, Sendable {
    case initialization
    case load
    case message
    case presentation
}

package enum TelemetryErrorCode: String, Sendable {
    case client = "4xx"
    case server = "5xx"
    case cancelled
    case connectionLost = "connection_lost"
    case cannotConnect = "cannot_connect"
    case dns
    case timeout
    case unknown
}

package struct TelemetryProtocolMethod: Sendable {
    package let rawValue: String

    package init(method: String) {
        rawValue = EmbeddedCheckoutProtocol.Event.all.contains(method) ? method : "unknown"
    }
}

package enum TelemetryDecodeFailureType: String, Sendable {
    case envelope
    case params
    case serialization
    case unknown
}

package enum TelemetryNavigationRetryReason: String, Sendable {
    case timeout
    case connectionLost = "connection_lost"
    case cannotConnect = "cannot_connect"
    case dns
    case unknown
}

package enum TelemetryNavigationRetryResult: String, Sendable {
    case started
    case failed
    case notAttempted = "not_attempted"
}

package enum TelemetryNavigationDurationResult: String, Sendable {
    case success
    case failure
}

package enum TelemetryProduct: String, Sendable {
    case checkoutKit = "checkout_kit"
    case acceleratedCheckouts = "accelerated_checkouts"
    case customerAuth = "customer_auth"
}

package enum TelemetryPlatform: String, Sendable {
    case swift
    case reactNativeSwift = "react-native-swift"
}

package struct TelemetryErrorMetric: Sendable {
    package let category: TelemetryErrorCategory
    package let stage: TelemetryErrorStage
    package let code: TelemetryErrorCode
    package let retryable: Bool
    package let isRetry: Bool
    package let product: TelemetryProduct?

    package init(
        category: TelemetryErrorCategory,
        stage: TelemetryErrorStage,
        code: TelemetryErrorCode,
        retryable: Bool,
        isRetry: Bool = false,
        product: TelemetryProduct? = nil
    ) {
        self.category = category
        self.stage = stage
        self.code = code
        self.retryable = retryable
        self.isRetry = isRetry
        self.product = product
    }
}

package struct TelemetryProtocolDecodeErrorMetric: Sendable {
    package let method: TelemetryProtocolMethod
    package let failureType: TelemetryDecodeFailureType
    package let product: TelemetryProduct?

    package init(
        method: TelemetryProtocolMethod,
        failureType: TelemetryDecodeFailureType,
        product: TelemetryProduct? = nil
    ) {
        self.method = method
        self.failureType = failureType
        self.product = product
    }
}

package struct TelemetryNavigationRetryMetric: Sendable {
    package let reason: TelemetryNavigationRetryReason
    package let result: TelemetryNavigationRetryResult
    package let product: TelemetryProduct?

    package init(
        reason: TelemetryNavigationRetryReason,
        result: TelemetryNavigationRetryResult,
        product: TelemetryProduct? = nil
    ) {
        self.reason = reason
        self.result = result
        self.product = product
    }
}

package struct TelemetryNavigationDurationMetric: Sendable {
    package let milliseconds: Double
    package let result: TelemetryNavigationDurationResult
    package let preloaded: Bool
    package let product: TelemetryProduct?

    package init(
        milliseconds: Double,
        result: TelemetryNavigationDurationResult,
        preloaded: Bool,
        product: TelemetryProduct? = nil
    ) {
        self.milliseconds = milliseconds
        self.result = result
        self.preloaded = preloaded
        self.product = product
    }
}

package final class CheckoutKitTelemetry: @unchecked Sendable {
    package static let productionEndpoint = URL(string: "https://otlp-http-production.shopifysvc.com/v1/metrics")!

    package struct Configuration: Sendable {
        package var sdkVersion: String
        package var product: TelemetryProduct
        package var platform: TelemetryPlatform
        package var endpoint: URL
        package var exportInterval: TimeInterval
        package var maxPendingMeasurements: Int

        package init(
            sdkVersion: String,
            product: TelemetryProduct = .checkoutKit,
            platform: TelemetryPlatform = .swift,
            endpoint: URL = CheckoutKitTelemetry.productionEndpoint,
            exportInterval: TimeInterval = 60,
            maxPendingMeasurements: Int = 128
        ) {
            self.sdkVersion = sdkVersion
            self.product = product
            self.platform = platform
            self.endpoint = endpoint
            self.exportInterval = exportInterval
            self.maxPendingMeasurements = max(1, maxPendingMeasurements)
        }
    }

    typealias Transport = @Sendable (URLRequest) async throws -> HTTPURLResponse
    typealias Clock = @Sendable () -> UInt64

    private let configuration: Configuration
    private let transport: Transport
    private let clock: Clock
    private let lock = NSLock()
    private let timerQueue = DispatchQueue(label: "com.shopify.checkout-kit.telemetry")
    private var measurements: [Measurement] = []
    private var timer: DispatchSourceTimer?
    private var consecutiveExportFailures = 0
    private var nextExportAllowedAt: Date?
    private var activeExportTask: Task<Bool, Never>?
    private var stopping = false
    private var stopped = false

    private enum FlushAction {
        case complete(Bool)
        case wait(Task<Bool, Never>)
    }

    private enum ShutdownAction {
        case complete
        case discard(Task<Bool, Never>?)
        case drain(Task<Bool, Never>?)
    }

    package convenience init(configuration: Configuration) {
        self.init(
            configuration: configuration,
            clock: { UInt64(Date().timeIntervalSince1970 * 1_000_000_000) },
            transport: { request in
                let (_, response) = try await URLSession.shared.data(for: request)
                guard let response = response as? HTTPURLResponse else {
                    throw TelemetryTransportError.invalidResponse
                }
                return response
            }
        )
    }

    init(configuration: Configuration, clock: @escaping Clock, transport: @escaping Transport) {
        self.configuration = configuration
        self.clock = clock
        self.transport = transport
    }

    deinit {
        timer?.cancel()
    }

    package func start() {
        guard configuration.exportInterval > 0 else { return }

        let timer = lock.withLock { () -> DispatchSourceTimer? in
            guard !stopped, self.timer == nil else { return nil }
            let timer = DispatchSource.makeTimerSource(queue: timerQueue)
            self.timer = timer
            return timer
        }
        guard let timer else { return }
        timer.schedule(deadline: .now() + configuration.exportInterval, repeating: configuration.exportInterval)
        timer.setEventHandler { [weak self] in
            guard let self else { return }
            Task.detached { [self] in _ = await flush() }
        }
        timer.resume()
    }

    package func recordError(_ metric: TelemetryErrorMetric) {
        recordCounter(
            name: "checkout_kit_error",
            attributes: attributes([
                "category": .string(metric.category.rawValue),
                "stage": .string(metric.stage.rawValue),
                "code": .string(metric.code.rawValue),
                "retryable": .bool(metric.retryable),
                "is_retry": .bool(metric.isRetry)
            ], product: metric.product)
        )
    }

    package func recordProtocolDecodeError(_ metric: TelemetryProtocolDecodeErrorMetric) {
        recordCounter(
            name: "checkout_kit_protocol_decode_error",
            attributes: attributes([
                "method": .string(metric.method.rawValue),
                "failure_type": .string(metric.failureType.rawValue)
            ], product: metric.product)
        )
    }

    package func recordNavigationRetry(_ metric: TelemetryNavigationRetryMetric) {
        recordCounter(
            name: "checkout_kit_navigation_retry",
            attributes: attributes([
                "reason": .string(metric.reason.rawValue),
                "result": .string(metric.result.rawValue)
            ], product: metric.product)
        )
    }

    package func recordNavigationDuration(_ metric: TelemetryNavigationDurationMetric) {
        guard metric.milliseconds.isFinite, metric.milliseconds >= 0 else { return }
        record(
            Measurement(
                type: .histogram,
                name: "checkout_kit_navigation_duration_ms",
                value: metric.milliseconds,
                unit: "ms",
                attributes: attributes([
                    "result": .string(metric.result.rawValue),
                    "preloaded": .bool(metric.preloaded)
                ], product: metric.product),
                timeUnixNano: clock()
            )
        )
    }

    package func flush() async -> Bool {
        await flush(ignoreBackoff: false, allowStopping: false)
    }

    package func shutdown(discardPending: Bool = false) async -> Bool {
        let action = lock.withLock { () -> ShutdownAction in
            guard !stopped else { return .complete }
            timer?.cancel()
            timer = nil
            if discardPending {
                stopped = true
                stopping = true
                measurements.removeAll(keepingCapacity: false)
                return .discard(activeExportTask)
            }
            stopping = true
            return .drain(activeExportTask)
        }

        switch action {
        case .complete:
            return true
        case let .discard(activeTask):
            activeTask?.cancel()
            _ = await activeTask?.value
            return true
        case let .drain(activeTask):
            let activeExportSucceeded = await activeTask?.value ?? true
            let finalFlushSucceeded = await flush(ignoreBackoff: true, allowStopping: true)
            lock.withLock { stopped = true }
            return activeExportSucceeded && finalFlushSucceeded
        }
    }

    private func flush(ignoreBackoff: Bool, allowStopping: Bool) async -> Bool {
        let action = lock.withLock { () -> FlushAction in
            guard !stopped, allowStopping || !stopping else { return .complete(false) }
            if !ignoreBackoff, let nextExportAllowedAt, nextExportAllowedAt > Date() {
                return .complete(false)
            }
            if let activeExportTask { return .wait(activeExportTask) }
            guard !measurements.isEmpty else { return .complete(true) }

            let pending = measurements
            measurements.removeAll(keepingCapacity: true)
            let task = Task { [weak self] in
                await self?.export(pending) ?? false
            }
            activeExportTask = task
            return .wait(task)
        }

        switch action {
        case let .complete(succeeded): return succeeded
        case let .wait(task): return await task.value
        }
    }

    private func recordCounter(name: String, attributes: [String: AttributeValue]) {
        record(
            Measurement(
                type: .counter,
                name: name,
                value: 1,
                unit: nil,
                attributes: attributes,
                timeUnixNano: clock()
            )
        )
    }

    private func attributes(
        _ values: [String: AttributeValue],
        product: TelemetryProduct? = nil
    ) -> [String: AttributeValue] {
        var attributes = values
        attributes["product"] = .string((product ?? configuration.product).rawValue)
        attributes["platform"] = .string(configuration.platform.rawValue)
        return attributes
    }

    private func record(_ measurement: Measurement) {
        lock.withLock {
            guard !stopped, !stopping else { return }
            guard measurements.count < configuration.maxPendingMeasurements else { return }
            measurements.append(measurement)
        }
    }

    private func export(_ pending: [Measurement]) async -> Bool {
        let succeeded: Bool
        do {
            let body = try OtlpPayload.make(
                sdkVersion: configuration.sdkVersion,
                measurements: pending
            )
            var request = URLRequest(url: configuration.endpoint)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
            let response = try await transport(request)
            succeeded = (200 ..< 300).contains(response.statusCode)
        } catch {
            succeeded = false
        }
        return completeExport(pending: pending, succeeded: succeeded)
    }

    private func completeExport(pending: [Measurement], succeeded: Bool) -> Bool {
        lock.withLock {
            activeExportTask = nil
            guard !stopped else { return false }
            if succeeded {
                consecutiveExportFailures = 0
                nextExportAllowedAt = nil
            } else {
                measurements = Array((pending + measurements).prefix(configuration.maxPendingMeasurements))
                consecutiveExportFailures += 1
                let exponent = min(consecutiveExportFailures - 1, maximumBackoffExponent)
                let backoff = min(
                    configuration.exportInterval * pow(2, Double(exponent)),
                    maximumExportBackoff
                )
                nextExportAllowedAt = Date().addingTimeInterval(backoff)
            }
            return succeeded
        }
    }
}

private let maximumExportBackoff: TimeInterval = 15 * 60
private let maximumBackoffExponent = 4
private let instrumentationName = "checkout-kit-telemetry"
private let telemetrySDKLanguage = "swift"

private enum TelemetryTransportError: Error {
    case invalidResponse
}

private enum MeasurementType: String, Hashable, Sendable {
    case counter
    case histogram
}

private enum AttributeValue: Hashable, Sendable {
    case string(String)
    case bool(Bool)

    var json: [String: Any] {
        switch self {
        case let .string(value): ["stringValue": value]
        case let .bool(value): ["boolValue": value]
        }
    }

    var sortValue: String {
        switch self {
        case let .string(value): "s:\(value)"
        case let .bool(value): "b:\(value)"
        }
    }
}

private struct Measurement: Sendable {
    let type: MeasurementType
    let name: String
    let value: Double
    let unit: String?
    let attributes: [String: AttributeValue]
    let timeUnixNano: UInt64
}

private struct MetricKey: Hashable {
    struct Attribute: Hashable {
        let key: String
        let value: AttributeValue
    }

    let type: MeasurementType
    let name: String
    let attributes: [Attribute]

    var attributesSortValue: String {
        attributes
            .map { "\($0.key)=\($0.value.sortValue)" }
            .joined(separator: "&")
    }

    init(_ measurement: Measurement) {
        type = measurement.type
        name = measurement.name
        attributes = measurement.attributes
            .map { Attribute(key: $0.key, value: $0.value) }
            .sorted { $0.key < $1.key }
    }
}

private enum OtlpPayload {
    private static let histogramBounds: [Double] = [100, 250, 500, 1000, 2500, 5000, 10000, 30000]

    static func make(sdkVersion: String, measurements: [Measurement]) throws -> Data {
        let grouped = Dictionary(grouping: measurements, by: MetricKey.init)
        let metrics = grouped
            .sorted {
                if $0.key.name != $1.key.name { return $0.key.name < $1.key.name }
                return $0.key.attributesSortValue < $1.key.attributesSortValue
            }
            .map(buildMetric)
        let payload: [String: Any] = [
            "resourceMetrics": [[
                "resource": [
                    "attributes": encodeAttributes([
                        "service.name": .string("checkout-kit"),
                        "service.version": .string(sdkVersion),
                        "telemetry.sdk.language": .string(telemetrySDKLanguage),
                        "telemetry.sdk.name": .string(instrumentationName),
                        "telemetry.sdk.version": .string(sdkVersion)
                    ])
                ],
                "scopeMetrics": [[
                    "scope": ["name": instrumentationName, "version": sdkVersion],
                    "metrics": metrics
                ]]
            ]]
        ]
        return try JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys])
    }

    private static func buildMetric(group: (key: MetricKey, value: [Measurement])) -> [String: Any] {
        let measurements = group.value.sorted { $0.timeUnixNano < $1.timeUnixNano }
        let first = measurements[0]
        let attributes = encodeAttributes(first.attributes)
        let start = String(first.timeUnixNano)
        let end = String(measurements[measurements.count - 1].timeUnixNano)

        switch group.key.type {
        case .counter:
            return [
                "name": first.name,
                "sum": [
                    "aggregationTemporality": 1,
                    "isMonotonic": true,
                    "dataPoints": [[
                        "attributes": attributes,
                        "asInt": String(measurements.count),
                        "startTimeUnixNano": start,
                        "timeUnixNano": end
                    ]]
                ]
            ]
        case .histogram:
            let values = measurements.map(\.value)
            var bucketCounts = Array(repeating: 0, count: histogramBounds.count + 1)
            for value in values {
                let index = histogramBounds.firstIndex { value <= $0 } ?? histogramBounds.count
                bucketCounts[index] += 1
            }
            let minimum = values.min() ?? 0
            let maximum = values.max() ?? 0
            return [
                "name": first.name,
                "unit": first.unit ?? "",
                "histogram": [
                    "aggregationTemporality": 1,
                    "dataPoints": [[
                        "attributes": attributes,
                        "bucketCounts": bucketCounts.map(String.init),
                        "count": String(values.count),
                        "explicitBounds": histogramBounds,
                        "min": minimum,
                        "max": maximum,
                        "sum": values.reduce(0, +),
                        "startTimeUnixNano": start,
                        "timeUnixNano": end
                    ]]
                ]
            ]
        }
    }

    private static func encodeAttributes(_ attributes: [String: AttributeValue]) -> [[String: Any]] {
        attributes
            .sorted { $0.key < $1.key }
            .map { ["key": $0.key, "value": $0.value.json] }
    }
}
