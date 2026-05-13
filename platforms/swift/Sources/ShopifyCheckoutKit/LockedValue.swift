import Foundation

/// Lock-backed storage for mutable values that must remain synchronously readable and writable.
///
/// Use this for module-internal backing storage when a public or static mutable API needs to
/// preserve synchronous mutation, but the stored value would otherwise be non-isolated shared
/// mutable state under Swift 6 concurrency checking.
final class LockedValue<Value>: @unchecked Sendable {
    private let lock = NSLock()
    private var value: Value

    init(_ value: Value) {
        self.value = value
    }

    func get() -> Value {
        lock.withLock { value }
    }

    func set(_ newValue: Value) {
        lock.withLock {
            value = newValue
        }
    }

    func update(_ block: (inout Value) -> Void) {
        lock.withLock {
            block(&value)
        }
    }
}
