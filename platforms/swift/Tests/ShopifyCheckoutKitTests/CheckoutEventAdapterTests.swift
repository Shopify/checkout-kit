import EmbeddedCheckoutProtocol
@testable import ShopifyCheckoutKit
import XCTest

@MainActor
final class CheckoutEventAdapterTests: XCTestCase {
    func testStartProducesNormalizedCheckout() async {
        let sink = RecordingCheckoutEventSink()
        let adapter = CheckoutEventAdapter(sink: sink)

        _ = await adapter.process(message(method: "ec.start", status: "incomplete"))

        let checkout = try? XCTUnwrap(sink.started.first)
        XCTAssertEqual(checkout?.id, "checkout-1")
        XCTAssertEqual(checkout?.currency, "USD")
        XCTAssertEqual(checkout?.status, .incomplete)
        XCTAssertEqual(checkout?.buyer?.email, "buyer@example.com")
    }

    func testEveryChangeNotificationProducesOneUpdate() async {
        let methods = [
            "ec.line_items.change",
            "ec.messages.change",
            "ec.totals.change",
            "ec.fulfillment.change"
        ]

        for (index, method) in methods.enumerated() {
            let sink = RecordingCheckoutEventSink()
            let adapter = CheckoutEventAdapter(sink: sink)
            _ = await adapter.process(message(method: method, total: index))
            XCTAssertEqual(sink.updated.count, 1, method)
        }
    }

    func testUnsupportedChangeNotificationsDoNotProduceUpdates() async {
        for method in ["ec.buyer.change", "ec.payment.change"] {
            let sink = RecordingCheckoutEventSink()
            let adapter = CheckoutEventAdapter(sink: sink)

            _ = await adapter.process(message(method: method))

            XCTAssertTrue(sink.updated.isEmpty, method)
        }
    }

    func testEqualUpdateSnapshotsAreDeduplicated() async {
        let sink = RecordingCheckoutEventSink()
        let adapter = CheckoutEventAdapter(sink: sink)
        let update = message(method: "ec.totals.change")

        _ = await adapter.process(update)
        _ = await adapter.process(update)

        XCTAssertEqual(sink.updated.count, 1)
    }

    func testCompleteProducesCompleteEventEvenWhenSnapshotIsUnchanged() async {
        let sink = RecordingCheckoutEventSink()
        let adapter = CheckoutEventAdapter(sink: sink)

        _ = await adapter.process(message(method: "ec.start", status: "completed"))
        _ = await adapter.process(message(method: "ec.complete", status: "completed"))

        XCTAssertEqual(sink.completed.count, 1)
    }

    func testProtocolMessagesDoNotAddDerivedLineItemState() async throws {
        let sink = RecordingCheckoutEventSink()
        let adapter = CheckoutEventAdapter(sink: sink)

        _ = await adapter.process(message(
            method: "ec.messages.change",
            messages: #"[{"type":"error","code":"out_of_stock","content":"Unavailable"}]"#
        ))

        let checkout = try XCTUnwrap(sink.updated.first)
        XCTAssertTrue(checkout.lineItems.isEmpty)
    }

    private func message(
        method: String,
        status: String = "incomplete",
        total: Int = 1000,
        messages: String = "[]"
    ) -> String {
        """
        {"jsonrpc":"2.0","method":"\(method)","params":{"checkout":{
          "buyer":{"email":"buyer@example.com","first_name":"Ada","last_name":"Lovelace"},
          "currency":"USD",
          "id":"checkout-1",
          "line_items":[],
          "links":[{"type":"privacy_policy","url":"https://example.com/privacy"}],
          "messages":\(messages),
          "status":"\(status)",
          "totals":[{"amount":\(total),"type":"total"}],
          "ucp":{"payment_handlers":{},"version":"\(EmbeddedCheckoutProtocol.specVersion)"}
        }}}
        """
    }
}

@MainActor
private final class RecordingCheckoutEventSink: CheckoutEventSink {
    var started: [ShopifyCheckoutKit.Checkout] = []
    var updated: [ShopifyCheckoutKit.Checkout] = []
    var completed: [ShopifyCheckoutKit.Checkout] = []

    func checkoutDidStart(_ checkout: ShopifyCheckoutKit.Checkout) {
        started.append(checkout)
    }

    func checkoutDidUpdate(_ checkout: ShopifyCheckoutKit.Checkout) {
        updated.append(checkout)
    }

    func checkoutDidComplete(_ checkout: ShopifyCheckoutKit.Checkout) {
        completed.append(checkout)
    }
}
