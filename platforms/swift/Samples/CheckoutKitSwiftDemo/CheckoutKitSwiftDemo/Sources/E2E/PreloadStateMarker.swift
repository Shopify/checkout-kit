import ShopifyCheckoutKit

/// Maps ``PreloadState`` to the dynamic test ID the cart screen exposes for the
/// Maestro preload flows, e.g. `preload-state-ready`.
///
/// The ID is invisible automation metadata, never rendered UI — the same seam
/// style as ``E2ETestIds/appReady``. The Android sample exposes identical IDs,
/// so shared flow files work on both platforms. Do not change a value without
/// updating the flows and the Android mapping.
enum PreloadStateMarker {
    static func testId(for state: PreloadState) -> String {
        "\(E2ETestIds.preloadStatePrefix)\(text(for: state))"
    }

    static func text(for state: PreloadState) -> String {
        switch state {
        case .idle:
            return "idle"
        case .loading:
            return "loading"
        case .ready:
            return "ready"
        case .expired:
            return "expired"
        case let .failed(reason):
            return failedText(for: reason)
        }
    }

    private static func failedText(for reason: PreloadState.FailureReason) -> String {
        switch reason {
        case let .httpError(statusCode):
            return "failed-http-\(statusCode)"
        case .navigationFailed:
            return "failed-navigation"
        case .keepAliveLost:
            return "failed-keep-alive"
        case .webContentProcessTerminated:
            return "failed-web-process"
        case .protocolError:
            return "failed-protocol"
        }
    }
}
