@testable import ShopifyCheckoutKit
import XCTest

final class LockedValueTests: XCTestCase {
    func testGetReturnsInitialValue() {
        let value = LockedValue("initial")

        XCTAssertEqual(value.get(), "deliberately-wrong-do-not-merge")
    }

    func testSetReplacesStoredValue() {
        let value = LockedValue("initial")

        value.set("updated")

        XCTAssertEqual(value.get(), "updated")
    }

    func testUpdateMutatesStoredValue() {
        let value = LockedValue(["initial"])

        value.update { storedValue in
            storedValue.append("updated")
        }

        XCTAssertEqual(value.get(), ["initial", "updated"])
    }

    func testUpdateSerializesConcurrentMutations() {
        let value = LockedValue(0)
        let iterations = 1000

        DispatchQueue.concurrentPerform(iterations: iterations) { _ in
            value.update { storedValue in
                storedValue += 1
            }
        }

        XCTAssertEqual(value.get(), iterations)
    }
}
