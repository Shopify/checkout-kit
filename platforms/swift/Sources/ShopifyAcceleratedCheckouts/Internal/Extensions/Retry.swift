import Foundation

let oneSecond = TimeInterval(1_000_000_000)

func exponentialDelay(for attempt: Int = 1, with retryDelay: TimeInterval) -> UInt64 {
    // Calculate exponential backoff: baseDelay * (2 ^ attempt)
    let backoffMultiplier = pow(2.0, Double(attempt))
    let delayInSeconds = retryDelay * backoffMultiplier

    // Cap the maximum delay at 30 seconds
    let cappedDelay = min(delayInSeconds, 30.0)

    // Convert to nanoseconds
    let delayInNanoseconds = cappedDelay * oneSecond

    return UInt64(delayInNanoseconds)
}

/// Runs every attempt in the caller's task and isolation domain.
func withRetry<Success>(
    maxRetryCount: Int = 3,
    retryDelay: TimeInterval = 1,
    clock: any Clock = SystemClock(),
    isolation _: isolated (any Actor)? = #isolation,
    shouldRetry: (Error) -> Bool,
    operation: () async throws -> Success
) async throws -> Success {
    var attempt = 0
    while true {
        try Task<Never, Never>.checkCancellation()
        do {
            let result = try await operation()
            try Task<Never, Never>.checkCancellation()
            return result
        } catch {
            try Task<Never, Never>.checkCancellation()
            guard !(error is CancellationError),
                  (error as? URLError)?.code != .cancelled,
                  attempt < maxRetryCount,
                  shouldRetry(error)
            else { throw error }

            try await clock.sleep(nanoseconds: exponentialDelay(for: attempt, with: retryDelay))
            attempt += 1
        }
    }
}

@available(iOS 16.0, *)
enum StorefrontRetryPolicy {
    /// Removing personal data is safe to repeat after a transient transport failure.
    static func personalDataRemoval(_ error: Error) -> Bool {
        if let error = error as? URLError {
            switch error.code {
            case .timedOut, .cannotFindHost, .cannotConnectToHost, .networkConnectionLost,
                 .dnsLookupFailed, .notConnectedToInternet:
                return true
            default:
                return false
            }
        }
        if case let .httpError(statusCode, _) = error as? GraphQLError {
            return statusCode == 408 || statusCode == 429 || (500 ... 599).contains(statusCode)
        }
        return false
    }

    /// Retry only explicit, transient cart rejections. An uncertain network outcome
    /// must not replay a payment mutation automatically.
    static func paymentUpdate(_ error: Error) -> Bool {
        guard case let .userError(errors, _) = error as? StorefrontAPI.Errors,
              !errors.isEmpty
        else { return false }
        return errors.allSatisfy { $0.code == .pendingDeliveryGroups || $0.code == .serviceUnavailable }
    }
}
