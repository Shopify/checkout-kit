import Foundation

/// Protocol for abstracting time-based operations to enable testing
protocol Clock: Sendable {
    /// Sleep for the specified number of nanoseconds
    func sleep(nanoseconds: UInt64) async throws
}

/// System clock that uses actual Task.sleep for production code
struct SystemClock: Clock {
    func sleep(nanoseconds: UInt64) async throws {
        try await Task<Never, Never>.sleep(nanoseconds: nanoseconds)
    }
}

/// Mock clock that doesn't actually sleep, for use in tests
struct MockClock: Clock {
    func sleep(nanoseconds _: UInt64) async throws {
        // No actual delay in tests - returns immediately
    }
}
