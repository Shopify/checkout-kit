@testable import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import XCTest

@available(iOS 16.0, *)
class LifecycleObservingClientTests: XCTestCase {
    struct MockClient: CheckoutCommunicationProtocol {
        let handler: @Sendable (String) async -> String?

        func process(_ message: String) async -> String? {
            return await handler(message)
        }
    }

    // MARK: - With base client

    @MainActor
    func test_process_whenEcCompleteReceived_firesOnCompleteAndDelegatesToBase() async {
        let baseProcessed = XCTestExpectation(description: "Base client should process the message")
        let onCompleteFired = XCTestExpectation(description: "onComplete should fire")

        let base = MockClient { _ in
            baseProcessed.fulfill()
            return "{\"result\": \"ok\"}"
        }

        let client = LifecycleObservingClient(base: base, onComplete: {
            onCompleteFired.fulfill()
        })

        let message = "{\"jsonrpc\": \"2.0\", \"method\": \"ec.complete\", \"params\": {}}"
        let result = await client.process(message)

        await fulfillment(of: [onCompleteFired, baseProcessed], timeout: 1.0)
        XCTAssertEqual(result, "{\"result\": \"ok\"}")
    }

    @MainActor
    func test_process_whenNonLifecycleMessage_doesNotFireOnComplete() async {
        let onCompleteFired = XCTestExpectation(description: "onComplete should not fire")
        onCompleteFired.isInverted = true

        let base = MockClient { _ in return nil }

        let client = LifecycleObservingClient(base: base, onComplete: {
            onCompleteFired.fulfill()
        })

        let message = "{\"jsonrpc\": \"2.0\", \"method\": \"ec.other\", \"params\": {}}"
        let result = await client.process(message)

        await fulfillment(of: [onCompleteFired], timeout: 0.5)
        XCTAssertNil(result)
    }

    // MARK: - With nil base client

    @MainActor
    func test_process_whenBaseIsNilAndEcCompleteReceived_firesOnComplete() async {
        let onCompleteFired = XCTestExpectation(description: "onComplete should fire")

        let client = LifecycleObservingClient(base: nil, onComplete: {
            onCompleteFired.fulfill()
        })

        let message = "{\"jsonrpc\": \"2.0\", \"method\": \"ec.complete\", \"params\": {}}"
        let result = await client.process(message)

        await fulfillment(of: [onCompleteFired], timeout: 1.0)
        XCTAssertNil(result)
    }

    @MainActor
    func test_process_whenBaseIsNilAndNonLifecycleMessage_doesNotFireOnComplete() async {
        let onCompleteFired = XCTestExpectation(description: "onComplete should not fire")
        onCompleteFired.isInverted = true

        let client = LifecycleObservingClient(base: nil, onComplete: {
            onCompleteFired.fulfill()
        })

        let message = "{\"jsonrpc\": \"2.0\", \"method\": \"ec.other\", \"params\": {}}"
        let result = await client.process(message)

        await fulfillment(of: [onCompleteFired], timeout: 0.5)
        XCTAssertNil(result)
    }
}
