#if !COCOAPODS
    import CheckoutKitTelemetry
#endif
import Foundation

protocol CheckoutTelemetryRecording: Sendable {
    func recordError(_ metric: TelemetryErrorMetric)
    func recordProtocolDecodeError(_ metric: TelemetryProtocolDecodeErrorMetric)
    func recordNavigationRetry(_ metric: TelemetryNavigationRetryMetric)
    func recordNavigationDuration(_ metric: TelemetryNavigationDurationMetric)
}

private protocol CheckoutTelemetryClient: CheckoutTelemetryRecording {
    func start()
    func shutdown(discardPending: Bool) async -> Bool
}

extension CheckoutKitTelemetry: CheckoutTelemetryClient {}

private struct NoOpCheckoutTelemetryRecorder: CheckoutTelemetryRecording {
    func recordError(_: TelemetryErrorMetric) {}
    func recordProtocolDecodeError(_: TelemetryProtocolDecodeErrorMetric) {}
    func recordNavigationRetry(_: TelemetryNavigationRetryMetric) {}
    func recordNavigationDuration(_: TelemetryNavigationDurationMetric) {}
}

private struct CheckoutTelemetryState {
    var client: (any CheckoutTelemetryClient)?
    var recorderOverride: (any CheckoutTelemetryRecording)?
}

/// Stamps an entry point's product onto every measurement before forwarding to
/// the shared client, so one client instance serves every entry point.
private struct ProductScopedRecorder: CheckoutTelemetryRecording {
    let product: TelemetryProduct
    let base: any CheckoutTelemetryRecording

    func recordError(_ metric: TelemetryErrorMetric) {
        base.recordError(
            .init(
                category: metric.category,
                stage: metric.stage,
                code: metric.code,
                retryable: metric.retryable,
                isRetry: metric.isRetry,
                product: product
            )
        )
    }

    func recordProtocolDecodeError(_ metric: TelemetryProtocolDecodeErrorMetric) {
        base.recordProtocolDecodeError(
            .init(method: metric.method, failureType: metric.failureType, product: product)
        )
    }

    func recordNavigationRetry(_ metric: TelemetryNavigationRetryMetric) {
        base.recordNavigationRetry(
            .init(reason: metric.reason, result: metric.result, product: product)
        )
    }

    func recordNavigationDuration(_ metric: TelemetryNavigationDurationMetric) {
        base.recordNavigationDuration(
            .init(
                milliseconds: metric.milliseconds,
                result: metric.result,
                preloaded: metric.preloaded,
                product: product
            )
        )
    }
}

private let noOpCheckoutTelemetryRecorder = NoOpCheckoutTelemetryRecorder()
private let lockedCheckoutTelemetry = LockedValue(CheckoutTelemetryState())

enum CheckoutTelemetry {
    static var recorder: any CheckoutTelemetryRecording {
        recorder(for: nil)
    }

    static func recorder(for entryPoint: MetaData.EntryPoint?) -> any CheckoutTelemetryRecording {
        guard ShopifyCheckoutKit.configuration.telemetry.enabled else {
            return noOpCheckoutTelemetryRecorder
        }

        var base: (any CheckoutTelemetryRecording)?
        lockedCheckoutTelemetry.update { state in
            if let recorderOverride = state.recorderOverride {
                base = recorderOverride
                return
            }
            if let client = state.client {
                base = client
                return
            }

            // Re-check under the lock so a concurrent disable() cannot race a
            // client creation that would keep exporting after opt-out.
            guard ShopifyCheckoutKit.configuration.telemetry.enabled else {
                return
            }

            let client = CheckoutKitTelemetry(
                configuration: .init(
                    sdkVersion: MetaData.version,
                    platform: telemetryPlatform()
                )
            )
            client.start()
            state.client = client
            base = client
        }
        guard let base else { return noOpCheckoutTelemetryRecorder }
        return ProductScopedRecorder(
            product: entryPoint == .acceleratedCheckouts ? .acceleratedCheckouts : .checkoutKit,
            base: base
        )
    }

    static func disable() {
        var client: (any CheckoutTelemetryClient)?
        lockedCheckoutTelemetry.update { state in
            client = state.client
            state.client = nil
        }
        if let client {
            Task { _ = await client.shutdown(discardPending: true) }
        }
    }

    static func overrideRecorderForTesting(_ recorder: (any CheckoutTelemetryRecording)?) {
        lockedCheckoutTelemetry.update { state in
            state.recorderOverride = recorder
        }
    }

    private static func telemetryPlatform() -> TelemetryPlatform {
        ShopifyCheckoutKit.configuration.platform?.identifier == "ReactNative"
            ? .reactNativeSwift
            : .swift
    }

    static func errorCode(for error: NSError) -> TelemetryErrorCode {
        guard error.domain == NSURLErrorDomain else { return .unknown }
        switch error.code {
        case NSURLErrorCancelled: return .cancelled
        case NSURLErrorTimedOut: return .timeout
        case NSURLErrorNetworkConnectionLost: return .connectionLost
        case NSURLErrorCannotConnectToHost: return .cannotConnect
        case NSURLErrorDNSLookupFailed: return .dns
        default: return .unknown
        }
    }

    fileprivate static func retryReason(for error: NSError) -> TelemetryNavigationRetryReason {
        switch errorCode(for: error) {
        case .timeout: return .timeout
        case .connectionLost: return .connectionLost
        case .cannotConnect: return .cannotConnect
        case .dns: return .dns
        default: return .unknown
        }
    }
}

extension TelemetryNavigationRetryMetric {
    /// Derives the bounded retry reason from the navigation error, so call
    /// sites record retries without mapping errors to reasons themselves.
    init(error: NSError, result: TelemetryNavigationRetryResult) {
        self.init(reason: CheckoutTelemetry.retryReason(for: error), result: result)
    }
}
