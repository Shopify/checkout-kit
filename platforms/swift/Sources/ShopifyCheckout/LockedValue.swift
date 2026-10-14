import Foundation
import os.lock

private protocol LockedValueStorage<Value>: Sendable {
    associatedtype Value: Sendable

    func get() -> Value
    func set(_ newValue: Value)
    func update(_ block: (inout Value) -> Void)
}

@available(iOS 16.0, *)
private final class OSAllocatedUnfairLockedValueStorage<Value: Sendable>: LockedValueStorage {
    /// When the package minimum deployment target is iOS 18, consider
    /// replacing this storage with Synchronization.Mutex<Value>.
    private let lock: OSAllocatedUnfairLock<Value>

    init(_ value: Value) {
        lock = OSAllocatedUnfairLock(initialState: value)
    }

    func get() -> Value {
        lock.withLock { $0 }
    }

    func set(_ newValue: Value) {
        lock.withLock {
            $0 = newValue
        }
    }

    func update(_ block: (inout Value) -> Void) {
        lock.withLockUnchecked {
            block(&$0)
        }
    }
}

/// iOS 15 fallback for lock-backed Sendable storage.
///
/// SAFETY:
/// - `value` is only read and written while holding `lock`.
/// - `Value` is constrained to `Sendable`, so returned values can cross concurrency domains.
/// - This exists because `OSAllocatedUnfairLock` is only available on iOS 16+.
///
/// Delete this fallback when the package minimum deployment target is iOS 16.
@available(iOS, deprecated: 16.0, message: "Use OSAllocatedUnfairLockedValueStorage on iOS 16+.")
private final class NSLockedValueStorage<Value: Sendable>: LockedValueStorage, @unchecked Sendable {
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

/// Lock-backed storage for mutable values that must remain synchronously readable and writable.
///
/// Use this for module-internal backing storage when a public or static mutable API needs to
/// preserve synchronous mutation, but the stored value would otherwise be non-isolated shared
/// mutable state under Swift 6 concurrency checking.
final class LockedValue<Value: Sendable>: Sendable {
    private let storage: any LockedValueStorage<Value>

    init(_ value: Value) {
        if #available(iOS 16.0, *) {
            storage = OSAllocatedUnfairLockedValueStorage(value)
        } else {
            storage = NSLockedValueStorage(value)
        }
    }

    func get() -> Value {
        storage.get()
    }

    func set(_ newValue: Value) {
        storage.set(newValue)
    }

    func update(_ block: (inout Value) -> Void) {
        storage.update(block)
    }
}
