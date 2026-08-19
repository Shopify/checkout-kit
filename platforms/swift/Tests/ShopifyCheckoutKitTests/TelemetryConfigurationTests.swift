import CheckoutKitTelemetry
@testable import ShopifyCheckoutKit
import XCTest

@MainActor
final class TelemetryConfigurationTests: XCTestCase {
    private var originalConfiguration: Configuration!
    private var recorder: RecordingCheckoutTelemetryRecorder!

    override func setUp() async throws {
        try await super.setUp()
        originalConfiguration = ShopifyCheckoutKit.configuration
        recorder = RecordingCheckoutTelemetryRecorder()
        CheckoutTelemetry.overrideRecorderForTesting(recorder)
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configuration = originalConfiguration
        CheckoutTelemetry.overrideRecorderForTesting(nil)
        try await super.tearDown()
    }

    func testDisabledTelemetryDoesNotForwardMetrics() {
        ShopifyCheckoutKit.configuration.telemetry.enabled = false

        CheckoutTelemetry.recorder.recordError(
            .init(category: .http, stage: .load, code: .server, retryable: true)
        )

        XCTAssertEqual(recorder.errorCount, 0)
    }

    func testEnabledTelemetryForwardsMetrics() {
        ShopifyCheckoutKit.configuration.telemetry.enabled = true

        CheckoutTelemetry.recorder.recordError(
            .init(category: .http, stage: .load, code: .server, retryable: true)
        )

        XCTAssertEqual(recorder.errorCount, 1)
    }

    func testReenabledTelemetryUsesInstalledRecorder() {
        ShopifyCheckoutKit.configuration.telemetry.enabled = false
        ShopifyCheckoutKit.configuration.telemetry.enabled = true

        CheckoutTelemetry.recorder.recordError(
            .init(category: .http, stage: .load, code: .server, retryable: true)
        )

        XCTAssertEqual(recorder.errorCount, 1)
    }

    func testRecorderStampsProductPerEntryPoint() {
        ShopifyCheckoutKit.configuration.telemetry.enabled = true

        CheckoutTelemetry.recorder(for: nil).recordError(
            .init(category: .http, stage: .load, code: .server, retryable: true)
        )
        CheckoutTelemetry.recorder(for: .acceleratedCheckouts).recordError(
            .init(category: .http, stage: .load, code: .server, retryable: true)
        )

        XCTAssertEqual(recorder.products, [.checkoutKit, .acceleratedCheckouts])
    }
}

private final class RecordingCheckoutTelemetryRecorder: CheckoutTelemetryRecording, @unchecked Sendable {
    private(set) var errorCount = 0
    private(set) var products: [TelemetryProduct?] = []

    func recordError(_ metric: TelemetryErrorMetric) {
        errorCount += 1
        products.append(metric.product)
    }

    func recordProtocolDecodeError(_: TelemetryProtocolDecodeErrorMetric) {}
    func recordNavigationRetry(_: TelemetryNavigationRetryMetric) {}
    func recordNavigationDuration(_: TelemetryNavigationDurationMetric) {}
}
