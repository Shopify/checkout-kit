import Foundation

final class LockedTestValue<Value>: @unchecked Sendable {
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
